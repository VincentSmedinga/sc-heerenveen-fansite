import type { RowDataPacket } from 'mysql2/promise'

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { playerSources } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0045_add_match_reports'

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

const tables = ['match_reports', 'match_appearances', 'match_substitutions', 'match_cards', 'match_incidents']

describe(`the migration ${migration}`, () => {
  it('gives a database that was there the five tables and the columns of the goals, and keeps its goals', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    expect(await rows("SHOW TABLES LIKE 'match_reports'")).toEqual([])

    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")
    await database.pool.query(
      "INSERT INTO matches (season, competition, round, opponent, club_id, home, status, goals_for, goals_against, match_date, date_text) VALUES ('2026/27', 'Eredivisie', 'Speelronde 1', 'Testdorp FC', 1, 1, 'played', 1, 0, '2026-08-08', 'x')",
    )
    await database.pool.query("INSERT INTO match_goals (match_id, ours, minute, player) VALUES (1, 1, 12, 'Demo')")

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    for (const table of tables) {
      expect(await rows(`SHOW TABLES LIKE '${table}'`)).toHaveLength(1)
    }

    expect(await rows('SELECT minute, player, appearance_id, assist_appearance_id FROM match_goals')).toEqual([
      { appearance_id: null, assist_appearance_id: null, minute: 12, player: 'Demo' },
    ])
  })

  it('can run twice, and leaves what is in the tables alone the second time', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    // The journal keeps the migration from running again, so run the statements themselves.
    const sql = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of sql.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    for (const table of tables) {
      expect(await rows(`SHOW TABLES LIKE '${table}'`)).toHaveLength(1)
    }
  })

  it('has the source verslag, last in the lists of the players and of the completeness of the squad', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const type = `enum(${playerSources.map((source) => `'${source}'`).join(',')})`

    expect(playerSources.at(-1)).toBe('verslag')
    expect(await rows("SHOW COLUMNS FROM players LIKE 'source'")).toMatchObject([{ Default: 'selectie', Type: type }])
    expect(await rows("SHOW COLUMNS FROM squad_completeness LIKE 'best_source'")).toMatchObject([{ Type: type }])
  })
})
