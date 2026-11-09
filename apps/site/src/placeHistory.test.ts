import { describe, expect, it } from 'vitest'

import type { PlaceInRound } from './matches'

import {
  axisTicks,
  coachLines,
  type CoachOfLine,
  coachText,
  extremesOfPlaces,
  type MatchOfCoach,
  placeLines,
  roundRanges,
  totalShift,
} from './placeHistory'

const at = (round: number, position: number): PlaceInRound => ({ points: round, position, round })
const season = (positions: readonly (null | number)[]) =>
  positions.map((position, index) => (position === null ? null : at(index + 1, position)))

describe('roundRanges', () => {
  it('names one round', () => {
    expect(roundRanges([20])).toBe('ronde 20')
  })

  it('names a stretch', () => {
    expect(roundRanges([6, 7])).toBe('ronde 6 t/m 7')
    expect(roundRanges([10, 11, 12, 13, 14])).toBe('ronde 10 t/m 14')
  })

  it('names more stretches with commas and "en" before the last', () => {
    expect(roundRanges([3, 6, 7, 10, 11, 12, 13, 14])).toBe('ronde 3, 6 t/m 7 en 10 t/m 14')
    expect(roundRanges([3, 5])).toBe('ronde 3 en 5')
  })
})

describe('extremesOfPlaces', () => {
  it('finds every round of the highest and the lowest place', () => {
    expect(extremesOfPlaces(season([5, 2, 2, 7, 2, 7]))).toEqual({
      highest: { position: 2, rounds: [2, 3, 5] },
      lowest: { position: 7, rounds: [4, 6] },
    })
  })

  it('lets an open round break a stretch', () => {
    expect(extremesOfPlaces(season([2, null, 2, 4]))?.highest.rounds).toEqual([1, 3])
    expect(roundRanges(extremesOfPlaces(season([2, null, 2, 4]))?.highest.rounds ?? [])).toBe('ronde 1 en 3')
  })

  it('has nothing without a round', () => {
    expect(extremesOfPlaces([null, null])).toBeUndefined()
  })
})

describe('totalShift', () => {
  it('adds the differences between rounds, without the sign', () => {
    expect(totalShift(season([4, 2, 4]))).toBe(4)
    expect(totalShift(season([3, 1, 2, 11]))).toBe(2 + 1 + 9)
  })

  it('counts the difference between the two complete rounds round an open one', () => {
    expect(totalShift(season([4, null, 7]))).toBe(3)
  })

  it('is 0 for one place', () => {
    expect(totalShift(season([5]))).toBe(0)
  })
})

describe('placeLines', () => {
  it('has three lines, with the plural of places', () => {
    expect(placeLines(season([3, 2, 2, 11, 5, 2, 2, 2, 5]))).toEqual([
      'Hoogste: plek 2, ronde 2 t/m 3 en 6 t/m 8',
      'Laagste: plek 11, ronde 4',
      'Totaal verschoven: 22 plekken',
    ])
  })

  it('says "1 plek" for a shift of one', () => {
    expect(placeLines(season([3, 2]))[2]).toBe('Totaal verschoven: 1 plek')
  })

  it('has one line and no shift when the place never changed', () => {
    expect(placeLines(season([3, 3, null, 3]))).toEqual(['Plek: 3, alle rondes'])
  })

  it('has no lines without a round', () => {
    expect(placeLines([])).toEqual([])
  })
})

describe('axisTicks', () => {
  it('puts the places at 1, the half rounded down and the last, and the rounds at 1, each quarter and the last', () => {
    expect(axisTicks(18, 34)).toEqual({ places: [1, 9, 18], rounds: [1, 8, 17, 25, 34] })
  })

  it('rounds the half and the quarters down for other numbers', () => {
    expect(axisTicks(19, 36)).toEqual({ places: [1, 9, 19], rounds: [1, 9, 18, 27, 36] })
  })

  it('leaves out a number that falls on the one before it', () => {
    expect(axisTicks(1, 2)).toEqual({ places: [1], rounds: [1, 2] })
    expect(axisTicks(3, 3)).toEqual({ places: [1, 3], rounds: [1, 2, 3] })
  })
})

