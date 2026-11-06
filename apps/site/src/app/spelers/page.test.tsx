import type { PublicMatch } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAllTimeMatches, getMatchData, getMatchSeasons } from '#src/matches'
import { getSeasonSquad } from '#src/season-squad'
import { playersShortcuts } from '#src/statisticsShortcuts'
import { matchData } from '#src/test-matches'
import { squadData } from '#src/test-squad'
import { withoutIcons } from '#src/without-icons'

import PlayersPage, { generateMetadata } from './page'

// Only the query is replaced: the split into the programme and the results is the real one.
vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAllTimeMatches: vi.fn(),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))

// The squad is made up too: the page reads it from the database.
vi.mock('#src/season-squad', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSeasonSquad: vi.fn(),
}))

// The afternoon of Friday 23 October 2026 in the Netherlands.
const now = new Date('2026-10-23T13:40:00Z')

const render = async () => withoutIcons(renderToStaticMarkup(await PlayersPage({ searchParams: Promise.resolve({}) })))

/** The text of some HTML, as a screen reader and a copy have it. */
const plain = (html: string | undefined) => (html ?? '').replaceAll(/<[^>]*>/g, '')

/** The rows of the table of scorers: the place, the player and the goals. */
const rowsOf = (html: string) =>
  [...html.matchAll(/<tr><td[^>]*>(\d+)<\/td><th scope="row">(.+?)<\/th><td[^>]*>(\d+)/g)].map(
    ([, position, player, goals]) => [position, plain(player), goals],
  )

/** The first match that was played, in which the goals of the made-up players are scored. */
const played = matchData.matches.find((item) => item.status === 'played')!

