// @vitest-environment jsdom
import type { PublicClubMatch, PublicClubRecord } from '@fansite/db/queries'

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import type { Meeting } from './opponents'

import { matchPageKey } from './match-pages'
import {
  ClubMeetingsCard,
  ClubPlacesCard,
  ClubsCard,
  ClubScoreCountsCard,
  ClubTopScorersCard,
  HardestCard,
  LastWinCard,
  TopPointsCard,
} from './OpponentViews'
import { legendsOf } from './test-legend'
import { testclub } from './test-opponents'

const record = (
  name: string,
  won: number,
  drawn: number,
  lost: number,
  goalsFor: number,
  goalsAgainst: number,
): PublicClubRecord => ({
  country: null,
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

  it('shows the flag of the country before the name, as decoration in a link named by the club', () => {
    render(
      <ClubsCard
        address="/tegenstanders"
        choice="all"
        query=""
        records={records.map((entry, index) => ({ ...entry, country: index === 0 ? 'NL' : index === 1 ? 'DE' : null }))}
        since="2022/23"
      />,
    )

    const links = screen.getAllByRole('link')

    expect(links.map((link) => link.textContent)).toEqual(['Sparta', 'Venlo', 'Zwolle'])
    expect(links[0]?.getAttribute('href')).toBe('/tegenstanders/sparta')
    expect(document.querySelectorAll('tbody img.hf-player-name-flag')).toHaveLength(2)
    expect(
      [...document.querySelectorAll('tbody img.hf-player-name-flag')].every((img) => img.getAttribute('alt') === ''),
    ).toBe(true)
    // The club without a country has an empty place of the same width, and no picture.
    expect(document.querySelectorAll('tbody span.hf-player-name-flag')).toHaveLength(1)
    // The country is read once, after the link, in words for a screen reader.
    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual([
      'Sparta, Nederland',
      'Venlo, Duitsland',
      'Zwolle',
    ])
  })

  it('has the same columns with the choice Eredivisie', () => {
    render(card('league'))

    expect(screen.getAllByRole('columnheader')).toHaveLength(7)
    expect(screen.getByRole('button', { name: 'punten' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'doelsaldo' })).toBeTruthy()
  })

  it('puts the club with the highest goal difference on top on the first click on doelsaldo, not the one with most goals', () => {
    render(card())
    fireEvent.click(screen.getByRole('button', { name: 'doelsaldo' }))

    expect(names()).toEqual(['Zwolle', 'Sparta', 'Venlo'])
    expect(screen.getByRole('columnheader', { name: 'doelsaldo' }).getAttribute('aria-sort')).toBe('descending')
    expect(screen.getByRole('status').textContent).toBe('Gesorteerd op Doelsaldo, van hoog naar laag')

    fireEvent.click(screen.getByRole('button', { name: 'doelsaldo' }))

    expect(names()).toEqual(['Venlo', 'Sparta', 'Zwolle'])
  })
})

/**
 * Eleven clubs of ten played matches: Club 00 won none, Club 10 won them all, so Club 10 is the
 * easiest and Club 00 the hardest, from 0,00 to 3,00 points per match in steps of 0,30. The
 * matches at home are the other way round, and the ones away have no club of ten matches.
 */
const ladder = (order: (index: number) => number) =>
  Array.from({ length: 11 }, (_, index) =>
    record(`Club ${String(index).padStart(2, '0')}`, order(index), 0, 10 - order(index), 0, 0),
  )
const venueRecords = {
  all: ladder((index) => index),
  away: ladder((index) => index).slice(0, 4),
  home: ladder((index) => 10 - index),
}

/** The names in the rows of a table, in order. */
const namesIn = (table: Element | null) => [...(table?.querySelectorAll('tbody th') ?? [])].map((th) => th.textContent)
const tables = () => [...document.querySelectorAll('table')]
const chooseVenue = (name: 'Alle' | 'Thuis' | 'Uit') => fireEvent.click(screen.getByRole('button', { name }))

