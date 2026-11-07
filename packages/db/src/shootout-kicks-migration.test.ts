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

const migration = '0048_add_shootout_kicks'

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

/** A played match with a report, one player of ours (1) and one of the opponent (2). */
async function insertReport() {
  await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")
  await database.pool.query(
    "INSERT INTO matches (season, competition, round, opponent, club_id, home, status, goals_for, goals_against, match_date, date_text, extra_time, penalties_for, penalties_against) VALUES ('2026/27', 'KNVB Beker', 'Tweede ronde', 'Testdorp FC', 1, 1, 'played', 1, 1, '2026-10-28', 'x', 1, 4, 3)",
  )
  await database.pool.query("INSERT INTO match_reports (match_id, status) VALUES (1, 'bezig')")
  await database.pool.query(
    "INSERT INTO match_appearances (match_id, ours, name, shirt_number, starter) VALUES (1, 1, 'Eigen Speler', 9, 1), (1, 0, 'Andere Speler', 7, 1)",
  )
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

const kick = (appearance: null | number, ours: number, round: number, outcome = 'raak') =>
  database.pool.query(
    'INSERT INTO match_shootout_kicks (match_id, ours, round, appearance_id, outcome) VALUES (1, ?, ?, ?, ?)',
    [ours, round, appearance, outcome],
  )

describe(`the migration ${migration}`, () => {
  it('gives a database that was there the table, and keeps its report', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    expect(await rows("SHOW TABLES LIKE 'match_shootout_kicks'")).toEqual([])

    await insertReport()
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW TABLES LIKE 'match_shootout_kicks'")).toHaveLength(1)
    expect(await rows('SELECT COUNT(*) AS kicks FROM match_shootout_kicks')).toEqual([{ kicks: 0 }])
    expect(await rows('SELECT name FROM match_appearances ORDER BY id')).toEqual([
      { name: 'Eigen Speler' },
      { name: 'Andere Speler' },
    ])
  })

  it('can run twice, and leaves what is in the table alone the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()
    await kick(1, 1, 1)

    // The journal keeps the migration from running again, so run the statements themselves.
    const sql = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of sql.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT appearance_id, outcome FROM match_shootout_kicks')).toEqual([
      { appearance_id: 1, outcome: 'raak' },
    ])
  })

  it('keeps one kick for each team in each round, and the three outcomes', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()
    await kick(1, 1, 1, 'raak')
    await kick(2, 0, 1, 'naast')
    await kick(null, 0, 2, 'gestopt')

    await expect(kick(1, 1, 1)).rejects.toThrow()
    await expect(kick(null, 0, 1)).rejects.toThrow()
    await expect(kick(1, 1, 2, 'misschien')).rejects.toThrow()
  })

  it('keeps the round between 1 and 50', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()

    await expect(kick(1, 1, 0)).rejects.toThrow()
    await expect(kick(1, 1, 51)).rejects.toThrow()
    await expect(kick(1, 1, 50)).resolves.toBeDefined()
  })

  it('takes only a player of the same match and the same team, or none', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()

    // Player 2 is of the opponent, so he can't kick for us.
    await expect(kick(2, 1, 1)).rejects.toThrow()
    await expect(kick(999, 1, 1)).rejects.toThrow()
    await expect(kick(null, 0, 1)).resolves.toBeDefined()
  })

  it('goes with the player, the report and the match', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()
    await kick(1, 1, 1)
    await kick(2, 0, 1)

    await database.pool.query('DELETE FROM match_appearances WHERE id = 2')
    expect(await rows('SELECT appearance_id FROM match_shootout_kicks')).toEqual([{ appearance_id: 1 }])

    await database.pool.query('DELETE FROM match_reports WHERE match_id = 1')
    expect(await rows('SELECT id FROM match_shootout_kicks')).toEqual([])

    await database.pool.query("INSERT INTO match_reports (match_id, status) VALUES (1, 'bezig')")
    await kick(null, 0, 1)
    await database.pool.query('DELETE FROM matches WHERE id = 1')
    expect(await rows('SELECT id FROM match_shootout_kicks')).toEqual([])
  })
})
