import type { ComponentPropsWithoutRef } from 'react'

import type { DataTableColumn, DataTableRow, DataTableTextColumn, DataTableTextRow } from './dataTableTypes'

import { classNames } from '../classNames'
import { columnOf, ColumnText, keyColumnOf, TableRows, TextTableRows } from './dataTableParts'
import { SortableDataTable } from './SortableDataTable'

export type {
  DataTableCell,
  DataTableColumn,
  DataTableRow,
  DataTableTextColumn,
  DataTableTextRow,
} from './dataTableTypes'

export type DataTableProps =
  | (DataTableBaseProps & {
      /**
       * `text` is a table with text in it, such as a list of matches: the columns start at the
       * start, a row header can have a second line, and a cell can hold any content.
       */
      appearance: 'text'
      /**
       * The column headers, in order, as plain text. The first holds the row headers. A column
       * given as `{ fold: true, name }` folds under the name of the row where the table is too
       * narrow for it, such as the date of a match on a phone.
       */
      columns: readonly (DataTableTextColumn | string)[]
      /** The rows of the table, from the first down. They can't be sorted. */
      rows: readonly DataTableTextRow[]
    })
  | (DataTableBaseProps & {
      /** `numbers` is the table of numbers, which is the default. */
      appearance?: 'numbers'
      /**
       * The column headers, in order. The first column holds the row headers (a day, a path),
       * and the others hold numbers, aligned to the end. Keep a header short: it only wraps at
       * a space, so a long word makes the table wider than a phone. A table with many columns,
       * which does not fit a phone with whole words, gives a column as
       * `{ abbreviation, name }`: the header shows the abbreviation, and the page explains it
       * in a line under the table.
       * A column given as `{ name, sortable: true }` lets the visitor sort the table on it.
       */
      columns: readonly (DataTableColumn | string)[]
      /** The rows of the table, from the first down. */
      rows: readonly DataTableRow[]
    })

/** What a table of numbers and a table with text have in common. */
type DataTableBaseProps = Omit<ComponentPropsWithoutRef<'table'>, 'children'> & {
  /**
   * The text of the table's caption, which names the table and says what it holds, such as
   * `Bezoekers per dag, de laatste 30 dagen`. Only a screen reader gets it: the caption is not
   * shown, so put a heading above the table that says the same to bezienden.
   */
  caption: string
  /** A data table has no children: everything it shows comes from the props below. */
  children?: never
}

/**
 * A table of numbers: a real `table` with a caption that is not shown, column headers and row
 * headers with `scope`, and the numbers aligned to the end with tabular figures. It is a list
 * of things that each have a few numbers, such as the days of a month, not a table with merged
 * cells or cells with more than text. A row can have a link in its header (`href`). A long row
 * header, such as a path, wraps instead of making the table wider than the space.
 * base/table.css gives it its look.
 *
 * A row can have a `position`, its place in a ranking: the table then has a column `#` before
 * the row headers. That is for a table in the order of the ranking, so not a sortable one.
 *
 * A column can be the `key` figure, in the heaviest weight: the figure the table is ordered by
 * or the answer it gives. Bold means nothing else in a table, and there is at most one.
 *
 * A column can be `sortable`. The table then lets the visitor sort on it, which needs
 * JavaScript: the server sends the whole table in the order of `rows`, with plain headers, and
 * in the browser the headers of the sortable columns become buttons (see SortableDataTable). A
 * table without a sortable column is the same plain table as ever and sends no script.
 */
export const DataTable = ({ appearance = 'numbers', caption, className, columns, rows, ...props }: DataTableProps) => {
  // The union of the props is lost by taking them apart, so the two kinds are told apart here.
  if (appearance === 'text') {
    const textColumns = (columns as readonly (DataTableTextColumn | string)[]).map((column) =>
      typeof column === 'string' ? { name: column } : column,
    )
    const table = (
      <table {...props} className={classNames('hf-data-table', 'hf-data-table-text', className)}>
        <caption className="hf-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {textColumns.map((column) => (
              <th
                className={classNames(
                  column.fold === true && 'hf-data-table-fold-column',
                  column.bar === true && 'hf-numeric',
                  column.mark === true && 'hf-data-table-mark-column',
                )}
                key={column.name}
                scope="col"
              >
                {column.abbreviation === undefined ? (
                  column.name
                ) : (
                  <abbr title={column.name}>
                    <span aria-hidden="true" className="hf-data-table-short">
                      {column.abbreviation}
                    </span>
                    <span className="hf-data-table-long">{column.name}</span>
                  </abbr>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <TextTableRows columns={textColumns} rows={rows as readonly DataTableTextRow[]} />
      </table>
    )

    // The room of the table itself decides when a column folds, or a header is short, so it
    // needs a container.
    return textColumns.some((column) => column.fold === true || column.abbreviation !== undefined) ? (
      <div className="hf-data-table-fold">{table}</div>
    ) : (
      table
    )
  }

  const all = (columns as readonly (DataTableColumn | string)[]).map(columnOf)
  const numberRows = rows as readonly DataTableRow[]

  const keyColumn = keyColumnOf(all)

  if (all.some((column) => column.sortable === true)) {
    return <SortableDataTable {...props} caption={caption} className={className} columns={all} rows={numberRows} />
  }

  return (
    <table {...props} className={classNames('hf-data-table', className)}>
      <caption className="hf-visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {numberRows.some((row) => row.position !== undefined) && (
            <th className="hf-numeric" scope="col">
              <abbr title="Plaats">
                <span aria-hidden="true">#</span>
                <span className="hf-visually-hidden">plaats</span>
              </abbr>
            </th>
          )}
          {all.map((column, index) => (
            <th className={index === 0 ? undefined : 'hf-numeric'} key={column.name} scope="col">
              {column.hidden === true ? (
                <span className="hf-visually-hidden">
                  <ColumnText column={column} />
                </span>
              ) : (
                <ColumnText column={column} />
              )}
            </th>
          ))}
        </tr>
      </thead>
      <TableRows columns={all} keyColumn={keyColumn} rows={numberRows} />
    </table>
  )
}

/**
 * Tables next to each other where there is room, and under each other where there is not, such
 * as the wins, the draws and the losses of a season. Each table is as wide as its content
 * needs, and the cells have less space round them than in a table of its own, so three small
 * tables fit a phone. It only works round DataTable elements, so it is written as
 * DataTable.Group.
 */
const Group = ({ className, ...props }: ComponentPropsWithoutRef<'div'>) => (
  <div {...props} className={classNames('hf-data-table-group', className)} />
)

// The name in React's developer tools and in the code examples in Storybook.
Group.displayName = 'DataTable.Group'

DataTable.Group = Group

/**
 * A short sign in a cell that is a link, such as `2` or `?` for what a match still misses: bold
 * on a light fill, and at least as large as a target must be (WCAG 2.5.8). The sign alone says
 * little, so `description` says the rest to a screen reader, after the sign: "2" with
 * "doelpunten zonder speler bij Ajax, 14 augustus" is the name of the link. Put it in a column
 * with `mark`.
 */
const Mark = ({
  children,
  className,
  description,
  ...props
}: ComponentPropsWithoutRef<'a'> & { children: string; description: string; href: string }) => (
  <a {...props} className={classNames('hf-data-table-mark', className)}>
    {children} <span className="hf-visually-hidden">{description}</span>
  </a>
)

Mark.displayName = 'DataTable.Mark'

DataTable.Mark = Mark
