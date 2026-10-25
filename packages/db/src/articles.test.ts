import type { RowDataPacket } from 'mysql2/promise'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { findNewestArticle, findPublishedArticle, listPublishedArticles } from './queries.ts'
import { adminUsers, articleLimits, articles, type NewArticle } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM articles')
  await database.pool.query('DELETE FROM admin_users')

  const [user] = await database.db
    .insert(adminUsers)
    .values({ email: 'beheerder@example.test', role: 'beheerder' })
    .$returningId()

  userId = user?.id ?? 0
})

const now = new Date('2026-10-26T12:00:00Z')

function article(slug: string, overrides: Partial<NewArticle> = {}): NewArticle {
  return {
    author: 'de redactie',
    body: 'De eerste alinea.\n\nDe tweede alinea.',
    createdBy: userId,
    intro: 'Een verzonnen intro.',
    publishedAt: new Date('2026-10-25T08:00:00Z'),
    slug,
    title: `Titel van ${slug}`,
    ...overrides,
  }
}

describe('the table articles', () => {
  it('stores an article with the time of creation and update, in UTC, and the account that made it', async () => {
    await database.db.insert(articles).values(article('wie-zijn-wij', { publishedAt: null }))

    const [row] = await database.db.select().from(articles)

    expect(row).toMatchObject({ createdBy: userId, publishedAt: null, slug: 'wie-zijn-wij' })
    expect(row?.createdAt).toBeInstanceOf(Date)
    expect(Math.abs((row?.createdAt.getTime() ?? 0) - Date.now())).toBeLessThan(60_000)
    expect(row?.updatedAt.getTime()).toBeGreaterThan(0)
  })

  it('stores Dutch text with accents, a dash and an emoji, and a body of a million characters', async () => {
    const body = `Ûnôfhinklik Fryslân – “een verhaal” 🗞️\n\n${'a'.repeat(1_000_000)}`

    await database.db.insert(articles).values(article('fryslan', { body, title: 'Fryslân: ‘wij’ zijn er 🗞️' }))

    const [row] = await database.db.select().from(articles)

    expect(row?.body).toBe(body)
    expect(row?.title).toBe('Fryslân: ‘wij’ zijn er 🗞️')
  })

  it.each(['wie-zijn-wij', 'a', '2026', 'wij-zijn-1', 'a-b-c'])('accepts the slug %j', async (slug) => {
    await expect(database.db.insert(articles).values(article(slug))).resolves.toBeDefined()
  })

  it.each([
    'Wie-zijn-wij',
    'wie_zijn_wij',
    '-wie',
    'wie-',
    'wie--zijn',
    'wie zijn',
    'wie/zijn',
    '../wie',
    '',
    'wiê',
    'wie.zijn',
  ])('refuses the slug %j', async (slug) => {
    await expect(database.db.insert(articles).values(article(slug))).rejects.toThrow()
  })

  it('refuses a slug that already exists, also in capitals or with a space after it', async () => {
    await database.db.insert(articles).values(article('wie-zijn-wij'))

    await expect(database.db.insert(articles).values(article('wie-zijn-wij'))).rejects.toThrow()
    await expect(database.db.insert(articles).values(article('wie-zijn-wij '))).rejects.toThrow()
  })

  it('refuses a title, an intro, a slug or an author that is too long', async () => {
    for (const [field, length] of Object.entries(articleLimits)) {
      await expect(
        database.db.insert(articles).values(article('lang', { [field]: 'a'.repeat(length + 1) })),
      ).rejects.toThrow()
    }
  })

  it('refuses an article without an account that exists, and keeps the account that made it', async () => {
    await expect(
      database.db.insert(articles).values(article('geen-account', { createdBy: userId + 1000 })),
    ).rejects.toThrow()

    await database.db.insert(articles).values(article('wel-account'))

    await expect(database.pool.query('DELETE FROM admin_users')).rejects.toThrow()
  })

  it('has an index on the time of publication for the newest article', async () => {
    const [rows] = await database.pool.query<RowDataPacket[]>(
      "SELECT index_name AS name FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'articles' AND column_name = 'published_at'",
    )

    expect(rows.map((row) => row['name'])).toEqual(['articles_published_at_idx'])
  })
})

