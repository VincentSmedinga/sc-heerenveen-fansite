import { type PredictionGuess, predictionPoints, type PredictionResult } from '@fansite/shared/prediction-points'

// The worked example on the page with the rules of the game Prognose (issue 1455): one match
// and five predictions, with the points that `predictionPoints` gives them. The page shows the
// points from that function, not from the text, so the example cannot disagree with the game.

/** What was played in the example: 1–0 at half-time and 2–1 at the end. */
export const exampleResult = {
  fullTime: { away: 1, home: 2 },
  halfTime: { away: 0, home: 1 },
} as const satisfies PredictionResult

const guess = (half: readonly [number, number], full: readonly [number, number]): PredictionGuess => ({
  fullTime: { away: full[1], home: full[0] },
  halfTime: { away: half[1], home: half[0] },
})

/**
 * The five predictions of the example, best first. Each shows another way to score: everything
 * right, a good outcome with one number right, and the three ways to end with 12 or 5 points.
 */
export const exampleGuesses: readonly PredictionGuess[] = [
  guess([1, 0], [2, 1]),
  guess([1, 1], [3, 1]),
  guess([0, 0], [1, 0]),
  guess([0, 1], [0, 1]),
  guess([2, 1], [0, 3]),
]

/** The points of the example, per prediction: half-time, full-time and the total. */
export const examplePoints = exampleGuesses.map((item) => {
  const points = predictionPoints(item, exampleResult)

  return {
    fullTime: points.fullTime?.points ?? 0,
    guess: item,
    halfTime: points.halfTime?.points ?? 0,
    total: points.total,
  }
})
