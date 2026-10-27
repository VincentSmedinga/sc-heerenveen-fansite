import { eq } from 'drizzle-orm'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch, NewPlayer } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { matches, matchGoals, players } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0018_add_player_links'

const match: NewMatch = {
  competition: 'Eredivisie',
  goalsAgainst: 0,
  goalsFor: 1,
  home: true,
  kickoffAt: new Date('2026-10-24T18:45:00Z'),
  matchDate: '2026-10-24',
  opponent: 'Testdorp FC',
  round: 'Speelronde 1',
  season: '2026/27',
  status: 'played',
}

const player: NewPlayer = {
  name: 'Luca Oyen',
  position: 'aanvaller',
  searchTerm: 'Oyen',
  season: '2026/27',
  wikipediaPage: 'Luca Oyen',
}

describe('the links between goals and players', () => {
  let database: TestDatabase

  beforeAll(async () => {
    database = await createTestDatabase()
  })

  afterAll(async () => {
    // Undefined when the server wasn't there, which beforeAll has already reported.
    await database?.drop()
  })

  beforeEach(async () => {
    await database.pool.query('DELETE FROM matches')
    await database.pool.query('DELETE FROM players')
  })

  async function insertGoal(playerId: null | number) {
    const [{ insertId: matchId }] = await database.db.insert(matches).values(match)

    await database.db
      .insert(matchGoals)
      .values({ matchId, minute: 12, ours: true, player: 'Oyen', playerId, wikipediaPage: 'Luca Oyen' })
  }

  it('puts a new player in the squad, without a departure', async () => {
    await database.db.insert(players).values({ ...player, wikipediaPage: null })

    const [row] = await database.db.select().from(players)

    expect(row).toMatchObject({ inSquad: true, leftSquadAt: null, wikipediaPage: null })
  })

  it('points a goal to a player, and gives the goal no player when the player is deleted', async () => {
    const [{ insertId }] = await database.db.insert(players).values(player)

    await insertGoal(insertId)
    expect(await database.db.select().from(matchGoals)).toMatchObject([{ playerId: insertId }])

    await database.db.delete(players).where(eq(players.id, insertId))

    // The goal stays, with the page and the name, and has no player.
    expect(await database.db.select().from(matchGoals)).toMatchObject([
      { player: 'Oyen', playerId: null, wikipediaPage: 'Luca Oyen' },
    ])
  })

  it('keeps the goals of a player who left the squad, and of a player who was updated', async () => {
    const [{ insertId }] = await database.db.insert(players).values(player)

    await insertGoal(insertId)
    await database.db
      .update(players)
      .set({ inSquad: false, leftSquadAt: new Date('2027-01-31T12:00:00Z') })
      .where(eq(players.id, insertId))

    expect(await database.db.select().from(matchGoals)).toMatchObject([{ playerId: insertId }])
  })

  it('refuses a goal that points to a player that is not there', async () => {
    await expect(insertGoal(999_999)).rejects.toThrow()
  })

  it('refuses a player who left the squad with a time and is in the squad', async () => {
    await expect(
      database.db.insert(players).values({ ...player, inSquad: true, leftSquadAt: new Date('2027-01-31T12:00:00Z') }),
    ).rejects.toThrow()
  })

  it('keeps a page to one player in a season, and lets two seasons or two empty pages be', async () => {
    await database.db.insert(players).values(player)

    await expect(database.db.insert(players).values({ ...player, name: 'Luca Oyen Junior' })).rejects.toThrow()

    await database.db.insert(players).values({ ...player, season: '2025/26' })
    await database.db.insert(players).values({ ...player, name: 'Pim Verbeek', wikipediaPage: null })
    await database.db.insert(players).values({ ...player, name: 'Sam Kersten', wikipediaPage: null })

    expect(await database.db.select().from(players)).toHaveLength(4)
  })
})

describe(`the migration ${migration}`, () => {
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
    await database?.drop()
  })

  it('leaves a player and a goal that were there, the player in the squad and the goal without a player', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO players (season, name, position, shirt_number, search_term) VALUES ('2026/27', 'Luca Oyen', 'aanvaller', 11, 'Oyen'), ('2026/27', 'Pim Verbeek', 'doelman', 1, 'Verbeek')",
    )
    await database.pool.query(
      "INSERT INTO matches (competition, round, season, match_date, kickoff_at, opponent, home, status, goals_for, goals_against) VALUES ('Eredivisie', 'Speelronde 1', '2026/27', '2026-10-24', '2026-10-24 18:45:00', 'Testdorp FC', 1, 'played', 1, 0)",
    )
    await database.pool.query(
      "INSERT INTO match_goals (match_id, ours, minute, player) SELECT id, 1, 12, 'Oyen' FROM matches",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await database.db.select().from(players)).toMatchObject([
      { inSquad: true, leftSquadAt: null, name: 'Luca Oyen', wikipediaPage: null },
      { inSquad: true, leftSquadAt: null, name: 'Pim Verbeek', wikipediaPage: null },
    ])
    expect(await database.db.select().from(matchGoals)).toMatchObject([
      { player: 'Oyen', playerId: null, wikipediaPage: null },
    ])
  })

  it('can run again after it stopped halfway', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    // The first statements are done, the rest is not, and the journal does not know it ran.
    await database.pool.query('ALTER TABLE players ADD COLUMN wikipedia_page varchar(255)')
    await database.pool.query('ALTER TABLE match_goals ADD COLUMN player_id int unsigned')

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await database.db.select().from(players)).toEqual([])
    await expect(database.db.select().from(matchGoals)).resolves.toEqual([])
  })
})