/** One match in which player A scored the first number of goals, player B the second, etc. */
function scorers(counts: number[]): PublicMatch[] {
  const goals = counts.flatMap((count, index) =>
    Array.from({ length: count }, (_, goalIndex) => ({
      minute: goalIndex + 1,
      ours: true,
      ownGoal: false,
      penalty: false,
      personFamilyName: null,
      personFamilyNamePrefix: null,
      personGivenName: null,
      personId: null,
      player: `Speler ${String.fromCharCode(65 + index)}`,
      playerId: null,
      playerPage: null,
      stoppageMinutes: null,
    })),
  )

  return [{ ...played, goals, goalsAgainst: 0, goalsFor: goals.length }]
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getAllTimeMatches).mockReset()
  vi.mocked(getAllTimeMatches).mockResolvedValue([])
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getSeasonSquad).mockReset()
  vi.mocked(getSeasonSquad).mockResolvedValue(squadData)
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27'])
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page /spelers', () => {
  it('has one h1, Spelers, with the season picker beside it, the h2 Selectie with an h3 for each position, and the h2 of the three cards with goals', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Spelers</h1>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="selectie"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#selectie">Selectie</a></h2>',
      '<h3 class="hf-heading-3">Doelmannen</h3>',
      '<h3 class="hf-heading-3">Verdedigers</h3>',
      '<h3 class="hf-heading-3">Middenvelders</h3>',
      '<h3 class="hf-heading-3">Aanvallers</h3>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="doelpuntenmakers"><span class="hf-heading-target"></span><span class="hf-heading-alias" id="topscorers"></span><a class="hf-heading-link" href="#doelpuntenmakers">Doelpuntenmakers</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="alle-tijden"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#alle-tijden">Alle tijden</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="bijzondere-doelpunten"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#bijzondere-doelpunten">Bijzondere doelpunten</a></h2>',
    ])
    expect(html).toMatch(/<div class="hf-page-title"><h1 class="hf-heading-1">Spelers<\/h1>/)
  })

  it('has a heading for the link of the bar under the header, with the id the link goes to', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2 [^>]*id="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(playersShortcuts.map(({ href }) => href)).toEqual(ids)
    expect(html).toMatch(/<section class="hf-card[ a-z-]*" aria-labelledby="doelpuntenmakers">/)
  })

  it('has the card Doelpuntenmakers soft in the sidebar, with a button for an image, and the card Selectie without one', async () => {
    const html = await render()

    expect(html).toContain(
      '<section class="hf-card hf-card-soft hf-card-shareable" aria-labelledby="doelpuntenmakers">',
    )
    expect(html).toContain('<section class="hf-card" aria-labelledby="selectie">')
    expect(html.match(/data-hf-card-share/g)).toHaveLength(2)
  })

  it('has the main column with the white card Selectie and a named sidebar with the soft cards Doelpuntenmakers and Bijzondere doelpunten', async () => {
    const html = await render()
    const main = html.match(/<main.*<\/main>/s)?.[0] ?? ''
    const sidebar = html.match(/<aside.*<\/aside>/s)?.[0] ?? ''

    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(sidebar).toMatch(/^<aside class="hf-page-sidebar" aria-label="Meer cijfers over de spelers">/)
    expect(main).toContain('id="selectie"')
    expect(main).not.toContain('id="doelpuntenmakers"')
    expect(main).not.toContain('id="bijzondere-doelpunten"')
    expect(sidebar).not.toContain('id="selectie"')
    expect(sidebar).toContain('id="doelpuntenmakers"')
    expect(sidebar).toContain('id="bijzondere-doelpunten"')
    expect(sidebar.indexOf('id="doelpuntenmakers"')).toBeLessThan(sidebar.indexOf('id="bijzondere-doelpunten"'))
    expect(sidebar).toContain(
      '<section class="hf-card hf-card-soft hf-card-shareable" aria-labelledby="doelpuntenmakers">',
    )
    expect(sidebar).toContain(
      '<section class="hf-card hf-card-soft hf-card-shareable" aria-labelledby="bijzondere-doelpunten">',
    )
  })

  it('has the card, the credit and nothing else: no other cards of Cijfers or Wedstrijden', async () => {
    const html = await render()

    for (const id of ['reeksen', 'uitersten', 'de-nul-gehouden', 'stand', 'programma', 'hoofdtrainer']) {
      expect(html).not.toContain(`id="${id}"`)
    }
    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html.match(/<aside/g)).toHaveLength(1)
  })

  it('is a table with a caption for a screen reader, in the card under the table', async () => {
    const card = await render()

    expect(card).toContain(
      '<caption class="hf-visually-hidden">Doelpuntenmakers van sc Heerenveen in het seizoen 2026/27, in de Eredivisie en de KNVB Beker</caption>',
    )
    expect(card.match(/<table/g)).toHaveLength(1)
    expect(card).toContain('<p class="hf-meta hf-bar-legend"><b>D</b> doelpunten</p>')
  })

  it('counts the goals of our players over the matches, as the card on Cijfers did', async () => {
    // Proefman scored in two matches. The Nepper of the opponent does not count for ours.
    expect(rowsOf(await render())).toEqual([
      ['1', 'Proefman', '2'],
      ['2', 'Kopie', '1'],
      ['2', 'Nepper', '1'],
    ])
    expect(await render()).toContain('<p>3 spelers hebben gescoord</p>')
  })

  it('shows everybody who scored, not only the best five, with level players on one place', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: scorers([9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1]),
    })

    const html = await render()

    expect(rowsOf(html)).toHaveLength(14)
    expect(
      rowsOf(html)
        .slice(8)
        .every(([position]) => position === '9'),
    ).toBe(true)
    expect(html).toContain('<p>14 spelers hebben gescoord</p>')
    expect(html).not.toContain('De top 5')
  })

  it('says "1 speler heeft gescoord" for one player', async () => {
    vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: scorers([3]) })

    expect(await render()).toContain('<p>1 speler heeft gescoord</p>')
  })

  it('has no link to itself and no link to another page but the heading and the credit', async () => {
    const html = await render()
    const outside = html.replace(/<details class="hf-meta hf-wikipedia-credit".*?<\/details>/s, '')

    expect(outside).not.toContain('Alle doelpuntenmakers')
    expect(outside).not.toMatch(/https?:|<img|src=/)
  })

  it('says which part of the played matches the list is based on, when scorers are missing', async () => {
    expect(await render()).toContain('Gebaseerd op de doelpuntenmakers van 2 van de 4 gespeelde wedstrijden')
  })

  it('says there are no scorers yet in a sentence, and shows no table, when there is no goal', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: matchData.matches.map((item) => ({ ...item, goals: [] })),
    })

    const html = await render()

    expect(html).toContain('We hebben nog geen doelpuntenmakers van dit seizoen. Kijk straks nog eens.')
    expect(html).not.toContain('<table')
    expect(html).not.toContain('hf-card-shareable')
  })

  it('has one credit at the end of the sidebar, with the time of the last reading, and loads nothing from another domain', async () => {
    const html = await render()

    expect(html.match(/class="hf-meta hf-wikipedia-credit"/g)).toHaveLength(1)
    expect(html).toContain('href="https://nl.wikipedia.org/wiki/Eredivisie_2026/27_(mannenvoetbal)"')
    expect(html).toContain('<time dateTime="2026-10-23T12:05:00.000Z">23 oktober 2026 om 14:05</time>')
    expect(html.lastIndexOf('hf-wikipedia-credit')).toBeGreaterThan(html.lastIndexOf('</table>'))
    expect(html.match(/<aside.*<\/aside>/s)?.[0]).toContain('hf-wikipedia-credit')
    expect(html).not.toMatch(/<(?:img|script|iframe|link)\b/u)
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
    expect(metadata.description).toContain('scoorden')
  })
})

