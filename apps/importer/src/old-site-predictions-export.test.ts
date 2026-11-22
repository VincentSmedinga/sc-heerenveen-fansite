import { describe, expect, it } from 'vitest'

import type { OldSiteMatch } from './old-site-file.ts'
import type { EarlyPredictionRow, PredictionRow } from './old-site-predictions-export.ts'

import { parseOldSiteFile } from './old-site-file.ts'
import { buildOldSitePredictions } from './old-site-predictions-export.ts'

const zero = {
  awayCorners: 0,
  awayFouls: 0,
  awayOffside: 0,
  homeCorners: 0,
  homeFouls: 0,
  homeOffside: 0,
}

const match = (code: string, season = '0102'): OldSiteMatch => ({
  attendance: null,
  code,
  competition: 1,
  dateTime: '2001-09-01 20:00:00',
  events: [],
  lineup: [],
  note: null,
  referee: null,
  result: { awayFullTime: 0, awayHalfTime: 0, homeFullTime: 1, homeHalfTime: 0, note: null },
  round: 1,
  season,
  statistics: zero,
})

let nextId = 1
const prediction = (
  visitor: string,
  code: string,
  half: [number, number],
  full: [number, number],
  season = '0102',
): PredictionRow => ({
  et: full[0],
  eu: full[1],
  id: nextId++,
  inz_gn: visitor,
  rt: half[0],
  ru: half[1],
  wsd_code: code,
  wsd_seizoen: season,
})

const early = (code: string, half: [number, number], full: [number, number]): EarlyPredictionRow => ({
  et: full[0],
  eu: full[1],
  rt: half[0],
  ru: half[1],
  wsd_code: code,
  wsd_seizoen: '0102',
})

const matches = [match('nec.thuis'), match('ajax.uit')]
const known = new Set(['0102/ajax.uit', '0102/friendly.thuis', '0102/nec.thuis'])

describe('buildOldSitePredictions', () => {
  it('counts the predictions per full-time score and per half-time score, lowest score first', () => {
    const result = buildOldSitePredictions(
      [
        prediction('a', 'nec.thuis', [1, 0], [2, 1]),
        prediction('b', 'nec.thuis', [0, 0], [2, 1]),
        prediction('c', 'nec.thuis', [1, 0], [1, 1]),
        prediction('a', 'ajax.uit', [0, 1], [0, 2]),
      ],
      [],
      matches,
      known,
    )

    expect(result.bySeason.get('0102')).toEqual([
      {
        fullTime: [{ away: 2, count: 1, home: 0 }],
        halfTime: [{ away: 1, count: 1, home: 0 }],
        matchCode: 'ajax.uit',
      },
      {
        fullTime: [
          { away: 1, count: 1, home: 1 },
          { away: 1, count: 2, home: 2 },
        ],
        halfTime: [
          { away: 0, count: 1, home: 0 },
          { away: 0, count: 2, home: 1 },
        ],
        matchCode: 'nec.thuis',
      },
    ])
  })

  it('counts a visitor who predicted a match twice once, the last time', () => {
    const result = buildOldSitePredictions(
      [prediction('a', 'nec.thuis', [0, 0], [1, 0]), prediction('a', 'nec.thuis', [1, 0], [3, 0])],
      [],
      matches,
      known,
    )

    expect(result.bySeason.get('0102')).toEqual([
      {
        fullTime: [{ away: 0, count: 1, home: 3 }],
        halfTime: [{ away: 0, count: 1, home: 1 }],
        matchCode: 'nec.thuis',
      },
    ])
    expect(result.report).toContain('predictions given twice by a visitor for the same match (only the last counts): 1')
  })

  it('counts the predictions from before the accounts as a number, with no name to read', () => {
    const result = buildOldSitePredictions(
      [prediction('a', 'nec.thuis', [0, 0], [1, 0])],
      [early('nec.thuis', [0, 0], [1, 0]), early('nec.thuis', [0, 1], [1, 2])],
      matches,
      known,
    )

    expect(result.bySeason.get('0102')?.[0]?.fullTime).toEqual([
      { away: 0, count: 2, home: 1 },
      { away: 2, count: 1, home: 1 },
    ])
  })

  it('leaves out a match code that no longer exists and says which, and a match that is not in the files', () => {
    const result = buildOldSitePredictions(
      [
        prediction('a', 'gone.thuis', [0, 0], [1, 0]),
        prediction('b', 'gone.thuis', [0, 0], [1, 0]),
        prediction('a', '', [0, 0], [1, 0], ''),
        prediction('a', 'friendly.thuis', [0, 0], [1, 0]),
      ],
      [],
      matches,
      known,
    )

    expect(result.bySeason.size).toBe(0)
    expect(result.report).toContain(
      'predictions for a match code that no longer exists, left out: 3 ((no code): 1, 0102/gone.thuis: 2)',
    )
    expect(result.report).toContain('predictions for a match that is not in the files, left out: 1')
  })

  it('writes a file that the strict schema accepts, with counts and nothing else', () => {
    const result = buildOldSitePredictions(
      [prediction('visitor-name', 'nec.thuis', [0, 0], [1, 0])],
      [],
      matches,
      known,
    )
    const text = JSON.stringify({ predictions: result.bySeason.get('0102'), season: '0102', version: 3 })

    expect(parseOldSiteFile(text)).toBeDefined()
    expect(text).not.toContain('visitor-name')
  })
})
