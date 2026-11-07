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

const migration = '0047_add_report_formations'

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
  it('gives a report that was stored before it no formation, and keeps the rest of it', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    expect(await rows("SHOW COLUMNS FROM match_reports LIKE 'formation_ours'")).toEqual([])

    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")
    await database.pool.query(
      "INSERT INTO matches (season, competition, round, opponent, club_id, home, status, goals_for, goals_against, match_date, date_text) VALUES ('2026/27', 'Eredivisie', 'Speelronde 1', 'Testdorp FC', 1, 1, 'played', 1, 0, '2026-08-08', 'x')",
    )
    await database.pool.query(
      "INSERT INTO match_reports (match_id, status, source) VALUES (1, 'bezig', 'wedstrijdformulier')",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT status, source, formation_ours, formation_opponent FROM match_reports')).toEqual([
      { formation_opponent: null, formation_ours: null, source: 'wedstrijdformulier', status: 'bezig' },
    ])
  })

  it('can run twice', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    // The journal keeps the migration from running again, so run the statements themselves.
    const sql = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of sql.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows("SHOW COLUMNS FROM match_reports LIKE 'formation_%'")).toHaveLength(2)
  })

  it('holds the shape of a formation in the database, and leaves the sum of ten to the rules', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")
    await database.pool.query(
      "INSERT INTO matches (season, competition, round, opponent, club_id, home, status, goals_for, goals_against, match_date, date_text) VALUES ('2026/27', 'Eredivisie', 'Speelronde 1', 'Testdorp FC', 1, 1, 'played', 1, 0, '2026-08-08', 'x')",
    )

    const set = (column: string, value: null | string) =>
      database.pool.query(
        `INSERT INTO match_reports (match_id, status, ${column}) VALUES (1, 'bezig', ?) ON DUPLICATE KEY UPDATE ${column} = VALUES(${column})`,
        [value],
      )

    for (const good of ['4-3-3', '4-1-2-1-2', '10', null]) {
      await expect(set('formation_ours', good), String(good)).resolves.toBeDefined()
    }

    for (const bad of ['', '4-3-', '-4-3', '4--3', '4 3 3', 'vier', '0-10', '4-03-3']) {
      await expect(set('formation_ours', bad), JSON.stringify(bad)).rejects.toThrow()
      await expect(set('formation_opponent', bad), JSON.stringify(bad)).rejects.toThrow()
    }

    // Ten is the rule of the report, not of the database.
    await expect(set('formation_opponent', '4-3-4')).resolves.toBeDefined()
  })
})
