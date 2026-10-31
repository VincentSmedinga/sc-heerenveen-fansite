import type { PublicMatch } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons } from '../../../matches'
import { statisticsShortcuts } from '../../../statisticsShortcuts'
import { matchData } from '../../../test-matches'
import { withoutIcons } from '../../../without-icons'
import SeasonStatisticsPage, { generateMetadata } from './page'

// Only the queries are replaced: the page of a season is the real one.
vi.mock('../../../matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))

// The afternoon of Friday 23 October 2026 in the Netherlands, in the season 2026/27.
const now = new Date('2026-10-23T13:40:00Z')

// An earlier season: its matches all begun, and a table that differs from the current one.
const earlierMatch = { ...matchData.matches[0]!, matchDate: '2025-09-20', opponent: 'Vorig Seizoen FC' }
const earlier = {
  ...matchData,
  matches: [earlierMatch],
  season: '2025/26',
  standings: matchData.standings.slice(0, 2),
}

const params = (seizoen: string) => ({ params: Promise.resolve({ seizoen }), searchParams: Promise.resolve({}) })

const render = async (seizoen = '2025-26') =>
  withoutIcons(renderToStaticMarkup(await SeasonStatisticsPage(params(seizoen))))

/** The digest of the error that `notFound()` and `redirect()` throw, which Next.js answers. */
const digestOf = async (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: unknown) => (error as { digest?: string }).digest,
  )

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26', '2024/25'])
  vi.mocked(getMatchData).mockImplementation((season) =>
    Promise.resolve(season === '2025/26' ? earlier : { ...matchData, season: season ?? '2026/27' }),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page of an earlier season, /statistieken/2025-26', () => {
  it('asks for the data of that season and of no other, after finding it among the seasons with matches', async () => {
    await render()

    expect(getMatchData).toHaveBeenCalledExactlyOnceWith('2025/26')
  })

  it('has a heading for every link of the bar, with the id the link goes to, in the same order', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2 [^>]*id="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(statisticsShortcuts.map(({ href }) => href)).toEqual(ids)
  })

  it('has the heading Statistieken, without the season, which the list beside it names', async () => {
    const html = await render()

    expect(html).toContain('<h1 class="hf-heading-1">Statistieken</h1>')
    expect(html).not.toContain('Statistieken 2025/26</h1>')
  })

  it('has none of the cards of Wedstrijden', async () => {
    const html = await render()

    for (const id of ['programma', 'uitslagen', 'stand', 'eindstand', 'hoofdtrainer']) {
      expect(html).not.toContain(`id="${id}"`)
    }
  })

  it('has the same nine cards as the current season, in the order of the bar', async () => {
    const html = await render()

    expect(html.match(/<h2[^>]*id="([^"]+)"/g)?.map((heading) => /id="([^"]+)"/.exec(heading)?.[1])).toEqual([
      'onze-plek-in-de-competitie',
      'verloop-van-het-seizoen',
      'reeksen',
      'thuis-en-uit',
      'doelpuntenmakers',
      'de-nul-gehouden',
      'doelpunten-per-kwartier',
      'hoe-de-wedstrijden-verlopen',
      'uitersten',
    ])
  })

  describe('the streaks', () => {
    const section = (html: string) => html.slice(html.indexOf('id="reeksen"'), html.indexOf('id="thuis-en-uit"'))
    const columns = (card: string) =>
      [...card.matchAll(/<th [^>]*scope="col"[^>]*>([^<]*)<\/th>/g)].map(([, name]) => name)

    it('has the columns Reeks and Langste, and no column Nu, with the six streaks as rows', async () => {
      const card = section(await render())

      expect(columns(card)).toEqual(['Reeks', 'Langste'])
      expect(card.match(/<th scope="row">/g)).toHaveLength(6)
      expect(card.match(/<td[^>]*>\d+<\/td>/g)).toHaveLength(6)
    })

    it('has no latest five matches: no row of marks and no list of matches', async () => {
      const card = section(await render())

      expect(card).not.toContain('Laatste wedstrijden')
      expect(card).not.toContain('hf-mark-row')
      expect(card).not.toContain('<ul')
      expect(card).not.toContain('Vorig Seizoen FC')
      expect(card).toContain('Gebaseerd op')
    })

    it('names the season in the caption and not "this season"', async () => {
      const card = section(await render())

      expect(card).toContain('De reeksen van sc Heerenveen in de Eredivisie in 2025/26')
      expect(card).not.toContain('dit seizoen')
    })

    it('names the season in the sentence without matches too', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...earlier, matches: [] })

      const card = section(await render())

      expect(card).toContain('We hebben geen uitslagen in 2025/26.')
      expect(card).not.toContain('dit seizoen')
    })
  })

  it('credits the Wikipedia pages of that season', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...earlier,
      pages: [{ kind: 'standings', readAt: new Date('2025-05-20T10:00:00Z'), title: 'Eredivisie 2025/26' }],
    } as typeof earlier)

    const html = await render()

    expect(html).toContain('Eredivisie 2025/26')
    expect(html).toContain('https://nl.wikipedia.org/wiki/Eredivisie_2025/26')
  })

  it('asks nothing of another domain', async () => {
    const html = await render()
    const addresses = [...html.matchAll(/(?:href|src|action)="(https?:\/\/[^"]+)"/g)].map(([, address]) => address)

    // The credit links to Wikipedia and to the licence; nothing is loaded from elsewhere.
    expect(addresses.length).toBeGreaterThan(0)
    expect(
      addresses.every((address) => /^https:\/\/(nl\.wikipedia\.org|creativecommons\.org)\//.test(address ?? '')),
    ).toBe(true)
    expect(html).not.toMatch(/\ssrc="/)
  })

  it('keeps the button for more clean sheets on the page of the season, not on /statistieken', async () => {
    const sheets = Array.from({ length: 11 }, (_, index): PublicMatch => ({
      ...earlierMatch,
      goals: [],
      goalsAgainst: 0,
      matchDate: `2025-09-${String(index + 1).padStart(2, '0')}`,
      opponent: `Proefclub ${index + 1}`,
      round: `Speelronde ${100 + index}`,
    }))

    vi.mocked(getMatchData).mockResolvedValue({ ...earlier, matches: sheets })

    expect(await render()).toContain('action="/statistieken/2025-26#nul-11"')
  })

  describe('the season picker', () => {
    it('is a form named Seizoen kiezen in the title row, next to the heading, that gets /statistieken/kies', async () => {
      const html = await render()

      expect(html).toMatch(
        /<div class="hf-page-title"><h1 class="hf-heading-1">Statistieken<\/h1><form [^>]*aria-label="Seizoen kiezen"/,
      )
      expect(html).toContain('action="/statistieken/kies"')
      expect(html).toContain('method="get"')
    })

    it('lists the seasons with matches, the newest first, with the season of the page chosen', async () => {
      const html = await render()
      const options = [...html.matchAll(/<option value="([^"]+)"( selected="")?>([^<]+)<\/option>/g)].map(
        ([, value, selected, label]) => [value, label, selected !== undefined],
      )

      expect(options).toEqual([
        ['2026-27', '2026/27', false],
        ['2025-26', '2025/26', true],
        ['2024-25', '2024/25', false],
      ])
      expect(html).toContain('name="seizoen"')
    })

    it('has a button Toon for a visitor without JavaScript', async () => {
      expect(await render()).toMatch(/<button[^>]*type="submit"[^>]*>Toon<\/button>/)
    })
  })

  describe('an address that is no page', () => {
    it.each(['2025-27', '2025-2026', '2025/26', 'seizoen', '25-26', '2025-26x', 'kies2'])(
      'is "niet gevonden" for %s, without asking for data',
      async (seizoen) => {
        expect(await digestOf(render(seizoen))).toContain('404')
        expect(getMatchData).not.toHaveBeenCalled()
      },
    )

    it('is "niet gevonden" for a season that has no matches in the database, without asking for its data', async () => {
      expect(await digestOf(render('2010-11'))).toContain('404')
      expect(getMatchData).not.toHaveBeenCalled()
    })

    it('is "niet gevonden" for a season that has not begun, which getMatchSeasons leaves out', async () => {
      expect(await digestOf(render('2027-28'))).toContain('404')
      expect(getMatchData).not.toHaveBeenCalled()
    })

    it('sends the current season to /statistieken, for a season to have one address', async () => {
      const digest = await digestOf(render('2026-27'))

      expect(digest).toContain('NEXT_REDIRECT')
      expect(digest).toContain('/statistieken;')
      expect(digest).not.toContain('308')
      expect(getMatchData).not.toHaveBeenCalled()
    })
  })

  it('shows the error page, in the HTML, when the database cannot be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getMatchSeasons).mockRejectedValue(new Error('connect ECONNREFUSED'))

    const html = await render()

    expect(html).toContain('Er ging iets mis')
    expect(html).toContain('href="/statistieken/2025-26"')
    expect(error).toHaveBeenCalledOnce()
  })
})

describe('the title, description and canonical address of a season', () => {
  const metadataOf = (seizoen: string) => generateMetadata({ params: Promise.resolve({ seizoen }) })

  it('names the season in the title, which the heading does not, and has the address of the season as the canonical address', async () => {
    const metadata = await metadataOf('2025-26')

    expect(metadata.title).toBe('Statistieken 2025/26')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/statistieken/2025-26')
    expect(metadata.openGraph?.url).toBe('https://sc.heerenveen.org/statistieken/2025-26')
    expect(metadata.description).toContain('2025/26')
    expect(metadata.description).toContain('De cijfers')
    expect(metadata.description).not.toContain('dit seizoen')
  })

  it('is noindex on the error page, as /statistieken is', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getMatchSeasons).mockRejectedValue(new Error('down'))

    expect(await metadataOf('2025-26')).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })
})
