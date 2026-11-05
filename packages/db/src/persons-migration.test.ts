import type { RowDataPacket } from 'mysql2/promise'

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { seedMatches, seedSquad } from './seed.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0040_add_persons'

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
  it('makes the two tables empty, with the character sets the titles need, and does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })

    expect(await rows("SHOW TABLES LIKE 'persons'")).toEqual([])

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT * FROM persons')).toEqual([])
    expect(await rows('SELECT * FROM person_pages')).toEqual([])
    expect(
      await rows(
        "SELECT table_name, table_collation FROM information_schema.tables WHERE table_name IN ('persons', 'person_pages') AND table_schema = DATABASE() ORDER BY table_name",
      ),
    ).toMatchObject([{ table_collation: 'utf8mb4_unicode_ci' }, { table_collation: 'utf8mb4_unicode_ci' }])
    // The titles are compared byte for byte, so `Alfred` and `Alfreð` are two titles.
    expect(
      await rows(
        "SELECT table_name, column_name, collation_name FROM information_schema.columns WHERE table_name IN ('persons', 'person_pages') AND column_name IN ('wikipedia_page', 'page') AND table_schema = DATABASE() ORDER BY table_name",
      ),
    ).toMatchObject([{ collation_name: 'utf8mb4_bin' }, { collation_name: 'utf8mb4_bin' }])
  })

  it('adds an empty person_id to the goals and the players that were there, and changes nothing else', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('FC Twente', 'fc-twente')")
    await database.pool.query(
      "INSERT INTO matches (competition, round, season, match_date, kickoff_at, opponent, home, status, goals_for, goals_against, club_id) VALUES ('Eredivisie', 'Speelronde 1', '2025/26', '2026-02-01', '2026-02-01 14:30:00', 'FC Twente', 1, 'played', 1, 0, 1)",
    )
    await database.pool.query(
      "INSERT INTO players (season, name, position, search_term, wikipedia_page) VALUES ('2025/26', 'Luca Oyen', 'aanvaller', 'Oyen', 'Luca Oyen')",
    )
    await database.pool.query(
      "INSERT INTO match_goals (match_id, ours, minute, player, player_id, wikipedia_page) VALUES (1, 1, 10, 'Oyen', 1, 'Luca Oyen')",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT name, wikipedia_page, person_id FROM players')).toEqual([
      { name: 'Luca Oyen', person_id: null, wikipedia_page: 'Luca Oyen' },
    ])
    expect(await rows('SELECT player, player_id, wikipedia_page, person_id FROM match_goals')).toEqual([
      { person_id: null, player: 'Oyen', player_id: 1, wikipedia_page: 'Luca Oyen' },
    ])
    expect(await rows("SHOW COLUMNS FROM match_goals LIKE 'person_id'")).toMatchObject([{ Null: 'YES' }])
    expect(await rows("SHOW COLUMNS FROM players LIKE 'person_id'")).toMatchObject([{ Null: 'YES' }])
  })

  it('gives the made-up squad and the goals of the seed a person, as the import does', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await seedMatches(database.db)).toBe(true)
    expect(await seedSquad(database.db)).toBe(true)
    expect(await rows('SELECT COUNT(*) AS n FROM players WHERE person_id IS NULL')).toMatchObject([{ n: 0 }])
    expect(await rows('SELECT COUNT(*) AS n FROM players')).not.toMatchObject([{ n: 0 }])
    expect(
      await rows('SELECT COUNT(*) AS n FROM match_goals WHERE player_id IS NOT NULL AND person_id IS NULL'),
    ).toMatchObject([{ n: 0 }])
  })

  it('lets a goal and a player lose their person when it is deleted, and the titles go with it', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO persons (wikipedia_page) VALUES ('Luca Oyen')")
    await database.pool.query("INSERT INTO person_pages (page, person_id) VALUES ('Luca Oyen', 1), ('Luca Öyen', 1)")
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('FC Twente', 'fc-twente')")
    await database.pool.query(
      "INSERT INTO matches (competition, round, season, match_date, kickoff_at, opponent, home, status, goals_for, goals_against, club_id) VALUES ('Eredivisie', 'Speelronde 1', '2025/26', '2026-02-01', '2026-02-01 14:30:00', 'FC Twente', 1, 'played', 1, 0, 1)",
    )
    await database.pool.query(
      "INSERT INTO players (season, name, position, search_term, person_id) VALUES ('2025/26', 'Luca Oyen', 'aanvaller', 'Oyen', 1)",
    )
    await database.pool.query(
      "INSERT INTO match_goals (match_id, ours, minute, player, person_id) VALUES (1, 1, 10, 'Oyen', 1)",
    )

    await database.pool.query('DELETE FROM persons')

    expect(await rows('SELECT person_id FROM players')).toEqual([{ person_id: null }])
    expect(await rows('SELECT person_id FROM match_goals')).toEqual([{ person_id: null }])
    expect(await rows('SELECT * FROM person_pages')).toEqual([])
  })

  it('does not take Alfred Finnbogason and Alfreð Finnbogason for one title', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO persons (wikipedia_page) VALUES ('Alfreð Finnbogason')")
    await database.pool.query(
      "INSERT INTO person_pages (page, person_id) VALUES ('Alfreð Finnbogason', 1), ('Alfred Finnbogason', 1)",
    )

    await expect(
      database.pool.query("INSERT INTO persons (wikipedia_page) VALUES ('Alfreð Finnbogason')"),
    ).rejects.toBeDefined()
    expect(await rows('SELECT page FROM person_pages ORDER BY page')).toEqual([
      { page: 'Alfred Finnbogason' },
      { page: 'Alfreð Finnbogason' },
    ])
  })
})
