import { listReportedMatches } from '@fansite/db/match-reports'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchSeasons } from './matches'
import {
  getAllReportAddresses,
  getLiveReports,
  getPublicReport,
  getPublicReports,
  getReportAddresses,
  isCompleteReport,
  parseReportSlug,
  reportAddress,
} from './report-data'
import { reportedMatch } from './test-reports'

vi.mock('@fansite/db/match-reports', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listReportedMatches: vi.fn(),
}))
vi.mock('./database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('./matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchSeasons: vi.fn(),
}))

// The afternoon of Friday 30 October 2026 in the Netherlands.
const now = new Date('2026-10-30T13:40:00Z')

// The reports are kept for a while, so every test begins two hours later than the one before it
// and the cache of the one before is over.
let tests = 0

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now.getTime() + ++tests * 2 * 60 * 60 * 1000))
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getMatchSeasons).mockResolvedValue(['2025/26', '2026/27'])
  vi.mocked(listReportedMatches).mockReset()
  vi.mocked(listReportedMatches).mockImplementation((_db, season) =>
    Promise.resolve(season === '2026/27' ? [reportedMatch()] : []),
  )
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the address of a match', () => {
  it('has the season, the day and the slug of the opponent, also in the current season', () => {
    expect(reportAddress('2026/27', '2026-10-24', 'testdorp-fc')).toBe('/wedstrijden/2026-27/2026-10-24-testdorp-fc')
  })

  it('reads the day and the club back from the last part of the address', () => {
    expect(parseReportSlug('2026-10-24-testdorp-fc')).toEqual({ clubSlug: 'testdorp-fc', matchDate: '2026-10-24' })
    expect(parseReportSlug('2026-11-01-fc-twente')).toEqual({ clubSlug: 'fc-twente', matchDate: '2026-11-01' })
  })

  it.each([
    '',
    'testdorp-fc',
    '2026-10-24',
    '2026-10-24-',
    '2026-02-30-testdorp-fc',
    '2026-13-01-testdorp-fc',
    '2026-10-24-Testdorp-FC',
    '2026-10-24-testdorp--fc',
    '2026-10-24-testdorp fc',
    '26-10-24-testdorp-fc',
  ])('does not read %j as an address of a match', (slug) => {
    expect(parseReportSlug(slug)).toBeUndefined()
  })
})

describe('isCompleteReport', () => {
  it('is true for a report that is klaar and follows the rules', () => {
    expect(isCompleteReport(reportedMatch())).toBe(true)
  })

  it('is false for a report that is bezig', () => {
    const reported = reportedMatch()

    reported.stored.report.status = 'bezig'

    expect(isCompleteReport(reported)).toBe(false)
  })

  it('is false for a report that does not follow the rules any more, such as goals that no longer add up', () => {
    const reported = reportedMatch()

    reported.match.goalsFor = 3

    expect(isCompleteReport(reported)).toBe(false)
  })
})

describe('getPublicReport', () => {
  it('finds the match of an address in a season that has matches', async () => {
    const found = await getPublicReport('2026/27', '2026-10-24-testdorp-fc')

    expect(found?.match.id).toBe(7)
  })

  it('finds nothing for another day, another club, another season or a season without matches', async () => {
    expect(await getPublicReport('2026/27', '2026-10-25-testdorp-fc')).toBeUndefined()
    expect(await getPublicReport('2026/27', '2026-10-24-andere-club')).toBeUndefined()
    expect(await getPublicReport('2025/26', '2026-10-24-testdorp-fc')).toBeUndefined()
    expect(await getPublicReport('2099/00', '2026-10-24-testdorp-fc')).toBeUndefined()
  })

  it('finds the page of a report that is bezig or no longer follows the rules, and no page for a match without a report', async () => {
    const bezig = reportedMatch()
    const broken = { ...reportedMatch(), clubSlug: 'andere-club' }

    bezig.stored.report.status = 'bezig'
    broken.match.goalsAgainst = 5
    vi.mocked(listReportedMatches).mockResolvedValue([bezig, broken])

    expect((await getPublicReport('2026/27', '2026-10-24-testdorp-fc'))?.stored.report.status).toBe('bezig')
    expect(await getPublicReport('2026/27', '2026-10-24-andere-club')).toBeDefined()
    expect(await getPublicReport('2026/27', '2026-10-24-zonder-verslag')).toBeUndefined()
  })

  it('lists no page of a report that is not complete in the sitemap, since search engines do not index it', async () => {
    const bezig = reportedMatch()
    const broken = { ...reportedMatch(), clubSlug: 'andere-club' }

    bezig.stored.report.status = 'bezig'
    broken.match.goalsAgainst = 5
    vi.mocked(listReportedMatches).mockResolvedValue([bezig, broken])

    expect(await getAllReportAddresses()).toEqual([])
  })

  it('does not ask the database for something that is not an address of a match', async () => {
    expect(await getPublicReport('2026/27', 'onzin')).toBeUndefined()
    expect(listReportedMatches).not.toHaveBeenCalled()
  })
})

