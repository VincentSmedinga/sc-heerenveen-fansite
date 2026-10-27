import type { ComponentPropsWithoutRef } from 'react'

import { BarChart } from '../bar-chart/BarChart'
import { movingAverage } from '../chart/trend'
import { classNames } from '../classNames'
import { MarkRow } from '../mark-row/MarkRow'
import { Text } from '../text/Text'
import { formOf, type FormResult, pointsOf, slots } from './form'

export type FormChartProps = Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'results'> & {
  /** A form chart has no children: everything it shows comes from the props below. */
  children?: never
  /** The number of matches in the season. The default is 34, the matches of the Eredivisie. */
  matches?: number
  /** The matches played so far, the oldest first, as `W` (won), `G` (drawn) or `V` (lost). */
  results: readonly FormResult[]
  /**
   * The number of matches the line averages over. The default is 5, the number of results in
   * the form above the chart.
   */
  window?: number
}

const average = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

/**
 * A season of sc Heerenveen in bars: the form as letters above, a bar for each match (3 high
 * for a win, 1 for a draw and a small one for a loss, with empty places for the matches still
 * to come) and a smooth line through the average of the points per match over the last
 * matches. Under it are the key to the letters and a sentence about the line, so everything the
 * picture says is text too. The chart itself is hidden from a screen reader, so give the same
 * numbers in a `DataTable` next to it.
 *
 * It puts together the parts that know nothing about football (`MarkRow`, `BarChart` and
 * `BarChart.Trend`); the letters, the points and the average of the last matches are here.
 */
export const FormChart = ({ className, matches = 34, results, window: span = 5, ...props }: FormChartProps) => {
  const played = results.slice(0, matches)
  const line = movingAverage(
    played.map((result) => pointsOf(result)),
    span,
  )
  const latest = line.at(-1) ?? null

  return (
    <div {...props} className={classNames('hf-form-chart', className)}>
      <MarkRow empty="Nog geen wedstrijden gespeeld." marks={formOf(played, 5)} title="Vorm" />
      <BarChart axis={{ title: 'Speelronde' }} bars={slots(played, matches)} max={3} ticks={[0, 1, 3]}>
        <BarChart.Trend values={Array.from({ length: matches }, (_, index) => line[index] ?? null)} />
      </BarChart>
      <Text appearance="meta" className="hf-form-chart-key">
        <b>W</b> winst (3 punten), <b>G</b> gelijk (1), <b>V</b> verlies (0).
      </Text>
      <Text appearance="meta" className="hf-form-chart-line">
        {latest === null
          ? `De lijn begint na ${span} wedstrijden.`
          : `De lijn laat zien hoeveel punten sc Heerenveen per wedstrijd haalde in de laatste ${span} wedstrijden: nu ${average.format(latest)}.`}
      </Text>
    </div>
  )
}