describe.each([
  {
    caption: 'waartegen sc Heerenveen gemiddeld de meeste punten per wedstrijd haalt, van hoog naar laag',
    firstFive: ['Club 10', 'Club 09', 'Club 08', 'Club 07', 'Club 06'],
    homeFirst: 'Club 00',
    id: 'het-makkelijkst',
    make: (props: { choice?: 'all' | 'league'; query?: string; records?: typeof venueRecords }) => (
      <TopPointsCard
        address="/tegenstanders"
        choice={props.choice ?? 'all'}
        query={props.query ?? ''}
        records={props.records ?? venueRecords}
        since="2022/23"
      />
    ),
    nextFive: ['Club 05', 'Club 04', 'Club 03', 'Club 02', 'Club 01'],
    points: ['3,00', '2,70', '2,40', '2,10', '1,80'],
    title: 'Het makkelijkst',
  },
  {
    caption: 'waartegen sc Heerenveen gemiddeld de minste punten per wedstrijd haalt, van laag naar hoog',
    firstFive: ['Club 00', 'Club 01', 'Club 02', 'Club 03', 'Club 04'],
    homeFirst: 'Club 10',
    id: 'het-moeilijkst',
    make: (props: { choice?: 'all' | 'league'; query?: string; records?: typeof venueRecords }) => (
      <HardestCard
        address="/tegenstanders"
        choice={props.choice ?? 'all'}
        query={props.query ?? ''}
        records={props.records ?? venueRecords}
        since="2022/23"
      />
    ),
    nextFive: ['Club 05', 'Club 06', 'Club 07', 'Club 08', 'Club 09'],
    points: ['0,00', '0,30', '0,60', '0,90', '1,20'],
    title: 'Het moeilijkst',
  },
])('$title', ({ caption, firstFive, homeFirst, id, make, nextFive, points, title }) => {
  it('has the title as its heading, with the anchor of the title, and says what the figure is', () => {
    render(make({}))

    const heading = screen.getByRole('heading', { level: 2, name: title })

    expect(heading.id).toBe(id)
    expect(screen.getByText('Gemiddeld aantal punten per wedstrijd')).toBeTruthy()
  })

  it('shows the first five places with two decimals and a comma, and the next five behind "Toon 5 meer"', () => {
    render(make({}))

    const [first, second] = tables()

    expect(namesIn(first ?? null)).toEqual(firstFive)
    expect([...(first?.querySelectorAll('tbody td:nth-of-type(1)') ?? [])].map((cell) => cell.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ])
    expect([...(first?.querySelectorAll('td.hf-key') ?? [])].map((cell) => cell.textContent)).toEqual(points)
    expect(first?.querySelector('caption')?.textContent).toBe(`De vijf clubs ${caption}`)

    const fold = screen.getByText('Toon 5 meer').closest('details')

    expect(fold?.hasAttribute('open')).toBe(false)
    expect(fold?.contains(second ?? null)).toBe(true)
    expect(namesIn(second ?? null)).toEqual(nextFive)
    expect(second?.querySelector('caption')?.textContent).toBe(`De volgende vijf clubs ${caption}`)
    expect([...(second?.querySelectorAll('tbody td:nth-of-type(1)') ?? [])].map((cell) => cell.textContent)).toEqual([
      '6',
      '7',
      '8',
      '9',
      '10',
    ])
  })

  it('cannot be sorted, and has real column headers and a link named by the club', () => {
    render(make({}))

    expect(document.querySelector('[aria-sort]')).toBeNull()
    expect([...(tables()[0]?.querySelectorAll('thead th') ?? [])].map((header) => header.textContent)).toEqual([
      '#plaats',
      'Club',
      'punten per wedstrijd',
      'gespeeld',
    ])
    expect(screen.getByRole('link', { name: firstFive[0] ?? '' }).getAttribute('href')).toBe(
      `/tegenstanders/${(firstFive[0] ?? '').toLowerCase()}`,
    )
  })

  it('has the choice Alle, Thuis and Uit, with Alle pressed, in a group named after the card', () => {
    render(make({}))

    const group = screen.getByRole('group', { name: `${title}: waar we speelden` })

    expect(
      within(group)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Alle', 'Thuis', 'Uit'])
    expect(screen.getByRole('button', { name: 'Alle' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Thuis' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('shows the matches at home for Thuis, and names the choice in the caption and the line under it', () => {
    render(make({}))
    chooseVenue('Thuis')

    expect(screen.getByRole('button', { name: 'Thuis' }).getAttribute('aria-pressed')).toBe('true')
    expect(namesIn(tables()[0] ?? null)[0]).toBe(homeFirst)
    expect(tables()[0]?.querySelector('caption')?.textContent).toBe(`De vijf clubs ${caption}, thuis`)
    expect(screen.getByText('Sinds 2022/23, tegen clubs met minstens 5 gespeelde thuiswedstrijden')).toBeTruthy()

    chooseVenue('Alle')

    expect(namesIn(tables()[0] ?? null)).toEqual(firstFive)
    expect(screen.getByText('Sinds 2022/23, tegen clubs met minstens 5 gespeelde wedstrijden')).toBeTruthy()
  })

  it('says one sentence, and shows no table, for a choice with fewer than ten clubs that count', () => {
    render(make({}))
    chooseVenue('Uit')

    expect(screen.getByText('Nog geen 10 clubs met minstens 5 gespeelde uitwedstrijden.')).toBeTruthy()
    expect(tables()).toEqual([])
    expect(screen.queryByText('Toon 5 meer')).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeTruthy()
  })

  it('names the Eredivisie in the caption, and keeps the choice in every link', () => {
    render(make({ choice: 'league', query: '?competitie=eredivisie' }))

    expect(tables()[0]?.querySelector('caption')?.textContent).toBe(`De vijf clubs ${caption}, in de Eredivisie`)
    expect(
      [...document.querySelectorAll('a')].every((link) =>
        link.getAttribute('href')?.endsWith('?competitie=eredivisie'),
      ),
    ).toBe(true)
  })

  it('names the legend and what the card is based on', () => {
    render(make({}))

    expect(legendsOf(document.body.innerHTML)).toEqual(['punten per wedstrijd, gespeeld'])
    expect(screen.getByText('Sinds 2022/23, tegen clubs met minstens 5 gespeelde wedstrijden')).toBeTruthy()
  })

  it('shows Alle and no buttons without JavaScript, since the buttons would do nothing', () => {
    const html = renderToString(make({}))

    expect(html).toContain(`id="${id}"`)
    expect(html).not.toContain('aria-pressed')
    expect(html).not.toContain('<button')
    expect(html).toContain(firstFive[0])
    expect(html).toContain('Toon 5 meer')
  })
})

describe('LastWinCard', () => {
  const places = [
    { days: 2762, lastWin: '2019-04-21', name: 'FC Twente', slug: 'fc-twente' },
    { days: 985, lastWin: '2024-03-02', name: 'Ajax', slug: 'ajax' },
    { days: null, lastWin: null, name: 'Nooit FC', slug: 'nooit-fc' },
    { days: null, lastWin: null, name: 'Zonder Pagina', slug: null },
  ]

  it('shows the clubs in the order given, with the days and the links keeping the choice', () => {
    const { container } = render(
      <LastWinCard address="/tegenstanders" places={places} query="?competitie=eredivisie" />,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Laatste overwinning' })).toBeTruthy()
    expect(screen.getByText('Alleen wedstrijden in de Eredivisie tellen.')).toBeTruthy()
    expect(
      screen.getByRole('table', {
        name: 'De clubs in de Eredivisie, van de langste tijd sinds onze laatste overwinning tegen hen tot de kortste',
      }),
    ).toBeTruthy()
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Club', 'Dagen geleden'])
    expect(names()).toEqual(['FC Twente', 'Ajax', 'Nooit FC', 'Zonder Pagina'])
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/tegenstanders/fc-twente?competitie=eredivisie',
      '/tegenstanders/ajax?competitie=eredivisie',
      '/tegenstanders/nooit-fc?competitie=eredivisie',
    ])
    // A club without a page is a row header that is no link.
    expect(screen.getByRole('rowheader', { name: 'Zonder Pagina' }).querySelector('a')).toBeNull()
    // The date of the last win is not on the card.
    expect(container.querySelector('time')).toBeNull()
    expect(screen.queryByText('21 april 2019')).toBeNull()
    // The days are aligned to the end, with the bar after them, in the same cell.
    const cell = screen.getByText('2.762', { exact: false }).closest('td')

    expect(cell?.className).toBe('hf-numeric')
    expect(cell?.textContent).toBe('2.762')
    expect(cell?.lastElementChild?.className).toBe('hf-bar')
    expect(screen.getByRole('columnheader', { name: 'Dagen geleden' }).className).toBe('hf-numeric')
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

describe('ClubMeetingsCard', () => {
  const meetings = testclub.matches.filter(
    (match): match is Meeting => match.goalsFor !== null && match.goalsAgainst !== null,
  )

  it('makes the line of a match with a page the link to it, and leaves the other lines plain', () => {
    const [first] = meetings
    const pages = new Map([
      [matchPageKey(first!), { href: '/wedstrijden/2026-27/een-dag-testclub', live: false, preview: false }],
    ])
    const { container } = render(
      <ClubMeetingsCard meetings={meetings} now={new Date('2026-11-16T12:00:00Z')} pages={pages} upcoming={[]} />,
    )
    const links = [...container.querySelectorAll('a.hf-match-link')]

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/wedstrijden/2026-27/een-dag-testclub'])
    expect(links[0]?.textContent).toMatch(/, verslag$/)
    expect(container.textContent).not.toContain('Het verslag')
  })

  it('has no link for a line when the pages could not be read', () => {
    const { container } = render(
      <ClubMeetingsCard meetings={meetings} now={new Date('2026-11-16T12:00:00Z')} upcoming={[]} />,
    )

    expect(container.querySelector('a.hf-match-link')).toBeNull()
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
    ).toEqual(['Competitie', 'gespeeld'])
    expect(
      within(table)
        .getAllByRole('row')
        .map((row) => row.textContent),
    ).toEqual(['Competitiegespeeld', 'Eredivisie4', 'KNVB Beker1'])
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
