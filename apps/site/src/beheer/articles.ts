import type { Database } from '@fansite/db/client'

import { type AdminRole, articles } from '@fansite/db/schema'
import { desc, eq } from 'drizzle-orm'

import type { ArticleErrors, ArticleValues } from './article-fields'

import { databaseErrors } from './article-form'
import { recordVersion } from './article-versions'
import { recordAction } from './audit-log'
import { retryOnDeadlock } from './retry-deadlock'

// Writing articles in the admin: the list, the one article an editor edits, and the four
// changes. A change and its row in the log of the admin are one transaction, so there is no
// change without a row and no row without a change; a change of the text adds a version in the
// same transaction, and every change sets `updated_by` along with `updated_at`. The clock is
// the `now` argument of each function, which the caller leaves out: `published_at` and
// `updated_at` come from one place each.

/** How many articles the list shows. Far more than the editors will write. */
export const listLength = 200

/** The article an editor opens, with the values of the fields. */
export type AdminArticle = NonNullable<Awaited<ReturnType<typeof findArticle>>>

/** One article as the list shows it. */
export type AdminArticleRow = Awaited<ReturnType<typeof listArticles>>[number]

/**
 * Who asks for an article: an author sees and writes only the articles he made (`created_by`);
 * an owner or an editor sees them all (issue 1156).
 */
export type ArticleReader = { role: AdminRole; userId: number }

/** What a save did to the article. */
export type SaveOutcome =
  | { errors: ArticleErrors; status: 'invalid' }
  | { id: number; published: boolean; saved: boolean; status: 'done' }
  | { id: number; status: 'created' }
  | { status: 'missing' }

/** The article with this number, for the form and the preview, or `undefined` for none. */
export async function findArticle(db: Pick<Database, 'select'>, id: number) {
  const [row] = await db
    .select({
      author: articles.author,
      body: articles.body,
      createdAt: articles.createdAt,
      createdBy: articles.createdBy,
      id: articles.id,
      intro: articles.intro,
      publishedAt: articles.publishedAt,
      slug: articles.slug,
      title: articles.title,
      updatedAt: articles.updatedAt,
      updatedBy: articles.updatedBy,
    })
    .from(articles)
    .where(eq(articles.id, id))

  return row
}

/**
 * The article with this number for `reader`, or `undefined` when there is none or it is not
 * his: an author gets "niet gevonden" for the article of someone else, as for one that isn't
 * there.
 */
export async function findArticleFor(db: Pick<Database, 'select'>, id: number, reader: ArticleReader) {
  const article = await findArticle(db, id)
  const own = ownArticlesOf(reader)

  return article === undefined || (own !== undefined && article.createdBy !== own) ? undefined : article
}

/**
 * Every article, drafts and published ones, the one written last first, or for `createdBy`
 * only the articles that account made. The list does not need the text.
 */
