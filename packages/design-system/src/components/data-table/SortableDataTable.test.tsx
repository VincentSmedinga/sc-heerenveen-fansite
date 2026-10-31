import { fireEvent, render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { DataTableProps } from './DataTable'

import { DataTable } from './DataTable'

const props: DataTableProps = {
  caption: 'De tegenstanders van sc Heerenveen',
  columns: [
    { name: 'Club', sortable: true },
    { abbreviation: 'G', name: 'gespeeld', sortable: true },
    { abbreviation: 'W', name: 'gewonnen', sortable: true },
    { abbreviation: 'D', name: 'doelpunten' },
  ],
  rows: [
    { cells: [4, 2, { sortValue: 2, text: '7–5' }], header: 'Alkmaar' },
    { cells: [10, 6, { sortValue: 9, text: '30–21' }], header: 'Breda' },
    { cells: [10, 1, { sortValue: -2, text: '4–6' }], header: 'Cambuur' },
    { cells: [2, 2, { sortValue: 2, text: '2–0' }], header: 'Dalen' },
  ],
}

const order = () => screen.getAllByRole('rowheader').map((header) => header.textContent)
const button = (name: string) => screen.getByRole('button', { name })

describe('DataTable with sortable columns', () => {
  it('sends the whole table in the given order, with plain headers and no buttons, without JavaScript', () => {
    const html = renderToStaticMarkup(<DataTable {...props} />)
    const table = new DOMParser().parseFromString(html, 'text/html')

    expect(table.querySelectorAll('button')).toHaveLength(0)
    expect(table.querySelectorAll('[aria-sort]')).toHaveLength(0)
    expect(table.querySelectorAll('[role="status"]')).toHaveLength(0)
    expect([...table.querySelectorAll('thead th')].map((header) => header.textContent)).toEqual([
      'Club',
      'Ggespeeld',
      'Wgewonnen',
      'Ddoelpunten',
    ])
    expect([...table.querySelectorAll('tbody th')].map((header) => header.textContent)).toEqual([
      'Alkmaar',
      'Breda',
      'Cambuur',
      'Dalen',
    ])
    expect(table.querySelectorAll('tbody td')).toHaveLength(12)
  })

  it('names a button with the abbreviation and the word, so what the visitor reads is in the name', () => {
    render(<DataTable {...props} />)

    expect(screen.getByRole('button', { name: 'G gespeeld' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'W gewonnen' })).toBeTruthy()
  })

  it('makes the headers of the sortable columns buttons, and leaves the other headers as text', () => {
    render(<DataTable {...props} />)

    expect(screen.getAllByRole('button').map((item) => item.textContent)).toEqual(['Club', 'G gespeeld', 'W gewonnen'])
    expect(button('G gespeeld').getAttribute('type')).toBe('button')
    expect(within(screen.getByRole('columnheader', { name: 'doelpunten' })).queryByRole('button')).toBeNull()
    expect(order()).toEqual(['Alkmaar', 'Breda', 'Cambuur', 'Dalen'])
  })

  it('has aria-sort none on the sortable headers before a click, and none on the others', () => {
    render(<DataTable {...props} />)

    expect(screen.getAllByRole('columnheader').map((header) => header.getAttribute('aria-sort'))).toEqual([
      'none',
      'none',
      'none',
      null,
    ])
  })

  it('sorts a column of numbers from the biggest down on the first click, and turns round on the second', () => {
    render(<DataTable {...props} />)

    fireEvent.click(button('G gespeeld'))

    expect(order()).toEqual(['Breda', 'Cambuur', 'Alkmaar', 'Dalen'])
    expect(screen.getByRole('columnheader', { name: 'G gespeeld' }).getAttribute('aria-sort')).toBe('descending')

    fireEvent.click(button('G gespeeld'))

    expect(order()).toEqual(['Dalen', 'Alkmaar', 'Breda', 'Cambuur'])
    expect(screen.getByRole('columnheader', { name: 'G gespeeld' }).getAttribute('aria-sort')).toBe('ascending')
  })

  it('sorts the first column from A to Z on the first click, then Z to A', () => {
    render(<DataTable {...props} />)

    fireEvent.click(button('G gespeeld'))
    fireEvent.click(button('Club'))

    expect(order()).toEqual(['Alkmaar', 'Breda', 'Cambuur', 'Dalen'])

    fireEvent.click(button('Club'))

    expect(order()).toEqual(['Dalen', 'Cambuur', 'Breda', 'Alkmaar'])
  })

  it('starts a column at its first direction again after another column, and leaves aria-sort none elsewhere', () => {
    render(<DataTable {...props} />)

    fireEvent.click(button('G gespeeld'))
    fireEvent.click(button('G gespeeld'))
    fireEvent.click(button('W gewonnen'))

    expect(order()).toEqual(['Breda', 'Alkmaar', 'Dalen', 'Cambuur'])
    expect(screen.getAllByRole('columnheader').map((header) => header.getAttribute('aria-sort'))).toEqual([
      'none',
      'none',
      'descending',
      null,
    ])
  })

  it('keeps equal values in the order of the first column', () => {
    render(<DataTable {...props} />)

    fireEvent.click(button('G gespeeld'))

    // Breda and Cambuur both played 10.
    expect(order().slice(0, 2)).toEqual(['Breda', 'Cambuur'])

    fireEvent.click(button('G gespeeld'))

    expect(order().slice(2)).toEqual(['Breda', 'Cambuur'])
  })

  it('sorts on the sort value of a cell, and still shows its text', () => {
    render(
      <DataTable
        {...props}
        columns={['Club', 'Gespeeld', 'Gewonnen', { abbreviation: 'D', name: 'doelpunten', sortable: true }]}
      />,
    )

    fireEvent.click(button('D doelpunten'))

    expect(order()).toEqual(['Breda', 'Alkmaar', 'Dalen', 'Cambuur'])
    expect(screen.getByRole('cell', { name: '30–21' })).toBeTruthy()
  })

  it('shows an arrow in the sorted header only, and a different one for each direction', () => {
    render(<DataTable {...props} />)

    expect(document.querySelectorAll('thead svg')).toHaveLength(0)

    fireEvent.click(button('G gespeeld'))

    const down = within(screen.getByRole('columnheader', { name: 'G gespeeld' })).getByRole('button').innerHTML
    expect(document.querySelectorAll('thead svg')).toHaveLength(1)

    fireEvent.click(button('G gespeeld'))

    expect(within(screen.getByRole('columnheader', { name: 'G gespeeld' })).getByRole('button').innerHTML).not.toBe(
      down,
    )
    expect(document.querySelectorAll('thead svg')).toHaveLength(1)
    expect(document.querySelector('thead svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('says what happened in a polite live region that is there before the click', () => {
    render(<DataTable {...props} />)

    const status = screen.getByRole('status')

    expect(status.textContent).toBe('')
    expect(status.className).toBe('hf-visually-hidden')

    fireEvent.click(button('G gespeeld'))

    expect(screen.getByRole('status')).toBe(status)
    expect(status.textContent).toBe('Gesorteerd op Gespeeld, van hoog naar laag')

    fireEvent.click(button('Club'))

    expect(status.textContent).toBe('Gesorteerd op Club, van A tot Z')
  })

  it('keeps the focus on the button that was pressed', () => {
    render(<DataTable {...props} />)

    const target = button('G gespeeld')

    target.focus()
    fireEvent.click(target)

    expect(document.activeElement).toBe(target)
    expect(button('G gespeeld')).toBe(target)
  })

  it('leaves a table without a sortable column alone: the same table, no buttons, no live region', () => {
    const columns = ['Club', { abbreviation: 'G', name: 'gespeeld' }]
    const rows = [{ cells: [4], header: 'Alkmaar', href: '#alkmaar' }]
    const html = renderToStaticMarkup(<DataTable caption="Een tabel" columns={columns} rows={rows} />)

    expect(html).toBe(
      '<table class="hf-data-table"><caption class="hf-visually-hidden">Een tabel</caption><thead><tr>' +
        '<th scope="col">Club</th><th class="hf-numeric" scope="col"><abbr title="Gespeeld">' +
        '<span aria-hidden="true">G</span><span class="hf-visually-hidden">gespeeld</span></abbr></th></tr></thead>' +
        '<tbody><tr><th scope="row"><a href="#alkmaar">Alkmaar</a></th><td class="hf-numeric">4</td></tr></tbody></table>',
    )

    render(<DataTable caption="Een tabel" columns={columns} rows={rows} />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('passes on a class and other attributes to the table', () => {
    render(<DataTable {...props} className="extra" id="tabel" />)

    expect(screen.getByRole('table').className).toBe('hf-data-table hf-data-table-sortable extra')
    expect(screen.getByRole('table').id).toBe('tabel')
  })
})

describe('data-table.css for a sortable column', () => {
  const css = readFileSync(join(import.meta.dirname, 'data-table.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

  it('makes the button at least 24 by 24 pixels, WCAG 2.5.8', () => {
    const start = css.indexOf('.hf-data-table .hf-data-table-sort {')

    expect(start).not.toBe(-1)
    expect(css.slice(start, css.indexOf('&:hover', start))).toMatch(
      /min-block-size: 1\.5rem[\s\S]*min-inline-size: 1\.5rem/u,
    )
  })
})
