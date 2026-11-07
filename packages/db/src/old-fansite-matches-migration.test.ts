import type { RowDataPacket } from 'mysql2/promise'

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { competitions } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0049_add_old_fansite_matches'

const newCompetitions = [
  'Eerste divisie',
  'Champions League',
  'Europacup II',
  'UEFA Cup',
  'Intertoto Cup',
  'Play-offs UEFA Cup',
]

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

/** A match of Testdorp FC (club 1), with the columns that differ between the tests. */
function insertMatch(values: {
  competition?: string
  dataSource?: string
  dateText?: null | string
  kickoffAt?: null | string
  round: string
}) {
  const quote = (value: null | string | undefined) => (value === null || value === undefined ? 'NULL' : `'${value}'`)
  const source = values.dataSource === undefined ? '' : `, data_source`
  const sourceValue = values.dataSource === undefined ? '' : `, '${values.dataSource}'`

  return database.pool.query(
    `INSERT INTO matches (season, competition, round, opponent, club_id, home, status, match_date, kickoff_at, date_text${source}) VALUES ('1996/97', ${quote(values.competition ?? 'Eredivisie')}, '${values.round}', 'Testdorp FC', 1, 1, 'scheduled', '1996-08-17', ${quote(values.kickoffAt)}, ${quote(values.dateText)}${sourceValue})`,
  )
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

describe(`the migration ${migration}`, () => {
  it('gives the matches that were there the source wikipedia, and keeps them', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    expect(await rows("SHOW TABLES LIKE 'match_statistics'")).toEqual([])

    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")
    await insertMatch({ dateText: 'x', round: 'Speelronde 1' })

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT round, competition, data_source FROM matches')).toEqual([
      { competition: 'Eredivisie', data_source: 'wikipedia', round: 'Speelronde 1' },
    ])
    expect(await rows("SHOW COLUMNS FROM matches LIKE 'data_source'")).toMatchObject([
      { Default: 'wikipedia', Null: 'NO', Type: "enum('wikipedia','oude-fansite')" },
    ])
  })

  it('has the six new competitions behind the old ones, in matches and in match_changes', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const type = `enum(${competitions.map((competition) => `'${competition}'`).join(',')})`

    expect(competitions.slice(-6)).toEqual(newCompetitions)
    expect(await rows("SHOW COLUMNS FROM matches LIKE 'competition'")).toMatchObject([{ Type: type }])
    expect(await rows("SHOW COLUMNS FROM match_changes LIKE 'competition'")).toMatchObject([{ Type: type }])

    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")

    for (const [index, competition] of newCompetitions.entries()) {
      await insertMatch({ competition, dateText: 'x', round: `Ronde ${index}` })
    }

    expect(await rows('SELECT COUNT(*) AS total FROM matches')).toEqual([{ total: 6 }])
  })

  it('wants a time or a text for a match of Wikipedia, and neither for a match of the old fansite', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")

    await expect(insertMatch({ round: 'Speelronde 1' })).rejects.toThrow(/matches_time_or_text/)
    await expect(insertMatch({ dataSource: 'wikipedia', round: 'Speelronde 2' })).rejects.toThrow(
      /matches_time_or_text/,
    )
    await insertMatch({ dataSource: 'wikipedia', kickoffAt: '1996-08-17 14:30:00', round: 'Speelronde 3' })
    await insertMatch({ dataSource: 'wikipedia', dateText: '17 augustus 1996', round: 'Speelronde 4' })
    await insertMatch({ dataSource: 'oude-fansite', round: 'Speelronde 5' })

    expect(await rows('SELECT round FROM matches ORDER BY round')).toEqual([
      { round: 'Speelronde 3' },
      { round: 'Speelronde 4' },
      { round: 'Speelronde 5' },
    ])
  })

  it('lets every competition but the two leagues have extra time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")

    const extraTime = (competition: string, round: string) =>
      database.pool.query(
        `INSERT INTO matches (season, competition, round, opponent, club_id, home, status, goals_for, goals_against, extra_time, match_date, date_text) VALUES ('1996/97', '${competition}', '${round}', 'Testdorp FC', 1, 1, 'played', 2, 1, 1, '1996-08-17', 'x')`,
      )

    for (const competition of competitions.filter((one) => one !== 'Eredivisie' && one !== 'Eerste divisie')) {
      await extraTime(competition, 'Ronde 1')
    }
    for (const competition of ['Eredivisie', 'Eerste divisie']) {
      await expect(extraTime(competition, 'Ronde 1')).rejects.toThrow(/matches_extra_time_only_in_played_knockout/)
    }
  })

  it('keeps the statistics of a match for sc Heerenveen, and removes them with the match', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")
    await insertMatch({ dataSource: 'oude-fansite', round: 'Speelronde 1' })
    await database.pool.query(
      'INSERT INTO match_statistics (match_id, corners_for, corners_against, offsides_for, offsides_against, fouls_for, fouls_against) VALUES (1, 5, 3, 2, 1, 12, 9)',
    )

    expect(await rows('SELECT * FROM match_statistics')).toEqual([
      {
        corners_against: 3,
        corners_for: 5,
        fouls_against: 9,
        fouls_for: 12,
        match_id: 1,
        offsides_against: 1,
        offsides_for: 2,
      },
    ])
    // One row for each match, and every number is there.
    await expect(
      database.pool.query(
        'INSERT INTO match_statistics (match_id, corners_for, corners_against, offsides_for, offsides_against, fouls_for, fouls_against) VALUES (1, 0, 0, 0, 0, 1, 0)',
      ),
    ).rejects.toThrow(/Duplicate/)
    await expect(
      database.pool.query('INSERT INTO match_statistics (match_id, corners_for) VALUES (1, 1)'),
    ).rejects.toThrow()

    await database.pool.query('DELETE FROM matches WHERE id = 1')

    expect(await rows('SELECT * FROM match_statistics')).toEqual([])
  })

  it('can run twice, and leaves what is in the tables alone the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Testdorp FC', 'testdorp-fc')")
    await insertMatch({ competition: 'UEFA Cup', dataSource: 'oude-fansite', round: 'Eerste ronde' })

    // The journal keeps the migration from running again, so run the statements themselves.
    const sql = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of sql.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT competition, data_source FROM matches')).toEqual([
      { competition: 'UEFA Cup', data_source: 'oude-fansite' },
    ])
    expect(await rows("SHOW TABLES LIKE 'match_statistics'")).toHaveLength(1)
  })
})
