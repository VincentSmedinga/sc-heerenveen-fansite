import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { listScorerMatchIds, listSearchableMatches } from './match-search.ts'
import { matches, matchGoals, persons, personSlugs, players } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  for (const table of ['match_goals', 'matches', 'person_slugs', 'players', 'persons']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

// Every club, match and player is made up.
const base: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  dataSource: 'oude-fansite',
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  matchDate: '2001-09-01',
  opponent: 'Testdorp FC',
  round: 'Wedstrijd 1',
  season: '2001/02',
  status: 'played',
}

async function addMatch(values: Partial<NewMatch>) {
  const [row] = await withClubs(database.db, [{ ...base, ...values }])
  const [inserted] = await database.db.insert(matches).values(row!).$returningId()

  return inserted!.id
}

async function addScorer(name: string, slug: string, { old = [] as string[] } = {}) {
  const [inserted] = await database.db.insert(persons).values({ name, slug }).$returningId()
  const personId = inserted!.id
  const [player] = await database.db
    .insert(players)
    .values({ name, personId, searchTerm: 'x', season: '2001/02' })
    .$returningId()

  for (const address of old) {
    await database.db.insert(personSlugs).values({ personId, slug: address })
  }

  return { personId, playerId: player!.id }
}

describe('listSearchableMatches', () => {
  it('gives every played match with its club, oldest first, and no match that was not played', async () => {
    await addMatch({ matchDate: '2001-09-15', round: 'Wedstrijd 2' })
    await addMatch({ matchDate: '2001-09-01' })
    await addMatch({
      goalsAgainst: null,
      goalsFor: null,
      matchDate: '2001-10-01',
      round: 'Wedstrijd 3',
      status: 'scheduled',
    })

    const found = await listSearchableMatches(database.db)

    expect(found.map((match) => match.matchDate)).toEqual(['2001-09-01', '2001-09-15'])
    expect(found[0]).toMatchObject({
      clubName: 'Testdorp FC',
      clubSlug: expect.any(String),
      goalsAgainst: 1,
      goalsFor: 2,
      status: 'played',
    })
  })
})

describe('listScorerMatchIds', () => {
  it('finds the matches in which a player of ours scored, by his name and by an old name', async () => {
    const scored = await addMatch({ round: 'Wedstrijd 1' })
    const other = await addMatch({ matchDate: '2001-09-15', round: 'Wedstrijd 2' })
    const { personId, playerId } = await addScorer('Joost van Aken', 'joost-van-aken', { old: ['joost-aken'] })

    await database.db.insert(matchGoals).values([
      { matchId: scored, ours: true, personId, player: 'Van Aken', playerId },
      // A goal of the opponent, and an own goal that counts for them, are not his goals.
      { matchId: other, ours: false, ownGoal: true, personId, player: 'Van Aken', playerId },
    ])

    expect(await listScorerMatchIds(database.db, ['aken'])).toEqual([scored])
    expect(await listScorerMatchIds(database.db, ['joost', 'aken'])).toEqual([scored])
    expect(await listScorerMatchIds(database.db, ['joost-aken'])).toEqual([scored])
    expect(await listScorerMatchIds(database.db, ['bestaatniet'])).toEqual([])
  })

  it('finds a goal that is only linked to a player of a season, and counts a match once', async () => {
    const scored = await addMatch({})
    const { playerId } = await addScorer('Piet Jansen', 'piet-jansen')

    await database.db.insert(matchGoals).values([
      { matchId: scored, ours: true, player: 'Jansen', playerId },
      { matchId: scored, minute: 80, ours: true, player: 'Jansen', playerId },
    ])

    expect(await listScorerMatchIds(database.db, ['jansen'])).toEqual([scored])
  })
})
