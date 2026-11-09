import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import journal from '../drizzle/meta/_journal.json' with { type: 'json' }
import { checkMigrations, describeMigrationCheck } from './migration-check.ts'
import { createTestDatabase } from './test-database.ts'

const last = journal.entries.at(-1)

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  // Back to a database that is up to date.
  await database.pool.query('DELETE FROM __drizzle_migrations WHERE created_at > ?', [last?.when])
  await database.pool.query('INSERT IGNORE INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [
    'last',
    last?.when,
  ])
})

describe('checkMigrations', () => {
  it('finds nothing wrong with a database that is up to date', async () => {
    const check = await checkMigrations(database.url)

    expect(check).toEqual({ missing: [], unknown: 0 })
    expect(describeMigrationCheck(check)).toEqual({})
  })

  it('names the migration that the database lacks', async () => {
    await database.pool.query('DELETE FROM __drizzle_migrations WHERE created_at = ?', [last?.when])

    const check = await checkMigrations(database.url)

    expect(check).toEqual({ missing: [last?.tag], unknown: 0 })
    expect(describeMigrationCheck(check).error).toBe(
      `The database lacks the migration ${last?.tag}. Wait until the deploy has finished, which migrates it, and run the import again.`,
    )
  })

  it('counts the migrations that are still to come when there are more than one', async () => {
    const [second] = journal.entries.slice(-2)

    await database.pool.query('DELETE FROM __drizzle_migrations WHERE created_at >= ?', [second?.when])

    const check = await checkMigrations(database.url)

    expect(check.missing).toEqual([second?.tag, last?.tag])
    expect(describeMigrationCheck(check).error).toContain(`${second?.tag} and 1 more`)
  })

  it('warns, and does not stop, when the database has a migration this version does not know', async () => {
    await database.pool.query('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [
      'newer',
      (last?.when ?? 0) + 1000,
    ])

    const check = await checkMigrations(database.url)

    expect(check).toEqual({ missing: [], unknown: 1 })
    expect(describeMigrationCheck(check).error).toBeUndefined()
    expect(describeMigrationCheck(check).warning).toContain('1 migration this version')
  })

  it('treats a database that was never migrated as lacking all of them', async () => {
    const empty = await createTestDatabase({ migrate: false })

    try {
      const check = await checkMigrations(empty.url)

      expect(check.missing).toHaveLength(journal.entries.length)
    } finally {
      await empty.drop()
    }
  })

  it('writes nothing', async () => {
    await database.pool.query('DELETE FROM __drizzle_migrations WHERE created_at = ?', [last?.when])

    const count = async () => (await database.pool.query('SELECT COUNT(*) AS n FROM __drizzle_migrations'))[0]
    const before = await count()

    await checkMigrations(database.url)

    expect(await count()).toEqual(before)
  })
})
