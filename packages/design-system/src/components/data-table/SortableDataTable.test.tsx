import { fireEvent, render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { DataTableProps } from './DataTable'
import type { DataTableRow } from './dataTableTypes'

import { tableColumns } from '../table-columns'
import { DataTable } from './DataTable'

const props: DataTableProps = {
  caption: 'De tegenstanders van sc Heerenveen',
  columns: [
    { name: 'Club', sortable: true },
    { abbreviation: 'G', name: 'gespeeld', sortable: true },
    { abbreviation: 'W', name: 'winst', sortable: true },
    { abbreviation: 'D', name: 'doelpunten', sortable: false },
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
      'Wwinst',
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
    expect(screen.getByRole('button', { name: 'W winst' })).toBeTruthy()
  })

  it('names the button of a column with an icon by the whole word, and hides the icon from assistive technology', () => {
    render(
      <DataTable
        caption="De tegenstanders van sc Heerenveen"
        columns={['Club', tableColumns.played, tableColumns.won]}
        rows={[
          { cells: [4, 2], header: 'Alkmaar' },
          { cells: [10, 6], header: 'Breda' },
        ]}
      />,
    )

    expect(button('gespeeld').querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(button('gespeeld').textContent).toBe('gespeeld')
    expect(button('winst')).toBeTruthy()

    fireEvent.click(button('gespeeld'))

    expect(screen.getByRole('columnheader', { name: 'gespeeld' }).getAttribute('aria-sort')).toBe('descending')
    expect(order()).toEqual(['Breda', 'Alkmaar'])
  })

  it('names two columns with the same letter differently, so a visitor can tell the buttons apart', () => {
    render(
      <DataTable
        caption="De tegenstanders van sc Heerenveen"
        columns={[
          'Club',
          { abbreviation: 'G', name: 'gespeeld', sortable: true },
          { abbreviation: 'G', name: 'gelijk', sortable: true },
        ]}
        rows={[
          { cells: [4, 1], header: 'Alkmaar' },
          { cells: [5, 2], header: 'Breda' },
        ]}
      />,
    )

    expect(screen.getAllByRole('button').map((item) => item.textContent)).toEqual(['Club', 'G gespeeld', 'G gelijk'])
    expect(button('G gespeeld')).not.toBe(button('G gelijk'))
  })

  it('makes the headers of the sortable columns buttons, and leaves the other headers as text', () => {
    render(<DataTable {...props} />)

    expect(screen.getAllByRole('button').map((item) => item.textContent)).toEqual(['Club', 'G gespeeld', 'W winst'])
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
    fireEvent.click(button('W winst'))

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

  it('puts the arrow before the header in a number column and after it in the first column', () => {
    render(<DataTable {...props} />)

    fireEvent.click(button('G gespeeld'))

    expect(button('G gespeeld').firstElementChild?.tagName.toLowerCase()).toBe('svg')

    fireEvent.click(button('Club'))

    expect(button('Club').lastElementChild?.tagName.toLowerCase()).toBe('svg')
    expect(button('G gespeeld').querySelector('svg')).toBeNull()
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

  it('leaves a table with sortable={false} alone: the same table, no buttons, no live region', () => {
    const columns = ['Club', { abbreviation: 'G', name: 'gespeeld' }]
    const rows = [
      { cells: [4], header: 'Alkmaar', href: '#alkmaar' },
      { cells: [5], header: 'Breda' },
    ]
    const html = renderToStaticMarkup(<DataTable caption="Een tabel" columns={columns} rows={rows} sortable={false} />)

    expect(html).toBe(
      '<table class="hf-data-table"><caption class="hf-visually-hidden">Een tabel</caption><thead><tr>' +
        '<th scope="col">Club</th><th class="hf-numeric" scope="col"><abbr title="Gespeeld">' +
        '<span aria-hidden="true">G</span><span class="hf-visually-hidden">gespeeld</span></abbr></th></tr></thead>' +
        '<tbody><tr><th scope="row"><a href="#alkmaar">Alkmaar</a></th><td class="hf-numeric">4</td></tr>' +
        '<tr><th scope="row">Breda</th><td class="hf-numeric">5</td></tr></tbody></table>',
    )

    render(<DataTable caption="Een tabel" columns={columns} rows={rows} sortable={false} />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('passes on a class and other attributes to the table', () => {
    render(<DataTable {...props} className="extra" id="tabel" />)

    expect(screen.getByRole('table').className).toBe('hf-data-table hf-data-table-sortable extra')
    expect(screen.getByRole('table').id).toBe('tabel')
  })
})

describe('the key figure of a table that sorts', () => {
  const withKey: DataTableProps = {
    ...props,
    columns: [
      { name: 'Club', sortable: true },
      { abbreviation: 'G', name: 'gespeeld', sortable: true },
      { abbreviation: 'W', key: true, name: 'winst', sortable: true },
      { abbreviation: 'D', name: 'doelpunten' },
    ],
  }

  // The header names of the columns whose cells have the weight of the key figure.
  const keyColumns = () => {
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent?.replaceAll(' ', ''))

    return [...document.querySelectorAll('tbody tr:first-child td')].flatMap((cell, index) =>
      cell.classList.contains('hf-key') ? [headers[index + 1]] : [],
    )
  }

  it('is the column with key before anything is sorted, and also without JavaScript', () => {
    const html = renderToStaticMarkup(<DataTable {...withKey} />)
    const table = new DOMParser().parseFromString(html, 'text/html')

    expect([...table.querySelectorAll('td.hf-key')].map((cell) => cell.textContent)).toEqual(['2', '6', '1', '2'])

    render(<DataTable {...withKey} />)

    expect(keyColumns()).toEqual(['Wwinst'])
  })

  it('follows the sorting: the column that is sorted on is the key figure and no other column is', () => {
    render(<DataTable {...withKey} />)
    fireEvent.click(button('G gespeeld'))

    expect(keyColumns()).toEqual(['Ggespeeld'])
    expect(document.querySelectorAll('td.hf-key')).toHaveLength(4)

    fireEvent.click(button('G gespeeld'))

    expect(keyColumns()).toEqual(['Ggespeeld'])

    fireEvent.click(button('W winst'))

    expect(keyColumns()).toEqual(['Wwinst'])
  })

  it('has no key figure when the table is sorted on its first column, whose row headers are semibold already', () => {
    render(<DataTable {...withKey} />)
    fireEvent.click(button('Club'))

    expect(document.querySelectorAll('td.hf-key')).toHaveLength(0)
  })

  it('has a key figure only once the visitor has sorted, in a table with no key column', () => {
    render(<DataTable {...props} />)

    expect(document.querySelectorAll('td.hf-key')).toHaveLength(0)

    fireEvent.click(button('G gespeeld'))

    expect(keyColumns()).toEqual(['Ggespeeld'])
  })

  it('still says what it is sorted on without the weight, with aria-sort and the arrow', () => {
    render(<DataTable {...withKey} />)
    fireEvent.click(button('G gespeeld'))

    expect(screen.getByRole('columnheader', { name: /gespeeld/u }).getAttribute('aria-sort')).toBe('descending')
    expect(screen.getByRole('status').textContent).toContain('Gespeeld')
  })

  it('throws when two columns have key', () => {
    const twice: DataTableProps = {
      ...props,
      columns: [
        { name: 'Club', sortable: true },
        { key: true, name: 'gespeeld', sortable: true },
        { key: true, name: 'winst', sortable: true },
      ],
    }

    expect(() => renderToStaticMarkup(<DataTable {...twice} />)).toThrow(/at most one key column.*gespeeld, winst/u)
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

  it('ends the header of a number column where its numbers end, so no gap stands before it', () => {
    const start = css.indexOf('.hf-data-table .hf-numeric .hf-data-table-sort {')

    expect(start).not.toBe(-1)
    expect(css.slice(start, css.indexOf('}', start))).toMatch(/justify-content: flex-end/u)
  })

  it('keeps a score on one line in a table that sorts', () => {
    const start = css.indexOf('.hf-data-table-sortable td.hf-numeric {')

    expect(start).not.toBe(-1)
    expect(css.slice(start, css.indexOf('}', start))).toMatch(/white-space: nowrap/u)
  })

  it('throws when a table with a position, a total row or a gap row is left to sort', () => {
    const throws = (row: DataTableRow) =>
      expect(() => renderToStaticMarkup(<DataTable {...props} rows={[...props.rows, row]} />)).toThrow(/cannot sort/u)

    throws({ cells: [1, 1, 1], header: 'Eva', position: 9 })
    throws({ cells: [1, 1, 1], header: 'Totaal', total: true })
    throws({ cells: [], gap: true, header: 'niet bij ons' })
  })

  it('does not throw for such a table that says it does not sort, and has no buttons then', () => {
    render(
      <DataTable
        {...props}
        rows={props.rows.map((row, index) => ({ ...row, position: index + 1 }))}
        sortable={false}
      />,
    )

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getAllByRole('columnheader')).toHaveLength(5)
  })

  it('throws for a table in a group that is left to sort', () => {
    expect(() =>
      renderToStaticMarkup(
        <DataTable.Group>
          <DataTable {...props} />
        </DataTable.Group>,
      ),
    ).toThrow(/DataTable.Group/u)
  })
})

describe('the three clicks on a header', () => {
  it('sort, turn round and give the order of the page back, with no arrow and aria-sort none everywhere', () => {
    render(<DataTable {...props} />)

    fireEvent.click(button('G gespeeld'))
    fireEvent.click(button('G gespeeld'))
    expect(order()).toEqual(['Dalen', 'Alkmaar', 'Breda', 'Cambuur'])
    fireEvent.click(button('G gespeeld'))

    expect(order()).toEqual(['Alkmaar', 'Breda', 'Cambuur', 'Dalen'])
    expect(screen.getAllByRole('columnheader').map((header) => header.getAttribute('aria-sort'))).toEqual([
      'none',
      'none',
      'none',
      null,
    ])
    expect(document.querySelector('.hf-icon')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Niet meer gesorteerd, in de volgorde van de pagina')
  })

  it('start again with the first direction after the third click', () => {
    render(<DataTable {...props} />)

    fireEvent.click(button('Club'))
    fireEvent.click(button('Club'))
    fireEvent.click(button('Club'))
    fireEvent.click(button('Club'))

    expect(screen.getByRole('columnheader', { name: 'Club' }).getAttribute('aria-sort')).toBe('ascending')
  })
})

describe('a table with text that sorts', () => {
  const textProps: DataTableProps = {
    appearance: 'text',
    caption: 'Wedstrijden',
    columns: ['Wedstrijd', 'Datum', { name: 'Verslag', sortable: false }, 'Bezoekers'],
    rows: [
      {
        cells: [{ content: '8 mei 2021', sortValue: '2021-05-08' }, <a href="#a">Lees</a>, 'veel'],
        header: 'Ajax',
        sortHeader: 'Ajax',
      },
      { cells: [{ content: '3 mei 2020', sortValue: '2020-05-03' }, <a href="#b">Lees</a>, ''], header: 'van Basten' },
      {
        cells: [{ content: '1 mei 2022', sortValue: '2022-05-01' }, <a href="#c">Lees</a>, 'weinig'],
        header: 'Cambuur',
      },
      { cells: [{ content: '9 mei 2019', sortValue: '2019-05-09' }, <a href="#d">Lees</a>, 'Éen'], header: 'de Jong' },
    ],
  }

  it('makes the headers of the columns with a value buttons, and leaves the others', () => {
    render(<DataTable {...textProps} />)

    expect(screen.getAllByRole('button').map((item) => item.textContent)).toEqual(['Wedstrijd', 'Datum', 'Bezoekers'])
    expect(within(screen.getByRole('columnheader', { name: 'Verslag' })).queryByRole('button')).toBeNull()
  })

  it('sorts on the sort value of a cell and shows its content', () => {
    render(<DataTable {...textProps} />)

    fireEvent.click(button('Datum'))

    expect(order()).toEqual(['de Jong', 'van Basten', 'Ajax', 'Cambuur'])
    expect(screen.getByText('3 mei 2020')).toBeTruthy()
  })

  it('puts an empty cell last, whichever the direction, and sorts text by the Dutch rules', () => {
    render(<DataTable {...textProps} />)

    fireEvent.click(button('Bezoekers'))
    expect(order()).toEqual(['de Jong', 'Ajax', 'Cambuur', 'van Basten'])

    fireEvent.click(button('Bezoekers'))
    expect(order()).toEqual(['Cambuur', 'Ajax', 'de Jong', 'van Basten'])
  })

  it('sorts a row header on its sortHeader and keeps the header as it is', () => {
    const rows = textProps.rows.map((row) =>
      row.header === 'van Basten' ? { ...row, sortHeader: 'Basten, van' } : row,
    )

    render(<DataTable {...textProps} rows={rows} />)

    fireEvent.click(button('Wedstrijd'))

    expect(order()).toEqual(['Ajax', 'van Basten', 'Cambuur', 'de Jong'])
  })

  it('has no button on a column with a link and no sort value, and sends plain markup without script', () => {
    const html = renderToStaticMarkup(<DataTable {...textProps} />)

    expect(html).not.toContain('<button')
    expect(html).not.toContain('aria-sort')
    expect(html).toContain('hf-data-table hf-data-table-text')
  })

  it('does not sort at all with sortable={false}', () => {
    render(<DataTable {...textProps} sortable={false} />)

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('keeps equal values in the order of the page', () => {
    const rows = ['Ajax', 'Breda', 'Cambuur'].map((header, index) => ({ cells: [index < 2 ? 'zelfde' : 'a'], header }))

    render(<DataTable appearance="text" caption="Gelijk" columns={['Naam', 'Waarde']} rows={rows} />)
    fireEvent.click(button('Waarde'))
    fireEvent.click(button('Waarde'))

    expect(order()).toEqual(['Ajax', 'Breda', 'Cambuur'])
  })
})

describe('the columns of a table that sort by default', () => {
  it('leaves a column with a hidden header or a shown header alone, unless it asks for sorting', () => {
    render(
      <DataTable
        caption="Hoeveel"
        columns={['Naam', { hidden: true, name: 'keer' }, { name: 'winst, 12 keer', shown: 'Winst 12×' }]}
        rows={[
          { cells: [1, 2], header: 'A' },
          { cells: [3, 4], header: 'B' },
        ]}
      />,
    )

    expect(screen.getAllByRole('button').map((item) => item.textContent)).toEqual(['Naam'])
  })

  it('does not sort a table of one row', () => {
    render(<DataTable caption="Een rij" columns={['Naam', 'Aantal']} rows={[{ cells: [1], header: 'A' }]} />)

    expect(screen.queryByRole('button')).toBeNull()
  })
})
