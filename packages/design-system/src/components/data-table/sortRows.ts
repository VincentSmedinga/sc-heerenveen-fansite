import { isValidElement } from 'react'

import type { DataTableSortValue } from './dataTableTypes'

/** What sorting needs of a row, with numbers or text: the row header and the cells. */
export type SortableRow = { cells: readonly unknown[]; header: string; sortHeader?: string }

export type SortDirection = 'ascending' | 'descending'

/** What a column is sorted on: the column (0 is the row header) and the direction. */
export type Sorting = { column: number; direction: SortDirection }

const collator = new Intl.Collator('nl', { numeric: true, sensitivity: 'base' })

/**
 * The value a cell sorts on: its `sortValue`, or the number or text it is. `null` is an empty
 * cell (nothing, or `sortValue: null` for a sign such as `?`), and `undefined` is a cell that
 * has no value to sort on, such as a link without a `sortValue`.
 */
export const sortValueOf = (cell: unknown): DataTableSortValue | undefined => {
  if (cell === null || cell === undefined || typeof cell === 'boolean') {
    return null
  }

  if (typeof cell === 'number') {
    return Number.isNaN(cell) ? null : cell
  }

  if (typeof cell === 'string') {
    return cell.trim() === '' ? null : cell
  }

  if (typeof cell === 'object' && !isValidElement(cell) && 'sortValue' in cell) {
    const value = (cell as { sortValue: DataTableSortValue }).sortValue

    return typeof value === 'string' && value.trim() === '' ? null : value
  }

  return undefined
}

const valueIn = (row: SortableRow, column: number): DataTableSortValue | undefined =>
  column === 0 ? (row.sortHeader ?? row.header) : sortValueOf(row.cells[column - 1])

/**
 * Whether a table can sort on a column: every cell has a value to sort on, or is empty. The
 * row headers always have one. A table with fewer than two rows has nothing to put in order.
 */
export const isSortableColumn = (rows: readonly SortableRow[], column: number) =>
  rows.length > 1 && rows.every((row) => valueIn(row, column) !== undefined)

/**
 * Whether a column holds numbers only, apart from empty cells. The row headers and a column
 * with any text are sorted as text, from A to Z. A column with nothing in it counts as text.
 */
export const isNumericColumn = (rows: readonly SortableRow[], column: number) => {
  const values = rows.map((row) => valueIn(row, column)).filter((value) => value !== null)

  return column > 0 && values.length > 0 && values.every((value) => typeof value === 'number')
}

/** The direction a first click on the column sorts in: the biggest number first, or A to Z. */
export const firstDirection = (rows: readonly SortableRow[], column: number): SortDirection =>
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
 * The line a screen reader hears after a click, such as `Gesorteerd op Gespeeld, van hoog naar
 * laag`: the name of the column with a capital, and the direction in words that fit the column.
 * Without a sorting, which is the third click, it says the table is back in the order of the
 * page.
 */
export function describeSorting(name: string, direction: SortDirection | undefined, numeric: boolean) {
  if (direction === undefined) {
    return 'Niet meer gesorteerd, in de volgorde van de pagina'
  }

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
 * a capital and an accent do not count and a number in a name counts by its value. An empty
 * cell stands last, whichever way the column is sorted. Rows with equal values keep the order
 * they were given in, or with `byHeader` stand in the order of the row headers, A to Z,
 * whatever the direction. It does not change `rows`.
 */
export function sortRows<Row extends SortableRow>(
  rows: readonly Row[],
  { column, direction }: Sorting,
  { byHeader = false }: { byHeader?: boolean } = {},
): Row[] {
  const sign = direction === 'ascending' ? 1 : -1

  return rows
    .map((row, index) => ({ index, row, value: valueIn(row, column) ?? null }))
    .sort((left, right) => {
      if (left.value === null || right.value === null) {
        return left.value === right.value ? left.index - right.index : left.value === null ? 1 : -1
      }

      return (
        sign * compareValues(left.value, right.value) ||
        (byHeader
          ? collator.compare(left.row.sortHeader ?? left.row.header, right.row.sortHeader ?? right.row.header)
          : 0) ||
        left.index - right.index
      )
    })
    .map(({ row }) => row)
}
