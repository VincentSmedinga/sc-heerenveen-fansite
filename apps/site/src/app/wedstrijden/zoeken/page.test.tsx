import type { SearchableMatch } from '@fansite/db/match-search'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { findScorerMatches, getSearchWorld } from '#src/match-search-data'
import { getReportAddresses } from '#src/report-data'
import { withoutIcons } from '#src/without-icons'

import MatchSearchPage, { generateMetadata } from './page'

// Only the reading of the database is replaced: the search, the filters and the lines are real.
vi.mock('#src/match-search-data', () => ({ findScorerMatches: vi.fn(), getSearchWorld: vi.fn() }))
vi.mock('#src/report-data', () => ({ getReportAddresses: vi.fn() }))

let nextId = 1

// Every match and club is made up.
function made(values: Partial<SearchableMatch>): SearchableMatch {
  const id = nextId++

  return {
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    clubId: 1,
    clubName: 'Testdorp FC',
    clubSlug: 'testdorp-fc',
    competition: 'Eredivisie',
    dataSource: 'wikipedia',
    dateText: null,
    extraTime: false,
    goalsAgainst: 1,
    goalsFor: 2,
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

const few = [
  made({ goalsAgainst: 1, goalsFor: 2, matchDate: '2001-09-01' }),
  made({
    clubName: 'Voorbeeld United',
    clubSlug: 'voorbeeld-united',
    goalsAgainst: 1,
    goalsFor: 1,
    home: false,
    matchDate: '2001-09-07',
    opponent: 'Voorbeeld United',
  }),
]

const world = (matches: SearchableMatch[]) => ({
  clubs: [
    { name: 'Testdorp FC', slug: 'testdorp-fc' },
    { name: 'Voorbeeld United', slug: 'voorbeeld-united' },
  ],
  matches,
  seasons: ['2001/02', '2002/03'],
})

type Query = Record<string, string | string[] | undefined>

async function render(query: Query = {}) {
  return withoutIcons(renderToStaticMarkup(await MatchSearchPage({ searchParams: Promise.resolve(query) })))
}

beforeEach(() => {
  nextId = 1
  vi.mocked(getSearchWorld).mockResolvedValue(world(few))
  vi.mocked(getReportAddresses).mockResolvedValue(new Map())
  vi.mocked(findScorerMatches).mockResolvedValue(new Set([few[0]!.id]))
})

afterEach(() => {
  vi.mocked(getSearchWorld).mockReset()
  vi.restoreAllMocks()
})

describe('the page Zoeken in wedstrijden', () => {
  it('has the heading, a GET form to its own address with a label for every filter, and no results without a choice', async () => {
    const html = await render()

    expect(html).toContain('>Zoeken in wedstrijden</h1>')
    expect(html).toMatch(/<form[^>]*action="\/wedstrijden\/zoeken#resultaten"[^>]*method="get"/u)
    for (const label of ['Tegenstander', 'Van', 'Tot', 'Doelpuntenmaker', 'Wij', 'Zij', 'Toon wedstrijden']) {
      expect(html).toContain(label)
    }
    for (const legend of ['Seizoenen', 'Thuis of uit', 'Competitie', 'Uitslag', 'Dag', 'Exacte uitslag']) {
      expect(html).toContain(`>${legend}</legend>`)
    }
    expect(html).toContain('2 clubs, op naam. Typ de eerste letters om te springen.')
    expect(html).toContain('href="/wedstrijden/zoeken">Wis alles</a>')
    expect(html).toContain('Kies wat je zoekt in de filters.')
    expect(html).toContain('Bron: Wikipedia en het archief van de oude sc Heerenveen Fansite.')
    expect(html).not.toContain('id="resultaten"')
    expect(html).toContain('<summary>Filters<')
    expect(html).toMatch(/<details class="hf-disclosure hf-filter-card" open/u)
  })

  it('has a count behind each value, and Wis alles', async () => {
    const html = await render()

    expect(html).toContain('Testdorp FC (1)')
    expect(html).toContain('hf-checkbox-group-count">1<')
    expect(html).not.toContain('Eerste divisie')
  })

  it('shows the results of a choice: the count, the sentence, a chip, the record and the match as a line', async () => {
    const html = await render({ tegen: 'testdorp-fc' })

    expect(html).toContain('<h2 class="hf-heading-2" id="resultaten">1 wedstrijd</h2>')
    expect(html).toContain('Alle wedstrijden tegen Testdorp FC, sinds 2001/02.')
    expect(html).toMatch(
      /<a href="\/wedstrijden\/zoeken" aria-label="Testdorp FC weghalen" class="hf-chip">Testdorp FC/u,
    )
    expect(html).not.toContain('required')
    expect(html).toContain('1 gewonnen · 0 gelijk · 0 verloren · doelpunten 2–1')
    expect(html).toContain('1–1 van 1')
    expect(html).toContain('>2001/02</h3>')
    expect(html).toContain('href="/tegenstanders/testdorp-fc">Alles over Testdorp FC bij Tegenstanders</a>')
    // With a choice the filters are closed on a phone.
    expect(html).toContain('<summary>Filters · 1 gekozen<')
    expect(html).not.toMatch(/<details class="hf-disclosure hf-filter-card" open/u)
  })

  it('links a match that has a report to its page', async () => {
    vi.mocked(getReportAddresses).mockResolvedValue(
      new Map([[`Eredivisie|${few[0]!.round}`, '/wedstrijden/2001-02/2001-09-01-testdorp-fc']]),
    )

    expect(await render({ tegen: 'testdorp-fc' })).toContain('href="/wedstrijden/2001-02/2001-09-01-testdorp-fc"')
  })

  it('has 25 matches to a page, with pagination that keeps the choices', async () => {
    vi.mocked(getSearchWorld).mockResolvedValue(
      world(
        Array.from({ length: 30 }, (_, index) => made({ matchDate: `2001-09-${String(index + 1).padStart(2, '0')}` })),
      ),
    )
    const html = await render({ uitslag: 'gewonnen' })

    expect(html).toContain('>30 wedstrijden</h2>')
    expect(html).toContain('1–25 van 30')
    expect(html).toContain('Pagina 1 van 2')
    expect(html).toContain('href="/wedstrijden/zoeken?uitslag=gewonnen&amp;pagina=2"')
    expect((html.match(/class="hf-match/gu) ?? []).length).toBeGreaterThanOrEqual(25)
    expect(await render({ pagina: '2', uitslag: 'gewonnen' })).toContain('26–30 van 30')
  })

  it('says "Geen wedstrijden" when nothing fits, and offers each choice to leave out with its count', async () => {
    const html = await render({ tegen: 'voorbeeld-united', uitslag: 'gewonnen' })

    expect(html).toContain('>Geen wedstrijden</h2>')
    expect(html).toContain('Laat één keuze weg:')
    expect(html).toContain('Zonder gewonnen')
    expect(html).toContain('1 wedstrijd')
    // Leaving out the club still gives a win: there is a way out.
    expect(html).toContain('Zonder Voorbeeld United')
    expect(html).not.toContain('hf-outcome-line')
  })

  it('ignores what is not known and gives the page, not an error', async () => {
    const html = await render({
      competitie: 'onzin',
      dag: 'sinterklaas',
      tegen: 'bestaat-niet',
      van: '1850/51',
      wij: '1000',
    })

    expect(html).toContain('Kies wat je zoekt in de filters.')
    expect(html).not.toContain('id="resultaten"')
  })

  it('shows the message at the field for a goalscorer that is out of bounds, and asks the database nothing for it', async () => {
    const html = await render({ doelpuntenmaker: 'a' })

    expect(html).toContain('Schrijf woorden van minstens 2 tekens.')
    expect(findScorerMatches).not.toHaveBeenCalled()
  })

  it('asks the database for the matches of a goalscorer', async () => {
    const html = await render({ doelpuntenmaker: 'Van Aken' })

    expect(findScorerMatches).toHaveBeenCalledWith(['Van', 'Aken'])
    expect(html).toContain('>1 wedstrijd</h2>')
    expect(html).toContain('Doelpunt van Van Aken')
  })

  it('says noindex in its metadata, also with a search', async () => {
    const metadata = await generateMetadata({ searchParams: Promise.resolve({ tegen: 'testdorp-fc' }) })

    expect(metadata.robots).toEqual({ follow: false, index: false })
    expect(metadata.title).toBe('Zoeken in wedstrijden')
  })

  it('shows the error page in the HTML, with a line in the log that says nothing of the search', async () => {
    vi.mocked(getSearchWorld).mockRejectedValue(new Error('connection refused'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const html = await render({ doelpuntenmaker: 'geheim' })

    expect(html).toContain('Er ging iets mis')
    expect(html).toContain('href="/wedstrijden/zoeken?doelpuntenmaker=geheim"')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Could not search for /wedstrijden/zoeken'))
    expect(JSON.stringify(log.mock.calls)).not.toContain('geheim')
    expect((await generateMetadata({ searchParams: Promise.resolve({}) })).title).toContain('Er ging iets mis')
  })
})
