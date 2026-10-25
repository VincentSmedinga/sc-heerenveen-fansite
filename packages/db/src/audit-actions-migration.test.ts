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

const migration = '0011_add_article_audit_actions'

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

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

describe(`the migration ${migration}`, () => {
  it('lets the log take the actions of the articles and leaves the rows that were there as they were', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('beheerder@example.test', 'beheerder')")
    await database.pool.query(
      "INSERT INTO audit_log (created_at, user_id, action, item_id, reason) SELECT '2026-10-21 10:00:00', id, 'item.hide', 7, 'Fout' FROM admin_users",
    )
    await expect(
      database.pool.query(
        "INSERT INTO audit_log (created_at, user_id, action, item_id) SELECT '2026-10-21 10:00:00', id, 'article.create', 1 FROM admin_users",
      ),
    ).rejects.toBeDefined()

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT action, item_id, reason FROM audit_log')).toMatchObject([
      { action: 'item.hide', item_id: 7, reason: 'Fout' },
    ])

    for (const action of ['article.create', 'article.update', 'article.publish', 'article.unpublish']) {
      await database.pool.query(
        'INSERT INTO audit_log (created_at, user_id, action, item_id) SELECT ?, id, ?, 1 FROM admin_users',
        ['2026-10-22 10:00:00', action],
      )
    }

    expect(await rows('SELECT COUNT(*) AS n FROM audit_log')).toMatchObject([{ n: 5 }])
  })

  it('does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT COUNT(*) AS n FROM audit_log')).toMatchObject([{ n: 0 }])
  })
})
