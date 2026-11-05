import type { BarChartBar } from '../bar-chart/BarChart'
import type { ChartTone } from '../chart/tones'
import type { MarkRowMark } from '../mark-row/MarkRow'

import { runningAverage } from '../chart/trend'
import { tableColumns } from '../table-columns'

/** The results of a match: `W` won (winst), `G` drawn (gelijk) and `V` lost (verlies). */
export const formResults = ['W', 'G', 'V'] as const

export type FormResult = (typeof formResults)[number]

/** The points a result gives. */
export const pointsOf = (result: FormResult): number => (result === 'W' ? 3 : result === 'G' ? 1 : 0)

/** The tone of a result: a win is positive, a draw neutral and a loss negative. */
export const toneOf = (result: FormResult): ChartTone =>
  result === 'W' ? 'positive' : result === 'G' ? 'neutral' : 'negative'

/** The words are those of the columns under the tables, so the two agree. */
const labels: Record<FormResult, string> = {
  G: tableColumns.drawn.name,
  V: tableColumns.lost.name,
  W: tableColumns.won.name,
}

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

/**
 * The average of the points per match over the last `span` matches, for each match played, the
 * oldest first. It starts at the first match, over fewer than `span`. It is the line of
 * `FormChart` and its tooltip, so a table next to the chart gives the same numbers by using it.
 */
export const averagesOf = (results: readonly FormResult[], span = 5): number[] =>
  runningAverage(
    results.map((result) => pointsOf(result)),
    span,
  ).flatMap((average) => (average === null ? [] : [average]))

const average = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

/** An average as the page writes it, with a decimal comma and one decimal: "1,8". */
export const formatAverage = (value: number): string => average.format(value)
