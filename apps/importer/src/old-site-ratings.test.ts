import type { TestDatabase } from '@fansite/db/test-database'

import { matchCoachRatings, matchPlayerRatings, oldSeasonRatings, players, staff } from '@fansite/db/schema'
import { seedStaff } from '@fansite/db/staff-seed'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { OldSiteData, OldSiteMatch, OldSiteRatingOfSeason } from './old-site-file.ts'

import { importOldSiteClubs, oldSiteClubIds } from './old-site-clubs.ts'
import { importOldSiteMatches } from './old-site-matches.ts'
import { importOldSitePlayers } from './old-site-players.ts'
import { importOldSiteCoachRatings, importOldSiteRatings, importOldSiteSeasonRatings } from './old-site-ratings.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

const zero = {
  awayCorners: 0,
  awayFouls: 0,
  awayOffside: 0,
  homeCorners: 0,
  homeFouls: 0,
  homeOffside: 0,
}

const oldClubs = [
  { code: 'nec', country: 'NL', name: 'NEC' },
  { code: 'ajax', country: 'NL', name: 'Ajax' },
]

const oldMatch = (code: string, dateTime: string, round: number, ours: string[]): OldSiteMatch => ({
  attendance: null,
  code,
  competition: 1,
  dateTime,
  events: [],
  lineup: ours.map((playerCode, index) => ({
    minuteIn: 0,
    minuteOut: 90,
    order: index + 1,
    playerCode,
    playerName: null,
  })),
  note: null,
  referee: null,
  result: { awayFullTime: 0, awayHalfTime: 0, homeFullTime: 1, homeHalfTime: 0, note: null },
  round,
  season: '0102',
  statistics: zero,
})

const matchList = [
  oldMatch('nec.thuis', '2001-09-01 20:00:00', 1, ['hans.vonk', 'erik.edman']),
  oldMatch('ajax.uit', '2001-09-15 20:00:00', 2, ['hans.vonk']),
]

const rating = (matchCode: string, playerCode: string, average: number, count: number, spread: number) => ({
  average,
  count,
  matchCode,
  playerCode,
  season: '0102',
  spread,
})

function dataOf(overrides: Partial<OldSiteData> = {}): OldSiteData {
  return {
    clubs: oldClubs,
    coachRatings: [],
    fantest: [],
    matches: matchList,
    players: [],
    predictions: [],
    ratings: [],
    seasonRatings: [],
    ...overrides,
  }
}

const ratings: OldSiteRatingOfSeason[] = [
  rating('nec.thuis', 'hans.vonk', 7.25, 20, 1.1),
  rating('nec.thuis', 'erik.edman', 6.5, 4, 0.5),
  rating('ajax.uit', 'hans.vonk', 8, 12, 0.9),
]

