import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData } from '#src/matches'
import { getPublicReport } from '#src/report-data'
import { matchData } from '#src/test-matches'
import { reportedMatch } from '#src/test-reports'
import { withoutIcons } from '#src/without-icons'

import MatchReportPage, { generateMetadata } from './page'

vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchData: vi.fn(),
}))
vi.mock('#src/report-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPublicReport: vi.fn(),
}))

// The afternoon of Friday 30 October 2026 in the Netherlands.
const now = new Date('2026-10-30T13:40:00Z')

const params = (seizoen = '2026-27', wedstrijd = '2026-10-24-testdorp-fc') => Promise.resolve({ seizoen, wedstrijd })

const render = async (seizoen?: string, wedstrijd?: string) =>
  withoutIcons(renderToStaticMarkup(await MatchReportPage({ params: params(seizoen, wedstrijd) })))

/** The text of some HTML, as a screen reader and a copy have it. */
const plain = (html: string) =>
  html
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getPublicReport).mockReset()
  vi.mocked(getPublicReport).mockImplementation((season, slug) =>
    Promise.resolve(season === '2026/27' && slug === '2026-10-24-testdorp-fc' ? reportedMatch() : undefined),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page of a match', () => {
  it('has one h1 with the clubs, and the h2 headings Verloop and Opstelling with a h3 for each team', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)?.map((heading) => plain(heading))).toEqual([
      'sc Heerenveen – Testdorp FC',
      'Verloop',
      'Opstelling',
      'sc Heerenveen',
      'Testdorp FC',
    ])
  })

  it('shows the result, the competition, the day, the stadium, the attendance and the referee', async () => {
    const text = plain(await render())

    expect(text).toContain('sc Heerenveen 2–1 2 tegen 1 Testdorp FC')
    expect(text).toContain('Competitie Eredivisie, Speelronde 1')
    expect(text).toContain('Datum za 24 okt 2026')
    expect(text).toContain('Stadion Stadion Proeflaan')
    expect(text).toContain('Toeschouwers 21.022')
    expect(text).toContain('Scheidsrechter Pieter Maquette')
  })

  it('leaves out the facts that are not known', async () => {
    const reported = reportedMatch()

    reported.match.attendance = null
    reported.match.referee = null
    reported.match.stadium = null
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const text = plain(await render())

    expect(text).not.toContain('Toeschouwers')
    expect(text).not.toContain('Scheidsrechter')
    expect(text).not.toContain('Stadion Stadion')
  })

  it('says that there was no audience for a match without one', async () => {
    const reported = reportedMatch()

    reported.match.attendance = 0
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    expect(plain(await render())).toContain('Toeschouwers Zonder publiek')
  })

  it('shows the course of the match as an ordered list, with a word for every event', async () => {
    const html = await render()
    const list = html.slice(html.indexOf('<ol'), html.indexOf('</ol>'))

    expect(list).toContain('aria-labelledby="verloop"')
    expect(plain(list)).toContain('Doelpunt')
    expect(plain(list)).toContain('Eigen doelpunt')
    expect(plain(list)).toContain('Doelpunt uit een strafschop')
    expect(plain(list)).toContain('Gemiste strafschop')
    expect(plain(list)).toContain('Wissel')
    expect(plain(list)).toContain('Gele kaart')
    expect(plain(list)).toContain('Rode kaart')
    expect(plain(list)).toContain('assist: Thijs Idzenga')
  })

  it('shows the line-ups of both teams with the bench, the captain and what happened in words', async () => {
    const html = await render()
    const text = plain(html)

    expect([...html.matchAll(/<ul aria-label="([^"]*)"/gu)].map((list) => list[1])).toEqual([
      'Basis sc Heerenveen',
      'Bank sc Heerenveen',
      'Basis Testdorp FC',
      'Bank Testdorp FC',
    ])
    expect(text).toContain('aanvoerder')
    expect(text).toContain('Ingevallen in de 60e minuut voor Idzenga')
    expect(text).toContain('Gewisseld in de 60e minuut, vervangen door Gerrit Nepper')
    expect(text).toContain('Gele kaart in de 30e minuut')
  })

  it('shows the formation of each team next to the name of the team, as eigen administratie', async () => {
    const html = await render()

    expect(plain(html)).toContain('sc Heerenveen Formatie: 4-3-3')
    expect(plain(html)).toContain('Testdorp FC Formatie: 4-4-2')
    expect(html.match(/Formatie: /g)).toHaveLength(2)
    expect(plain(html)).toContain('komen uit onze eigen administratie')
  })

  it('shows nothing about a formation for a team that has none, and takes nothing else away', async () => {
    const reported = reportedMatch()

    reported.stored.report.formationOurs = null
    reported.stored.report.formationOpponent = null
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const html = await render()

    expect(html).not.toContain('Formatie')
    expect(html.match(/<h3/g)).toHaveLength(2)
    expect(plain(html)).toContain('Basis')
  })

  it('shows the formation of one team only when the other has none', async () => {
    const reported = reportedMatch()

    reported.stored.report.formationOpponent = null
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    expect((await render()).match(/Formatie: /g)).toHaveLength(1)
  })

  it('shows one sentence instead of the line-up of an opponent that is not complete', async () => {
    const reported = reportedMatch()

    reported.stored.report.opponentComplete = false
    reported.stored.appearances = reported.stored.appearances.filter((player) => player.ours)
    reported.stored.substitutions = reported.stored.substitutions.filter((substitution) => substitution.ours)
    reported.stored.cards = reported.stored.cards.filter((card) => card.ours)
    reported.stored.goals = reported.stored.goals.map((goal) => ({
      ...goal,
      appearanceId: goal.ours ? goal.appearanceId : null,
    }))
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const html = await render()

    expect(plain(html)).toContain('De opstelling van Testdorp FC hebben we niet.')
    expect(html).not.toContain('aria-label="Basis Testdorp FC"')
    expect(html.match(/<h3/g)).toHaveLength(1)
  })

  it('says that there was extra time, the score after 90 minutes and the shoot-out in words', async () => {
    const reported = reportedMatch()

    reported.match.extraTime = true
    reported.match.afterNinetyFor = 1
    reported.match.afterNinetyAgainst = 1
    reported.match.goalsFor = 2
    reported.match.goalsAgainst = 2
    reported.match.penaltiesFor = 4
    reported.match.penaltiesAgainst = 3
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    expect(plain(await render())).toContain('Na verlenging. Na 90 minuten 1–1. Na strafschoppen 4–3.')
  })

  it('links back to the matches of the season, and credits Wikipedia and our own records', async () => {
    const html = await render()
    const text = plain(html)

    expect(html).toContain('href="/wedstrijden"')
    expect(text).toContain('Wedstrijden 2026/27')
    expect(text).toContain(
      'De opstelling, de wissels, de kaarten en de assists komen uit onze eigen administratie, naar het wedstrijdformulier.',
    )
    expect(text).toContain('Wikipedia')
    expect(text).toContain('CC BY-SA 4.0')
  })

  it('names no source for the records when the report has none', async () => {
    const reported = reportedMatch()

    reported.stored.report.source = null
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    expect(plain(await render())).toContain('komen uit onze eigen administratie.')
  })

  it('loads nothing from another domain', async () => {
    const html = await render()

    expect(html).not.toMatch(/<(img|script|iframe|link)[^>]*(src|href)="https?:\/\/(?!nl\.wikipedia\.org)/u)
    expect(html).not.toContain('<img')
  })

  it('is "niet gevonden" for a match without a page, an address that is not one and a season that does not exist', async () => {
    await expect(render('2026-27', '2026-10-25-testdorp-fc')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(render('2026-27', 'onzin')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(render('onzin', '2026-10-24-testdorp-fc')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(render('2025-26', '2026-10-24-testdorp-fc')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  })

  it('shows the page for a server error, and says so in the log, when the database fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getPublicReport).mockRejectedValue(new Error('boem'))

    expect(plain(await render())).toContain('Er ging iets mis')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Could not read the match report'))
  })
})

describe('the metadata of the page of a match', () => {
  it('names the clubs, the result and the day in the title and the description', async () => {
    const metadata = await generateMetadata({ params: params() })

    expect(metadata.title).toBe('sc Heerenveen 2–1 Testdorp FC, 24 oktober 2026')
    expect(metadata.description).toContain('sc Heerenveen – Testdorp FC')
    expect(metadata.description).toContain('24 oktober 2026')
    expect(metadata.description).toContain('2–1')
  })

  it('has the address of the page as the canonical address', async () => {
    const metadata = await generateMetadata({ params: params() })

    expect(metadata.alternates?.canonical).toMatch(/\/wedstrijden\/2026-27\/2026-10-24-testdorp-fc$/u)
  })

  it('names the clubs in the order of the match when we play away', async () => {
    const reported = reportedMatch()

    reported.match.home = false
    reported.match.goalsFor = 2
    reported.match.goalsAgainst = 1
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    expect((await generateMetadata({ params: params() })).title).toBe('Testdorp FC 1–2 sc Heerenveen, 24 oktober 2026')
  })

  it('has no metadata for an address that is not a page, and keeps a page that failed out of the index', async () => {
    expect(await generateMetadata({ params: params('2026-27', '2026-10-25-testdorp-fc') })).toEqual({})

    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getPublicReport).mockRejectedValue(new Error('boem'))

    expect((await generateMetadata({ params: params() })).robots).toEqual({ index: false })
  })
})
