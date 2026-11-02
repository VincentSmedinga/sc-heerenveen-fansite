import type { ComponentPropsWithoutRef, CSSProperties } from 'react'

import type { ChartTone } from '../chart/tones'

import { classNames } from '../classNames'
import { bare, drawing, labelDistance, labelGap, pointAt, ring, slicePath, slicesOf, spreadAngles } from './geometry'

/** The tones a donut chart can have: a positive one and a negative one. */
export const donutChartTones = ['positive', 'negative'] as const

export type DonutChartProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A donut chart has no children: everything it shows comes from the props below. */
  children?: never
  /**
   * Whether the name and the value of every slice stand as text round the ring. Without them
   * the ring is drawn on its own, a smaller drawing, and the page must give the numbers in a
   * table that tells the slices apart, as the swatches of `DonutChart.Swatch` do.
   */
  labels?: boolean
  /** The slices in the order they go round, clockwise from the top. */
  slices: readonly DonutChartSlice[]
  /** The title above the ring, such as `Aanmeldingen`. Without it the ring has no title. */
  title?: string
  /**
   * What the colour says: `positive` is the green of a good result, `negative` the red of a bad
   * one, as in the results of a match. The page decides which of its numbers is which. A slice
   * with a `tone` of its own keeps it, so a chart can have all three; without this prop every
   * slice needs one.
   */
  tone?: DonutChartTone
}

export type DonutChartSlice = {
  /** The name of the slice, as plain text, such as `31–45`. It is written next to the slice. */
  label: string
  /**
   * The colour of this slice alone: the green of a win (`positive`), the grey of a draw
   * (`neutral`) or the red of a loss (`negative`). It wins over the `tone` of the chart.
   */
  tone?: ChartTone
  /** The size of the slice. A value of zero has no slice. */
  value: number
}

export type DonutChartTone = (typeof donutChartTones)[number]

/**
 * The lightest strength of a colour, in percent. It still reaches 3:1 on the surface. The grey
 * of a draw is lighter on the warm surface and needs 80% (see chart.css).
 */
const weakest = { negative: 70, neutral: 80, positive: 70 } as const

/**
 * The strength of the colour of each slice, in percent: the slices of one tone go from the
 * weakest strength of the tone to the full colour in the order they are given, so slices of
 * one colour can be told apart. `DonutChart.Swatch` uses it too, so the two always agree.
 */
export const strengthsOf = (tones: readonly ChartTone[]): number[] =>
  tones.map((tone, index) => {
    const same = tones.map((other, place) => (other === tone ? place : -1)).filter((place) => place >= 0)

    return Math.round(weakest[tone] + ((100 - weakest[tone]) * same.indexOf(index)) / Math.max(1, same.length - 1))
  })

/** The tone of every slice: its own, or the one of the chart. */
const tonesOf = (slices: readonly DonutChartSlice[], tone: DonutChartTone | undefined): ChartTone[] =>
  slices.map((slice) => slice.tone ?? tone ?? 'neutral')

/**
 * A donut chart: a ring of slices, each as wide as its share of the total, with the total in
 * the hole. Every slice with a value has its name and its value as text beside it, so the chart
 * can be read without its colours. The slices go from the weakest to the full strength of the
 * colour, in the order they are given, and a light outline keeps each one apart from the next.
 *
 * The chart is a picture of numbers that a table should give as well, so it is hidden from a
 * screen reader (`aria-hidden`); give the same numbers in a `DataTable` next to it.
 * donut-chart.css gives the look. Several charts go in a `DonutChart.Group`.
 */
