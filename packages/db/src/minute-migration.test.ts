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

const migration = '0051_make_goal_and_card_minute_optional'

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

/** A played match with a report and two players of ours, and no events yet. */
async function insertReport() {
  await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")
  await database.pool.query(
    "INSERT INTO matches (season, competition, round, opponent, club_id, home, status, goals_for, goals_against, match_date, date_text) VALUES ('2026/27', 'KNVB Beker', 'Tweede ronde', 'Testdorp FC', 1, 1, 'played', 1, 1, '2026-10-28', 'x')",
  )
  await database.pool.query("INSERT INTO match_reports (match_id, status) VALUES (1, 'bezig')")
  await database.pool.query(
    "INSERT INTO match_appearances (match_id, ours, name, shirt_number, starter) VALUES (1, 1, 'Eerste', 1, 1), (1, 1, 'Tweede', 2, 1)",
  )
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

const goal = (minute: null | number, stoppage: null | number = null) =>
  database.pool.query(
    "INSERT INTO match_goals (match_id, ours, minute, stoppage_minutes, player) VALUES (1, 1, ?, ?, 'Scorer')",
    [minute, stoppage],
  )

const card = (kind: string, minute: null | number, stoppage: null | number = null, appearance = 1) =>
  database.pool.query(
    'INSERT INTO match_cards (match_id, ours, appearance_id, kind, minute, stoppage_minutes) VALUES (1, 1, ?, ?, ?, ?)',
    [appearance, kind, minute, stoppage],
  )

describe(`the migration ${migration}`, () => {
  it('refuses a goal and a card without a minute before it, and keeps the events that were there', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await insertReport()
    await goal(12)
    await card('geel', 30)

    await expect(goal(null)).rejects.toThrow()
    await expect(card('geel', null, null, 2)).rejects.toThrow()

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT minute FROM match_goals')).toEqual([{ minute: 12 }])
    expect(await rows('SELECT kind, minute FROM match_cards')).toEqual([{ kind: 'geel', minute: 30 }])
  })

  it('can run twice', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()
    await goal(null)
    await card('geel', null)

    // The journal keeps the migration from running again, so run the statements themselves.
    const sql = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of sql.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT minute FROM match_goals')).toEqual([{ minute: null }])
    expect(await rows('SELECT minute FROM match_cards')).toEqual([{ minute: null }])
  })

  it('lets a goal and a yellow card be without a minute, as often as the report needs', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()

    await expect(goal(null)).resolves.toBeDefined()
    await expect(goal(null)).resolves.toBeDefined()
    await expect(card('geel', null)).resolves.toBeDefined()
    await expect(card('geel', null, null, 2)).resolves.toBeDefined()
  })

  it('keeps the minute of a red card and of a yellow-red card', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()

    await expect(card('rood', null)).rejects.toThrow()
    await expect(card('geel-rood', null)).rejects.toThrow()
    await expect(card('rood', 70)).resolves.toBeDefined()
    await expect(card('geel-rood', 80)).resolves.toBeDefined()
  })

  it('lets added time go with a minute only', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()

    await expect(goal(null, 2)).rejects.toThrow()
    await expect(card('geel', null, 2)).rejects.toThrow()
    await expect(goal(45, 2)).resolves.toBeDefined()
    await expect(card('geel', 90, 3)).resolves.toBeDefined()
    // The rule of the half stays.
    await expect(card('geel', 50, 3, 2)).rejects.toThrow()
  })

  it('keeps the minute of a substitution, a missed penalty and a kick of the series', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertReport()

    await expect(
      database.pool.query(
        "INSERT INTO match_incidents (match_id, ours, appearance_id, kind, minute) VALUES (1, 1, 1, 'strafschop-gemist', NULL)",
      ),
    ).rejects.toThrow()
    await expect(
      database.pool.query(
        'INSERT INTO match_substitutions (match_id, ours, appearance_out_id, appearance_in_id, minute) VALUES (1, 1, 1, 2, NULL)',
      ),
    ).rejects.toThrow()
  })
})
