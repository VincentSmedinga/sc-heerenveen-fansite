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

const migration = '0049_make_shirt_number_optional'

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

/** A played match with a report, and no players yet. */
async function insertReport() {
  await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")
  await database.pool.query(
    "INSERT INTO matches (season, competition, round, opponent, club_id, home, status, goals_for, goals_against, match_date, date_text) VALUES ('2026/27', 'KNVB Beker', 'Tweede ronde', 'Testdorp FC', 1, 1, 'played', 1, 1, '2026-10-28', 'x')",
  )
  await database.pool.query("INSERT INTO match_reports (match_id, status) VALUES (1, 'bezig')")
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

const player = (name: string, ours: number, shirtNumber: null | number) =>
  database.pool.query(
    'INSERT INTO match_appearances (match_id, ours, name, shirt_number, starter) VALUES (1, ?, ?, ?, 1)',
    [ours, name, shirtNumber],
  )

describe(`the migration ${migration}`, () => {
  it('refuses a player without a number before it, and keeps the players that were there', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await insertReport()
    await player('Eigen Speler', 1, 9)

    await expect(player('Zonder Nummer', 1, null)).rejects.toThrow()

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT name, shirt_number FROM match_appearances ORDER BY id')).toEqual([
      { name: 'Eigen Speler', shirt_number: 9 },
    ])
  })

  it('can run twice', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()
    await player('Zonder Nummer', 1, null)

    // The journal keeps the migration from running again, so run the statements themselves.
    const sql = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of sql.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT name, shirt_number FROM match_appearances')).toEqual([
      { name: 'Zonder Nummer', shirt_number: null },
    ])
  })

  it('lets several players of a team have no number, and keeps one player for each number', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()

    await player('Eerste', 1, null)
    await player('Tweede', 1, null)
    await player('Derde', 0, null)
    await player('Met nummer', 1, 9)

    await expect(player('Dubbel', 1, 9)).rejects.toThrow()
    await expect(player('Andere kant', 0, 9)).resolves.toBeDefined()
  })

  it('keeps the number between 1 and 99 when there is one', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()

    await expect(player('Nul', 1, 0)).rejects.toThrow()
    await expect(player('Honderd', 1, 100)).rejects.toThrow()
    await expect(player('Negenennegentig', 1, 99)).resolves.toBeDefined()
  })
})
