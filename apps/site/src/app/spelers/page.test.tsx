import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readSeasonUitblinker } from '#src/fans/season-uitblinker'
import { getMatchData, getMatchSeasons } from '#src/matches'
import { getSeasonPlayerStats } from '#src/season-player-stats'
import { getSeasonReportFigures } from '#src/season-report-figures'
import { getSeasonSquad } from '#src/season-squad'
import { getSquadSummary } from '#src/squad-summary'
import { matchData } from '#src/test-matches'
import { figuresData, noReports } from '#src/test-report-figures'
import { squadData } from '#src/test-squad'
import { withoutIcons } from '#src/without-icons'

import PlayersPage, { generateMetadata } from './page'
import { PlayersPage as PlayersPageOf } from './players-page'

// Only the query is replaced: the split into the programme and the results is the real one.
vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))

// The figures of the match reports are made up too, and by default there are none.
vi.mock('#src/season-report-figures', () => ({ getSeasonReportFigures: vi.fn(), seasonHasReports: vi.fn() }))

// The squad is made up too: the page reads it from the database.
vi.mock('#src/season-squad', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSeasonSquad: vi.fn(),
}))

// The figures of the squad are made up too: they come from the dates of birth in the database.
vi.mock('#src/squad-summary', () => ({ getSquadSummary: vi.fn() }))

// What the card Uitblinker says is tested with its reader (season-uitblinker.test.ts).
vi.mock('#src/fans/season-uitblinker', () => ({ readSeasonUitblinker: vi.fn() }))

// The appearances are made up too: the page reads them from the database.
vi.mock('#src/season-player-stats', () => ({ getSeasonPlayerStats: vi.fn() }))

// The afternoon of Friday 23 October 2026 in the Netherlands.
const now = new Date('2026-10-23T13:40:00Z')

const render = async () => withoutIcons(renderToStaticMarkup(await PlayersPage()))

