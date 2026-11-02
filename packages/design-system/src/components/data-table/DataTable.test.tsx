import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataTable } from './DataTable'

const props = {
  caption: 'Bezoekers per dag, de laatste twee dagen',
  columns: ['Dag', 'Unieke bezoekers', 'Weergaven'],
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

  it('gives the header and the cells of a short column the class for narrow numbers, and no other column', () => {
    render(
      <DataTable
        caption="Uitslagen"
        columns={['Stand', { name: 'Wedstrijden', short: true }, 'Bezoekers']}
        rows={[{ cells: [2, 1234], header: 'Voor' }]}
      />,
    )

    expect(screen.getAllByRole('columnheader').map((header) => header.className)).toEqual([
      '',
      'hf-numeric hf-numeric-short',
      'hf-numeric',
    ])
    expect(screen.getAllByRole('cell').map((cell) => cell.className)).toEqual([
      'hf-numeric hf-numeric-short',
      'hf-numeric',
    ])
  })

  it('shows text in a cell as it is', () => {
    render(<DataTable {...props} rows={[{ cells: ['n.v.t.', 3], header: 'Een rij' }]} />)

    expect(screen.getByRole('cell', { name: 'n.v.t.' })).toBeTruthy()
  })

  it('shows an abbreviation as the column header and gives a screen reader the whole word', () => {
    render(
      <DataTable
        caption="Uitslagen"
        columns={['Stand', { abbreviation: 'G', name: 'gelijk' }, 'Punten']}
        rows={[{ cells: [2, 7], header: 'Voor' }]}
      />,
    )

    const header = screen.getAllByRole('columnheader')[1] as HTMLElement

    expect(header.querySelector('abbr')?.getAttribute('title')).toBe('Gelijk')
    expect(header.querySelector('[aria-hidden="true"]')?.textContent).toBe('G')
    expect(header.querySelector('.hf-visually-hidden')?.textContent).toBe('gelijk')
    expect(screen.getByRole('columnheader', { name: 'gelijk' })).toBeTruthy()
    expect(header.getAttribute('scope')).toBe('col')
    expect(header.className).toBe('hf-numeric')
  })

  it('has the hf-data-table class and passes on other attributes and a class', () => {
    render(<DataTable {...props} className="extra" id="tabel" />)

    expect(screen.getByRole('table').className).toBe('hf-data-table extra')
    expect(screen.getByRole('table').id).toBe('tabel')
  })

  it('makes the row header a link when the row has an href, and leaves the others as text', () => {
    render(
      <DataTable
        {...props}
        rows={[
          { cells: [1, 2], header: 'ma 26 okt 2026', href: '/dag/26' },
          { cells: [3, 4], header: 'zo 25 okt 2026' },
        ]}
      />,
    )

    const [first, second] = screen.getAllByRole('rowheader')

    expect(
      within(first as HTMLElement)
        .getByRole('link', { name: 'ma 26 okt 2026' })
        .getAttribute('href'),
    ).toBe('/dag/26')
    expect(within(second as HTMLElement).queryByRole('link')).toBeNull()
    expect(first?.getAttribute('scope')).toBe('row')
  })
})