describe('the addresses of the pages', () => {
  it('gives the address of a match by its competition and round, for the links in the results', async () => {
    expect(await getReportAddresses('2026/27')).toEqual(
      new Map([['Eredivisie|Speelronde 1', '/wedstrijden/2026-27/2026-10-24-testdorp-fc']]),
    )
  })

  it('links to the page of a report that is bezig too, by the same address', async () => {
    const bezig = reportedMatch()

    bezig.stored.report.status = 'bezig'
    vi.mocked(listReportedMatches).mockResolvedValue([bezig])

    expect(await getReportAddresses('2026/27')).toEqual(
      new Map([['Eredivisie|Speelronde 1', '/wedstrijden/2026-27/2026-10-24-testdorp-fc']]),
    )
  })

  it('gives all the addresses of all the seasons, for the sitemap', async () => {
    expect(await getAllReportAddresses()).toEqual(['/wedstrijden/2026-27/2026-10-24-testdorp-fc'])
  })
})

describe('the matches that are live', () => {
  /** A match that is still being played from `kickoffAt`, with a report that is bezig. */
  function scheduled(kickoffAt: Date | null, matchDate = '2026-10-30') {
    const reported = reportedMatch()

    reported.match.goalsAgainst = null
    reported.match.goalsFor = null
    reported.match.kickoffAt = kickoffAt
    reported.match.matchDate = matchDate
    reported.match.status = 'scheduled'
    reported.stored.report.status = 'bezig'

    return reported
  }

  it('has the match from its kick-off, by competition and round, as the addresses have them', async () => {
    vi.mocked(listReportedMatches).mockResolvedValue([scheduled(new Date('2026-10-30T12:00:00Z'))])

    expect(await getLiveReports('2026/27', new Date('2026-10-30T13:40:00Z'))).toEqual(
      new Set(['Eredivisie|Speelronde 1']),
    )
    expect(await getLiveReports('2026/27', new Date('2026-10-30T11:59:00Z'))).toEqual(new Set())
  })

  it('has a match without a kick-off on its day in Dutch time', async () => {
    vi.mocked(listReportedMatches).mockResolvedValue([scheduled(null)])

    expect(await getLiveReports('2026/27', new Date('2026-10-30T13:40:00Z'))).toEqual(
      new Set(['Eredivisie|Speelronde 1']),
    )
    expect(await getLiveReports('2026/27', new Date('2026-10-29T21:00:00Z'))).toEqual(new Set())
  })

  it('never has a match that was played', async () => {
    expect(await getLiveReports('2026/27', new Date('2026-10-30T13:40:00Z'))).toEqual(new Set())
  })

  it('is on the page and in the addresses, but not in the sitemap', async () => {
    const live = scheduled(new Date('2026-10-30T12:00:00Z'), '2026-10-24')

    vi.mocked(listReportedMatches).mockResolvedValue([live])

    expect((await getReportAddresses('2026/27')).size).toBe(1)
    expect(await getPublicReport('2026/27', '2026-10-24-testdorp-fc')).toBeDefined()
    expect(isCompleteReport(live)).toBe(false)
    expect(await getAllReportAddresses()).toEqual([])
  })
})

describe('how long the reports are kept', () => {
  /** A match of today that is live from its kick-off, or one that was played. */
  function match(live: boolean) {
    const reported = reportedMatch()

    reported.match.status = live ? 'scheduled' : 'played'
    reported.match.kickoffAt = new Date(Date.now() - 30 * 60 * 1000)
    reported.match.matchDate = new Date(Date.now()).toISOString().slice(0, 10)

    return reported
  }

  it('keeps a season with a live match for 15 seconds, and a goal shows within 20', async () => {
    vi.mocked(listReportedMatches).mockResolvedValue([match(true)])
    await getPublicReports('2026/27')
    // The first read fills both caches: the one of five minutes and the one of 15 seconds.
    expect(listReportedMatches).toHaveBeenCalledTimes(2)

    vi.setSystemTime(Date.now() + 10 * 1000)
    await getPublicReports('2026/27')
    expect(listReportedMatches).toHaveBeenCalledTimes(2)

    vi.setSystemTime(Date.now() + 10 * 1000)
    await getPublicReports('2026/27')
    expect(listReportedMatches).toHaveBeenCalledTimes(3)
  })

  it('keeps a season without a live match for five minutes', async () => {
    vi.mocked(listReportedMatches).mockResolvedValue([match(false)])

    for (const seconds of [0, 60, 120, 240]) {
      vi.setSystemTime(now.getTime() + tests * 2 * 60 * 60 * 1000 + seconds * 1000)
      await getPublicReports('2026/27')
    }

    expect(listReportedMatches).toHaveBeenCalledTimes(1)
  })
})
