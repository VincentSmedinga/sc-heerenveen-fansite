import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchSeasons } from '../../../matches'
import { getClubRecords, getSourcePages } from '../../../opponents'
import { allRecords, leagueRecords, matchSeasons, sourcePages } from '../../../test-opponents'
import { withoutIcons } from '../../../without-icons'
import OpponentsPage, { generateMetadata } from './page'

vi.mock('../../../matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchSeasons: vi.fn(),
}))
vi.mock('../../../opponents', async (importOriginal) => ({
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
  vi.mocked(getMatchSeasons).mockResolvedValue(matchSeasons)
  vi.mocked(getSourcePages).mockReset()
  vi.mocked(getSourcePages).mockResolvedValue(sourcePages)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

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
  describe('the line "Laatst gewijzigd"', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      // Monday 26 October 2026 in the Netherlands.
      vi.setSystemTime(new Date('2026-10-26T13:40:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('is the last line of the card, with the newest page of every season', async () => {
      const html = await render()

      expect(
        html.includes(
          '<p class="hf-meta" data-hf-card-share="">Laatst gewijzigd: <time dateTime="2026-10-25T07:00:00.000Z">zo 08:00</time></p></section>',
        ),
      ).toBe(true)
    })

    it('is not there when none of the pages has a version', async () => {
      vi.mocked(getSourcePages).mockResolvedValue(sourcePages.map((page) => ({ ...page, version: null })))

      expect(await render()).not.toContain('Laatst gewijzigd')
    })

    it('is not there without a club, which says "Kijk straks nog eens"', async () => {
      vi.mocked(getClubRecords).mockResolvedValue([])

      expect(await render()).not.toContain('Laatst gewijzigd')
    })
  })

  it('has one h1, Tegenstanders, and one h2, the card Alle tegenstanders', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)?.map((heading) => heading.replaceAll(/<[^>]*>/g, ''))).toEqual([
      'Tegenstanders',
      'Alle tegenstanders',
    ])
  })

  it('lists every club A to Z, each name a link to its page, with the figures of the record', async () => {
    expect(rowsOf(await render())).toEqual([
      ['Beker United', '/statistieken/tegenstanders/beker-united', ['1', '0', '0', '1', '0–2']],
      ['FC Voorbeeld', '/statistieken/tegenstanders/fc-voorbeeld', ['3', '1', '1', '1', '4–4']],
      ['Testclub', '/statistieken/tegenstanders/testclub', ['5', '3', '1', '1', '10–4']],
    ])
  })

  it('is a table with a caption, column headers with scope, and a line that explains the abbreviations', async () => {
    const html = await render()

    expect(html).toContain('<caption class="hf-visually-hidden">De tegenstanders van sc Heerenveen, van A tot Z')
    expect(html.match(/<th [^>]*scope="col"/g)).toHaveLength(6)
    expect(html).toContain('<span class="hf-visually-hidden">gewonnen</span>')
    expect(html).toContain('G gespeeld, W gewonnen, GL gelijk, V verloren, D doelpunten (voor–tegen)')
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

    expect([...html.matchAll(/<th [^>]*scope="col">(.*?)<\/th>/g)].map(([, header]) => header)).toEqual([
      'Club',
      '<abbr title="Gespeeld"><span aria-hidden="true">G</span><span class="hf-visually-hidden">gespeeld</span></abbr>',
      '<abbr title="Gewonnen"><span aria-hidden="true">W</span><span class="hf-visually-hidden">gewonnen</span></abbr>',
      '<abbr title="Gelijk"><span aria-hidden="true">GL</span><span class="hf-visually-hidden">gelijk</span></abbr>',
      '<abbr title="Verloren"><span aria-hidden="true">V</span><span class="hf-visually-hidden">verloren</span></abbr>',
      '<abbr title="Doelpunten"><span aria-hidden="true">D</span><span class="hf-visually-hidden">doelpunten</span></abbr>',
    ])
  })

  it('has no column Punten with all the matches, because a cup tie gives no points', async () => {
    const html = await render()

    expect(html).not.toContain('>punten<')
    expect(html).not.toContain(', P punten')
  })

  it('has the column Punten with the Eredivisie, 3 for a win and 1 for a draw, and explains it', async () => {
    const html = await render({ competitie: 'eredivisie' })

    expect(html.match(/<th [^>]*scope="col"/g)).toHaveLength(7)
    expect(html).toContain(
      '<abbr title="Punten"><span aria-hidden="true">P</span><span class="hf-visually-hidden">punten</span></abbr>',
    )
    expect(html).toContain('G gespeeld, W gewonnen, GL gelijk, V verloren, D doelpunten (voor–tegen), P punten')
    expect(rowsOf(html)).toEqual([
      [
        'FC Voorbeeld',
        '/statistieken/tegenstanders/fc-voorbeeld?competitie=eredivisie',
        ['3', '1', '1', '1', '4–4', '4'],
      ],
      ['Testclub', '/statistieken/tegenstanders/testclub?competitie=eredivisie', ['4', '3', '1', '0', '10–3', '10']],
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

  it('credits the Wikipedia pages of the seasons we have, with the licence', async () => {
    const html = await render()

    expect(html).toContain('Bron: Wikipedia')
    expect(html).toContain('href="https://nl.wikipedia.org/wiki/Eredivisie_2022/23_(mannenvoetbal)"')
    expect(html).toContain('CC BY-SA 4.0')
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
