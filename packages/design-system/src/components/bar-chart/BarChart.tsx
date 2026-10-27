import {
  Children,
  cloneElement,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  isValidElement,
  type ReactNode,
} from 'react'

import type { ChartTone } from '../chart/tones'

import { monotonePath, type TrendCurve } from '../chart/trend'
import { classNames } from '../classNames'
import { axisLabels } from './axis'

export type BarChartAxis = {
  /**
   * The text of the number of a place, from the place counted from 0. The default is the
   * number counted from 1.
   */
  labelOf?: (slot: number) => string
  /** The caption under the numbers, such as `Speelronde`. */
  title?: string
}

/** One bar: how high it is, on the scale of the chart, and the tone that gives its colour. */
export type BarChartBar = {
  tone: ChartTone
  /** From 0 to `max`. Higher is clamped, lower is 0. */
  value: number
}

export type BarChartProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /**
   * The numbers under the ground: a chart of a place per match, say. `false` has none. Without
   * it the places are numbered from 1.
   */
  axis?: BarChartAxis | false
  /**
   * The bars, one per place from the start side. `null` is a place that has no bar yet: only
   * the ground shows there. The number of bars is the number of places of the chart.
   */
  bars: readonly (BarChartBar | null)[]
  /** Layers on the same chart, such as a `BarChart.Trend`. They sit right on the places. */
  children?: ReactNode
  /** The value of a full bar. It is the scale of the chart, and of a trend on it. */
  max: number
  /**
   * Lines across the chart at these values, and on a chart with room the numbers at the side. A
   * line at 0 is the ground, which is always there.
   */
  ticks?: readonly number[]
  /**
   * What a bar of value 0 looks like: `stub` (the default) is a small bar on the ground, so it
   * can be told from a place with no bar; `none` shows nothing.
   */
  zero?: 'none' | 'stub'
}

export type BarChartTrendProps = {
  /** `smooth` (the default) never goes past its values, `straight` has straight stretches. */
  curve?: TrendCurve
  /** Whether the line has an edge round it that parts it from the bars. The default is yes. */
  edge?: boolean
  /** Whether the last point has a dot. The default is yes. */
  endDot?: boolean
  /**
   * The scale of the values. The `BarChart` it sits in gives it. Only set it for a trend
   * outside a chart, where it is the largest value if you don't.
   */
  max?: number
  /** One value per place, on the scale of the chart. `null` is a gap, where the line stops. */
  values: readonly (null | number)[]
}

const percentOf = (value: number, max: number) => Math.round(Math.min(1, Math.max(0, value / max)) * 10000) / 100

/**
 * A line over a `BarChart`, through one value per place. The drawing has the places as its
 * width and the scale of the chart as its height, and stretches over the chart, with a stroke
 * that keeps its width in pixels. There is no line before its first point.
 */
const Trend = ({ curve = 'smooth', edge = true, endDot = true, max, values }: BarChartTrendProps) => {
  const scale = max ?? Math.max(1, ...values.map((value) => value ?? 0))
  const path = monotonePath(values, scale, curve)
  const last = values.findLastIndex((value) => value !== null)
  const lastValue = values[last] ?? null

  return (
    <>
      <svg
        aria-hidden="true"
        className="hf-bar-chart-trend"
        focusable="false"
        preserveAspectRatio="none"
        viewBox={`0 0 ${Math.max(1, values.length)} 100`}
      >
        {edge && <path className="hf-bar-chart-trend-edge" d={path} />}
        <path className="hf-bar-chart-trend-line" d={path} />
      </svg>
      {endDot && lastValue !== null && (
        <span
          className="hf-bar-chart-trend-dot"
          style={
            {
              '--hf-bar-chart-across': Math.round(((last + 0.5) / values.length) * 10000) / 100,
              '--hf-bar-chart-at': percentOf(lastValue, scale),
            } as CSSProperties
          }
        />
      )}
    </>
  )
}

// The name in React's developer tools and in the code examples in Storybook.
Trend.displayName = 'BarChart.Trend'

/**
 * A row of bars, one per place, with the ground under them and, if you ask, lines across and
 * numbers under the places. Every place has the same room, from the start side, also a place
 * with no bar yet, so the chart shows the whole stretch it will fill. A bar is as high as its
 * value is a share of `max`, in the colour of its tone.
 *
 * The parts know nothing about what a chart is about: `max`, the tones and the numbers are the
 * page's. The chart is a picture of numbers that the page should give as text as well, so it is
 * hidden from a screen reader (`aria-hidden`), like the `DonutChart`. bar-chart.css gives the
 * look; the sizes follow the width of the place the chart sits in.
 */
export const BarChart = ({
  axis = {},
  bars,
  children,
  className,
  max,
  style,
  ticks = [],
  zero = 'stub',
  ...props
}: BarChartProps) => {
  const slots = bars.length
  const labelOf = (axis ? axis.labelOf : undefined) ?? ((slot: number) => String(slot + 1))
  const layers = Children.map(children, (child) =>
    isValidElement<BarChartTrendProps>(child) && child.type === Trend ? cloneElement(child, { max }) : child,
  )

  return (
    <div
      {...props}
      aria-hidden="true"
      className={classNames('hf-bar-chart', className)}
      style={{ ...style, '--hf-bar-chart-slots': slots } as CSSProperties}
    >
      <div className="hf-bar-chart-frame">
        <div className="hf-bar-chart-scale">
          {ticks.map((tick) => (
            <span
              className="hf-bar-chart-scale-number"
              key={tick}
              style={{ '--hf-bar-chart-at': percentOf(tick, max) } as CSSProperties}
            >
              {tick}
            </span>
          ))}
        </div>
        <div className="hf-bar-chart-plot">
          {ticks
            .filter((tick) => tick > 0)
            .map((tick) => (
              <span
                className="hf-bar-chart-guide"
                key={tick}
                style={{ '--hf-bar-chart-at': percentOf(tick, max) } as CSSProperties}
              />
            ))}
          <div className="hf-bar-chart-bars">
            {bars.map((bar, index) => (
              // The places never change order, so the number of the place is its key.
              <div className="hf-bar-chart-slot" key={index}>
                {bar && (bar.value > 0 || zero === 'stub') && (
                  <span
                    className={classNames(
                      'hf-bar-chart-bar',
                      `hf-chart-tone-${bar.tone}`,
                      bar.value <= 0 && 'hf-bar-chart-stub',
                    )}
                    style={{ '--hf-bar-chart-share': percentOf(bar.value, max) } as CSSProperties}
                  />
                )}
              </div>
            ))}
          </div>
          {layers}
        </div>
        {axis && (
          <div className="hf-bar-chart-axis">
            <div className="hf-bar-chart-numbers">
              {axisLabels(slots).map((label) => (
                <span
                  className={classNames('hf-bar-chart-number', !label.narrow && 'hf-bar-chart-number-wide')}
                  key={label.slot}
                  style={
                    { '--hf-bar-chart-across': Math.round(((label.slot + 0.5) / slots) * 10000) / 100 } as CSSProperties
                  }
                >
                  {labelOf(label.slot)}
                </span>
              ))}
            </div>
            {axis.title && <span className="hf-bar-chart-title">{axis.title}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

BarChart.Trend = Trend
