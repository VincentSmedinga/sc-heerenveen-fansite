import { describe, expect, it } from 'vitest'

import type { OldSiteMatch } from './old-site-file.ts'
import type { RatingRow, SeasonRatingRow } from './old-site-ratings-export.ts'

import { parseOldSiteFile } from './old-site-file.ts'
import {
  buildOldSiteRatings,
  describeGrades,
  oldSeasonRatingSeasons,
  writeRatingsOutsideLineup,
} from './old-site-ratings-export.ts'

const zero = {
  awayCorners: 0,
  awayFouls: 0,
  awayOffside: 0,
  homeCorners: 0,
  homeFouls: 0,
  homeOffside: 0,
}

/** A match of 2001/02 with a line-up of the given players. */
const match = (code: string, dateTime: string, players: string[]): OldSiteMatch => ({
  attendance: null,
  code,
  competition: 1,
  dateTime,
  events: [],
  lineup: players.map((playerCode, index) => ({
    minuteIn: 0,
    minuteOut: 90,
    order: index + 1,
    playerCode,
    playerName: null,
  })),
  note: null,
  referee: null,
  result: { awayFullTime: 0, awayHalfTime: 0, homeFullTime: 1, homeHalfTime: 0, note: null },
  round: 1,
  season: '0102',
  statistics: zero,
})

let nextId = 1
const rating = (visitor: string, matchCode: string, player: string, grade: number, season = '0102'): RatingRow => ({
  cijfer: grade,
  id: nextId++,
  inz_gn: visitor,
  spr_code: player,
  wsd_code: matchCode,
  wsd_seizoen: season,
})

describe('describeGrades', () => {
  it('gives the average, the count and the spread of the whole group, in two decimals', () => {
    // 6, 7, 7, 8, 9: sum 37, average 7.4, squares 279, variance 279/5 - 7.4^2 = 1.04.
    expect(describeGrades([6, 7, 7, 8, 9])).toEqual({ average: 7.4, count: 5, spread: 1.02 })
    expect(describeGrades([7])).toEqual({ average: 7, count: 1, spread: 0 })
    expect(describeGrades([5, 6])).toEqual({ average: 5.5, count: 2, spread: 0.5 })
    expect(describeGrades([10, 10, 9])).toEqual({ average: 9.67, count: 3, spread: 0.47 })
  })
})

