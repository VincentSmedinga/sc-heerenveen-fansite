import type { ComponentPropsWithoutRef } from 'react'

import { BarChart } from '../bar-chart/BarChart'
import { classNames } from '../classNames'
import { MarkRow } from '../mark-row/MarkRow'
import { Text } from '../text/Text'
import { averagesOf, formatAverage, formOf, type FormResult, slots } from './form'
import { FormKey } from './FormKey'

export type FormChartProps = Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'results'> & {
  /** A form chart has no children: everything it shows comes from the props below. */
  children?: never
  /** The number of matches in the season. The default is 34, the matches of the Eredivisie. */
  matches?: number
  /** The matches played so far, the oldest first, as `W` (won), `G` (drawn) or `V` (lost). */
  results: readonly FormResult[]
  /**
   * The most matches the line averages over: it starts at the first match, over fewer, and
   * goes on over this many. The default is 5, the number of results in the form above it.
   */
  window?: number
}

/**
 * A season of sc Heerenveen in bars: the form as letters above, a bar for each match (3 high
 * for a win, 1 for a draw and a small one for a loss, with empty places for the matches still
 * to come) and a smooth line through the average of the points per match over the last
 * matches, from the first one on. Under it are the key to the letters and a sentence about
 * the line, so everything the picture says is text too. A tooltip follows the pointer along the
 * line and gives the average at that match. The chart itself is hidden from a screen reader,
 * so give the same numbers in a `DataTable` next to it, with `averagesOf` for the line.
 *
 * It puts together the parts that know nothing about football (`MarkRow`, `BarChart` and
 * `BarChart.Trend`); the letters, the points and the average of the last matches are here.
 */
export const FormChart = ({ className, matches = 34, results, window: span = 5, ...props }: FormChartProps) => {
  const played = results.slice(0, matches)
  const line = averagesOf(played, span)
  const latest = line.at(-1) ?? null
  const counted = Math.min(span, played.length)

  return (
    <div {...props} className={classNames('hf-form-chart hf-flow', className)}>
      <MarkRow
        className="hf-space-end-s"
        empty="Nog geen wedstrijden gespeeld."
        marks={formOf(played, 5)}
        title="Vorm"
      />
      <BarChart axis={{ title: 'Speelronde' }} bars={slots(played, matches)} max={3} ticks={[0, 1, 3]}>
        <BarChart.Trend
          labels={Array.from({ length: matches }, (_, index) => {
            const value = line[index]

            return value === undefined ? null : formatAverage(value)
          })}
          values={Array.from({ length: matches }, (_, index) => line[index] ?? null)}
        />
      </BarChart>
      <FormKey className="hf-form-chart-key hf-space-end-xs" />
      <Text appearance="meta" className="hf-form-chart-line">
        {latest === null
          ? 'De lijn begint bij de eerste wedstrijd.'
          : `De lijn laat zien hoeveel punten sc Heerenveen per wedstrijd haalde in ${counted === 1 ? 'de laatste wedstrijd' : `de laatste ${counted} wedstrijden`}: nu ${formatAverage(latest)}.`}
      </Text>
    </div>
  )
}
