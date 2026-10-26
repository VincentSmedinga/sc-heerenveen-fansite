import type { ComponentPropsWithoutRef, CSSProperties } from 'react'

import { classNames } from '../classNames'
import { drawing, labelDistance, labelGap, pointAt, ring, slicePath, slicesOf, spreadAngles } from './geometry'

/** The tones a donut chart can have: a positive one and a negative one. */
export const donutChartTones = ['positive', 'negative'] as const

export type DonutChartProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A donut chart has no children: everything it shows comes from the props below. */
  children?: never
  /** The slices in the order they go round, clockwise from the top. */
  slices: readonly DonutChartSlice[]
  /** The title above the ring, such as `Aanmeldingen`. */
  title: string
  /**
   * What the colour says: `positive` is the green of a good result, `negative` the red of a bad
   * one, as in the results of a match. The page decides which of its numbers is which.
   */
  tone: DonutChartTone
}

export type DonutChartSlice = {
  /** The name of the slice, as plain text, such as `31–45`. It is written next to the slice. */
  label: string
  /** The size of the slice. A value of zero has no slice. */
  value: number
}

export type DonutChartTone = (typeof donutChartTones)[number]

/** The lightest strength of the colour, in percent. It still reaches 3:1 on the surface. */
const weakest = 70

/**
 * A donut chart: a ring of slices, each as wide as its share of the total, with the total in
 * the hole. Every slice with a value has its name and its value as text beside it, so the chart
 * can be read without its colours. The slices go from the weakest to the full strength of the
 * colour, in the order they are given, and a gap in the colour of the surface keeps each one
 * apart from the next.
 *
 * The chart is a picture of numbers that a table should give as well, so it is hidden from a
 * screen reader (`aria-hidden`); give the same numbers in a `DataTable` next to it.
 * donut-chart.css gives the look. Several charts go in a `DonutChart.Group`.
 */
export const DonutChart = ({ className, slices, title, tone, ...props }: DonutChartProps) => {
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0)
  const drawn = slicesOf(slices.map((slice) => slice.value))
  const angles = spreadAngles(
    drawn.map((slice) => slice.middle),
    labelGap,
  )

  return (
    <div {...props} aria-hidden="true" className={classNames('hf-donut-chart', `hf-donut-chart-${tone}`, className)}>
      <p className="hf-donut-chart-title">{title}</p>
      <div className="hf-donut-chart-plot">
        <svg className="hf-donut-chart-drawing" focusable="false" viewBox={`0 0 ${drawing.width} ${drawing.height}`}>
          {total === 0 && (
            <path className="hf-donut-chart-track" d={slicePath({ end: 360, start: 0 })} fillRule="evenodd" />
          )}
          {drawn.map((slice) => (
            <path
              className="hf-donut-chart-slice"
              d={slicePath(slice)}
              fillRule="evenodd"
              key={slice.index}
              style={
                {
                  '--hf-donut-strength': `${Math.round(weakest + ((100 - weakest) * slice.index) / Math.max(1, slices.length - 1))}%`,
                } as CSSProperties
              }
            />
          ))}
          {drawn.map((slice, position) => {
            const from = pointAt(slice.middle, ring.outer + 1)
            const to = pointAt(angles[position]!, ring.outer + labelDistance - 2)

            return (
              <line className="hf-donut-chart-leader" key={slice.index} x1={from.x} x2={to.x} y1={from.y} y2={to.y} />
            )
          })}
        </svg>
        <span className="hf-donut-chart-total">{total}</span>
        {drawn.map((slice, position) => {
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
