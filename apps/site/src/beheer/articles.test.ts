import type { TestDatabase } from '@fansite/db/test-database'

import { findPublishedArticle } from '@fansite/db/queries'
import { adminUsers, articles, articleVersions, auditLog } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { ArticleValues } from './article-fields'

import { createAccount } from './accounts'
import { cleanBody } from './article-form'
import { listVersions } from './article-versions'
import { createArticle, findArticle, listArticles, saveArticle, withdrawArticle } from './articles'

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM article_versions')
  await database.pool.query('DELETE FROM articles')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

const values = (overrides: Partial<ArticleValues> = {}): ArticleValues => ({
  adres: 'welkom',
  auteur: 'de redactie',
  intro: 'We stellen ons voor.',
  tekst: 'Een alinea.',
  titel: 'Welkom',
  ...overrides,
})

const t0 = new Date('2026-10-26T09:00:00Z')
const t1 = new Date('2026-10-26T10:00:00Z')
const t2 = new Date('2026-10-26T11:00:00Z')

/** Makes a draft and returns its number. */
async function draft(overrides: Partial<ArticleValues> = {}) {
  const outcome = await createArticle(database.db, userId, values(overrides), t0)

  if (outcome.status !== 'created') {
    throw new Error(`The draft was not made: ${JSON.stringify(outcome)}`)
  }

  return outcome.id
}

const stored = async (id: number) => (await database.db.select().from(articles).where(eq(articles.id, id)))[0]
const log = () => database.db.select().from(auditLog).orderBy(auditLog.id)

describe('createArticle', () => {
  it('stores a draft with the account of the editor and the time, and writes article.create with the number only', async () => {
    const id = await draft()

    expect(await stored(id)).toMatchObject({
      author: 'de redactie',
      body: 'Een alinea.',
      createdAt: t0,
      createdBy: userId,
      intro: 'We stellen ons voor.',
      publishedAt: null,
      slug: 'welkom',
      title: 'Welkom',
      updatedAt: t0,
    })
    expect(await log()).toEqual([
      {
        action: 'article.create',
        createdAt: t0,
        detail: null,
        id: expect.any(Number),
        itemId: id,
        reason: null,
        userId,
      },
    ])
  })

  it('puts nothing of the text in the log', async () => {
    await draft({ intro: 'GEHEIME-INTRO', tekst: 'GEHEIME-TEKST', titel: 'GEHEIME-TITEL' })

    expect(JSON.stringify(await log())).not.toMatch(/GEHEIME/u)
  })

  it('is not on the site: no query of the visitors finds a draft', async () => {
    await draft()

    expect(await findPublishedArticle(database.db, 'welkom', new Date('2030-01-01T00:00:00Z'))).toBeUndefined()
  })

  it('refuses an address that another article has, stores nothing and writes nothing', async () => {
    await draft()

    const outcome = await createArticle(database.db, userId, values({ titel: 'Anders' }), t1)

    expect(outcome).toEqual({
      errors: { adres: 'Een ander artikel heeft dit adres al. Kies een ander adres.' },
      status: 'invalid',
    })
    expect(await database.db.select().from(articles)).toHaveLength(1)
    expect(await log()).toHaveLength(1)
  })

  it('lets only one of two saves of the same address win, whichever comes first', async () => {
    const outcomes = await Promise.all([
      createArticle(database.db, userId, values(), t0),
      createArticle(database.db, userId, values(), t0),
      createArticle(database.db, userId, values(), t0),
    ])

    expect(outcomes.filter((outcome) => outcome.status === 'created')).toHaveLength(1)
    expect(outcomes.filter((outcome) => outcome.status === 'invalid')).toHaveLength(2)
    expect(await database.db.select().from(articles)).toHaveLength(1)
    expect(await log()).toHaveLength(1)
  })

  it('keeps a long text with accents, quotes, emoji and a link to another site exactly as it was typed', async () => {
    const tekst = cleanBody(
      [
        '## Één “kop” – ‘nu’ 🙂',
        `${'Een lange alinea met ëxtra accenten, “aanhalingstekens” en een link naar [de Leeuwarder Courant](https://www.lc.nl/sport?a=1&b=2#x). '.repeat(120)}`,
        '- **Vet** punt\n- *Cursief* punt\n\n<b>geen html</b> & %20 \\ Це текст',
      ].join('\r\n\r\n'),
    )
    const id = await draft({ tekst })

    expect((await findArticle(database.db, id))?.body).toBe(tekst)
    expect(tekst.length).toBeGreaterThan(14_000)
  })
})

