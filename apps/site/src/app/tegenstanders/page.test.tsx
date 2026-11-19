import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getEditedMatches, getMatchSeasons, getMatchSource } from '#src/matches'
import { getClubRecords, getLastWinPlaces, getSourcePages } from '#src/opponents'
import { legendsOf } from '#src/test-legend'
import { allRecords, cupRecords, leagueRecords, matchSeasons, sourcePages } from '#src/test-opponents'
import { withoutIcons } from '#src/without-icons'

import OpponentsPage, { generateMetadata } from './page'

/**
 * Ten clubs of five played matches, for the tests that need the cards Het makkelijkst and Het
 * moeilijkst to have places: Club 5 won all, Club 0 and Club 6 none, and Club 3 and Club 9 are
 * level.
 */
const tenRecords = Array.from({ length: 10 }, (_, index) => ({
  country: null,
  drawn: 0,
  goalsAgainst: 0,
  goalsFor: 0,
  id: 100 + index,
  lost: 5 - (index % 6),
  name: `Club ${index}`,
  played: 5,
  slug: `club-${index}`,
  won: index % 6,
}))

vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getEditedMatches: vi.fn(),
  getMatchSeasons: vi.fn(),
  getMatchSource: vi.fn(),
}))
vi.mock('#src/opponents', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getClubRecords: vi.fn(),
  getLastWinPlaces: vi.fn(),
  getSourcePages: vi.fn(),
}))

const render = async (searchParams: Record<string, string | string[]> = {}) =>
  withoutIcons(renderToStaticMarkup(await OpponentsPage({ searchParams: Promise.resolve(searchParams) })))

beforeEach(() => {
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getClubRecords).mockReset()
  vi.mocked(getClubRecords).mockImplementation((choice) =>
    Promise.resolve({ all: allRecords, cup: cupRecords, europe: [], league: leagueRecords, playoffs: [] }[choice]),
  )
  vi.mocked(getLastWinPlaces).mockReset()
  vi.mocked(getLastWinPlaces).mockResolvedValue(undefined)
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getEditedMatches).mockResolvedValue(false)
  vi.mocked(getMatchSeasons).mockResolvedValue(matchSeasons)
  vi.mocked(getMatchSource).mockResolvedValue('wikipedia')
  vi.mocked(getSourcePages).mockReset()
  vi.mocked(getSourcePages).mockResolvedValue(sourcePages)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

/** The main column: the card Alle tegenstanders. */
const mainOf = (html: string) => html.slice(0, html.indexOf('<section class="hf-page-section"'))

/** The side section: the card with the top 10 and the credit. */
const sidebarOf = (html: string) =>
  html.slice(html.indexOf('<section class="hf-page-section"'), html.indexOf('</main>'))

/** The rows of the top 10: the place, the club and its address, the average and the matches. */
const placesOf = (html: string) =>
  [
    ...sidebarOf(html).matchAll(
      /<tr><td class="hf-numeric hf-rank">(\d+)<\/td><th scope="row"><a href="([^"]*)">(.+?)<\/a><\/th><td class="hf-numeric hf-key">([^<]*)<\/td><td class="hf-numeric">(\d+)<\/td><\/tr>/g,
    ),
  ].map(([, place, href, name, average, played]) => [place, name, href, average, played])

