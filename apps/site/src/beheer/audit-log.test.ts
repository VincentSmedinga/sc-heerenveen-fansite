import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditActions, auditLog } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import { recordAction } from './audit-log'

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
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'jelle@example.org', 'moderator')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

describe('recordAction', () => {
  it('adds one row with who, when, what, which item and why', async () => {
    const now = new Date('2026-10-26T10:00:00Z')

    await recordAction(database.db, { action: 'item.hide', itemId: 42, reason: 'Fout in het bericht', userId }, now)

    expect(await database.db.select().from(auditLog)).toEqual([
      {
        action: 'item.hide',
        createdAt: now,
        detail: null,
        id: expect.any(Number),
        itemId: 42,
        reason: 'Fout in het bericht',
        userId,
      },
    ])
  })

  it('keeps no reason for an action without one', async () => {
    await recordAction(database.db, { action: 'item.show', itemId: 42, userId })

    expect((await database.db.select().from(auditLog))[0]?.reason).toBeNull()
  })

  it('takes the time of now when it is not given', async () => {
    await recordAction(database.db, { action: 'item.show', itemId: 42, userId })

    const [row] = await database.db.select().from(auditLog)

    expect(Math.abs((row?.createdAt.getTime() ?? 0) - Date.now())).toBeLessThan(60_000)
  })

  it('copies the five fields it knows and nothing else, whatever the caller passes', async () => {
    const entry = { action: 'item.hide', extra: 'jelle@example.org', itemId: 1, token: 'geheim', userId } as const

    await recordAction(database.db, entry)

    const [row] = await database.db.select().from(auditLog)

    expect(Object.keys(row ?? {}).toSorted()).toEqual([
      'action',
      'createdAt',
      'detail',
      'id',
      'itemId',
      'reason',
      'userId',
    ])
    expect(JSON.stringify(row)).not.toMatch(/jelle|geheim/u)
  })

  it('keeps the account by its id, not by its address', async () => {
    await recordAction(database.db, { action: 'item.show', itemId: 1, userId })

    const [row] = await database.db.select().from(auditLog)

    expect(row?.userId).toBe(userId)
  })

  it('refuses an account that does not exist, a reason of 301 characters and an action it does not know', async () => {
    await expect(recordAction(database.db, { action: 'item.show', itemId: 1, userId: 99_999 })).rejects.toBeDefined()
    await expect(
      recordAction(database.db, { action: 'item.hide', itemId: 1, reason: 'x'.repeat(301), userId }),
    ).rejects.toBeDefined()
    await expect(
      recordAction(database.db, { action: 'item.delete' as 'item.hide', itemId: 1, userId }),
    ).rejects.toBeDefined()
  })

  it('keeps a line of the importer, which has no account, and a detail that is cut off when it is too long', async () => {
    await recordAction(database.db, {
      action: 'match.caught-up',
      detail: 'x'.repeat(1200),
      itemId: 5,
      reason: 'Wikipedia heeft de uitslag overgenomen',
      userId: null,
    })

    const [row] = await database.db.select().from(auditLog)

    expect(row).toMatchObject({ action: 'match.caught-up', itemId: 5, userId: null })
    expect(row?.detail).toHaveLength(1000)
    expect(row?.detail?.endsWith('…')).toBe(true)
  })

  it('names the actions of the admin and of the importer so far', () => {
    expect(auditActions).toEqual([
      'item.hide',
      'item.show',
      'article.create',
      'article.update',
      'article.publish',
      'article.unpublish',
      'match.edit',
      'match.undo',
      'match.caught-up',
      'match.differs',
    ])
  })

  it('keeps a row when the account is turned off, and does not let the account be deleted', async () => {
    await recordAction(database.db, { action: 'item.show', itemId: 1, userId })

    await expect(database.db.delete(adminUsers)).rejects.toBeDefined()
    expect(await database.db.select().from(auditLog)).toHaveLength(1)
  })
})

describe('the log is only added to', () => {
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
      expect.arrayContaining(['audit-log.ts', 'import-feeds.ts', 'queries.ts']),
    )
  })

  it('is touched by the schema and the one function that writes to it, and by no other code', () => {
    const touching = files
      .filter((file) => /\bauditLog\b/u.test(readFileSync(file, 'utf8')))
      .map((file) => path.basename(file))

    expect(touching.toSorted()).toEqual(['audit-log.ts', 'schema.ts'])
  })

  it('only inserts: no update, delete, truncate or drop of audit_log anywhere', () => {
    const code = files.map((file) => readFileSync(file, 'utf8')).join('\n')

    expect(code).not.toMatch(/\.(update|delete)\(\s*auditLog\b/u)
    expect(code).not.toMatch(/(truncate|drop|delete\s+from|update)\s+(table\s+)?`?audit_log\b/iu)
    expect(
      readFileSync(path.join(root, 'packages/db/src/audit-log.ts'), 'utf8').match(
        /\.(insert|update|delete|select)\(/gu,
      ),
    ).toEqual(['.insert('])
  })
})
