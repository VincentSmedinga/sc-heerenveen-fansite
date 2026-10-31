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

const render = async () => withoutIcons(renderToStaticMarkup(await PlayersPage()))

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
  it('has one h1, Spelers, with the season picker beside it, and one h2, the card Doelpuntenmakers', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Spelers</h1>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="doelpuntenmakers"><span class="hf-heading-target"></span><span class="hf-heading-alias" id="topscorers"></span><a class="hf-heading-link" href="#doelpuntenmakers">Doelpuntenmakers</a></h2>',
    ])
    expect(html).toMatch(/<div class="hf-page-title"><h1 class="hf-heading-1">Spelers<\/h1>/)
  })

  it('has a heading for the link of the bar under the header, with the id the link goes to', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2 [^>]*id="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(playersShortcuts.map(({ href }) => href)).toEqual(ids)
    expect(html).toMatch(/<section class="hf-card[ a-z-]*" aria-labelledby="doelpuntenmakers">/)
  })

  it('has the card as Statistieken had it before the top 5: soft, with a button for an image', async () => {
    const html = await render()

    expect(html).toContain(
      '<section class="hf-card hf-card-soft hf-card-shareable" aria-labelledby="doelpuntenmakers">',
    )
    expect(html.match(/data-hf-card-share/g)).toHaveLength(1)
  })

  it('has the card, the credit and nothing else: no other cards of Statistieken or Wedstrijden', async () => {
    const html = await render()

    for (const id of ['reeksen', 'uitersten', 'de-nul-gehouden', 'stand', 'programma', 'hoofdtrainer']) {
      expect(html).not.toContain(`id="${id}"`)
    }
    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).not.toContain('<aside')
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
    const outside = html.replace(/<p class="hf-meta hf-wikipedia-credit".*?<\/p>/s, '')

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

  it('has one credit under the card, with the time of the last reading, and loads nothing from another domain', async () => {
    const html = await render()

    expect(html.match(/class="hf-meta hf-wikipedia-credit"/g)).toHaveLength(1)
    expect(html).toContain('href="https://nl.wikipedia.org/wiki/Eredivisie_2026/27_(mannenvoetbal)"')
    expect(html).toContain('<time dateTime="2026-10-23T12:05:00.000Z">23 oktober 2026 om 14:05</time>')
    expect(html.lastIndexOf('hf-wikipedia-credit')).toBeGreaterThan(html.lastIndexOf('</table>'))
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
