import type { BarChartBar } from '../bar-chart/BarChart'
import type { ChartTone } from '../chart/tones'
import type { MarkRowMark } from '../mark-row/MarkRow'

/** The results of a match: `W` won (winst), `G` drawn (gelijk) and `V` lost (verlies). */
export const formResults = ['W', 'G', 'V'] as const

export type FormResult = (typeof formResults)[number]

/** The points a result gives. */
export const pointsOf = (result: FormResult): number => (result === 'W' ? 3 : result === 'G' ? 1 : 0)

/** The tone of a result: a win is positive, a draw neutral and a loss negative. */
export const toneOf = (result: FormResult): ChartTone =>
  result === 'W' ? 'positive' : result === 'G' ? 'neutral' : 'negative'

const labels: Record<FormResult, string> = { G: 'gelijk', V: 'verlies', W: 'winst' }

/** The latest `count` results as marks, the oldest first, with the word for a screen reader. */
export const formOf = (results: readonly FormResult[], count = 5): MarkRowMark[] =>
  results.slice(-count).map((result) => ({ label: labels[result], mark: result, tone: toneOf(result) }))

/**
 * The bars of the chart, one per match of the season: a bar for each result, the oldest first,
 * as high as its points, and an empty place for each match still to be played. Results past the
 * number of matches are left out.
 */
export const slots = (results: readonly FormResult[], matches: number): (BarChartBar | null)[] =>
  Array.from({ length: matches }, (_, index) => {
    const result = results[index]

    return result ? { tone: toneOf(result), value: pointsOf(result) } : null
  })
