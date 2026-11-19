'use client'

import { useState, useSyncExternalStore } from 'react'

import { Button } from '../button/Button'
import { classNames } from '../classNames'
import { DataTable, type DataTableColumn, type DataTableRow } from '../data-table/DataTable'

/**
 * A table that shows its first rows and a button that adds more of them, five at a time, until
 * the list is shown, and then sets it back to the first rows. It is for a ranking that can be
 * longer than a card is tall, such as the clubs that are the easiest or the hardest to play. It
 * is not `DataTable.More`, which hides columns and not rows.
 *
 * Without JavaScript the table has its first rows and no button: a button that does nothing is
 * worse than a shorter list, and the first rows are the heart of the table. The server sends
 * every row to the component, so the browser needs no request for more. The button keeps its
 * place under the table and the focus stays on it, and a polite live region says what changed.
 * Give the component a `key` that changes with the data (the choice of a card, say), so it
 * starts again at the first rows.
 */
export const MoreRows = ({
  caption,
  className,
  columns,
  initial = 5,
  name,
  rows,
  step = 5,
  unit = 'rijen',
}: {
  /** The caption of the table. `{shown}` stands for the number of rows that show. */
  caption: string
  className?: string
  columns: readonly (DataTableColumn | string)[]
  /** How many rows show at first, and after the button has set the table back. */
  initial?: number
  /** What the table is, for the name of the button, such as `Het makkelijkst`. */
  name: string
  /** All the rows, in order. */
  rows: readonly DataTableRow[]
  /** How many rows each press adds. */
  step?: number
  /** What the rows are, in the message for a screen reader, such as `clubs`. */
  unit?: string
}) => {
  const [requested, setRequested] = useState(initial)
  const [message, setMessage] = useState('')
  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const shown = Math.min(Math.max(requested, initial), rows.length)
  const done = shown >= rows.length
  const left = rows.length - shown
  const label = done ? `Herstel naar top ${initial}` : `Toon ${Math.min(step, left)} meer`

  const press = () => {
    if (done) {
      setRequested(initial)
      setMessage(`Terug naar de top ${initial}`)
    } else {
      const next = Math.min(shown + step, rows.length)

      setRequested(next)
      setMessage(`${next - shown} ${unit} meer getoond, nu ${next}`)
    }
  }

  return (
    <div className={classNames('hf-more-rows', 'hf-flow', className)}>
      <DataTable
        caption={caption.replace('{shown}', String(shown))}
        columns={columns}
        rows={rows.slice(0, shown)}
        sortable={false}
      />
      {ready && rows.length > initial && (
        <Button
          appearance="soft"
          aria-label={`${label}, ${name}`}
          className="hf-more-rows-button"
          onClick={press}
          size="small"
          type="button"
        >
          {label}
        </Button>
      )}
      {ready && (
        <p aria-live="polite" className="hf-visually-hidden" role="status">
          {message}
        </p>
      )}
    </div>
  )
}

MoreRows.displayName = 'MoreRows'
