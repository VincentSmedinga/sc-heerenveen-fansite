import type { PublicMatch } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getFinalPlaces, getLeagueResults, getMatchData, getMatchSeasons } from '#src/matches'
import { matchShortcutsOf } from '#src/matchShortcuts'
import { getLiveReports, getReportAddresses } from '#src/report-data'
import { matchData } from '#src/test-matches'
import { withoutIcons } from '#src/without-icons'

import SeasonMatchesPage, { generateMetadata } from './page'

// Only the queries are replaced: the page of a season is the real one.
vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getFinalPlaces: vi.fn(),
  getLeagueResults: vi.fn(),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))

vi.mock('#src/report-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLiveReports: vi.fn(),
  getReportAddresses: vi.fn(),
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

/** The matches of the current season as if they were played a year earlier, in 2025/26. */
const inSeason2025 = (matches: PublicMatch[]): PublicMatch[] =>
  matches.map((match) => ({
    ...match,
    kickoffAt: match.kickoffAt === null ? null : new Date(match.kickoffAt.getTime() - 365 * 24 * 60 * 60 * 1000),
    matchDate: `2025${match.matchDate.slice(4)}`,
  }))

const params = (seizoen: string, searchParams: Record<string, string | string[]> = {}) => ({
  params: Promise.resolve({ seizoen }),
  searchParams: Promise.resolve(searchParams),
})

const render = async (seizoen = '2025-26', searchParams: Record<string, string | string[]> = {}) =>
  withoutIcons(renderToStaticMarkup(await SeasonMatchesPage(params(seizoen, searchParams))))

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
  vi.mocked(getFinalPlaces).mockReset()
  vi.mocked(getFinalPlaces).mockResolvedValue([])
  vi.mocked(getLeagueResults).mockReset()
  vi.mocked(getLeagueResults).mockResolvedValue([])
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getReportAddresses).mockReset()
  vi.mocked(getReportAddresses).mockResolvedValue(new Map())
  vi.mocked(getLiveReports).mockReset()
  vi.mocked(getLiveReports).mockResolvedValue(new Set())
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

describe('the card Eindstand of an earlier season', () => {
  // The table of the earlier season has two clubs that played each other twice, and the two
  // results say so: a season that is over is complete, but it has no switch all the same.
  const table = matchData.standings.slice(0, 2).map((row) => ({ ...row, played: 2 }))
  const results = [
    { awayClub: 'sc Heerenveen', awayGoals: 0, homeClub: 'Demo Boys', homeGoals: 1, playedOn: '2025-09-20', round: 7 },
    { awayClub: 'Demo Boys', awayGoals: 0, homeClub: 'sc Heerenveen', homeGoals: 1, playedOn: '2025-10-04', round: 8 },
  ]

  beforeEach(() => {
    vi.mocked(getMatchData).mockResolvedValue({ ...earlier, matches: [], season: '2025/26', standings: table })
    vi.mocked(getLeagueResults).mockResolvedValue(results)
  })

  it('says under the table which club lost points to a deduction', async () => {
    const deducted = table.map((row) => (row.club === 'Demo Boys' ? { ...row, pointsDeducted: 1 } : row))

    vi.mocked(getMatchData).mockResolvedValue({ ...earlier, matches: [], season: '2025/26', standings: deducted })

    expect(await render()).toContain('Demo Boys: 1 punt aftrek.')
  })

  it('has no switch, and does not ask for the results of the clubs', async () => {
    const html = await render()

    expect(html).toContain('id="eindstand"')
    expect(html).not.toContain('Welke stand')
    expect(getLeagueResults).not.toHaveBeenCalled()
  })

  it('shows the whole season for ?stand=laatste-5, as the normal card', async () => {
    const html = await render('2025-26', { stand: 'laatste-5' })

    expect(html).toContain('<caption class="hf-visually-hidden">Eindstand op 18 oktober 2026</caption>')
    expect(html).not.toContain('Welke stand')
    expect(html).not.toContain('laatste vijf wedstrijden')
  })
})

/** The part of the page under the h2 with this id, up to the next h2 or the end. */
function section(html: string, id: string) {
  const start = html.indexOf(`<h2 class="hf-heading-2 hf-heading-anchored" id="${id}">`)
  const end = html.indexOf('<h2', start + 1)

  return html.slice(start, end === -1 ? undefined : end)
}