describe('saveArticle', () => {
  it('changes the fields, sets updated_at, keeps the time of publication and writes article.update', async () => {
    const id = await draft()

    expect(
      await saveArticle(database.db, userId, id, values({ intro: 'Nieuw', titel: 'Nieuwe titel' }), false, t1),
    ).toEqual({
      id,
      published: false,
      saved: true,
      status: 'done',
    })
    expect(await stored(id)).toMatchObject({
      createdAt: t0,
      intro: 'Nieuw',
      publishedAt: null,
      title: 'Nieuwe titel',
      updatedAt: t1,
    })
    expect(await log()).toMatchObject([
      { action: 'article.create' },
      { action: 'article.update', createdAt: t1, itemId: id, userId },
    ])
  })

  it('writes nothing for a save that changes nothing', async () => {
    const id = await draft()

    expect(await saveArticle(database.db, userId, id, values(), false, t1)).toMatchObject({
      published: false,
      saved: false,
      status: 'done',
    })
    expect((await stored(id))?.updatedAt).toEqual(t0)
    expect(await log()).toHaveLength(1)
  })

  it('can change the address of a draft, and refuses an address another article has', async () => {
    const id = await draft()
    await draft({ adres: 'tweede', titel: 'Tweede' })

    expect(await saveArticle(database.db, userId, id, values({ adres: 'nieuw-adres' }), false, t1)).toMatchObject({
      saved: true,
    })
    expect((await stored(id))?.slug).toBe('nieuw-adres')
    expect(await saveArticle(database.db, userId, id, values({ adres: 'tweede' }), false, t2)).toEqual({
      errors: { adres: 'Een ander artikel heeft dit adres al. Kies een ander adres.' },
      status: 'invalid',
    })
    expect((await stored(id))?.slug).toBe('nieuw-adres')
  })

  it('publishes with the time of now, and writes article.update and article.publish in that order', async () => {
    const id = await draft()

    expect(await saveArticle(database.db, userId, id, values({ titel: 'Nieuwe titel' }), true, t1)).toEqual({
      id,
      published: true,
      saved: true,
      status: 'done',
    })
    expect(await stored(id)).toMatchObject({ publishedAt: t1, title: 'Nieuwe titel', updatedAt: t1 })
    expect((await log()).map((row) => row.action)).toEqual(['article.create', 'article.update', 'article.publish'])
    expect(await findPublishedArticle(database.db, 'welkom', t1)).toMatchObject({ title: 'Nieuwe titel' })
  })

  it('publishes without an update line when nothing else changed', async () => {
    const id = await draft()

    await saveArticle(database.db, userId, id, values(), true, t1)

    expect((await log()).map((row) => row.action)).toEqual(['article.create', 'article.publish'])
  })

  it('is a no-op to publish what is live already: the time stays and the log gets no second line', async () => {
    const id = await draft()

    await saveArticle(database.db, userId, id, values(), true, t1)

    expect(await saveArticle(database.db, userId, id, values(), true, t2)).toEqual({
      id,
      published: false,
      saved: false,
      status: 'done',
    })
    expect((await stored(id))?.publishedAt).toEqual(t1)
    expect((await log()).filter((row) => row.action === 'article.publish')).toHaveLength(1)
  })

  it('writes one publish line when two tabs publish at the same time', async () => {
    const id = await draft()

    const outcomes = await Promise.all([
      saveArticle(database.db, userId, id, values(), true, t1),
      saveArticle(database.db, userId, id, values(), true, t2),
    ])

    expect(outcomes.filter((outcome) => outcome.status === 'done' && outcome.published)).toHaveLength(1)
    expect((await log()).filter((row) => row.action === 'article.publish')).toHaveLength(1)
  })

  it('saves a change to a published article, which is live at once, without moving the time of publication', async () => {
    const id = await draft()

    await saveArticle(database.db, userId, id, values(), true, t1)
    await saveArticle(database.db, userId, id, values({ tekst: 'Verbeterd' }), false, t2)

    expect(await stored(id)).toMatchObject({ body: 'Verbeterd', publishedAt: t1, updatedAt: t2 })
    expect((await findPublishedArticle(database.db, 'welkom', t2))?.body).toBe('Verbeterd')
  })

  it('refuses a new address for a published article, changes nothing, and still saves with the same address', async () => {
    const id = await draft()

    await saveArticle(database.db, userId, id, values(), true, t1)

    expect(await saveArticle(database.db, userId, id, values({ adres: 'nieuw', tekst: 'Anders' }), false, t2)).toEqual({
      errors: {
        adres:
          'Dit artikel is gepubliceerd, dus het adres kan niet meer veranderen. Trek het artikel eerst in als het toch moet.',
      },
      status: 'invalid',
    })
    expect(await stored(id)).toMatchObject({ body: 'Een alinea.', slug: 'welkom', updatedAt: t1 })
    expect(await log()).toHaveLength(2)
  })

  it('lets the address change again once the article is withdrawn', async () => {
    const id = await draft()

    await saveArticle(database.db, userId, id, values(), true, t1)
    await withdrawArticle(database.db, userId, id, t2)

    expect(await saveArticle(database.db, userId, id, values({ adres: 'nieuw' }), false, t2)).toMatchObject({
      saved: true,
    })
    expect((await stored(id))?.slug).toBe('nieuw')
  })

  it('leaves an article for later as it is, which only SQL can make: withdraw it first to publish it now', async () => {
    const id = await draft()
    const later = new Date('2030-01-01T00:00:00Z')

    await database.pool.query('UPDATE articles SET published_at = ? WHERE id = ?', [later, id])

    expect(await saveArticle(database.db, userId, id, values(), true, t1)).toMatchObject({ published: false })
    expect((await stored(id))?.publishedAt).toEqual(later)

    expect(await withdrawArticle(database.db, userId, id, t1)).toBe('done')
    expect(await saveArticle(database.db, userId, id, values(), true, t2)).toMatchObject({ published: true })
    expect((await stored(id))?.publishedAt).toEqual(t2)
  })

  it('says an article is missing, and writes nothing', async () => {
    expect(await saveArticle(database.db, userId, 99_999, values(), true, t1)).toEqual({ status: 'missing' })
    expect(await log()).toEqual([])
  })

  it('writes the log and the change in one transaction: a failing log leaves the article as it was', async () => {
    const id = await draft()

    await expect(saveArticle(database.db, 99_999, id, values({ titel: 'Anders' }), true, t1)).rejects.toBeDefined()
    expect(await stored(id)).toMatchObject({ publishedAt: null, title: 'Welkom', updatedAt: t0 })
    expect(await log()).toHaveLength(1)
  })
})

