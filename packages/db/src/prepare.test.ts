import type { RowDataPacket } from 'mysql2/promise'

import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { lockNameFor, prepareDatabase } from './prepare.ts'
import { realSources, testSources } from './seed.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function count(table: string) {
  const [rows] = await database.pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM ??', [table])

  return Number(rows[0]?.['total'])
}

async function lockIsFree() {
  const [rows] = await database.pool.query<RowDataPacket[]>('SELECT IS_FREE_LOCK(?) AS free', [
    lockNameFor(database.url),
  ])

  return rows[0]?.['free'] === 1
}

async function tables() {
  const [rows] = await database.pool.query<RowDataPacket[]>(
    'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
  )

  return rows.map((row) => String(row['name']))
}

describe('prepareDatabase', () => {
  it('makes the tables in an empty database and leaves the register empty without the seed', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await count('sources')).toBe(0)
    expect(await count('__drizzle_migrations')).toBeGreaterThan(0)
  })

  it('puts the test sources in the register with the seed, and makes no duplicates when it runs again', async () => {
    await prepareDatabase({ migrationsFolder, seed: true, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: true, url: database.url })

    expect(await count('sources')).toBe(testSources.length + realSources.length)
  })

  it('lets go of the lock when it is done', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await lockIsFree()).toBe(true)
  })

  it('lets processes that start together take turns, so none of them fails', async () => {
    await Promise.all(
      Array.from({ length: 4 }, () => prepareDatabase({ migrationsFolder, seed: true, url: database.url })),
    )

    expect(await count('sources')).toBe(testSources.length + realSources.length)
    // The folder holds three migrations, and each is recorded once.
    expect(await count('__drizzle_migrations')).toBe(3)
  })

  it('gives up when another process keeps the lock, and goes on once it is free', async () => {
    const holder = await database.pool.getConnection()

    try {
      await holder.query('SELECT GET_LOCK(?, 0)', [lockNameFor(database.url)])

      await expect(
        prepareDatabase({ lockSeconds: 1, migrationsFolder, seed: false, url: database.url }),
      ).rejects.toThrow(/Could not get the lock .* within 1 seconds/)
      expect(await tables()).toEqual([])
    } finally {
      await holder.query('DO RELEASE_LOCK(?)', [lockNameFor(database.url)])
      holder.release()
    }

    await prepareDatabase({ lockSeconds: 1, migrationsFolder, seed: false, url: database.url })
    expect(await count('sources')).toBe(0)
  })

  it('lets go of the lock when a migration fails', async () => {
    await expect(
      prepareDatabase({ migrationsFolder: `${migrationsFolder}-bestaat-niet`, seed: false, url: database.url }),
    ).rejects.toThrow()

    expect(await lockIsFree()).toBe(true)
  })

  it('throws when the database is not there', async () => {
    await expect(
      prepareDatabase({ migrationsFolder, seed: false, url: 'mysql://root@127.0.0.1:1/fansite' }),
    ).rejects.toThrow(/ECONNREFUSED/)
  })
})
