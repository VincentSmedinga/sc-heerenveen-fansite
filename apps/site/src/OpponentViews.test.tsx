// @vitest-environment jsdom
import type { PublicClubRecord } from '@fansite/db/queries'

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { Meeting } from './opponents'

import { ClubsCard, ClubScoreCountsCard, TopPointsCard } from './OpponentViews'
import { testclub } from './test-opponents'

const record = (
  name: string,
  won: number,
  drawn: number,
  lost: number,
  goalsFor: number,
  goalsAgainst: number,
): PublicClubRecord => ({
  drawn,
  goalsAgainst,
  goalsFor,
  id: name.length,
  lost,
  name,
  played: won + drawn + lost,
  slug: name.toLowerCase(),
  won,
})

// Sparta scored the most goals but has the lower goal difference; Zwolle has the highest.
const records = [record('Sparta', 4, 2, 4, 20, 15), record('Venlo', 1, 1, 5, 6, 14), record('Zwolle', 5, 0, 0, 9, 1)]

afterEach(cleanup)

const names = () => screen.getAllByRole('rowheader').map((header) => header.textContent)
const figures = (column: number) =>
  [...document.querySelectorAll(`tbody td:nth-of-type(${column})`)].map((cell) => cell.textContent)

describe('ClubsCard', () => {
  const card = (choice: 'all' | 'league' = 'all') => (
    <ClubsCard address="/statistieken/tegenstanders" choice={choice} query="" records={records} since="2022/23" />
  )

  it('shows the goal difference with its sign in the last column, and the points before it', () => {
    render(card())

    expect(figures(5)).toEqual(['14', '4', '15'])
    expect(figures(6)).toEqual(['+5', '−8', '+8'])
  })

  it('has the same columns with the choice Eredivisie', () => {
    render(card('league'))

    expect(screen.getAllByRole('columnheader')).toHaveLength(7)
    expect(screen.getByRole('button', { name: 'P punten' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'D doelsaldo' })).toBeTruthy()
  })

  it('puts the club with the highest goal difference on top on the first click on D, not the one with most goals', () => {
    render(card())
    fireEvent.click(screen.getByRole('button', { name: 'D doelsaldo' }))

    expect(names()).toEqual(['Zwolle', 'Sparta', 'Venlo'])
    expect(screen.getByRole('columnheader', { name: 'D doelsaldo' }).getAttribute('aria-sort')).toBe('descending')
    expect(screen.getByRole('status').textContent).toBe('Gesorteerd op Doelsaldo, van hoog naar laag')

    fireEvent.click(screen.getByRole('button', { name: 'D doelsaldo' }))

    expect(names()).toEqual(['Venlo', 'Sparta', 'Zwolle'])
  })
})

