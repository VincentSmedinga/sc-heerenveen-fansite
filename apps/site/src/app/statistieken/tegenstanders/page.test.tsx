import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getEditedMatches, getMatchSeasons } from '#src/matches'
import { getClubRecords, getSourcePages } from '#src/opponents'
import { allRecords, leagueRecords, matchSeasons, sourcePages } from '#src/test-opponents'
import { withoutIcons } from '#src/without-icons'

import OpponentsPage, { generateMetadata } from './page'

/** A club with five played matches, five wins, for the tests that need a club in the top 10. */
const fiveMatchRecords = [
  {
    drawn: 0,
    goalsAgainst: 1,
    goalsFor: 10,
    id: 99,
    lost: 0,
    name: 'Vijf Winst',
    played: 5,
    slug: 'vijf-winst',
    won: 5,
  },
]

vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getEditedMatches: vi.fn(),
  getMatchSeasons: vi.fn(),
}))
vi.mock('#src/opponents', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getClubRecords: vi.fn(),
  getSourcePages: vi.fn(),
}))

const render = async (searchParams: Record<string, string | string[]> = {}) =>
  withoutIcons(renderToStaticMarkup(await OpponentsPage({ searchParams: Promise.resolve(searchParams) })))

beforeEach(() => {
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getClubRecords).mockReset()
  vi.mocked(getClubRecords).mockImplementation((choice) =>
    Promise.resolve(choice === 'league' ? leagueRecords : allRecords),
  )
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getEditedMatches).mockResolvedValue(false)
  vi.mocked(getMatchSeasons).mockResolvedValue(matchSeasons)
  vi.mocked(getSourcePages).mockReset()
  vi.mocked(getSourcePages).mockResolvedValue(sourcePages)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

/** The main column: the card Alle tegenstanders. */
const mainOf = (html: string) => html.slice(0, html.indexOf('<aside'))

/** The sidebar: the card with the top 10 and the credit. */
const sidebarOf = (html: string) => html.slice(html.indexOf('<aside'), html.indexOf('</aside>'))

/** The rows of the top 10: the place, the club and its address, the average and the matches. */
const placesOf = (html: string) =>
  [
    ...sidebarOf(html).matchAll(
      /<tr><td class="hf-numeric hf-rank">(\d+)<\/td><th scope="row"><a href="([^"]*)">(.+?)<\/a><\/th><td class="hf-numeric hf-data-table-semibold">([^<]*)<\/td><td class="hf-numeric">(\d+)<\/td><\/tr>/g,
    ),
  ].map(([, place, href, name, average, played]) => [place, name, href, average, played])

/** The rows of the table: the name of the club, its address and the figures. */
const rowsOf = (html: string) =>
  [...html.matchAll(/<tr><th scope="row"><a href="([^"]*)">(.+?)<\/a><\/th>(.*?)<\/tr>/g)].map(
    ([, href, name, cells]) => [
      name,
      href,
      [...(cells ?? '').matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(([, cell]) => cell),
    ],
  )

