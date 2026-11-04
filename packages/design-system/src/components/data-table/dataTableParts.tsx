import type { ReactNode } from 'react'

import { Fragment } from 'react'

import type {
  DataTableCell,
  DataTableColumn,
  DataTableRow,
  DataTableTextColumn,
  DataTableTextRow,
} from './dataTableTypes'

import { Link } from '../link/Link'

const numberFormat = new Intl.NumberFormat('nl-NL')

/** A column given as a string is a column with that name and nothing else. */
export const columnOf = (column: DataTableColumn | string): DataTableColumn =>
  typeof column === 'string' ? { name: column } : column

/**
 * The index of the column with `key`, or -1 when there is none. A table has at most one key
 * figure, so two is a mistake in the code of the page, and it throws.
 */
export const keyColumnOf = (columns: readonly DataTableColumn[]) => {
  const keys = columns.flatMap((column, index) => (column.key === true ? [index] : []))

  if (keys.length > 1) {
    throw new Error(
      `A table has at most one key column, and these have key: ${keys.map((index) => columns[index]?.name).join(', ')}`,
    )
  }

  return keys[0] ?? -1
}

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
 * is part of the name as well, as in `G gelijk`, so what the visitor reads is in the name and
 * speech control can say "click G gelijk" (WCAG 2.5.3). A column with `shown` has that text
 * for the eye and `name` for a screen reader, in a table whose headers are no buttons.
 */
export const ColumnText = ({ column, named = false }: { column: DataTableColumn; named?: boolean }) =>
  column.shown !== undefined && !named ? (
    <>
      <span aria-hidden="true">{column.shown}</span>
      <span className="hf-visually-hidden">{column.name}</span>
    </>
  ) : column.abbreviation === undefined ? (
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
  keyColumn,
  rows,
  withPosition = true,
}: {
  columns: readonly DataTableColumn[]
  /** The index of the column that is the key figure, in the heaviest weight. -1 is none. */
  keyColumn: number
  rows: readonly DataTableRow[]
  /** Whether a row shows its `position`: not in a table that sorts, which has no `#` header. */
  withPosition?: boolean
}) => (
  <tbody>
    {rows.map((row) => (
      <tr key={row.header}>
        {!withPosition || row.position === undefined ? null : <td className="hf-numeric hf-rank">{row.position}</td>}
        <th scope="row">
          {row.marker}
          {row.href === undefined ? row.header : <Link href={row.href}>{row.header}</Link>}
          {row.note === undefined ? null : <span className="hf-visually-hidden">{`, ${row.note}`}</span>}
        </th>
        {row.cells.map((cell, index) => (
          <td
            className={index + 1 === keyColumn ? 'hf-numeric hf-key' : 'hf-numeric'}
            key={columns[index + 1]?.name ?? index}
          >
            {textOf(cell)}
          </td>
        ))}
      </tr>
    ))}
  </tbody>
)

const textOfNode = (cell: ReactNode) => (typeof cell === 'number' ? numberFormat.format(cell) : cell)

/**
 * The rows of a table with text: the cells start at the start and can hold any content, and the
 * row header can have a second line of secondary text under it. The cells of a column that
 * folds are repeated in a line under the row header, which is only there where the column is
 * gone.
 */
export const TextTableRows = ({
  columns,
  rows,
}: {
  columns: readonly DataTableTextColumn[]
  rows: readonly DataTableTextRow[]
}) => (
  <tbody>
    {rows.map((row) => {
      const folded = row.cells.filter((_cell, index) => columns[index + 1]?.fold === true)

      return (
        <tr key={row.header}>
          <th scope="row">
            {row.href === undefined ? row.header : <Link href={row.href}>{row.header}</Link>}
            {row.secondary === undefined ? null : <span className="hf-data-table-secondary">{row.secondary}</span>}
            {folded.length === 0 ? null : (
              <span className="hf-data-table-secondary hf-data-table-folded">
                {folded.map((cell, index) => (
                  // The cells have no names, so the position is the only key.
                  <Fragment key={index}>
                    {index === 0 ? null : ' · '}
                    {textOfNode(cell)}
                  </Fragment>
                ))}
              </span>
            )}
          </th>
          {row.cells.map((cell, index) => (
            // The cells have no names, so the position is the only key; rows do not reorder.
            <td className={columns[index + 1]?.fold === true ? 'hf-data-table-fold-column' : undefined} key={index}>
              {textOfNode(cell)}
            </td>
          ))}
        </tr>
      )
    })}
  </tbody>
)
