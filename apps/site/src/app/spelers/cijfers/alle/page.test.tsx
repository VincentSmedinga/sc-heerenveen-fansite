import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AllTimeMatch } from '#src/all-time-players'

import {
  getAllTimeMatches,
  getEditedMatches,
  getMatchSeasons,
  getMatchSource,
  getPersonSeasons,
  getReportSeasons,
} from '#src/matches'
import { getSourcePages } from '#src/opponents'
import { getReportAddresses } from '#src/report-data'
import { matchSeasons, sourcePages } from '#src/test-opponents'
import { withoutIcons } from '#src/without-icons'

import AllSeasonsPlayerFiguresPage, { generateMetadata } from './page'

// Only the queries are replaced: the page is the real one.
vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAllTimeMatches: vi.fn(),
  getEditedMatches: vi.fn(),
  getMatchSeasons: vi.fn(),
  getMatchSource: vi.fn(),
  getPersonSeasons: vi.fn(),
  getReportSeasons: vi.fn(),
}))
vi.mock('#src/opponents', () => ({ getSourcePages: vi.fn() }))
vi.mock('#src/report-data', () => ({ getReportAddresses: vi.fn() }))

type Goal = AllTimeMatch['goals'][number]

const goal = (player: string, options: Partial<Goal> = {}): Goal => ({
  minute: 10,
  ours: true,
  ownGoal: false,
  penalty: false,
  personFamilyName: player,
  personFamilyNamePrefix: null,
  personGivenName: 'Pier',
  personId: [...player].reduce((sum, letter) => sum + letter.charCodeAt(0), 0),
  personSlug: null,
  player,
  playerId: null,
  playerPage: null,
  stoppageMinutes: null,
  ...options,
})

const match = (season: string, goals: Goal[], options: Partial<AllTimeMatch> = {}): AllTimeMatch => ({
  competition: 'Eredivisie',
  dataSource: 'wikipedia',
  goals,
  goalsAgainst: goals.filter((item) => !item.ours).length,
  goalsFor: goals.filter((item) => item.ours).length,
  home: true,
  matchDate: `${season.slice(0, 4)}-09-12`,
  opponent: 'FC Proef',
  round: 'Speelronde 1',
  season,
  status: 'played',
  ...options,
})

/**
 * Twelve scorers with 12 down to 1 goals, one goal a match, so there are places beyond the
 * first ten and no hattrick among them.
 */
const manyScorers = Array.from({ length: 12 }, (_, round) =>
  match(
    '1998/99',
    Array.from({ length: 12 - round }, (_, index) => goal(`Speler${String.fromCharCode(65 + index)}`)),
    { matchDate: `1998-09-${String(round + 1).padStart(2, '0')}`, round: `Speelronde ${round + 20}` },
  ),
)

const matches: AllTimeMatch[] = [
  ...manyScorers,
  // A hattrick in a season with line-ups, and one in a season without, with a penalty each.
  match('2003/04', [goal('Drie'), goal('Drie'), goal('Drie', { penalty: true })], { round: 'Speelronde 9' }),
  match('2005/06', [goal('Vijf'), goal('Vijf'), goal('Vijf'), goal('Vijf'), goal('Vijf')], {
    home: false,
    opponent: 'HZVV',
  }),
  // A match with a score and no scorers: we don't know them.
  match('2000/01', [], { goalsFor: 2 }),
  match('2001/02', [goal('Beker')], { competition: 'KNVB Beker' }),
]

const render = async (searchParams: Record<string, string | string[] | undefined> = {}) =>
  withoutIcons(renderToStaticMarkup(await AllSeasonsPlayerFiguresPage({ searchParams: Promise.resolve(searchParams) })))