describe('the page /statistieken/tegenstanders', () => {
  it('has one h1, Tegenstanders, and two h2s: the card Alle tegenstanders and the top 10', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)?.map((heading) => heading.replaceAll(/<[^>]*>/g, ''))).toEqual([
      'Tegenstanders',
      'Alle tegenstanders',
      'Punten per wedstrijd',
    ])
  })

  it('lists every club A to Z, each name a link to its page, with the figures of the record', async () => {
    expect(rowsOf(await render())).toEqual([
      ['Beker United', '/statistieken/tegenstanders/beker-united', ['1', '0', '0', '1', '0', '−2']],
      ['FC Voorbeeld', '/statistieken/tegenstanders/fc-voorbeeld', ['3', '1', '1', '1', '4', '0']],
      ['Testclub', '/statistieken/tegenstanders/testclub', ['5', '3', '2', '0', '11', '+7']],
    ])
  })

  it('is a table with a caption, column headers with scope, and a line that explains the abbreviations', async () => {
    const html = await render()

    expect(html).toContain('<caption class="hf-visually-hidden">De tegenstanders van sc Heerenveen, van A tot Z')
    expect(mainOf(html).match(/<th [^>]*scope="col"/g)).toHaveLength(7)
    expect(html).toContain('<span class="hf-visually-hidden">winst</span>')
    expect(html).toContain(
      'G gespeeld, W winst, G gelijk, V verlies, P punten (3 per winst, 1 per gelijkspel), D doelsaldo',
    )
  })

  it('sends the table without buttons, because sorting needs JavaScript, and has no pagination', async () => {
    const html = await render()

    expect(html).not.toContain('<button')
    expect(html).not.toContain('aria-sort')
    expect(html).not.toContain('role="status"')
    expect(html).not.toContain('aria-label="Paginering"')
    expect(html).not.toContain('pagina=')
  })

  it('sends the names of the columns in the order of the table for every column that can be sorted', async () => {
    const html = await render()

    expect([...mainOf(html).matchAll(/<th [^>]*scope="col">(.*?)<\/th>/g)].map(([, header]) => header)).toEqual([
      'Club',
      '<abbr title="Gespeeld"><span aria-hidden="true">G</span><span class="hf-visually-hidden">gespeeld</span></abbr>',
      '<abbr title="Winst"><span aria-hidden="true">W</span><span class="hf-visually-hidden">winst</span></abbr>',
      '<abbr title="Gelijk"><span aria-hidden="true">G</span><span class="hf-visually-hidden">gelijk</span></abbr>',
      '<abbr title="Verlies"><span aria-hidden="true">V</span><span class="hf-visually-hidden">verlies</span></abbr>',
      '<abbr title="Punten"><span aria-hidden="true">P</span><span class="hf-visually-hidden">punten</span></abbr>',
      '<abbr title="Doelsaldo"><span aria-hidden="true">D</span><span class="hf-visually-hidden">doelsaldo</span></abbr>',
    ])
  })

  it('has Punten and Doelsaldo with both choices, and counts the cup in the points of Alle wedstrijden', async () => {
    const all = await render()
    const league = await render({ competitie: 'eredivisie' })
    const legend = 'G gespeeld, W winst, G gelijk, V verlies, P punten (3 per winst, 1 per gelijkspel), D doelsaldo'

    expect(all).toContain(legend)
    expect(league).toContain(legend)
    expect(mainOf(league).match(/<th [^>]*scope="col"/g)).toHaveLength(7)
    expect(rowsOf(league)).toEqual([
      [
        'FC Voorbeeld',
        '/statistieken/tegenstanders/fc-voorbeeld?competitie=eredivisie',
        ['3', '1', '1', '1', '4', '0'],
      ],
      ['Testclub', '/statistieken/tegenstanders/testclub?competitie=eredivisie', ['4', '3', '1', '0', '10', '+7']],
    ])
    // The cup tie of Testclub ended 1–1: a point more with Alle wedstrijden than in the league.
    expect(rowsOf(all).map(([name, , cells]) => [name, (cells as string[])[4]])).toEqual([
      ['Beker United', '0'],
      ['FC Voorbeeld', '4'],
      ['Testclub', '11'],
    ])
  })

  it('says how many matches the table is based on and since which season we have them', async () => {
    expect(await render()).toContain('Gebaseerd op alle 9 gespeelde wedstrijden sinds 2022/23')
  })

  it('has the switch, with the choice Alle wedstrijden current, when a cup tie was played', async () => {
    const html = await render()

    expect(html).toContain('aria-label="Welke wedstrijden"')
    expect(html).toMatch(
      /<a aria-current="page"[^>]*href="\/statistieken\/tegenstanders"[^>]*><span[^>]*>Alle wedstrijden/,
    )
    expect(html).toContain('href="/statistieken/tegenstanders?competitie=eredivisie"')
  })

  it('has no switch when no cup tie was played, because there is nothing to choose', async () => {
    vi.mocked(getClubRecords).mockResolvedValue(allRecords)

    expect(await render()).not.toContain('Welke wedstrijden')
  })

  it('counts the Eredivisie alone with ?competitie=eredivisie, leaves out a club we only met in the cup, and keeps the choice in every link', async () => {
    const html = await render({ competitie: 'eredivisie' })

    expect(rowsOf(html).map(([name]) => name)).toEqual(['FC Voorbeeld', 'Testclub'])
    expect(rowsOf(html).map(([, href]) => href)).toEqual([
      '/statistieken/tegenstanders/fc-voorbeeld?competitie=eredivisie',
      '/statistieken/tegenstanders/testclub?competitie=eredivisie',
    ])
    expect(html).toContain('Gebaseerd op alle 7 gespeelde wedstrijden in de Eredivisie sinds 2022/23')
    expect(html).toMatch(/<a aria-current="page"[^>]*><span[^>]*>Eredivisie</)
  })

  it('says under the credit that the editors entered some of the data, only while that is so', async () => {
    const sentence = 'Enkele gegevens heeft onze redactie zelf ingevuld of aangepast.'

    expect(await render()).not.toContain(sentence)

    vi.mocked(getEditedMatches).mockResolvedValue(true)

    expect(await render()).toContain(sentence)
  })

  it('credits the Wikipedia pages of the seasons we have, with the licence', async () => {
    const html = await render()

    expect(html).toContain('<summary>Bron: Wikipedia</summary>')
    expect(html).not.toMatch(/<details class="hf-meta hf-wikipedia-credit"[^>]* open/)
    expect(html).toContain('href="https://nl.wikipedia.org/wiki/Eredivisie_2022/23_(mannenvoetbal)"')
    expect(html).toContain('CC BY-SA 4.0')
  })

  it('has Alle tegenstanders on the white surface in the main column, and the top 10 on the soft one in the sidebar', async () => {
    const html = await render()

    expect(mainOf(html)).toMatch(
      /<section class="hf-card" aria-labelledby="alle-tegenstanders">|<section aria-labelledby="alle-tegenstanders" class="hf-card">/,
    )
    expect(mainOf(html)).not.toContain('hf-card-soft')
    expect(sidebarOf(html)).toMatch(
      /class="hf-card hf-card-soft[^"]*"[^>]*aria-labelledby="punten-per-wedstrijd"|aria-labelledby="punten-per-wedstrijd"[^>]*class="hf-card hf-card-soft/,
    )
  })

  it('has a sidebar with a name, the top 10 first and the credit after it', async () => {
    const sidebar = sidebarOf(await render())

    expect(sidebar).toContain('aria-label="De punten per wedstrijd en de bron"')
    expect(sidebar.indexOf('id="punten-per-wedstrijd"')).toBeLessThan(sidebar.indexOf('Bron: Wikipedia'))
    expect(mainOf(await render())).not.toContain('Bron: Wikipedia')
  })

  it('ranks the clubs with five played matches on the average points, with the minimum and the matches it counts', async () => {
    const html = await render()

    // Beker United (1 match) and FC Voorbeeld (3) are under the minimum; Testclub has 11 in 5.
    expect(placesOf(html)).toEqual([['1', 'Testclub', '/statistieken/tegenstanders/testclub', '2,20', '5']])
    expect(sidebarOf(html)).toContain(
      'Gebaseerd op alle 5 gespeelde wedstrijden sinds 2022/23, tegen clubs met minstens 5 gespeelde wedstrijden',
    )
    expect(sidebarOf(html)).toContain(
      '<caption class="hf-visually-hidden">De tien clubs waartegen sc Heerenveen gemiddeld de meeste punten per wedstrijd haalt, van hoog naar laag</caption>',
    )
    expect(sidebarOf(html)).not.toContain('<button')
  })

  it('follows the choice: with ?competitie=eredivisie no club has five matches, so there is a sentence and no table', async () => {
    const html = await render({ competitie: 'eredivisie' })

    expect(sidebarOf(html)).toContain('Nog geen club met minstens 5 gespeelde wedstrijden.')
    expect(sidebarOf(html)).not.toContain('<table')
    expect(html).toContain('id="punten-per-wedstrijd"')
  })

  it('keeps the choice in the links of the top 10', async () => {
    vi.mocked(getClubRecords).mockResolvedValue([...leagueRecords, ...fiveMatchRecords])

    const html = await render({ competitie: 'eredivisie' })

    expect(placesOf(html).map(([, name, href]) => [name, href])).toEqual([
      ['Vijf Winst', '/statistieken/tegenstanders/vijf-winst?competitie=eredivisie'],
    ])
  })

  it('keeps the top 10 when there is no club at all', async () => {
    vi.mocked(getClubRecords).mockResolvedValue([])

    const html = await render()

    expect(sidebarOf(html)).toContain('Nog geen club met minstens 5 gespeelde wedstrijden.')
  })

  it('says so, and has no table, while there is no club', async () => {
    vi.mocked(getClubRecords).mockResolvedValue([])

    const html = await render()

    expect(html).toContain('We hebben nog geen uitslagen. Kijk straks nog eens.')
    expect(html).not.toContain('<table')
  })

  it.each([['onzin'], ['Eredivisie'], ['']])('is the page "niet gevonden" for the choice %j', async (competitie) => {
    await expect(render({ competitie })).rejects.toHaveProperty('digest', expect.stringContaining('404'))
  })

  it('is the page "niet gevonden" for a choice given twice', async () => {
    await expect(render({ competitie: ['eredivisie', 'eredivisie'] })).rejects.toHaveProperty(
      'digest',
      expect.stringContaining('404'),
    )
  })

  it('shows the error page, and says why in the log, when the database cannot be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getClubRecords).mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))

    const html = await render()

    expect(html).toContain('Er ging iets mis')
    expect(html).toContain('href="/statistieken/tegenstanders"')
    expect(error).toHaveBeenCalledWith(
      'Could not read the opponents for /statistieken/tegenstanders: connect ECONNREFUSED 127.0.0.1:3306',
    )
  })

  it('has the title Tegenstanders and the canonical address of the list', async () => {
    expect(await generateMetadata()).toMatchObject({
      alternates: { canonical: 'https://sc.heerenveen.org/statistieken/tegenstanders' },
      title: 'Tegenstanders',
    })
  })

  it('says noindex in its metadata when the page failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getClubRecords).mockRejectedValue(new Error('no database'))

    expect(await generateMetadata()).toMatchObject({ robots: { index: false } })
  })
})
