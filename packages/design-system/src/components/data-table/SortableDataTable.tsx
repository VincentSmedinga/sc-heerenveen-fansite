'use client'

import { type ComponentPropsWithoutRef, useMemo, useState, useSyncExternalStore } from 'react'

import type { DataTableColumn, DataTableRow, DataTableTextColumn, DataTableTextRow } from './dataTableTypes'

import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'
import {
  ColumnText,
  keyColumnOf,
  needsFoldContainer,
  TableRows,
  textColumnClass,
  TextColumnText,
  TextTableRows,
} from './dataTableParts'
import { describeSorting, firstDirection, isNumericColumn, type SortableRow, type Sorting, sortRows } from './sortRows'

export type SortableDataTableProps =
  | (SortableDataTableBase & {
      appearance: 'numbers'
      columns: readonly DataTableColumn[]
      rows: readonly DataTableRow[]
    })
  | (SortableDataTableBase & {
      appearance: 'text'
      columns: readonly DataTableTextColumn[]
      rows: readonly DataTableTextRow[]
    })

type SortableDataTableBase = Omit<ComponentPropsWithoutRef<'table'>, 'children'> & {
  caption: string
  /** For each column whether it can sort, as `DataTable` worked it out on the server. */
  sortableColumns: readonly boolean[]
}

const subscribeToNothing = () => () => undefined

/**
 * The table of a `DataTable` that can sort, with numbers or with text. Without JavaScript, and
 * in the first render of the browser, it is the plain table in the order of `rows`, so the
 * server sends the whole table and nothing is dead. With JavaScript the headers of the columns
 * that can sort become buttons.
 * A click sorts on the column: the first time the biggest number first, or A to Z for text.
 * The second click turns the direction round, and the third gives the order of `rows` back,
 * with no arrow and `aria-sort="none"` on every header. The sorted header has `aria-sort` and
 * an arrow, the other sortable headers have `aria-sort="none"`, and a line that is not shown,
 * in a polite live region, says what happened. The focus stays on the button, because the
 * header is not rebuilt.
 * The column that is sorted on is the key figure of a table with numbers, in the heaviest
 * weight, and so is the column with `key` before the visitor has sorted. Bold is never the
 * only sign: the button and `aria-sort` say it too.
 */
export const SortableDataTable = ({
  appearance,
  caption,
  className,
  columns,
  rows,
  sortableColumns,
  ...props
}: SortableDataTableProps) => {
  // Whether script runs: only then the headers are buttons. The server and the first render of
  // the browser say no, so the page is the same for both.
  const scripted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
  const [sorting, setSorting] = useState<Sorting>()
  const [announcement, setAnnouncement] = useState('')
  const text = appearance === 'text'
  // The key figure is the column the visitor sorted on. Before that, and without script, it is
  // the column with `key`. A table sorted on its first column, which holds the row headers, has
  // none: the row headers are already the semibold of a header.
  const declaredKey = text ? -1 : keyColumnOf(columns as readonly DataTableColumn[])
  const keyColumn = sorting === undefined ? declaredKey : sorting.column
  const sorted = useMemo(
    // Equal values stand in the order of the row headers in a table with numbers, and in the
    // order of the page in a table with text.
    () => (sorting === undefined ? rows : sortRows<SortableRow>(rows, sorting, { byHeader: !text })),
    [rows, sorting, text],
  )

  const sortOn = (column: number) => {
    const numeric = isNumericColumn(rows as readonly SortableRow[], column)
    const first = firstDirection(rows as readonly SortableRow[], column)
    const second = first === 'ascending' ? 'descending' : 'ascending'
    // The first click sorts, the second turns round and the third gives the page's order back.
    const next: Sorting | undefined =
      sorting?.column !== column
        ? { column, direction: first }
        : sorting.direction === first
          ? { column, direction: second }
          : undefined

    setSorting(next)
    setAnnouncement(describeSorting(columns[column]?.name ?? '', next?.direction, numeric))
  }

  const header = (column: DataTableColumn | DataTableTextColumn, index: number) => {
    const active = sorting?.column === index
    const sortable = scripted && sortableColumns[index] === true
    const arrow = active && <Icon name={sorting.direction === 'ascending' ? 'arrow-up' : 'arrow-down'} />
    const label = text ? (
      <TextColumnText column={column as DataTableTextColumn} named={sortable} />
    ) : (
      <ColumnText column={column as DataTableColumn} named={sortable} />
    )
    const atEnd = !text && index > 0

    return (
      <th
        aria-sort={sortable ? (active ? sorting.direction : 'none') : undefined}
        className={
          text
            ? textColumnClass(column as DataTableTextColumn)
            : index === 0
              ? undefined
              : classNames('hf-numeric', (column as DataTableColumn).more === true && 'hf-more-column')
        }
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
            {atEnd && arrow}
            {label}
            {!atEnd && arrow}
          </button>
        ) : (
          label
        )}
      </th>
    )
  }

  const table = (
    <table
      {...props}
      className={classNames('hf-data-table', text ? 'hf-data-table-text' : 'hf-data-table-sortable', className)}
    >
      <caption className="hf-visually-hidden">{caption}</caption>
      <thead>
        <tr>{columns.map(header)}</tr>
      </thead>
      {text ? (
        <TextTableRows
          columns={columns as readonly DataTableTextColumn[]}
          rows={sorted as unknown as readonly DataTableTextRow[]}
        />
      ) : (
        <TableRows
          columns={columns as readonly DataTableColumn[]}
          keyColumn={keyColumn}
          rows={sorted as unknown as readonly DataTableRow[]}
          withPosition={false}
        />
      )}
    </table>
  )

  return (
    <>
      {text && needsFoldContainer(columns as readonly DataTableTextColumn[]) ? (
        <div className="hf-data-table-fold">{table}</div>
      ) : (
        table
      )}
      {scripted && (
        <div className="hf-visually-hidden" role="status">
          {announcement}
        </div>
      )}
    </>
  )
}