describe('TopPointsCard', () => {
  // Sparta has 10 played matches and 14 points, Zwolle 5 and 15, Venlo 7 and 4.
  const card = (choice: 'all' | 'league' = 'all', query = '') => (
    <TopPointsCard
      address="/statistieken/tegenstanders"
      choice={choice}
      query={query}
      records={records}
      since="2022/23"
    />
  )

  it('ranks the clubs on the average points per match with two decimals and a comma', () => {
    render(card())

    expect(names()).toEqual(['Zwolle', 'Sparta', 'Venlo'])
    expect(figures(1)).toEqual(['1', '2', '3'])
    expect(figures(2)).toEqual(['3,00', '1,40', '0,57'])
    expect(figures(3)).toEqual(['5', '10', '7'])
  })

  it('has a hidden caption that names the order, real column headers and a link named by the club', () => {
    render(card())

    expect(
      screen.getByRole('table', {
        name: /^De tien clubs waartegen sc Heerenveen gemiddeld de meeste punten per wedstrijd haalt, van hoog naar laag$/,
      }),
    ).toBeTruthy()
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      '#plaats',
      'Club',
      'Ppunten per wedstrijd',
      'Ggespeeld',
    ])
    expect(screen.getByRole('link', { name: 'Zwolle' }).getAttribute('href')).toBe('/statistieken/tegenstanders/zwolle')
  })

  it('says it is the Eredivisie in the caption and keeps the choice in every link', () => {
    render(card('league', '?competitie=eredivisie'))

    expect(screen.getByRole('table').querySelector('caption')?.textContent).toMatch(/, in de Eredivisie$/)
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/statistieken/tegenstanders/zwolle?competitie=eredivisie',
      '/statistieken/tegenstanders/sparta?competitie=eredivisie',
      '/statistieken/tegenstanders/venlo?competitie=eredivisie',
    ])
  })

  it('sets the average in the semibold weight', () => {
    render(card())

    expect([...document.querySelectorAll('td.hf-data-table-semibold')].map((cell) => cell.textContent)).toEqual([
      '3,00',
      '1,40',
      '0,57',
    ])
  })

  it('cannot be sorted: no buttons and no sort order', () => {
    render(card())

    expect(screen.queryAllByRole('button')).toEqual([])
    expect(document.querySelector('[aria-sort]')).toBeNull()
  })

  it('names the minimum, the legend and what the card is based on', () => {
    render(card())

    expect(screen.getByText('P punten per wedstrijd, G gespeeld')).toBeTruthy()
    expect(
      screen.getByText(
        'Gebaseerd op alle 22 gespeelde wedstrijden sinds 2022/23, tegen clubs met minstens 5 gespeelde wedstrijden',
      ),
    ).toBeTruthy()
  })

  it('says one sentence, and shows no table, when no club has five played matches', () => {
    render(
      <TopPointsCard
        address="/statistieken/tegenstanders"
        choice="all"
        query=""
        records={[record('Venlo', 1, 1, 2, 3, 4)]}
        since="2022/23"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Punten per wedstrijd' })).toBeTruthy()
    expect(screen.getByText('Nog geen club met minstens 5 gespeelde wedstrijden.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByText(/Gebaseerd op/)).toBeNull()
  })
})

describe('ClubScoreCountsCard', () => {
  const meetings = testclub.matches.filter(
    (match): match is Meeting => match.goalsFor !== null && match.goalsAgainst !== null,
  )

  it('names the header of each table with the count, as a screen reader says it', () => {
    render(<ClubScoreCountsCard meetings={meetings} />)

    expect(screen.getByRole('columnheader', { name: 'Winst, 3 keer' }).textContent).toBe('Winst 3×Winst, 3 keer')
    expect(screen.getByRole('columnheader', { name: 'Gelijk, 1 keer' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Verlies, 1 keer' })).toBeTruthy()
  })

  it('names the table of competitions and gives it the matches of each competition', () => {
    render(<ClubScoreCountsCard meetings={meetings} />)

    const table = screen.getByRole('table', { name: /^De competities van deze wedstrijden/ })

    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Competitie', 'Wedstrijden'])
    expect(
      within(table)
        .getAllByRole('row')
        .map((row) => row.textContent),
    ).toEqual(['CompetitieWedstrijden', 'Eredivisie4', 'KNVB Beker1'])
  })

  it('draws the goals against first, so the goals for are green at the left, as in the hole', () => {
    const { container } = render(<ClubScoreCountsCard meetings={meetings} />)
    const small = container.querySelector('.hf-donut-chart-small')!

    expect(small.querySelector('.hf-donut-chart-total')?.textContent).toBe('10–4')
    expect(small.querySelector('.hf-donut-chart-title')?.textContent).toBe('Doelsaldo')
    expect([...small.querySelectorAll('.hf-donut-chart-slice')].map((slice) => slice.getAttribute('class'))).toEqual([
      'hf-donut-chart-slice hf-donut-chart-slice-negative',
      'hf-donut-chart-slice hf-donut-chart-slice-positive',
    ])
    expect(small.querySelector('.hf-donut-chart-label')).toBeNull()
  })

  it('draws no slice for a side without goals', () => {
    const shut = { ...meetings[1]!, goalsAgainst: 0, goalsFor: 2 }
    const { container } = render(<ClubScoreCountsCard meetings={[shut]} />)
    const small = container.querySelector('.hf-donut-chart-small')!

    expect([...small.querySelectorAll('.hf-donut-chart-slice')].map((slice) => slice.getAttribute('class'))).toEqual([
      'hf-donut-chart-slice hf-donut-chart-slice-positive',
    ])
    expect(small.querySelector('.hf-donut-chart-total')?.textContent).toBe('2–0')
  })

  it('is nothing without a match', () => {
    const { container } = render(<ClubScoreCountsCard meetings={[]} />)

    expect(container.innerHTML).toBe('')
  })
})
