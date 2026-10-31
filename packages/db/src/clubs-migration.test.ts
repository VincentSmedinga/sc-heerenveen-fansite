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

const migration = '0021_add_clubs'

let database: TestDatabase
let oldFolder: string

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })

  // The migrations as they were before this one: the same files, without it.
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

let round = 0

/** A played match against the opponent, as the table was before the migration. */
async function addOldMatch(opponent: string, season = '2025/26') {
  round++
  await database.pool.query(
    "INSERT INTO matches (competition, round, season, match_date, kickoff_at, opponent, home, status, goals_for, goals_against) VALUES ('Eredivisie', ?, ?, '2026-02-01', '2026-02-01 14:30:00', ?, 1, 'played', 1, 0)",
    [`Speelronde ${round}`, season, opponent],
  )
}

describe(`the migration ${migration}`, () => {
  it('makes the tables and does nothing wrong in an empty database', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT * FROM clubs')).toEqual([])
    expect(await rows('SELECT * FROM club_names')).toEqual([])
    expect(await rows("SHOW COLUMNS FROM matches LIKE 'club_id'")).toMatchObject([
      { Null: 'NO', Type: 'int(10) unsigned' },
    ])
  })

  it('makes a club of every opponent and links every match, whatever the capitals', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await addOldMatch('ADO Den Haag')
    await addOldMatch('ADO Den Haag', '2024/25')
    await addOldMatch('ado den haag', '2023/24')
    await addOldMatch('FC Twente')

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT slug, name, wikipedia_page FROM clubs ORDER BY slug')).toEqual([
      { name: 'ADO Den Haag', slug: 'ado-den-haag', wikipedia_page: null },
      { name: 'FC Twente', slug: 'fc-twente', wikipedia_page: null },
    ])
    expect(await rows('SELECT opponent, club_id FROM matches WHERE club_id IS NULL')).toEqual([])
    expect(
      await rows(
        'SELECT clubs.slug, COUNT(*) AS matches FROM matches JOIN clubs ON clubs.id = matches.club_id GROUP BY clubs.slug ORDER BY clubs.slug',
      ),
    ).toEqual([
      { matches: 3, slug: 'ado-den-haag' },
      { matches: 1, slug: 'fc-twente' },
    ])
  })

  it('writes a slug without accents, dots and apostrophes, and gives a slug that is taken a number', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    for (const opponent of [
      "Be Quick '28",
      'N.E.C.',
      'FC Groningen',
      'F.C. Groningen',
      'Brøndby IF',
      'Kies',
      '???',
      'VVV-Venlo',
    ]) {
      await addOldMatch(opponent)
    }

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT name, slug FROM clubs ORDER BY name')).toEqual([
      { name: '???', slug: 'club' },
      { name: "Be Quick '28", slug: 'be-quick-28' },
      { name: 'Brøndby IF', slug: 'brondby-if' },
      { name: 'F.C. Groningen', slug: 'fc-groningen' },
      { name: 'FC Groningen', slug: 'fc-groningen-2' },
      { name: 'Kies', slug: 'kies-2' },
      { name: 'N.E.C.', slug: 'nec' },
      { name: 'VVV-Venlo', slug: 'vvv-venlo' },
    ])
  })

  it('cuts a long name to a slug that fits', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await addOldMatch(`Voetbalvereniging ${'Heel Lang '.repeat(8).slice(0, 78)}Eind`)

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const [club] = await rows('SELECT slug FROM clubs')

    expect(club!['slug'].length).toBeLessThanOrEqual(70)
    expect(club!['slug']).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/u)
  })

  it('refuses a match without a club and a club that does not exist afterwards', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const insert = (clubId: null | number) =>
      database.pool.query(
        "INSERT INTO matches (competition, round, season, match_date, kickoff_at, opponent, club_id, home, status) VALUES ('Eredivisie', 'Speelronde 1', '2026/27', '2026-10-24', '2026-10-24 18:45:00', 'Testdorp FC', ?, 1, 'scheduled')",
        [clubId],
      )

    await expect(insert(null)).rejects.toThrow()
    await expect(insert(999_999)).rejects.toThrow()
  })

  it('can run again after it stopped halfway', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await addOldMatch('ADO Den Haag')
    await addOldMatch('FC Twente')
    // The first statements are done, the rest is not, and the journal does not know it ran.
    await database.pool.query(
      'CREATE TABLE clubs (id int unsigned AUTO_INCREMENT NOT NULL, slug varchar(80) NOT NULL, name varchar(100) NOT NULL, wikipedia_page varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin, created_at datetime NOT NULL DEFAULT (UTC_TIMESTAMP()), PRIMARY KEY (id), UNIQUE (slug), UNIQUE (wikipedia_page))',
    )
    await database.pool.query('ALTER TABLE matches ADD COLUMN club_id int unsigned')
    await database.pool.query("INSERT INTO clubs (slug, name) VALUES ('ado-den-haag', 'ADO Den Haag')")

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT slug FROM clubs ORDER BY slug')).toEqual([
      { slug: 'ado-den-haag' },
      { slug: 'fc-twente' },
    ])
    expect(await rows('SELECT id FROM matches WHERE club_id IS NULL')).toEqual([])
  })
})