export const DonutChart = ({ className, labels = true, slices, title, tone, ...props }: DonutChartProps) => {
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0)
  const drawn = slicesOf(slices.map((slice) => slice.value))
  const tones = tonesOf(slices, tone)
  const strengths = strengthsOf(tones)
  const angles = spreadAngles(
    drawn.map((slice) => slice.middle),
    labelGap,
  )

  return (
    <div
      {...props}
      aria-hidden="true"
      className={classNames(
        'hf-donut-chart',
        tone === undefined ? undefined : `hf-donut-chart-${tone}`,
        labels ? undefined : 'hf-donut-chart-bare',
        className,
      )}
    >
      {title === undefined ? null : <p className="hf-donut-chart-title">{title}</p>}
      <div className="hf-donut-chart-plot">
        <svg
          className="hf-donut-chart-drawing"
          focusable="false"
          viewBox={labels ? `0 0 ${drawing.width} ${drawing.height}` : `${bare.x} ${bare.y} ${bare.size} ${bare.size}`}
        >
          {total === 0 && (
            <path className="hf-donut-chart-track" d={slicePath({ end: 360, start: 0 })} fillRule="evenodd" />
          )}
          {drawn.map((slice) => (
            <path
              className={classNames(
                'hf-donut-chart-slice',
                slices[slice.index]!.tone === undefined ? undefined : `hf-donut-chart-slice-${tones[slice.index]}`,
              )}
              d={slicePath(slice)}
              fillRule="evenodd"
              key={slice.index}
              style={{ '--hf-donut-strength': `${strengths[slice.index]}%` } as CSSProperties}
            />
          ))}
          {labels &&
            drawn.map((slice, position) => {
              const from = pointAt(slice.middle, ring.outer + 1)
              const to = pointAt(angles[position]!, ring.outer + labelDistance - 2)

              return (
                <line className="hf-donut-chart-leader" key={slice.index} x1={from.x} x2={to.x} y1={from.y} y2={to.y} />
              )
            })}
        </svg>
        <span className="hf-donut-chart-total">{total}</span>
        {labels &&
          drawn.map((slice, position) => {
            const angle = angles[position]!
            const anchor = pointAt(angle, ring.outer + labelDistance)
            const radians = (angle * Math.PI) / 180

            return (
              <span
                className="hf-donut-chart-label"
                key={slice.index}
                style={
                  {
                    '--hf-donut-cos': Math.round(Math.cos(radians) * 1000) / 1000,
                    '--hf-donut-sin': Math.round(Math.sin(radians) * 1000) / 1000,
                    insetBlockStart: `${Math.round((anchor.y / drawing.height) * 10000) / 100}%`,
                    insetInlineStart: `${Math.round((anchor.x / drawing.width) * 10000) / 100}%`,
                  } as CSSProperties
                }
              >
                <span className="hf-donut-chart-name">{slices[slice.index]!.label}</span>
                <b className="hf-donut-chart-value">{slice.value}</b>
              </span>
            )
          })}
      </div>
    </div>
  )
}

/**
 * A small square in the colour and the strength of a slice, for the row of a table that is the
 * key of the chart. It is given the same `slices` as the chart and the `index` of its slice, so
 * it has exactly the colour of the slice. It is a decoration: the row says the same in words.
 */
const Swatch = ({
  className,
  index,
  slices,
  tone,
  ...props
}: Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  children?: never
  /** The place of the slice in `slices`. */
  index: number
  /** The slices of the chart, with the same tones as the chart has. */
  slices: readonly DonutChartSlice[]
  /** The tone of the chart, when its slices have none of their own. */
  tone?: DonutChartTone
}) => {
  const tones = tonesOf(slices, tone)

  return (
    <span
      {...props}
      aria-hidden="true"
      className={classNames('hf-donut-chart-swatch', `hf-donut-chart-slice-${tones[index]}`, className)}
      style={{ '--hf-donut-strength': `${strengthsOf(tones)[index]}%` } as CSSProperties}
    />
  )
}

// The name in React's developer tools and in the code examples in Storybook.
Swatch.displayName = 'DonutChart.Swatch'

/**
 * Charts next to each other when there is room, and under each other when there is not: a
 * phone shows them under each other. It only works around DonutChart elements, so it is written
 * as DonutChart.Group.
 */
const Group = ({ className, ...props }: ComponentPropsWithoutRef<'div'>) => (
  <div {...props} className={classNames('hf-donut-chart-group', className)} />
)

// The name in React's developer tools and in the code examples in Storybook.
Group.displayName = 'DonutChart.Group'

DonutChart.Group = Group
DonutChart.Swatch = Swatch