beforeEach(async () => {
  for (const table of [
    'match_coach_ratings',
    'match_player_ratings',
    'staff',
    'old_season_ratings',
    'match_edits',
    'match_statistics',
    'matches',
    'players',
    'clubs',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

/** Runs the steps the ratings need: the clubs, the matches and the players. */
async function prepare(data: OldSiteData) {
  await importOldSiteClubs(database.db, data.clubs)
  await importOldSiteMatches(database.db, data.matches, data.clubs, await oldSiteClubIds(database.db, data.clubs))
  await importOldSitePlayers(database.db, data.matches, data.players)
}

const stored = () => database.db.select().from(matchPlayerRatings).orderBy(asc(matchPlayerRatings.id))

describe('the step cijfers', () => {
  it('writes the average, the number and the spread of each player in each match, as oude-fansite', async () => {
    const data = dataOf({ ratings })

    await prepare(data)

    const result = await importOldSiteRatings(database.db, data)
    const rows = await stored()

    expect(result).toMatchObject({ changed: 0, created: 3, skipped: 0, unchanged: 0 })
    expect(rows).toHaveLength(3)
    expect(rows.map((row) => [row.source, row.average, row.ratingCount, row.spread])).toEqual([
      ['oude-fansite', '7.25', 20, '1.10'],
      ['oude-fansite', '6.50', 4, '0.50'],
      ['oude-fansite', '8.00', 12, '0.90'],
    ])

    const names = new Map((await database.db.select().from(players)).map((row) => [row.id, row.name]))

    expect(rows.map((row) => names.get(row.playerId))).toEqual(['Hans Vonk', 'Erik Edman', 'Hans Vonk'])
  })

  it('keeps an average on fewer than five ratings', async () => {
    const data = dataOf({ ratings: [rating('nec.thuis', 'erik.edman', 6.5, 1, 0)] })

    await prepare(data)
    await importOldSiteRatings(database.db, data)

    expect(await stored()).toMatchObject([{ average: '6.50', ratingCount: 1 }])
  })

  it('changes nothing in a second run', async () => {
    const data = dataOf({ ratings })

    await prepare(data)
    await importOldSiteRatings(database.db, data)

    const before = await stored()
    const second = await importOldSiteRatings(database.db, data)

    expect(second).toMatchObject({ changed: 0, created: 0, skipped: 0, unchanged: 3 })
    expect(await stored()).toEqual(before)
  })

  it('changes a row whose numbers differ and removes a row the files no longer have', async () => {
    const data = dataOf({ ratings })

    await prepare(data)
    await importOldSiteRatings(database.db, data)

    const second = await importOldSiteRatings(
      database.db,
      dataOf({ ratings: [rating('nec.thuis', 'hans.vonk', 7.3, 21, 1.2), ratings[2]!] }),
    )

    expect(second).toMatchObject({ changed: 2, created: 0, unchanged: 1 })
    expect((await stored()).map((row) => [row.average, row.ratingCount, row.spread])).toEqual([
      ['7.30', 21, '1.20'],
      ['8.00', 12, '0.90'],
    ])
  })

  it('skips a rating whose match or player is not in the database, and says which', async () => {
    const data = dataOf({
      ratings: [
        rating('nec.thuis', 'hans.vonk', 7, 5, 1),
        rating('ajax.uit', 'iemand.anders', 7, 5, 1),
        rating('weg.thuis', 'hans.vonk', 7, 5, 1),
      ],
    })

    await prepare(data)

    const result = await importOldSiteRatings(database.db, data)

    expect(result).toMatchObject({ created: 1, skipped: 2 })
    expect(result.lines).toEqual([
      'skipped the rating of iemand.anders in 2001/02 ajax.uit: the player is not in the database',
      'skipped a rating in 2001/02 weg.thuis: the match is not in the database as a match of the old fansite',
    ])
  })
})

const coachRating = (matchCode: string, coachCode: string, average: number, count: number, spread: number) => ({
  average,
  coachCode,
  count,
  matchCode,
  season: '0102',
  spread,
})

const coachRatings = [
  coachRating('nec.thuis', 'foppe.dehaan', 6.8, 40, 1.3),
  coachRating('ajax.uit', 'foppe.dehaan', 7.1, 3, 0.6),
]

/** Foppe de Haan until the end of June 2002, and Gertjan Verbeek after it, for the staff. */
async function addStaff() {
  await database.db.insert(staff).values([
    {
      endDate: '2002-06-30',
      endPrecision: 'day',
      name: 'Foppe de Haan',
      role: 'coach',
      startDate: '1992-10-01',
      startPrecision: 'month',
    },
    {
      endDate: '2008-06-30',
      endPrecision: 'day',
      name: 'Gertjan Verbeek',
      role: 'coach',
      startDate: '2002-07-01',
      startPrecision: 'day',
    },
  ])
}

const storedCoach = () => database.db.select().from(matchCoachRatings).orderBy(asc(matchCoachRatings.id))

describe('the step trainercijfers', () => {
  it('links each head coach to his person in the staff on the day of the match, and writes his numbers as oude-fansite', async () => {
    const data = dataOf({ coachRatings })

    await prepare(data)
    await addStaff()

    const result = await importOldSiteCoachRatings(database.db, data)
    const rows = await storedCoach()
    const names = new Map((await database.db.select().from(staff)).map((row) => [row.id, row.name]))

    expect(result).toMatchObject({ changed: 0, created: 2, skipped: 0, unchanged: 0 })
    expect(rows.map((row) => [row.source, row.average, row.ratingCount, row.spread])).toEqual([
      ['oude-fansite', '6.80', 40, '1.30'],
      ['oude-fansite', '7.10', 3, '0.60'],
    ])
    expect(rows.map((row) => names.get(row.staffId))).toEqual(['Foppe de Haan', 'Foppe de Haan'])
  })

  it('does not store a coach the staff cannot link on that day, and says which match', async () => {
    const data = dataOf({
      coachRatings: [
        // Verbeek was not the head coach yet in 2001/02, and the staff has no third coach.
        coachRating('nec.thuis', 'gertjan.verbeek', 5, 9, 1),
        coachRating('ajax.uit', 'iemand.anders', 5, 9, 1),
        coachRating('weg.thuis', 'foppe.dehaan', 7, 5, 1),
        coachRating('ajax.uit', 'foppe.dehaan', 7.1, 3, 0.6),
      ],
    })

    await prepare(data)
    await addStaff()

    const result = await importOldSiteCoachRatings(database.db, data)

    expect(result).toMatchObject({ created: 1, skipped: 3 })
    expect(result.lines).toEqual([
      'skipped the rating of gertjan.verbeek in 2001/02 nec.thuis: the staff does not have him as the head coach on 2001-09-01',
      'skipped the rating of iemand.anders in 2001/02 ajax.uit: the staff does not have him as the head coach on 2001-09-15',
      'skipped the rating of the coach in 2001/02 weg.thuis: the match is not in the database as a match of the old fansite',
    ])
    expect(await storedCoach()).toHaveLength(1)
  })

  it('stores the rating of Foppe de Haan after 1 January 2004, with the staff of the seed (#1546)', async () => {
    const lateMatch = { ...oldMatch('nec.thuis', '2004-03-13 20:00:00', 25, ['hans.vonk']), season: '0304' }
    const data = dataOf({
      coachRatings: [{ ...coachRating('nec.thuis', 'foppe.dehaan', 7.2, 31, 1.1), season: '0304' }],
      matches: [lateMatch],
    })

    await prepare(data)
    await seedStaff(database.db)

    const result = await importOldSiteCoachRatings(database.db, data)

    expect(result).toMatchObject({ created: 1, skipped: 0 })
    expect(result.lines).toEqual([])
    expect(await storedCoach()).toMatchObject([{ average: '7.20', ratingCount: 31, spread: '1.10' }])
  })

  it('stores nothing without a staff, and changes nothing in a second run', async () => {
    const data = dataOf({ coachRatings })

    await prepare(data)
    expect(await importOldSiteCoachRatings(database.db, data)).toMatchObject({ created: 0, skipped: 2 })
    expect(await storedCoach()).toEqual([])

    await addStaff()
    await importOldSiteCoachRatings(database.db, data)

    const before = await storedCoach()
    const second = await importOldSiteCoachRatings(database.db, data)

    expect(second).toMatchObject({ changed: 0, created: 0, skipped: 0, unchanged: 2 })
    expect(await storedCoach()).toEqual(before)
  })

  it('changes a row whose numbers differ and removes a row the files no longer have', async () => {
    const data = dataOf({ coachRatings })

    await prepare(data)
    await addStaff()
    await importOldSiteCoachRatings(database.db, data)

    const second = await importOldSiteCoachRatings(
      database.db,
      dataOf({ coachRatings: [coachRating('nec.thuis', 'foppe.dehaan', 6.9, 41, 1.4)] }),
    )

    expect(second).toMatchObject({ changed: 2, created: 0, unchanged: 0 })
    expect((await storedCoach()).map((row) => [row.average, row.ratingCount, row.spread])).toEqual([
      ['6.90', 41, '1.40'],
    ])
  })
})

describe('the step seizoencijfers', () => {
  const seasonRatings = [
    { average: 7.1, playerCode: 'hans.vonk', season: '0001' },
    { average: 6.4, playerCode: 'jan.onbekend', season: '0001' },
  ]

  it('keeps the season rating by name, and links it to the player of that season when there is one', async () => {
    const data = dataOf({
      matches: [{ ...matchList[0]!, dateTime: '2000-09-01 20:00:00', season: '0001' }],
      seasonRatings,
    })

    await prepare(data)

    const result = await importOldSiteSeasonRatings(database.db, data)
    const rows = await database.db.select().from(oldSeasonRatings).orderBy(asc(oldSeasonRatings.id))

    expect(result).toMatchObject({ created: 2, skipped: 0 })
    expect(rows.map((row) => [row.season, row.name, row.average, row.playerId === null])).toEqual([
      ['2000/01', 'Hans Vonk', '7.10', false],
      ['2000/01', 'Jan Onbekend', '6.40', true],
    ])
    expect(result.lines).toEqual(['Jan Onbekend (2000/01) has a season rating and is not in the database as a player'])
  })

  it('links the codes of Rafael Piresvieira and Radoslav Samarzic to the players of their seasons', async () => {
    await database.db.insert(players).values([
      { name: 'Rafael Pires Vieira', searchTerm: 'Pires Vieira', season: '2000/01', source: 'verslag' },
      { name: 'Radoslav Samardžić', searchTerm: 'Samardžić', season: '1998/99', source: 'verslag' },
    ])

    const result = await importOldSiteSeasonRatings(
      database.db,
      dataOf({
        seasonRatings: [
          { average: 6.3, playerCode: 'rafael.piresvieira', season: '0001' },
          { average: 6.3, playerCode: 'radoslav.samarzic', season: '9899' },
        ],
      }),
    )
    const rows = await database.db.select().from(oldSeasonRatings).orderBy(asc(oldSeasonRatings.id))
    const names = new Map((await database.db.select().from(players)).map((row) => [row.id, row.name]))

    expect(result.lines).toEqual([])
    expect(rows.map((row) => [row.season, row.name, names.get(row.playerId ?? 0)])).toEqual([
      ['2000/01', 'Rafael Pires Vieira', 'Rafael Pires Vieira'],
      ['1998/99', 'Radoslav Samardžić', 'Radoslav Samardžić'],
    ])
  })

  it('changes nothing in a second run', async () => {
    const data = dataOf({ seasonRatings })

    await importOldSiteSeasonRatings(database.db, data)

    const rows = await database.db.select().from(oldSeasonRatings).orderBy(asc(oldSeasonRatings.id))
    const second = await importOldSiteSeasonRatings(database.db, data)

    expect(second).toMatchObject({ changed: 0, created: 0, unchanged: 2 })
    expect(await database.db.select().from(oldSeasonRatings).orderBy(asc(oldSeasonRatings.id))).toEqual(rows)
  })
})
