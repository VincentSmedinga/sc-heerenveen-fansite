import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons } from '../../../matches'
import { matchShortcutsOf } from '../../../matchShortcuts'
import { matchData } from '../../../test-matches'
import { withoutIcons } from '../../../without-icons'
import SeasonMatchesPage, { generateMetadata } from './page'

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
  withoutIcons(renderToStaticMarkup(await SeasonMatchesPage(params(seizoen))))

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

describe('the page of an earlier season, /wedstrijden/2025-26', () => {
  it('asks for the data of that season and of no other, after finding it among the seasons with matches', async () => {
    await render()

    expect(getMatchData).toHaveBeenCalledExactlyOnceWith('2025/26')
  })

  it('shows the matches and the table of that season and not those of the current one', async () => {
    const html = await render()

    expect(html).toContain('Vorig Seizoen FC')
    expect(html).not.toContain('SV Proefdorp')
    expect(html).not.toContain('Voorbeeld United')
  })

  it('shows the results from the first match of the season to the last, the oldest first', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: matchData.matches.map((match) => ({
        ...match,
        kickoffAt: match.kickoffAt === null ? null : new Date(match.kickoffAt.getTime() - 365 * 24 * 60 * 60 * 1000),
        matchDate: `2025${match.matchDate.slice(4)}`,
      })),
      season: '2025/26',
    })
    const results = (await render()).match(/<h2[^>]*id="uitslagen">.*?(?=<h2)/s)?.[0] ?? ''
    // The made-up matches in the order of their days, from the first of the season.
    const rounds = ['Speelronde 7', 'Speelronde 8', 'Speelronde 9', 'Tweede ronde', 'Speelronde 10']
    const positions = rounds.map((round) => results.indexOf(round))

    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('calls the table Eindstand: the heading, its anchor, the caption for a screen reader and the name of the sidebar', async () => {
    const html = await render()

    expect(html).toContain(
      '<h2 class="hf-heading-2 hf-heading-anchored" id="eindstand"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#eindstand">Eindstand</a></h2>',
    )
    expect(html).toContain('<caption class="hf-visually-hidden">Eindstand op ')
    expect(html).toContain('aria-label="De eindstand"')
    expect(html).toContain('aria-labelledby="eindstand"')
    expect(html).not.toContain('id="stand"')
    expect(html).not.toContain('>Stand</')
  })

  it('has a heading for every link of the bar, with the id the link goes to, in the same order', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2 [^>]*id="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(matchShortcutsOf(false).map(({ href }) => href)).toEqual(ids)
  })

  it('says in the empty card that the final table is not there yet', async () => {
    vi.mocked(getMatchData).mockResolvedValue({ ...earlier, standings: [] })
    const html = await render()

    expect(html).toContain('We hebben de eindstand nog niet gevonden. Kijk straks nog eens.')
    expect(html).not.toContain('We hebben de stand nog niet gevonden.')
  })

  it('shows the head coaches of that season, in the order they began', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...earlier,
      coaches: [
        {
          endDate: '2025-12-14',
          endPrecision: 'day',
          interim: false,
          name: 'Robin van Persie',
          startDate: '2024-01-01',
          startPrecision: 'year',
          wikipediaPage: 'Robin van Persie',
        },
        {
          endDate: null,
          endPrecision: null,
          interim: true,
          name: 'Henk Brugge',
          startDate: '2025-12-15',
          startPrecision: 'day',
          wikipediaPage: null,
        },
      ],
    })

    const html = await render()

    expect(html).toContain('href="#hoofdtrainer">Hoofdtrainers</a></h2>')
    expect(html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|')).toContain(
      '|tot 14 dec 2025|Robin| |van Persie|vanaf 15 dec 2025|Henk| |Brugge| |(interim)|',
    )
  })

  it('has the heading Wedstrijden, without the season, which the list beside it names', async () => {
    const html = await render()

    expect(html).toContain('<h1 class="hf-heading-1">Wedstrijden</h1>')
    expect(html).not.toContain('Wedstrijden 2025/26</h1>')
  })

  it('has no card for the programme, which a season that is over has nothing to show in', async () => {
    const html = await render()

    expect(html).not.toContain('id="programma"')
    expect(html).not.toContain('>Programma</a>')
    expect(html).toContain('id="uitslagen"')
    expect(html).toContain('id="eindstand"')
  })

  it('has the results, the final table and no other card without a coach in the table', async () => {
    const html = await render()

    expect(html.match(/<h2[^>]*id="([^"]+)"/g)?.map((heading) => /id="([^"]+)"/.exec(heading)?.[1])).toEqual([
      'uitslagen',
      'eindstand',
    ])
  })

  it('has a link under the final table to our place in the league on the statistics page of that season', async () => {
    const html = await render()

    expect(html).toContain('<a href="/statistieken/2025-26#onze-plek-in-de-competitie">Onze plek in de competitie</a>')
  })

  it('has a link under the results to the course of the season on the statistics page of that season', async () => {
    const html = await render()

    expect(html).toContain('<a href="/statistieken/2025-26#verloop-van-het-seizoen">Het verloop van het seizoen</a>')
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

  describe('the season picker', () => {
    it('is a form named Seizoen kiezen in the title row, next to the heading, that gets /wedstrijden/kies', async () => {
      const html = await render()

      expect(html).toMatch(
        /<div class="hf-page-title"><h1 class="hf-heading-1">Wedstrijden<\/h1><form [^>]*aria-label="Seizoen kiezen"/,
      )
      expect(html).toContain('action="/wedstrijden/kies"')
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

    it('sends the current season to /wedstrijden, for a season to have one address', async () => {
      const digest = await digestOf(render('2026-27'))

      expect(digest).toContain('NEXT_REDIRECT')
      expect(digest).toContain('/wedstrijden;')
      expect(digest).not.toContain('308')
      expect(getMatchData).not.toHaveBeenCalled()
    })
  })

  it('shows the error page, in the HTML, when the database cannot be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getMatchSeasons).mockRejectedValue(new Error('connect ECONNREFUSED'))

    const html = await render()

    expect(html).toContain('Er ging iets mis')
    expect(html).toContain('href="/wedstrijden/2025-26"')
    expect(error).toHaveBeenCalledOnce()
  })
})

describe('the title, description and canonical address of a season', () => {
  const metadataOf = (seizoen: string) => generateMetadata({ params: Promise.resolve({ seizoen }) })

  it('names the season in the title, which the heading does not, and has the address of the season as the canonical address', async () => {
    const metadata = await metadataOf('2025-26')

    expect(metadata.title).toBe('Wedstrijden 2025/26')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/wedstrijden/2025-26')
    expect(metadata.openGraph?.url).toBe('https://sc.heerenveen.org/wedstrijden/2025-26')
    expect(metadata.description).toContain('2025/26')
    expect(metadata.description).toContain('eindstand')
    expect(metadata.description).not.toContain('dit seizoen')
  })

  it('is noindex on the error page, as /wedstrijden is', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getMatchSeasons).mockRejectedValue(new Error('down'))

    expect(await metadataOf('2025-26')).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })
})
