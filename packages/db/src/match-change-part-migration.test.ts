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

const migration = '0031_add_match_change_part'

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
  it('keeps the changes that wait as ordinary changes, and lets the log take the two decisions', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO match_changes (season, competition, round, changed, class, reason, old_value, status, first_seen_at, last_seen_at) VALUES ('2026/27', 'Eredivisie', 'Speelronde 1', 'uitslag', 'suspicious', 'x', 'y', 'pending', '2026-10-25 10:00:00', '2026-10-25 10:00:00')",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT part, mailed_at, taken_over_mailed_at FROM match_changes')).toMatchObject([
      { mailed_at: null, part: null, taken_over_mailed_at: null },
    ])

    for (const action of ['match.take-over', 'match.keep']) {
      await database.pool.query('INSERT INTO audit_log (created_at, action, item_id) VALUES (?, ?, 1)', [
        '2026-11-02 10:00:00',
        action,
      ])
    }

    expect(await rows('SELECT COUNT(*) AS n FROM audit_log')).toMatchObject([{ n: 2 }])
  })

  it('does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW COLUMNS FROM match_changes LIKE 'part'")).toHaveLength(1)
  })
})