describe('the card Bijzondere doelpunten on /spelers', () => {
  const cardOf = (html: string) =>
    /<section [^>]*aria-labelledby="bijzondere-doelpunten">.*?<\/section>/s.exec(html)?.[0] ?? ''
  /** The parts of the card: the name and the value under it, as a screen reader reads them. */
  const facts = (html: string) =>
    [...html.matchAll(/<li><p[^>]*>(.*?)<\/p>(.*?)<\/li>/g)].map(([, name, value]) => [plain(name), plain(value)])
  const goal = (player: string, options: Partial<PublicMatch['goals'][number]> = {}) => ({
    minute: 10,
    ours: true,
    ownGoal: false,
    penalty: false,
    personFamilyName: null,
    personFamilyNamePrefix: null,
    personGivenName: null,
    personId: null,
    player,
    playerId: null,
    playerPage: null,
    stoppageMinutes: null,
    ...options,
  })
  const withGoals = (goals: PublicMatch['goals']) =>
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: [
        {
          ...played,
          goals,
          goalsAgainst: goals.filter((item) => !item.ours).length,
          goalsFor: goals.filter((item) => item.ours).length,
        },
      ],
    })

  it('comes after the card Doelpuntenmakers, in the sidebar and before the credit, and is soft with a button for an image', async () => {
    const html = await render()

    expect(html.indexOf('id="doelpuntenmakers"')).toBeLessThan(html.indexOf('id="bijzondere-doelpunten"'))
    expect(html.indexOf('id="bijzondere-doelpunten"')).toBeLessThan(html.lastIndexOf('hf-wikipedia-credit'))
    expect(cardOf(html)).toContain('class="hf-card hf-card-soft hf-card-shareable"')
    expect(cardOf(html)).toContain('data-hf-card-share')
  })

  it('is a list of four parts, each with its name as quiet text above its value, and no subheadings', async () => {
    const html = cardOf(await render())

    expect(html).toMatch(
      /<ul role="list"><li><p class="hf-meta">Hattricks<\/p><div class="hf-short-match hf-short-fact">/,
    )
    expect(facts(html).map(([name]) => name)).toEqual([
      'Hattricks',
      'Dubbelslagen',
      'Strafschoppen',
      'Eigen doelpunten',
    ])
    expect(html.match(/<h[1-6]/g)).toHaveLength(1)
    expect(html.match(/<li>/g)).toHaveLength(4)
  })

  it('says "Nog geen" in the quiet style for hattricks and doubles nobody has, and keeps the numbers', async () => {
    const html = cardOf(await render())

    expect(facts(html)).toEqual([
      ['Hattricks', 'Nog geen'],
      ['Dubbelslagen', 'Nog geen'],
      ['Strafschoppen', '0 van de 4 doelpunten'],
      ['Eigen doelpunten', '0 door de tegenstander · 0 door ons'],
    ])
    expect(html.match(/<span class="hf-short-match-where">Nog geen<\/span>/g)).toHaveLength(2)
  })

  it('lists the hattricks and the doubles with the names as one name, and how often for a repeat', async () => {
    withGoals([
      goal('Proefman'),
      goal('Proefman'),
      goal('Proefman'),
      goal('Nepper', { penalty: true }),
      goal('Nepper'),
      goal('Kemper'),
      goal('Kemper'),
      goal('Teststraat', { minute: 50, ownGoal: true }),
      goal('Kopie', { minute: 60, ours: false, ownGoal: true }),
    ])

    const html = cardOf(await render())

    expect(facts(html)).toEqual([
      ['Hattricks', 'Proefman'],
      ['Dubbelslagen', 'Kemper, Nepper'],
      ['Strafschoppen', '1 van de 8 doelpunten'],
      ['Eigen doelpunten', '1 door de tegenstander · 1 door ons'],
    ])
    expect(html).toContain('<span class="hf-player-name"><span class="hf-player-name-surname">Proefman</span></span>')
    expect(html).not.toContain('Nog geen')
  })

  it('writes how often after a name, and separates the names with commas', async () => {
    const double = (player: string) => [goal(player), goal(player)]

    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: [
        { ...played, goals: double('Proefman'), goalsAgainst: 0, goalsFor: 2 },
        { ...played, goals: [...double('Proefman'), ...double('Nepper')], goalsAgainst: 0, goalsFor: 4 },
      ],
    })

    expect(facts(cardOf(await render()))[1]).toEqual(['Dubbelslagen', 'Proefman 2×, Nepper'])
  })

  it('says "doelpunt" in the singular for one goal', async () => {
    withGoals([goal('Proefman', { penalty: true })])

    expect(facts(cardOf(await render()))[2]).toEqual(['Strafschoppen', '1 van de 1 doelpunt'])
  })

  it('says how many matches it is based on, in the form of the other cards', async () => {
    expect(plain(cardOf(await render()))).toContain('Gebaseerd op 2 van de 4 gespeelde wedstrijden')
  })

  it('has a sentence and no parts and no button for an image when there is no goal', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: matchData.matches.map((item) => ({ ...item, goals: [] })),
    })

    const html = cardOf(await render())

    expect(plain(html)).toContain('We hebben nog geen doelpunten van dit seizoen. Kijk straks nog eens.')
    expect(html).not.toContain('<li>')
    expect(html).not.toContain('data-hf-card-share')
  })

  it('counts a goal of the cup for all the matches and not for the Eredivisie', async () => {
    const cup = (goals: PublicMatch['goals']): PublicMatch => ({
      ...played,
      competition: 'KNVB Beker',
      goals,
      goalsAgainst: 0,
      goalsFor: goals.length,
      round: 'Tweede ronde',
    })

    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: [
        { ...played, goals: [goal('Nepper')], goalsAgainst: 0, goalsFor: 1 },
        cup([goal('Bekerman', { penalty: true }), goal('Bekerman'), goal('Bekerman')]),
      ],
    })

    const all = plain(cardOf(await render()))
    const league = plain(
      cardOf(
        withoutIcons(
          renderToStaticMarkup(await PlayersPage({ searchParams: Promise.resolve({ competitie: 'eredivisie' }) })),
        ),
      ),
    )

    expect(all).toContain('HattricksBekerman')
    expect(all).toContain('1 van de 4 doelpunten')
    expect(all).toContain('Gebaseerd op alle 2 gespeelde wedstrijden')
    expect(league).not.toContain('Bekerman')
    expect(league).toContain('HattricksNog geen')
    expect(league).toContain('0 van de 1 doelpunt')
    expect(league).toContain('Gebaseerd op 1 gespeelde wedstrijd')
  })

  it('loads nothing from another domain and has no link outside the page', async () => {
    const html = cardOf(await render())

    expect(html).not.toMatch(/https?:|<img|src=/)
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

  it('has the picker next to the heading, with the current season chosen and the earlier seasons after it, and the route of its own', async () => {
    const html = await render()

    expect(html).toMatch(
      /<div class="hf-page-title"><h1 class="hf-heading-1">Spelers<\/h1><form [^>]*aria-label="Seizoen kiezen"/,
    )
    expect(html).toContain(
      '<option value="2026-27" selected="">2026/27</option><option value="2025-26">2025/26</option>',
    )
    expect(html).toContain('action="/spelers/kies"')
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Toon<\/button>/)
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

describe('the choice between all the matches and the Eredivisie on /spelers', () => {
  // The cup tie of the test data, in which a player of the cup scored once.
  const cupScorer = {
    minute: 70,
    ours: true,
    ownGoal: false,
    penalty: false,
    personFamilyName: null,
    personFamilyNamePrefix: null,
    personGivenName: null,
    personId: null,
    player: 'Bekerman',
    playerId: null,
    playerPage: null,
    stoppageMinutes: null,
  }
  const withCupGoal = () =>
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: matchData.matches.map((match) =>
        match.competition === 'KNVB Beker' ? { ...match, goals: [cupScorer] } : match,
      ),
    })
  const renderWith = async (searchParams: Record<string, string | string[] | undefined>) =>
    withoutIcons(renderToStaticMarkup(await PlayersPage({ searchParams: Promise.resolve(searchParams) })))
  const switchOf = (html: string) => /<div [^>]*aria-label="Welke wedstrijden"[^>]*>.*?<\/div>/.exec(html)?.[0]

  it('has the switch, with links to this page, and marks the choice of the address', async () => {
    expect(switchOf(await render())).toBe(
      '<div aria-label="Welke wedstrijden" class="hf-segmented-control hf-size-small" role="group" style="--hf-segmented-thumb-name:hf-segmented-thumb-spelers;--hf-segmented-count:2;--hf-segmented-index:0"><a aria-current="page" href="/spelers" style="--hf-segmented-option-name:hf-segmented-option-spelers-1"><span class="hf-segmented-label" data-label="Alle wedstrijden">Alle wedstrijden</span></a><a href="/spelers?competitie=eredivisie" style="--hf-segmented-option-name:hf-segmented-option-spelers-2"><span class="hf-segmented-label" data-label="Eredivisie">Eredivisie</span></a></div>',
    )
    expect(switchOf(await renderWith({ competitie: 'eredivisie' }))).toBe(
      '<div aria-label="Welke wedstrijden" class="hf-segmented-control hf-size-small" role="group" style="--hf-segmented-thumb-name:hf-segmented-thumb-spelers;--hf-segmented-count:2;--hf-segmented-index:1"><a href="/spelers" style="--hf-segmented-option-name:hf-segmented-option-spelers-1"><span class="hf-segmented-label" data-label="Alle wedstrijden">Alle wedstrijden</span></a><a aria-current="page" href="/spelers?competitie=eredivisie" style="--hf-segmented-option-name:hf-segmented-option-spelers-2"><span class="hf-segmented-label" data-label="Eredivisie">Eredivisie</span></a></div>',
    )
  })

  it('puts the switch first in the main column, before the card Selectie, and not in a card or in the sidebar', async () => {
    const html = await render()
    const main = html.match(/<main.*<\/main>/s)?.[0] ?? ''
    const cells = /<div class="hf-page-cells">(.*)/s.exec(main)?.[1] ?? ''

    expect(
      cells.startsWith('<div aria-label="Welke wedstrijden" class="hf-segmented-control hf-size-small" role="group"'),
    ).toBe(true)
    expect(html.indexOf('Welke wedstrijden')).toBeLessThan(html.indexOf('id="selectie"'))
    expect(html.match(/<aside.*<\/aside>/s)?.[0]).not.toContain('Welke wedstrijden')
    expect(html).not.toMatch(/<section[^>]*>(?:(?!<\/section>).)*Welke wedstrijden/s)
  })

  it('has no switch in a season without a played cup tie', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: matchData.matches.filter((match) => match.competition === 'Eredivisie'),
    })

    expect(switchOf(await render())).toBeUndefined()
  })

  it('counts the goals in the cup for all the matches, and not for the Eredivisie', async () => {
    withCupGoal()

    expect(rowsOf(await render()).map(([, player]) => player)).toContain('Bekerman')
    expect(rowsOf(await renderWith({ competitie: 'eredivisie' })).map(([, player]) => player)).not.toContain('Bekerman')
    expect(await renderWith({ competitie: 'eredivisie' })).toContain(
      'in het seizoen 2026/27, in de Eredivisie</caption>',
    )
  })

  it('keeps the choice in the season picker, and gives the page "niet gevonden" for a value that is not known', async () => {
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26'])

    const html = await renderWith({ competitie: 'eredivisie' })

    expect(html).toMatch(
      /<form [^>]*aria-label="Seizoen kiezen"[^>]*><input [^>]*name="competitie"[^>]*value="eredivisie"/,
    )
    expect(await render()).not.toContain('type="hidden"')

    for (const competitie of ['alle', '', ['eredivisie', 'eredivisie']]) {
      await expect(renderWith({ competitie })).rejects.toHaveProperty('digest', expect.stringContaining('404'))
    }
  })
})

