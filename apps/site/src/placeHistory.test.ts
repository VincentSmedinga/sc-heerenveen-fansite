import { describe, expect, it } from 'vitest'

import type { PlaceInRound } from './matches'

import { extremesOfPlaces, placeLines, roundRanges, totalShift } from './placeHistory'

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
