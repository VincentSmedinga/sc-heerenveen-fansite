import type { ComponentPropsWithoutRef } from 'react'

import type { DataTableColumn, DataTableRow } from './dataTableTypes'

import { classNames } from '../classNames'
import { columnOf, ColumnText, TableRows } from './dataTableParts'
import { SortableDataTable } from './SortableDataTable'

export type { DataTableCell, DataTableColumn, DataTableRow } from './dataTableTypes'

export type DataTableProps = Omit<ComponentPropsWithoutRef<'table'>, 'children'> & {
  /**
   * The text of the table's caption, which names the table and says what it holds, such as
   * `Bezoekers per dag, de laatste 30 dagen`. Only a screen reader gets it: the caption is not
   * shown, so put a heading above the table that says the same to bezienden.
   */
  caption: string
  /** A data table has no children: everything it shows comes from the props below. */
  children?: never
  /**
   * The column headers, in order. The first column holds the row headers (a day, a path), and
   * the others hold numbers, aligned to the end. Keep a header short: it only wraps at a space,
   * so a long word makes the table wider than a phone. A table with many columns, which does
   * not fit a phone with whole words, gives a column as `{ abbreviation, name }`: the header
   * shows the abbreviation, and the page explains it in a line under the table. A column given
   * as `{ name, sortable: true }` lets the visitor sort the table on it.
   */
  columns: readonly (DataTableColumn | string)[]
  /** The rows of the table, from the first down. */
  rows: readonly DataTableRow[]
}

/**
 * A table of numbers: a real `table` with a caption that is not shown, column headers and row
 * headers with `scope`, and the numbers aligned to the end with tabular figures. It is a list
 * of things that each have a few numbers, such as the days of a month, not a table with merged
 * cells or cells with more than text. A row can have a link in its header (`href`). A long row
 * header, such as a path, wraps instead of making the table wider than the space.
 * base/table.css gives it its look.
 *
 * A column can be `sortable`. The table then lets the visitor sort on it, which needs
 * JavaScript: the server sends the whole table in the order of `rows`, with plain headers, and
 * in the browser the headers of the sortable columns become buttons (see SortableDataTable). A
 * table without a sortable column is the same plain table as ever and sends no script.
 */
export const DataTable = ({ caption, className, columns, rows, ...props }: DataTableProps) => {
  const all = columns.map(columnOf)

  if (all.some((column) => column.sortable === true)) {
    return <SortableDataTable {...props} caption={caption} className={className} columns={all} rows={rows} />
  }

  return (
    <table {...props} className={classNames('hf-data-table', className)}>
      <caption className="hf-visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {all.map((column, index) => (
            <th className={index === 0 ? undefined : 'hf-numeric'} key={column.name} scope="col">
              <ColumnText column={column} />
            </th>
          ))}
        </tr>
      </thead>
      <TableRows columns={all} rows={rows} />
    </table>
  )
}
