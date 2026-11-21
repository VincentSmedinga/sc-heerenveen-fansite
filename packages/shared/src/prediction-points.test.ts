import { describe, expect, it } from 'vitest'

import { maxPredictionPoints, predictionPoints, type PredictionScore } from './prediction-points'

const s = (home: number, away: number): PredictionScore => ({ away, home })

// sc Heerenveen at home: half-time 1-0, full-time 2-1.
const played = { fullTime: s(2, 1), halfTime: s(1, 0) }

const score = (half: [number, number], full: [number, number], result = played) =>
  predictionPoints({ fullTime: s(...full), halfTime: s(...half) }, result)

describe('the examples of the issue', () => {
  it.each([
    { eind: 20, full: [2, 1], half: [1, 0], rest: 10, total: 30 },
    { eind: 15, full: [3, 1], half: [1, 1], rest: 2, total: 17 },
    { eind: 10, full: [1, 0], half: [0, 0], rest: 2, total: 12 },
    { eind: 0, full: [1, 2], half: [2, 1], rest: 5, total: 5 },
    { eind: 5, full: [2, 2], half: [0, 1], rest: 0, total: 5 },
  ] as const)('$half, $full is $total points', ({ eind, full, half, rest, total }) => {
    const points = score([...half], [...full])

    expect(points.halfTime?.points).toBe(rest)
    expect(points.fullTime?.points).toBe(eind)
    expect(points.total).toBe(total)
  })
})

describe('one part', () => {
  const full = (guess: [number, number], result: [number, number]) =>
    predictionPoints({ fullTime: s(...guess), halfTime: s(0, 0) }, { fullTime: s(...result) }).fullTime!

  it('gives 20 for the exact score and counts no bonus on top', () => {
    expect(full([2, 1], [2, 1])).toMatchObject({ exact: true, goals: undefined, outcome: true, points: 20 })
  })

  it('gives 10 for the outcome alone, also for another goal difference', () => {
    expect(full([2, 0], [3, 1])).toMatchObject({ exact: false, goals: undefined, outcome: true, points: 10 })
  })

  it('adds 5 when the outcome and one number are right', () => {
    expect(full([3, 1], [2, 1])).toMatchObject({ goals: 'away', outcome: true, points: 15 })
    expect(full([2, 0], [2, 1])).toMatchObject({ goals: 'home', outcome: true, points: 15 })
  })

  it('gives 5 for one number right with the outcome wrong', () => {
    expect(full([2, 2], [2, 1])).toMatchObject({ goals: 'home', outcome: false, points: 5 })
    expect(full([0, 1], [2, 1])).toMatchObject({ goals: 'away', outcome: false, points: 5 })
  })

  it('gives nothing when nothing is right', () => {
    expect(full([0, 3], [2, 1])).toMatchObject({ goals: undefined, outcome: false, points: 0 })
  })

  it('treats a draw that is exactly right as 20, and another draw as the outcome', () => {
    expect(full([1, 1], [1, 1]).points).toBe(20)
    expect(full([0, 0], [1, 1]).points).toBe(10)
    expect(full([2, 2], [1, 1]).points).toBe(10)
  })

  it('scores a match without goals', () => {
    expect(full([0, 0], [0, 0]).points).toBe(20)
    expect(full([1, 0], [0, 0]).points).toBe(5)
    expect(full([1, 1], [0, 0]).points).toBe(10)
    expect(full([0, 1], [0, 0]).points).toBe(5)
  })

  it('gives half of each number at half-time, rounded down', () => {
    const half = (guess: [number, number], result: [number, number]) =>
      predictionPoints({ fullTime: s(9, 9), halfTime: s(...guess) }, { fullTime: s(0, 0), halfTime: s(...result) })
        .halfTime

    expect(half([1, 0], [1, 0])?.points).toBe(10)
    expect(half([2, 0], [1, 0])?.points).toBe(7)
    expect(half([1, 1], [1, 0])?.points).toBe(2)
    expect(half([0, 1], [1, 0])?.points).toBe(0)
    expect(half([0, 0], [1, 1])?.points).toBe(5)
  })
})

describe('the whole prediction', () => {
  it('gives no half-time points while the half-time score is not known, which is not 0', () => {
    const points = predictionPoints({ fullTime: s(2, 1), halfTime: s(1, 0) }, { fullTime: s(2, 1) })

    expect(points.halfTime).toBeUndefined()
    expect(points.total).toBe(20)
  })

  it('gives the half-time points alone while the match is being played', () => {
    const points = predictionPoints({ fullTime: s(2, 1), halfTime: s(1, 0) }, { halfTime: s(1, 0) })

    expect(points.fullTime).toBeUndefined()
    expect(points.total).toBe(10)
  })

  it('gives nothing yet when nothing is known', () => {
    expect(predictionPoints({ fullTime: s(2, 1), halfTime: s(1, 0) }, {})).toEqual({
      fullTime: undefined,
      halfTime: undefined,
      total: 0,
    })
  })

  it('gives at most 30 points', () => {
    expect(maxPredictionPoints).toBe(30)
    expect(score([1, 0], [2, 1]).total).toBe(maxPredictionPoints)
  })
})
