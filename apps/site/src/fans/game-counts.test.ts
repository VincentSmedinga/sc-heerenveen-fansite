import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, fantasyPicks, matches, players, quizEntries, quizzes, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { fjouwerSurnames } from './fjouwer'
import { countFours, countParticipants } from './game-counts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

async function addSupporter(screenName: string, disabledAt: Date | null = null) {
  const [{ insertId }] = await database.db.insert(supporters).values({
    createdAt: new Date('2026-09-01T00:00:00Z'),
    disabledAt,
    email: `${screenName.toLowerCase()}@example.test`,
    screenName,
    screenNameKey: screenName.toLowerCase(),
  })

  return insertId
}

describe('the number of fans who sent in a quiz', () => {
  it('counts an account and a closed one, and not a blocked one', async () => {
    const [{ insertId: quizId }] = await database.db
      .insert(quizzes)
      .values({ month: 11, source: 'redactie', status: 'published', year: 2026 })
    const entry = (supporterId: null | number, blocked = false) => ({
      answers: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      blocked,
      quizId,
      score: 1,
      submittedAt: new Date('2026-11-02T00:00:00Z'),
      supporterId,
    })

    await database.db
      .insert(quizEntries)
      .values([
        entry(await addSupporter('Tjalle99')),
        entry(await addSupporter('Geblokkeerd', new Date('2026-11-03T00:00:00Z'))),
        entry(null),
        entry(null, true),
      ])

    expect(await countParticipants(database.db, quizId)).toBe(2)
  })
})

describe('the number of fans who saved a four', () => {
  it('counts an account and a closed one, and not a blocked one or another match', async () => {
    const [{ insertId: clubId }] = await database.db.insert(clubs).values({ name: 'Testclub', slug: 'testclub' })
    const addMatch = async (round: number) => {
      const [{ insertId }] = await database.db.insert(matches).values({
        clubId,
        competition: 'Eredivisie',
        home: true,
        kickoffAt: new Date(`2026-11-${20 + round}T19:00:00Z`),
        matchDate: `2026-11-${20 + round}`,
        opponent: 'Testclub',
        round: `Speelronde ${round}`,
        season: '2026/27',
        status: 'scheduled',
      })

      return insertId
    }
    const [{ insertId: playerId }] = await database.db
      .insert(players)
      .values({ position: 'middenvelder', searchTerm: 'Proefman', season: '2026/27', sourceName: 'Proefman' })
    const match = await addMatch(1)
    const other = await addMatch(2)
    const pick = (matchId: number, supporterId: null | number) => ({
      matchId,
      player1Id: playerId,
      player2Id: playerId,
      player3Id: playerId,
      player4Id: playerId,
      supporterId,
    })
    const known = await addSupporter('Pompebled')

    await database.db
      .insert(fantasyPicks)
      .values([
        pick(match, known),
        pick(match, await addSupporter('Dicht', new Date('2026-11-03T00:00:00Z'))),
        pick(match, null),
        pick(other, known),
      ])

    expect(await countFours(database.db, match)).toBe(2)
  })
})

describe('the surnames of a four', () => {
  it('names a player who is no longer in the squad too', async () => {
    const [{ insertId }] = await database.db
      .insert(players)
      .values({ inSquad: false, searchTerm: 'Vertrekker', season: '2026/27', sourceName: 'Piet de Vertrekker' })

    expect((await fjouwerSurnames(database.db, [insertId])).get(insertId)).toBe('de Vertrekker')
    expect(await fjouwerSurnames(database.db, [])).toEqual(new Map())
  })
})
