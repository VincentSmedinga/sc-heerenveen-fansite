// @vitest-environment jsdom
import type { PublicClubMatch, PublicClubRecord } from '@fansite/db/queries'

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { Meeting } from './opponents'

import {
  ClubPlacesCard,
  ClubsCard,
  ClubScoreCountsCard,
  ClubTopScorersCard,
  HardestCard,
  LastWinCard,
  TopPointsCard,
} from './OpponentViews'
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
    <ClubsCard address="/tegenstanders" choice={choice} query="" records={records} since="2022/23" />
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
    <TopPointsCard address="/tegenstanders" choice={choice} query={query} records={records} since="2022/23" />
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
    expect(screen.getByRole('link', { name: 'Zwolle' }).getAttribute('href')).toBe('/tegenstanders/zwolle')
  })

  it('says it is the Eredivisie in the caption and keeps the choice in every link', () => {
    render(card('league', '?competitie=eredivisie'))

    expect(screen.getByRole('table').querySelector('caption')?.textContent).toMatch(/, in de Eredivisie$/)
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/tegenstanders/zwolle?competitie=eredivisie',
      '/tegenstanders/sparta?competitie=eredivisie',
      '/tegenstanders/venlo?competitie=eredivisie',
    ])
  })

  it('sets the average as the key figure', () => {
    render(card())

    expect([...document.querySelectorAll('td.hf-key')].map((cell) => cell.textContent)).toEqual([
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
      screen.getByText('Alle 22 gespeelde wedstrijden sinds 2022/23, tegen clubs met minstens 5 gespeelde wedstrijden'),
    ).toBeTruthy()
  })

  it('says one sentence, and shows no table, when no club has five played matches', () => {
    render(
      <TopPointsCard
        address="/tegenstanders"
        choice="all"
        query=""
        records={[record('Venlo', 1, 1, 2, 3, 4)]}
        since="2022/23"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Gemiddeld resultaat' })).toBeTruthy()
    expect(screen.getByText('Nog geen club met minstens 5 gespeelde wedstrijden.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByText(/^Alle \d+ gespeelde wedstrijden/)).toBeNull()
  })
})

describe('HardestCard', () => {
  // Ten clubs of five matches: five that won them all, and Club 5 to 9 with 4 down to 0 points.
  const many = Array.from({ length: 10 }, (_, index) =>
    index < 5 ? record(`Club ${index}`, 5, 0, 0, 0, 0) : record(`Club ${index}`, 0, 9 - index, index - 4, 0, 0),
  )
  const card = (choice: 'all' | 'league' = 'all', query = '', list = many) => (
    <HardestCard address="/tegenstanders" choice={choice} query={query} records={list} since="2022/23" />
  )

  it('ranks the five lowest averages from low to high, with the caption of our points', () => {
    render(card())

    expect(screen.getByRole('heading', { level: 2, name: 'Het moeilijkst' })).toBeTruthy()
    expect(names()).toEqual(['Club 9', 'Club 8', 'Club 7', 'Club 6', 'Club 5'])
    expect(figures(1)).toEqual(['1', '2', '3', '4', '5'])
    expect(figures(2)).toEqual(['0,00', '0,20', '0,40', '0,60', '0,80'])
    expect(
      screen.getByRole('table', {
        name: 'De vijf clubs waartegen sc Heerenveen gemiddeld de minste punten per wedstrijd haalt, van laag naar hoog',
      }),
    ).toBeTruthy()
    expect(screen.getByText('P punten per wedstrijd, G gespeeld')).toBeTruthy()
    expect(screen.getByText(/^Alle 50 gespeelde wedstrijden sinds 2022\/23, tegen clubs met minstens 5/)).toBeTruthy()
  })

  it('follows the switch: Eredivisie in the caption and in every link', () => {
    render(card('league', '?competitie=eredivisie'))

    expect(screen.getByRole('table').querySelector('caption')?.textContent).toMatch(/, in de Eredivisie$/)
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))[0]).toBe(
      '/tegenstanders/club 9?competitie=eredivisie',
    )
  })

  it('is not there with fewer than ten clubs that count', () => {
    const { container } = render(card('all', '', many.slice(0, 9)))

    expect(container.textContent).toBe('')
  })
})