describe('DataTable with text', () => {
  const textProps = {
    appearance: 'text',
    caption: 'Wedstrijden',
    columns: ['Wedstrijd', 'Uitslag', 'Status'],
    rows: [
      {
        cells: ['2 - 1', <a href="#status">Gespeeld</a>],
        header: 'Testclub - FC Voorbeeld',
        href: '#wedstrijd-1',
        secondary: 'zondag 1 november 2026',
      },
      { cells: ['–', 'Gepland'], header: 'Proefstad SV - Testclub' },
    ],
  } as const

  it('is a table with the same caption, headers with scope and row headers as the one with numbers', () => {
    render(<DataTable {...textProps} />)

    expect(screen.getByRole('table', { name: 'Wedstrijden' })).toBeTruthy()
    expect(document.querySelectorAll('thead th[scope="col"]')).toHaveLength(3)
    expect(document.querySelectorAll('tbody th[scope="row"]')).toHaveLength(2)
    expect(screen.getByRole('table').className).toBe('hf-data-table hf-data-table-text')
  })

  it('starts every column at the start: no cell is aligned to the end', () => {
    render(<DataTable {...textProps} />)

    expect(document.querySelectorAll('.hf-numeric')).toHaveLength(0)
  })

  it('makes the row header a link and puts the second line of secondary text in the header', () => {
    render(<DataTable {...textProps} />)

    const [first, second] = screen.getAllByRole('rowheader')

    expect(within(first as HTMLElement).getByRole('link', { name: 'Testclub - FC Voorbeeld' })).toBeTruthy()
    expect(first?.querySelector('.hf-data-table-secondary')?.textContent).toBe('zondag 1 november 2026')
    expect(within(second as HTMLElement).queryByRole('link')).toBeNull()
    expect(second?.querySelector('.hf-data-table-secondary')).toBeNull()
  })

  describe('with a column that folds', () => {
    const foldProps = {
      appearance: 'text',
      caption: 'Wedstrijden',
      columns: ['Wedstrijd', { fold: true, name: 'Datum' }, { fold: true, name: 'Competitie' }, 'Uitslag'],
      rows: [
        { cells: ['1 november', 'Eredivisie', '2 - 1'], header: 'Testclub - FC Voorbeeld', href: '#a' },
        { cells: ['28 oktober', 'KNVB Beker', 3], header: 'Proefstad SV - Testclub' },
      ],
    } as const

    it('puts the table in a container, so the room of the table decides', () => {
      render(<DataTable {...foldProps} />)

      expect(screen.getByRole('table').parentElement?.className).toBe('hf-data-table-fold')
      expect(screen.getByRole('table').className).toBe('hf-data-table hf-data-table-text')
    })

    it('marks the header and the cells of the column that folds, and no other', () => {
      render(<DataTable {...foldProps} />)

      const folding = (selector: string) =>
        [...document.querySelectorAll(selector)].map((cell) => cell.classList.contains('hf-data-table-fold-column'))

      expect(folding('thead th')).toEqual([false, true, true, false])
      expect(folding('tbody tr:first-child td')).toEqual([true, true, false])
    })

    it('repeats the folded cells in one line under the row header, in the order of the columns', () => {
      render(<DataTable {...foldProps} />)

      const lines = [...document.querySelectorAll('tbody th .hf-data-table-folded')]

      expect(lines.map((line) => line.textContent)).toEqual(['1 november · Eredivisie', '28 oktober · KNVB Beker'])
      expect(lines[0]?.classList.contains('hf-data-table-secondary')).toBe(true)
    })

    it('keeps the second line of the row as it is, next to the folded one', () => {
      render(
        <DataTable
          {...foldProps}
          rows={[{ cells: ['1 november', 'Eredivisie', '2 - 1'], header: 'Rij', secondary: 'Eigen regel' }]}
        />,
      )

      expect(
        [...document.querySelectorAll('tbody th .hf-data-table-secondary')].map((line) => line.textContent),
      ).toEqual(['Eigen regel', '1 november · Eredivisie'])
    })

    it('changes nothing for a table without a column that folds', () => {
      render(<DataTable {...textProps} />)

      expect(screen.getByRole('table').parentElement?.className).not.toBe('hf-data-table-fold')
      expect(document.querySelector('.hf-data-table-folded')).toBeNull()
      expect(document.querySelector('.hf-data-table-fold-column')).toBeNull()
    })
  })

  it('shows free content in a cell, such as a link, and writes a number the Dutch way', () => {
    render(<DataTable {...textProps} rows={[{ cells: [<a href="#t">Link</a>, 1234], header: 'Rij' }]} />)

    expect(screen.getByRole('cell', { name: 'Link' }).querySelector('a')?.getAttribute('href')).toBe('#t')
    expect(screen.getByRole('cell', { name: '1.234' })).toBeTruthy()
  })

  it('leaves the table of numbers as it was: no text class, and the numbers aligned to the end', () => {
    render(<DataTable {...props} />)

    expect(screen.getByRole('table').className).toBe('hf-data-table')
    expect(document.querySelectorAll('.hf-numeric')).toHaveLength(2 + 4)
    expect(document.querySelector('.hf-data-table-secondary')).toBeNull()
  })

  it('passes on other attributes and a class, and no `appearance` to the element', () => {
    render(<DataTable {...textProps} className="extra" id="tabel" />)

    expect(screen.getByRole('table').className).toBe('hf-data-table hf-data-table-text extra')
    expect(screen.getByRole('table').id).toBe('tabel')
    expect(screen.getByRole('table').hasAttribute('appearance')).toBe(false)
  })
})