/** The digest of the error that `notFound()` throws, which Next.js answers. */
const digestOf = async (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: unknown) => (error as { digest?: string }).digest,
  )

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T13:40:00Z'))
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getAllTimeMatches).mockResolvedValue(matches)
  vi.mocked(getEditedMatches).mockResolvedValue(false)
  vi.mocked(getMatchSeasons).mockResolvedValue(matchSeasons)
  vi.mocked(getMatchSource).mockResolvedValue('wikipedia')
  vi.mocked(getPersonSeasons).mockResolvedValue(new Map())
  vi.mocked(getReportSeasons).mockResolvedValue(['2003/04', '2004/05', '2005/06', '2026/27'])
  vi.mocked(getReportAddresses).mockResolvedValue(
    new Map([['Eredivisie|Speelronde 9', '/wedstrijden/2003-04/2003-09-12-fc-proef']]),
  )
  vi.mocked(getSourcePages).mockResolvedValue(sourcePages)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page with all seasons, /spelers/cijfers/alle', () => {
  it('has the heading Cijfers van de spelers and a picker that has Alle seizoenen first and chosen', async () => {
    const html = await render()
    const options = [...html.matchAll(/<option value="([^"]+)"( selected="")?>([^<]+)<\/option>/g)].map(
      ([, value, selected, label]) => [value, label, selected !== undefined],
    )

    expect(html).toContain('<h1 class="hf-heading-1">Cijfers van de spelers</h1>')
    expect(html).toContain('action="/spelers/cijfers/kies"')
    expect(options[0]).toEqual(['alle', 'Alle seizoenen', true])
    expect(options.slice(1).every(([, , selected]) => selected === false)).toBe(true)
    expect(options).toHaveLength(matchSeasons.length + 1)
  })

  it('has the card Topscorers sinds 1990/91 in the main column, with the years and the first ten places', async () => {
    const html = await render()
    const main = html.slice(html.indexOf('style="grid-area:main"'), html.indexOf('style="grid-area:side"'))

    expect(main).toContain('aria-labelledby="topscorers-sinds-1990-91"')
    expect(main).toContain('Topscorers sinds 1998/99')
    expect(main).toContain('<th scope="col">Jaren</th>')
    expect(main).toContain('De top 10 van 15 spelers die scoorden')
    expect(main).toContain('Speler')
  })

  it('does not say "de top 10" when everybody who scored is in the table, though they share places', async () => {
    vi.mocked(getAllTimeMatches).mockResolvedValue([
      match(
        '2003/04',
        ['Alfa', 'Beta', 'Gamma', 'Delta', 'Eta', 'Zeta', 'Theta', 'Iota', 'Kappa', 'Lambda'].map((name) => goal(name)),
      ),
    ])

    const html = await render()

    expect(html).toContain('<p>10 spelers hebben gescoord</p>')
    expect(html).not.toContain('De top 10 van')
    expect(html).not.toContain('Toon de top 25')
  })

  it('puts the places 11 to 25 in a closed block, without JavaScript, and nobody twice', async () => {
    const html = await render()
    const block = /<details[^>]*><summary>Toon de top 25.*?<\/details>/s.exec(html)?.[0] ?? ''

    expect(block).not.toContain(' open')
    expect(block).toContain('plaatsen 11 tot en met 25')
    expect(block.match(/<tr>/g)?.length).toBeGreaterThan(0)
    expect(html.slice(0, html.indexOf('clubtopscorer-per-seizoen')).match(/>SpelerA</g)?.length).toBe(1)
  })

  it('has the card Clubtopscorer per seizoen under the topscorers, with a link for each season', async () => {
    const html = await render()
    const main = html.slice(html.indexOf('style="grid-area:main"'), html.indexOf('style="grid-area:side"'))
    const card = main.slice(main.indexOf('aria-labelledby="clubtopscorer-per-seizoen"'))

    expect(main.indexOf('id="topscorers-sinds-1990-91"')).toBeLessThan(main.indexOf('id="clubtopscorer-per-seizoen"'))
    expect(card).toContain('De clubtopscorer van 4 seizoenen')
    expect(card).toContain('<a href="/spelers/cijfers/2005-06">2005/06</a>')
    expect(card).toContain('Vijf')
    expect(card.indexOf('2005/06')).toBeLessThan(card.indexOf('2003/04'))
  })

  it('has the card Clubtopscorer per seizoen with a star and a line for a season with unknown scorers', async () => {
    vi.mocked(getAllTimeMatches).mockResolvedValue([
      match('2000/01', [goal('Een')]),
      match('2000/01', [], { goalsFor: 2 }),
    ])

    const html = await render()

    expect(html).toContain('1<span')
    expect(html).toContain('niet alle doelpuntenmakers bekend')
    expect(html).toContain('* Van een deel van de wedstrijden van dit seizoen kennen we de doelpuntenmakers niet.')
  })

  it('has the rest of the seasons in a closed block when there are more than five', async () => {
    vi.mocked(getAllTimeMatches).mockResolvedValue(
      Array.from({ length: 7 }, (_, index) => match(`${1995 + index}/${String(96 + index).slice(-2)}`, [goal('Een')])),
    )

    const html = await render()
    const block = /<details[^>]*><summary>Toon alle 7 seizoenen.*?<\/details>/s.exec(html)?.[0] ?? ''

    expect(block).not.toContain(' open')
    expect(block.match(/<tr>/g)).toHaveLength(3)
  })

  it('has no card Clubtopscorer per seizoen when nobody has scored', async () => {
    vi.mocked(getAllTimeMatches).mockResolvedValue([])

    expect(await render()).not.toContain('clubtopscorer-per-seizoen')
  })

  it('says for how many matches we do not know the scorers', async () => {
    expect(await render()).toContain('Van 1 wedstrijd kennen we de doelpuntenmakers niet.')
  })

  it('has the soft cards Hattricks and Strafschoppen benut in the side column, not Alle spelers, Assists or Minuten', async () => {
    const html = await render()
    const side = html.slice(html.indexOf('style="grid-area:side"'))

    expect(side).toContain('aria-labelledby="hattricks"')
    expect(side).toContain('aria-labelledby="strafschoppen"')
    expect(html).not.toMatch(/id="(alle-spelers|assists|minuten|doelpuntenmakers|bijzondere-doelpunten)"/)
    expect(side.indexOf('id="hattricks"')).toBeLessThan(side.indexOf('id="strafschoppen"'))
  })

  it('lists every hattrick behind a closed block, with the match as a link when it has a page', async () => {
    const html = await render()
    const block = /<details[^>]*><summary>Toon alle 2 hattricks.*?<\/details>/s.exec(html)?.[0] ?? ''

    expect(block).toContain('sc Heerenveen 3–0 FC Proef')
    expect(block).toContain('<a href="/wedstrijden/2003-04/2003-09-12-fc-proef">sc Heerenveen 3–0 FC Proef</a>')
    expect(block).toContain('HZVV 0–5 sc Heerenveen')
    expect(block).not.toContain('href="/wedstrijden/2005-06')
    expect(block).toContain('(5 doelpunten)')
    expect(block).toContain('12 september 2003')
  })

  it('asks only for the pages of the seasons that have a hattrick and line-ups', async () => {
    await render()

    expect(getReportAddresses).toHaveBeenCalledWith('2003/04')
    expect(getReportAddresses).toHaveBeenCalledWith('2005/06')
    expect(getReportAddresses).toHaveBeenCalledTimes(2)
  })

  it('shows the hattricks without links when the pages of the matches cannot be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getReportAddresses).mockRejectedValue(new Error('connect ECONNREFUSED'))

    const html = await render()

    expect(html).toContain('sc Heerenveen 3–0 FC Proef')
    expect(html).not.toContain('href="/wedstrijden/2003-04')
    expect(error).toHaveBeenCalled()
  })

  it('gives the total of the penalties under the top five', async () => {
    expect(await render()).toContain('1 strafschop benut sinds 1998/99')
  })

  it('says why there is no list of matches, minutes or assists, with the seasons from the data', async () => {
    expect(await render()).toContain(
      'Wedstrijden, minuten en assists per speler kennen we alleen van 2003/04 tot en met 2005/06 en vanaf 2026/27. Daarom heeft deze pagina er geen lijst aller tijden van.',
    )
  })

  it('has the credit of Wikipedia last in the side column', async () => {
    const html = await render()

    expect(html.indexOf('hf-wikipedia-credit')).toBeGreaterThan(html.indexOf('id="strafschoppen"'))
  })

  it('leaves out a card that has nothing to say', async () => {
    vi.mocked(getAllTimeMatches).mockResolvedValue([match('2003/04', [goal('Alfa')])])

    const html = await render()

    expect(html).toContain('id="topscorers-sinds-1990-91"')
    expect(html).not.toContain('id="hattricks"')
    expect(html).not.toContain('id="strafschoppen"')
  })

  it('has a sentence instead of the card when nobody scored', async () => {
    vi.mocked(getAllTimeMatches).mockResolvedValue([])

    const html = await render()

    expect(html).toContain('We hebben nog geen doelpuntenmakers. Kijk straks nog eens.')
    expect(html).not.toContain('id="topscorers-sinds-1990-91"')
  })

  describe('the choice of competition', () => {
    it('counts the Eredivisie alone with ?competitie=eredivisie: a goal in the cup is left out', async () => {
      const all = await render()
      const html = await render({ competitie: 'eredivisie' })

      expect(all).toContain('surname">Beker<')
      expect(html).not.toContain('surname">Beker<')
      expect(html).toContain('in de Eredivisie')
      expect(html).toContain('href="/spelers/cijfers/alle?competitie=beker"')
    })

    it('counts the cup alone with ?competitie=beker', async () => {
      const html = await render({ competitie: 'beker' })

      expect(html).toContain('<p>1 speler heeft gescoord</p>')
      expect(html).toContain('in de KNVB Beker')
    })

    it('is "niet gevonden" for a choice that is not known', async () => {
      expect(await digestOf(render({ competitie: 'onzin' }))).toContain('404')
      expect(await digestOf(render({ competitie: ['eredivisie', 'eredivisie'] }))).toContain('404')
    })

    it('falls back to every match when the matches have none of that competition', async () => {
      vi.mocked(getAllTimeMatches).mockResolvedValue([match('2003/04', [goal('Alfa')])])

      expect(await render({ competitie: 'europa' })).toContain('<p>1 speler heeft gescoord</p>')
    })
  })

  describe('when the database cannot be read', () => {
    it('shows the error page, with a link to try again, and logs why', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      vi.mocked(getAllTimeMatches).mockRejectedValue(new Error('connect ECONNREFUSED'))

      const html = await render()

      expect(html).toContain('/spelers/cijfers/alle')
      expect(html).not.toContain('id="topscorers-sinds-1990-91"')
      expect(error).toHaveBeenCalledWith(expect.stringContaining('connect ECONNREFUSED'))
    })
  })
})

describe('the metadata of /spelers/cijfers/alle', () => {
  it('has a title that says all seasons, and its own canonical address', async () => {
    const metadata = await generateMetadata()

    expect(metadata.title).toBe('Cijfers van de spelers, alle seizoenen')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/spelers/cijfers/alle')
  })

  it('is not indexed when the page failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getAllTimeMatches).mockRejectedValue(new Error('down'))

    expect((await generateMetadata()).robots).toEqual({ index: false })
  })
})
