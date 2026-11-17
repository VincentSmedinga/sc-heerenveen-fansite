import type { SearchableMatch } from '@fansite/db/match-search'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { CountryTally } from './countryTally'
import type { AllMatch } from './matches'

import { matchLink } from './cijfers-search'
import { countryTalliesOf } from './countryTally'
import { CountryTallyCard } from './CountryTallyCard'
import { europeValues, findMatches, parseFilters } from './match-search'
import { legendsOf } from './test-legend'
import { withoutIcons } from './without-icons'

const tallies: CountryTally[] = [
  { country: 'DE', drawn: 3, goalsAgainst: 12, goalsFor: 15, lost: 2, played: 10, won: 5 },
  { country: null, drawn: 1, goalsAgainst: 2, goalsFor: 1, lost: 1, played: 2, won: 0 },
]

const render = (rows = tallies) => withoutIcons(renderToStaticMarkup(<CountryTallyCard tallies={rows} />))

describe('CountryTallyCard', () => {
  it('has no card without a match', () => {
    expect(render([])).toBe('')
  })

  it('is a soft card named by its heading, with a real table with a caption and the same columns as Per competitie', () => {
    const html = render()

    expect(html).toContain('aria-labelledby="europa-per-land"')
    expect(html).toContain('id="europa-per-land"')
    expect(html).toContain('hf-card-soft')
    expect(html).toContain('<caption')
    expect(html).toContain('15–12')
    expect(legendsOf(html)).toEqual(['gespeeld, winst, gelijk, verlies, doelpunten (voor–tegen)'])
  })

  it('shows the country in words after its flag, and the row without a country as Land onbekend', () => {
    const html = render()

    expect(html).toContain('Duitsland')
    expect(html).toContain('hf-country-name')
    expect(html).toContain('Land onbekend')
    expect(html.indexOf('Duitsland')).toBeLessThan(html.indexOf('Land onbekend'))
  })

  it('has no link in a row without a link function', () => {
    expect(render()).not.toContain('/wedstrijden/zoeken')
  })
})

// One made-up list that is a list of the search and of Cijfers, with the same matches in both.
const made = (competition: string, country: null | string, id: number, status = 'played') =>
  ({
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    clubCountry: country,
    clubId: id,
    clubName: `Club ${id}`,
    clubSlug: `club-${id}`,
    competition,
    goalsAgainst: id % 3,
    goalsFor: 1,
    home: true,
    id,
    matchDate: `2001-09-${String(id).padStart(2, '0')}`,
    opponent: `Club ${id}`,
    opponentCountry: country,
    penaltiesAgainst: null,
    penaltiesFor: null,
    season: '2001/02',
    status,
  }) as unknown as AllMatch & SearchableMatch

const list = [
  made('UEFA Cup', 'DE', 1),
  made('Europa League', 'DE', 2),
  made('Eredivisie', 'DE', 3),
  made('KNVB Beker', 'DE', 4),
  made('UEFA Cup', 'DE', 5, 'scheduled'),
  made('Europa League', 'SE', 6),
  made('Champions League', 'BE', 7),
  made('UEFA Cup', null, 8),
  made('Eredivisie', 'FR', 9),
]
// The search only has played matches, as `listSearchableMatches` does.
const searchable = list.filter(({ status }) => status === 'played')
const link = (country: string) =>
  matchLink(searchable, { competition: 'all' }, { competitions: [...europeValues], country })
const renderLinked = () =>
  withoutIcons(renderToStaticMarkup(<CountryTallyCard matchLink={link} tallies={countryTalliesOf(list)} />))

describe('CountryTallyCard links', () => {
  it('finds as many matches behind the link of a row as the row has played, for every country', () => {
    const rows = countryTalliesOf(list).filter(({ country }) => country !== null)

    expect(rows.map(({ country }) => country)).toEqual(expect.arrayContaining(['DE', 'SE', 'BE']))
    for (const { country, played } of rows) {
      const found = link(country as string)

      expect(found?.count).toBe(played)

      const filters = parseFilters(Object.fromEntries(new URL(found?.href ?? '', 'https://x.test').searchParams), {
        clubs: [],
        countries: ['BE', 'DE', 'SE'],
        seasons: ['2001/02'],
      })

      expect(findMatches(searchable, filters, undefined)).toHaveLength(played)
    }
  })

  it('links a row to the search with its country and Europa chosen, and nothing else', () => {
    const html = renderLinked()

    expect(html).toContain('href="/wedstrijden/zoeken?land=DE&amp;competitie=europa"')
  })

  it('names each link by its country and where it goes, for a screen reader', () => {
    const html = renderLinked()

    expect(html).toContain(', toon de 2 wedstrijden in europa tegen clubs uit duitsland')
    expect(html).toContain(', toon de wedstrijd in europa tegen clubs uit zweden')
  })

  it('leaves the row Land onbekend without a link, and a country without a found match too', () => {
    const html = renderLinked()
    const unknown = html.slice(html.indexOf('Land onbekend') - 200)

    expect(unknown).not.toContain('href')
    expect(
      withoutIcons(renderToStaticMarkup(<CountryTallyCard matchLink={() => undefined} tallies={tallies} />)),
    ).not.toContain('/wedstrijden/zoeken')
  })
})