describe('LastWinCard', () => {
  const places = [
    { days: 2762, lastWin: '2019-04-21', name: 'FC Twente', slug: 'fc-twente' },
    { days: 985, lastWin: '2024-03-02', name: 'Ajax', slug: 'ajax' },
    { days: null, lastWin: null, name: 'Nooit FC', slug: 'nooit-fc' },
    { days: null, lastWin: null, name: 'Zonder Pagina', slug: null },
  ]

  it('shows the clubs in the order given, with the day, the days and the links keeping the choice', () => {
    const { container } = render(
      <LastWinCard address="/tegenstanders" places={places} query="?competitie=eredivisie" />,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Laatste overwinning' })).toBeTruthy()
    expect(
      screen.getByRole('table', {
        name: 'De clubs in de Eredivisie, van de langste tijd sinds onze laatste overwinning tegen hen tot de kortste',
      }),
    ).toBeTruthy()
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Club',
      'Laatste overwinning',
      'Dagen geleden',
    ])
    expect(names()).toEqual(['FC Twente', 'Ajax', 'Nooit FC', 'Zonder Pagina'])
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/tegenstanders/fc-twente?competitie=eredivisie',
      '/tegenstanders/ajax?competitie=eredivisie',
      '/tegenstanders/nooit-fc?competitie=eredivisie',
    ])
    // A club without a page is a row header that is no link.
    expect(screen.getByRole('rowheader', { name: 'Zonder Pagina' }).querySelector('a')).toBeNull()
    expect(screen.getByText('21 april 2019').getAttribute('datetime')).toBe('2019-04-21')
    expect(screen.getByText('2.762')).toBeTruthy()
    expect(screen.getAllByText('Nog nooit gewonnen')).toHaveLength(2)
    // The bar is as long as the days are of the longest wait, and a club never beaten has none.
    const bars = [...container.querySelectorAll('.hf-bar')]

    expect(bars.map((bar) => bar.getAttribute('aria-hidden'))).toEqual(['true', 'true'])
    expect(bars.map((bar) => (bar as HTMLElement).style.getPropertyValue('--hf-bar-share'))).toEqual(['100', '35.66'])
  })

  it('is not there without places', () => {
    const { container } = render(<LastWinCard address="/tegenstanders" places={undefined} query="" />)

    expect(container.textContent).toBe('')
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

describe('ClubTopScorersCard', () => {
  // The five matches of Testclub: a cup tie without a goal of ours, and in the Eredivisie one
  // 3–0 with the scorers Vroeg (a penalty), Midden and Laat, and three whose scorers we lack.
  const { matches } = testclub
  const card = (choice: 'all' | 'league', list = matches) => (
    <ClubTopScorersCard choice={choice} matches={list} name="Testclub" />
  )

  it('has the heading with the name of the club, a table with a caption for a screen reader, and the line', () => {
    render(card('league'))

    expect(screen.getByRole('heading', { level: 2, name: 'Doelpuntenmakers tegen Testclub' })).toBeTruthy()
    expect(screen.getByText('3 spelers hebben gescoord')).toBeTruthy()
    expect(
      screen.getByRole('table', {
        name: 'Doelpuntenmakers van sc Heerenveen tegen Testclub, in de Eredivisie',
      }),
    ).toBeTruthy()
    expect(screen.getAllByRole('columnheader').every((header) => header.getAttribute('scope') === 'col')).toBe(true)
    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual(['Laat, Midden, Vroeg'])
  })

  it('says how many matches have scorers only because three of the four matches of the Eredivisie lack their scorers', () => {
    render(card('league'))

    expect(screen.getByText('De doelpuntenmakers van 1 van de 4 gespeelde wedstrijden')).toBeTruthy()
  })

  it('follows the choice: with all the matches the cup tie counts, and the caption names the cup', () => {
    render(card('all'))

    expect(
      screen.getByRole('table', {
        name: 'Doelpuntenmakers van sc Heerenveen tegen Testclub, in de Eredivisie en de KNVB Beker',
      }),
    ).toBeTruthy()
    expect(screen.getByText('De doelpuntenmakers van 2 van de 5 gespeelde wedstrijden')).toBeTruthy()
    // The goal of the opponent in the cup tie is nobody's goal of ours: three share one row.
    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual(['Laat, Midden, Vroeg'])
  })

  it('says nothing about the scorers when every match has them', () => {
    const complete = matches.filter((match) => match.goals.length > 0 || match.goalsFor === 0)

    render(card('all', complete))

    expect(screen.queryByText(/^Alle \d+ gespeelde wedstrijden/)).toBeNull()
  })

  it('counts a penalty, and counts neither an own goal of an opponent nor a goal of the opponent', () => {
    const own = { ...matches[1]!.goals[0]!, ours: true, ownGoal: true, penalty: false, player: 'Eigen' }
    const theirs = { ...matches[1]!.goals[0]!, ours: false, penalty: false, player: 'Tegen' }
    const mixed: PublicClubMatch[] = [
      { ...matches[1]!, goals: [...matches[1]!.goals, own, theirs] },
      ...matches.slice(2),
    ]

    render(card('league', mixed))

    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual(['Laat, Midden, Vroeg'])
  })

  it('cuts the list to the top five, and the line says so', () => {
    // Six players with six, five, four, three, two and one goals: the sixth is left out.
    const goals = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap((player, index) =>
      Array.from({ length: 6 - index }, (_, minute) => ({
        ...matches[1]!.goals[0]!,
        minute: minute + 1,
        penalty: false,
        player,
      })),
    )
    const many: PublicClubMatch[] = [{ ...matches[1]!, goals }, ...matches.slice(2)]

    render(card('league', many))

    expect(screen.getByText('De top 5 van 6 spelers die scoorden')).toBeTruthy()
    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(
      screen.getByRole('table', {
        name: 'De top 5 van de doelpuntenmakers van sc Heerenveen tegen Testclub, in de Eredivisie',
      }),
    ).toBeTruthy()
  })

  it('has the sentence in place of the table when the chosen matches have no scorers', () => {
    const silent = matches.map((match) => ({ ...match, goals: [] }))

    render(card('league', silent))

    expect(screen.getByText('We hebben geen doelpuntenmakers van deze wedstrijden.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('ClubPlacesCard', () => {
  const places = [
    { ours: 8, season: '2025/26', theirs: 16 },
    { ours: 4, season: '2022/23', theirs: 11 },
  ]

  it('names the club in the heading and the caption, and says it counts the Eredivisie alone', () => {
    render(<ClubPlacesCard name="Testclub" places={places} />)

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('De plek van Testclub en de onze')
    expect(
      screen.getByRole('table', {
        name: 'De plek in de Eredivisie waarin Testclub en sc Heerenveen eindigden, per seizoen',
      }),
    ).toBeTruthy()
    expect(screen.getByText('Alleen de Eredivisie')).toBeTruthy()
  })

  it('has a row for each season with the seasons as row headers, in the order given', () => {
    render(<ClubPlacesCard name="Testclub" places={places} />)

    const table = screen.getByRole('table')

    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Seizoen', 'Onze plek', 'Hun plek'])
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((header) => header.textContent),
    ).toEqual(['2025/26', '2022/23'])
    expect(
      within(table)
        .getAllByRole('row')
        .slice(1)
        .map((row) =>
          within(row)
            .getAllByRole('cell')
            .map((cell) => cell.textContent),
        ),
    ).toEqual([
      ['8', '16'],
      ['4', '11'],
    ])
  })

  it('is nothing without a season in which both were in the table', () => {
    const { container } = render(<ClubPlacesCard name="Testclub" places={[]} />)

    expect(container.innerHTML).toBe('')
  })
})
