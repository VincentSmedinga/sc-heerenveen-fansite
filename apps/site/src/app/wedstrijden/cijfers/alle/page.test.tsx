import type { PublicMatch } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AllMatch, FinalPlace } from '#src/matches'

import { getAllMatches, getCoachResultData, getEditedMatches, getFinalPlaces, getMatchSeasons } from '#src/matches'
import { getSourcePages } from '#src/opponents'
import { allSeasonsStatisticsShortcuts } from '#src/statisticsShortcuts'
import { coachResultData, matchData } from '#src/test-matches'
import { withoutIcons } from '#src/without-icons'

import AllSeasonsStatisticsPage, { generateMetadata } from './page'

// Only the queries are replaced: the counting is the real one.
vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAllMatches: vi.fn(),
  getCoachResultData: vi.fn(),
  getEditedMatches: vi.fn(),
  getFinalPlaces: vi.fn(),
  getMatchSeasons: vi.fn(),
}))
vi.mock('#src/opponents', () => ({ getSourcePages: vi.fn() }))

const finalPlaces: FinalPlace[] = [
  { now: false, row: { goalDifference: 3, points: 50, pointsDeducted: 0, position: 6 }, season: '2025/26' },
  { now: true, row: { goalDifference: 9, points: 20, pointsDeducted: 0, position: 2 }, season: '2026/27' },
]

// The made-up matches of the current season, and one of an older season with a number of
// visitors that no match of this season reaches.
const older: AllMatch = {
  ...(matchData.matches[0] as PublicMatch),
  attendance: 30_000,
  goalsAgainst: 0,
  goalsFor: 5,
  home: false,
  matchDate: '2001-09-01',
  opponent: 'Ouwe Bekende',
  season: '2001/02',
}
const matches: AllMatch[] = [older, ...matchData.matches.map((match) => ({ ...match, season: '2026/27' }))]

const now = new Date('2026-10-23T13:40:00Z')

