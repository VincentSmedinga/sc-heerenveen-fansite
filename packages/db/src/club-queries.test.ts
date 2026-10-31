import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatchWithoutClub } from './clubs.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { findClubBySlug, listClubMatches, listClubRecords } from './queries.ts'
import { clubNames, clubs, matches } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let number = 0

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM club_names')
  await database.pool.query('DELETE FROM clubs')
})

/** A played match; `ours` and `theirs` are the goals of sc Heerenveen and of the opponent. */
function played(
  opponent: string,
  ours: number,
  theirs: number,
  more: Partial<NewMatchWithoutClub> = {},
): NewMatchWithoutClub {
  number++

  return {
    competition: 'Eredivisie',
    goalsAgainst: theirs,
    goalsFor: ours,
    home: true,
    kickoffAt: new Date('2026-10-24T18:45:00Z'),
    matchDate: '2026-10-24',
    opponent,
    round: `Ronde ${number}`,
    season: '2026/27',
    status: 'played',
    ...more,
  }
}

async function store(...rows: NewMatchWithoutClub[]) {
  await database.db.insert(matches).values(await withClubs(database.db, rows))
}

describe('listClubRecords', () => {
  it('gives nothing while there are no matches', async () => {
    expect(await listClubRecords(database.db)).toEqual([])
  })

  it('counts played, won, drawn, lost and the goals for each club, A to Z', async () => {
    await store(
      played('FC Twente', 2, 0),
      played('FC Twente', 1, 1, { home: false, matchDate: '2026-02-01', season: '2025/26' }),
      played('FC Twente', 0, 3, { competition: 'KNVB Beker', matchDate: '2025-10-30', season: '2025/26' }),
      played('Ajax', 1, 2),
    )

    expect(await listClubRecords(database.db)).toEqual([
      expect.objectContaining({ drawn: 0, goalsAgainst: 2, goalsFor: 1, lost: 1, name: 'Ajax', played: 1, won: 0 }),
      expect.objectContaining({
        drawn: 1,
        goalsAgainst: 4,
        goalsFor: 3,
        lost: 1,
        name: 'FC Twente',
        played: 3,
        slug: 'fc-twente',
        won: 1,
      }),
    ])
  })

  it('counts a cup tie that a shoot-out decided as drawn, by the goals', async () => {
    await store(
      played('Testdorp FC', 1, 1, {
        competition: 'KNVB Beker',
        extraTime: true,
        penaltiesAgainst: 3,
        penaltiesFor: 4,
      }),
    )

    expect(await listClubRecords(database.db)).toMatchObject([{ drawn: 1, lost: 0, played: 1, won: 0 }])
  })

  it('counts only the Eredivisie when asked, and leaves out a club that we met in the cup alone', async () => {
    await store(
      played('FC Twente', 2, 0),
      played('FC Twente', 0, 3, { competition: 'KNVB Beker', matchDate: '2025-10-30', season: '2025/26' }),
      played('Quick Boys', 4, 0, { competition: 'KNVB Beker', matchDate: '2025-10-30', season: '2025/26' }),
    )

    expect(await listClubRecords(database.db, { competition: 'Eredivisie' })).toMatchObject([
      { drawn: 0, goalsAgainst: 0, goalsFor: 2, lost: 0, name: 'FC Twente', played: 1, won: 1 },
    ])
    expect((await listClubRecords(database.db)).map((club) => club.name)).toEqual(['FC Twente', 'Quick Boys'])
  })

  it('gives the same figures for all matches and for the Eredivisie in a season without cup matches', async () => {
    await store(played('FC Twente', 2, 0), played('FC Twente', 1, 1, { home: false, matchDate: '2026-02-01' }))

    expect(await listClubRecords(database.db, { competition: 'Eredivisie' })).toEqual(
      await listClubRecords(database.db),
    )
  })

  it('has a club with one match in the list', async () => {
    await store(played('Quick Boys', 3, 1, { competition: 'KNVB Beker' }))

    expect(await listClubRecords(database.db)).toMatchObject([
      { drawn: 0, goalsAgainst: 1, goalsFor: 3, lost: 0, name: 'Quick Boys', played: 1, won: 1 },
    ])
  })

  it('has a club we have not played yet in the list, with zeros', async () => {
    await store({
      competition: 'Eredivisie',
      dateText: 'februari 2027',
      home: true,
      matchDate: '2027-02-06',
      opponent: 'Vitesse',
      round: 'Speelronde 20',
      season: '2026/27',
      status: 'scheduled',
    })

    expect(await listClubRecords(database.db)).toMatchObject([
      { drawn: 0, goalsAgainst: 0, goalsFor: 0, lost: 0, name: 'Vitesse', played: 0, won: 0 },
    ])
  })

  it('leaves out a club without a match, such as one a made-up season left behind', async () => {
    await database.db.insert(clubs).values({ name: 'Oefenstad FC', slug: 'oefenstad-fc' })

    expect(await listClubRecords(database.db)).toEqual([])
  })

  it('gives the figures as numbers', async () => {
    await store(played('FC Twente', 2, 0))

    const [row] = await listClubRecords(database.db)

    for (const figure of [row!.played, row!.won, row!.drawn, row!.lost, row!.goalsFor, row!.goalsAgainst]) {
      expect(typeof figure).toBe('number')
    }
  })
})