/** The text of some HTML, as a screen reader and a copy have it. */
const plain = (html: string | undefined) => (html ?? '').replaceAll(/<[^>]*>/g, '')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getSeasonPlayerStats).mockReset()
  vi.mocked(getSeasonPlayerStats).mockResolvedValue([])
  vi.mocked(getSeasonReportFigures).mockReset()
  vi.mocked(getSeasonReportFigures).mockResolvedValue(noReports)
  vi.mocked(getSeasonSquad).mockReset()
  vi.mocked(getSeasonSquad).mockResolvedValue(squadData)
  vi.mocked(getSquadSummary).mockReset()
  vi.mocked(getSquadSummary).mockResolvedValue({
    ages: { average: 24.3, oldest: 34, youngest: 17 },
    countries: 3,
    players: 5,
  })
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27'])
  vi.mocked(readSeasonUitblinker).mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page /spelers', () => {
  it('has one h1, Spelers, the h2 Selectie with an h3 for each position, the h2 of the card with the squad in short and the h2 of the four small cards', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Spelers</h1>',
      '<h2 class="hf-heading-2" id="in-het-kort">In het kort</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="selectie"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#selectie">Selectie</a></h2>',
      '<h3 class="hf-heading-3">Doelmannen</h3>',
      '<h3 class="hf-heading-3">Verdedigers</h3>',
      '<h3 class="hf-heading-3">Middenvelders</h3>',
      '<h3 class="hf-heading-3">Aanvallers</h3>',
      '<h2 class="hf-heading-2" id="kort-topscorers">Topscorers</h2>',
      '<h2 class="hf-heading-2" id="kort-de-nul-gehouden">De nul gehouden</h2>',
    ])
  })

  it('has no bar "Op deze pagina:", for the page has one card', async () => {
    const html = await render()

    expect(html).not.toContain('hf-page-shortcuts')
    expect(html).toContain('id="selectie"')
  })

  it('has the white card Selectie in the main column, and the small cards and the credit in the side section', async () => {
    const html = await render()
    const main = html.slice(html.indexOf('style="grid-area:main"'), html.indexOf('style="grid-area:side"'))
    const sidebar = html.slice(html.indexOf('style="grid-area:side"'), html.indexOf('</main>'))

    expect(sidebar).toMatch(/^style="grid-area:side" aria-label="Meer over de spelers">/)
    expect(main).toContain('<section class="hf-card" aria-labelledby="selectie">')
    expect(sidebar).not.toContain('hf-card-strong')
    expect(sidebar).not.toContain('cijfers-van-dit-seizoen')
    expect(sidebar.indexOf('kort-topscorers')).toBeLessThan(sidebar.indexOf('hf-wikipedia-credit'))
  })

  it('has the cards Topscorers and De nul gehouden, each with a link to its large card, and no Assists or Minuten without a match report', async () => {
    const html = await render()
    const sidebar = html.slice(html.indexOf('style="grid-area:side"'), html.indexOf('</main>'))

    expect(sidebar).toContain('<a href="/spelers/cijfers#doelpuntenmakers">Alle doelpuntenmakers</a>')
    expect(sidebar).toContain(
      '<a href="/wedstrijden/cijfers#de-nul-gehouden">Alle wedstrijden waarin we de nul hielden</a>',
    )
    expect(sidebar.indexOf('kort-topscorers')).toBeLessThan(sidebar.indexOf('kort-de-nul-gehouden'))
    expect(sidebar).not.toContain('kort-assists')
    expect(sidebar).not.toContain('kort-minuten')
  })

  it('has the four cards in the order Topscorers, Assists, Minuten and De nul gehouden for a season with match reports', async () => {
    vi.mocked(getSeasonReportFigures).mockResolvedValue(figuresData)

    const html = await render()
    const ids = [...html.matchAll(/aria-labelledby="(kort-[a-z-]+)"/g)].map((match) => match[1])

    expect(ids).toEqual(['kort-topscorers', 'kort-assists', 'kort-minuten', 'kort-de-nul-gehouden'])
    expect(html).toContain('<a href="/spelers/cijfers#assists">Alle assists</a>')
    expect(html).toContain('<a href="/spelers/cijfers#minuten">Alle minuten</a>')
    expect(getSeasonReportFigures).toHaveBeenCalledWith('2026/27', 'all')
  })

  it('leaves out only Assists and Minuten, and logs it, when the match reports can not be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getSeasonReportFigures).mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))

    const html = await render()

    expect(html).toContain('kort-topscorers')
    expect(html).toContain('kort-de-nul-gehouden')
    expect(html).not.toContain('kort-assists')
    expect(error).toHaveBeenCalledWith(
      'Could not read the match reports for /spelers: connect ECONNREFUSED 127.0.0.1:3306',
    )
  })

  it('has the white card "In het kort" in the main column above the squad, with the figures of the summary', async () => {
    const html = await render()
    const main = html.slice(html.indexOf('style="grid-area:main"'), html.indexOf('style="grid-area:side"'))

    expect(main).toContain('<section class="hf-card" aria-labelledby="in-het-kort">')
    expect(main.indexOf('in-het-kort')).toBeLessThan(main.indexOf('id="selectie"'))
    expect(plain(main)).toContain('Spelers5Gemiddelde leeftijd24,3 jaarJongste17 jaarOudste34 jaarLanden3')
    expect(getSquadSummary).toHaveBeenCalledWith(squadData, '2026/27', now)
  })

  it('has no card "In het kort" when the squad is not known', async () => {
    vi.mocked(getSquadSummary).mockResolvedValue(undefined)

    const html = await render()

    expect(html).not.toContain('in-het-kort')
    expect(html).toContain('kort-topscorers')
  })

  it('puts the card Uitblinker at the top of the sidebar, with its watermark', async () => {
    vi.mocked(readSeasonUitblinker).mockResolvedValue({
      kind: 'last-match',
      openMatch: 'sc Heerenveen – FC Twente',
    })

    const html = await render()
    const sidebar = html.slice(html.indexOf('style="grid-area:side"'), html.indexOf('</main>'))

    expect(sidebar).toMatch(
      /^[^>]*>\s*<section class="hf-card hf-card-game hf-card-game-uitblinker" aria-labelledby="uitblinker">/u,
    )
    expect(sidebar.indexOf('id="uitblinker"')).toBeLessThan(sidebar.indexOf('kort-topscorers'))
    expect(readSeasonUitblinker).toHaveBeenCalledWith('2026/27')
  })

  it('has no card Uitblinker and no empty place without one', async () => {
    const html = await render()

    expect(html).not.toContain('hf-card-game-uitblinker')
    expect(html).toMatch(
      /aria-label="Meer over de spelers"><section class="hf-card hf-card-soft" aria-labelledby="kort-topscorers">/u,
    )
  })

  it('has no date of birth anywhere in the page', async () => {
    expect(await render()).not.toMatch(/\b(?:19|20)\d{2}-\d{2}-\d{2}\b/)
  })

  it('has none of the cards with figures: they are on /spelers/cijfers', async () => {
    const html = await render()

    for (const id of [
      'doelpuntenmakers',
      'topscorers',
      'sinds-1990-91',
      'bijzondere-doelpunten',
      'alle-spelers',
      'assists',
      'minuten',
      'invallers-die-scoorden',
    ]) {
      expect(html).not.toContain(`id="${id}"`)
    }
    expect(html).not.toContain('<table')
  })

  it('has no choice of competition in the toolbar', async () => {
    const html = withoutIcons(renderToStaticMarkup(await PlayersPageOf({ season: '2026/27' })))

    expect(html).not.toContain('Welke wedstrijden')
    expect(html).not.toContain('name="competitie"')
  })

  it('has one credit at the end of the side section, and loads nothing from another domain', async () => {
    const html = await render()

    expect(html.match(/class="hf-meta hf-wikipedia-credit"/g)).toHaveLength(1)
    expect(html.slice(html.indexOf('style="grid-area:side"'), html.indexOf('</main>'))).toContain('hf-wikipedia-credit')
    expect(withoutFlags(html)).not.toMatch(/<(?:img|script|iframe|link)\b/u)
  })

  it('keeps the season of the page in the link to the figures', async () => {
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26'])
    const html = withoutIcons(renderToStaticMarkup(await PlayersPageOf({ season: '2025/26' })))

    expect(html).toContain('href="/spelers/cijfers/2025-26#doelpuntenmakers"')
  })

  it('shows the error page in the HTML, and logs the reason, when the database can not be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getMatchData).mockRejectedValue(
      new Error('Failed query: select 1\nparams: geheim', { cause: new Error('connect ECONNREFUSED 127.0.0.1:3306') }),
    )

    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
    expect(html).toContain('<a href="/spelers">Probeer het opnieuw</a>')
    expect(error).toHaveBeenCalledWith(
      'Could not read the matches and the table for /spelers: Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)',
    )
    expect(await generateMetadata()).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })

  it('has a title of its own, a description and the canonical link', async () => {
    const metadata = await generateMetadata()

    expect(metadata.title).toBe('Spelers')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/spelers')
    expect(metadata.description).toContain('selectie')
  })
})

