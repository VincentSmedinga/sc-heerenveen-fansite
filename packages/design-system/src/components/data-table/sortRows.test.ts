import { describe, expect, it } from 'vitest'

import type { DataTableRow } from './dataTableTypes'

import { describeSorting, firstDirection, isNumericColumn, sortRows } from './sortRows'

const headers = (rows: readonly DataTableRow[]) => rows.map((row) => row.header)

describe('sortRows', () => {
  it('sorts numbers as numbers, not as text', () => {
    const rows = [
      { cells: [9], header: 'A' },
      { cells: [10], header: 'B' },
      { cells: [100], header: 'C' },
    ]

    expect(headers(sortRows(rows, { column: 1, direction: 'ascending' }))).toEqual(['A', 'B', 'C'])
    expect(headers(sortRows(rows, { column: 1, direction: 'descending' }))).toEqual(['C', 'B', 'A'])
  })

  it('sorts text by the Dutch rules, where a capital and an accent do not count', () => {
    const rows = [
      { cells: ['b'], header: 'Rij 1' },
      { cells: ['É'], header: 'Rij 2' },
      { cells: ['a'], header: 'Rij 3' },
      { cells: ['Z'], header: 'Rij 4' },
      { cells: ['e'], header: 'Rij 5' },
    ]

    expect(headers(sortRows(rows, { column: 1, direction: 'ascending' }))).toEqual([
      'Rij 3',
      'Rij 1',
      'Rij 2',
      'Rij 5',
      'Rij 4',
    ])
  })

  it('sorts the row headers as text when the first column is chosen, and numbers inside them in order', () => {
    const rows = [
      { cells: [1], header: 'ajax' },
      { cells: [2], header: 'Zwolle' },
      { cells: [3], header: 'Étoile' },
      { cells: [4], header: 'Club 10' },
      { cells: [5], header: 'Club 2' },
    ]

    expect(headers(sortRows(rows, { column: 0, direction: 'ascending' }))).toEqual([
      'ajax',
      'Club 2',
      'Club 10',
      'Étoile',
      'Zwolle',
    ])
    expect(headers(sortRows(rows, { column: 0, direction: 'descending' })).at(0)).toBe('Zwolle')
  })

  it('keeps equal values in the order of the first column, A to Z, whichever the direction', () => {
    const rows = [
      { cells: [3], header: 'Cees' },
      { cells: [5], header: 'Bas' },
      { cells: [3], header: 'Anne' },
      { cells: [5], header: 'Dirk' },
    ]

    expect(headers(sortRows(rows, { column: 1, direction: 'descending' }))).toEqual(['Bas', 'Dirk', 'Anne', 'Cees'])
    expect(headers(sortRows(rows, { column: 1, direction: 'ascending' }))).toEqual(['Anne', 'Cees', 'Bas', 'Dirk'])
  })

  it('keeps the given order for rows that are equal in every way', () => {
    const rows = [
      { cells: [1, 'x'], header: 'Gelijk' },
      { cells: [1, 'y'], header: 'gelijk' },
    ]

    expect(sortRows(rows, { column: 1, direction: 'ascending' })).toEqual(rows)
    expect(sortRows(rows, { column: 1, direction: 'descending' })).toEqual(rows)
  })

  it('sorts on the sort value of a cell and not on its text', () => {
    const rows = [
      { cells: [{ sortValue: -3, text: '2–5' }], header: 'A' },
      { cells: [{ sortValue: 9, text: '10–1' }], header: 'B' },
      { cells: [{ sortValue: 0, text: '4–4' }], header: 'C' },
    ]

    expect(headers(sortRows(rows, { column: 1, direction: 'descending' }))).toEqual(['B', 'C', 'A'])
  })

  it('does not change the rows it is given', () => {
    const rows = [
      { cells: [2], header: 'A' },
      { cells: [1], header: 'B' },
    ]

    sortRows(rows, { column: 1, direction: 'ascending' })

    expect(headers(rows)).toEqual(['A', 'B'])
  })

  it('puts numbers before text in a column that holds both', () => {
    const rows = [
      { cells: ['n.v.t.'], header: 'A' },
      { cells: [7], header: 'B' },
    ]

    expect(headers(sortRows(rows, { column: 1, direction: 'ascending' }))).toEqual(['B', 'A'])
  })
})

describe('firstDirection', () => {
  const rows = [{ cells: [1, 'a', { sortValue: 2, text: '2–0' }], header: 'Rij' }]

  it('is descending for a column of numbers, with sort values, and ascending for text and the first column', () => {
    expect(isNumericColumn(rows, 1)).toBe(true)
    expect(firstDirection(rows, 1)).toBe('descending')
    expect(firstDirection(rows, 3)).toBe('descending')
    expect(firstDirection(rows, 2)).toBe('ascending')
    expect(firstDirection(rows, 0)).toBe('ascending')
  })
})

describe('describeSorting', () => {
  it('names the column with a capital and the direction in words that fit it', () => {
    expect(describeSorting('gespeeld', 'descending', true)).toBe('Gesorteerd op Gespeeld, van hoog naar laag')
    expect(describeSorting('gespeeld', 'ascending', true)).toBe('Gesorteerd op Gespeeld, van laag naar hoog')
    expect(describeSorting('Club', 'ascending', false)).toBe('Gesorteerd op Club, van A tot Z')
    expect(describeSorting('Club', 'descending', false)).toBe('Gesorteerd op Club, van Z tot A')
  })
})