describe('the card Selectie on /spelers', () => {
  const card = (html: string) =>
    html.match(/<section class="hf-card" aria-labelledby="selectie">.*?<\/section>/s)?.[0] ?? ''

  /** The lines of the card: the shirt number (empty when none) and the name. */
  const linesOf = (html: string) =>
    [...card(html).matchAll(/<li>(.*?)<\/li>/gs)].map(([, line]) => {
      const number = /hf-player-name-number">(\d*)</.exec(line ?? '')?.[1] ?? ''

      return [number, plain(line).slice(number.length).trim()]
    })

  const withSquad = (overrides: Partial<typeof squadData>) =>
    vi.mocked(getSeasonSquad).mockResolvedValue({ ...squadData, ...overrides })

  const sentenceOf = (html: string) => plain(card(html).match(/<\/h2><p>(.*?)<\/p>/s)?.[1])

  it('is the first card, before the sidebar, with the sentence under the heading and above the parts', async () => {
    const html = await render()

    expect(html.indexOf('id="selectie"')).toBeLessThan(html.indexOf('<aside'))
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
    expect(card(html).replace(/<h2.*?<\/h2>/s, '')).not.toMatch(/<a |<img|button/)
  })

  it('reads the shirt number and the name as one line of text, and an empty column as the name alone', async () => {
    const lines = [...card(await render()).matchAll(/<li>(.*?)<\/li>/gs)].map(([, line]) => plain(line))

    expect(lines).toContain('4 Testspeler van Twee')
    expect(lines).toContain('Testreserve Vijf')
  })

  it('has a sentence for each level of the chance, and the other sentence for a table of who played', async () => {
    const sentences = async (level: string, bestSource = 'selectie') => {
      withSquad({ completeness: { bestSource, level, playerCount: 22 } as never })

      return sentenceOf(await render())
    }

    expect(await sentences('bijna')).toBe('We kennen 22 spelers van dit seizoen. Er ontbreken waarschijnlijk een paar.')
    expect(await sentences('deels')).toBe(
      'We kennen 22 spelers van dit seizoen. Dat zijn waarschijnlijk niet alle spelers.',
    )
    expect(await sentences('deels', 'statistieken')).toBe(
      'We kennen 22 spelers van dit seizoen: wie speelde. Wie op de bank bleef, ontbreekt waarschijnlijk.',
    )
    expect(await sentences('weinig', 'transfers')).toBe(
      'We kennen 22 spelers van dit seizoen, vooral wie scoorde of overkwam. De selectie is verre van compleet.',
    )
    expect(await sentences('onbekend')).toBe('Van dit seizoen kennen we de selectie niet.')
  })

  it('has one list without headings of parts for a season in which nobody has a position', async () => {
    withSquad({
      completeness: { bestSource: 'statistieken', level: 'deels', playerCount: 3 },
      players: squadData.players.slice(0, 3).map((player) => ({ ...player, position: null, shirtNumber: null })),
    })

    const html = await render()

    expect(card(html).match(/<h3/g)).toBeNull()
    expect(card(html).match(/<ul/g)).toHaveLength(1)
    expect(linesOf(html).map(([, name]) => name)).toEqual(['Testkeeper Een', 'Testspeler van Twee', 'Proefman Drie'])
    expect(card(html)).not.toContain('hf-player-name-number')
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

  it('shows the heading and the sentence and no part for a season with no squad', async () => {
    withSquad({ completeness: undefined, pages: [], players: [] })

    const html = await render()

    expect(sentenceOf(html)).toBe('Van dit seizoen kennen we de selectie niet.')
    expect(card(html)).not.toMatch(/<h3|<ul|<li/)
  })

  it('shows no players when the chance is unknown, although some are stored', async () => {
    withSquad({ completeness: { bestSource: 'doelpunten', level: 'onbekend', playerCount: 5 } })

    expect(card(await render())).not.toMatch(/<h3|<ul|<li/)
  })

  it('credits the pages of the squad in the credit that ends the sidebar, with the English one named as such', async () => {
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

describe('the card Alle tijden on /spelers', () => {
  const allTimeCard = (html: string) =>
    /<section [^>]*aria-labelledby="alle-tijden">.*?<\/section>/s.exec(html)?.[0] ?? ''

  /** Matches of an earlier season in which each player scored the given number of goals. */
  const history = (counts: number[], competition: PublicMatch['competition'] = 'Eredivisie') => [
    { ...scorers(counts)[0]!, competition, season: '2010/11' },
  ]

  it('is soft in the sidebar under Doelpuntenmakers, with a button for an image', async () => {
    vi.mocked(getAllTimeMatches).mockResolvedValue(history([3, 2]))

    const html = await render()
    const sidebar = html.match(/<aside.*<\/aside>/s)?.[0] ?? ''

    expect(sidebar).toContain('<section class="hf-card hf-card-soft hf-card-shareable" aria-labelledby="alle-tijden">')
    expect(sidebar.indexOf('id="doelpuntenmakers"')).toBeLessThan(sidebar.indexOf('id="alle-tijden"'))
    expect(sidebar.indexOf('id="alle-tijden"')).toBeLessThan(sidebar.indexOf('id="bijzondere-doelpunten"'))
    expect(html.match(/data-hf-card-share/g)).toHaveLength(3)
  })

  it('says from which season it counts, and that all players scored when ten places show them all', async () => {
    vi.mocked(getAllTimeMatches).mockResolvedValue(history([3, 2]))

    const card = allTimeCard(await render())

    expect(plain(card)).toContain('Sinds 2010/11.')
    expect(plain(card)).toContain('2 spelers hebben gescoord')
    expect(rowsOf(card)).toEqual([
      ['1', 'Speler A', '3'],
      ['2', 'Speler B', '2'],
    ])
  })

  it('shows the first ten places, with everyone who shares the tenth, and says how many players scored', async () => {
    vi.mocked(getAllTimeMatches).mockResolvedValue(history([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 3, 1]))

    const card = allTimeCard(await render())

    expect(plain(card)).toContain('De top 10 van 12 spelers die scoorden')
    // The two players level in tenth place share one row.
    expect(rowsOf(card)).toHaveLength(10)
    expect(rowsOf(card).at(-1)?.[0]).toBe('10')
    expect(rowsOf(card).at(-1)?.[1]).toMatch(/Speler J.*Speler K/)
    expect(plain(card)).not.toContain('Speler L')
  })

  it('does not change with the season of the picker or with the matches of the page', async () => {
    vi.mocked(getAllTimeMatches).mockResolvedValue(history([4]))
    vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: scorers([9, 8]) })

    expect(rowsOf(allTimeCard(await render()))).toEqual([['1', 'Speler A', '4']])
  })

  it('follows the switch: the Eredivisie alone leaves out the goals of the cup', async () => {
    vi.mocked(getAllTimeMatches).mockResolvedValue([...history([1]), ...history([5], 'KNVB Beker')])

    const withSwitch = async (competitie?: string) =>
      allTimeCard(
        withoutIcons(
          renderToStaticMarkup(
            await PlayersPage({ searchParams: Promise.resolve(competitie === undefined ? {} : { competitie }) }),
          ),
        ),
      )

    expect(rowsOf(await withSwitch())).toEqual([['1', 'Speler A', '6']])
    expect(rowsOf(await withSwitch('eredivisie'))).toEqual([['1', 'Speler A', '1']])
  })

  it('is a sentence without a table when there is no goal in earlier seasons', async () => {
    const card = allTimeCard(await render())

    expect(plain(card)).toContain('We hebben nog geen doelpuntenmakers van eerdere seizoenen.')
    expect(card).not.toContain('<table')
    expect(card).not.toContain('hf-card-shareable')
  })

  it('is left out, and the rest of the page stays, when the goals of all seasons cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getAllTimeMatches).mockRejectedValue(new Error('no database'))

    const html = await render()

    expect(html).not.toContain('id="alle-tijden"')
    expect(html).toContain('id="doelpuntenmakers"')
  })
})
