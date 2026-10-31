import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewPlayer } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { listSeasonPlayerStats } from './queries.ts'
import { players, playerSeasonStats } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

const season = '2026/27'

const oyen: NewPlayer = {
  name: 'Luca Oyen',
  position: 'aanvaller',
  searchTerm: 'Oyen',
  season,
  wikipediaPage: 'Luca Oyen',
}

const vente: NewPlayer = {
  name: 'Dylan Vente',
  position: 'aanvaller',
  searchTerm: 'Vente',
  season,
  wikipediaPage: 'Dylan Vente',
}

describe('the numbers of the players', () => {
  let database: TestDatabase

  beforeAll(async () => {
    database = await createTestDatabase()
  })

  afterAll(async () => {
    // Undefined when the server wasn't there, which beforeAll has already reported.
    await database?.drop()
  })

  beforeEach(async () => {
    await database.pool.query('DELETE FROM players')
  })

  async function addPlayer(player: NewPlayer) {
    const [{ insertId }] = await database.db.insert(players).values(player)

    return insertId
  }

  describe('the table player_season_stats', () => {
    it('has one row for a player, a season and a competition', async () => {
      const playerId = await addPlayer(oyen)
      const row = { appearances: 8, assists: 1, competition: 'Eredivisie', goals: 2, playerId, season } as const

      await database.db.insert(playerSeasonStats).values(row)
      await database.db.insert(playerSeasonStats).values({ ...row, competition: 'KNVB Beker' })
      await database.db.insert(playerSeasonStats).values({ ...row, season: '2027/28' })

      await expect(database.db.insert(playerSeasonStats).values(row)).rejects.toThrow()
      expect(await database.db.select().from(playerSeasonStats)).toHaveLength(3)
    })

    it('only knows the competitions of the matches', async () => {
      const playerId = await addPlayer(oyen)

      await expect(
        database.pool.query(
          "INSERT INTO player_season_stats (player_id, season, competition, appearances, goals, assists) VALUES (?, '2026/27', 'Europa League', 1, 0, 0)",
          [playerId],
        ),
      ).rejects.toThrow()
    })

    it('needs a player, and goes with its player', async () => {
      const row = { appearances: 1, assists: 0, competition: 'Eredivisie', goals: 0, season } as const

      await expect(database.db.insert(playerSeasonStats).values({ ...row, playerId: 99999 })).rejects.toThrow()

      const playerId = await addPlayer(oyen)

      await database.db.insert(playerSeasonStats).values({ ...row, playerId })
      await database.db.delete(players).where(eq(players.id, playerId))

      expect(await database.db.select().from(playerSeasonStats)).toEqual([])
    })

    it('sets the moment of the change in UTC when nobody gives one', async () => {
      const playerId = await addPlayer(oyen)

      await database.db
        .insert(playerSeasonStats)
        .values({ appearances: 1, assists: 0, competition: 'Eredivisie', goals: 0, playerId, season })

      const [row] = await database.db.select().from(playerSeasonStats)

      expect(Math.abs((row?.updatedAt.getTime() ?? 0) - Date.now())).toBeLessThan(60_000)
    })
  })

  describe('listSeasonPlayerStats', () => {
    it('gives the numbers of the season per player and competition, by name and then competition', async () => {
      const oyenId = await addPlayer(oyen)
      const venteId = await addPlayer(vente)
      const row = { appearances: 0, assists: 0, goals: 0, season }

      await database.db.insert(playerSeasonStats).values([
        { ...row, appearances: 8, assists: 1, competition: 'KNVB Beker', goals: 2, playerId: oyenId },
        { ...row, appearances: 9, assists: 2, competition: 'Eredivisie', goals: 1, playerId: venteId },
        { ...row, appearances: 7, competition: 'Eredivisie', goals: 4, playerId: oyenId },
      ])

      expect(await listSeasonPlayerStats(database.db, season)).toEqual([
        {
          appearances: 9,
          assists: 2,
          competition: 'Eredivisie',
          goals: 1,
          inSquad: true,
          name: 'Dylan Vente',
          playerId: venteId,
          position: 'aanvaller',
          wikipediaPage: 'Dylan Vente',
        },
        {
          appearances: 7,
          assists: 0,
          competition: 'Eredivisie',
          goals: 4,
          inSquad: true,
          name: 'Luca Oyen',
          playerId: oyenId,
          position: 'aanvaller',
          wikipediaPage: 'Luca Oyen',
        },
        {
          appearances: 8,
          assists: 1,
          competition: 'KNVB Beker',
          goals: 2,
          inSquad: true,
          name: 'Luca Oyen',
          playerId: oyenId,
          position: 'aanvaller',
          wikipediaPage: 'Luca Oyen',
        },
      ])
    })

    it('gives only the season asked for, and nothing for a season without numbers', async () => {
      const playerId = await addPlayer(oyen)
      const row = { appearances: 8, assists: 1, competition: 'Eredivisie', goals: 2, playerId } as const

      await database.db.insert(playerSeasonStats).values([
        { ...row, season },
        { ...row, appearances: 30, season: '2025/26' },
      ])

      expect(await listSeasonPlayerStats(database.db, season)).toMatchObject([{ appearances: 8 }])
      expect(await listSeasonPlayerStats(database.db, '2025/26')).toMatchObject([{ appearances: 30 }])
      expect(await listSeasonPlayerStats(database.db, '2024/25')).toEqual([])
    })

    it('keeps the numbers of a player who left the squad, and says that he left', async () => {
      const playerId = await addPlayer({ ...vente, inSquad: false, leftSquadAt: new Date('2026-10-20T10:00:00Z') })

      await database.db
        .insert(playerSeasonStats)
        .values({ appearances: 3, assists: 0, competition: 'Eredivisie', goals: 1, playerId, season })

      expect(await listSeasonPlayerStats(database.db, season)).toMatchObject([
        { goals: 1, inSquad: false, name: 'Dylan Vente' },
      ])
    })

    it('gives only what a page shows: no moment of change and no internal columns', async () => {
      const playerId = await addPlayer(oyen)

      await database.db
        .insert(playerSeasonStats)
        .values({ appearances: 8, assists: 1, competition: 'Eredivisie', goals: 2, playerId, season })

      const [stats] = await listSeasonPlayerStats(database.db, season)

      expect(Object.keys(stats ?? {}).sort()).toEqual([
        'appearances',
        'assists',
        'competition',
        'goals',
        'inSquad',
        'name',
        'playerId',
        'position',
        'wikipediaPage',
      ])
    })
  })
})
