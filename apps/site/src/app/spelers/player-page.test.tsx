import type { Person } from '@fansite/db/schema'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadPlayerPage, periodsOf, type PlayerPage, playerPageOf } from '#src/player-page'
import { loadPlayerSeasonFacts, loadPlayerSeasons, type PlayerSeason } from '#src/player-seasons'
import { getReportAddresses } from '#src/report-data'
import { withoutIcons } from '#src/without-icons'

import { playerMetadata, PlayerPageView } from './player-page'

vi.mock('#src/player-page', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadPlayerPage: vi.fn(),
}))

vi.mock('#src/player-seasons', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadPlayerSeasonFacts: vi.fn(),
  loadPlayerSeasons: vi.fn(),
}))

vi.mock('#src/report-data', () => ({ getReportAddresses: vi.fn() }))

// A made-up season of the player.
const madeUpSeason: PlayerSeason = {
  assists: 2,
  cleanSheets: undefined,
  conceded: undefined,
  goalMoments: [],
  goals: 5,
  goalsByCompetition: { Eredivisie: 5 },
  lineupMatches: [],
  matchesInSeason: 34,
  played: 30,
  red: 0,
  reportedMatches: 34,
  season: '2003/04',
  shirtNumber: 9,
  source: 'lineups',
  started: 25,
  yellow: 3,
}

// A made-up player of ours.
const player: PlayerPage = {
  age: 52,
  birthPlace: 'Emmen',
  birthYear: '1974',
  bornLongAgo: false,
  country: 'NL',
  deathYear: undefined,
  edited: false,
  line: 'aanvaller',
  name: 'Jan de Vries',
  nameParts: { givenName: 'Jan', surname: 'de Vries' },
  personId: 7,
  readAt: new Date('2026-11-10T12:05:00Z'),
  seasons: ['2002/03', '2003/04', '2007/08'],
  slug: 'jan-de-vries',
  wikipedia: { language: 'nl', title: 'Jan de Vries (voetballer)' },
}

const render = async (page: Partial<PlayerPage> = {}, searchParams: Record<string, string> = {}) => {
  vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'found', page: { ...player, ...page } })

  return withoutIcons(
    renderToStaticMarkup(await PlayerPageView({ searchParams: Promise.resolve(searchParams), slug: 'jan-de-vries' })),
  )
}

/** The digest of the error that `notFound()` and `redirect()` throw, which Next.js answers. */
const digestOf = async (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: unknown) => (error as { digest?: string }).digest,
  )

beforeEach(() => {
  vi.mocked(loadPlayerSeasons).mockResolvedValue([madeUpSeason])
  vi.mocked(loadPlayerSeasonFacts).mockResolvedValue({
    appearances: [],
    assists: [],
    goals: [],
    matchCounts: [],
    players: [],
    tables: [],
  })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T13:40:00Z'))
  vi.stubEnv('SITE_ENV', 'production')
})

afterEach(() => {
  vi.useRealTimers()
  vi.mocked(loadPlayerPage).mockReset()
  vi.unstubAllEnvs()
})

/** Made-up facts of a player with a goal and a match in the cup and in the Eredivisie. */
const matchOf = (id: number, competition: 'Eredivisie' | 'KNVB Beker') => ({
  competition,
  goalsAgainst: 0,
  goalsFor: 1,
  home: true,
  id,
  matchDate: `2003-10-${10 + id}`,
  opponent: 'Testclub',
  round: String(id),
  season: '2003/04',
})
const cupFacts = {
  appearances: [matchOf(1, 'Eredivisie'), matchOf(2, 'KNVB Beker')].map((match) => ({
    cameOn: false,
    goalsAgainst: 0,
    match,
    red: false,
    season: '2003/04',
    starter: true,
    substituted: false,
    yellow: false,
  })),
  assists: [],
  goals: [matchOf(1, 'Eredivisie'), matchOf(2, 'KNVB Beker')].map((match) => ({
    competition: match.competition,
    match,
    minute: 10,
    season: '2003/04',
    stoppage: null,
  })),
  matchCounts: [{ played: 2, reported: 2, season: '2003/04' }],
  players: [{ season: '2003/04', shirtNumber: 9 }],
  tables: [],
}

