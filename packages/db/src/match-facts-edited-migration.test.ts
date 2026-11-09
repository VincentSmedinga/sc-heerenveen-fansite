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

const migration = '0055_add_match_facts_edited'

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
  it('keeps the entries as they are, with no facts held, and lets a change have the part facts', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('NEC', 'nec')")
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'beheerder')")
    await database.pool.query(
      "INSERT INTO matches (season, competition, round, opponent, club_id, home, status, match_date, kickoff_at, data_source) SELECT '2026/27', 'Eredivisie', 'Speelronde 1', 'NEC', id, 1, 'scheduled', '2026-10-31', '2026-10-31 17:45:00', 'wikipedia' FROM clubs LIMIT 1",
    )
    await database.pool.query(
      "INSERT INTO match_edits (match_id, kickoff_edited, edited_by, edited_at, reason, before_match, before_goals) SELECT m.id, 1, a.id, '2026-11-09 10:00:00', 'x', '{}', '[]' FROM matches m, admin_users a LIMIT 1",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT kickoff_edited, facts_edited, reported_facts FROM match_edits')).toMatchObject([
      { facts_edited: 0, kickoff_edited: 1, reported_facts: null },
    ])
    // A row without any part held is still refused.
    await expect(database.pool.query('UPDATE match_edits SET kickoff_edited = 0')).rejects.toThrow()
    await database.pool.query('UPDATE match_edits SET kickoff_edited = 0, facts_edited = 1')
    await database.pool.query(
      "INSERT INTO match_changes (season, competition, round, changed, part, class, reason, old_value, status, first_seen_at, last_seen_at) VALUES ('2026/27', 'Eredivisie', 'Speelronde 1', 'gegevens', 'facts', 'suspicious', 'x', 'y', 'pending', '2026-10-25 10:00:00', '2026-10-25 10:00:00')",
    )

    expect(await rows('SELECT part FROM match_changes')).toMatchObject([{ part: 'facts' }])
  })

  it('does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW COLUMNS FROM match_edits LIKE 'facts_edited'")).toHaveLength(1)
  })
})
