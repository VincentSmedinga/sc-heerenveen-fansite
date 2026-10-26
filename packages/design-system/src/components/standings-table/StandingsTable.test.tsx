import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { pointsShares, StandingsTable, type StandingsTableRow } from './StandingsTable'

const rows: StandingsTableRow[] = [
  { club: 'Demo Boys', played: 2, points: 4, position: 1 },
  { club: 'sc Heerenveen', played: 2, points: 6, position: 2 },
  { club: 'Testdorp FC', played: 2, points: 1, position: 3 },
  { club: 'Nepstad Rangers', played: 2, points: 0, position: 4 },
]

const props = { caption: 'Stand op 18 oktober 2026', rows }

/** The length of the bars, in the order of the rows. */
const barLengths = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('.hf-bar')].map((bar) => bar.style.getPropertyValue('--hf-bar-share'))

describe('pointsShares', () => {
  it('gives the leader the whole bar and a club with half of the points half', () => {
    expect(
      pointsShares([
        { ...rows[0]!, points: 20 },
        { ...rows[1]!, points: 10 },
      ]),
    ).toEqual([100, 50])
  })

  it('gives a club without points an empty bar', () => {
    expect(pointsShares(rows)).toEqual([66.67, 100, 16.67, 0])
  })

  it('gives clubs with the same points the same bar', () => {
    expect(pointsShares(rows.map((row) => ({ ...row, points: 7 })))).toEqual([100, 100, 100, 100])
  })

  it('takes the leader from the points, not from the first row', () => {
    expect(
      pointsShares([
        { ...rows[0]!, points: 3 },
        { ...rows[1]!, points: 12 },
      ]),
    ).toEqual([25, 100])
  })

  it('shows 1 point behind a leader of 25 as 4% of the bar', () => {
    expect(
      pointsShares([
        { ...rows[0]!, points: 25 },
        { ...rows[1]!, points: 24 },
        { ...rows[2]!, points: 1 },
      ]),
    ).toEqual([100, 96, 4])
  })

  it('has no bars when nobody has points, so no division by zero', () => {
    expect(pointsShares(rows.map((row) => ({ ...row, points: 0 })))).toBeNull()
    expect(pointsShares([])).toBeNull()
  })

  it('keeps a share between 0 and 100', () => {
    expect(
      pointsShares([
        { ...rows[0]!, points: -3 },
        { ...rows[1]!, points: 5 },
      ]),
    ).toEqual([0, 100])
  })
})

