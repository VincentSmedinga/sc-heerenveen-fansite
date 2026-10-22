import type { RowDataPacket } from 'mysql2/promise'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { lockNameFor, withLock } from './lock.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase({ migrate: false })
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

async function isFree(name: string) {
  const [rows] = await database.pool.query<RowDataPacket[]>('SELECT IS_FREE_LOCK(?) AS free', [name])

  return rows[0]?.['free'] === 1
}

describe('lockNameFor', () => {
  it('gives each task and each database a lock of its own', () => {
    expect(lockNameFor('mysql://root@127.0.0.1:3306/fansite', 'import')).toBe('fansite_import_fansite')
    expect(lockNameFor('mysql://root@127.0.0.1:3306/fansite', 'migrate')).toBe('fansite_migrate_fansite')
    expect(lockNameFor('mysql://root@127.0.0.1:3306/fansite_acc', 'import')).toBe('fansite_import_fansite_acc')
  })

  it('stays within the 64 characters MariaDB allows', () => {
    expect(lockNameFor(`mysql://root@127.0.0.1:3306/${'d'.repeat(64)}`, 'migrate')).toHaveLength(64)
  })
})

describe('withLock', () => {
  // A MariaDB server shares its lock names, so the name has the test database in it.
  const name = () => lockNameFor(database.url, 'import')

  it('runs the task while it holds the lock, and lets go afterwards', async () => {
    const outcome = await withLock(database.pool, name(), 0, async () => isFree(name()))

    expect(outcome).toEqual({ ran: true, result: false })
    expect(await isFree(name())).toBe(true)
  })

  it('does not run the task when another connection holds the lock', async () => {
    const holder = await database.pool.getConnection()
    let ran = false

    try {
      await holder.query('SELECT GET_LOCK(?, 0)', [name()])

      expect(
        await withLock(database.pool, name(), 0, async () => {
          ran = true
        }),
      ).toEqual({ ran: false })
      expect(ran).toBe(false)
    } finally {
      await holder.query('DO RELEASE_LOCK(?)', [name()])
      holder.release()
    }
  })

  it('lets go of the lock when the task fails', async () => {
    await expect(
      withLock(database.pool, name(), 0, async () => {
        throw new Error('Mislukt')
      }),
    ).rejects.toThrow('Mislukt')
    expect(await isFree(name())).toBe(true)
  })
})