describe('withdrawArticle', () => {
  it('makes a published article a draft, keeps the text, and writes article.unpublish', async () => {
    const id = await draft()

    await saveArticle(database.db, userId, id, values(), true, t1)

    expect(await withdrawArticle(database.db, userId, id, t2)).toBe('done')
    expect(await stored(id)).toMatchObject({ body: 'Een alinea.', publishedAt: null, updatedAt: t2 })
    expect(await findPublishedArticle(database.db, 'welkom', t2)).toBeUndefined()
    expect(await log()).toMatchObject([
      { action: 'article.create' },
      { action: 'article.publish' },
      { action: 'article.unpublish', createdAt: t2, itemId: id, userId },
    ])
  })

  it('is a no-op for a draft, and writes nothing', async () => {
    const id = await draft()

    expect(await withdrawArticle(database.db, userId, id, t1)).toBe('unchanged')
    expect(await log()).toHaveLength(1)
  })

  it('writes one line when two tabs withdraw at the same time', async () => {
    const id = await draft()

    await saveArticle(database.db, userId, id, values(), true, t1)

    const outcomes = await Promise.all([
      withdrawArticle(database.db, userId, id, t2),
      withdrawArticle(database.db, userId, id, t2),
    ])

    expect(outcomes.toSorted()).toEqual(['done', 'unchanged'])
    expect((await log()).filter((row) => row.action === 'article.unpublish')).toHaveLength(1)
  })

  it('says an article is missing', async () => {
    expect(await withdrawArticle(database.db, userId, 99_999)).toBe('missing')
  })

  it('can publish again, with a new time of publication', async () => {
    const id = await draft()

    await saveArticle(database.db, userId, id, values(), true, t1)
    await withdrawArticle(database.db, userId, id, t2)
    await saveArticle(database.db, userId, id, values(), true, new Date('2026-10-27T10:00:00Z'))

    expect((await stored(id))?.publishedAt).toEqual(new Date('2026-10-27T10:00:00Z'))
  })
})