describe('the cards with results of an earlier season, one for each competition', () => {
  const played: PublicMatch = { ...earlierMatch, goals: [], goalsAgainst: 0, goalsFor: 1, status: 'played' }
  const goal = (minute: number, kind: 'ownGoal' | 'penalty'): PublicMatch['goals'][number] => ({
    minute,
    ours: true,
    ownGoal: kind === 'ownGoal',
    penalty: kind === 'penalty',
    personFamilyName: null,
    personFamilyNamePrefix: null,
    personGivenName: null,
    personId: null,
    player: 'Proefman',
    playerId: null,
    playerPage: null,
    stoppageMinutes: null,
  })
  const match = (
    competition: PublicMatch['competition'],
    round: string,
    matchDate: string,
    extra = {},
  ): PublicMatch => ({
    ...played,
    competition,
    matchDate,
    opponent: `Club ${round}`,
    round,
    ...extra,
  })
  // The cup tie is played before the first match of the league, the play-offs after the last.
  const all = [
    match('Eredivisie', 'Speelronde 1', '2025-08-10'),
    match('Eredivisie', 'Speelronde 2', '2025-08-17', { goals: [goal(12, 'ownGoal')] }),
    match('KNVB Beker', 'Tweede ronde', '2025-08-05', { extraTime: true }),
    match('Play-offs Conference League', 'Halve finale', '2026-05-20', { goals: [goal(30, 'penalty')] }),
  ]
  const withMatches = (matches: PublicMatch[]) => vi.mocked(getMatchData).mockResolvedValue({ ...earlier, matches })
  const ids = (html: string) => [...html.matchAll(/<h2 [^>]*id="([^"]+)"/g)].map(([, id]) => id)

  it('has a card for the league, one for the cup and one for the play-offs, in that order, with the ids of the old link and the new ones', async () => {
    withMatches(all)
    const html = await render()

    expect(ids(html)).toEqual(['uitslagen', 'uitslagen-knvb-beker', 'uitslagen-play-offs', 'eindstand'])
    expect(html.match(/<h2[^>]*>.*?<\/h2>/g)?.map((heading) => heading.replace(/<[^>]+>/g, ''))).toEqual([
      'Eredivisie',
      'KNVB Beker',
      'Play-offs Conference League',
      'Eindstand',
    ])
  })

  it('names each card by its heading, so a screen reader hears the competition and then its lines', async () => {
    withMatches(all)
    const html = await render()

    for (const id of ['uitslagen', 'uitslagen-knvb-beker', 'uitslagen-play-offs']) {
      expect(html).toContain(`aria-labelledby="${id}"`)
    }
  })

  it('has the headings in the source in the order of the screen: the main before the sidebar, the cards in order', async () => {
    withMatches(all)
    const html = await render()
    const main = html.match(/<main[^>]*>.*<\/main>/s)?.[0] ?? ''

    expect(ids(main)).toEqual(['uitslagen', 'uitslagen-knvb-beker', 'uitslagen-play-offs'])
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('id="eindstand"'))
  })

  it('has each match in the card of its competition, the oldest first', async () => {
    withMatches(all)
    const html = await render()
    const league = section(html, 'uitslagen')

    expect(league.indexOf('Speelronde 1')).toBeGreaterThan(-1)
    expect(league.indexOf('Speelronde 1')).toBeLessThan(league.indexOf('Speelronde 2'))
    expect(league).not.toContain('Tweede ronde')
    expect(league).not.toContain('Halve finale')
    expect(section(html, 'uitslagen-knvb-beker')).toContain('Tweede ronde')
    expect(section(html, 'uitslagen-play-offs')).toContain('Halve finale')
  })

  it('leaves the competition out of the line, because the heading names it, and keeps the round', async () => {
    withMatches(all)
    const html = await render()
    const cards = ['uitslagen', 'uitslagen-knvb-beker', 'uitslagen-play-offs'].map((id) => section(html, id)).join('')

    expect(cards).toContain('Tweede ronde <span aria-hidden="true">·</span> <time')
    expect(cards).not.toContain('hf-match-label')
    expect(cards).not.toMatch(/(Eredivisie|KNVB Beker|Play-offs Conference League) <span aria-hidden/)
    expect(cards).not.toContain('Play-offs Conference League ·')
  })

  it('has the legend of its own matches in each card and not that of the whole season', async () => {
    withMatches(all)
    const html = await render()

    expect(section(html, 'uitslagen')).toContain('e.d. eigen doelpunt')
    expect(section(html, 'uitslagen')).not.toContain('n.v.')
    expect(section(html, 'uitslagen')).not.toContain('str. strafschop')
    expect(section(html, 'uitslagen-knvb-beker')).toContain('n.v. na verlenging')
    expect(section(html, 'uitslagen-knvb-beker')).not.toContain('e.d.')
    expect(section(html, 'uitslagen-play-offs')).toContain('str. strafschop')
    expect(section(html, 'uitslagen-play-offs')).not.toContain('n.v. na verlenging')
  })

  it('has the link to the course of the season in the card of the league only', async () => {
    withMatches(all)
    const html = await render()
    const link = 'href="/cijfers/2025-26#verloop-van-het-seizoen"'

    expect(section(html, 'uitslagen')).toContain(link)
    expect(section(html, 'uitslagen-knvb-beker')).not.toContain('verloop-van-het-seizoen')
    expect(section(html, 'uitslagen-play-offs')).not.toContain('verloop-van-het-seizoen')
    expect(html.match(/Het verloop van het seizoen/g)).toHaveLength(1)
  })

  it('has no card for a competition without matches', async () => {
    withMatches([all[0]!, all[3]!])
    const html = await render()

    expect(ids(html)).toEqual(['uitslagen', 'uitslagen-play-offs', 'eindstand'])
    expect(html).not.toContain('uitslagen-knvb-beker')
  })

  it('has one card Uitslagen with its sentence and no link to the course of the season for a season without matches', async () => {
    withMatches([])
    const html = await render()

    expect(ids(html)).toEqual(['uitslagen', 'eindstand'])
    expect(section(html, 'uitslagen')).toContain('We hebben nog geen uitslagen van dit seizoen.')
    expect(html).toContain('>Uitslagen</a>')
    expect(html).not.toContain('Het verloop van het seizoen')
  })

  it('has a heading for every link of the bar, in the same order', async () => {
    withMatches(all)
    const html = await render()

    expect(
      matchShortcutsOf(false, 0, ['Eredivisie', 'KNVB Beker', 'Play-offs Conference League']).map(({ href }) => href),
    ).toEqual(ids(html).map((id) => `#${id}`))
  })
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

  it('shows the results of the league from the first match of the season to the last, the oldest first', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: inSeason2025(matchData.matches),
      season: '2025/26',
    })
    const results = (await render()).match(/<h2[^>]*id="uitslagen">.*?(?=<h2)/s)?.[0] ?? ''
    // The made-up matches of the league in the order of their days, from the first one.
    const rounds = ['Speelronde 7', 'Speelronde 8', 'Speelronde 9', 'Speelronde 10']
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

  it('says "Gegevens nog niet beschikbaar" at each of two matches without a result, and nothing under the Eindstand', async () => {
    const lacking = (round: string, matchDate: string): PublicMatch => ({
      ...earlierMatch,
      goalsAgainst: null,
      goalsFor: null,
      kickoffAt: new Date(`${matchDate}T14:30:00Z`),
      matchDate,
      opponent: round,
      round,
      status: 'scheduled',
    })
    vi.mocked(getMatchData).mockResolvedValue({
      ...earlier,
      matches: [earlierMatch, lacking('Derde Club', '2025-10-04'), lacking('Vierde Club', '2025-10-11')],
    })
    const html = await render()
    const table = html.match(/<h2[^>]*id="eindstand">.*?(?=<section|<\/aside>)/s)?.[0] ?? ''

    expect(html.match(/Gegevens nog niet beschikbaar/g)).toHaveLength(2)
    expect(table).toContain('<table')
    expect(html).not.toContain('Gegevens nog niet bijgewerkt')
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

  it('has the results and the final table, and no other card without a coach in the table', async () => {
    const html = await render()

    expect(html.match(/<h2[^>]*id="([^"]+)"/g)?.map((heading) => /id="([^"]+)"/.exec(heading)?.[1])).toEqual([
      'uitslagen',
      'eindstand',
    ])
  })

  it('has a link under the final table to our place in the league on the statistics page of that season', async () => {
    const html = await render()

    expect(html).toContain('<a href="/cijfers/2025-26#onze-plek-in-de-competitie">Onze plek in de competitie</a>')
  })

  it('has a link under the results to the course of the season on the statistics page of that season', async () => {
    const html = await render()

    expect(html).toContain('<a href="/cijfers/2025-26#verloop-van-het-seizoen">Het verloop van het seizoen</a>')
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

describe('the card Onze plek door de jaren on the page of an earlier season', () => {
  it('is the card of the current season too, with every season in it', async () => {
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26'])
    vi.mocked(getMatchData).mockImplementation(async (season) => (season === '2025/26' ? earlier : matchData))
    vi.mocked(getFinalPlaces).mockResolvedValue([
      { now: false, row: { goalDifference: 3, points: 50, pointsDeducted: 0, position: 6 }, season: '2025/26' },
      { now: true, row: { goalDifference: 9, points: 20, pointsDeducted: 0, position: 2 }, season: '2026/27' },
    ])
    const html = await render('2025-26')

    expect(html).toContain('id="onze-plek-door-de-jaren"')
    // Both seasons are in the table, and the link of the current season is the base address.
    expect(html).toContain('href="/wedstrijden/2025-26"')
    expect(html).toContain('href="/wedstrijden"')
    expect(html).toContain('Sinds 2025/26')
  })
})