describe('the switch of the table Per seizoen', () => {
  it('is there for a player who played or scored outside the Eredivisie, and then only the table follows it', async () => {
    vi.mocked(loadPlayerSeasonFacts).mockResolvedValue(cupFacts)

    const all = await render()
    const league = await render({}, { competitie: 'eredivisie' })

    expect(all).toContain('Welke wedstrijden')
    expect(all).not.toContain('alleen de Eredivisie, het nieuwste')
    expect(league).toContain('per seizoen bij sc Heerenveen, alleen de Eredivisie, het nieuwste')
    expect(league).toMatch(/<h2[^>]*>Per seizoen<\/h2>/)
  })

  it('is left out when nothing was played outside the Eredivisie, and the choice still works', async () => {
    const html = await render({}, { competitie: 'eredivisie' })

    expect(html).not.toContain('Welke wedstrijden')
    expect(html).toContain('Per seizoen')
  })

  it('is the page "niet gevonden" for a value that is not known', async () => {
    const digest = await render({}, { competitie: 'beker' }).then(
      () => undefined,
      (error: unknown) => (error as { digest?: string }).digest,
    )

    expect(digest).toContain('404')
  })
})

describe('the page of a player', () => {
  it('has the table Per seizoen under the seasons, and leaves it out when the seasons cannot be read', async () => {
    expect(await render()).toMatch(/<h2[^>]*>Per seizoen<\/h2><table/)
    expect(loadPlayerSeasons).toHaveBeenCalledWith(7)

    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(loadPlayerSeasons).mockRejectedValue(new Error('connect ECONNREFUSED'))

    const html = await render()

    expect(html).not.toContain('Per seizoen')
    expect(html).not.toContain('Loopbaan')
    expect(error).toHaveBeenCalledWith(expect.stringContaining('connect ECONNREFUSED'))
    error.mockRestore()
  })

  it('has a link back to Spelers above his name, no breadcrumb, and his name as the heading, in parts', async () => {
    const html = await render()

    expect(html).not.toContain('Kruimelpad')
    expect(html).toMatch(/<a href="\/spelers">Spelers<\/a>.*?<div class="hf-page-title hf-page-title-start"><h1/s)
    expect(html).toContain(
      '<h1 class="hf-heading-1"><span class="hf-player-name"><span class="hf-player-name-given">Jan</span> <span class="hf-player-name-surname">de Vries</span></span></h1>',
    )
  })

  it('opens with the key figures of his line, before the table Per seizoen', async () => {
    const html = await render()

    expect(html).toMatch(
      /aria-label="Kerngetallen".*?5<\/span> <span class="hf-key-figure-label">doelpunten.*?Per seizoen/s,
    )
    expect(html).toContain('in alle competities')
  })

  it('has no row of key figures when the seasons could not be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(loadPlayerSeasons).mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
    const html = await render()

    expect(html).not.toContain('Kerngetallen')
    error.mockRestore()
  })

  it('has one line with the line, the flag as decoration with the country in words, and the place, year and age', async () => {
    const html = await render()
    const line = /<p class="hf-meta">(Aanvaller · .*?)<\/p>/s.exec(html)?.[1] ?? ''

    expect(line).toMatch(
      /^Aanvaller · <span class="hf-country-name"><img alt="" class="hf-player-name-flag" [^>]*src="data:[^"]*"[^>]*\/>Nederland<\/span> · Emmen, 1974 · 52 jaar$/s,
    )
  })

  it('shows the years of a player who has died, and a screen reader hears the words and not the dash', async () => {
    const html = await render({ age: undefined, birthPlace: 'Herten', birthYear: '1950', deathYear: '2020' })

    expect(html).toContain('<span aria-hidden="true">Herten, 1950–2020</span>')
    expect(html).toContain('<span class="hf-visually-hidden">Herten, geboren in 1950, overleden in 2020</span>')
    expect(html).not.toMatch(/jaar<\/p>|in memoriam/iu)
  })

  it('says only "geboren in" for a player born over a hundred years ago without a death', async () => {
    const html = await render({ age: undefined, birthYear: '1920', bornLongAgo: true })

    expect(html).toContain('geboren in 1920')
    expect(html).not.toContain('Emmen, 1920')
  })

  it('leaves out what we do not know, with its separator', async () => {
    expect(await render({ birthPlace: undefined, country: undefined, line: undefined })).toContain(
      '<p class="hf-meta">1974 · 52 jaar</p>',
    )
    expect(await render({ age: undefined, country: undefined, line: undefined })).toContain(
      '<p class="hf-meta">Emmen, 1974</p>',
    )
    expect(await render({ birthYear: undefined, country: undefined, line: undefined })).toContain(
      '<p class="hf-meta">Emmen</p>',
    )
    expect(await render({ birthPlace: undefined, birthYear: undefined })).toMatch(
      /<p class="hf-meta">Aanvaller · <span class="hf-country-name">.*?Nederland<\/span><\/p>/s,
    )
    // The legend of the table is a line of its own, so the table is left out here.
    vi.mocked(loadPlayerSeasons).mockResolvedValue([])
    expect(
      await render({ birthPlace: undefined, birthYear: undefined, country: undefined, line: undefined }),
    ).not.toContain('class="hf-meta">')
  })

  it('has the career under the table, with the periods, a gap and a moment that links to its match', async () => {
    const match = {
      competition: 'Eredivisie',
      goalsAgainst: 1,
      goalsFor: 3,
      home: true,
      id: 11,
      matchDate: '2004-04-10',
      opponent: 'Testclub',
      round: '30',
      season: '2003/04',
    } as const

    vi.mocked(loadPlayerSeasons).mockResolvedValue([
      { ...madeUpSeason, season: '2007/08', shirtNumber: undefined },
      {
        ...madeUpSeason,
        goalMoments: [
          {
            match: { ...match, id: 10, matchDate: '2003-09-01', round: '29', season: '2002/03' },
            minute: 3,
            stoppage: undefined,
          },
        ],
        season: '2002/03',
      },
      {
        ...madeUpSeason,
        goalMoments: [
          { match, minute: 25, stoppage: undefined },
          { match, minute: 30, stoppage: undefined },
          { match, minute: 32, stoppage: undefined },
        ],
        lineupMatches: [],
      },
    ])
    vi.mocked(getReportAddresses).mockResolvedValue(
      new Map([['Eredivisie|30', '/wedstrijden/2003-04/2004-04-10-testclub']]),
    )

    const html = await render()

    expect(html).toMatch(/<h2[^>]*>Per seizoen<\/h2><table.*<h2[^>]*>Loopbaan bij sc Heerenveen<\/h2>/u)
    expect(html).toContain('Van alle 3 seizoenen hebben we de opstellingen.')
    expect(html).toContain('2004/05 tot en met 2006/07: niet in de selectie')
    expect(html).toContain('<a href="/wedstrijden/2003-04/2004-04-10-testclub">sc Heerenveen – Testclub</a>')
    expect(html).toContain('10 april 2004 · hattrick: 25′, 30′ en 32′')
    expect(html).not.toContain('Bij sc Heerenveen van')
  })

  it('shows a moment without a page as plain text with the score', async () => {
    const match = {
      competition: 'Eredivisie',
      goalsAgainst: 2,
      goalsFor: 1,
      home: false,
      id: 12,
      matchDate: '2004-04-10',
      opponent: 'Testclub',
      round: '31',
      season: '2003/04',
    } as const

    vi.mocked(loadPlayerSeasons).mockResolvedValue([
      { ...madeUpSeason, goalMoments: [{ match, minute: undefined, stoppage: undefined }] },
    ])
    vi.mocked(getReportAddresses).mockResolvedValue(new Map())

    const html = await render()

    expect(html).toContain('Testclub – sc Heerenveen 2–1')
    expect(html).not.toContain('href="/wedstrijden')
    expect(html).toContain('10 april 2004 · eerste doelpunt')
  })

  it('has the side column beside the main column, with the credit at the bottom of it and not in the main column', async () => {
    const html = await render()
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
    const aside = html.slice(html.indexOf('<aside'))

    expect(aside).toContain('aria-label="Meer cijfers over deze speler"')
    expect(main).not.toContain('Bron: Wikipedia')
    expect(aside).toContain('Bron: Wikipedia')
    expect(aside).toContain('>Doelpunten per competitie<')
  })

  it('has the charts in the side column as soft cards, after the competitions and before the credit, and not in the main column', async () => {
    const html = await render()
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
    const aside = html.slice(html.indexOf('<aside'))
    const soft = (id: string) => `hf-card-soft" aria-labelledby="${id}"`
    const places = ['per-competitie', 'grafiek-per-seizoen'].map((id) => {
      expect(aside).toContain(soft(id))
      expect(main).not.toContain(`aria-labelledby="${id}"`)

      return aside.indexOf(`aria-labelledby="${id}"`)
    })

    expect(places).toEqual([...places].sort((a, b) => a - b))
    expect(aside.indexOf('aria-labelledby="grafiek-per-seizoen"')).toBeLessThan(aside.indexOf('Bron: Wikipedia'))
  })

  it('leaves the cards of the side column out when what they read fails, and keeps the credit', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(loadPlayerSeasons).mockRejectedValue(new Error('connect ECONNREFUSED'))
    vi.mocked(loadPlayerSeasonFacts).mockRejectedValue(new Error('connect ECONNREFUSED'))

    const html = await render()

    expect(html).not.toContain('Doelpunten per competitie')
    expect(html).toContain('Bron: Wikipedia')
    error.mockRestore()
  })

  it('ends with the full credit of Wikipedia with his article, and the archive for a season up to 2006/07', async () => {
    const html = await render()

    expect(html).toContain('Bron: Wikipedia en sc Heerenveen Fansite')
    expect(html).toContain('href="https://nl.wikipedia.org/wiki/Jan_de_Vries_(voetballer)"')
    expect(html).toContain('Onze spelersgegevens zijn ook CC BY-SA 4.0.')
    expect(await render({ seasons: ['2007/08'] })).not.toContain('archief')
  })

  it('has no credit for a player without an article, whose data is all ours', async () => {
    expect(await render({ wikipedia: undefined })).not.toContain('Bron: ')
    expect(await render({ seasons: ['2025/26'], wikipedia: undefined })).not.toContain('Bron: ')
    const unread = await render({ readAt: undefined, seasons: ['2025/26'] })

    expect(unread).toContain('href="https://nl.wikipedia.org/wiki/Jan_de_Vries_(voetballer)"')
    expect(unread).toContain('Onze spelersgegevens zijn ook CC BY-SA 4.0.')
    expect(unread).not.toContain('Laatst gelezen')
  })

  it('has no photo and no request to another domain', async () => {
    const html = await render()

    expect([...html.matchAll(/<img [^>]*src="([^"]*)"/g)].every(([, src]) => src?.startsWith('data:'))).toBe(true)
    expect(html).not.toMatch(/<(?:script|iframe|link)[^>]+(?:src|href)="https?:/)
  })

  it('leads an old address to the address of now, for good', async () => {
    vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'moved', slug: 'johannes-de-vries' })

    const digest = await digestOf(PlayerPageView({ searchParams: Promise.resolve({}), slug: 'jan-de-vries' }))

    expect(digest).toContain('/spelers/johannes-de-vries;308')
  })

  it('is "niet gevonden" for nobody, or a player of an opponent', async () => {
    vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'unknown' })

    expect(await digestOf(PlayerPageView({ searchParams: Promise.resolve({}), slug: 'niemand' }))).toContain('404')
  })

  it('shows the error page when the database cannot be read', async () => {
    vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'error', reason: 'connect ECONNREFUSED' })

    expect(
      renderToStaticMarkup(await PlayerPageView({ searchParams: Promise.resolve({}), slug: 'jan-de-vries' })),
    ).toContain('href="/spelers/jan-de-vries"')
  })

  it('has a title and a description without the date of birth', async () => {
    vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'found', page: player })

    const metadata = await playerMetadata('jan-de-vries')

    expect(metadata.title).toBe('Jan de Vries – Spelers')
    expect(metadata.description).toBe(
      'Jan de Vries, aanvaller uit Nederland. Bij sc Heerenveen van 2002/03 tot en met 2003/04 en in 2007/08. Met de bron erbij.',
    )
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/spelers/jan-de-vries')
  })
})

