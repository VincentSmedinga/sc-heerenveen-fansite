import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataTable } from './DataTable'

const props = {
  caption: 'Bezoekers per dag, de laatste twee dagen',
  columns: ['Dag', 'Unieke bezoekers', 'Paginaweergaven'],
  rows: [
    { cells: [1234, 5678], header: 'ma 26 okt 2026' },
    { cells: [0, 12], header: 'zo 25 okt 2026' },
  ],
}

describe('DataTable', () => {
  it('is a real table with a caption that names it, for a screen reader only', () => {
    render(<DataTable {...props} />)

    expect(screen.getByRole('table', { name: props.caption })).toBeTruthy()
    expect(document.querySelector('caption')?.className).toBe('hf-visually-hidden')
  })

  it('has a column header with scope for every column and a row header with scope for every row', () => {
    render(<DataTable {...props} />)

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(props.columns)
    expect(document.querySelectorAll('thead th[scope="col"]')).toHaveLength(3)
    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual([
      'ma 26 okt 2026',
      'zo 25 okt 2026',
    ])
    expect(document.querySelectorAll('tbody th[scope="row"]')).toHaveLength(2)
  })

  it('writes a number the Dutch way and aligns the numbers to the end, but not the first column', () => {
    render(<DataTable {...props} />)

    const [first, second] = screen.getAllByRole('row').slice(1)

    expect(
      within(first as HTMLElement)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['1.234', '5.678'])
    expect(
      within(second as HTMLElement)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['0', '12'])
    expect(document.querySelector('thead th:first-child')?.className).toBe('')
    expect(document.querySelectorAll('.hf-numeric')).toHaveLength(2 + 4)
  })

  it('shows text in a cell as it is', () => {
    render(<DataTable {...props} rows={[{ cells: ['n.v.t.', 3], header: 'Een rij' }]} />)

    expect(screen.getByRole('cell', { name: 'n.v.t.' })).toBeTruthy()
  })

  it('has the hf-data-table class and passes on other attributes and a class', () => {
    render(<DataTable {...props} className="extra" id="tabel" />)

    expect(screen.getByRole('table').className).toBe('hf-data-table extra')
    expect(screen.getByRole('table').id).toBe('tabel')
  })
})
