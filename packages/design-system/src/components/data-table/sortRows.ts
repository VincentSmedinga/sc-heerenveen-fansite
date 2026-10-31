import type { DataTableCell, DataTableRow } from './dataTableTypes'

export type SortDirection = 'ascending' | 'descending'

/** What a column is sorted on: the column (0 is the row header) and the direction. */
export type Sorting = { column: number; direction: SortDirection }

const collator = new Intl.Collator('nl', { numeric: true, sensitivity: 'base' })

/** The value a cell sorts on: its `sortValue`, or the cell itself. */
export const sortValueOf = (cell: DataTableCell): number | string => (typeof cell === 'object' ? cell.sortValue : cell)

const valueIn = (row: DataTableRow, column: number): number | string => {
  const cell = row.cells[column - 1]

  return column === 0 || cell === undefined ? row.header : sortValueOf(cell)
}

/**
 * Whether a column holds numbers only. The row headers and a column with any text are sorted as
 * text, from A to Z. A column without rows has nothing to sort, so it counts as text.
 */
export const isNumericColumn = (rows: readonly DataTableRow[], column: number) =>
  column > 0 && rows.length > 0 && rows.every((row) => typeof valueIn(row, column) === 'number')

/** The direction a first click on the column sorts in: the biggest number first, or A to Z. */
export const firstDirection = (rows: readonly DataTableRow[], column: number): SortDirection =>
  isNumericColumn(rows, column) ? 'descending' : 'ascending'

const compareValues = (left: number | string, right: number | string) => {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }

  if (typeof left === 'string' && typeof right === 'string') {
    return collator.compare(left, right)
  }

  // A column should hold one kind of value. When it does not, the numbers come before the text.
  return typeof left === 'number' ? -1 : 1
}

/**
 * The line a screen reader hears after a sort, such as `Gesorteerd op Gespeeld, van hoog naar
 * laag`: the name of the column with a capital, and the direction in words that fit the column.
 */
export function describeSorting(name: string, direction: SortDirection, numeric: boolean) {
  const way = numeric
    ? direction === 'ascending'
      ? 'van laag naar hoog'
      : 'van hoog naar laag'
    : direction === 'ascending'
      ? 'van A tot Z'
      : 'van Z tot A'

  return `Gesorteerd op ${name.charAt(0).toUpperCase()}${name.slice(1)}, ${way}`
}

/**
 * The rows sorted on a column. Numbers are sorted as numbers and text by the Dutch rules, where
 * a capital and an accent do not count. Rows with equal values stay in the order of the row
 * headers, A to Z, whatever the direction, and rows that are equal in that too keep the order
 * they were given in. It does not change `rows`.
 */
export function sortRows(rows: readonly DataTableRow[], { column, direction }: Sorting): DataTableRow[] {
  const sign = direction === 'ascending' ? 1 : -1

  return rows
    .map((row, index) => ({ index, row, value: valueIn(row, column) }))
    .sort(
      (left, right) =>
        sign * compareValues(left.value, right.value) ||
        collator.compare(left.row.header, right.row.header) ||
        left.index - right.index,
    )
    .map(({ row }) => row)
}