async function render(searchParams: Record<string, string | string[] | undefined> = {}) {
  return withoutIcons(
    renderToStaticMarkup(await AllSeasonsStatisticsPage({ searchParams: Promise.resolve(searchParams) })),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getAllMatches).mockResolvedValue(matches)
  vi.mocked(getCoachResultData).mockResolvedValue(coachResultData)
  vi.mocked(getEditedMatches).mockResolvedValue(false)
  vi.mocked(getFinalPlaces).mockResolvedValue(finalPlaces)
  vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26', '2001/02'])
  vi.mocked(getSourcePages).mockResolvedValue([
    { kind: 'results', language: 'nl', readAt: new Date('2026-10-23T10:00:00Z'), season: '2026/27', title: 'x' },
  ] as never)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page /wedstrijden/cijfers/alle', () => {
  it('has one h1, four h2 headings for the groups and the h3 headings of the cards, in the order of the source', async () => {
    const html = await render()
    const headings = [...html.matchAll(/<h([1-6])[^>]*?(?: id="([^"]+)")?>/g)].map(
      ([, level, id]) => `${level} ${id ?? ''}`,
    )

    expect(headings).toEqual([
      '1 ',
      '2 seizoenen',
      '3 onze-plek-door-de-jaren',
      '3 resultaten-per-hoofdtrainer',
      '2 uitslagen',
      '3 thuis-en-uit',
      '3 hoe-vaak-welke-uitslag',
      '3 records',
      '2 doelpunten',
      '3 doelpunten-per-kwartier',
      '3 de-nul-gehouden',
      '2 rondom-de-wedstrijd',
      '3 toeschouwers',
    ])
  })

  it('has a heading for every link of the bar, with the id the link goes to, in the same order', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2 [^>]*id="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(allSeasonsStatisticsShortcuts.map((item) => item.href)).toEqual(ids)
  })

  it('has "Alle seizoenen" first in the season picker, marked as the choice', async () => {
    const html = await render()
    const options = [...html.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/g)].map(
      ([, value, label]) => [value, label],
    )

    expect(options.slice(0, 2)).toEqual([
      ['alle', 'Alle seizoenen'],
      ['2026-27', '2026/27'],
    ])
    expect(html).toMatch(/<option[^>]*selected[^>]*value="alle"|<option[^>]*value="alle"[^>]*selected/)
  })

  it('counts every match of every season in the key figures, since the first season', async () => {
    const html = await render()
    const row = html.match(/<ul aria-label="Kerngetallen".*?<\/ul>/s)?.[0] ?? ''
    const items = [...row.matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map(([, item]) => item?.replaceAll(/<[^>]*>/g, ''))

    expect(items).toEqual([
      '5 wedstrijden, gespeeld in alle competities sinds 2001/02',
      '4–1–0 gewonnen, gelijk, verloren, in alle competities sinds 2001/02',
      '13–3 doelpunten, voor en tegen in alle competities sinds 2001/02',
    ])
  })

  it('has the cards of all seasons and none of the cards of one season', async () => {
    const html = await render()

    for (const id of ['verloop-van-het-seizoen', 'hoe-de-wedstrijden-verlopen', 'reeksen', 'uitersten']) {
      expect(html).not.toContain(`id="${id}"`)
    }
  })

  it('puts the records of all seasons in the card Records, with the biggest win of an older season and its year', async () => {
    const html = await render()
    const records = html.slice(html.indexOf('id="records"'), html.indexOf('id="doelpunten"'))

    expect(records).toContain('Grootste overwinning')
    expect(records).toContain('Ouwe Bekende')
    expect(records).toContain('1 sep 2001')
    expect(records).toContain('Langste reeks zonder nederlaag')
    expect(records).toContain('Langste reeks zonder zege')
    expect(records).toContain('Alle 5 gespeelde wedstrijden')
  })

  it('has the most visitors of any season in the card Toeschouwers, and no chart', async () => {
    const html = await render()
    const card = html.slice(html.indexOf('id="toeschouwers"'))

    expect(card).toContain('Het meest ooit: 30.000, bij Ouwe Bekende op 1 september 2001')
    expect(card).not.toContain('hf-bar-chart')
  })

  it('says "Sinds 2001/02" under the image of each card', async () => {
    const html = await render()

    expect(html.match(/data-hf-card-share/g)?.length).toBeGreaterThan(0)
    expect(html).not.toContain('Seizoen 2001/02')
  })

  it('follows the choice of competition, and keeps it in the address of the switch', async () => {
    vi.mocked(getAllMatches).mockResolvedValue(matches.map((match) => ({ ...match, competition: 'Eredivisie' })))

    const html = await render({ competitie: 'eredivisie' })

    expect(html).toContain('in de Eredivisie sinds 2001/02')
  })

  it('credits Wikipedia', async () => {
    expect(await render()).toContain('Wikipedia')
  })

  it('is left without the card of the places when they can not be read', async () => {
    vi.mocked(getFinalPlaces).mockRejectedValue(new Error('no database'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const html = await render()

    expect(html).not.toContain('id="onze-plek-door-de-jaren"')
    expect(html).toContain('id="resultaten-per-hoofdtrainer"')
  })

  it('shows the error page when the matches can not be read, and logs why', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(getAllMatches).mockRejectedValue(new Error('no database'))

    const html = await render()

    expect(html).not.toContain('id="uitslagen"')
    expect(error).toHaveBeenCalledWith(expect.stringContaining('/wedstrijden/cijfers/alle'))
  })

  it('is the page "niet gevonden" for a choice of competition it does not know, and for two', async () => {
    await expect(render({ competitie: 'onzin' })).rejects.toThrow()
    await expect(render({ competitie: ['eredivisie', 'beker'] })).rejects.toThrow()
  })
})

describe('the metadata of /wedstrijden/cijfers/alle', () => {
  it('has a title and a description of its own, and the address as its canonical one', async () => {
    const metadata = await generateMetadata()

    expect(metadata.title).toBe('Cijfers sinds 1990/91')
    expect(metadata.description).toContain('sinds 1990/91')
    expect(metadata.alternates?.canonical).toMatch(/\/wedstrijden\/cijfers\/alle$/)
  })

  it('is kept out of search engines when the data can not be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getAllMatches).mockRejectedValue(new Error('no database'))

    expect((await generateMetadata()).robots).toEqual({ index: false })
  })
})
