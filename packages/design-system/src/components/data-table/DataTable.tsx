import { Children, type ComponentPropsWithoutRef, isValidElement } from 'react'

import type { DataTableColumn, DataTableRow, DataTableTextColumn, DataTableTextRow } from './dataTableTypes'

import { classNames } from '../classNames'
import {
  columnOf,
  ColumnText,
  keyColumnOf,
  needsFoldContainer,
  sortableColumnsOf,
  TableRows,
  textColumnClass,
  TextColumnText,
  TextTableRows,
} from './dataTableParts'
import { MoreColumns } from './MoreColumns'
import { SortableDataTable } from './SortableDataTable'

export type {
  DataTableCell,
  DataTableColumn,
  DataTableRow,
  DataTableSortValue,
  DataTableTextColumn,
  DataTableTextRow,
  DataTableTextValueCell,
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
      /** The rows of the table, from the first down. */
      rows: readonly DataTableTextRow[]
    })
  | (DataTableBaseProps & {
      /** `numbers` is the table of numbers, which is the default. */
      appearance?: 'numbers'
      /**
       * The column headers, in order. The first column holds the row headers (a day, a path),
       * and the others hold numbers, aligned to the end. Keep a header short: it only wraps at
       * a space, so a long word makes the table wider than a phone. A table with many columns,
       * which does not fit a phone with whole words, gives a column from `tableColumns`: the
       * header shows its icon, and the page explains it in a legend under the table
       * (`tableLegend`). A column that is not in `tableColumns` can give an `abbreviation`.
       * A column given as `{ name, sortable: false }` has no sorting, such as one with only a
       * link.
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
  /**
   * Whether the visitor can sort the table on its columns, which is the default for a list of
   * things that can be compared. Give `false`, with the reason in a comment, for a table that
   * is in its order for a reason: a ranking, a short series in its own order, one half of a
   * list in two tables. A table with a `position`, a `total` row or a `gap` row, and a table
   * in a `DataTable.Group`, cannot sort and throws when it is not `false`.
   */
  sortable?: boolean
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
 * A table lets the visitor sort on a column, which needs JavaScript: the server sends the whole
 * table in the order of `rows`, with plain headers, and in the browser the headers of the
 * columns that can sort become buttons (see SortableDataTable). A click sorts, a second click
 * turns round and a third gives the order of `rows` back. A table that cannot sort, or has
 * `sortable={false}`, is the same plain table as ever and sends no script.
 */
export const DataTable = ({
  appearance = 'numbers',
  caption,
  className,
  columns,
  rows,
  sortable = true,
  ...props
}: DataTableProps) => {
  if (sortable) {
    const clash = (rows as readonly DataTableRow[]).some(
      (row) => row.position !== undefined || row.total === true || row.gap === true,
    )

    if (clash) {
      throw new Error(
        `A table with a position, a total row or a gap row cannot sort, so give it sortable={false}: ${caption}`,
      )
    }
  }

  // The union of the props is lost by taking them apart, so the two kinds are told apart here.
  if (appearance === 'text') {
    const textColumns = (columns as readonly (DataTableTextColumn | string)[]).map((column) =>
      typeof column === 'string' ? { name: column } : column,
    )
    const textRows = rows as readonly DataTableTextRow[]
    const sortableColumns = sortable ? sortableColumnsOf(textColumns, textRows) : []

    if (sortableColumns.includes(true)) {
      return (
        <SortableDataTable
          {...props}
          appearance="text"
          caption={caption}
          className={className}
          columns={textColumns}
          rows={textRows}
          sortableColumns={sortableColumns}
        />
      )
    }

    const table = (
      <table {...props} className={classNames('hf-data-table', 'hf-data-table-text', className)}>
        <caption className="hf-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {textColumns.map((column) => (
              <th className={textColumnClass(column)} key={column.name} scope="col">
                <TextColumnText column={column} />
              </th>
            ))}
          </tr>
        </thead>
        <TextTableRows columns={textColumns} rows={textRows} />
      </table>
    )

    // The room of the table itself decides when a column folds, or a header is short, so it
    // needs a container.
    return needsFoldContainer(textColumns) ? <div className="hf-data-table-fold">{table}</div> : table
  }

  const all = (columns as readonly (DataTableColumn | string)[]).map(columnOf)
  const numberRows = rows as readonly DataTableRow[]

  const keyColumn = keyColumnOf(all)

  const sortableColumns = sortable ? sortableColumnsOf(all, numberRows) : []

  if (sortableColumns.includes(true)) {
    return (
      <SortableDataTable
        {...props}
        appearance="numbers"
        caption={caption}
        className={className}
        columns={all}
        rows={numberRows}
        sortableColumns={sortableColumns}
      />
    )
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
            <th
              className={index === 0 ? undefined : classNames('hf-numeric', column.more === true && 'hf-more-column')}
              key={column.name}
              scope="col"
            >
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
 * as the wins, the draws and the losses of a season. Its tables do not sort. Each table is as
 * wide as its content needs, and the cells have less space round them than in a table of its
 * own, so three small tables fit a phone. It only works round DataTable elements, so it is
 * written as DataTable.Group.
 */
const Group = ({ children, className, ...props }: ComponentPropsWithoutRef<'div'>) => {
  // Sorting each half of a list that is in two tables is wrong, so a table in a group says it
  // does not sort.
  Children.forEach(children, (child) => {
    if (isValidElement<{ sortable?: boolean }>(child) && child.type === DataTable && child.props.sortable !== false) {
      throw new Error('A DataTable in a DataTable.Group cannot sort, so give it sortable={false}')
    }
  })

  return (
    <div {...props} className={classNames('hf-data-table-group', className)}>
      {children}
    </div>
  )
}

// The name in React's developer tools and in the code examples in Storybook.
Group.displayName = 'DataTable.Group'

DataTable.Group = Group

DataTable.More = MoreColumns

/**
 * A short sign in a cell that is a link, such as `2` or `?` for what a match still misses: on a
 * light fill, and at least as large as a target must be (WCAG 2.5.8). The sign alone says
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
