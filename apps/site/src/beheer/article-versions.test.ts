import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, articles, articleVersions } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import { findVersion, listVersions, recordVersion } from './article-versions'

let database: TestDatabase
let userId: number
let articleId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM article_versions')
  await database.pool.query('DELETE FROM articles')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0

  const [row] = await database.db
    .insert(articles)
    .values({
      author: 'de redactie',
      body: 'Een alinea.',
      createdBy: userId,
      intro: 'Een intro.',
      slug: 'welkom',
      title: 'Welkom',
      updatedBy: userId,
    })
    .$returningId()

  articleId = row?.id ?? 0
})

const content = (overrides = {}) => ({
  author: 'de redactie',
  body: 'Een alinea.',
  intro: 'Een intro.',
  slug: 'welkom',
  title: 'Welkom',
  ...overrides,
})

const t0 = new Date('2026-10-26T09:00:00Z')
const t1 = new Date('2026-10-26T10:00:00Z')

describe('recordVersion', () => {
  it('adds version 1 for an article that has none, with who and when', async () => {
    await recordVersion(database.db, { articleId, content: content(), userId }, t0)

    expect(await database.db.select().from(articleVersions)).toEqual([
      {
        articleId,
        author: 'de redactie',
        body: 'Een alinea.',
        id: expect.any(Number),
        intro: 'Een intro.',
        savedAt: t0,
        savedBy: userId,
        slug: 'welkom',
        title: 'Welkom',
        version: 1,
      },
    ])
  })

  it('adds one more than the highest number, and takes the time of now when it is not given', async () => {
    await recordVersion(database.db, { articleId, content: content(), userId }, t0)
    await recordVersion(database.db, { articleId, content: content({ title: 'Anders' }), userId })

    const rows = await database.db.select().from(articleVersions).orderBy(articleVersions.version)

    expect(rows.map((row) => row.version)).toEqual([1, 2])
    expect(Math.abs((rows[1]?.savedAt.getTime() ?? 0) - Date.now())).toBeLessThan(60_000)
  })

  it('keeps quotes, accents and emoji exactly as given, and does not read them as SQL', async () => {
    const body = "l'ordre; DROP TABLE articles; -- Fryslân 🗞️ ?"

    await recordVersion(database.db, { articleId, content: content({ body }), userId }, t0)

    expect((await database.db.select().from(articleVersions))[0]?.body).toBe(body)
    expect(await database.db.select().from(articles)).toHaveLength(1)
  })

  it('copies the five fields it knows and nothing else, whatever the caller passes', async () => {
    const extra = content({ extra: 'jelle@example.org', token: 'geheim' })

    await recordVersion(database.db, { articleId, content: extra, userId }, t0)

    const [row] = await database.db.select().from(articleVersions)

    expect(Object.keys(row ?? {}).toSorted()).toEqual([
      'articleId',
      'author',
      'body',
      'id',
      'intro',
      'savedAt',
      'savedBy',
      'slug',
      'title',
      'version',
    ])
    expect(JSON.stringify(row)).not.toMatch(/jelle|geheim/u)
  })

  it('refuses an article or an account that does not exist, and a text that is too long', async () => {
    await expect(
      recordVersion(database.db, { articleId: 99_999, content: content(), userId }, t0),
    ).rejects.toBeDefined()
    await expect(
      recordVersion(database.db, { articleId, content: content(), userId: 99_999 }, t0),
    ).rejects.toBeDefined()
    await expect(
      recordVersion(database.db, { articleId, content: content({ title: 'x'.repeat(121) }), userId }, t0),
    ).rejects.toBeDefined()
    expect(await database.db.select().from(articleVersions)).toEqual([])
  })

  it('does not let two versions of an article share a number, even when nobody locked the article', async () => {
    await recordVersion(database.db, { articleId, content: content(), userId }, t0)

    await expect(
      database.pool.query(
        `INSERT INTO article_versions (article_id, version, title, slug, intro, body, author, saved_at, saved_by)
         VALUES (?, 1, 'a', 'a', 'a', 'a', 'a', ?, ?)`,
        [articleId, t0, userId],
      ),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' })
  })

  it('does not let the article or the account of a version go', async () => {
    await recordVersion(database.db, { articleId, content: content(), userId }, t0)

    await expect(database.pool.query('DELETE FROM articles')).rejects.toBeDefined()
    await expect(database.pool.query('DELETE FROM admin_users')).rejects.toBeDefined()
    expect(await database.db.select().from(articleVersions)).toHaveLength(1)
  })

  it('gives two edits at the same time two numbers, without the caller locking the article', async () => {
    await recordVersion(database.db, { articleId, content: content(), userId }, t0)

    const outcomes = await Promise.allSettled([
      recordVersion(database.db, { articleId, content: content({ body: 'a' }), userId }, t1),
      recordVersion(database.db, { articleId, content: content({ body: 'b' }), userId }, t1),
    ])
    const numbers = (await database.db.select().from(articleVersions)).map((row) => row.version).toSorted()

    // Either both won a number of their own, or one was refused: never two with one number, and
    // never a gap.
    expect(new Set(numbers).size).toBe(numbers.length)
    expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, index) => index + 1))
    expect(numbers.length).toBe(1 + outcomes.filter((outcome) => outcome.status === 'fulfilled').length)
  })
})

