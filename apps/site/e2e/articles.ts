import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { adminUsers, articles, articleVersions } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'
import path from 'node:path'

/**
 * The account that the made-up articles belong to. `.test` is a domain that can't exist.
 */
const authorEmail = 'e2e-redactie@example.test'

/** Every made-up article has a slug that starts with this, so a leftover is easy to find. */
const slugPrefix = 'e2e-'

/**
 * The made-up articles for the checks of the pages, in the text format of the editors. One is
 * published and has every part of the format. The draft and the article for later must be on no
 * page: the checks look for them everywhere.
 */
export const testArticles = {
  draft: { slug: `${slugPrefix}concept`, title: 'Verzonnen concept dat nergens staat' },
  later: { slug: `${slugPrefix}later`, title: 'Verzonnen artikel voor over een jaar' },
  published: {
    author: 'de testredactie',
    body: [
      'Dit is een **verzonnen** artikel om de pagina mee te testen. Het heeft *cursieve* tekst en een link naar [onze bronnen](/bronnen).',
      '## Een kop in het artikel',
      'Een alinea met een link naar [de Testkrant](https://testkrant.test/verhaal), een andere site.',
      '- Het eerste punt van de lijst',
      '- Het tweede punt, met **vet**',
      '## Een tweede kop',
      'Het slot, met <b>HTML</b> dat gewone tekst blijft, en een lang adres dat de pagina niet breder maakt: https://www.voorbeeldkrant.test/een/heel/lang/adres/zonder/spaties/naar/het/verhaal/van/vandaag.',
    ].join('\n\n'),
    intro: 'Een verzonnen inleiding van twee zinnen. Ze laat zien hoe de kaart op de homepage eruit ziet.',
    slug: `${slugPrefix}artikel`,
    title: 'Verzonnen artikel van de testredactie',
  },
} as const

/** The first two versions of the published article: the text as it was before the edits. */
export const earlierVersions = [
  {
    body: 'Dit is de eerste tekst van het verzonnen artikel.',
    intro: 'Een eerste verzonnen inleiding.',
    title: 'Verzonnen artikel (eerste tekst)',
  },
  {
    body: 'Dit is de tweede tekst van het verzonnen artikel, met **vet** erin.',
    intro: 'Een tweede verzonnen inleiding.',
    title: 'Verzonnen artikel (tweede tekst)',
  },
] as const

const loopback = new Set(['127.0.0.1', '::1', '[::1]', 'localhost'])

/**
 * Puts the made-up articles, and an account for them, in the database and returns the function
 * that takes them out again. Like `addAdmin`, it only works on a database on this computer. The
 * site must have started already: it makes the tables.
 */
export async function addArticles() {
  const { DATABASE_URL } = databaseEnv()
  const { hostname } = new URL(DATABASE_URL)

  if (!loopback.has(hostname)) {
    throw new Error(
      `The checks of the articles only write to a database on this computer, and DATABASE_URL names ${hostname}.`,
    )
  }

  const { close, db, pool } = connect(DATABASE_URL)

  try {
    // A run that was stopped halfway may have left its articles and its account.
    await remove(pool)

    const [user] = await db.insert(adminUsers).values({ email: authorEmail, role: 'beheerder' }).$returningId()
    const createdBy = user?.id ?? 0
    const updatedBy = createdBy
    const day = 24 * 60 * 60 * 1000
    const now = Date.now()
    const { draft, later, published } = testArticles

    const [first] = await db
      .insert(articles)
      .values([
        { ...published, createdBy, publishedAt: new Date(now - day), updatedBy },
        {
          author: 'de testredactie',
          body: 'Dit concept staat nergens.',
          createdBy,
          intro: 'Een verzonnen concept.',
          publishedAt: null,
          updatedBy,
          ...draft,
        },
        {
          author: 'de testredactie',
          body: 'Dit artikel staat nog nergens.',
          createdBy,
          intro: 'Een verzonnen artikel voor later.',
          publishedAt: new Date(now + 365 * day),
          updatedBy,
          ...later,
        },
      ])
      .$returningId()

    // The published article has been edited twice since it was first saved, so the pages of
    // the versions have more than one to show. The newest equals the article itself.
    await db.insert(articleVersions).values([
      {
        ...earlierVersions[0],
        articleId: first?.id ?? 0,
        author: published.author,
        savedAt: new Date(now - 3 * day),
        savedBy: updatedBy,
        slug: published.slug,
        version: 1,
      },
      {
        ...earlierVersions[1],
        articleId: first?.id ?? 0,
        author: published.author,
        savedAt: new Date(now - 2 * day),
        savedBy: updatedBy,
        slug: published.slug,
        version: 2,
      },
      {
        articleId: first?.id ?? 0,
        author: published.author,
        body: published.body,
        intro: published.intro,
        savedAt: new Date(now - day),
        savedBy: updatedBy,
        slug: published.slug,
        title: published.title,
        version: 3,
      },
    ])
  } finally {
    await close()
  }

  return async () => {
    const { close, pool } = connect(DATABASE_URL)

    try {
      await remove(pool)
    } finally {
      await close()
    }
  }
}

/**
 * The number of a made-up article, which the pages of the admin have in their address. Like
 * `addArticles`, it only reads a database on this computer.
 */
export async function articleIdOf(slug: string) {
  const { DATABASE_URL } = databaseEnv()

  if (!loopback.has(new URL(DATABASE_URL).hostname)) {
    throw new Error('The checks of the articles only read a database on this computer.')
  }

  const { close, db } = connect(DATABASE_URL)

  try {
    const [row] = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug))

    if (row === undefined) {
      throw new Error(`The made-up article ${slug} is not in the database. Did the global setup run?`)
    }

    return row.id
  } finally {
    await close()
  }
}

/**
 * Connects with the DATABASE_URL of the environment or the .env in the root, like the server of
 * the check does.
 */
function databaseEnv() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return readDatabaseEnv()
}

/** Takes the made-up articles out with their versions, then their account. */
async function remove(pool: ReturnType<typeof connect>['pool']) {
  await pool.query('DELETE FROM article_versions WHERE article_id IN (SELECT id FROM articles WHERE slug LIKE ?)', [
    `${slugPrefix}%`,
  ])
  await pool.query('DELETE FROM articles WHERE slug LIKE ?', [`${slugPrefix}%`])
  await pool.query('DELETE FROM admin_users WHERE email = ?', [authorEmail])
}