describe('listArticles and findArticle', () => {
  it('lists drafts and published articles, the one written last first, without the text', async () => {
    const first = await draft()
    const second = await draft({ adres: 'tweede', titel: 'Tweede' })

    await saveArticle(database.db, userId, first, values(), true, t1)

    const rows = await listArticles(database.db)

    expect(rows.map((row) => row.id)).toEqual([second, first])
    expect(rows.map((row) => row.publishedAt)).toEqual([null, t1])
    expect(Object.keys(rows[0] ?? {})).not.toContain('body')
  })

  it('finds an article by its number, and nothing for a number that is none', async () => {
    const id = await draft()

    expect(await findArticle(database.db, id)).toMatchObject({ id, slug: 'welkom', title: 'Welkom' })
    expect(await findArticle(database.db, 99_999)).toBeUndefined()
  })
})

describe('the versions and updated_by of an article', () => {
  let otherId: number

  beforeEach(async () => {
    await createAccount(database.db, 'jelle@example.org', 'beheerder')
    otherId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org')))[0]?.id ?? 0
  })

  const versions = (id: number) =>
    database.db.select().from(articleVersions).where(eq(articleVersions.articleId, id)).orderBy(articleVersions.version)

  /** The newest version must say what the article says. */
  async function expectNewestVersionEqualsArticle(id: number) {
    const article = await stored(id)
    const newest = (await versions(id)).at(-1)

    expect(newest).toMatchObject({
      author: article?.author,
      body: article?.body,
      intro: article?.intro,
      slug: article?.slug,
      title: article?.title,
    })
  }

  it('gives a new draft version 1 and updated_by of its maker, saved at the time of the draft', async () => {
    const id = await draft()

    expect(await stored(id)).toMatchObject({ createdBy: userId, updatedBy: userId })
    expect(await versions(id)).toEqual([
      {
        articleId: id,
        author: 'de redactie',
        body: 'Een alinea.',
        id: expect.any(Number),
        intro: 'We stellen ons voor.',
        savedAt: t0,
        savedBy: userId,
        slug: 'welkom',
        title: 'Welkom',
        version: 1,
      },
    ])
  })

  it('adds a version for each save that changes something, by the account that saved, and keeps the older ones', async () => {
    const id = await draft()

    await saveArticle(database.db, otherId, id, values({ titel: 'Tweede titel' }), false, t1)
    await saveArticle(database.db, userId, id, values({ tekst: 'Derde tekst', titel: 'Tweede titel' }), false, t2)

    expect(await versions(id)).toMatchObject([
      { body: 'Een alinea.', savedAt: t0, savedBy: userId, title: 'Welkom', version: 1 },
      { body: 'Een alinea.', savedAt: t1, savedBy: otherId, title: 'Tweede titel', version: 2 },
      { body: 'Derde tekst', savedAt: t2, savedBy: userId, title: 'Tweede titel', version: 3 },
    ])
    expect(await stored(id)).toMatchObject({ createdBy: userId, updatedBy: userId })
    await expectNewestVersionEqualsArticle(id)
  })

  it('makes no version for a save that changes nothing, and does not move updated_by or updated_at', async () => {
    const id = await draft()

    await saveArticle(database.db, otherId, id, values(), false, t1)

    expect(await versions(id)).toHaveLength(1)
    expect(await stored(id)).toMatchObject({ updatedAt: t0, updatedBy: userId })
  })

  it('makes no version when publishing or withdrawing, but sets updated_by and updated_at', async () => {
    const id = await draft()

    await saveArticle(database.db, otherId, id, values(), true, t1)

    expect(await versions(id)).toHaveLength(1)
    expect(await stored(id)).toMatchObject({ publishedAt: t1, updatedAt: t1, updatedBy: otherId })

    await withdrawArticle(database.db, userId, id, t2)

    expect(await versions(id)).toHaveLength(1)
    expect(await stored(id)).toMatchObject({ publishedAt: null, updatedAt: t2, updatedBy: userId })
  })

  it('makes one version, and sets updated_by once, when a save changes the text and publishes', async () => {
    const id = await draft()

    await saveArticle(database.db, otherId, id, values({ tekst: 'Nieuw' }), true, t1)

    expect(await versions(id)).toHaveLength(2)
    expect(await stored(id)).toMatchObject({ body: 'Nieuw', updatedBy: otherId })
    await expectNewestVersionEqualsArticle(id)
  })

  it('makes no version for a save that is refused, or for an article that is missing', async () => {
    const id = await draft()

    await saveArticle(database.db, userId, id, values(), true, t1)
    await saveArticle(database.db, userId, id, values({ adres: 'ander', tekst: 'Anders' }), false, t2)
    await saveArticle(database.db, userId, 99_999, values(), false, t2)

    expect(await versions(id)).toHaveLength(1)
    expect(await database.db.select().from(articleVersions)).toHaveLength(1)
  })

  it('gives no version to a draft with an address another article has, and none to the article it did not make', async () => {
    await draft()
    await createArticle(database.db, userId, values({ titel: 'Anders' }), t1)

    expect(await database.db.select().from(articleVersions)).toHaveLength(1)
  })

  it('keeps no version when the log fails: the change, the version and the log are one transaction', async () => {
    const id = await draft()

    await expect(saveArticle(database.db, 99_999, id, values({ titel: 'Anders' }), true, t1)).rejects.toBeDefined()
    expect(await versions(id)).toHaveLength(1)
    await expectNewestVersionEqualsArticle(id)
  })

  it('numbers two edits at the same time 2 and 3, with no gap and no repeat', async () => {
    const id = await draft()

    const outcomes = await Promise.all([
      saveArticle(database.db, userId, id, values({ tekst: 'Van een' }), false, t1),
      saveArticle(database.db, otherId, id, values({ tekst: 'Van twee' }), false, t2),
    ])

    expect(outcomes).toMatchObject([{ saved: true }, { saved: true }])
    expect((await versions(id)).map((row) => row.version)).toEqual([1, 2, 3])
    await expectNewestVersionEqualsArticle(id)
  })

  it('numbers many edits at the same time without a gap or a repeat, and the newest is the article', async () => {
    const id = await draft()
    const texts = Array.from({ length: 8 }, (_, index) => `Tekst ${index}`)

    await Promise.all(
      texts.map((tekst, index) =>
        saveArticle(database.db, index % 2 === 0 ? userId : otherId, id, values({ tekst }), false, t1),
      ),
    )

    expect((await versions(id)).map((row) => row.version)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(new Set((await versions(id)).map((row) => row.body)).size).toBe(9)
    await expectNewestVersionEqualsArticle(id)
  })

  it('numbers the versions of each article by itself', async () => {
    const first = await draft()
    const second = await draft({ adres: 'tweede', titel: 'Tweede' })

    await saveArticle(database.db, userId, first, values({ tekst: 'Anders' }), false, t1)

    expect((await versions(first)).map((row) => row.version)).toEqual([1, 2])
    expect((await versions(second)).map((row) => row.version)).toEqual([1])
  })

  it('has a newest version that equals the article after any sequence of actions', async () => {
    const id = await draft()

    const steps: (() => Promise<unknown>)[] = [
      () => saveArticle(database.db, otherId, id, values({ intro: 'Tweede intro' }), false, t1),
      () => saveArticle(database.db, userId, id, values({ intro: 'Tweede intro' }), true, t1),
      () => saveArticle(database.db, otherId, id, values({ intro: 'Tweede intro', tekst: 'Live tekst' }), false, t2),
      () => withdrawArticle(database.db, userId, id, t2),
      () =>
        saveArticle(
          database.db,
          userId,
          id,
          values({ adres: 'nieuw', auteur: 'Jelle', tekst: 'Live tekst' }),
          false,
          t2,
        ),
      () =>
        saveArticle(
          database.db,
          userId,
          id,
          values({ adres: 'nieuw', auteur: 'Jelle', tekst: 'Live tekst' }),
          true,
          t2,
        ),
    ]

    for (const step of steps) {
      await step()
      await expectNewestVersionEqualsArticle(id)
    }

    expect((await versions(id)).map((row) => row.version)).toEqual([1, 2, 3, 4])
    expect(await stored(id)).toMatchObject({ slug: 'nieuw', updatedBy: userId })
  })

  it('keeps the addresses of the versions, even the ones the article no longer has', async () => {
    const id = await draft()

    await saveArticle(database.db, userId, id, values({ adres: 'nieuw-adres' }), false, t1)

    expect((await versions(id)).map((row) => row.slug)).toEqual(['welkom', 'nieuw-adres'])
  })

  it('lists the versions with the address of the account, the newest first', async () => {
    const id = await draft()

    await saveArticle(database.db, otherId, id, values({ tekst: 'Anders' }), false, t1)

    expect(await listVersions(database.db, id)).toEqual([
      { savedAt: t1, savedBy: 'jelle@example.org', version: 2 },
      { savedAt: t0, savedBy: 'sanne@example.org', version: 1 },
    ])
  })
})
