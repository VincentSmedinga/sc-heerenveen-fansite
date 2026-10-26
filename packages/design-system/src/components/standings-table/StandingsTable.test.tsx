import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StandingsTable, type StandingsTableRow } from './StandingsTable'

const rows: StandingsTableRow[] = [
  {
    club: 'Demo Boys',
    drawn: 1,
    goalDifference: 1,
    lost: 0,
    played: 2,
    points: 4,
    position: 1,
    won: 1,
  },
  {
    club: 'sc Heerenveen',
    drawn: 0,
    goalDifference: 3,
    lost: 0,
    played: 2,
    points: 6,
    position: 2,
    won: 2,
  },
  {
    club: 'Testdorp FC',
    drawn: 1,
    goalDifference: -2,
    lost: 1,
    played: 2,
    points: 1,
    position: 3,
    won: 0,
  },
  {
    club: 'Nepstad Rangers',
    drawn: 0,
    goalDifference: 0,
    lost: 0,
    played: 2,
    points: 0,
    position: 4,
    won: 0,
  },
]

const props = { caption: 'Stand op 18 oktober 2026', label: 'De volledige stand', rows }

describe('StandingsTable', () => {
  it('is a real table with the caption that names it and says the day', () => {
    render(<StandingsTable {...props} />)

    expect(screen.getByRole('table', { name: 'Stand op 18 oktober 2026' })).toBeTruthy()
    expect(document.querySelector('caption')?.textContent).toBe('Stand op 18 oktober 2026')
  })

  it('has a column header with scope for every column and a row header for every club', () => {
    render(<StandingsTable {...props} />)

    const headers = screen.getAllByRole('columnheader')

    expect(headers.map((header) => header.querySelector('[aria-hidden="true"]')?.textContent ?? 'Club')).toEqual([
      '#',
      'Club',
      'G',
      'W',
      'G',
      'V',
      'DS',
      'P',
    ])
    expect(headers.every((header) => header.getAttribute('scope') === 'col')).toBe(true)
    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual([
      'Demo Boys',
      'sc Heerenveen (onze club)',
      'Testdorp FC',
      'Nepstad Rangers',
    ])
    expect(document.querySelectorAll('tbody th[scope="row"]')).toHaveLength(4)
  })

  it('names every column header by its full word for a screen reader, so the two G columns differ', () => {
    render(<StandingsTable {...props} />)

    expect(
      screen.getAllByRole('columnheader').map((header) => header.querySelector('.hf-visually-hidden')?.textContent),
    ).toEqual(['positie', undefined, 'gespeeld', 'gewonnen', 'gelijk', 'verloren', 'doelsaldo', 'punten'])
    expect(screen.getByRole('columnheader', { name: 'gespeeld' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'gelijk' })).toBeTruthy()
  })

  it('does so in the short form too, where there is no legend', () => {
    render(<StandingsTable {...props} columns="compact" />)

    expect(screen.getByRole('columnheader', { name: 'gespeeld' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'doelsaldo' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'punten' })).toBeTruthy()
  })

  it('gives every abbreviation its full word, in the title and under the table', () => {
    const { container } = render(<StandingsTable {...props} />)

    expect([...container.querySelectorAll('thead abbr')].map((abbr) => abbr.getAttribute('title'))).toEqual([
      'Positie',
      'Gespeeld',
      'Gewonnen',
      'Gelijk',
      'Verloren',
      'Doelsaldo',
      'Punten',
    ])
    expect(container.querySelector('.hf-standings-legend')?.textContent).toBe(
      'G gespeeld, W gewonnen, G gelijk, V verloren, DS doelsaldo, P punten',
    )
  })

  it('writes the numbers of a club in the columns of the headers', () => {
    render(<StandingsTable {...props} />)
    const row = screen.getByRole('row', { name: /sc Heerenveen/u })

    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['2', '2', '2', '0', '0', '+3', '6'])
  })

  it('puts the points in the last column, in a class of their own', () => {
    const { container } = render(<StandingsTable {...props} />)
    const cells = [...container.querySelectorAll('tbody tr:nth-child(2) td')]

    expect(cells.at(-1)?.textContent).toBe('6')
    expect(cells.at(-1)?.className).toBe('hf-numeric hf-standings-points')
    expect(container.querySelectorAll('.hf-standings-points')).toHaveLength(4)
  })

  it('writes a negative goal difference with a minus sign and a goalless one as 0', () => {
    render(<StandingsTable {...props} />)

    expect(
      within(screen.getByRole('row', { name: /Testdorp/u }))
        .getAllByRole('cell')
        .at(-2)?.textContent,
    ).toBe('−2')
    expect(
      within(screen.getByRole('row', { name: /Nepstad/u }))
        .getAllByRole('cell')
        .at(-2)?.textContent,
    ).toBe('0')
  })

  it('makes the row of sc Heerenveen stand out by more than colour, and no other row', () => {
    const { container } = render(<StandingsTable {...props} />)
    const marked = container.querySelectorAll('tbody tr.hf-highlight')

    expect(marked).toHaveLength(1)
    expect(marked[0]?.className).toContain('hf-standings-table-own')
    expect(marked[0]?.querySelector('.hf-visually-hidden')?.textContent).toBe(' (onze club)')
  })

  it('puts the table in an area that scrolls sideways, has a name and can be reached with the keyboard', () => {
    render(<StandingsTable {...props} />)
    const area = screen.getByRole('region', { name: 'De volledige stand' })

    expect(area.getAttribute('tabindex')).toBe('0')
    expect(within(area).getByRole('table')).toBeTruthy()
  })

  it('leaves out the columns of won, drawn and lost in compact, with no scrolling area and no legend', () => {
    render(<StandingsTable {...props} columns="compact" />)

    expect(
      screen
        .getAllByRole('columnheader')
        .map((header) => header.querySelector('[aria-hidden="true"]')?.textContent ?? 'Club'),
    ).toEqual(['#', 'Club', 'G', 'DS', 'P'])
    expect(screen.queryByRole('region')).toBeNull()
    expect(document.querySelector('.hf-standings-legend')).toBeNull()
  })

  it('shows the names of clubs as text, not as HTML', () => {
    const { container } = render(<StandingsTable {...props} rows={[{ ...rows[0]!, club: '<b>Demo</b>' }]} />)

    expect(container.querySelector('tbody th')?.textContent).toBe('<b>Demo</b>')
    expect(container.querySelector('tbody b')).toBeNull()
  })

  it('has no link and no image: only the names of the clubs', () => {
    const { container } = render(<StandingsTable {...props} />)

    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(container.querySelector('img, svg, picture')).toBeNull()
  })

  it('passes other props on and adds its own class to a given one', () => {
    const { container } = render(<StandingsTable {...props} className="extra" id="stand" />)

    expect(container.firstElementChild?.className).toBe('hf-standings extra')
    expect(container.firstElementChild?.id).toBe('stand')
  })
})
