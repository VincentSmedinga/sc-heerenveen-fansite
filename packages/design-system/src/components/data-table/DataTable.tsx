import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

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
   * the others hold numbers, aligned to the end.
   */
  columns: readonly string[]
  /** The rows of the table, from the first down. */
  rows: readonly DataTableRow[]
}

export type DataTableRow = {
  /**
   * The numbers of the row, one for each column after the first. A number is written the Dutch
   * way, with a point between the thousands. Text is shown as it is.
   */
  cells: readonly (number | string)[]
  /** What the row is about, as plain text. It is the row header, so it must be unique. */
  header: string
}

const numberFormat = new Intl.NumberFormat('nl-NL')

/**
 * A table of numbers: a real `table` with a caption that is not shown, column headers and row
 * headers with `scope`, and the numbers aligned to the end with tabular figures. It is a list
 * of things that each have a few numbers, such as the days of a month, not a table with merged
 * cells or cells with more than text. A long row header, such as a path, wraps instead of
 * making the table wider than the space. base/table.css gives it its look.
 */
export const DataTable = ({ caption, className, columns, rows, ...props }: DataTableProps) => (
  <table {...props} className={classNames('hf-data-table', className)}>
    <caption className="hf-visually-hidden">{caption}</caption>
    <thead>
      <tr>
        {columns.map((column, index) => (
          <th className={index === 0 ? undefined : 'hf-numeric'} key={column} scope="col">
            {column}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.header}>
          <th scope="row">{row.header}</th>
          {row.cells.map((cell, index) => (
            <td className="hf-numeric" key={columns[index + 1] ?? index}>
              {typeof cell === 'number' ? numberFormat.format(cell) : cell}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
)