describe('listVersions and findVersion', () => {
  it('lists the versions of an article only, the newest first', async () => {
    const [other] = await database.db
      .insert(articles)
      .values({
        author: 'de redactie',
        body: 'Andere tekst.',
        createdBy: userId,
        intro: 'Andere intro.',
        slug: 'andere',
        title: 'Andere',
        updatedBy: userId,
      })
      .$returningId()

    await recordVersion(database.db, { articleId, content: content(), userId }, t0)
    await recordVersion(database.db, { articleId, content: content({ body: 'Twee' }), userId }, t1)
    await recordVersion(database.db, { articleId: other?.id ?? 0, content: content({ slug: 'andere' }), userId }, t1)

    expect(await listVersions(database.db, articleId)).toEqual([
      { savedAt: t1, savedBy: 'sanne@example.org', version: 2 },
      { savedAt: t0, savedBy: 'sanne@example.org', version: 1 },
    ])
    expect(await listVersions(database.db, 99_999)).toEqual([])
  })

  it('finds a version with its text and says whether it is the newest', async () => {
    await recordVersion(database.db, { articleId, content: content(), userId }, t0)
    await recordVersion(database.db, { articleId, content: content({ body: 'Twee' }), userId }, t1)

    expect(await findVersion(database.db, articleId, 1)).toMatchObject({
      body: 'Een alinea.',
      newest: false,
      savedAt: t0,
      savedBy: 'sanne@example.org',
      version: 1,
    })
    expect(await findVersion(database.db, articleId, 2)).toMatchObject({ body: 'Twee', newest: true, version: 2 })
  })

  it('finds nothing for a number the article never had, or an article that is none', async () => {
    await recordVersion(database.db, { articleId, content: content(), userId }, t0)

    expect(await findVersion(database.db, articleId, 2)).toBeUndefined()
    expect(await findVersion(database.db, articleId, 0)).toBeUndefined()
    expect(await findVersion(database.db, 99_999, 1)).toBeUndefined()
  })

  it('does not show a version under another article', async () => {
    await recordVersion(database.db, { articleId, content: content(), userId }, t0)

    const [other] = await database.db
      .insert(articles)
      .values({
        author: 'a',
        body: 'b',
        createdBy: userId,
        intro: 'c',
        slug: 'andere',
        title: 'd',
        updatedBy: userId,
      })
      .$returningId()

    expect(await findVersion(database.db, other?.id ?? 0, 1)).toBeUndefined()
  })
})

describe('the versions are only added to', () => {
  const root = path.resolve(import.meta.dirname, '../../../..')
  const folders = ['apps/site/src', 'apps/importer/src', 'packages/db/src'].map((folder) => path.join(root, folder))

  /** Every source file of the site, the importer and the database package, without tests. */
  const files = folders.flatMap((folder) =>
    readdirSync(folder, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.tsx?$/u.test(entry.name) && !/\.(test|stories)\.tsx?$/u.test(entry.name))
      .map((entry) => path.join(entry.parentPath, entry.name)),
  )

  it('looks at the files of the site, the importer and the database package', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files.map((file) => path.basename(file))).toEqual(
      expect.arrayContaining(['article-versions.ts', 'import-feeds.ts', 'queries.ts']),
    )
  })

  it('is touched by the schema and the one file that reads and writes it, and by no other code', () => {
    const touching = files
      .filter((file) => /\barticleVersions\b|\barticle_versions\b/u.test(readFileSync(file, 'utf8')))
      .map((file) => path.basename(file))

    expect(touching.toSorted()).toEqual(['article-versions.ts', 'schema.ts'])
  })

  it('only inserts: no update, delete, truncate or drop of article_versions anywhere', () => {
    const code = files.map((file) => readFileSync(file, 'utf8')).join('\n')

    expect(code).not.toMatch(/\.(update|delete)\(\s*articleVersions\b/u)
    expect(code).not.toMatch(/(truncate|drop|delete\s+from|update)\s+(table\s+)?`?article_versions\b/iu)
    expect(
      readFileSync(path.join(import.meta.dirname, 'article-versions.ts'), 'utf8').match(/\.(insert|update|delete)\(/gu),
    ).toEqual(['.insert('])
  })
})