describe('StandingsTable', () => {
  it('is a real table with the caption that names it and says the day, for a screen reader only', () => {
    render(<StandingsTable {...props} />)

    expect(screen.getByRole('table', { name: 'Stand op 18 oktober 2026' })).toBeTruthy()
    expect(document.querySelector('caption')?.textContent).toBe('Stand op 18 oktober 2026')
    expect(document.querySelector('caption')?.className).toBe('hf-visually-hidden')
  })

  it('has a column header with scope for every column and a row header for every club', () => {
    render(<StandingsTable {...props} />)

    const headers = screen.getAllByRole('columnheader')

    expect(headers.map((header) => header.querySelector('[aria-hidden="true"]')?.textContent ?? 'Club')).toEqual([
      '#',
      'Club',
      'G',
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

  it('has no column for won, drawn or lost, in the full table or the short one', () => {
    const { rerender } = render(<StandingsTable {...props} />)

    for (const name of ['gewonnen', 'gelijk', 'verloren']) {
      expect(screen.queryByRole('columnheader', { name })).toBeNull()
    }

    rerender(<StandingsTable {...props} columns="compact" />)

    for (const name of ['gewonnen', 'gelijk', 'verloren']) {
      expect(screen.queryByRole('columnheader', { name })).toBeNull()
    }
  })

  it('names every column header by its full word for a screen reader', () => {
    render(<StandingsTable {...props} />)

    expect(
      screen.getAllByRole('columnheader').map((header) => header.querySelector('.hf-visually-hidden')?.textContent),
    ).toEqual(['positie', undefined, 'gespeeld', 'punten'])
    expect(screen.getByRole('columnheader', { name: 'gespeeld' })).toBeTruthy()
  })

  it('does so in the short form too, where there is no legend', () => {
    render(<StandingsTable {...props} columns="compact" />)

    expect(screen.getByRole('columnheader', { name: 'gespeeld' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'punten' })).toBeTruthy()
  })

  it('gives every abbreviation its full word, in the title and under the table', () => {
    const { container } = render(<StandingsTable {...props} />)

    expect([...container.querySelectorAll('thead abbr')].map((abbr) => abbr.getAttribute('title'))).toEqual([
      'Positie',
      'Gespeeld',
      'Punten',
    ])
    expect(container.querySelector('.hf-standings-legend')?.textContent).toBe('G gespeeld, P punten')
  })

  it('writes the numbers of a club in the columns of the headers', () => {
    render(<StandingsTable {...props} />)
    const row = screen.getByRole('row', { name: /sc Heerenveen/u })

    // Position, played, points.
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['2', '2', '6'])
  })

  it('does so in the short form too', () => {
    render(<StandingsTable {...props} columns="compact" />)
    const row = screen.getByRole('row', { name: /sc Heerenveen/u })

    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['2', '2', '6'])
  })

  it('puts the points in the last column, in a class of their own', () => {
    const { container } = render(<StandingsTable {...props} />)
    const cells = [...container.querySelectorAll('tbody tr:nth-child(2) td')]

    expect(cells.at(-1)?.textContent).toBe('6')
    expect(cells.at(-1)?.className).toBe('hf-numeric hf-bar-value')
    expect(cells.at(-2)?.className).toBe('hf-numeric')
    expect(container.querySelectorAll('.hf-bar-value')).toHaveLength(4)
  })

  it('gives the header of the points the space of the bar, so it stays above the numbers, only with bars', () => {
    const { container, rerender } = render(<StandingsTable {...props} />)

    expect(container.querySelectorAll('th.hf-bar-head')).toHaveLength(1)
    expect(container.querySelector('th.hf-bar-head')?.textContent).toBe('Ppunten')

    rerender(<StandingsTable {...props} columns="compact" />)

    expect(container.querySelector('th.hf-bar-head')).toBeNull()

    rerender(<StandingsTable {...props} rows={rows.map((row) => ({ ...row, points: 0 }))} />)

    expect(container.querySelector('th.hf-bar-head')).toBeNull()
  })

  it('has no column for the goal difference, in the full table or the short one', () => {
    const { rerender } = render(<StandingsTable {...props} />)

    expect(screen.queryByRole('columnheader', { name: 'doelsaldo' })).toBeNull()

    rerender(<StandingsTable {...props} columns="compact" />)

    expect(screen.queryByRole('columnheader', { name: 'doelsaldo' })).toBeNull()
  })

  it('makes the row of sc Heerenveen stand out by more than colour, and no other row', () => {
    const { container } = render(<StandingsTable {...props} />)
    const marked = container.querySelectorAll('tbody tr.hf-highlight')

    expect(marked).toHaveLength(1)
    expect(marked[0]?.className).toContain('hf-standings-table-own')
    expect(marked[0]?.querySelector('.hf-visually-hidden')?.textContent).toBe(' (onze club)')
  })

  describe('the bars', () => {
    it('puts a bar in the cell of the points of every club, as long as the share of the leader', () => {
      const { container } = render(<StandingsTable {...props} />)

      expect(barLengths(container)).toEqual(['66.67', '100', '16.67', '0'])
      expect(
        [...container.querySelectorAll('.hf-bar')].every((bar) => bar.parentElement?.matches('td.hf-bar-value')),
      ).toBe(true)
    })

    it('hides the bars from a screen reader and gives them no role, name or text', () => {
      const { container } = render(<StandingsTable {...props} />)
      const bars = [...container.querySelectorAll('.hf-bar')]

      expect(bars).toHaveLength(4)

      for (const bar of bars) {
        expect(bar.getAttribute('aria-hidden')).toBe('true')
        expect(bar.getAttribute('role')).toBeNull()
        expect(bar.getAttribute('aria-label')).toBeNull()
        expect(bar.textContent).toBe('')
      }
    })

    it('does not add a cell or a header for the bars, so the table has the same cells as without them', () => {
      const { container } = render(<StandingsTable {...props} />)
      const cells = within(screen.getByRole('row', { name: /sc Heerenveen/u })).getAllByRole('cell')

      expect(cells.map((cell) => cell.textContent)).toEqual(['2', '2', '6'])
      expect(screen.getAllByRole('columnheader')).toHaveLength(4)
      expect(container.querySelectorAll('tbody tr:nth-child(2) td')).toHaveLength(3)
      expect(container.querySelector('.hf-standings-legend')?.textContent).not.toMatch(/balk/iu)
    })

    it('makes equal points equal bars', () => {
      const { container } = render(<StandingsTable {...props} rows={rows.map((row) => ({ ...row, points: 7 }))} />)

      expect(barLengths(container)).toEqual(['100', '100', '100', '100'])
    })

    it('has no bars when nobody has points, and no bars for a leader with zero points', () => {
      const { container } = render(<StandingsTable {...props} rows={rows.map((row) => ({ ...row, points: 0 }))} />)

      expect(container.querySelector('.hf-bar')).toBeNull()
      expect(screen.getAllByRole('cell').filter((cell) => cell.classList.contains('hf-bar-value'))).toHaveLength(4)
    })

    it('has no bars in the short form', () => {
      const { container } = render(<StandingsTable {...props} columns="compact" />)

      expect(container.querySelector('.hf-bar')).toBeNull()
    })
  })

  it('has no area that scrolls sideways', () => {
    const { container } = render(<StandingsTable {...props} />)

    expect(screen.queryByRole('region')).toBeNull()
    expect(container.querySelector('[tabindex]')).toBeNull()
  })

  it('has a legend in the full table only', () => {
    const { container, rerender } = render(<StandingsTable {...props} />)

    expect(container.querySelector('.hf-standings-legend')).not.toBeNull()

    rerender(<StandingsTable {...props} columns="compact" />)

    expect(container.querySelector('.hf-standings-legend')).toBeNull()
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

    expect(container.firstElementChild?.className).toBe('hf-standings hf-bar-place extra')
    expect(container.firstElementChild?.id).toBe('stand')
  })
})
