import type { DataTableCell, DataTableColumn, DataTableRow } from './dataTableTypes'

import { Link } from '../link/Link'

const numberFormat = new Intl.NumberFormat('nl-NL')

/** A column given as a string is a column with that name and nothing else. */
export const columnOf = (column: DataTableColumn | string): DataTableColumn =>
  typeof column === 'string' ? { name: column } : column

/** What a cell shows: a number the Dutch way, text as it is. */
const textOf = (cell: DataTableCell) => {
  if (typeof cell === 'number') {
    return numberFormat.format(cell)
  }

  return typeof cell === 'string' ? cell : cell.text
}

/**
 * The text of a column header: the abbreviation, with the whole word for a screen reader, or
 * the name itself when the column has no abbreviation. In a button (`named`) the abbreviation
 * is part of the name as well, as in `GL gelijk`, so what the visitor reads is in the name and
 * speech control can say "click GL" (WCAG 2.5.3).
 */
export const ColumnText = ({ column, named = false }: { column: DataTableColumn; named?: boolean }) =>
  column.abbreviation === undefined ? (
    column.name
  ) : (
    <abbr title={column.name.charAt(0).toUpperCase() + column.name.slice(1)}>
      <span aria-hidden={named ? undefined : 'true'}>{column.abbreviation}</span>
      {named && ' '}
      <span className="hf-visually-hidden">{column.name}</span>
    </abbr>
  )

/** The rows of the table: a row header, a link when the row has an `href`, and its cells. */
export const TableRows = ({
  columns,
  rows,
}: {
  columns: readonly DataTableColumn[]
  rows: readonly DataTableRow[]
}) => (
  <tbody>
    {rows.map((row) => (
      <tr key={row.header}>
        <th scope="row">{row.href === undefined ? row.header : <Link href={row.href}>{row.header}</Link>}</th>
        {row.cells.map((cell, index) => (
          <td className="hf-numeric" key={columns[index + 1]?.name ?? index}>
            {textOf(cell)}
          </td>
        ))}
      </tr>
    ))}
  </tbody>
)
