import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { tableColumns } from '../table-columns'
import { TopScorersTable, type TopScorersTableRow } from './TopScorersTable'

const rows: TopScorersTableRow[] = [
  { goals: 8, players: [{ givenName: 'Wouter', id: 1, surname: 'Proefman' }], position: 1 },
  { goals: 4, players: [{ givenName: 'Gerrit', id: 2, surname: 'Nepper' }], position: 2 },
  { goals: 4, players: [{ id: 'naam:Testvoort', surname: 'Testvoort' }], position: 2 },
  { goals: 1, players: [{ givenName: 'Rick', id: 4, surname: 'Demo' }], position: 4 },
]

const props = { caption: 'Doelpuntenmakers van sc Heerenveen in het seizoen 2026/27', rows }

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
      'Wouter Proefman',
      'Gerrit Nepper',
      'Testvoort',
      'Rick Demo',
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
      players: [{ id: index, surname: `Speler ${index + 1}` }] as TopScorersTableRow['players'],
      position: index === 0 ? 1 : 2,
    }))
    const { container } = render(<TopScorersTable caption={props.caption} rows={many} />)

    expect(container.querySelectorAll('tbody tr')).toHaveLength(20)
    expect(barLengths(container)).toHaveLength(20)
  })

  it('keeps two players with the same name apart by their key, and gives each name its weights', () => {
    const twins: TopScorersTableRow[] = [
      { goals: 2, players: [{ givenName: 'Bram', id: 1, surname: 'Jansen' }], position: 1 },
      { goals: 1, players: [{ givenName: 'Kees', id: 2, surname: 'Jansen' }], position: 2 },
    ]
    const { container } = render(<TopScorersTable caption={props.caption} rows={twins} />)

    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual(['Bram Jansen', 'Kees Jansen'])
    expect(container.querySelectorAll('tbody th .hf-player-name-given')).toHaveLength(2)
    expect(container.querySelectorAll('tbody th .hf-player-name-surname')).toHaveLength(2)
  })

  describe('a row with more than one player', () => {
    const shared: TopScorersTableRow[] = [
      { goals: 3, players: [{ givenName: 'Wouter', id: 1, surname: 'Proefman' }], position: 1 },
      {
        goals: 2,
        players: [
          { givenName: 'Gerrit', id: 2, surname: 'Nepper' },
          { id: 3, surname: 'Testvoort' },
        ],
        position: 2,
      },
      {
        goals: 1,
        players: [
          { givenName: 'Rick', id: 4, surname: 'Demo' },
          { givenName: 'Jan', id: 5, surname: 'Van der Meer' },
          { id: 6, surname: 'Zonnetje' },
        ],
        position: 3,
      },
    ]

    it('has one row header with all the names, a comma and a space apart, in the order of the row', () => {
      const { container } = render(<TopScorersTable {...props} rows={shared} />)

      expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual([
        'Wouter Proefman',
        'Gerrit Nepper, Testvoort',
        'Rick Demo, Jan Van der Meer, Zonnetje',
      ])
      expect(container.querySelectorAll('tbody th[scope="row"]')).toHaveLength(3)
      expect(container.querySelectorAll('tbody tr')).toHaveLength(3)
    })

    it('gives every name its weights and keeps the comma with the name before it', () => {
      const { container } = render(<TopScorersTable {...props} rows={shared} />)
      const third = container.querySelectorAll('tbody tr')[2]!

      expect(third.querySelectorAll('th .hf-player-name-surname')).toHaveLength(3)
      expect(third.querySelector('th')?.innerHTML).toBe(
        [
          '<span class="hf-player-name"><span class="hf-player-name-given">Rick</span> <span class="hf-player-name-surname">Demo</span></span>, ',
          '<span class="hf-player-name"><span class="hf-player-name-given">Jan</span> <span class="hf-player-name-surname">Van der Meer</span></span>, ',
          '<span class="hf-player-name"><span class="hf-player-name-surname">Zonnetje</span></span>',
        ].join(''),
      )
    })

    it('puts no unit around a name, so a name may wrap at a space like the text around it', () => {
      const { container } = render(<TopScorersTable {...props} rows={shared} />)

      expect(container.querySelector('.hf-top-scorers-name')).toBeNull()
      expect(container.querySelector('tbody tr:first-child th')?.innerHTML).toBe(
        '<span class="hf-player-name"><span class="hf-player-name-given">Wouter</span> <span class="hf-player-name-surname">Proefman</span></span>',
      )
    })

    it('gives the place and the goals once per row, and one bar per row for the goals of each player', () => {
      const { container } = render(<TopScorersTable {...props} rows={shared} />)
      const cells = (row: number) =>
        [...container.querySelectorAll('tbody tr')[row]!.querySelectorAll('td')].map((cell) => cell.textContent)

      expect(cells(1)).toEqual(['2', '2'])
      expect(cells(2)).toEqual(['3', '1'])
      expect(barLengths(container)).toEqual(['100', '66.67', '33.33'])
    })
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

    expect(cells.at(-1)?.className).toBe('hf-numeric hf-key')
    expect(container.querySelectorAll('td.hf-key')).toHaveLength(4)
  })

  describe('the bars', () => {
    it('puts a bar in the cell of the goals of every player, as long as the share of the top scorer', () => {
      const { container } = render(<TopScorersTable {...props} />)

      expect(barLengths(container)).toEqual(['100', '50', '50', '12.5'])
      expect([...container.querySelectorAll('.hf-bar')].every((bar) => bar.parentElement?.matches('td.hf-key'))).toBe(
        true,
      )
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

  describe('with showGoalsPerMatch', () => {
    const perMatchRows: TopScorersTableRow[] = [
      { goals: 8, players: [{ givenName: 'Wouter', goalsPerMatch: '0,32', id: 1, surname: 'Proefman' }], position: 1 },
      {
        goals: 4,
        players: [
          { givenName: 'Gerrit', goalsPerMatch: '0,17', id: 2, surname: 'Nepper' },
          { givenName: 'Joris', goalsPerMatch: '0,50', id: 3, surname: 'Testvoort' },
        ],
        position: 2,
      },
    ]

    it('adds the column D/W after the goals, named "doelpunten per wedstrijd" for a screen reader', () => {
      render(<TopScorersTable {...props} rows={perMatchRows} showGoalsPerMatch />)

      expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
        '#plaats',
        'Speler',
        'Ddoelpunten',
        'D/Wdoelpunten per wedstrijd',
      ])
      expect(screen.getByRole('columnheader', { name: 'doelpunten per wedstrijd' }).getAttribute('scope')).toBe('col')
    })

    it('gives every player a row of their own, with the place they share, and the figure as text', () => {
      render(<TopScorersTable {...props} rows={perMatchRows} showGoalsPerMatch />)
      const row = (name: RegExp) =>
        within(screen.getByRole('row', { name }))
          .getAllByRole('cell')
          .map((cell) => cell.textContent)

      expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual([
        'Wouter Proefman',
        'Gerrit Nepper',
        'Joris Testvoort',
      ])
      expect(row(/Gerrit Nepper/)).toEqual(['2', '4', '0,17'])
      expect(row(/Joris Testvoort/)).toEqual(['2', '4', '0,50'])
    })

    it('keeps the bars a share of the top scorer', () => {
      const { container } = render(<TopScorersTable {...props} rows={perMatchRows} showGoalsPerMatch />)

      expect(barLengths(container)).toEqual(['100', '50', '50'])
    })

    it('says in the legend what D/W is, with the letters of both columns', () => {
      const { container } = render(<TopScorersTable {...props} rows={perMatchRows} showGoalsPerMatch />)

      expect(container.querySelector('.hf-bar-legend')?.textContent).toBe(
        'D doelpunten, D/W doelpunten per wedstrijd. D/W: de doelpunten gedeeld door de wedstrijden die de speler speelde, ook als invaller, volgens de selectie op Wikipedia.',
      )
    })
  })

  describe('without showGoalsPerMatch', () => {
    it('is as it was: no D/W column, shared rows stay shared and the legend is the letter D alone', () => {
      const shared: TopScorersTableRow[] = [
        {
          goals: 4,
          players: [
            { givenName: 'Gerrit', goalsPerMatch: '0,17', id: 2, surname: 'Nepper' },
            { givenName: 'Joris', goalsPerMatch: '0,50', id: 3, surname: 'Testvoort' },
          ],
          position: 1,
        },
      ]
      const { container } = render(<TopScorersTable {...props} rows={shared} />)

      expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
        '#plaats',
        'Speler',
        'Ddoelpunten',
      ])
      expect(screen.getAllByRole('rowheader')).toHaveLength(1)
      expect(container.textContent).not.toContain('0,17')
      expect(container.querySelector('.hf-bar-legend')?.textContent).toBe('D doelpunten')
    })
  })

  it('has the letter and the word of the figure it is for in the header and the legend, instead of the goals', () => {
    const { container } = render(<TopScorersTable {...props} figure={tableColumns.minutes} />)

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      '#plaats',
      'Speler',
      'Mminuten',
    ])
    expect(screen.getByRole('columnheader', { name: 'minuten' })).toBeTruthy()
    expect(container.querySelector('.hf-bar-legend')?.textContent).toBe('M minuten')
    expect(container.querySelector('abbr[title="Minuten"]')).toBeTruthy()
  })

  it('makes the name of a player with a page a link, and leaves the others as text', () => {
    render(
      <TopScorersTable
        {...props}
        rows={[
          {
            goals: 2,
            players: [{ givenName: 'Wouter', href: '/spelers/wouter-proefman', id: 1, surname: 'Proefman' }],
            position: 1,
          },
          { goals: 1, players: [{ givenName: 'Gerrit', id: 2, surname: 'Nepper' }], position: 2 },
        ]}
      />,
    )

    expect(screen.getByRole('link', { name: 'Wouter Proefman' }).getAttribute('href')).toBe('/spelers/wouter-proefman')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})
