import type { Database } from '@fansite/db/client'

import { adminUsers, articleVersions } from '@fansite/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'

// The versions of an article: the text as it was each time an editor saved it. `recordVersion`
// is the only code that writes the table `article_versions`, and this file is the only code
// that touches it. It only adds; nothing in the site changes or removes a version, and
// `article-versions.test.ts` keeps it that way.

/** A version with its text, for the page that shows it. */
export type AdminVersion = NonNullable<Awaited<ReturnType<typeof findVersion>>>

/** The five fields of an article that a version keeps. */
export type VersionContent = {
  author: string
  body: string
  intro: string
  slug: string
  title: string
}

/** A version as the admin lists it: the number, when, and the address of the account. */
export type VersionRow = Awaited<ReturnType<typeof listVersions>>[number]

// `insert ... select` wants every column of the table, in order, and the database numbers
// `id` when it gets null.

/**
 * One version of an article, with its text, or `undefined` for a number the article never had.
 * `newest` says whether it is the version that equals the article now.
 */
export async function findVersion(db: Pick<Database, 'select'>, articleId: number, version: number) {
  const [row] = await db
    .select({
      author: articleVersions.author,
      body: articleVersions.body,
      intro: articleVersions.intro,
      savedAt: articleVersions.savedAt,
      savedBy: adminUsers.email,
      slug: articleVersions.slug,
      title: articleVersions.title,
      version: articleVersions.version,
    })
    .from(articleVersions)
    .innerJoin(adminUsers, eq(adminUsers.id, articleVersions.savedBy))
    .where(and(eq(articleVersions.articleId, articleId), eq(articleVersions.version, version)))

  if (row === undefined) {
    return undefined
  }

  const [newest] = await db
    .select({ version: sql<number>`max(${articleVersions.version})` })
    .from(articleVersions)
    .where(eq(articleVersions.articleId, articleId))

  return { ...row, newest: Number(newest?.version) === row.version }
}

/** The versions of an article, the newest first, with the e-mail address of the account. */
export function listVersions(db: Pick<Database, 'select'>, articleId: number) {
  return db
    .select({
      savedAt: articleVersions.savedAt,
      savedBy: adminUsers.email,
      version: articleVersions.version,
    })
    .from(articleVersions)
    .innerJoin(adminUsers, eq(adminUsers.id, articleVersions.savedBy))
    .where(eq(articleVersions.articleId, articleId))
    .orderBy(desc(articleVersions.version))
}

/**
 * Adds the next version of an article: one more than the highest number it has, or 1 when it
 * has none. It is called in the same transaction as the change it records, after the row of
 * the article is locked, so two edits take turns and get two numbers. The unique key on the
 * article and the number is the second guard: if a caller forgot the lock, the second insert
 * fails and the transaction is undone, instead of two versions sharing a number.
 *
 * It copies the five fields it knows and nothing else, and a version never changes afterwards.
 */
export async function recordVersion(
  db: Pick<Database, 'insert'>,
  { articleId, content, userId }: { articleId: number; content: VersionContent; userId: number },
  now = new Date(),
) {
  await db.insert(articleVersions).select((qb) =>
    qb
      // The keys follow the columns of the table, which `insert ... select` insists on.
      /* eslint-disable perfectionist/sort-objects */
      .select({
        id: sql<number>`null`.as('id'),
        articleId: sql<number>`${articleId}`.as('article_id'),
        version: sql<number>`coalesce(max(${articleVersions.version}), 0) + 1`.as('version'),
        title: sql<string>`${content.title}`.as('title'),
        slug: sql<string>`${content.slug}`.as('slug'),
        intro: sql<string>`${content.intro}`.as('intro'),
        body: sql<string>`${content.body}`.as('body'),
        author: sql<string>`${content.author}`.as('author'),
        savedAt: sql<Date>`${now}`.as('saved_at'),
        savedBy: sql<number>`${userId}`.as('saved_by'),
      })
      /* eslint-enable perfectionist/sort-objects */
      .from(articleVersions)
      .where(eq(articleVersions.articleId, articleId)),
  )
}
