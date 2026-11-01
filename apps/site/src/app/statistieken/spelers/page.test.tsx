import type { PublicMatch } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons, topScorersOf } from '../../../matches'
import { playersShortcuts } from '../../../statisticsShortcuts'
import { matchData } from '../../../test-matches'
import { withoutIcons } from '../../../without-icons'
import StatisticsPage from '../page'
import PlayersPage, { generateMetadata } from './page'

// Only the query is replaced: the split into the programme and the results is the real one.
vi.mock('../../../matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))

// The afternoon of Friday 23 October 2026 in the Netherlands.
const now = new Date('2026-10-23T13:40:00Z')

const render = async () => withoutIcons(renderToStaticMarkup(await PlayersPage({ searchParams: Promise.resolve({}) })))

const renderStatistics = async () =>
  withoutIcons(renderToStaticMarkup(await StatisticsPage({ searchParams: Promise.resolve({}) })))

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
      player: `Speler ${String.fromCharCode(65 + index)}`,
      playerId: null,
      playerName: null,
      playerPage: null,
      playerSearchTerm: null,
      stoppageMinutes: null,
    })),
  )

  return [{ ...played, goals, goalsAgainst: 0, goalsFor: goals.length }]
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27'])
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page /statistieken/spelers', () => {
  it('has one h1, Spelers, with the season picker beside it, and two h2, the cards Doelpuntenmakers and Bijzondere doelpunten, and no h3', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Spelers</h1>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="doelpuntenmakers"><span class="hf-heading-target"></span><span class="hf-heading-alias" id="topscorers"></span><a class="hf-heading-link" href="#doelpuntenmakers">Doelpuntenmakers</a></h2>',
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

  it('has the card as Statistieken had it before the top 5, but white, with a button for an image', async () => {
    const html = await render()

    expect(html).toContain('<section class="hf-card hf-card-shareable" aria-labelledby="doelpuntenmakers">')
    expect(html.match(/data-hf-card-share/g)).toHaveLength(2)
  })

  it('keeps the card on Statistieken soft, where it is in the sidebar', async () => {
    const html = await renderStatistics()

    expect(html).toContain(
      '<section class="hf-card hf-card-soft hf-card-shareable" aria-labelledby="doelpuntenmakers">',
    )
  })

  it('has the main column with the white card Doelpuntenmakers and a named sidebar with the soft card Bijzondere doelpunten', async () => {
    const html = await render()
    const main = html.match(/<main.*<\/main>/s)?.[0] ?? ''
    const sidebar = html.match(/<aside.*<\/aside>/s)?.[0] ?? ''

    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(sidebar).toMatch(/^<aside class="hf-page-sidebar" aria-label="Meer cijfers over de spelers">/)
    expect(main).toContain('id="doelpuntenmakers"')
    expect(main).not.toContain('id="bijzondere-doelpunten"')
    expect(sidebar).toContain('id="bijzondere-doelpunten"')
    expect(sidebar).not.toContain('id="doelpuntenmakers"')
    expect(main).toContain('<section class="hf-card hf-card-shareable" aria-labelledby="doelpuntenmakers">')
    expect(sidebar).toContain(
      '<section class="hf-card hf-card-soft hf-card-shareable" aria-labelledby="bijzondere-doelpunten">',
    )
  })

  it('has the card, the credit and nothing else: no other cards of Statistieken or Wedstrijden', async () => {
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

  it('counts the goals of our players over the matches, as the card on Statistieken did', async () => {
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
    expect(html).toContain('<a href="/statistieken/spelers">Probeer het opnieuw</a>')
    expect(error).toHaveBeenCalledWith(
      'Could not read the matches and the table for /statistieken/spelers: Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)',
    )
    expect(await generateMetadata()).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })

  it('has a title of its own, a description and the canonical link', async () => {
    const metadata = await generateMetadata()

    expect(metadata.title).toBe('Spelers')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/statistieken/spelers')
    expect(metadata.description).toContain('scoorden')
  })
})

describe('the card Bijzondere doelpunten on /statistieken/spelers', () => {
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
    player,
    playerId: null,
    playerName: null,
    playerPage: null,
    playerSearchTerm: null,
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

describe('the season picker on /statistieken/spelers', () => {
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
    expect(html).toContain('action="/statistieken/spelers/kies"')
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

describe('the list of Spelers and the card of Statistieken', () => {
  /** The rows of the card Doelpuntenmakers on each page, for the same matches. */
  async function bothFor(counts: number[]) {
    vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: scorers(counts) })

    return { all: rowsOf(await render()), top: rowsOf(await renderStatistics()) }
  }

  it('give the same figures in the same order, and the top 5 are the first rows of the list', async () => {
    const { all, top } = await bothFor([9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1])

    expect(all).toHaveLength(11)
    expect(top).toEqual(all.slice(0, 5))
    expect(all).toEqual(
      topScorersOf(scorers([9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1])).map((row) => [
        String(row.position),
        row.player,
        String(row.goals),
      ]),
    )
  })

  it('give the players who share fifth place on both pages, as the first rows of the list', async () => {
    const { all, top } = await bothFor([9, 8, 7, 6, 2, 2, 2, 1])

    expect(top).toHaveLength(7)
    expect(top).toEqual(all.slice(0, 7))
    expect(all).toHaveLength(8)
  })

  it('give everybody on both pages when five players or fewer scored', async () => {
    const { all, top } = await bothFor([3, 2, 1, 1])

    expect(top).toEqual(all)
  })
})

describe('the choice between all the matches and the Eredivisie on /statistieken/spelers', () => {
  // The cup tie of the test data, in which a player of the cup scored once.
  const cupScorer = {
    minute: 70,
    ours: true,
    ownGoal: false,
    penalty: false,
    player: 'Bekerman',
    playerId: null,
    playerName: null,
    playerPage: null,
    playerSearchTerm: null,
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
      '<div aria-label="Welke wedstrijden" class="hf-segmented-control hf-size-small" role="group" style="--hf-segmented-count:2;--hf-segmented-index:0"><a aria-current="page" href="/statistieken/spelers"><span class="hf-segmented-label" data-label="Alle wedstrijden">Alle wedstrijden</span></a><a href="/statistieken/spelers?competitie=eredivisie"><span class="hf-segmented-label" data-label="Eredivisie">Eredivisie</span></a></div>',
    )
    expect(switchOf(await renderWith({ competitie: 'eredivisie' }))).toBe(
      '<div aria-label="Welke wedstrijden" class="hf-segmented-control hf-size-small" role="group" style="--hf-segmented-count:2;--hf-segmented-index:1"><a href="/statistieken/spelers"><span class="hf-segmented-label" data-label="Alle wedstrijden">Alle wedstrijden</span></a><a aria-current="page" href="/statistieken/spelers?competitie=eredivisie"><span class="hf-segmented-label" data-label="Eredivisie">Eredivisie</span></a></div>',
    )
  })

  it('puts the switch in a plain cell, the first of the main column, before the card it controls', async () => {
    const html = await render()

    expect(html).toMatch(
      /<div class="hf-page-cells"><div aria-label="Welke wedstrijden" class="hf-segmented-control hf-size-small"/,
    )
    expect(html.indexOf('Welke wedstrijden')).toBeLessThan(html.indexOf('id="doelpuntenmakers"'))
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