describe('findPublishedArticle', () => {
  it('gives the page of a published article: the title, the intro, the text, the author and the time', async () => {
    await database.db.insert(articles).values(article('wie-zijn-wij'))

    expect(await findPublishedArticle(database.db, 'wie-zijn-wij', now)).toEqual({
      author: 'de redactie',
      body: 'De eerste alinea.\n\nDe tweede alinea.',
      intro: 'Een verzonnen intro.',
      publishedAt: new Date('2026-10-25T08:00:00Z'),
      slug: 'wie-zijn-wij',
      title: 'Titel van wie-zijn-wij',
    })
  })

  it('gives nothing for a draft, for a time of publication after now, or for an unknown slug', async () => {
    await database.db
      .insert(articles)
      .values([
        article('concept', { publishedAt: null }),
        article('later', { publishedAt: new Date('2026-10-26T12:00:01Z') }),
      ])

    expect(await findPublishedArticle(database.db, 'concept', now)).toBeUndefined()
    expect(await findPublishedArticle(database.db, 'later', now)).toBeUndefined()
    expect(await findPublishedArticle(database.db, 'bestaat-niet', now)).toBeUndefined()
  })

  it('counts an article published at exactly now as published', async () => {
    await database.db.insert(articles).values(article('nu', { publishedAt: now }))

    expect(await findPublishedArticle(database.db, 'nu', now)).toMatchObject({ slug: 'nu' })
  })

  it('gives the article only for the slug exactly, not for capitals or a space', async () => {
    await database.db.insert(articles).values(article('wie-zijn-wij'))

    expect(await findPublishedArticle(database.db, 'Wie-Zijn-Wij', now)).toBeUndefined()
    expect(await findPublishedArticle(database.db, 'wie-zijn-wij ', now)).toBeUndefined()
  })

  it('gives an article that was withdrawn and published again, and not one that is withdrawn', async () => {
    await database.db.insert(articles).values(article('wie-zijn-wij'))
    await database.pool.query('UPDATE articles SET published_at = NULL')

    expect(await findPublishedArticle(database.db, 'wie-zijn-wij', now)).toBeUndefined()

    await database.pool.query("UPDATE articles SET published_at = '2026-10-26 10:00:00'")

    expect(await findPublishedArticle(database.db, 'wie-zijn-wij', now)).toMatchObject({ slug: 'wie-zijn-wij' })
  })

  it('leaves the account and the times of the record out', async () => {
    await database.db.insert(articles).values(article('wie-zijn-wij'))

    const found = await findPublishedArticle(database.db, 'wie-zijn-wij', now)

    expect(Object.keys(found ?? {}).sort()).toEqual(['author', 'body', 'intro', 'publishedAt', 'slug', 'title'])
  })
})

describe('findNewestArticle', () => {
  it('gives nothing when there is no article', async () => {
    expect(await findNewestArticle(database.db, now)).toBeUndefined()
  })

  it('gives the article with the newest time of publication, with what the card shows', async () => {
    await database.db
      .insert(articles)
      .values([
        article('oud', { publishedAt: new Date('2026-10-01T08:00:00Z') }),
        article('nieuw', { publishedAt: new Date('2026-10-25T08:00:00Z') }),
        article('ertussen', { publishedAt: new Date('2026-10-10T08:00:00Z') }),
      ])

    expect(await findNewestArticle(database.db, now)).toEqual({
      intro: 'Een verzonnen intro.',
      publishedAt: new Date('2026-10-25T08:00:00Z'),
      slug: 'nieuw',
      title: 'Titel van nieuw',
    })
  })

  it('skips a draft and an article for later, however new, and gives the newest one that is published', async () => {
    await database.db
      .insert(articles)
      .values([
        article('gepubliceerd', { publishedAt: new Date('2026-10-01T08:00:00Z') }),
        article('concept', { publishedAt: null }),
        article('later', { publishedAt: new Date('2026-11-01T08:00:00Z') }),
      ])

    expect(await findNewestArticle(database.db, now)).toMatchObject({ slug: 'gepubliceerd' })
  })

  it('gives nothing when every article is a draft', async () => {
    await database.db
      .insert(articles)
      .values([article('a', { publishedAt: null }), article('b', { publishedAt: null })])

    expect(await findNewestArticle(database.db, now)).toBeUndefined()
  })

  it('takes the last one entered when two were published at the same time', async () => {
    const publishedAt = new Date('2026-10-25T08:00:00Z')

    await database.db.insert(articles).values([article('eerst', { publishedAt }), article('daarna', { publishedAt })])

    expect(await findNewestArticle(database.db, now)).toMatchObject({ slug: 'daarna' })
  })
})

describe('listPublishedArticles', () => {
  it('gives the slug of every published article, newest first, and no draft or article for later', async () => {
    await database.db
      .insert(articles)
      .values([
        article('oud', { publishedAt: new Date('2026-10-01T08:00:00Z') }),
        article('nieuw', { publishedAt: new Date('2026-10-25T08:00:00Z') }),
        article('concept', { publishedAt: null }),
        article('later', { publishedAt: new Date('2026-11-01T08:00:00Z') }),
      ])

    const list = await listPublishedArticles(database.db, now)

    expect(list.map((row) => row.slug)).toEqual(['nieuw', 'oud'])
    expect(list).toEqual([{ slug: 'nieuw' }, { slug: 'oud' }])
  })

  it('gives at most the limit', async () => {
    await database.db.insert(articles).values([article('a'), article('b'), article('c')])

    expect(await listPublishedArticles(database.db, now, 2)).toHaveLength(2)
  })
})
