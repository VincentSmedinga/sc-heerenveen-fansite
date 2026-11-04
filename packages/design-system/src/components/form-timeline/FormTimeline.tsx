import type { ComponentPropsWithoutRef } from 'react'

import { BarChart } from '../bar-chart/BarChart'
import { movingAverage } from '../chart/trend'
import { classNames } from '../classNames'
import { type FormResult, pointsOf } from '../form-chart/form'
import { FormKey } from '../form-chart/FormKey'
import { Text } from '../text/Text'
import { barsOf, yearLabels, yearOfPlace } from './timeline'

/** The last point of the line: the average, with a decimal comma, and the year it sits in. */
export type FormTimelineLatest = {
  average: string
  year: number
}

export type FormTimelineProps = Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'results'> & {
  /** A form timeline has no children: everything it shows comes from the props below. */
  children?: never
  /** The year of the first place. A label sits under each year that `labelEvery` divides. */
  firstYear: number
  /** How many years there are between two labels. The default is 5. */
  labelEvery?: number
  /**
   * The sentence about the line, from its last point: how far back it goes and the year of that
   * point, or `null` when the line has no point. Write it in full: it is the text for what the
   * line shows.
   */
  line: (latest: FormTimelineLatest | null) => string
  /** How many places make one year. The default is 2. */
  placesPerYear?: number
  /**
   * A result for each place, the oldest first, or `null` for a place with nothing: `W` (won),
   * `G` (drawn) or `V` (lost).
   */
  results: readonly (FormResult | null)[]
  /**
   * What counts and what does not, such as the competition and since when we have matches. A
   * place with no result is a gap, and without this sentence a gap reads as "never played".
   */
  scope: string
  /** The caption under the labels, such as `Seizoen`. */
  title: string
  /** The number of results the line averages over. The default is 4. */
  window?: number
}

const average = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

/**
 * Results over the years as bars: a place on the axis for each result, with gaps where there
 * is none, and a smooth line through the average of the points over the last results. The
 * axis follows the time, so it has the same places whatever has been played, and a label sits
 * under every fifth year. A gap in the results is a gap in the line. Under the chart are the
 * key to the letters, a sentence about the line and one about what counts, so everything the
 * picture says is text too. The chart itself is hidden from a screen reader, so give the same
 * numbers in a list or a table on the same page.
 *
 * It puts together `BarChart`, `BarChart.Trend` and the key of `FormChart`. It knows nothing
 * about matches or seasons: the page gives a result or nothing for each place, the year of the
 * first place and the texts.
 */
export const FormTimeline = ({
  className,
  firstYear,
  labelEvery = 5,
  line,
  placesPerYear = 2,
  results,
  scope,
  title,
  window: span = 4,
  ...props
}: FormTimelineProps) => {
  const values = movingAverage(
    results.map((result) => (result === null ? null : pointsOf(result))),
    span,
  )
  const last = values.findLastIndex((value) => value !== null)
  const latest = values[last] ?? null

  return (
    <div {...props} className={classNames('hf-form-timeline hf-flow', className)}>
      <BarChart
        axis={{ labels: yearLabels(results.length, firstYear, placesPerYear, labelEvery), title }}
        bars={barsOf(results)}
        max={3}
        size="small"
        ticks={[0, 1, 3]}
      >
        <BarChart.Trend values={values} />
      </BarChart>
      <FormKey className="hf-space-end-xs" />
      <Text appearance="meta" className="hf-form-timeline-line hf-space-end-xs">
        {line(
          latest === null
            ? null
            : { average: average.format(latest), year: yearOfPlace(last, firstYear, placesPerYear) },
        )}
      </Text>
      <Text appearance="meta" className="hf-form-timeline-scope">
        {scope}
      </Text>
    </div>
  )
}
