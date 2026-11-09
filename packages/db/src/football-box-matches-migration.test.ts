import type { RowDataPacket } from 'mysql2/promise'

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { competitions, wikipediaPageKinds } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0058_add_football_box_matches'

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

/** A played match of Testdorp FC (club 1) that went to extra time, in this competition. */
function insertMatch(competition: string) {
  return database.pool.query(
    `INSERT INTO matches (season, competition, round, opponent, club_id, home, status, match_date, date_text, goals_for, goals_against, extra_time) VALUES ('2009/10', '${competition}', 'Finale', 'Testdorp FC', 1, 1, 'played', '2009-07-25', 'x', 2, 1, 1)`,
  )
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

describe(`the migration ${migration}`, () => {
  it('refuses the two new competitions before it, and takes them after it, with extra time', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")

    await expect(insertMatch('Johan Cruijff Schaal')).rejects.toThrow(/competition/)

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const type = `enum(${competitions.map((competition) => `'${competition}'`).join(',')})`

    expect(competitions.slice(-2)).toEqual(['Johan Cruijff Schaal', 'Play-offs Champions League'])
    expect(await rows("SHOW COLUMNS FROM matches LIKE 'competition'")).toMatchObject([{ Type: type }])
    expect(await rows("SHOW COLUMNS FROM match_changes LIKE 'competition'")).toMatchObject([{ Type: type }])

    await insertMatch('Johan Cruijff Schaal')
    await insertMatch('Play-offs Champions League')

    expect(await rows('SELECT competition, extra_time FROM matches ORDER BY id')).toEqual([
      { competition: 'Johan Cruijff Schaal', extra_time: 1 },
      { competition: 'Play-offs Champions League', extra_time: 1 },
    ])
  })

  it('gives every page a language: en for the page of the Europa League, nl for the others', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO wikipedia_pages (title, season, kind, read_at) VALUES ('Een Engelse pagina', '2012/13', 'europa-league', '2026-11-09 12:00:00'), ('KNVB Beker 2012/13 (mannen)', '2012/13', 'cup', '2026-11-09 12:00:00'), ('Een selectie', '2012/13', 'squad', '2026-11-09 12:00:00')",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT title, kind, language FROM wikipedia_pages ORDER BY title')).toEqual([
      { kind: 'europa-league', language: 'en', title: 'Een Engelse pagina' },
      { kind: 'squad', language: 'nl', title: 'Een selectie' },
      { kind: 'cup', language: 'nl', title: 'KNVB Beker 2012/13 (mannen)' },
    ])
  })

  it('takes a page of the kind matches, with the Dutch Wikipedia as the language when none is given', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const type = `enum(${wikipediaPageKinds.map((kind) => `'${kind}'`).join(',')})`

    expect(await rows("SHOW COLUMNS FROM wikipedia_pages LIKE 'kind'")).toMatchObject([{ Type: type }])

    await database.pool.query(
      "INSERT INTO wikipedia_pages (title, season, kind, read_at) VALUES ('KNVB Beker 2008/09 (mannen)', '2008/09', 'matches', '2026-11-09 12:00:00')",
    )
    await database.pool.query(
      "INSERT INTO wikipedia_pages (title, season, kind, language, read_at) VALUES ('2009–10 SC Heerenveen season', '2009/10', 'matches', 'en', '2026-11-09 12:00:00')",
    )

    expect(await rows('SELECT kind, language FROM wikipedia_pages ORDER BY season')).toEqual([
      { kind: 'matches', language: 'nl' },
      { kind: 'matches', language: 'en' },
    ])
  })

  it('can run again after it stopped halfway', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const statements = (await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8'))
      .split('--> statement-breakpoint')
      .map((statement) => statement.replace(/^--.*$/gmu, '').trim())

    for (const statement of statements) {
      await database.pool.query(statement)
    }

    expect(await rows("SHOW COLUMNS FROM wikipedia_pages LIKE 'language'")).toMatchObject([
      { Default: 'nl', Null: 'NO', Type: 'varchar(12)' },
    ])
  })
})
