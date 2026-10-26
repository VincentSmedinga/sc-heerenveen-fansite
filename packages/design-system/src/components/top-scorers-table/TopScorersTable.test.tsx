import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TopScorersTable, type TopScorersTableRow } from './TopScorersTable'

const rows: TopScorersTableRow[] = [
  { goals: 8, player: 'Proefman', position: 1 },
  { goals: 4, player: 'Nepper', position: 2 },
  { goals: 4, player: 'Testvoort', position: 2 },
  { goals: 1, player: 'Demo', position: 4 },
]

const props = { caption: 'Topscorers van sc Heerenveen in het seizoen 2026/27', rows }

/** The length of the bars, in the order of the rows. */
const barLengths = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('.hf-bar')].map((bar) => bar.style.getPropertyValue('--hf-bar-share'))

describe('TopScorersTable', () => {
  it('is a real table with the caption that names it, for a screen reader only', () => {
    render(<TopScorersTable {...props} />)

    expect(screen.getByRole('table', { name: props.caption })).toBeTruthy()
    expect(document.querySelector('caption')?.className).toBe('hf-visually-hidden')
  })

  it('has column headers with scope for place, player and goals, and a row header for every player', () => {
    render(<TopScorersTable {...props} />)
    const headers = screen.getAllByRole('columnheader')

    expect(headers.map((header) => header.textContent)).toEqual(['#plaats', 'Speler', 'Ddoelpunten'])
    expect(headers.every((header) => header.getAttribute('scope') === 'col')).toBe(true)
    expect(screen.getByRole('columnheader', { name: 'plaats' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'doelpunten' })).toBeTruthy()
    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual([
      'Proefman',
      'Nepper',
      'Testvoort',
      'Demo',
    ])
    expect(document.querySelectorAll('tbody th[scope="row"]')).toHaveLength(4)
  })

  it('writes the place and the goals of a player in the columns of the headers, equal players with the same place', () => {
    render(<TopScorersTable {...props} />)
    const cells = (name: RegExp) =>
      within(screen.getByRole('row', { name }))
        .getAllByRole('cell')
        .map((cell) => cell.textContent)

    expect(cells(/Proefman/u)).toEqual(['1', '8'])
    expect(cells(/Nepper/u)).toEqual(['2', '4'])
    expect(cells(/Testvoort/u)).toEqual(['2', '4'])
    expect(cells(/Demo/u)).toEqual(['4', '1'])
  })

  it('shows a row for every player it gets, however long the list is', () => {
    const many = Array.from({ length: 20 }, (_, index) => ({
      goals: index === 0 ? 2 : 1,
      player: `Speler ${index + 1}`,
      position: index === 0 ? 1 : 2,
    }))
    const { container } = render(<TopScorersTable caption={props.caption} rows={many} />)

    expect(container.querySelectorAll('tbody tr')).toHaveLength(20)
    expect(barLengths(container)).toHaveLength(20)
  })

  it('abbreviates the goals to D, with the full word in the title and under the table', () => {
    const { container } = render(<TopScorersTable {...props} />)

    expect([...container.querySelectorAll('thead abbr')].map((abbr) => abbr.getAttribute('title'))).toEqual([
      'Plaats',
      'Doelpunten',
    ])
    expect(container.querySelector('.hf-bar-legend')?.textContent).toBe('D doelpunten')
  })

  it('makes the goals bold with the class of the standings points, in the last column', () => {
    const { container } = render(<TopScorersTable {...props} />)
    const cells = [...container.querySelectorAll('tbody tr:first-child td')]

    expect(cells.at(-1)?.className).toBe('hf-numeric hf-bar-value')
    expect(container.querySelectorAll('td.hf-bar-value')).toHaveLength(4)
  })

  describe('the bars', () => {
    it('puts a bar in the cell of the goals of every player, as long as the share of the top scorer', () => {
      const { container } = render(<TopScorersTable {...props} />)

      expect(barLengths(container)).toEqual(['100', '50', '50', '12.5'])
      expect(
        [...container.querySelectorAll('.hf-bar')].every((bar) => bar.parentElement?.matches('td.hf-bar-value')),
      ).toBe(true)
    })

    it('hides the bars from a screen reader and adds no cell or header for them', () => {
      const { container } = render(<TopScorersTable {...props} />)

      for (const bar of container.querySelectorAll('.hf-bar')) {
        expect(bar.getAttribute('aria-hidden')).toBe('true')
        expect(bar.getAttribute('role')).toBeNull()
        expect(bar.textContent).toBe('')
      }

      expect(screen.getAllByRole('columnheader')).toHaveLength(3)
      expect(container.querySelectorAll('tbody tr:first-child td')).toHaveLength(2)
    })

    it('gives the header of the goals the space of the bar, so it stays above the numbers', () => {
      const { container } = render(<TopScorersTable {...props} />)

      expect(container.querySelector('th.hf-bar-head')?.textContent).toBe('Ddoelpunten')
    })

    it('makes equal goals equal bars', () => {
      const { container } = render(
        <TopScorersTable {...props} rows={rows.map((row) => ({ ...row, goals: 3, position: 1 }))} />,
      )

      expect(barLengths(container)).toEqual(['100', '100', '100', '100'])
    })

    it('has no bars and no space for them when nobody has a goal', () => {
      const { container } = render(<TopScorersTable {...props} rows={rows.map((row) => ({ ...row, goals: 0 }))} />)

      expect(container.querySelector('.hf-bar')).toBeNull()
      expect(container.querySelector('th.hf-bar-head')).toBeNull()
    })
  })

  it('is the place for the container query of the bars, and passes other props on', () => {
    const { container } = render(<TopScorersTable {...props} className="extra" id="topscorers" />)

    expect(container.firstElementChild?.className).toBe('hf-top-scorers hf-bar-place extra')
    expect(container.firstElementChild?.id).toBe('topscorers')
  })
})
