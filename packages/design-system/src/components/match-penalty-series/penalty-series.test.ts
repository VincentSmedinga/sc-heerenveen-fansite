import { describe, expect, it } from 'vitest'

import { penaltySeriesFigures } from './penalty-series'

const kick = (result: 'missed' | 'saved' | 'scored') => ({ result })

describe('penaltySeriesFigures', () => {
  it('counts only the kicks that scored, and gives the score after each round, ours first', () => {
    const { ours, rounds, theirs } = penaltySeriesFigures([
      { ours: kick('scored'), theirs: kick('scored') },
      { ours: kick('missed'), theirs: kick('scored') },
      { ours: kick('scored'), theirs: kick('saved') },
    ])

    expect([ours, theirs]).toEqual([2, 2])
    expect(rounds.map(({ number, standing }) => [number, ...standing])).toEqual([
      [1, 1, 1],
      [2, 1, 2],
      [3, 2, 2],
    ])
  })

  it('adds up a series in which a team did not kick in the last round', () => {
    const { ours, rounds, theirs } = penaltySeriesFigures([
      { ours: kick('scored'), theirs: kick('missed') },
      { ours: kick('scored') },
    ])

    expect([ours, theirs]).toEqual([2, 0])
    expect(rounds.at(-1)?.standing).toEqual([2, 0])
  })

  it('is zero for no round', () => {
    expect(penaltySeriesFigures([])).toEqual({ ours: 0, rounds: [], theirs: 0 })
  })
})