describe('buildOldSiteRatings', () => {
  const matches = [
    match('ajax.thuis', '2001-09-01 20:00:00', ['hans.vonk', 'erik.edman', 'arek.radomski']),
    match('psv.uit', '2001-09-15 20:00:00', ['hans.vonk', 'erik.edman']),
  ]
  const known = new Set(['0102/ajax.thuis', '0102/friendly.thuis', '0102/psv.uit'])

  const build = (rows: RatingRow[], season: SeasonRatingRow[] = []) => buildOldSiteRatings(rows, season, matches, known)

  it('works out the average, the number and the spread of each player in each match, in the order of the match and the code', () => {
    const { bySeason } = build([
      rating('a', 'ajax.thuis', 'hans.vonk', 6),
      rating('b', 'ajax.thuis', 'hans.vonk', 7),
      rating('c', 'ajax.thuis', 'hans.vonk', 7),
      rating('d', 'ajax.thuis', 'hans.vonk', 8),
      rating('e', 'ajax.thuis', 'hans.vonk', 9),
      rating('a', 'ajax.thuis', 'erik.edman', 5),
      rating('b', 'ajax.thuis', 'erik.edman', 6),
      rating('a', 'psv.uit', 'hans.vonk', 10),
    ])

    expect(bySeason.get('0102')).toEqual([
      { average: 5.5, count: 2, matchCode: 'ajax.thuis', playerCode: 'erik.edman', spread: 0.5 },
      { average: 7.4, count: 5, matchCode: 'ajax.thuis', playerCode: 'hans.vonk', spread: 1.02 },
      { average: 10, count: 1, matchCode: 'psv.uit', playerCode: 'hans.vonk', spread: 0 },
    ])
  })

  it('counts a rating that a visitor gave twice for the same player in the same match once, the last', () => {
    const result = build([
      rating('a', 'ajax.thuis', 'hans.vonk', 2),
      rating('b', 'ajax.thuis', 'hans.vonk', 8),
      rating('a', 'ajax.thuis', 'hans.vonk', 6),
      // The same visitor may rate the same player in another match, and another player.
      rating('a', 'psv.uit', 'hans.vonk', 3),
      rating('a', 'ajax.thuis', 'erik.edman', 9),
    ])

    expect(result.bySeason.get('0102')).toEqual([
      { average: 9, count: 1, matchCode: 'ajax.thuis', playerCode: 'erik.edman', spread: 0 },
      { average: 7, count: 2, matchCode: 'ajax.thuis', playerCode: 'hans.vonk', spread: 1 },
      { average: 3, count: 1, matchCode: 'psv.uit', playerCode: 'hans.vonk', spread: 0 },
    ])
    expect(result.report).toContain(
      'ratings given twice by a visitor for the same player in the same match (only the last counts): 1',
    )
  })

  it('leaves out the ratings of a match that no longer exists, and says how many', () => {
    const result = build([
      rating('a', 'ajax.thuis', 'hans.vonk', 7),
      rating('a', 'weg.thuis', 'hans.vonk', 7),
      rating('b', 'weg.thuis', 'hans.vonk', 7),
    ])

    expect(result.bySeason.get('0102')).toHaveLength(1)
    expect(result.report).toContain('ratings for a match code that no longer exists, left out: 2 (0102/weg.thuis)')
  })

  it('leaves out a match that exists but is not in the files, as another case', () => {
    const result = build([rating('a', 'friendly.thuis', 'hans.vonk', 7)])

    expect(result.bySeason.size).toBe(0)
    expect(result.report).toContain('ratings for a match that is not in the files, left out: 1')
  })

  it('lists a rating for a player who is not in the line-up for the editors, and keeps it out of the files', () => {
    const result = build([
      rating('a', 'psv.uit', 'arek.radomski', 6),
      rating('b', 'psv.uit', 'arek.radomski', 8),
      rating('a', 'psv.uit', 'hans.vonk', 7),
    ])

    expect(result.outsideLineup).toEqual([
      { average: 7, count: 2, matchCode: 'psv.uit', playerCode: 'arek.radomski', season: '0102' },
    ])
    expect(result.bySeason.get('0102')).toEqual([
      { average: 7, count: 1, matchCode: 'psv.uit', playerCode: 'hans.vonk', spread: 0 },
    ])
  })

  it('works out the ratings of the two head coaches like those of a player, in their own list, with the double counted once', () => {
    const result = build([
      rating('a', 'ajax.thuis', 'foppe.dehaan', 6),
      rating('b', 'ajax.thuis', 'foppe.dehaan', 7),
      rating('c', 'ajax.thuis', 'foppe.dehaan', 7),
      rating('d', 'ajax.thuis', 'foppe.dehaan', 8),
      rating('e', 'ajax.thuis', 'foppe.dehaan', 9),
      // The same visitor again for the same coach in the same match: only the last counts.
      rating('e', 'ajax.thuis', 'foppe.dehaan', 10),
      rating('a', 'psv.uit', 'gertjan.verbeek', 5),
      // A match that no longer exists, and a match that is not in the files.
      rating('a', 'weg.thuis', 'foppe.dehaan', 7),
      rating('a', 'friendly.thuis', 'foppe.dehaan', 7),
    ])

    expect(result.coachBySeason.get('0102')).toEqual([
      { average: 7.6, coachCode: 'foppe.dehaan', count: 5, matchCode: 'ajax.thuis', spread: 1.36 },
      { average: 5, coachCode: 'gertjan.verbeek', count: 1, matchCode: 'psv.uit', spread: 0 },
    ])
    expect(result.bySeason.size).toBe(0)
    expect(result.outsideLineup).toEqual([])
    expect(result.report).toContain(
      'ratings per match and head coach: 2, from 6 ratings of visitors (only the last of a visitor counts)',
    )
    expect(result.report).toContain('ratings for a match code that no longer exists, left out: 1 (0102/weg.thuis)')
  })

  it('keeps the season ratings of 1998/99 to 2000/01 and no other', () => {
    const { seasonRatings } = build(
      [],
      [
        { gemiddelde: 6.2, jaargang: '9899', spr_code: 'b.speler' },
        { gemiddelde: 7.1, jaargang: '9899', spr_code: 'a.speler' },
        { gemiddelde: 6, jaargang: '0102', spr_code: 'c.speler' },
        { gemiddelde: 0, jaargang: '0001', spr_code: 'd.speler' },
      ],
    )

    expect([...oldSeasonRatingSeasons].toSorted()).toEqual(['0001', '9899', '9900'])
    expect(seasonRatings).toEqual([
      { average: 7.1, playerCode: 'a.speler', season: '9899' },
      { average: 6.2, playerCode: 'b.speler', season: '9899' },
    ])
  })

  it('writes files that hold no one who gave a rating and that the strict format accepts', () => {
    const { bySeason, coachBySeason } = build([
      rating('Olaf', 'ajax.thuis', 'hans.vonk', 7),
      rating('Anna', 'ajax.thuis', 'hans.vonk', 8),
      rating('Olaf', 'ajax.thuis', 'foppe.dehaan', 7),
      rating('Anna', 'ajax.thuis', 'foppe.dehaan', 8),
    ])
    const text = JSON.stringify({
      coachRatings: coachBySeason.get('0102'),
      ratings: bySeason.get('0102'),
      season: '0102',
      version: 3,
    })

    expect(parseOldSiteFile(text, 'ratings-0102.json')).toMatchObject({ season: '0102' })
    expect(text).not.toMatch(/Olaf|Anna/)
  })
})

describe('writeRatingsOutsideLineup', () => {
  it('lists the date, the opponent, the player, the number and the average, and nothing of a visitor', () => {
    const markdown = writeRatingsOutsideLineup(
      [{ average: 7.5, count: 2, matchCode: 'psv.uit', playerCode: 'arek.radomski', season: '0102' }],
      [match('psv.uit', '2001-09-15 20:00:00', [])],
      {
        clubs: [{ code: 'psv', naam: 'PSV' }],
        players: [{ achternaam: 'Radomski', code: 'arek.radomski', tussenvoegsel: null, voornaam: 'Arkadiusz' }],
      },
    )

    expect(markdown).toContain('| 15-09-2001 | PSV (uit) | Arkadiusz Radomski | 2 | 7,5 |')
  })
})