describe('periodsOf', () => {
  it('makes one period of seasons that follow each other, also across the turn of the century', () => {
    expect(periodsOf(['2007/08', '1999/00', '2000/01', '2002/03', '2003/04'])).toEqual([
      { first: '1999/00', last: '2000/01' },
      { first: '2002/03', last: '2003/04' },
      { first: '2007/08', last: '2007/08' },
    ])
  })
})

describe('playerPageOf', () => {
  // A made-up person, with the columns a row of `persons` has.
  const person = {
    birthDate: '1974-05-06',
    birthDatePrecision: 'day',
    country: 'NL',
    familyName: 'Vries',
    familyNamePrefix: 'de',
    givenName: 'Jan',
    id: 7,
    line: 'aanvaller',
    lineSource: 'wikidata',
    name: 'Jan de Vries',
    nameSource: 'wikipedia',
    slug: 'jan-de-vries',
    wikidataReadAt: null,
    wikipediaPage: null,
  } as unknown as Person

  it('keeps the year of birth and never the whole date', () => {
    const page = playerPageOf(person, [{ name: 'Jan de Vries', season: '2004/05' }], 'Emmen')

    expect(page.birthYear).toBe('1974')
    expect(JSON.stringify(page)).not.toContain('1974-05-06')
  })

  it('works out the age from the whole date, on the day of the birthday and the day before', () => {
    // In May the current season is 2025/26.
    const rows = [{ name: 'Jan de Vries', season: '2025/26' }]

    expect(playerPageOf(person, rows, 'Emmen', new Date('2026-05-05T10:00:00Z')).age).toBe(51)
    expect(playerPageOf(person, rows, 'Emmen', new Date('2026-05-06T10:00:00Z')).age).toBe(52)
    // Just after midnight in the Netherlands it is already the next day.
    expect(playerPageOf(person, rows, 'Emmen', new Date('2026-05-05T22:30:00Z')).age).toBe(52)
  })

  it('gives an age only to a player in the squad of the current season, as we hold no date of death', () => {
    const today = new Date('2026-11-11T10:00:00Z')

    expect(playerPageOf(person, [{ name: 'Jan de Vries', season: '2026/27' }], 'Emmen', today).age).toBe(52)
    expect(
      playerPageOf(
        person,
        [
          { name: 'Jan de Vries', season: '2026/27' },
          { name: 'Jan de Vries', season: '2003/04' },
        ],
        'Emmen',
        today,
      ).age,
    ).toBe(52)
    // A former player keeps his place and year of birth, but has no age.
    const former = playerPageOf(person, [{ name: 'Jan de Vries', season: '2025/26' }], 'Emmen', today)

    expect(former.age).toBeUndefined()
    expect(former.birthYear).toBe('1974')
    expect(former.birthPlace).toBe('Emmen')
    // The season turns over on 1 July: before it the squad of 2025/26 is the current one.
    expect(
      playerPageOf(person, [{ name: 'Jan de Vries', season: '2025/26' }], 'Emmen', new Date('2026-06-20T10:00:00Z'))
        .age,
    ).toBe(52)
  })

  it('has no age without the whole date, only the year or the month', () => {
    const rows = [{ name: 'Jan de Vries', season: '2026/27' }]

    expect(playerPageOf({ ...person, birthDatePrecision: 'year' }, rows, 'Emmen').age).toBeUndefined()
    expect(playerPageOf({ ...person, birthDatePrecision: 'month' }, rows, 'Emmen').age).toBeUndefined()
    expect(playerPageOf({ ...person, birthDate: null, birthDatePrecision: null }, rows, 'Emmen').age).toBeUndefined()
    expect(playerPageOf({ ...person, birthDatePrecision: 'year' }, rows, 'Emmen').birthYear).toBe('1974')
  })

  it('takes the name of his newest row while the person has none', () => {
    const page = playerPageOf(
      { ...person, familyName: null, familyNamePrefix: null, givenName: null, name: null },
      [
        { name: 'Jan Vries', season: '2005/06' },
        { name: 'J. de Vries', season: '2004/05' },
      ],
      undefined,
    )

    expect(page.name).toBe('Jan Vries')
    expect(page.seasons).toEqual(['2004/05', '2005/06'])
  })
})
