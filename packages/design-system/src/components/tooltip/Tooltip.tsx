'use client'

import { type ComponentPropsWithoutRef, type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { classNames } from '../classNames'
import { placeTooltip, type TooltipPlacement } from './placement'

export type TooltipProps = Omit<ComponentPropsWithoutRef<'div'>, 'aria-hidden' | 'children' | 'style'> & {
  /** How far up the place is, from 0 (the bottom of the parent) to 100 (the top). */
  bottom: number
  /** The text of the tooltip. It is short: a value, say. */
  children: string
  /** How far along the place is, from 0 (the left of the parent) to 100 (the right). */
  left: number
  /** Called at Escape. The parent should stop showing the tooltip then. */
  onClose?: () => void
}

/** The room between the place and the tooltip, in pixels. */
const gap = 12

/**
 * A short text at a place in its parent, such as the value at a point of a chart. The parent
 * is the element it sits in, which should be positioned (`position: relative`) and sets how
 * large the area is; the place is given as a share of it, from the left and from the bottom.
 * The tooltip sits above the place, or below it when there is no room above, and never goes
 * past an edge of the parent. It has no arrow and does not move: it is at the new place at
 * once.
 *
 * It is a help for the pointer and for touch, not a control. It does not react to the pointer
 * itself, so the pointer can pass over it, it is hidden from a screen reader (`aria-hidden`)
 * and cannot get focus. The parent shows and hides it, and a screen reader needs the same text
 * elsewhere. Escape is reported through `onClose`. tooltip.css gives the look.
 */
export const Tooltip = ({ bottom, children, className, left, onClose, ...props }: TooltipProps) => {
  const element = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<null | TooltipPlacement>(null)

  // Before the browser paints: the size of the tooltip is only known once it has its text.
  useLayoutEffect(() => {
    const own = element.current
    const parent = own?.parentElement

    if (!own || !parent) return

    const place = () =>
      setPlacement(
        placeTooltip({
          anchor: { x: (left / 100) * parent.clientWidth, y: (1 - bottom / 100) * parent.clientHeight },
          gap,
          parent: { height: parent.clientHeight, width: parent.clientWidth },
          tooltip: { height: own.offsetHeight, width: own.offsetWidth },
        }),
      )

    place()

    if (typeof ResizeObserver === 'undefined') return

    // The parent can change size while the tooltip is open, such as when a phone is turned.
    const observer = new ResizeObserver(place)
    observer.observe(parent)

    return () => observer.disconnect()
  }, [bottom, children, left])

  useEffect(() => {
    if (!onClose) return

    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', close)

    return () => document.removeEventListener('keydown', close)
  }, [onClose])

  return (
    <div
      {...props}
      aria-hidden="true"
      className={classNames('hf-tooltip', className)}
      data-side={placement?.side}
      ref={element}
      style={
        placement
          ? ({ '--hf-tooltip-x': `${placement.x}px`, '--hf-tooltip-y': `${placement.y}px` } as CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  )
}