const coach = (name: string, startDate: string, interim = false): CoachOfLine => ({ interim, name, startDate })
const game = (round: number, matchDate: string, competition = 'Eredivisie'): MatchOfCoach => ({
  competition,
  matchDate,
  round: `Speelronde ${round}`,
})
const dayOf = (round: number) =>
  `2026-${String(Math.floor((round - 1) / 4) + 8).padStart(2, '0')}-${String(((round - 1) % 4) * 7 + 1).padStart(2, '0')}`
const rounds34 = Array.from({ length: 34 }, (_, index) => game(index + 1, dayOf(index + 1)))
// A place for every round: 5 in round 1, one worse every round.
const climbing = season(Array.from({ length: 34 }, (_, index) => 1 + (index % 17)))

describe('coachLines', () => {
  it('gives one coach the whole season, with the place after the first and the last round', () => {
    const [line] = coachLines([coach('Robin Veldman', '2026-07-01')], rounds34, climbing)

    expect(line?.rounds).toEqual({ first: 1, last: 34 })
    expect(line?.places).toEqual({ first: 1, last: 17 })
    expect(coachText(line!, 34)).toBe('Ronde 1 t/m 34 · plek 1 → 17')
  })

  it('ends a coach the round before the next one begins, from the matches and not from the dates', () => {
    const lines = coachLines(
      [coach('Eerste Trainer', '2026-07-01'), coach('Tweede Trainer', dayOf(13), true)],
      rounds34,
      climbing,
    )

    expect(lines.map(({ rounds }) => rounds)).toEqual([
      { first: 1, last: 12 },
      { first: 13, last: 34 },
    ])
    expect(lines.map((line) => coachText(line, 34))).toEqual([
      'Ronde 1 t/m 12 · plek 1 → 12',
      'Vanaf ronde 13 · plek 13 → 17',
    ])
  })

  it('says "ronde 13 t/m 20" for a coach in the middle who leaves', () => {
    const lines = coachLines(
      [coach('A', '2026-07-01'), coach('B', dayOf(13)), coach('C', dayOf(21))],
      rounds34,
      climbing,
    )

    expect(lines.map((line) => coachText(line, 34))).toEqual([
      'Ronde 1 t/m 12 · plek 1 → 12',
      'Ronde 13 t/m 20 · plek 13 → 3',
      'Vanaf ronde 21 · plek 4 → 17',
    ])
  })

  it('counts only the Eredivisie, and a coach before the first match starts in round 1', () => {
    const [line] = coachLines([coach('A', '2026-01-01')], [game(1, '2026-06-01', 'KNVB beker'), ...rounds34], climbing)

    expect(line?.rounds?.first).toBe(1)
  })

  it('takes the places of the complete rounds only, so an open round at the start or end is skipped', () => {
    const open = season([null, 4, 6, null, 3, null])
    const matches = [1, 2, 3, 4, 5, 6].map((round) => game(round, `2026-08-0${round}`))
    const lines = coachLines([coach('A', '2026-07-01'), coach('B', '2026-08-04')], matches, open)

    expect(lines.map(({ places: placesOf }) => placesOf)).toEqual([
      { first: 4, last: 6 },
      { first: 3, last: 3 },
    ])
    expect(coachText(lines[1]!, 6)).toBe('Vanaf ronde 4 · plek 3')
  })

  it('has no place for a coach without a complete round', () => {
    const open = season([4, null, null])
    const matches = [1, 2, 3].map((round) => game(round, `2026-08-0${round}`))
    const lines = coachLines([coach('A', '2026-07-01'), coach('B', '2026-08-02')], matches, open)

    expect(lines[1]?.places).toBeUndefined()
    expect(coachText(lines[1]!, 3)).toBe('Vanaf ronde 2')
  })

  it('has no rounds for a coach without a match, and the coach before leads until the next with a match', () => {
    const matches = [1, 2, 3, 4].map((round) => game(round, `2026-08-0${round}`))
    const lines = coachLines(
      [coach('A', '2026-07-01'), coach('Zonder', '2026-09-01'), coach('Laatste', '2026-12-01')],
      matches,
      season([3, 3, 3, 3]),
    )

    expect(lines[1]).toMatchObject({ places: undefined, rounds: undefined })
    expect(coachText(lines[1]!, 4)).toBeUndefined()
    expect(lines[0]?.rounds).toEqual({ first: 1, last: 4 })
  })

  it('says one round as "Ronde 5"', () => {
    expect(coachText({ places: { first: 4, last: 4 }, rounds: { first: 5, last: 5 } }, 34)).toBe('Ronde 5 · plek 4')
  })
})