describe('the season picker on /spelers', () => {
  beforeEach(() => {
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26'])
  })

  it('asks for the current season', async () => {
    await render()

    expect(getMatchData).toHaveBeenCalledExactlyOnceWith('2026/27')
  })

  it('has the picker in the toolbar after the heading, with the current season chosen and the earlier seasons after it, and the route of its own', async () => {
    const html = await render()

    expect(html).toMatch(
      /<h1 class="hf-heading-1">Spelers<\/h1><\/div><div class="hf-page-toolbar"[^>]*><form [^>]*aria-label="Seizoen kiezen"/,
    )
    expect(html).toContain(
      '<option value="2026-27" selected="">2026/27</option><option value="2025-26">2025/26</option>',
    )
    expect(html).toContain('action="/spelers/kies"')
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Toon<\/button>/)
  })

  it('has no links to the overview and the search in the title row: the bar under the menu has them', async () => {
    const html = await render()

    expect(html).not.toContain('>Alle spelers</a>')
    expect(html).not.toContain('>Zoek een speler</a>')
  })

  it('keeps the image as it was, without a season on it', async () => {
    expect(await render()).not.toContain('Seizoen 2026/27 ·')
  })

  it('has no picker when the current season is the only one, and keeps the heading', async () => {
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27'])

    const html = await render()

    expect(html).not.toContain('<select')
    expect(html).toContain('<h1 class="hf-heading-1">Spelers</h1>')
  })
})

