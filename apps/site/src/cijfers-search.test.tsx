import type { SearchableMatch } from '@fansite/db/match-search'
import type { PublicMatch } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { cijfersSearchOf, showWords } from './cijfers-search'
import { type CompetitionChoice } from './competition'
import { type Filters, findMatches, parseFilters } from './match-search'
import { cleanSheetsOf, homeAwayOf, scoreCountsOf } from './matches'
import { HomeAwayCard, ScoreCountsView } from './MatchViews'
import { withoutIcons } from './without-icons'

// Every match is made up. The same list is a list of the search and a list of Cijfers.
let nextId = 1

function made(values: Partial<SearchableMatch>): SearchableMatch {
  const id = nextId++

  return {
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    clubCountry: null,
    clubId: 1,
    clubName: 'Testdorp FC',
    clubSlug: 'testdorp-fc',
    competition: 'Eredivisie',
    dataSource: 'wikipedia',
    dateText: null,
    extraTime: false,
    goalsAgainst: 0,
    goalsFor: 0,
    home: true,
    id,
    kickoffAt: null,
    matchDate: '2001-09-01',
    note: null,
    opponent: 'Testdorp FC',
    penaltiesAgainst: null,
    penaltiesFor: null,
    round: `Speelronde ${id}`,
    season: '2001/02',
    stadium: null,
    status: 'played',
    ...values,
  }
}

const all: SearchableMatch[] = [
  made({ goalsAgainst: 0, goalsFor: 0 }),
  made({ goalsAgainst: 0, goalsFor: 0, home: false, season: '2002/03' }),
  made({ goalsAgainst: 1, goalsFor: 3, season: '2002/03' }),
  made({ competition: 'KNVB Beker', goalsAgainst: 1, goalsFor: 1, penaltiesAgainst: 3, penaltiesFor: 4 }),
  made({ competition: 'UEFA Cup', goalsAgainst: 2, goalsFor: 1, home: false, season: '2002/03' }),
  made({ competition: 'Play-offs UEFA Cup', goalsAgainst: 0, goalsFor: 2, home: false, season: '2002/03' }),
  made({ competition: 'Eerste divisie', goalsAgainst: 0, goalsFor: 2, season: '2003/04' }),
  made({ goalsAgainst: 0, goalsFor: 5, season: '2003/04' }),
  made({ goalsAgainst: 2, goalsFor: 2, home: false, season: '2003/04' }),
]
const world = {
  clubs: [{ name: 'Testdorp FC', slug: 'testdorp-fc' }],
  countries: [],
  seasons: ['2001/02', '2002/03', '2003/04'],
}
const scopes: { choice: CompetitionChoice; season?: string }[] = [
  { choice: 'all' },
  { choice: 'all', season: '2003/04' },
  { choice: 'league' },
  { choice: 'playoffs' },
  { choice: 'playoffs', season: '2002/03' },
  { choice: 'cup' },
  { choice: 'europe', season: '2002/03' },
]

/** The number of matches the search shows for the address of a link. */
function shown(href: string) {
  const { searchParams } = new URL(href, 'https://example.test')
  const filters: Filters = parseFilters(
    Object.fromEntries([...searchParams.keys()].map((key) => [key, searchParams.getAll(key)])),
    world,
  )

  return findMatches(all, filters, undefined).length
}

describe('the links of Cijfers to the search', () => {
  it.each(scopes)('counts what the card says and what the search shows: %o', ({ choice, season }) => {
    const search = cijfersSearchOf(all, { competition: choice, season })
    const inScope = (season === undefined ? all : all.filter((match) => match.season === season)).map(
      (match) => ({ ...match, goals: [] }) as unknown as PublicMatch,
    )

    for (const { count, goalsAgainst, goalsFor } of scoreCountsOf(inScope, choice)) {
      const link = search.score(goalsFor, goalsAgainst)

      expect(link).toBeDefined()
      // A level score that a shoot-out decided is a count of its own on the card.
      expect(link!.count).toBeGreaterThanOrEqual(count)
      expect(shown(link!.href)).toBe(link!.count)
    }

    const { away, home } = homeAwayOf(inScope, choice)

    expect(search.venue('thuis')?.count ?? 0).toBe(home.played)
    expect(search.venue('uit')?.count ?? 0).toBe(away.played)
    expect(search.cleanSheets()?.count ?? 0).toBe(cleanSheetsOf(inScope, choice).matches.length)

    for (const link of [search.venue('thuis'), search.venue('uit'), search.cleanSheets(), search.biggestWins()]) {
      if (link !== undefined) {
        expect(shown(link.href)).toBe(link.count)
      }
    }

    // The search calls a level score a draw, also when a shoot-out decided it.
    const wins = scoreCountsOf(inScope, choice)
      .filter(({ goalsAgainst, goalsFor }) => goalsFor > goalsAgainst)
      .reduce((sum, { count }) => sum + count, 0)

    expect(search.biggestWins()?.count ?? 0).toBe(wins)
  })

  it('leaves out a link that finds no match', () => {
    expect(cijfersSearchOf(all, { competition: 'cup' }).score(9, 9)).toBeUndefined()
    expect(cijfersSearchOf(all, { competition: 'cup', season: '2003/04' }).cleanSheets()).toBeUndefined()
  })

  it('puts the season and the competition in the address', () => {
    expect(cijfersSearchOf(all, { competition: 'league', season: '2003/04' }).cleanSheets()?.href).toBe(
      '/wedstrijden/zoeken?van=2003%2F04&tot=2003%2F04&competitie=eredivisie&competitie=eerste-divisie&zij=0',
    )
    expect(cijfersSearchOf(all, { competition: 'all' }).biggestWins()?.href).toBe(
      '/wedstrijden/zoeken?uitslag=gewonnen&volgorde=doelsaldo',
    )
  })

  it('says what you get, with the number', () => {
    expect(showWords({ count: 111, href: '/' }, 'met 0–0')).toBe('Toon de 111 wedstrijden met 0–0')
    expect(showWords({ count: 1, href: '/' }, 'met 0–0')).toBe('Toon de wedstrijd met 0–0')
  })

  it('links each score and the sides of the card Thuis en uit, with names that say where they go', () => {
    const search = cijfersSearchOf(all, { competition: 'all' })
    const counts = scoreCountsOf(
      all.map((match) => ({ ...match, goals: [] }) as unknown as PublicMatch),
      'all',
    )
    const scores = withoutIcons(renderToStaticMarkup(<ScoreCountsView counts={counts} empty="Geen." search={search} />))
    const sides = withoutIcons(
      renderToStaticMarkup(
        <HomeAwayCard
          competition="all"
          matches={all.map((match) => ({ ...match, goals: [] }) as unknown as PublicMatch)}
          search={search}
        />,
      ),
    )

    expect(scores).toContain('href="/wedstrijden/zoeken?wij=0&amp;zij=0"')
    expect(scores).toContain(', toon de 2 wedstrijden met 0–0')
    expect(sides).toContain('Toon de 5 wedstrijden thuis')
    expect(sides).toContain('Toon de 4 wedstrijden uit')
    expect(sides).toContain('href="/wedstrijden/zoeken?waar=thuis"')
  })
})
