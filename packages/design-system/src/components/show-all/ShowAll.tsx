'use client'

import { type ComponentPropsWithoutRef, type MouseEvent, type ReactNode, useId, useState } from 'react'
import { flushSync } from 'react-dom'

import { Button } from '../button/Button'
import { classNames } from '../classNames'

export type ShowAllProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /**
   * One table (`DataTable` or `TopScorersTable`) or one `PredictionList` with every row of the
   * list, and the legend that goes with it.
   */
  children: ReactNode
  /** The text of the button while the list is open. */
  lessLabel?: string
  /**
   * The text of the button while the list is closed. It says what comes with it, such as
   * `Toon alle 24 spelers`.
   */
  moreLabel: string
  /** How many rows show while the list is closed. */
  shown: number
  /** How many rows the list has. With `shown` rows or fewer there is no button. */
  total: number
}

/**
 * The rows of a table or a list after the first `shown`, behind a button under it. It stays one
 * list: one caption, one row of column headers, one legend, and a table that sorts, sorts every
 * row and shows the first of that order while it is closed.
 *
 * The server sends every row. A `style` element in the block hides the rows after the first
 * `shown`, only where script is on (`@media (scripting: enabled)`), so the page never shows
 * them first. Without JavaScript every row is there and the button is not shown. A hidden row
 * is gone for a screen reader and the keyboard as well (`display: none`). The button says
 * whether the list is open with `aria-expanded`, keeps the focus, and stays in view when the
 * list closes. show-all.css gives it its look.
 */
export const ShowAll = ({
  children,
  className,
  lessLabel = 'Toon minder',
  moreLabel,
  shown,
  total,
  ...props
}: ShowAllProps) => {
  const [open, setOpen] = useState(false)
  const id = useId()
  const more = total > shown
  // The rows of a table or of a PredictionList in this block, and of no other.
  const rows = `[data-show-all="${id}"] :is(tbody > tr, .hf-prediction-list > li):nth-child(n + ${shown + 1})`

  const toggle = ({ currentTarget }: MouseEvent<HTMLButtonElement>) => {
    // The rows must be gone before we can see where the button is.
    flushSync(() => setOpen(!open))

    if (open) {
      currentTarget.scrollIntoView({ block: 'nearest' })
    }
  }

  return (
    <div {...props} className={classNames('hf-show-all', 'hf-flow', className)} data-show-all={id}>
      {more && !open && <style>{`@media (scripting: enabled) { ${rows} { display: none; } }`}</style>}
      {children}
      {more && (
        <Button
          appearance="soft"
          aria-expanded={open}
          className="hf-show-all-button"
          onClick={toggle}
          size="small"
          type="button"
        >
          {open ? lessLabel : moreLabel}
        </Button>
      )}
    </div>
  )
}