export function listArticles(db: Pick<Database, 'select'>, createdBy?: number) {
  return db
    .select({
      author: articles.author,
      id: articles.id,
      publishedAt: articles.publishedAt,
      slug: articles.slug,
      title: articles.title,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(createdBy === undefined ? undefined : eq(articles.createdBy, createdBy))
    .orderBy(desc(articles.id))
    .limit(listLength)
}

/** The number of the account whose articles only `reader` may see, or `undefined` for all. */
export function ownArticlesOf(reader: ArticleReader) {
  return reader.role === 'author' ? reader.userId : undefined
}

/** The fields of a form that a version keeps. */
function contentOf(values: ArticleValues) {
  return { author: values.auteur, body: values.tekst, intro: values.intro, slug: values.adres, title: values.titel }
}

/** Whether the error is the database refusing a second article with the same address. */
function isDuplicateAddress(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const { cause, code, errno } = error as { cause?: unknown; code?: unknown; errno?: unknown }

  return code === 'ER_DUP_ENTRY' || errno === 1062 || isDuplicateAddress(cause)
}

const taken: SaveOutcome = { errors: { adres: databaseErrors.taken }, status: 'invalid' }

/** What withdrawing did: the article is a draft now, it was one already, or there is none. */
export type WithdrawOutcome = 'done' | 'missing' | 'unchanged'

/**
 * Makes a draft with its version 1 and writes `article.create` with its number in the log. The
 * address must be free: the unique key of the table decides, so two editors who save the same
 * address at the same time don't both succeed.
 */
export async function createArticle(
  db: Database,
  userId: number,
  values: ArticleValues,
  now = new Date(),
): Promise<SaveOutcome> {
  try {
    return await retryOnDeadlock(() =>
      db.transaction(async (transaction) => {
        const [result] = await transaction.insert(articles).values({
          author: values.auteur,
          body: values.tekst,
          createdAt: now,
          createdBy: userId,
          intro: values.intro,
          publishedAt: null,
          slug: values.adres,
          title: values.titel,
          updatedAt: now,
          updatedBy: userId,
        })

        await recordVersion(transaction, { articleId: result.insertId, content: contentOf(values), userId }, now)
        await recordAction(transaction, { action: 'article.create', itemId: result.insertId, userId }, now)

        return { id: result.insertId, status: 'created' } as const
      }),
    )
  } catch (error) {
    if (isDuplicateAddress(error)) {
      return taken
    }

    throw error
  }
}

/**
 * Saves the fields of an article, and publishes it when `publish` is set. Saving writes
 * `article.update` and a new version only when a field changed, publishing writes
 * `article.publish` only when the article was not live yet: a second click, or a second tab,
 * saves nothing again and publishes nothing again, and the log says what happened. The address
 * of an article that has a time of publication is not changed (a link that was shared must not
 * break); the answer is an error at the field. An article for later, which only SQL can make,
 * is left as it is: withdraw it first to publish it now. With `createdBy` only an article that
 * account made is saved: one of someone else is `missing`, as for an author (issue 1156).
 */
export async function saveArticle(
  db: Database,
  userId: number,
  id: number,
  values: ArticleValues,
  publish: boolean,
  now = new Date(),
  createdBy?: number,
): Promise<SaveOutcome> {
  try {
    return await retryOnDeadlock(() =>
      db.transaction(async (transaction) => {
        const [row] = await transaction.select().from(articles).where(eq(articles.id, id)).for('update')

        if (row === undefined || (createdBy !== undefined && row.createdBy !== createdBy)) {
          return { status: 'missing' } as const
        }

        if (row.publishedAt !== null && values.adres !== row.slug) {
          return { errors: { adres: databaseErrors.locked }, status: 'invalid' } as const
        }

        const changed =
          values.adres !== row.slug ||
          values.auteur !== row.author ||
          values.intro !== row.intro ||
          values.tekst !== row.body ||
          values.titel !== row.title

        if (changed) {
          await transaction
            .update(articles)
            .set({
              author: values.auteur,
              body: values.tekst,
              intro: values.intro,
              slug: values.adres,
              title: values.titel,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(articles.id, id))
          await recordVersion(transaction, { articleId: id, content: contentOf(values), userId }, now)
          await recordAction(transaction, { action: 'article.update', itemId: id, userId }, now)
        }

        // An article with a time of publication, even one for later, is not published again:
        // two requests that publish together would otherwise each see the time of the other as
        // "later".
        const goesLive = publish && row.publishedAt === null

        if (goesLive) {
          await transaction
            .update(articles)
            .set({ publishedAt: now, updatedAt: now, updatedBy: userId })
            .where(eq(articles.id, id))
          await recordAction(transaction, { action: 'article.publish', itemId: id, userId }, now)
        }

        return { id, published: goesLive, saved: changed, status: 'done' } as const
      }),
    )
  } catch (error) {
    if (isDuplicateAddress(error)) {
      return taken
    }

    throw error
  }
}

/**
 * Makes a published article a draft again, and writes `article.unpublish` in the log. A draft
 * is left as it is and writes nothing. The time of publication is gone; publishing again sets
 * a new one.
 */
export async function withdrawArticle(
  db: Database,
  userId: number,
  id: number,
  now = new Date(),
): Promise<WithdrawOutcome> {
  return db.transaction(async (transaction) => {
    const [row] = await transaction
      .select({ publishedAt: articles.publishedAt })
      .from(articles)
      .where(eq(articles.id, id))
      .for('update')

    if (row === undefined) {
      return 'missing'
    }

    if (row.publishedAt === null) {
      return 'unchanged'
    }

    await transaction
      .update(articles)
      .set({ publishedAt: null, updatedAt: now, updatedBy: userId })
      .where(eq(articles.id, id))
    await recordAction(transaction, { action: 'article.unpublish', itemId: id, userId }, now)

    return 'done'
  })
}
