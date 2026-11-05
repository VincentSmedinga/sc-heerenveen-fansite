'use client'

import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react'

import { Tooltip } from '../tooltip/Tooltip'
import { nearestPoint, type TrendPoint } from './pointer'

export type TrendPointerProps = {
  /** One entry per place: where its point is and its text, or `null` for no point. */
  points: readonly (null | TrendPoint)[]
}

/**
 * The part of a `BarChart.Trend` that reacts to the pointer, a layer over the chart that is
 * only there when the trend has `labels`. It is the one part that needs JavaScript, so the
 * rest of the chart stays on the server.
 *
 * A mouse or a pen picks the place with a point that is nearest, as long as it is over the
 * chart. A finger picks it with a tap, and moves it by dragging sideways (a swipe up or down
 * still scrolls the page, see `touch-action` in bar-chart.css); the tooltip stays when the
 * finger lifts, until a tap outside the chart or Escape. The chart is hidden from a screen
 * reader and cannot get focus, so there is nothing for the keyboard here except Escape.
 */
export function TrendPointer({ points }: TrendPointerProps) {
  const layer = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<null | number>(null)

  // A tap outside the chart closes the tooltip. This only listens while there is one.
  useEffect(() => {
    if (active === null) return

    const away = (event: Event) => {
      if (!(event.target instanceof Node) || !layer.current?.contains(event.target)) setActive(null)
    }

    document.addEventListener('pointerdown', away)

    return () => document.removeEventListener('pointerdown', away)
  }, [active])

  const pick = (event: PointerEvent) => {
    const box = layer.current?.getBoundingClientRect()

    if (!box || box.width === 0) return

    setActive(nearestPoint(((event.clientX - box.left) / box.width) * 100, points))
  }

  const point = active === null ? null : (points[active] ?? null)

  return (
    <>
      <div
        className="hf-bar-chart-pointer"
        // A finger shows the tooltip with a tap or a sideways drag, not when it only touches
        // down (it may scroll), and does not take it away when it lifts.
        onPointerEnter={(event) => event.pointerType !== 'touch' && pick(event)}
        onPointerLeave={(event) => event.pointerType !== 'touch' && setActive(null)}
        onPointerMove={pick}
        onPointerUp={(event) => event.pointerType === 'touch' && pick(event)}
        ref={layer}
      />
      {point && (
        <>
          <span
            className="hf-bar-chart-trend-dot"
            style={{ '--hf-bar-chart-across': point.across, '--hf-bar-chart-at': point.at } as CSSProperties}
          />
          <Tooltip bottom={point.at} left={point.across} onClose={() => setActive(null)}>
            {point.label}
          </Tooltip>
        </>
      )}
    </>
  )
}
