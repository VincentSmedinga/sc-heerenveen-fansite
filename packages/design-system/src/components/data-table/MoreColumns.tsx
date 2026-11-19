'use client'

import { type ComponentPropsWithoutRef, type ReactNode, useState, useSyncExternalStore } from 'react'

import { Button } from '../button/Button'
import { classNames } from '../classNames'

/**
 * A table of numbers with columns behind a button where the table is narrow, such as the wins,
 * draws and losses on a phone. Put the table in it, with `more: true` on the columns that wait
 * behind the button, and the legend that goes with them (`tableLegend` gives a `more` column an
 * item that goes with it). It is written as `DataTable.More`.
 *
 * Where the room is, the columns are always there and so is nothing of the button. The room is
 * that of the block itself, not of the screen, as with the columns that fold (see
 * data-table.css), so it is right in a narrow column on a wide screen too. Without JavaScript
 * every column is there and the button is not, because a button that does nothing is worse than
 * a table that is a little too tight: the CSS only hides the columns once the script has run.
 * The button says whether the columns are shown with `aria-expanded`, and the hidden columns
 * are gone for a screen reader as well, so the table reads as the table that is shown.
 */
export const MoreColumns = ({
  children,
  className,
  less = 'Toon minder',
  more = 'Toon meer',
  ...props
}: Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** The table, and the legend under it. */
  children: ReactNode
  /** The text of the button while the columns are shown. */
  less?: string
  /** The text of the button while the columns are hidden. */
  more?: string
}) => {
  const [open, setOpen] = useState(false)
  // The server sends the whole table, and only the browser, after it has run, may hide columns:
  // the server snapshot is false and the browser's is true, so it also holds while hydrating.
  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )

  return (
    <div
      {...props}
      className={classNames('hf-data-table-more', 'hf-flow', className)}
      data-open={open ? '' : undefined}
      data-ready={ready ? '' : undefined}
    >
      <Button
        appearance="soft"
        aria-expanded={open}
        className="hf-data-table-more-button"
        onClick={() => setOpen((value) => !value)}
        size="small"
        type="button"
      >
        {open ? less : more}
      </Button>
      {children}
    </div>
  )
}

MoreColumns.displayName = 'DataTable.More'