/** The page without the flags: images whose address holds the drawing. */
const withoutFlags = (html: string) => html.replace(/<img alt="[^"]*" class="hf-flag"[^>]*\/>/g, '')

describe('the card Selectie on /spelers', () => {
  const card = (html: string) =>
    html.match(/<section class="hf-card" aria-labelledby="selectie">.*?<\/section>/s)?.[0] ?? ''

  /** The lines of the card: the shirt number (empty when none) and the name. */
  const linesOf = (html: string) =>
    [...card(html).matchAll(/<li>(.*?)<\/li>/gs)].map(([, line]) => {
      const number = /hf-player-name-number">(\d*)</.exec(line ?? '')?.[1] ?? ''

      // The code in the frame of a country without a drawing is the flag, not the name.
      const text = plain((line ?? '').replace(/<span aria-label="[^"]*" class="hf-flag [^>]*>[^<]*<\/span>/u, ''))

      return [number, text.slice(number.length).replace(/\s+/g, ' ').trim()]
    })

  const withSquad = (overrides: Partial<typeof squadData>) =>
    vi.mocked(getSeasonSquad).mockResolvedValue({ ...squadData, ...overrides })

  const sentenceOf = (html: string) => plain(card(html).match(/<\/h2><p>(.*?)<\/p>/s)?.[1])

  it('is the first card, before the side section, with the sentence under the heading and above the parts', async () => {
    const html = await render()

    expect(html.indexOf('id="selectie"')).toBeLessThan(html.indexOf('style="grid-area:side"'))
    expect(card(html).indexOf('<p>')).toBeLessThan(card(html).indexOf('<h3'))
    expect(sentenceOf(html)).toBe(
      'We kennen 5 spelers van dit seizoen. Waarschijnlijk staat iedereen uit de selectie erbij.',
    )
  })

  it('has a part for each position from the goal to the front, with the shirt number and the name', async () => {
    const html = await render()

    expect(
      plain(
        card(html)
          .match(/<h3[^>]*>.*?<\/h3>/gs)
          ?.join('|'),
      ),
    ).toBe('Doelmannen|Verdedigers|Middenvelders|Aanvallers')
    expect(linesOf(html)).toEqual([
      ['1', 'Testkeeper Een'],
      ['4', 'Testspeler van Twee'],
      ['8', 'Proefman Drie'],
      ['9', 'Testaanvaller Vier'],
      ['', 'Testreserve Vijf'],
    ])
    expect(withoutFlags(card(html).replace(/<h2.*?<\/h2>/s, ''))).not.toMatch(/<a |<img|button/)
  })

  it('reads the shirt number and the name as one line of text, and an empty column as the name alone', async () => {
    const lines = [...card(await render()).matchAll(/<li>(.*?)<\/li>/gs)].map(([, line]) => plain(line))

    expect(lines.map((line) => line.replace(/\s+/g, ' '))).toContain('4 Testspeler van Twee')
    expect(lines).toContain('Testreserve Vijf')
  })

  it('shows the flag between the shirt number and the name, with the name of the country as its text', async () => {
    const lines = [...card(await render()).matchAll(/<li>(.*?)<\/li>/gs)].map(([, line]) => line ?? '')
    const alt = (name: string) =>
      /<img alt="([^"]*)"/u.exec(lines.find((line) => plain(line).includes(name)) ?? '')?.[1]

    expect(alt('Testkeeper Een')).toBe('Nederland')
    expect(alt('Testaanvaller Vier')).toBe('Zweden')
    expect(lines.join('').match(/<img /g)).toHaveLength(3)
    // In the line the number comes first, then the flag, then the name.
    expect(lines[0]).toMatch(/hf-player-name-number">1<\/span> <img [^>]*\/> <span class="hf-player-name-text">/u)
  })

  it('gives a player without a country an empty place, and a country without a drawing its code', async () => {
    const html = card(await render())

    // Proefman Drie is from Kazakhstan, which has no drawing in the set: the code in a frame.
    expect(html).toMatch(
      /hf-player-name-number">8<\/span> <span aria-label="Kazachstan" class="hf-flag hf-flag-code" role="img">KZ<\/span> <span/u,
    )
    // Testreserve Vijf has no country, among others who have one.
    expect(html).toMatch(/hf-player-name-number"><\/span><span class="hf-flag"><\/span><span/)
  })

  it('has no place for a flag in a part where nobody has a country', async () => {
    vi.mocked(getSeasonSquad).mockResolvedValue({
      ...squadData,
      players: squadData.players.map((player) => ({ ...player, country: null })),
    })

    expect(card(await render())).not.toContain('hf-flag')
  })

  it('has a sentence for each level of the chance, and the other sentence for a table of who played', async () => {
    const sentences = async (level: string, bestSource = 'selectie') => {
      withSquad({ completeness: { bestSource, level, playerCount: 22 } as never })

      return sentenceOf(await render())
    }

    expect(await sentences('bijna')).toBe('We kennen 5 spelers van dit seizoen. Er ontbreken waarschijnlijk een paar.')
    expect(await sentences('deels')).toBe(
      'We kennen 5 spelers van dit seizoen. Dat zijn waarschijnlijk niet alle spelers.',
    )
    expect(await sentences('deels', 'statistieken')).toBe(
      'We kennen 5 spelers van dit seizoen: wie speelde. Wie op de bank bleef, ontbreekt waarschijnlijk.',
    )
    expect(await sentences('weinig', 'transfers')).toBe(
      'We kennen 5 spelers van dit seizoen, vooral wie scoorde of overkwam. De selectie is verre van compleet.',
    )
    expect(await sentences('onbekend')).toBe('Van dit seizoen kennen we de selectie niet.')
  })

  it('shows the players from the reports as one list of names, with a sentence that says where they come from', async () => {
    withSquad({
      completeness: { bestSource: 'verslag', level: 'weinig', markedComplete: false, playerCount: 3 },
      players: squadData.players
        .slice(0, 3)
        .map((player) => ({ ...player, country: null, position: null, shirtNumber: null, source: 'verslag' as const })),
    })

    const html = await render()

    expect(sentenceOf(html)).toBe(
      'We kennen 3 spelers van dit seizoen, uit de verslagen. Wie niet speelde, ontbreekt waarschijnlijk.',
    )
    expect(card(html).match(/<h3/g)).toBeNull()
    expect(linesOf(html).map(([number]) => number)).toEqual(['', '', ''])
    expect(linesOf(html).map(([, name]) => name)).toEqual(['Testkeeper Een', 'Testspeler van Twee', 'Proefman Drie'])
  })

  it('counts only the players on the card in the sentence', async () => {
    withSquad({
      completeness: { bestSource: 'selectie', level: 'compleet', markedComplete: false, playerCount: 6 },
      players: [
        ...squadData.players,
        { ...squadData.players[0]!, name: 'Verslag Speler', position: null, shirtNumber: null, source: 'verslag' },
      ],
    })

    expect(sentenceOf(await render())).toContain('We kennen 5 spelers')
  })

  it('leaves the players from the reports off the card when a better source has the season', async () => {
    withSquad({
      players: [
        ...squadData.players,
        { ...squadData.players[0]!, name: 'Verslag Speler', position: null, shirtNumber: null, source: 'verslag' },
      ],
    })

    const html = await render()

    expect(linesOf(html).map(([, name]) => name)).not.toContain('Verslag Speler')
    expect(linesOf(html)).toHaveLength(5)
  })

  it('shows a player the editors added on the card, whatever the best source of the season is', async () => {
    const added = { ...squadData.players[0]!, name: 'Redactie Speler', shirtNumber: 40, source: 'redactie' as const }

    withSquad({ players: [...squadData.players, added] })

    expect(linesOf(await render()).map(([, name]) => name)).toContain('Redactie Speler')

    withSquad({
      completeness: { bestSource: 'verslag', level: 'weinig', markedComplete: false, playerCount: 2 },
      players: [{ ...squadData.players[1]!, source: 'verslag' }, added],
    })

    expect(linesOf(await render()).map(([, name]) => name)).toContain('Redactie Speler')
  })

  it('has one list without headings of parts for a season in which nobody has a position', async () => {
    withSquad({
      completeness: { bestSource: 'statistieken', level: 'deels', markedComplete: false, playerCount: 3 },
      players: squadData.players.slice(0, 3).map((player) => ({ ...player, position: null, shirtNumber: null })),
    })

    const html = await render()

    expect(card(html).match(/<h3/g)).toBeNull()
    expect(card(html).match(/<ul/g)).toHaveLength(1)
    expect(linesOf(html).map(([, name]) => name)).toEqual(['Testkeeper Een', 'Testspeler van Twee', 'Proefman Drie'])
    expect(card(html)).not.toContain('hf-player-name-number"')
  })

  it('puts the players without a position, among others who have one, in a last part', async () => {
    withSquad({
      players: [...squadData.players.slice(0, 2), { ...squadData.players[2]!, position: null, shirtNumber: null }],
    })

    const html = await render()

    expect(
      plain(
        card(html)
          .match(/<h3[^>]*>.*?<\/h3>/gs)
          ?.join('|'),
      ),
    ).toBe('Doelmannen|Verdedigers|Positie onbekend')
  })

  it('shows a player the import made of a scorer like every other, with no mark and no extra credit (#1024)', async () => {
    const before = await render()

    withSquad({
      players: [
        ...squadData.players,
        {
          ...squadData.players[0]!,
          name: 'Pelle van Amersfoort',
          position: null,
          shirtNumber: null,
          source: 'doelpunten',
        },
      ],
    })

    const html = await render()
    const credit = (page: string) => page.match(/<details class="hf-meta hf-wikipedia-credit".*?<\/details>/s)?.[0]

    expect(linesOf(html).map(([, name]) => name)).toContain('Pelle van Amersfoort')
    // His line has the markup of a line of another player without a number.
    expect(card(html).match(/<li[^>]*>(?:(?!<\/li>).)*Pelle van Amersfoort.*?<\/li>/s)?.[0]).not.toMatch(
      /doelpunt|bron|title=/iu,
    )
    expect(credit(html)).toBe(credit(before))
  })

  it('shows the heading and the sentence and no part for a season with no squad', async () => {
    withSquad({ completeness: undefined, pages: [], players: [] })

    const html = await render()

    expect(sentenceOf(html)).toBe('Van dit seizoen kennen we de selectie niet.')
    expect(card(html)).not.toMatch(/<h3|<ul|<li/)
  })

  it('shows no players when the chance is unknown, although some are stored', async () => {
    withSquad({ completeness: { bestSource: 'doelpunten', level: 'onbekend', markedComplete: false, playerCount: 5 } })

    expect(card(await render())).not.toMatch(/<h3|<ul|<li/)
  })

  it('credits the pages of the squad in the credit that ends the side section, with the English one named as such', async () => {
    withSquad({
      pages: [
        { readAt: new Date('2026-10-23T11:30:00Z'), title: '2018–19 SC Heerenveen season' },
        { readAt: new Date('2026-10-23T11:30:00Z'), title: 'Sc Heerenveen in het seizoen 2026/27 (mannen)' },
      ],
    })

    const html = await render()
    const credit = html.match(/<details class="hf-meta hf-wikipedia-credit".*?<\/details>/s)?.[0] ?? ''

    expect(credit).toContain('>Selectie 2026/27</a>')
    expect(credit).toContain(
      '<a href="https://en.wikipedia.org/wiki/2018%E2%80%9319_SC_Heerenveen_season">Selectie 2026/27 (Engelse Wikipedia)</a>',
    )
    expect(html.indexOf('hf-wikipedia-credit')).toBeGreaterThan(html.indexOf('id="bijzondere-doelpunten"'))
  })

  it('names Wikidata with its licence when a player comes from it, and not otherwise', async () => {
    expect(await render()).not.toContain('Wikidata')

    withSquad({ players: [{ ...squadData.players[0]!, source: 'wikidata' }, ...squadData.players.slice(1)] })

    expect(await render()).toContain('Enkele spelers komen van <a href="https://www.wikidata.org/">Wikidata</a> (CC0).')
  })

  it('shows the error page when the squad cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getSeasonSquad).mockRejectedValue(new Error('no database'))

    expect(await render()).toContain('Er ging iets mis')
  })
})