/** The rows of the table: the name of the club (after its flag), its address, the figures. */
const rowsOf = (html: string) =>
  [
    ...html.matchAll(
      /<tr><th scope="row"><span[^>]*><a class="hf-player-name-link" href="([^"]*)">(?:<img[^>]*\/>|<span class="hf-player-name-flag"><\/span>)?<span class="hf-player-name-text">(.+?)<\/span><\/a><\/span>(?:<span class="hf-visually-hidden">[^<]*<\/span>)?<\/th>(.*?)<\/tr>/g,
    ),
  ].map(([, href, name, cells]) => [
    (name ?? '').replaceAll(/<[^>]*>/g, ''),
    href,
    [...(cells ?? '').matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(([, cell]) => cell),
  ])

describe('the page /tegenstanders', () => {
  it('has one h1, Tegenstanders, and three h2s: the card Alle tegenstanders, Het makkelijkst and Het moeilijkst', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)?.map((heading) => heading.replaceAll(/<[^>]*>/g, ''))).toEqual([
      'Tegenstanders',
      'Alle tegenstanders',
      'Het makkelijkst',
      'Het moeilijkst',
    ])
  })

  it('has the card Laatste overwinning after the top 10 and before the credit, when there are places', async () => {
    vi.mocked(getLastWinPlaces).mockResolvedValue([
      { days: 2762, lastWin: '2019-04-21', name: 'FC Twente', slug: 'fc-twente' },
      { days: null, lastWin: null, name: 'Ajax', slug: 'ajax' },
    ])

    const html = await render({ competitie: 'eredivisie' })

    expect(html.indexOf('id="het-makkelijkst"')).toBeLessThan(html.indexOf('id="laatste-overwinning"'))
    expect(html.indexOf('id="laatste-overwinning"')).toBeLessThan(html.indexOf('Wikipedia'))
    expect(html).toContain('href="/tegenstanders/fc-twente?competitie=eredivisie"')
    expect(html).toContain('Nog nooit gewonnen')
    expect(html).toContain('Alleen wedstrijden in de Eredivisie tellen.')
  })

  it('has no card Laatste overwinning without places', async () => {
    expect(await render()).not.toContain('laatste-overwinning')
  })

  it('lists every club A to Z, each name a link to its page, with the figures of the record', async () => {
    expect(rowsOf(await render())).toEqual([
      ['Beker United', '/tegenstanders/beker-united', ['1', '0', '0', '1', '0', '−2']],
      ['FC Voorbeeld', '/tegenstanders/fc-voorbeeld', ['3', '1', '1', '1', '4', '0']],
      ['Testclub', '/tegenstanders/testclub', ['5', '3', '2', '0', '11', '+7']],
    ])
  })

  it('is a table with a caption, column headers with scope, and a line that explains the abbreviations', async () => {
    vi.mocked(getClubRecords).mockResolvedValue([...allRecords, ...tenRecords])

    const html = await render()

    expect(html).toContain('<caption class="hf-visually-hidden">De tegenstanders van sc Heerenveen, van A tot Z')
    expect(mainOf(html).match(/<th [^>]*scope="col"/g)).toHaveLength(7)
    expect(html).toContain('<span class="hf-visually-hidden">winst</span>')
    expect(legendsOf(html)).toEqual([
      'gespeeld, winst, gelijk, verlies, punten (3 per winst, 1 per gelijkspel), doelsaldo',
      'punten per wedstrijd, gespeeld',
      'punten per wedstrijd, gespeeld',
    ])
  })

  it('sends the table without buttons, because sorting needs JavaScript, and has no pagination', async () => {
    const html = await render()

    expect(html).not.toContain('<button')
    expect(html).not.toContain('aria-sort')
    // The only lines for a screen reader are the empty ones of the switches (see `SwitchLinks`
    // and `VenueSwitch`), and not the one of the sort.
    expect(html.replaceAll('<p class="hf-visually-hidden" role="status"></p>', '')).not.toContain('role="status"')
    expect(html).not.toContain('aria-label="Paginering"')
    expect(html).not.toContain('pagina=')
  })

  it('sends the names of the columns in the order of the table for every column that can be sorted', async () => {
    const html = await render()

    expect([...mainOf(html).matchAll(/<th [^>]*scope="col">(.*?)<\/th>/g)].map(([, header]) => header)).toEqual([
      'Club',
      '<span title="Gespeeld"><span class="hf-visually-hidden">gespeeld</span></span>',
      '<span title="Winst"><span class="hf-visually-hidden">winst</span></span>',
      '<span title="Gelijk"><span class="hf-visually-hidden">gelijk</span></span>',
      '<span title="Verlies"><span class="hf-visually-hidden">verlies</span></span>',
      '<span title="Punten"><span class="hf-visually-hidden">punten</span></span>',
      '<span title="Doelsaldo"><span class="hf-visually-hidden">doelsaldo</span></span>',
    ])
  })

  it('has Punten and Doelsaldo with both choices, and counts the cup in the points of Alle wedstrijden', async () => {
    const all = await render()
    const league = await render({ competitie: 'eredivisie' })
    const legend = 'gespeeld, winst, gelijk, verlies, punten (3 per winst, 1 per gelijkspel), doelsaldo'

    expect(legendsOf(all)).toContain(legend)
    expect(legendsOf(league)).toContain(legend)
    expect(mainOf(league).match(/<th [^>]*scope="col"/g)).toHaveLength(7)
    expect(rowsOf(league)).toEqual([
      ['FC Voorbeeld', '/tegenstanders/fc-voorbeeld?competitie=eredivisie', ['3', '1', '1', '1', '4', '0']],
      ['Testclub', '/tegenstanders/testclub?competitie=eredivisie', ['4', '3', '1', '0', '10', '+7']],
    ])
    // The cup tie of Testclub ended 1–1: a point more with Alle wedstrijden than in the league.
    expect(rowsOf(all).map(([name, , cells]) => [name, (cells as string[])[4]])).toEqual([
      ['Beker United', '0'],
      ['FC Voorbeeld', '4'],
      ['Testclub', '11'],
    ])
  })

  it('says how many matches the table is based on and since which season we have them', async () => {
    expect(await render()).toContain('Sinds 2022/23')
  })

  it('has the switch, with the choice Alles current, when a cup tie was played', async () => {
    const html = await render()

    expect(html).toContain('aria-label="Welke wedstrijden"')
    expect(html).toMatch(/<a aria-current="page"[^>]*href="\/tegenstanders"[^>]*><span[^>]*>Alles/)
    expect(html).toContain('href="/tegenstanders?competitie=eredivisie"')
    expect(html).toContain('href="/tegenstanders?competitie=beker"')
    // Nothing was played in Europe, so that choice is not offered.
    expect(html).not.toContain('competitie=europa')
  })

  it('has no switch when no cup tie was played, because there is nothing to choose', async () => {
    vi.mocked(getClubRecords).mockImplementation((choice) =>
      Promise.resolve({ all: leagueRecords, cup: [], europe: [], league: leagueRecords, playoffs: [] }[choice]),
    )

    expect(await render()).not.toContain('Welke wedstrijden')
  })

  it('counts the Eredivisie alone with ?competitie=eredivisie, leaves out a club we only met in the cup, and keeps the choice in every link', async () => {
    const html = await render({ competitie: 'eredivisie' })

    expect(rowsOf(html).map(([name]) => name)).toEqual(['FC Voorbeeld', 'Testclub'])
    expect(rowsOf(html).map(([, href]) => href)).toEqual([
      '/tegenstanders/fc-voorbeeld?competitie=eredivisie',
      '/tegenstanders/testclub?competitie=eredivisie',
    ])
    expect(html).toContain('Alleen de Eredivisie, sinds 2022/23')
    expect(html).toMatch(/<a aria-current="page"[^>]*><span[^>]*>Competitie</)
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

  it('credits the archive of the old fansite next to Wikipedia when the database has matches from both', async () => {
    vi.mocked(getMatchSource).mockResolvedValue('both')

    const html = await render()

    expect(html).toContain('<summary>Bron: Wikipedia en sc Heerenveen Fansite</summary>')
  })

  it('has no credit when the matches are all ours and no season has a page of Wikipedia', async () => {
    vi.mocked(getMatchSource).mockResolvedValue('archive')
    vi.mocked(getSourcePages).mockResolvedValue([])

    const html = await render()

    expect(html).not.toContain('Bron: ')
  })

  it('has Alle tegenstanders on the white surface in the main column, and the top 10 on the soft one in the side section', async () => {
    const html = await render()

    expect(mainOf(html)).toMatch(
      /<section class="hf-card" aria-labelledby="alle-tegenstanders">|<section aria-labelledby="alle-tegenstanders" class="hf-card">/,
    )
    expect(mainOf(html)).not.toContain('hf-card-soft')
    expect(sidebarOf(html)).toMatch(
      /class="hf-card hf-card-soft[^"]*"[^>]*aria-labelledby="het-makkelijkst"|aria-labelledby="het-makkelijkst"[^>]*class="hf-card hf-card-soft/,
    )
  })

  it('has a side section with a name, the top 10 first and the credit after it', async () => {
    const sidebar = sidebarOf(await render())

    expect(sidebar).toContain('aria-label="Het makkelijkst, het moeilijkst en de bron"')
    expect(sidebar.indexOf('id="het-makkelijkst"')).toBeLessThan(sidebar.indexOf('Bron: Wikipedia'))
    expect(mainOf(await render())).not.toContain('Bron: Wikipedia')
  })

  it('ranks the clubs with five played matches on the average points, with the minimum and the matches it counts', async () => {
    vi.mocked(getClubRecords).mockResolvedValue([...allRecords, ...tenRecords])

    const html = await render()

    // Beker United (1 match) and FC Voorbeeld (3) are under the minimum; Testclub has 11 in 5.
    // The first five places of Het makkelijkst: Club 5, Club 4, Testclub, then the level Club 3
    // and Club 9.
    expect(placesOf(html).slice(0, 5)).toEqual([
      ['1', 'Club 5', '/tegenstanders/club-5', '3,00', '5'],
      ['2', 'Club 4', '/tegenstanders/club-4', '2,40', '5'],
      ['3', 'Testclub', '/tegenstanders/testclub', '2,20', '5'],
      ['4', 'Club 3', '/tegenstanders/club-3', '1,80', '5'],
      ['5', 'Club 9', '/tegenstanders/club-9', '1,80', '5'],
    ])
    expect(sidebarOf(html)).toContain('Gemiddeld aantal punten per wedstrijd')
    expect(sidebarOf(html)).toContain('Sinds 2022/23, tegen clubs met minstens 5 gespeelde wedstrijden')
    expect(sidebarOf(html)).toContain(
      '<caption class="hf-visually-hidden">De vijf clubs waartegen sc Heerenveen gemiddeld de meeste punten per wedstrijd haalt, van hoog naar laag</caption>',
    )
    expect(sidebarOf(html)).toContain('Toon 5 meer')
    // Without JavaScript the buttons would do nothing, so there are none.
    expect(sidebarOf(html)).not.toContain('<button')
  })

  it('follows the choice: with ?competitie=eredivisie no club has five matches, so there is a sentence and no table', async () => {
    const html = await render({ competitie: 'eredivisie' })

    expect(sidebarOf(html)).toContain('Nog geen 10 clubs met minstens 5 gespeelde wedstrijden.')
    expect(sidebarOf(html)).not.toContain('<table')
    expect(html).toContain('id="het-makkelijkst"')
    expect(html).toContain('id="het-moeilijkst"')
  })

  it('keeps the choice in the links of the top 10', async () => {
    vi.mocked(getClubRecords).mockResolvedValue([...leagueRecords, ...tenRecords])

    const html = await render({ competitie: 'eredivisie' })

    expect(
      placesOf(html)
        .slice(0, 2)
        .map(([, name, href]) => [name, href]),
    ).toEqual([
      ['Club 5', '/tegenstanders/club-5?competitie=eredivisie'],
      ['Club 4', '/tegenstanders/club-4?competitie=eredivisie'],
    ])
  })

  it('reads the matches at home and away for the choice of the page, for the switch of the cards', async () => {
    await render({ competitie: 'eredivisie' })

    expect(getClubRecords).toHaveBeenCalledWith('league', 'home')
    expect(getClubRecords).toHaveBeenCalledWith('league', 'away')
  })

  it('shows the error page, and says why in the log, when only the matches at home cannot be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getClubRecords).mockImplementation((_choice, venue) =>
      venue === 'home' ? Promise.reject(new Error('no home')) : Promise.resolve(allRecords),
    )

    expect(await render()).toContain('Er ging iets mis')
    expect(error).toHaveBeenCalledWith('Could not read the opponents at home and away for /tegenstanders: no home')
  })

  it('keeps the top 10 when there is no club at all', async () => {
    vi.mocked(getClubRecords).mockResolvedValue([])

    const html = await render()

    expect(sidebarOf(html)).toContain('Nog geen 10 clubs met minstens 5 gespeelde wedstrijden.')
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
    expect(html).toContain('href="/tegenstanders"')
    expect(error).toHaveBeenCalledWith(
      'Could not read the opponents for /tegenstanders: connect ECONNREFUSED 127.0.0.1:3306',
    )
  })

  it('has the title Tegenstanders and the canonical address of the list', async () => {
    expect(await generateMetadata()).toMatchObject({
      alternates: { canonical: 'https://sc.heerenveen.org/tegenstanders' },
      title: 'Tegenstanders',
    })
  })

  it('says noindex in its metadata when the page failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getClubRecords).mockRejectedValue(new Error('no database'))

    expect(await generateMetadata()).toMatchObject({ robots: { index: false } })
  })
})
