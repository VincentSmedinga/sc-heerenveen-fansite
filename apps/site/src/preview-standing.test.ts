import type { PublicLeagueResult, PublicStandingsRow } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { formsOf, standingRoundOf, standingSentenceOf, standingSliceOf } from './preview-standing'

const row = (position: number, club: string, points = 30 - position): PublicStandingsRow => ({
  club,
  drawn: 0,
  goalDifference: 0,
  goalsAgainst: 0,
  goalsFor: 0,
  lost: 0,
  played: 12,
  points,
  pointsDeducted: 0,
  position,
  validOn: '2026-11-15',
  won: 0,
})

/** A table of `count` clubs, called Club 1 to Club `count`, with sc Heerenveen in `ours`. */
const table = (count: number, ours: number) =>
  Array.from({ length: count }, (_, index) =>
    row(index + 1, index + 1 === ours ? 'sc Heerenveen' : `Club ${index + 1}`),
  )

const clubsOf = (slice: ReturnType<typeof standingSliceOf>) =>
  slice?.map((item) => (item.kind === 'gap' ? `gap ${item.hidden}` : `${item.marked ? '*' : ''}${item.row.club}`))

describe('standingSliceOf', () => {
  it('has the whole stretch when at most three clubs stand between the two', () => {
    expect(clubsOf(standingSliceOf(table(18, 6), 'Club 9'))).toEqual(['*sc Heerenveen', 'Club 7', 'Club 8', '*Club 9'])
    expect(clubsOf(standingSliceOf(table(18, 6), 'Club 7'))).toEqual(['*sc Heerenveen', '*Club 7'])
  })

  it('has each club with its neighbours and one row for the rest when more clubs stand between', () => {
    expect(clubsOf(standingSliceOf(table(18, 6), 'Club 18'))).toEqual([
      'Club 5',
      '*sc Heerenveen',
      'Club 7',
      'gap 9',
      'Club 17',
      '*Club 18',
    ])
  })

  it('has no neighbour above the leader or below the last club, whichever club is above', () => {
    expect(clubsOf(standingSliceOf(table(18, 1), 'Club 18'))).toEqual([
      '*sc Heerenveen',
      'Club 2',
      'gap 14',
      'Club 17',
      '*Club 18',
    ])
    expect(clubsOf(standingSliceOf(table(18, 18), 'Club 1'))).toEqual([
      '*Club 1',
      'Club 2',
      'gap 14',
      'Club 17',
      '*sc Heerenveen',
    ])
  })

  it('has nothing when one of the clubs is not in the table, such as a cup opponent', () => {
    expect(standingSliceOf(table(18, 6), 'FC Eindhoven')).toBeUndefined()
    expect(standingSliceOf([], 'Club 2')).toBeUndefined()
  })
})

describe('standingSentenceOf', () => {
  it('says how many places and points we stand above the opponent', () => {
    const rows = [row(6, 'sc Heerenveen', 21), row(9, 'FC Groningen', 15)]

    expect(standingSentenceOf(rows, 'FC Groningen')).toBe('We staan drie plekken en zes punten boven FC Groningen.')
  })

  it('says "onder" when the opponent stands higher, and uses the singular', () => {
    const rows = [row(5, 'FC Groningen', 16), row(6, 'sc Heerenveen', 15)]

    expect(standingSentenceOf(rows, 'FC Groningen')).toBe('We staan één plek en één punt onder FC Groningen.')
  })

  it('says the points are equal when they are', () => {
    const rows = [row(6, 'sc Heerenveen', 15), row(8, 'FC Groningen', 15)]

    expect(standingSentenceOf(rows, 'FC Groningen')).toBe(
      'We staan twee plekken boven FC Groningen, met evenveel punten.',
    )
  })

  it('writes a number above twenty in figures, and twenty in words', () => {
    expect(standingSentenceOf([row(1, 'sc Heerenveen', 50), row(22, 'Club 22', 9)], 'Club 22')).toBe(
      'We staan 21 plekken en 41 punten boven Club 22.',
    )
  })
})

describe('standingRoundOf', () => {
  it('is the most matches a club has played', () => {
    expect(standingRoundOf([{ ...row(1, 'A'), played: 11 }, row(2, 'B')])).toBe(12)
    expect(standingRoundOf([])).toBe(0)
  })
})

const result = (
  round: number,
  homeClub: string,
  homeGoals: number,
  awayClub: string,
  awayGoals: number,
): PublicLeagueResult => ({
  awayClub,
  awayGoals,
  homeClub,
  homeGoals,
  playedOn: `2026-09-${String(round).padStart(2, '0')}`,
  round,
})

describe('formsOf', () => {
  it('gives the last five of both clubs, ours first, with points and goals', () => {
    const results = [
      ...Array.from({ length: 6 }, (_, index) => result(index + 1, 'sc Heerenveen', 2, 'Ajax', 1)),
      result(7, 'PSV', 3, 'Ajax', 3),
    ]

    expect(formsOf(results, 'Ajax')).toEqual([
      { club: 'sc Heerenveen', goalsAgainst: 5, goalsFor: 10, marks: ['W', 'W', 'W', 'W', 'W'], points: 15 },
      { club: 'Ajax', goalsAgainst: 11, goalsFor: 7, marks: ['V', 'V', 'V', 'V', 'G'], points: 1 },
    ])
  })

  it('leaves out the club that has no league result, and gives nothing when neither has one', () => {
    const results = [result(1, 'sc Heerenveen', 0, 'Ajax', 0)]

    expect(formsOf(results, 'FC Eindhoven').map((form) => form.club)).toEqual(['sc Heerenveen'])
    expect(formsOf([], 'FC Eindhoven')).toEqual([])
  })
})
