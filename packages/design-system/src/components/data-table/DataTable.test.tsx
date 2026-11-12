import { render, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { tableColumns } from '../table-columns'
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

  it('shows text in a cell as it is', () => {
    render(<DataTable {...props} rows={[{ cells: ['n.v.t.', 3], header: 'Een rij' }]} />)

    expect(screen.getByRole('cell', { name: 'n.v.t.' })).toBeTruthy()
  })

  it('puts words after the row header on its line, and marks the total row', () => {
    const { container } = render(
      <DataTable
        caption="Seizoenen"
        columns={['Seizoen', 'Wedstrijden']}
        rows={[
          { aside: 'nr. 35', cells: [28], header: '2025/26' },
          { cells: [28], header: 'Totaal', total: true },
        ]}
      />,
    )
    const [season, total] = [...container.querySelectorAll('tbody tr')] as HTMLElement[]

    expect(season?.querySelector('th .hf-data-table-aside')?.textContent).toBe('nr. 35')
    expect(season?.querySelector('th')?.textContent).toBe('2025/26 nr. 35')
    expect(season?.className).toBe('')
    expect(total?.className).toBe('hf-data-table-total')
  })

  it('shows a gap as a sign that a screen reader reads as the words of its header', () => {
    const { container } = render(
      <DataTable
        caption="Seizoenen"
        columns={['Seizoen', 'Wedstrijden']}
        rows={[
          { cells: [28], header: '2025/26' },
          { cells: [], gap: true, header: 'niet bij sc Heerenveen' },
          { cells: [], gap: true, header: 'niet bij sc Heerenveen' },
          { cells: [30], header: '2020/21' },
        ]}
      />,
    )
    const gaps = [...container.querySelectorAll('tbody tr.hf-data-table-gap')]

    expect(gaps).toHaveLength(2)
    expect(gaps[0]?.querySelector('th [aria-hidden="true"]')?.textContent).toBe('⋮')
    expect(gaps[0]?.querySelector('th .hf-visually-hidden')?.textContent).toBe('niet bij sc Heerenveen')
    expect(gaps[0]?.querySelectorAll('td')).toHaveLength(1)
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

  it('shows the text of a column and gives a screen reader its name, with no abbreviation', () => {
    render(
      <DataTable
        caption="Uitslagen"
        columns={[
          { name: 'Winst, 12 keer', shown: 'Winst 12×' },
          { hidden: true, name: 'Keer' },
        ]}
        rows={[{ cells: ['1×'], header: '2–0' }]}
      />,
    )

    const header = screen.getAllByRole('columnheader')[0] as HTMLElement

    expect(header.querySelector('abbr')).toBeNull()
    expect(header.querySelector('[aria-hidden="true"]')?.textContent).toBe('Winst 12×')
    expect(header.querySelector('.hf-visually-hidden')?.textContent).toBe('Winst, 12 keer')
    expect(screen.getByRole('columnheader', { name: 'Winst, 12 keer' })).toBeTruthy()
  })

  it('has the hf-data-table class and passes on other attributes and a class', () => {
    render(<DataTable {...props} className="extra" id="tabel" />)

    expect(screen.getByRole('table').className).toBe('hf-data-table extra')
    expect(screen.getByRole('table').id).toBe('tabel')
  })

  it('keeps a hidden column header for a screen reader, and shows no text for it', () => {
    render(
      <DataTable
        {...props}
        columns={['Winst', { hidden: true, name: 'Keer' }]}
        rows={[{ cells: ['3×'], header: '4–0' }]}
      />,
    )
    const header = screen.getByRole('columnheader', { name: 'Keer' })

    expect(header.querySelector('.hf-visually-hidden')?.textContent).toBe('Keer')
    expect(screen.getByRole('columnheader', { name: 'Winst' }).querySelector('.hf-visually-hidden')).toBeNull()
    expect(screen.getByText('3×')).toBeTruthy()
  })

  it('puts a marker before the row header and words for a screen reader after it', () => {
    render(
      <DataTable
        {...props}
        rows={[
          { cells: [2, 1], header: '4–0', marker: <span aria-hidden="true" data-testid="marker" />, note: 'winst' },
        ]}
      />,
    )
    const header = screen.getByRole('rowheader')

    expect(header.firstElementChild?.getAttribute('data-testid')).toBe('marker')
    expect(header.textContent).toBe('4–0, winst')
    expect(header.lastElementChild?.className).toBe('hf-visually-hidden')
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

  it('aligns a column with a bar to the end and puts its header over the number and the bar', () => {
    render(
      <DataTable
        appearance="text"
        caption="Wachttijden"
        columns={['Club', { bar: true, name: 'Dagen' }]}
        rows={[{ cells: [12], header: 'FC Voorbeeld' }]}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Dagen' }).className).toBe('hf-numeric')
    expect(screen.getByRole('cell', { name: '12' }).className).toBe('hf-numeric')
    expect(screen.getByRole('columnheader', { name: 'Club' }).className).toBe('')
  })

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

  it('shows `display` and a second line in the row header of a table of numbers, and keeps the header as the key', () => {
    render(
      <DataTable
        caption="Trainers"
        columns={['Trainer', 'Wedstrijden']}
        rows={[
          { cells: [3], display: <b>Robin</b>, header: 'Robin Veldman, 2025 – nu', secondary: '2025 – nu' },
          { cells: [5], header: 'Anders' },
        ]}
      />,
    )

    const [first, second] = screen.getAllByRole('rowheader')

    expect(first?.querySelector('b')?.textContent).toBe('Robin')
    expect(first?.textContent).toBe('Robin2025 – nu')
    expect(first?.querySelector('.hf-data-table-secondary')?.textContent).toBe('2025 – nu')
    expect(second?.textContent).toBe('Anders')
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

describe('DataTable.Group', () => {
  it('is a div with the class of the group, and passes other props on', () => {
    const { container } = render(
      <DataTable.Group className="extra" id="tabellen">
        <DataTable {...props} />
      </DataTable.Group>,
    )

    expect(container.firstElementChild?.className).toBe('hf-data-table-group extra')
    expect(container.firstElementChild?.id).toBe('tabellen')
    expect(container.querySelectorAll('table')).toHaveLength(1)
  })

  describe('with a position', () => {
    const ranked = {
      caption: 'De clubs met de meeste punten, van hoog naar laag',
      columns: ['Club', 'P', 'G'],
      rows: [
        { cells: ['2,50', 6], header: 'Testclub', position: 1 },
        { cells: ['2,00', 5], header: 'FC Voorbeeld', position: 2 },
      ],
    }

    it('has a column before the row headers, named plaats for a screen reader, and a place in every row', () => {
      render(<DataTable {...ranked} />)

      expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
        '#plaats',
        'Club',
        'P',
        'G',
      ])
      expect(document.querySelector('thead abbr')?.getAttribute('title')).toBe('Plaats')
      expect([...document.querySelectorAll('tbody td.hf-rank')].map((cell) => cell.textContent)).toEqual(['1', '2'])
      expect(document.querySelector('tbody td.hf-rank')?.className).toBe('hf-numeric hf-rank')
    })

    it('gives the cells of the column with key the class of the key figure and leaves the others', () => {
      render(<DataTable {...ranked} columns={['Club', { ...tableColumns.pointsPerMatch, key: true }, 'G']} />)

      expect([...document.querySelectorAll('tbody td.hf-key')].map((cell) => cell.textContent)).toEqual([
        '2,50',
        '2,00',
      ])
      expect(document.querySelectorAll('tbody td:not(.hf-rank):not(.hf-key)')).toHaveLength(2)
    })

    it('throws when two columns have key, because a table has at most one key figure', () => {
      const twice = [
        { key: true, name: 'P' },
        { key: true, name: 'G' },
      ]

      expect(() => renderToStaticMarkup(<DataTable {...ranked} columns={['Club', ...twice]} />)).toThrow(
        /at most one key column.*P, G/u,
      )
    })

    it('shows the number once for a shared place and a sign on the rows after it, heard as the place', () => {
      render(
        <DataTable
          {...ranked}
          rows={[
            { cells: ['2,50', 6], header: 'Testclub', position: 1 },
            { cells: ['2,00', 5], header: 'FC Voorbeeld', position: 2 },
            { cells: ['2,00', 5], header: 'SV Proefdorp', position: 2 },
            { cells: ['2,00', 5], header: 'Maquette United', position: 2 },
            { cells: ['1,00', 4], header: 'Oefenstad FC', position: 5 },
          ]}
        />,
      )

      const places = [...document.querySelectorAll('tbody td.hf-rank')]

      expect(places.map((cell) => cell.textContent)).toEqual(['1', '2', '⋮gedeeld 2', '⋮gedeeld 2', '5'])
      expect(places[2]?.querySelector('[aria-hidden="true"]')?.textContent).toBe('⋮')
    })

    it('starts the places again after a row for a time away, which has its own sign in the row header', () => {
      render(
        <DataTable
          {...ranked}
          rows={[
            { cells: ['2,00', 5], header: 'FC Voorbeeld', position: 2 },
            { cells: [], gap: true, header: 'niet bij ons' },
            { cells: ['2,00', 5], header: 'SV Proefdorp', position: 2 },
          ]}
        />,
      )

      expect([...document.querySelectorAll('tbody td.hf-rank')].map((cell) => cell.textContent)).toEqual(['2', '2'])
      expect(document.querySelectorAll('tbody tr.hf-data-table-gap th [aria-hidden="true"]')).toHaveLength(1)
    })

    it('has no such column when no row has a position', () => {
      render(<DataTable {...props} />)

      expect(document.querySelector('.hf-rank')).toBeNull()
      expect(screen.queryByText('plaats')).toBeNull()
    })
  })
})
