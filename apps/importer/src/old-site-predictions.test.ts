import type { TestDatabase } from '@fansite/db/test-database'

import { matchPredictionCounts } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { OldSiteData, OldSiteMatch, OldSitePredictionOfSeason } from './old-site-file.ts'

import { importOldSiteClubs, oldSiteClubIds } from './old-site-clubs.ts'
import { importOldSiteMatches } from './old-site-matches.ts'
import { importOldSitePredictions } from './old-site-predictions.ts'

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

const oldMatch = (code: string, dateTime: string, round: number): OldSiteMatch => ({
  attendance: null,
  code,
  competition: 1,
  dateTime,
  events: [],
  lineup: [],
  note: null,
  referee: null,
  result: { awayFullTime: 0, awayHalfTime: 0, homeFullTime: 1, homeHalfTime: 0, note: null },
  round,
  season: '0102',
  statistics: zero,
})

const matchList = [oldMatch('nec.thuis', '2001-09-01 20:00:00', 1), oldMatch('ajax.uit', '2001-09-15 20:00:00', 2)]

const counts = (matchCode: string, fullTime: [number, number, number][], halfTime: [number, number, number][]) =>
  ({
    fullTime: fullTime.map(([home, away, count]) => ({ away, count, home })),
    halfTime: halfTime.map(([home, away, count]) => ({ away, count, home })),
    matchCode,
    season: '0102',
  }) satisfies OldSitePredictionOfSeason

const predictions = [
  counts(
    'nec.thuis',
    [
      [2, 1, 14],
      [1, 1, 8],
    ],
    [[1, 0, 22]],
  ),
  counts(
    'ajax.uit',
    [[0, 2, 5]],
    [
      [0, 1, 3],
      [0, 0, 2],
    ],
  ),
]

const dataOf = (overrides: Partial<OldSiteData> = {}): OldSiteData => ({
  clubs: oldClubs,
  coachRatings: [],
  fantest: [],
  matches: matchList,
  players: [],
  predictions,
  ratings: [],
  seasonRatings: [],
  ...overrides,
})

beforeEach(async () => {
  for (const table of ['match_prediction_counts', 'match_edits', 'match_statistics', 'matches', 'clubs']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

async function prepare(data: OldSiteData) {
  await importOldSiteClubs(database.db, data.clubs)
  await importOldSiteMatches(database.db, data.matches, data.clubs, await oldSiteClubIds(database.db, data.clubs))
}

const stored = () => database.db.select().from(matchPredictionCounts).orderBy(asc(matchPredictionCounts.id))

describe('the step voorspellingen', () => {
  it('writes a count for each score, full-time and half-time, as oude-fansite', async () => {
    const data = dataOf()

    await prepare(data)

    const result = await importOldSitePredictions(database.db, data)
    const rows = await stored()

    expect(result).toMatchObject({ changed: 0, created: 6, skipped: 0, unchanged: 0 })
    expect(rows.map((row) => [row.source, row.kind, row.home, row.away, row.predictionCount])).toEqual([
      ['oude-fansite', 'full_time', 2, 1, 14],
      ['oude-fansite', 'full_time', 1, 1, 8],
      ['oude-fansite', 'half_time', 1, 0, 22],
      ['oude-fansite', 'full_time', 0, 2, 5],
      ['oude-fansite', 'half_time', 0, 1, 3],
      ['oude-fansite', 'half_time', 0, 0, 2],
    ])
  })

  it('changes nothing in a second run', async () => {
    const data = dataOf()

    await prepare(data)
    await importOldSitePredictions(database.db, data)

    const before = await stored()
    const second = await importOldSitePredictions(database.db, data)

    expect(second).toMatchObject({ changed: 0, created: 0, skipped: 0, unchanged: 6 })
    expect(await stored()).toEqual(before)
  })

  it('changes a count that differs and removes a row the files no longer have', async () => {
    await prepare(dataOf())
    await importOldSitePredictions(database.db, dataOf())

    const second = await importOldSitePredictions(
      database.db,
      dataOf({
        predictions: [
          counts(
            'nec.thuis',
            [
              [2, 1, 15],
              [1, 1, 8],
            ],
            [[1, 0, 22]],
          ),
        ],
      }),
    )

    expect(second).toMatchObject({ changed: 4, created: 0, unchanged: 2 })
    expect((await stored()).map((row) => [row.kind, row.home, row.away, row.predictionCount])).toEqual([
      ['full_time', 2, 1, 15],
      ['full_time', 1, 1, 8],
      ['half_time', 1, 0, 22],
    ])
  })

  it('skips the counts of a match that is not in the database, and says which', async () => {
    const data = dataOf({ predictions: [counts('weg.thuis', [[1, 0, 9]], []), predictions[0]!] })

    await prepare(data)

    const result = await importOldSitePredictions(database.db, data)

    expect(result).toMatchObject({ created: 3, skipped: 1 })
    expect(result.lines).toEqual([
      'skipped the predictions in 2001/02 weg.thuis: the match is not in the database as a match of the old fansite',
    ])
  })
})
