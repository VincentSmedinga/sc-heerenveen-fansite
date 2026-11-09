import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatchWithoutClub } from './clubs.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { findClubBySlug, findPreviousMeeting, listClubMatches, listClubRecords } from './queries.ts'
import { clubNames, clubs, matches, matchGoals } from './schema.ts'
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

  it('counts a cup tie that a shoot-out decided as won or lost, with the goals as they were', async () => {
    const cup = (penaltiesFor: number, penaltiesAgainst: number) =>
      played('Testdorp FC', 1, 1, { competition: 'KNVB Beker', extraTime: true, penaltiesAgainst, penaltiesFor })

    await store(cup(4, 3))

    expect(await listClubRecords(database.db)).toMatchObject([
      { drawn: 0, goalsAgainst: 1, goalsFor: 1, lost: 0, played: 1, won: 1 },
    ])

    await store(cup(3, 5), played('Testdorp FC', 0, 0))

    expect(await listClubRecords(database.db)).toMatchObject([
      { drawn: 1, goalsAgainst: 2, goalsFor: 2, lost: 1, played: 3, won: 1 },
    ])
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

  it('gives the number of spectators of each match, null where it is not known, and not the referee', async () => {
    await store(
      played('FC Twente', 2, 0, { attendance: 26500, matchDate: '2026-10-24' }),
      played('FC Twente', 1, 1, { home: false, matchDate: '2026-02-01', season: '2025/26' }),
    )

    const list = await listClubMatches(database.db, await idOf('fc-twente'))

    expect(list.map((match) => match.attendance)).toEqual([26500, null])
    expect(list[0]).not.toHaveProperty('referee')
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

  it('gives each match its note, its score after 90 minutes and its scorers in the order of the clock', async () => {
    await store(
      played('FC Twente', 2, 2, {
        afterNinetyAgainst: 1,
        afterNinetyFor: 1,
        competition: 'KNVB Beker',
        extraTime: true,
        note: 'Aangepast',
      }),
      played('Ajax', 1, 0),
    )

    const twente = await idOf('fc-twente')
    const [{ id: twenteMatch = 0 } = {}, { id: ajaxMatch = 0 } = {}] = await database.db
      .select({ id: matches.id })
      .from(matches)
      .orderBy(matches.id)

    await database.db.insert(matchGoals).values([
      { matchId: twenteMatch, minute: 70, ours: false, player: 'Late' },
      { matchId: twenteMatch, minute: 12, ours: true, penalty: true, player: 'Vroeg' },
      { matchId: ajaxMatch, minute: 5, ours: true, player: 'Elders' },
    ])

    const [list] = await listClubMatches(database.db, twente)

    expect(list).toMatchObject({ afterNinetyAgainst: 1, afterNinetyFor: 1, extraTime: true, note: 'Aangepast' })
    // The goals are those of this club's match alone, not of the other club's.
    expect(list?.goals.map((goal) => [goal.minute, goal.player, goal.penalty])).toEqual([
      [12, 'Vroeg', true],
      [70, 'Late', false],
    ])
    expect(list?.id).toBe(twenteMatch)
  })

  it('gives a match without a goal an empty list of scorers', async () => {
    await store(played('FC Twente', 0, 0))

    expect(await listClubMatches(database.db, await idOf('fc-twente'))).toMatchObject([{ goals: [] }])
  })

  it('gives nothing for a club that has no matches', async () => {
    const [club] = await database.db.insert(clubs).values({ name: 'Oefenstad FC', slug: 'oefenstad-fc' }).$returningId()

    expect(await listClubMatches(database.db, club!.id)).toEqual([])
  })
})

describe('findPreviousMeeting', () => {
  it('gives the newest played match at the same ground, from any competition', async () => {
    await store(
      played('FC Twente', 2, 1, { matchDate: '2026-04-12', season: '2025/26' }),
      played('FC Twente', 0, 0, { competition: 'KNVB Beker', matchDate: '2026-10-30' }),
      played('FC Twente', 3, 3, { home: false, matchDate: '2026-02-01', season: '2025/26' }),
    )

    expect(await findPreviousMeeting(database.db, { home: true, opponent: 'FC Twente' })).toEqual({
      dataSource: 'wikipedia',
      goalsAgainst: 0,
      goalsFor: 0,
      matchDate: '2026-10-30',
    })
    expect(await findPreviousMeeting(database.db, { home: false, opponent: 'FC Twente' })).toEqual(
      expect.objectContaining({ goalsFor: 3, matchDate: '2026-02-01' }),
    )
  })

  it('gives the archive match when that is the last one, with its source', async () => {
    await store(played('Ajax', 1, 4, { dataSource: 'oude-fansite', matchDate: '2005-03-05', season: '2004/05' }))

    expect(await findPreviousMeeting(database.db, { home: true, opponent: 'Ajax' })).toEqual(
      expect.objectContaining({ dataSource: 'oude-fansite', goalsAgainst: 4, goalsFor: 1 }),
    )
  })

  it('skips a match that is not played and gives nothing without a meeting', async () => {
    await store(
      {
        competition: 'Eredivisie',
        home: true,
        kickoffAt: new Date('2026-12-01T18:45:00Z'),
        matchDate: '2026-12-01',
        opponent: 'PSV',
        round: 'Ronde 99',
        season: '2026/27',
        status: 'scheduled',
      },
      played('Ajax', 1, 0, { home: false }),
    )

    expect(await findPreviousMeeting(database.db, { home: true, opponent: 'PSV' })).toBeUndefined()
    expect(await findPreviousMeeting(database.db, { home: true, opponent: 'Ajax' })).toBeUndefined()
    expect(await findPreviousMeeting(database.db, { home: true, opponent: 'Onbekend' })).toBeUndefined()
  })
})
