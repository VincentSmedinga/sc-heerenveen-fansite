'use client'

import { type ComponentPropsWithoutRef, useMemo, useState, useSyncExternalStore } from 'react'

import type { DataTableColumn, DataTableRow } from './dataTableTypes'

import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'
import { ColumnText, TableRows } from './dataTableParts'
import { describeSorting, firstDirection, isNumericColumn, type Sorting, sortRows } from './sortRows'

export type SortableDataTableProps = Omit<ComponentPropsWithoutRef<'table'>, 'children'> & {
  caption: string
  columns: readonly DataTableColumn[]
  rows: readonly DataTableRow[]
}

const subscribeToNothing = () => () => undefined

/**
 * The table of a `DataTable` with sortable columns. Without JavaScript, and in the first render
 * of the browser, it is the plain table in the order of `rows`, so the server sends the whole
 * table and nothing is dead. With JavaScript the headers of the sortable columns become
 * buttons.
 * A click sorts on the column: the first time the biggest number first, or A to Z for text,
 * and the next click turns the direction round. The sorted header has `aria-sort` and an arrow,
 * the other sortable headers have `aria-sort="none"`, and a line that is not shown, in a polite
 * live region, says what happened. The focus stays on the button, because the header is not
 * rebuilt.
 */
export const SortableDataTable = ({ caption, className, columns, rows, ...props }: SortableDataTableProps) => {
  // Whether script runs: only then the headers are buttons. The server and the first render of
  // the browser say no, so the page is the same for both.
  const scripted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
  const [sorting, setSorting] = useState<Sorting>()
  const [announcement, setAnnouncement] = useState('')
  const sorted = useMemo(() => (sorting === undefined ? rows : sortRows(rows, sorting)), [rows, sorting])

  const sortOn = (column: number) => {
    const direction =
      sorting?.column === column
        ? sorting.direction === 'ascending'
          ? 'descending'
          : 'ascending'
        : firstDirection(rows, column)

    setSorting({ column, direction })
    setAnnouncement(describeSorting(columns[column]?.name ?? '', direction, isNumericColumn(rows, column)))
  }

  return (
    <>
      <table {...props} className={classNames('hf-data-table', className)}>
        <caption className="hf-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column, index) => {
              const active = sorting?.column === index
              const sortable = scripted && column.sortable === true

              return (
                <th
                  aria-sort={sortable ? (active ? sorting.direction : 'none') : undefined}
                  className={index === 0 ? undefined : 'hf-numeric'}
                  key={column.name}
                  scope="col"
                >
                  {sortable ? (
                    <button
                      className="hf-data-table-sort"
                      onClick={() => {
                        sortOn(index)
                      }}
                      type="button"
                    >
                      <ColumnText column={column} />
                      {active && <Icon name={sorting.direction === 'ascending' ? 'arrow-up' : 'arrow-down'} />}
                    </button>
                  ) : (
                    <ColumnText column={column} />
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <TableRows columns={columns} rows={sorted} />
      </table>
      {scripted && (
        <div className="hf-visually-hidden" role="status">
          {announcement}
        </div>
      )}
    </>
  )
}
