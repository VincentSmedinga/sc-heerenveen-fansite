import { maxPredictionPoints } from '@fansite/shared/prediction-points'
import { describe, expect, it } from 'vitest'

import { examplePoints, exampleResult } from './prediction-rules'

describe('the example of the rules of the Prognose', () => {
  it('has the match of the issue: 1–0 at half-time and 2–1 at the end', () => {
    expect(exampleResult).toEqual({ fullTime: { away: 1, home: 2 }, halfTime: { away: 0, home: 1 } })
  })

  it('gives 30, 17, 12, 5 and 5 points, as the text of the rules says', () => {
    expect(examplePoints.map(({ total }) => total)).toEqual([30, 17, 12, 5, 5])
  })

  it('adds the points of the half-time and the full-time score up to the total', () => {
    for (const { fullTime, halfTime, total } of examplePoints) {
      expect(halfTime + fullTime).toBe(total)
    }
  })

  it('has the perfect prediction at the highest score the game gives', () => {
    expect(examplePoints[0]?.total).toBe(maxPredictionPoints)
  })
})