describe('findClubBySlug', () => {
  it('gives the club with its article and its other names, A to Z', async () => {
    const [club] = await database.db
      .insert(clubs)
      .values({ name: 'NEC', slug: 'nec', wikipediaPage: 'NEC Nijmegen' })
      .$returningId()

    await database.db.insert(clubNames).values([
      { clubId: club!.id, name: 'N.E.C.' },
      { clubId: club!.id, name: 'NEC Nijmegen' },
    ])

    expect(await findClubBySlug(database.db, 'nec')).toEqual({
      id: club!.id,
      name: 'NEC',
      otherNames: ['N.E.C.', 'NEC Nijmegen'],
      slug: 'nec',
      wikipediaPage: 'NEC Nijmegen',
    })
  })

  it('gives a club with no other names an empty list, and a club with no article none', async () => {
    await database.db.insert(clubs).values({ name: 'Quick Boys', slug: 'quick-boys' })

    expect(await findClubBySlug(database.db, 'quick-boys')).toMatchObject({ otherNames: [], wikipediaPage: null })
  })

  it('gives nothing for a slug that no club has', async () => {
    expect(await findClubBySlug(database.db, 'bestaat-niet')).toBeUndefined()
  })
})

describe('listClubMatches', () => {
  async function idOf(slug: string) {
    return (await findClubBySlug(database.db, slug))!.id
  }

  it('gives the matches against one club, the newest first, over the seasons', async () => {
    await store(
      played('FC Twente', 2, 0, { matchDate: '2026-10-24' }),
      played('FC Twente', 1, 1, { home: false, matchDate: '2026-02-01', season: '2025/26' }),
      played('FC Twente', 0, 3, { competition: 'KNVB Beker', matchDate: '2025-10-30', season: '2025/26' }),
      played('Ajax', 1, 2, { matchDate: '2026-11-07' }),
    )

    const list = await listClubMatches(database.db, await idOf('fc-twente'))

    expect(list.map((match) => [match.season, match.matchDate, match.competition])).toEqual([
      ['2026/27', '2026-10-24', 'Eredivisie'],
      ['2025/26', '2026-02-01', 'Eredivisie'],
      ['2025/26', '2025-10-30', 'KNVB Beker'],
    ])
    expect(list[0]).toMatchObject({ goalsAgainst: 0, goalsFor: 2, home: true, opponent: 'FC Twente', status: 'played' })
  })

  it('puts the later kick-off first on a day with two matches', async () => {
    await store(
      played('FC Twente', 1, 0, { kickoffAt: new Date('2026-10-24T12:00:00Z') }),
      played('FC Twente', 2, 0, { competition: 'KNVB Beker', kickoffAt: new Date('2026-10-24T18:00:00Z') }),
    )

    expect((await listClubMatches(database.db, await idOf('fc-twente'))).map((match) => match.competition)).toEqual([
      'KNVB Beker',
      'Eredivisie',
    ])
  })

  it('gives only the matches of one competition when asked, and none for a club that has none in it', async () => {
    await store(
      played('FC Twente', 2, 0),
      played('Quick Boys', 3, 0, { competition: 'KNVB Beker', matchDate: '2025-10-30', season: '2025/26' }),
    )

    expect(await listClubMatches(database.db, await idOf('fc-twente'), { competition: 'KNVB Beker' })).toEqual([])
    expect(await listClubMatches(database.db, await idOf('quick-boys'), { competition: 'Eredivisie' })).toEqual([])
    expect(await listClubMatches(database.db, await idOf('quick-boys'), { competition: 'KNVB Beker' })).toHaveLength(1)
  })

  it('gives a match that is not played yet, without a result', async () => {
    await store({
      competition: 'Eredivisie',
      dateText: 'februari 2027',
      home: true,
      matchDate: '2027-02-06',
      opponent: 'Vitesse',
      round: 'Speelronde 20',
      season: '2026/27',
      status: 'scheduled',
    })

    expect(await listClubMatches(database.db, await idOf('vitesse'))).toMatchObject([
      { dateText: 'februari 2027', goalsAgainst: null, goalsFor: null, status: 'scheduled' },
    ])
  })

  it('gives nothing for a club that has no matches', async () => {
    const [club] = await database.db.insert(clubs).values({ name: 'Oefenstad FC', slug: 'oefenstad-fc' }).$returningId()

    expect(await listClubMatches(database.db, club!.id)).toEqual([])
  })
})
