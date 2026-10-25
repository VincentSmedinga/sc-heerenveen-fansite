import type { RowDataPacket } from 'mysql2/promise'

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0012_add_article_versions'

let database: TestDatabase
let oldFolder: string

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })

  // The migrations as they were before this one: the same files, without it and the ones after
  // it in the journal.
  oldFolder = await mkdtemp(join(tmpdir(), 'fansite-migrations-'))
  await cp(migrationsFolder, oldFolder, { recursive: true })

  const journalPath = join(oldFolder, 'meta', '_journal.json')
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as { entries: { tag: string }[] }

  journal.entries = journal.entries.slice(
    0,
    journal.entries.findIndex((entry) => entry.tag === migration),
  )
  await writeFile(journalPath, JSON.stringify(journal))
})

afterEach(async () => {
  await rm(oldFolder, { force: true, recursive: true })
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

/** What the migration must leave behind for the two articles of `oldDatabaseWithArticles`. */
async function expectMigrated() {
  expect(await rows('SELECT slug, created_by = updated_by AS same FROM articles ORDER BY id')).toMatchObject([
    { same: 1, slug: 'eerste' },
    { same: 1, slug: 'tweede' },
  ])
  expect(
    await rows(
      `SELECT a.slug AS article, v.version, v.title, v.slug, v.intro, v.body, v.author,
              v.saved_at = a.updated_at AS at_updated, v.saved_by = a.updated_by AS by_updated
       FROM article_versions v JOIN articles a ON a.id = v.article_id ORDER BY a.id, v.version`,
    ),
  ).toMatchObject([
    {
      article: 'eerste',
      at_updated: 1,
      author: 'de redactie',
      body: 'Tekst een',
      by_updated: 1,
      intro: 'Intro een',
      slug: 'eerste',
      title: 'Eerste',
      version: 1,
    },
    {
      article: 'tweede',
      at_updated: 1,
      author: 'Jelle',
      body: 'Tekst twee',
      by_updated: 1,
      intro: 'Intro twee',
      slug: 'tweede',
      title: 'Tweede: Fryslân 🗞️',
      version: 1,
    },
  ])
}

/** The database as the site left it before this migration: two editors and two articles. */
async function oldDatabaseWithArticles() {
  await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
  await database.pool.query(
    "INSERT INTO admin_users (email, role) VALUES ('een@example.test', 'beheerder'), ('twee@example.test', 'beheerder')",
  )
  await database.pool.query(
    `INSERT INTO articles (slug, title, intro, body, author, published_at, created_at, updated_at, created_by)
     SELECT 'eerste', 'Eerste', 'Intro een', 'Tekst een', 'de redactie', '2026-10-20 10:00:00', '2026-10-20 09:00:00', '2026-10-21 12:30:00', id
     FROM admin_users WHERE email = 'een@example.test'`,
  )
  await database.pool.query(
    `INSERT INTO articles (slug, title, intro, body, author, created_at, updated_at, created_by)
     SELECT 'tweede', 'Tweede: Fryslân 🗞️', 'Intro twee', 'Tekst twee', 'Jelle', '2026-10-22 09:00:00', '2026-10-22 09:00:00', id
     FROM admin_users WHERE email = 'twee@example.test'`,
  )
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

describe(`the migration ${migration}`, () => {
  it('gives every article that was there updated_by from created_by and a version 1, the way the site migrates at its start', async () => {
    await oldDatabaseWithArticles()

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    await expectMigrated()
    expect(await rows('SELECT slug, published_at FROM articles ORDER BY id')).toMatchObject([
      { published_at: new Date('2026-10-20T10:00:00Z'), slug: 'eerste' },
      { published_at: null, slug: 'tweede' },
    ])
    expect(await rows('SELECT COUNT(*) AS n FROM audit_log')).toMatchObject([{ n: 0 }])
  })

  it('makes updated_by required and a real account, and keeps the version table utf8mb4', async () => {
    await oldDatabaseWithArticles()
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const insert = (updatedBy: string) =>
      database.pool.query(
        `INSERT INTO articles (slug, title, intro, body, author, created_by, updated_by)
         SELECT 'derde', 'Derde', 'Intro', 'Tekst', 'de redactie', id, ${updatedBy} FROM admin_users LIMIT 1`,
      )

    await expect(insert('NULL')).rejects.toBeDefined()
    await expect(insert('99999')).rejects.toBeDefined()
    expect(
      await rows("SELECT TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_NAME = 'article_versions'"),
    ).toMatchObject([{ TABLE_COLLATION: 'utf8mb4_unicode_ci' }])
  })

  it('works on a database without articles', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT COUNT(*) AS n FROM article_versions')).toMatchObject([{ n: 0 }])
  })

  it('does nothing the second time', async () => {
    await oldDatabaseWithArticles()
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    await expectMigrated()
    expect(await rows('SELECT COUNT(*) AS n FROM article_versions')).toMatchObject([{ n: 2 }])
  })

  describe('after a start that stopped halfway', async () => {
    // MariaDB cannot undo DDL, so a migration that fails leaves the statements before it done
    // and the migration unrecorded. The next start runs all statements again.
    const statements = (await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')).split(
      '--> statement-breakpoint',
    )

    it('has the statements it is cut into', () => {
      expect(statements.length).toBeGreaterThanOrEqual(6)
    })

    it.each(statements.slice(0, -1).map((_, index) => index + 1))(
      'finishes the job when only the first %i statements ran',
      async (done) => {
        await oldDatabaseWithArticles()

        for (const statement of statements.slice(0, done)) {
          await database.pool.query(statement)
        }

        await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

        await expectMigrated()
        expect(await rows('SELECT COUNT(*) AS n FROM article_versions')).toMatchObject([{ n: 2 }])
      },
    )

    it('does not add a second version 1 when the insert of the versions ran and the start stopped before it was recorded', async () => {
      await oldDatabaseWithArticles()

      for (const statement of statements) {
        await database.pool.query(statement)
      }

      await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

      await expectMigrated()
      expect(await rows('SELECT COUNT(*) AS n FROM article_versions')).toMatchObject([{ n: 2 }])
    })
  })
})
