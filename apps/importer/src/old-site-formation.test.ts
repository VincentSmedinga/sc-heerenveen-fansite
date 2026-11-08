import { describe, expect, it } from 'vitest'

import type { OldSiteLine } from './old-site-file.ts'

import { deriveOldSiteFormation } from './old-site-formation.ts'

const keeper: OldSiteLine = 'doelman'
const defender: OldSiteLine = 'verdediger'
const midfielder: OldSiteLine = 'middenvelder'
const attacker: OldSiteLine = 'aanvaller'

/** The lines of one team: `4-4-2` is four defenders, four midfielders and two attackers. */
const team = (back: number, middle: number, front: number, ...changes: [number, null | OldSiteLine][]) => {
  const lines: (null | OldSiteLine)[] = [
    keeper,
    ...Array<OldSiteLine>(back).fill(defender),
    ...Array<OldSiteLine>(middle).fill(midfielder),
    ...Array<OldSiteLine>(front).fill(attacker),
  ]

  for (const [place, line] of changes) {
    lines[place] = line
  }

  return lines
}

describe('the formation of our team in a report of the old fansite', () => {
  it('is the number of defenders, midfielders and attackers when the order and the lines agree', () => {
    expect(deriveOldSiteFormation(team(4, 4, 2))).toBe('4-4-2')
    expect(deriveOldSiteFormation(team(3, 5, 2))).toBe('3-5-2')
    expect(deriveOldSiteFormation(team(5, 1, 4))).toBe('5-1-4')
  })

  it('leaves out a line that is empty', () => {
    expect(deriveOldSiteFormation(team(4, 6, 0))).toBe('4-6')
    expect(deriveOldSiteFormation(team(0, 5, 5))).toBe('5-5')
    expect(deriveOldSiteFormation(team(5, 0, 5))).toBe('5-5')
  })

  it('counts a player without a line between two players of the same line', () => {
    expect(deriveOldSiteFormation(team(4, 4, 2, [2, null]))).toBe('4-4-2')
    expect(deriveOldSiteFormation(team(4, 4, 2, [6, null]))).toBe('4-4-2')
    expect(deriveOldSiteFormation(team(4, 4, 2, [2, null], [3, null]))).toBe('4-4-2')
  })

  it('does not guess for a player without a line between two lines', () => {
    // Between a defender (place 4) and a midfielder (place 6).
    expect(deriveOldSiteFormation(team(4, 4, 2, [5, null]))).toBeNull()
    // Between a midfielder and an attacker.
    expect(deriveOldSiteFormation(team(4, 4, 2, [8, null]))).toBeNull()
  })

  it('takes a defender as the left neighbour at the start and an attacker as the right one at the end', () => {
    expect(deriveOldSiteFormation(team(4, 4, 2, [1, null]))).toBe('4-4-2')
    expect(deriveOldSiteFormation(team(4, 4, 2, [10, null]))).toBe('4-4-2')
    // A player without a line at the start who is followed by a midfielder, and one at the end
    // who follows a midfielder.
    expect(deriveOldSiteFormation(team(0, 5, 5, [1, null]))).toBeNull()
    expect(deriveOldSiteFormation(team(5, 5, 0, [10, null]))).toBeNull()
  })

  it('is empty when the lines go back, as for a defender in place eleven', () => {
    expect(deriveOldSiteFormation(team(4, 4, 2, [10, defender]))).toBeNull()
    expect(deriveOldSiteFormation(team(4, 4, 2, [6, defender]))).toBeNull()
    expect(deriveOldSiteFormation(team(4, 4, 2, [10, midfielder]))).toBeNull()
  })

  it('is empty without a goalkeeper first, or with a second one', () => {
    expect(deriveOldSiteFormation(team(4, 4, 2, [0, defender]))).toBeNull()
    expect(deriveOldSiteFormation(team(4, 4, 2, [0, null]))).toBeNull()
    expect(deriveOldSiteFormation(team(4, 4, 2, [5, keeper]))).toBeNull()
    expect(deriveOldSiteFormation([defender, keeper, ...Array<OldSiteLine>(9).fill(midfielder)])).toBeNull()
  })

  it('is empty for fewer or more than eleven starters', () => {
    expect(deriveOldSiteFormation(team(4, 4, 2).slice(0, 10))).toBeNull()
    expect(deriveOldSiteFormation([...team(4, 4, 2), attacker])).toBeNull()
    expect(deriveOldSiteFormation([])).toBeNull()
  })

  it('is empty when all ten players are of one line, since a pitch needs two rows', () => {
    expect(deriveOldSiteFormation(team(10, 0, 0))).toBeNull()
    expect(deriveOldSiteFormation(team(0, 10, 0))).toBeNull()
  })
})
