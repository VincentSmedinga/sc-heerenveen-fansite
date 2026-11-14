import type { PublicMatch } from '@fansite/db/queries'

import { existsSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FinalPlace } from '#src/matches'

import { getCoachResultData, getFinalPlaces, getMatchData, getMatchSeasons } from '#src/matches'
import { statisticsShortcuts } from '#src/statisticsShortcuts'
import { coachResultData, matchData } from '#src/test-matches'
import { leagueAndCup, switchHtml } from '#src/test-switch'
import { withoutIcons } from '#src/without-icons'

import StatisticsPage, { generateMetadata } from './page'

// Only the query is replaced: the split into the programme and the results is the real one.
vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCoachResultData: vi.fn(),
  getFinalPlaces: vi.fn(),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))

const finalPlaces: FinalPlace[] = [
  { now: false, row: { goalDifference: 3, points: 50, pointsDeducted: 0, position: 6 }, season: '2025/26' },
  { now: true, row: { goalDifference: 9, points: 20, pointsDeducted: 0, position: 2 }, season: '2026/27' },
]

// The afternoon of Friday 23 October 2026 in the Netherlands.
const now = new Date('2026-10-23T13:40:00Z')

async function render(searchParams: Record<string, string | string[] | undefined> = {}) {
  return withoutIcons(renderToStaticMarkup(await StatisticsPage({ searchParams: Promise.resolve(searchParams) })))
}

/** The address `?competitie=eredivisie`: the cards count the Eredivisie alone. */
const eredivisie = { competitie: 'eredivisie' }

/** The part of the page under the h2 with this id, up to the next h2 or the end. */
function section(html: string, id: string) {
  const start = html.indexOf(`<h3 class="hf-heading-3 hf-heading-anchored" id="${id}">`)
  const end = html.indexOf('<h', start + 1)

  return html.slice(start, end === -1 ? undefined : end)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getCoachResultData).mockReset()
  vi.mocked(getFinalPlaces).mockReset()
  vi.mocked(getFinalPlaces).mockResolvedValue(finalPlaces)
  vi.mocked(getCoachResultData).mockResolvedValue(coachResultData)
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27'])
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page /wedstrijden/cijfers', () => {
  it('has one h1, four h2 headings for the groups and nine h3 headings for the cards, in the order of the source', async () => {
    const html = await render()
    const headings = [...html.matchAll(/<h([1-6])[^>]*?(?: id="([^"]+)")?>/g)].map(
      ([, level, id]) => `${level} ${id ?? ''}`,
    )

    expect(headings).toEqual([
      '1 ',
      '2 competitie',
      '3 verloop-van-het-seizoen',
      '3 hoe-de-wedstrijden-verlopen',
      '2 uitslagen',
      '3 thuis-en-uit',
      '3 reeksen',
      '3 hoe-vaak-welke-uitslag',
      '3 uitersten',
      '2 doelpunten',
      '3 doelpunten-per-kwartier',
      '3 de-nul-gehouden',
      '2 rondom-de-wedstrijd',
      '3 toeschouwers',
    ])
  })

  it('has the row of four key figures under the toolbar, as a list and not as headings', async () => {
    const html = await render()
    const row = html.match(/<ul aria-label="Kerngetallen".*?<\/ul>/s)?.[0] ?? ''

    expect(row).toContain('hf-key-figures-across')
    expect([...row.matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map(([, item]) => item?.replaceAll(/<[^>]*>/g, ''))).toEqual([
      '2e plek, in de Eredivisie',
      '4 wedstrijden, gespeeld in alle competities',
      '3–1–0 gewonnen, gelijk, verloren, in alle competities',
      '8–3 doelpunten, voor en tegen in alle competities',
    ])
    expect(html.indexOf('Welke wedstrijden')).toBeLessThan(html.indexOf('aria-label="Kerngetallen"'))
  })

  it('has no card Onze plek in de competitie, Onze plek door de jaren, Resultaten per hoofdtrainer or Opmerkelijk', async () => {
    const html = await render()

    for (const id of [
      'onze-plek-in-de-competitie',
      'onze-plek-door-de-jaren',
      'resultaten-per-hoofdtrainer',
      'opmerkelijk',
    ]) {
      expect(html).not.toContain(`id="${id}"`)
    }
  })

  it('has no introduction under the h1: the headings of the cards say what is on the page', async () => {
    const html = await render()

    expect(html).not.toContain('hf-intro')
    expect(html).toMatch(
      /<div class="hf-page-cell" style="grid-area:head"><h1 class="hf-heading-1">Cijfers<\/h1><\/div><div class="hf-page-toolbar"/,
    )
  })

  describe('the order of the parts of a card', () => {
    // The parts of a card stand in a fixed order: the heading, the explanation, the content,
    // the legend, the count with the sentences that go with it, the link, and the credit.
    /** Fails when a part is missing, or stands before the one in front of it. */
    function expectInOrder(card: string, parts: string[]) {
      const places = parts.map((part) => card.indexOf(part))

      expect(places.filter((place) => place === -1).length, `missing from the card: ${parts.join(' | ')}`).toBe(0)
      expect(places, parts.join(' | ')).toEqual([...places].sort((a, b) => a - b))
    }

    it('has the explanation of the streaks under the heading and above the table', async () => {
      expectInOrder(section(await render(), 'reeksen'), [
        '</h3>',
        'Aantal wedstrijden achter elkaar',
        '<table',
        'gespeelde wedstrijd',
      ])
    })

    it('has the legend of a table under it, and the count last', async () => {
      const html = await render()

      expectInOrder(section(html, 'hoe-de-wedstrijden-verlopen'), [
        '</h3>',
        '<table',
        'Na een voorsprong',
        'G gespeeld, W winst',
        'gespeelde wedstrijd',
      ])
    })

    it('has the key of the chart of the season under the chart, with the table of the same numbers after it', async () => {
      expectInOrder(section(await render(), 'verloop-van-het-seizoen'), [
        '</h3>',
        'hf-form-chart',
        'hf-form-chart-key',
        '<table',
      ])
    })

    it('has the count under the content on the cards that count', async () => {
      const html = await render()

      expectInOrder(section(html, 'thuis-en-uit'), ['</h3>', '<table', 'gespeelde wedstrijd'])
      expectInOrder(section(html, 'doelpunten-per-kwartier'), ['</h3>', '<table', 'gespeelde wedstrijd'])
      expectInOrder(section(html, 'uitersten'), ['</h3>', '<ul', 'Alle', 'Vroegste en laatste doelpunt: '])
    })

    it('has the sentence about extra time right after the count', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((match) => (match.goals.length > 0 ? { ...match, extraTime: true } : match)),
      })

      expectInOrder(section(await render(), 'doelpunten-per-kwartier'), [
        '</h3>',
        '<table',
        'gespeelde wedstrijd',
        'Doelpunten in de verlenging',
      ])
    })
  })

  it('has a heading for every link of the bar under the header, with the id the link goes to, in the same order', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2 [^>]*id="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(statisticsShortcuts.map((item) => item.href)).toEqual(ids)
  })

  it('has the key figures and then the four groups, each a region named by its heading, in one column', async () => {
    const html = await render()
    const main = html.match(/<main[^>]*>.*<\/main>/s)?.[0] ?? ''
    const groups = [
      ['competitie', ['verloop-van-het-seizoen', 'hoe-de-wedstrijden-verlopen']],
      ['uitslagen', ['thuis-en-uit', 'reeksen', 'hoe-vaak-welke-uitslag', 'uitersten']],
      ['doelpunten', ['doelpunten-per-kwartier', 'de-nul-gehouden']],
      ['rondom-de-wedstrijd', ['toeschouwers']],
    ] as const

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).not.toContain('<aside')
    expect(main).toMatch(
      /^<main class="hf-page-main hf-page-main-grid" style="[^"]*--hf-page-columns:var\(--hf-page-columns-equal\)/,
    )
    expect(main.match(/<h1/g)).toHaveLength(1)
    expect(main.indexOf('aria-label="Kerngetallen"')).toBeLessThan(main.indexOf('id="competitie"'))

    for (const [id, cards] of groups) {
      const start = main.indexOf(`<section aria-labelledby="${id}" class="hf-card-group"`)
      const end = main.indexOf('<section aria-labelledby=', start + 1)
      const group = main.slice(start, end === -1 ? undefined : end)

      expect(start, id).toBeGreaterThan(-1)
      expect([...group.matchAll(/<h3[^>]*\sid="([^"]+)"/g)].map(([, card]) => card)).toEqual(cards)
    }
  })

  it('has none of the cards of Wedstrijden', async () => {
    const html = await render()

    for (const id of ['programma', 'stand', 'eindstand', 'hoofdtrainer']) {
      expect(html).not.toContain(`id="${id}"`)
    }
  })

  it('has no order or style attribute but the length of a bar and the place of a label or a bar of a chart, so the order on a phone is the order in the source', async () => {
    expect(await render()).not.toMatch(
      / style="(?!grid-area:[a-z-]+"|--hf-page-areas-narrow:[^"]*"|--hf-bar-share:[\d.]+"|--hf-segmented-count:\d+;--hf-segmented-index:\d+"|--hf-donut-strength:\d+%(?:;--hf-donut-deepen:\d+%)?"|--hf-donut-cos:|--hf-bar-chart-(?:slots|at|share|across):[\d.]+(?:;--hf-bar-chart-at:[\d.]+)?")|order:/,
    )
  })

  it('names each group by its h2 and each card by its h3, so a link with a hash has a target', async () => {
    const html = await render()

    for (const { href } of statisticsShortcuts) {
      expect(html).toMatch(new RegExp(`<section aria-labelledby="${href.slice(1)}" class="hf-card-group"`))
    }

    for (const id of ['verloop-van-het-seizoen', 'reeksen', 'thuis-en-uit', 'toeschouwers', 'uitersten']) {
      expect(html).toMatch(new RegExp(`<section class="hf-card[ a-z-]*" aria-labelledby="${id}">`))
    }
  })

  it('gives home and away the white surface, the streaks, the clean sheets, how the matches go and the extremes the soft one, and the season, how often each score was played and the goals per quarter the warm one', async () => {
    const html = await render()

    for (const [id, surface] of [
      ['hoe-vaak-welke-uitslag', 'hf-card hf-card-warm hf-card-shareable'],
      ['de-nul-gehouden', 'hf-card hf-card-soft hf-card-shareable'],
      ['verloop-van-het-seizoen', 'hf-card hf-card-warm hf-card-shareable'],
      ['reeksen', 'hf-card hf-card-soft hf-card-shareable'],
      ['thuis-en-uit', 'hf-card hf-card-shareable'],
      ['toeschouwers', 'hf-card hf-card-shareable'],
      ['doelpunten-per-kwartier', 'hf-card hf-card-warm hf-card-shareable'],
      ['hoe-de-wedstrijden-verlopen', 'hf-card hf-card-soft hf-card-shareable'],
      ['uitersten', 'hf-card hf-card-soft hf-card-shareable'],
    ] as const) {
      expect(html).toContain(`<section class="${surface}" aria-labelledby="${id}">`)
    }
  })

  it('lets the visitor make an image of each of the nine cards', async () => {
    const html = await render()
    const shareable = [...html.matchAll(/<section class="[^"]*hf-card-shareable[^"]*" aria-labelledby="([^"]+)"/g)].map(
      ([, id]) => id,
    )

    expect(shareable).toEqual([
      'verloop-van-het-seizoen',
      'hoe-de-wedstrijden-verlopen',
      'thuis-en-uit',
      'reeksen',
      'hoe-vaak-welke-uitslag',
      'uitersten',
      'doelpunten-per-kwartier',
      'de-nul-gehouden',
      'toeschouwers',
    ])
    expect(html.match(/data-hf-card-share/g)).toHaveLength(9)
  })

  it('has no button for an image on a card that has no facts yet', async () => {
    vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [], standings: [] })

    expect(await render()).not.toContain('hf-card-shareable')
  })

  describe('the clean sheets', () => {
    // Played matches that don't have a clean sheet are the rounds 7 and 9. The cup tie of the
    // test data and the round 8 are the two with a clean sheet.
    const manyMatches = (cleanSheets: number): PublicMatch[] =>
      Array.from({ length: cleanSheets }, (_, index) => ({
        ...matchData.matches[1]!,
        goals: [],
        goalsAgainst: 0,
        matchDate: `2026-09-${String(index + 1).padStart(2, '0')}`,
        opponent: `Proefclub ${index + 1}`,
        round: `Speelronde ${100 + index}`,
      }))

    it('shows the matches with no goal against, the newest first, as short lines with the count above', async () => {
      const sheets = section(await render(), 'de-nul-gehouden')

      expect(sheets).toContain('2 keer de nul gehouden in 4 wedstrijden')
      expect(sheets.match(/class="hf-short-match"/g)).toHaveLength(2)
      expect(sheets.indexOf('SV Proefdorp')).toBeLessThan(sheets.indexOf('Testdorp FC'))
      expect(sheets).toContain('di 20 okt')
      expect(sheets).not.toContain('hf-short-match-where')
      // Away, the home club and its goals come first: our 1–0 is "SV Proefdorp 0–1".
      expect(sheets).toContain('<span>SV Proefdorp</span> <span class="hf-short-match-score hf-match-win">')
      expect(sheets).toContain('0–1')
      expect(sheets).toContain('0 tegen 1')
      expect(sheets).toContain('2–0')
      expect(sheets).toContain('2 tegen 0')
      expect(sheets).not.toContain('Oud Resultaat')
      expect(sheets).not.toContain('Voorbeeld United')
    })

    it('has no competition, round, stadium or scorers, and colours the result by the outcome', async () => {
      const sheets = section(await render(), 'de-nul-gehouden')

      expect(sheets).not.toContain('Eredivisie')
      expect(sheets).not.toContain('KNVB Beker')
      expect(sheets).not.toContain('Speelronde')
      expect(sheets).not.toContain('Stadion Proeflaan')
      // The colour of the outcome is the one of Match, but nothing else of its line is here.
      expect(sheets).toContain('hf-match-win')
      expect(sheets).not.toContain('hf-match-score')
      expect(sheets).not.toContain('hf-match-clubs')
      expect(sheets).not.toContain('Proefman')
    })

    it('is a list with an item for every line, and no button when there are ten or fewer', async () => {
      const sheets = section(await render(), 'de-nul-gehouden')

      expect(sheets.match(/<li/g)).toHaveLength(2)
      expect(sheets).not.toContain('<button')
    })

    it('counts a 0–0 and a match that went to extra time, and not a match that is postponed or still to come', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: [
          ...matchData.matches,
          { ...matchData.matches[1]!, extraTime: true, goalsFor: 0, opponent: 'Nul Nul FC', round: 'Derde ronde' },
        ],
      })

      const sheets = section(await render(), 'de-nul-gehouden')

      expect(sheets).toContain('3 keer de nul gehouden in 5 wedstrijden')
      expect(sheets).toContain('Nul Nul FC')
      expect(sheets).toContain('0–0')
      expect(sheets).not.toContain('Demo Boys')
      expect(sheets).not.toContain('Proefstad SV')
    })

    it('shows ten lines and the button "Laad 5 meer", and the count above counts all of them', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: manyMatches(11) })

      const sheets = section(await render(), 'de-nul-gehouden')

      expect(sheets).toContain('11 keer de nul gehouden in 11 wedstrijden')
      expect(sheets.match(/class="hf-short-match"/g)).toHaveLength(10)
      expect(sheets).toContain('Laad 5 meer')
      expect(sheets).toContain('action="/wedstrijden/cijfers#nul-11"')
      expect(sheets).toContain('name="nul"')
      expect(sheets).toContain('value="15"')
      expect(sheets).toContain('id="nul-10"')
    })

    it('shows ten lines and no button when there are exactly ten', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: manyMatches(10) })

      const sheets = section(await render(), 'de-nul-gehouden')

      expect(sheets.match(/class="hf-short-match"/g)).toHaveLength(10)
      expect(sheets).not.toContain('<button')
    })

    it('shows five more lines with ?nul=15, and the button again while there are more', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: manyMatches(21) })

      const sheets = section(await render({ nul: '15' }), 'de-nul-gehouden')

      expect(sheets.match(/class="hf-short-match"/g)).toHaveLength(15)
      expect(sheets).toContain('action="/wedstrijden/cijfers#nul-16"')
      expect(sheets).toContain('value="20"')
    })

    it('starts with ten lines for a number in the address that is none of the steps', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: manyMatches(21) })

      expect(section(await render({ nul: '12' }), 'de-nul-gehouden').match(/class="hf-short-match"/g)).toHaveLength(10)
    })

    it('says so when no match is played yet', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.filter((match) => match.status !== 'played'),
      })

      const sheets = section(await render(), 'de-nul-gehouden')

      expect(sheets).toContain('We hebben nog geen gespeelde wedstrijden van dit seizoen.')
      expect(sheets).not.toContain('<ul')
    })

    it('says so when no clean sheet is kept yet', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.filter((match) => match.goalsAgainst !== 0),
      })

      const sheets = section(await render(), 'de-nul-gehouden')

      expect(sheets).toContain('Nog niet de nul gehouden dit seizoen.')
      expect(sheets).not.toContain('<ul')
    })

    it('is gone, with no card, when the database can not be read', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.mocked(getMatchData).mockRejectedValue(new Error('down'))

      expect(await render()).not.toContain('nul-gehouden')
    })
  })

  describe('the season', () => {
    // The test data has three played matches of the Eredivisie (rounds 7, 8 and 9: a win, a win
    // and a draw) and a played cup tie, which doesn't count.
    const league = (round: string, matchDate: string, goalsFor: number, goalsAgainst: number): PublicMatch => ({
      ...matchData.matches[0]!,
      goals: [],
      goalsAgainst,
      goalsFor,
      matchDate,
      round,
    })
    const rows = (card: string) =>
      [...card.matchAll(/<tr><th scope="row">([^<]*)<\/th><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td><\/tr>/g)].map(
        ([, result, matches, points]) => [result, matches, points],
      )

    it('is a card in the main directly under our place in the league, before the sidebar', async () => {
      const html = await render()

      expect(html.indexOf('id="onze-plek-in-de-competitie"')).toBeLessThan(html.indexOf('id="verloop-van-het-seizoen"'))
      expect(html.indexOf('id="verloop-van-het-seizoen"')).toBeLessThan(html.indexOf('id="toeschouwers"'))
      expect(html.match(/<section[^>]*aria-labelledby="verloop-van-het-seizoen"/g)).toHaveLength(1)
    })

    it('shows the chart, with the form and the key, and a table with the numbers of the chart', async () => {
      const card = section(await render(), 'verloop-van-het-seizoen')

      expect(card).toContain('hf-form-chart')
      expect(card).toContain('<b>W</b> winst (3 punten), <b>G</b> gelijk (1), <b>V</b> verlies (0).')
      expect(card.match(/<table/g)).toHaveLength(2)
      expect(card.indexOf('hf-form-chart')).toBeLessThan(card.indexOf('<table'))
      expect(card).toContain('Uitslagen van sc Heerenveen dit seizoen, met de punten')
      expect(rows(card)).toEqual([
        ['Winst', '2', '6'],
        ['Gelijk', '1', '1'],
        ['Verlies', '0', '0'],
        ['Totaal', '3', '7'],
      ])
    })

    it('leaves out the cup tie, in the chart and in the table', async () => {
      const card = section(await render(), 'verloop-van-het-seizoen')

      expect(rows(card).at(-1)).toEqual(['Totaal', '3', '7'])
      expect(card).not.toContain('KNVB Beker')
    })

    it('counts the results in the order they were played, with the line once there are five', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: [
          league('Speelronde 1', '2026-08-01', 0, 2),
          league('Speelronde 2', '2026-08-08', 1, 1),
          league('Speelronde 3', '2026-08-15', 1, 0),
          league('Speelronde 4', '2026-08-22', 3, 0),
          league('Speelronde 5', '2026-08-29', 0, 0),
          league('Speelronde 6', '2026-09-05', 2, 4),
        ],
      })

      const card = section(await render(), 'verloop-van-het-seizoen')

      expect(rows(card)).toEqual([
        ['Winst', '2', '6'],
        ['Gelijk', '2', '2'],
        ['Verlies', '2', '0'],
        ['Totaal', '6', '8'],
      ])
      expect(card).toContain('over 5 wedstrijden')
    })

    describe('the table per round', () => {
      const six = () =>
        vi.mocked(getMatchData).mockResolvedValue({
          ...matchData,
          matches: [
            league('Speelronde 1', '2026-08-01', 0, 2),
            league('Speelronde 2', '2026-08-08', 1, 1),
            league('Speelronde 3', '2026-08-15', 1, 0),
            league('Speelronde 4', '2026-08-22', 3, 0),
            league('Speelronde 5', '2026-08-29', 0, 0),
            league('Speelronde 6', '2026-09-05', 2, 4),
          ],
        })

      /** The rows of the fold: round, result, points and average. */
      const roundRows = (card: string) =>
        [
          ...(card.match(/<details.*<\/details>/s)?.[0] ?? '').matchAll(
            /<tr><th scope="row">([^<]*)<\/th><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><\/tr>/g,
          ),
        ].map(([, ...cells]) => cells)

      it('is a closed fold under the totals, with a row for every round played', async () => {
        six()

        const card = section(await render(), 'verloop-van-het-seizoen')

        expect(card).toMatch(/<details class="hf-disclosure"><summary>Uitslag en gemiddelde per speelronde/)
        expect(card).not.toMatch(/<details[^>]* open/)
        expect(card.indexOf('Totaal')).toBeLessThan(card.indexOf('<details'))
        expect(roundRows(card)).toHaveLength(6)
      })

      it('gives the result, the points and the average over the last five, which is what the tooltip says', async () => {
        six()

        const card = section(await render(), 'verloop-van-het-seizoen')

        expect(roundRows(card)).toEqual([
          ['1', 'Verlies', '0', '0,0'],
          ['2', 'Gelijk', '1', '0,5'],
          ['3', 'Winst', '3', '1,3'],
          ['4', 'Winst', '3', '1,8'],
          ['5', 'Gelijk', '1', '1,6'],
          ['6', 'Verlies', '0', '1,6'],
        ])
      })

      it('names its columns and says what the average is', async () => {
        six()

        const card = section(await render(), 'verloop-van-het-seizoen')

        expect(card).toContain('Uitslagen van sc Heerenveen per speelronde, met de punten en het gemiddelde')
        for (const column of ['Ronde', 'Uitslag', 'Punten']) {
          expect(card).toContain(`>${column}</`)
        }
        // The average is shortened to fit a phone, with the whole word for a screen reader.
        expect(card).toContain('<span aria-hidden="true">Gem.</span><span class="hf-visually-hidden">Gemiddelde</span>')
        expect(card).toContain('Gem. is het gemiddelde aantal punten per wedstrijd over de laatste 5 wedstrijden')
      })

      it('has no fold, and no table, when no match is played', async () => {
        vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [] })

        expect(section(await render(), 'verloop-van-het-seizoen')).not.toContain('<details')
      })
    })

    it('draws the line from the first match, over the matches there are while there are fewer than five', async () => {
      const card = section(await render(), 'verloop-van-het-seizoen')

      expect(card).toContain('over 3 wedstrijden: nu 2,3.')
      expect(card).not.toContain('De lijn begint na')
    })

    it('hides the chart from a screen reader and leaves the numbers to the table', async () => {
      const card = section(await render(), 'verloop-van-het-seizoen')

      expect(card).toContain('aria-hidden="true"')
      // The tables and the fold are for a screen reader: only the chart is hidden.
      expect(card).not.toMatch(/<(?:table|details|summary)[^>]*aria-hidden/)
      expect(card.match(/<table[^>]*>.*?<\/table>/s)?.[0]).not.toContain('aria-hidden')
    })

    it('says so in a sentence, with no chart or table, when no match of the Eredivisie is played', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.filter((match) => match.competition !== 'Eredivisie' || match.status !== 'played'),
      })

      const card = section(await render(), 'verloop-van-het-seizoen')

      expect(card).toContain('We hebben nog geen uitslagen van dit seizoen.')
      expect(card).not.toContain('hf-form-chart')
      expect(card).not.toContain('<table')
    })

    it('says so in a sentence for a season without matches', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [] })

      expect(section(await render(), 'verloop-van-het-seizoen')).toContain(
        'We hebben nog geen uitslagen van dit seizoen.',
      )
    })

    it('is gone, with no card, when the database can not be read', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.mocked(getMatchData).mockRejectedValue(new Error('down'))

      expect(await render()).not.toContain('verloop-van-het-seizoen')
    })
  })

  describe('the streaks', () => {
    // Six matches of the Eredivisie, won, won, drawn, won, won, drawn, and a played cup tie
    // that would change every streak, which doesn't count.
    const league = (round: number, goalsFor: number, goalsAgainst: number): PublicMatch => ({
      ...matchData.matches[0]!,
      goals: [],
      goalsAgainst,
      goalsFor,
      home: round % 2 === 1,
      matchDate: `2026-08-${String(round * 4).padStart(2, '0')}`,
      opponent: `Club ${round}`,
      round: `Speelronde ${round}`,
    })
    const cup: PublicMatch = { ...matchData.matches[3]!, goalsAgainst: 5, goalsFor: 0 }
    const season = [
      league(1, 2, 0),
      league(2, 1, 0),
      league(3, 1, 1),
      league(4, 3, 0),
      league(5, 2, 1),
      league(6, 0, 0),
    ]
    const withSeason = (matches: PublicMatch[]) =>
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [...matches, cup] })
    const rows = (card: string) =>
      [...card.matchAll(/<tr><th scope="row">([^<]*)<\/th><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td><\/tr>/g)].map(
        ([, name, now, longest]) => [name, now, longest],
      )

    it('is a card in the main directly after the season, before the sidebar', async () => {
      const html = await render(eredivisie)

      expect(html.indexOf('id="verloop-van-het-seizoen"')).toBeLessThan(html.indexOf('id="reeksen"'))
      expect(html.indexOf('id="reeksen"')).toBeLessThan(html.indexOf('id="toeschouwers"'))
      expect(html.match(/<section[^>]*aria-labelledby="reeksen"/g)).toHaveLength(1)
      expect(html.match(/<h3[^>]*id="reeksen"[^>]*>/g)).toHaveLength(1)
    })

    it('shows a table with a row for each of the six streaks, as it stands now and the longest', async () => {
      withSeason(season)

      const card = section(await render(eredivisie), 'reeksen')

      expect(card).toContain('De reeksen van sc Heerenveen in de Eredivisie dit seizoen')
      expect([...card.matchAll(/<th [^>]*scope="col"[^>]*>([^<]*)<\/th>/g)].map(([, name]) => name)).toEqual([
        'Reeks',
        'Nu',
        'Langste',
      ])
      expect(rows(card)).toEqual([
        ['Ongeslagen', '6', '6'],
        ['Gewonnen', '0', '2'],
        ['Zonder winst', '1', '1'],
        ['Verloren', '0', '0'],
        ['Gescoord', '0', '5'],
        ['Zonder tegendoelpunt', '1', '2'],
      ])
    })

    it('does not count the cup tie, in the streaks or in the lines', async () => {
      withSeason(season)

      const card = section(await render(eredivisie), 'reeksen')

      expect(card).not.toContain('SV Proefdorp')
      expect(card).not.toContain('KNVB Beker')
    })

    it('shows the latest five matches, the oldest first, as letters and as lines with the opponent and the score', async () => {
      withSeason(season)

      const card = section(await render(eredivisie), 'reeksen')
      const lines = [...card.matchAll(/<div class="hf-short-match">(.*?)<\/div>/g)].map(([, line]) => line ?? '')

      expect(card.match(/hf-mark-row-mark hf-chart-tone-(\w+)">(\w)</g)).toEqual([
        'hf-mark-row-mark hf-chart-tone-positive">W<',
        'hf-mark-row-mark hf-chart-tone-neutral">G<',
        'hf-mark-row-mark hf-chart-tone-positive">W<',
        'hf-mark-row-mark hf-chart-tone-positive">W<',
        'hf-mark-row-mark hf-chart-tone-neutral">G<',
      ])
      expect(card).toContain('Laatste wedstrijden: winst, gelijk, winst, winst, gelijk')
      expect(lines).toHaveLength(5)
      expect(lines.map((line) => line.match(/Club \d/)?.[0])).toEqual([
        'Club 2',
        'Club 3',
        'Club 4',
        'Club 5',
        'Club 6',
      ])
      // Club 2 won 1–0 for us, away, so the home club and its goal come first: 0–1.
      expect(lines[0]).toMatch(/Club 2<\/span>.*0–1.*0 tegen 1.*sc Heerenveen/)
      expect(lines[4]).toContain('0 tegen 0')
    })

    it('puts the signs in words for a screen reader and hides only the letters', async () => {
      withSeason(season)

      const card = section(await render(eredivisie), 'reeksen')

      expect(card).toContain('<span aria-hidden="true" class="hf-mark-row-marks">')
      expect(card.match(/<table[^>]*>.*<\/table>/s)?.[0]).not.toContain('aria-hidden')
    })

    it('says on how many matches it is based, and the same with one match', async () => {
      withSeason(season)

      expect(section(await render(eredivisie), 'reeksen')).toContain('Alle 6 gespeelde wedstrijden')

      withSeason(season.slice(0, 1))

      const card = section(await render(eredivisie), 'reeksen')

      expect(card).toContain('1 gespeelde wedstrijd')
      expect(card).not.toContain('alle 1')
    })

    it('shows the matches there are when fewer than five are played', async () => {
      const card = section(await render(eredivisie), 'reeksen')

      expect(card.match(/class="hf-short-match"/g)).toHaveLength(3)
      expect(card).toContain('Alle 3 gespeelde wedstrijden')
    })

    it('shows one line, one letter and the table for one played match', async () => {
      withSeason([league(1, 0, 1)])

      const card = section(await render(eredivisie), 'reeksen')

      expect(card.match(/class="hf-short-match"/g)).toHaveLength(1)
      expect(card.match(/class="hf-mark-row-mark /g)).toHaveLength(1)
      expect(rows(card)).toContainEqual(['Verloren', '1', '1'])
    })

    it('says so in a sentence, with no table or lines, when no match of the Eredivisie is played', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.filter((match) => match.competition !== 'Eredivisie' || match.status !== 'played'),
      })

      const card = section(await render(eredivisie), 'reeksen')

      expect(card).toContain('We hebben nog geen uitslagen van dit seizoen.')
      expect(card).not.toContain('<table')
      expect(card).not.toContain('hf-short-match')
      expect(card).not.toContain('gespeelde wedstrijd')
      expect(card).not.toContain('hf-card-shareable')
    })

    it('says so in a sentence for a season without matches', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [] })

      expect(section(await render(eredivisie), 'reeksen')).toContain('We hebben nog geen uitslagen van dit seizoen.')
    })
  })

  describe('home and away', () => {
    // The test data has three played matches of the Eredivisie: two at home (3-1 and 2-0) and
    // one away (2-2), and a played cup tie away, which doesn't count.
    const rows = (card: string) =>
      [
        ...card.matchAll(
          /<tr><th scope="row">([^<]*)<\/th><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><\/tr>/g,
        ),
      ].map(([, header, home, away, total]) => [header, home, away, total])

    it('is the first card of the group Uitslagen, before the streaks', async () => {
      const html = await render(eredivisie)

      expect(html.indexOf('id="uitslagen"')).toBeLessThan(html.indexOf('id="thuis-en-uit"'))
      expect(html.indexOf('id="thuis-en-uit"')).toBeLessThan(html.indexOf('id="reeksen"'))
      expect(html.match(/<section[^>]*aria-labelledby="thuis-en-uit"/g)).toHaveLength(1)
    })

    it('shows a table with the columns home, away and total, and a caption for a screen reader, and no chart', async () => {
      const card = section(await render(eredivisie), 'thuis-en-uit')

      expect(card.match(/<table/g)).toHaveLength(1)
      expect(card).toContain(
        '<caption class="hf-visually-hidden">De uitslagen van sc Heerenveen thuis en uit dit seizoen</caption>',
      )
      expect(card).toContain(
        '<th class="hf-numeric" scope="col">Thuis</th><th class="hf-numeric" scope="col">Uit</th><th class="hf-numeric" scope="col">Totaal</th>',
      )
      expect(card).not.toContain('hf-donut-chart')
      expect(card).not.toContain('hf-form-chart')
    })

    it('counts the played matches of the Eredivisie, with a comma and two digits for an average', async () => {
      expect(rows(section(await render(eredivisie), 'thuis-en-uit'))).toEqual([
        ['Gespeeld', '2', '1', '3'],
        ['Gewonnen', '2', '0', '2'],
        ['Gelijk', '0', '1', '1'],
        ['Verloren', '0', '0', '0'],
        ['Punten', '6', '1', '7'],
        ['Punten per wedstrijd', '3,00', '1,00', '2,33'],
        ['Doelpunten voor', '5', '2', '7'],
        ['Doelpunten tegen', '1', '2', '3'],
        ['Doelpunten per wedstrijd', '2,50', '2,00', '2,33'],
        ['Zonder tegendoelpunt', '1', '0', '1'],
      ])
    })

    it('has a total that agrees with the table of the season', async () => {
      const html = await render(eredivisie)
      const season = [
        ...section(html, 'verloop-van-het-seizoen').matchAll(
          /<th scope="row">Totaal<\/th><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td>/g,
        ),
      ][0]
      const total = rows(section(html, 'thuis-en-uit'))

      expect(total.find(([header]) => header === 'Gespeeld')?.[3]).toBe(season?.[1])
      expect(total.find(([header]) => header === 'Punten')?.[3]).toBe(season?.[2])
    })

    it('says on how many matches it is based on', async () => {
      expect(section(await render(eredivisie), 'thuis-en-uit')).toContain('Alle 3 gespeelde wedstrijden')
    })

    it('shows a dash for an average and a 0 for a count on a side with no match yet, and says one match in the singular', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.filter((match) => match.round === 'Speelronde 7'),
      })

      const card = section(await render(eredivisie), 'thuis-en-uit')

      expect(rows(card)).toEqual([
        ['Gespeeld', '1', '0', '1'],
        ['Gewonnen', '1', '0', '1'],
        ['Gelijk', '0', '0', '0'],
        ['Verloren', '0', '0', '0'],
        ['Punten', '3', '0', '3'],
        ['Punten per wedstrijd', '3,00', '–', '3,00'],
        ['Doelpunten voor', '3', '0', '3'],
        ['Doelpunten tegen', '1', '0', '1'],
        ['Doelpunten per wedstrijd', '3,00', '–', '3,00'],
        ['Zonder tegendoelpunt', '0', '0', '0'],
      ])
      expect(card).toContain('1 gespeelde wedstrijd<')
    })

    it('says so in a sentence, with no table, when no match is played', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [] })

      const card = section(await render(eredivisie), 'thuis-en-uit')

      expect(card).toContain('We hebben nog geen uitslagen van dit seizoen.')
      expect(card).not.toContain('<table')
      expect(card).not.toContain('gespeelde wedstrijd')
    })

    it('is gone, with no card, when the database can not be read', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.mocked(getMatchData).mockRejectedValue(new Error('down'))

      expect(await render(eredivisie)).not.toContain('thuis-en-uit')
    })
  })

  describe('the goals per quarter', () => {
    // The test data has two played matches with goals: round 8 (34' and 45+1' ours) and round 9
    // (12' theirs, 40' and 63' ours, 90+3' theirs). The other two have a score and no goals.
    const goalMatches = matchData.matches.filter((match) => match.goals.length > 0)

    it('is a card in the main, under the programme, with two charts and a table', async () => {
      const card = section(await render(), 'doelpunten-per-kwartier')

      expect(card.match(/class="hf-donut-chart /g)).toHaveLength(2)
      expect(card.match(/<table/g)).toHaveLength(1)
      expect(card.indexOf('hf-donut-chart-group')).toBeLessThan(card.indexOf('<table'))
    })

    it('hides both charts from a screen reader and leaves the numbers to the table', async () => {
      const card = section(await render(), 'doelpunten-per-kwartier')

      expect(card.match(/<div aria-hidden="true" class="hf-donut-chart /g)).toHaveLength(2)
      expect(card.match(/<table[^>]*>.*<\/table>/s)?.[0]).not.toContain('aria-hidden')
    })

    it('has the goals for and against per quarter in the table, the six quarters in order', async () => {
      const table = section(await render(), 'doelpunten-per-kwartier').match(/<table.*<\/table>/s)?.[0] ?? ''
      const rows = [
        ...table.matchAll(/<tr><th scope="row">([^<]*)<\/th><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td><\/tr>/g),
      ]

      expect(table).toContain(
        '<th class="hf-numeric" scope="col">Voor</th><th class="hf-numeric" scope="col">Tegen</th>',
      )
      expect(rows.map(([, quarter, scored, conceded]) => [quarter, scored, conceded])).toEqual([
        ['1–15', '0', '1'],
        ['16–30', '0', '0'],
        ['31–45', '3', '0'],
        ['46–60', '0', '0'],
        ['61–75', '1', '0'],
        ['76–90', '0', '1'],
      ])
    })

    it('gives the table a caption for a screen reader', async () => {
      expect(section(await render(), 'doelpunten-per-kwartier')).toContain(
        '<caption class="hf-visually-hidden">Doelpunten van sc Heerenveen en van de tegenstanders per kwartier van de wedstrijd</caption>',
      )
    })

    it('says how many of the played matches the count is based on', async () => {
      expect(section(await render(), 'doelpunten-per-kwartier')).toContain('2 van de 4 gespeelde wedstrijden')
    })

    it('says that extra time is left out when a match in the count went to extra time', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((match) => (match.goals.length > 0 ? { ...match, extraTime: true } : match)),
      })

      expect(section(await render(), 'doelpunten-per-kwartier')).toContain(
        '<p class="hf-meta">Doelpunten in de verlenging tellen niet mee in de tabel, wel in de twee regels erboven.</p>',
      )
    })

    it('has two lines under the table with the late goals and the goals in stoppage time, for and against', async () => {
      const card = section(await render(), 'doelpunten-per-kwartier')

      expect(card).toContain('<p>Na de 80e minuut: 0 voor, 1 tegen</p><p>In blessuretijd: 1 voor, 1 tegen</p>')
      expect(card.indexOf('</table>')).toBeLessThan(card.indexOf('Na de 80e minuut'))
      expect(card.indexOf('In blessuretijd')).toBeLessThan(card.indexOf('gespeelde wedstrijd'))
    })

    it('follows the switch: the cup goals count for all the matches and not for the Eredivisie', async () => {
      const cup = {
        ...goalMatches[0]!,
        competition: 'KNVB Beker' as const,
        goals: [{ ...goalMatches[0]!.goals[0]!, minute: 88, ours: true, stoppageMinutes: 2 }],
        round: 'Eerste ronde',
      }

      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [...goalMatches, cup] })

      expect(section(await render(), 'doelpunten-per-kwartier')).toContain(
        'Na de 80e minuut: 1 voor, 1 tegen</p><p>In blessuretijd: 2 voor, 1 tegen',
      )
      expect(section(await render(eredivisie), 'doelpunten-per-kwartier')).toContain(
        'Na de 80e minuut: 0 voor, 1 tegen</p><p>In blessuretijd: 1 voor, 1 tegen',
      )
    })

    it('says 0, and not a blank, when there is no goal late or in stoppage time', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: [{ ...goalMatches[0]!, goals: [{ ...goalMatches[0]!.goals[0]!, minute: 10, stoppageMinutes: null }] }],
      })

      expect(section(await render(), 'doelpunten-per-kwartier')).toContain(
        'Na de 80e minuut: 0 voor, 0 tegen</p><p>In blessuretijd: 0 voor, 0 tegen',
      )
    })

    it('leaves the sentence about extra time out when no match in the count had it', async () => {
      expect(section(await render(), 'doelpunten-per-kwartier')).not.toContain('verlenging')
    })

    it('leaves the sentence out when only a match that is not in the count went to extra time', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((match) => (match.goals.length === 0 ? { ...match, extraTime: true } : match)),
      })

      expect(section(await render(), 'doelpunten-per-kwartier')).not.toContain('verlenging')
    })

    it('says all the matches when every played match has its goals, and one match in the singular', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: goalMatches })

      expect(section(await render(), 'doelpunten-per-kwartier')).toContain('Alle 2 gespeelde wedstrijden')

      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: goalMatches.slice(0, 1) })

      expect(section(await render(), 'doelpunten-per-kwartier')).toContain('1 gespeelde wedstrijd<')
    })

    it('says so in a sentence, with no chart or table, when there is no goal with a minute', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((match) => ({ ...match, goals: [] })),
      })

      const card = section(await render(), 'doelpunten-per-kwartier')

      expect(card).toContain('We hebben nog geen doelpunten met een minuut van dit seizoen. Kijk straks nog eens.')
      expect(card).not.toContain('hf-donut-chart')
      expect(card).not.toContain('<table')
    })

    it('says so in a sentence for a season without matches', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [] })

      expect(section(await render(), 'doelpunten-per-kwartier')).toContain(
        'We hebben nog geen doelpunten met een minuut',
      )
    })

    it('is gone, with no card, when the database can not be read', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.mocked(getMatchData).mockRejectedValue(new Error('down'))

      expect(await render()).not.toContain('doelpunten-per-kwartier')
    })
  })

  describe('how the matches go', () => {
    // The test data has three played matches in the Eredivisie, two with goals: round 8 (2-0,
    // ours at 34' and 45+1') and round 9 (2-2, theirs at 12', ours at 40' and 63', theirs at
    // 90+3'). The cup tie does not count. So we scored first once and they once; at half-time
    // we are ahead once and level once; we led in round 9 and did not win it.
    const tableRows = (table: string) =>
      [...table.matchAll(/<tr><th scope="row">([^<]*)<\/th>((?:<td[^>]*>\d+<\/td>)+)<\/tr>/g)].map(
        ([, header, cells]) => [header, ...[...(cells ?? '').matchAll(/>(\d+)</g)].map(([, cell]) => cell)],
      )
    const tables = async () =>
      section(await render(), 'hoe-de-wedstrijden-verlopen').match(/<table.*?<\/table>/gs) ?? []

    it('is a card in the sidebar after the goals per quarter, with two tables and no chart', async () => {
      const card = section(await render(), 'hoe-de-wedstrijden-verlopen')

      expect(card.match(/<table/g)).toHaveLength(2)
      expect(card).not.toContain('hf-donut-chart')
      expect(card).not.toContain('hf-form-chart')
    })

    it('has the results after the first goal in the first table, with the columns in order', async () => {
      const [first] = await tables()

      expect(first).toContain('<caption class="hf-visually-hidden">Wat er gebeurt na het eerste doelpunt</caption>')
      expect([...(first ?? '').matchAll(/<th[^>]*scope="col">(.*?)<\/th>/g)].map(([, name]) => name)).toEqual([
        'Eerste doelpunt',
        '<abbr title="Gespeeld"><span aria-hidden="true">G</span><span class="hf-visually-hidden">gespeeld</span></abbr>',
        '<abbr title="Winst"><span aria-hidden="true">W</span><span class="hf-visually-hidden">winst</span></abbr>',
        '<abbr title="Gelijk"><span aria-hidden="true">G</span><span class="hf-visually-hidden">gelijk</span></abbr>',
        '<abbr title="Verlies"><span aria-hidden="true">V</span><span class="hf-visually-hidden">verlies</span></abbr>',
        '<abbr title="Punten"><span aria-hidden="true">P</span><span class="hf-visually-hidden">punten</span></abbr>',
      ])
      expect(tableRows(first ?? '')).toEqual([
        ['Wij scoren eerst', '1', '1', '0', '0', '3'],
        ['De tegenstander scoort eerst', '1', '0', '1', '0', '1'],
      ])
    })

    it('has the results after the score at half-time in the second table, with a zero for a row without matches', async () => {
      const [, second] = await tables()

      expect(second).toContain('<caption class="hf-visually-hidden">Wat er gebeurt na de stand bij de rust</caption>')
      expect(tableRows(second ?? '')).toEqual([
        ['Voor', '1', '1', '0', '0', '3'],
        ['Gelijk', '1', '0', '1', '0', '1'],
        ['Achter', '0', '0', '0', '0', '0'],
      ])
    })

    it('explains the abbreviations of the columns in a line under the tables and the sentences', async () => {
      const card = section(await render(), 'hoe-de-wedstrijden-verlopen')

      expect(card).toContain('G gespeeld, W winst, G gelijk, V verlies, P punten')
      expect(card.lastIndexOf('</table>')).toBeLessThan(card.indexOf('G gespeeld, W winst'))
      expect(card.indexOf('Na een voorsprong')).toBeLessThan(card.indexOf('G gespeeld, W winst'))
    })

    it('says in how many matches sc Heerenveen won after trailing and did not win after leading', async () => {
      const card = section(await render(), 'hoe-de-wedstrijden-verlopen')

      expect(card).toContain('Na een achterstand won sc Heerenveen nog geen wedstrijd.')
      expect(card).toContain('Na een voorsprong haalde sc Heerenveen in 1 wedstrijd geen winst.')
    })

    it('says the number of matches in the plural, and when sc Heerenveen never lost a lead', async () => {
      const goal = (minute: number, ours: boolean) => ({
        minute,
        ours,
        ownGoal: false,
        penalty: false,
        personFamilyName: null,
        personFamilyNamePrefix: null,
        personGivenName: null,
        personId: null,
        personSlug: null,
        player: 'Proefman',
        playerId: null,
        playerPage: null,
        stoppageMinutes: null,
      })
      const base = matchData.matches.find((match) => match.goals.length > 0) as PublicMatch
      const comeback = {
        ...base,
        goals: [goal(10, false), goal(30, true), goal(60, true)],
        goalsAgainst: 1,
        goalsFor: 2,
      }

      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [comeback, comeback, comeback] })

      const card = section(await render(), 'hoe-de-wedstrijden-verlopen')

      expect(card).toContain('Na een achterstand won sc Heerenveen 3 wedstrijden.')
      expect(card).toContain('Na een voorsprong liet sc Heerenveen nog geen winst liggen.')
    })

    it('says how many of the played league matches it is based on, and the cup does not count', async () => {
      expect(section(await render(), 'hoe-de-wedstrijden-verlopen')).toContain('2 van de 3 gespeelde wedstrijden')
    })

    it('shows one match as one row with numbers in each table, and says it in the singular', async () => {
      const first = matchData.matches.find((match) => match.goals.length > 0)

      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: first === undefined ? [] : [first] })

      const [firstGoal, halfTime] = await tables()

      expect(tableRows(firstGoal ?? '')).toEqual([
        ['Wij scoren eerst', '1', '1', '0', '0', '3'],
        ['De tegenstander scoort eerst', '0', '0', '0', '0', '0'],
      ])
      expect(tableRows(halfTime ?? '')).toEqual([
        ['Voor', '1', '1', '0', '0', '3'],
        ['Gelijk', '0', '0', '0', '0', '0'],
        ['Achter', '0', '0', '0', '0', '0'],
      ])
      expect(section(await render(), 'hoe-de-wedstrijden-verlopen')).toContain('1 gespeelde wedstrijd<')
    })

    it('says that the first goal is unknown for a match where both clubs scored in the same minute', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((match) =>
          match.goals.length === 4
            ? { ...match, goals: match.goals.map((goal) => ({ ...goal, minute: 12, stoppageMinutes: null })) }
            : match,
        ),
      })

      const card = section(await render(), 'hoe-de-wedstrijden-verlopen')

      expect(card).toContain('Bij 1 wedstrijd is niet te zien wie het eerst scoorde.')
      expect(tableRows((await tables())[0] ?? '')).toEqual([
        ['Wij scoren eerst', '1', '1', '0', '0', '3'],
        ['De tegenstander scoort eerst', '0', '0', '0', '0', '0'],
      ])
    })

    it('leaves the sentence about the first goal out when every first goal is known', async () => {
      expect(section(await render(), 'hoe-de-wedstrijden-verlopen')).not.toContain('niet te zien wie')
    })

    it('says so in a sentence, with no table, when there is no match with goals', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((match) => ({ ...match, goals: [] })),
      })

      const card = section(await render(), 'hoe-de-wedstrijden-verlopen')

      expect(card).toContain('We hebben nog geen doelpunten met een minuut van dit seizoen. Kijk straks nog eens.')
      expect(card).not.toContain('<table')
      expect(card).not.toContain('gespeelde wedstrijd')
    })

    it('says so in a sentence for a season without matches, and has no button for an image', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [] })

      const card = section(await render(), 'hoe-de-wedstrijden-verlopen')

      expect(card).toContain('We hebben nog geen doelpunten met een minuut')
      expect(card).not.toContain('hf-card-shareable')
    })

    it('is gone, with no card, when the database can not be read', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.mocked(getMatchData).mockRejectedValue(new Error('down'))

      expect(await render()).not.toContain('hoe-de-wedstrijden-verlopen')
    })
  })

  describe('the extremes', () => {
    // The test data has three played matches of the Eredivisie: round 7 (3–1, no goals known),
    // round 8 (2–0, at home against Testdorp FC, goals in 34' and 45+1') and round 9 (2–2 away
    // against Voorbeeld United, our goals in 40' and 63'). The cup tie doesn't count.
    const lines = (card: string) =>
      [...card.matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map(([, line]) =>
        (line ?? '')
          .replaceAll(/<[^>]*>/g, ' ')
          .replaceAll(/\s+/g, ' ')
          .trim(),
      )

    it('is a card with a list of lines, each with a name above a short match and, for a goal, the minute and the player in the name', async () => {
      const card = section(await render(eredivisie), 'uitersten')

      expect(card.match(/<ul[^>]*role="list"/g)).toHaveLength(1)
      expect(card.match(/class="hf-short-match"/g)).toHaveLength(4)
      expect(lines(card)).toEqual([
        expect.stringMatching(/^Grootste overwinning .*sc Heerenveen 2–0 2 tegen 0 Testdorp FC$/),
        expect.stringMatching(/^Meeste doelpunten .*Voorbeeld United 2–2 2 tegen 2 sc Heerenveen$/),
        expect.stringMatching(/^Vroegste doelpunt · minuut 34 · Proefman .*sc Heerenveen 2–0 2 tegen 0 Testdorp FC$/),
        expect.stringMatching(/^Laatste doelpunt · minuut 63 · Kopie .*Voorbeeld United 2–2 2 tegen 2 sc Heerenveen$/),
      ])
    })

    it('puts the name in the same item right before the short match, with a dot a screen reader skips', async () => {
      const card = section(await render(eredivisie), 'uitersten')

      expect(card.match(/<li>(?:<p class="hf-meta">[^]*?<\/p>)<div class="hf-short-match">/g)).toHaveLength(4)
      expect(card).toContain(
        '<p class="hf-meta">Vroegste doelpunt <span aria-hidden="true">·</span> minuut 34 <span aria-hidden="true">·</span> Proefman</p><div class="hf-short-match">',
      )
      expect(card).toContain('<p class="hf-meta">Grootste overwinning</p><div class="hf-short-match">')
    })

    it('leaves out a line without a match, such as the biggest loss in a season without a loss, and does not say so', async () => {
      const card = section(await render(eredivisie), 'uitersten')

      expect(card).not.toContain('Grootste nederlaag')
      expect(card).not.toMatch(/geen/i)
    })

    it('shows the biggest loss and the stoppage time of a goal when there are some', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((match) =>
          match.round === 'Speelronde 7'
            ? {
                ...match,
                goals: [
                  {
                    minute: 90,
                    ours: true,
                    ownGoal: true,
                    penalty: false,
                    personFamilyName: null,
                    personFamilyNamePrefix: null,
                    personGivenName: null,
                    personId: null,
                    personSlug: null,
                    player: 'Teststraat',
                    playerId: null,
                    playerPage: null,
                    stoppageMinutes: 4,
                  },
                ],
                goalsAgainst: 5,
                goalsFor: 1,
              }
            : match,
        ),
      })

      const card = section(await render(eredivisie), 'uitersten')

      expect(lines(card)).toEqual([
        expect.stringMatching(/^Grootste overwinning .*Testdorp FC/),
        expect.stringMatching(/^Grootste nederlaag .*sc Heerenveen 1–5 1 tegen 5 Oud Resultaat$/),
        expect.stringMatching(/^Meeste doelpunten .*Oud Resultaat/),
        expect.stringMatching(/^Vroegste doelpunt · minuut 34 · Proefman /),
        expect.stringMatching(/^Laatste doelpunt · minuut 90\+4 · Teststraat \(eigen doelpunt\) .*Oud Resultaat/),
      ])
    })

    it('says what it is based on: every played match for the score, and the matches with goals for the two goals', async () => {
      const card = section(await render(eredivisie), 'uitersten')

      expect(card).toContain('<p class="hf-meta">Alle 3 gespeelde wedstrijden</p>')
      expect(card).toContain('<p class="hf-meta">Vroegste en laatste doelpunt: 2 van de 3 gespeelde wedstrijden</p>')
    })

    it('says one line when every played match has its goals, and one match in the singular', async () => {
      const withGoals = matchData.matches.filter((match) => match.goals.length > 0)

      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: withGoals })

      const all = section(await render(eredivisie), 'uitersten')

      expect(all).toContain('Alle 2 gespeelde wedstrijden')
      expect(all).not.toContain('Het vroegste en het laatste doelpunt')

      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: withGoals.slice(0, 1) })

      const one = section(await render(eredivisie), 'uitersten')

      expect(one).toContain('1 gespeelde wedstrijd<')
      expect(lines(one)).toHaveLength(4)
      expect(lines(one).join(' ')).not.toContain('nederlaag')
    })

    it('keeps the three lines of the score and leaves out the two goals when no match has its goals', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((match) => ({ ...match, goals: [] })),
      })

      const card = section(await render(eredivisie), 'uitersten')

      expect(lines(card)).toEqual([
        expect.stringContaining('Grootste overwinning'),
        expect.stringContaining('Meeste doelpunten'),
      ])
      expect(card).not.toContain('Het vroegste en het laatste doelpunt')
      expect(card).toContain('Alle 3 gespeelde wedstrijden')
    })

    it('says so in a sentence, with no list, when there is no played match of the Eredivisie', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.filter((match) => match.competition === 'KNVB Beker' || match.status !== 'played'),
      })

      const card = section(await render(eredivisie), 'uitersten')

      expect(card).toContain('We hebben nog geen uitslagen van dit seizoen.')
      expect(card).not.toContain('<ul')
      expect(card).not.toContain('gespeelde wedstrijd')
      expect(card).not.toContain('hf-card-shareable')
    })

    it('says so in a sentence for a season without matches', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [] })

      expect(section(await render(eredivisie), 'uitersten')).toContain('We hebben nog geen uitslagen van dit seizoen.')
    })

    it('is gone, with no card, when the database can not be read', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.mocked(getMatchData).mockRejectedValue(new Error('down'))

      expect(await render(eredivisie)).not.toContain('hoe-de-wedstrijden-verlopen')
      expect(await render(eredivisie)).not.toContain('uitersten')
    })
  })

  describe('the card Hoe vaak welke uitslag', () => {
    const card = async () => section(await render(), 'hoe-vaak-welke-uitslag')

    it('is a card of the group Uitslagen after the streaks, with the heading at level 3 and an anchor', async () => {
      const html = await render()

      expect(html).toContain(
        '<section class="hf-card hf-card-warm hf-card-shareable" aria-labelledby="hoe-vaak-welke-uitslag">',
      )
      expect(html.indexOf('id="hoe-vaak-welke-uitslag"')).toBeGreaterThan(html.indexOf('id="reeksen"'))
      expect(html).toContain(
        '<h3 class="hf-heading-3 hf-heading-anchored" id="hoe-vaak-welke-uitslag"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#hoe-vaak-welke-uitslag">Hoe vaak welke uitslag</a></h3>',
      )
    })

    it('counts the played matches of the list Uitslagen in three tables, best first, with a swatch and the outcome in words', async () => {
      const html = await card()
      const tables = [...html.matchAll(/<table.*?<\/table>/g)].map(([table]) => table)
      const rowsOf = (table: string) =>
        [...table.matchAll(/<tr><th scope="row">(.*?)<\/th><td class="hf-numeric">([^<]*)<\/td><\/tr>/g)].map(
          ([, header, count]) => [header?.replaceAll(/<[^>]*>/g, ''), count],
        )

      expect(
        tables.map((table) => table.match(/<th scope="col">.*?<span class="hf-visually-hidden">([^<]*)</)?.[1]),
      ).toEqual(['Winst, 3 keer', 'Gelijk, 1 keer'])
      expect(rowsOf(tables[0]!)).toEqual([
        ['3–1, winst', '1×'],
        ['2–0, winst', '1×'],
        ['1–0, winst', '1×'],
      ])
      expect(rowsOf(tables[1]!)).toEqual([['2–2, gelijk', '1×']])
      expect(html.match(/<tr><th scope="row"><span aria-hidden="true" class="hf-donut-chart-swatch /g)).toHaveLength(4)
    })

    it('has a table for each outcome that happened, in green, grey and red order, and none for an outcome that did not', async () => {
      const played = matchData.matches.filter((match) => match.status === 'played')
      const loss: PublicMatch = { ...played[0]!, goalsAgainst: 3, goalsFor: 0, round: 'Speelronde 6' }

      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [...matchData.matches, loss] })

      const html = await card()

      expect(
        [...html.matchAll(/<th scope="col"><span aria-hidden="true">([^<]*)<\/span>/g)].map(([, header]) => header),
      ).toEqual(['Winst 3×', 'Gelijk 1×', 'Verlies 1×'])
      expect(html).toContain('0–3<span class="hf-visually-hidden">, verlies</span>')

      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.filter(
          (match) => match.status !== 'played' || match.goalsFor !== match.goalsAgainst,
        ),
      })

      expect(await card()).not.toContain('Gelijk')
    })

    it('has no sentence above the chart, the counts in the headers and under the tables how many matches it counts', async () => {
      const html = await card()

      expect(html).not.toContain('keer gewonnen')
      expect(html).toContain(
        '<span aria-hidden="true">Winst 3×</span><span class="hf-visually-hidden">Winst, 3 keer</span>',
      )
      expect(html).toContain(
        '<span aria-hidden="true">Gelijk 1×</span><span class="hf-visually-hidden">Gelijk, 1 keer</span>',
      )
      expect(html).toContain('<p class="hf-meta">Alle 4 gespeelde wedstrijden</p>')
      expect(html.lastIndexOf('</table>')).toBeLessThan(html.indexOf('Alle 4 gespeelde wedstrijden'))
    })

    it('has one chart, no table of competitions and no sentence about the goals', async () => {
      const html = await card()

      expect(html.match(/hf-donut-chart /g)).toHaveLength(1)
      expect(html).not.toContain('Competitie')
      expect(html).not.toContain('hf-donut-chart-small')
      expect(html).not.toContain('Doelpunten:')
    })

    it('hides the chart from a screen reader and has a caption and column headers on the table', async () => {
      const html = await card()

      expect(html).toContain('<div aria-hidden="true" class="hf-donut-chart hf-donut-chart-bare">')
      expect(html.match(/<caption class="hf-visually-hidden">Uitslagen van /g)).toHaveLength(2)
      expect(html).toContain('<th class="hf-numeric" scope="col"><span class="hf-visually-hidden">Keer</span></th>')
      expect(html).toContain('<div class="hf-data-table-group">')
    })

    it('says that there are no results yet, without a chart, when no match is played', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [] })

      const html = await card()

      expect(html).toContain('We hebben nog geen uitslagen van dit seizoen.')
      expect(html).not.toContain('hf-donut-chart')
      expect(html).not.toContain('<table')
      expect(html).not.toContain('hf-card-shareable')
    })
  })

  it('has one credit under the page, for the three pages, with the time of the last reading', async () => {
    const html = await render()

    expect(html.match(/class="hf-meta hf-wikipedia-credit"/g)).toHaveLength(1)
    expect(html).toContain('<summary>Bron: Wikipedia</summary>')
    expect(html).toContain('href="https://nl.wikipedia.org/wiki/Eredivisie_2026/27_(mannenvoetbal)"')
    expect(html).toContain('href="https://nl.wikipedia.org/wiki/KNVB_Beker_2026/27_(mannen)"')
    expect(html).toContain('<time dateTime="2026-10-23T12:05:00.000Z">23 oktober 2026 om 14:05</time>')
    expect(html.lastIndexOf('hf-wikipedia-credit')).toBeGreaterThan(html.lastIndexOf('</table>'))
    // Last on the page, under the four groups.
    expect(html.lastIndexOf('hf-wikipedia-credit')).toBeGreaterThan(html.indexOf('id="rondom-de-wedstrijd"'))
    expect(html.slice(html.indexOf('style="grid-area:credit"'))).toContain('hf-wikipedia-credit')
  })

  it('puts the credit in a card without a border or background to see, and links to no history', async () => {
    const html = await render()

    expect(html).toMatch(/<div class="hf-card hf-card-transparent"><details class="hf-meta hf-wikipedia-credit"/)
    expect(html).not.toContain('action=history')
    expect(html).not.toContain('geschiedenis')
  })

  it('has no link to another site except in the credit, and loads nothing from another domain', async () => {
    const html = await render()
    const outside = html.replace(/<details class="hf-meta hf-wikipedia-credit".*?<\/details>/s, '')

    expect(outside).not.toMatch(/https?:\/\//u)
    expect(html).not.toMatch(/<(?:img|script|iframe|link)\b/u)
  })

  it('says in a sentence for visitors that there is nothing yet when the importer has not run', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      coaches: [],
      edited: false,
      matches: [],
      pages: [],
      season: '2026/27',
      standings: [],
    })

    const html = await render()

    expect(html).toContain('We hebben nog geen uitslagen van dit seizoen.')
    expect(html).toContain('We hebben nog geen gespeelde wedstrijden van dit seizoen.')
    expect(html).not.toContain('Bron: Wikipedia')
    expect(html.match(/<h1/g)).toHaveLength(1)
  })

  it('shows the error page in the HTML, and logs the reason, when the database can not be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getMatchData).mockRejectedValue(
      new Error('Failed query: select 1\nparams: geheim', { cause: new Error('connect ECONNREFUSED 127.0.0.1:3306') }),
    )

    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
    expect(html).toContain('<a href="/wedstrijden/cijfers">Probeer het opnieuw</a>')
    expect(error).toHaveBeenCalledWith(
      'Could not read the matches and the table for /wedstrijden/cijfers: Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)',
    )
    expect(await generateMetadata()).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })

  it('has a title of its own, a description and the canonical link', async () => {
    const metadata = await generateMetadata()

    expect(metadata.title).toBe('Cijfers')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/wedstrijden/cijfers')
    expect(metadata.description).toContain('cijfers')
  })
})

describe('the season picker on /wedstrijden/cijfers', () => {
  beforeEach(() => {
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26'])
  })

  it('asks for the current season', async () => {
    await render()

    expect(getMatchData).toHaveBeenCalledExactlyOnceWith('2026/27')
  })

  it('has the picker in the toolbar under the heading, with the current season chosen and the earlier seasons after it', async () => {
    const html = await render()

    expect(html).toMatch(
      /<h1 class="hf-heading-1">Cijfers<\/h1><\/div><div class="hf-page-toolbar"[^>]*><form [^>]*aria-label="Seizoen kiezen"/,
    )
    expect(html).toContain(
      '<option value="2026-27" selected="">2026/27</option><option value="2025-26">2025/26</option>',
    )
    expect(html).toContain('action="/wedstrijden/cijfers/kies"')
  })

  it('keeps the images as they were, without a season on them', async () => {
    expect(await render()).not.toContain('Seizoen 2026/27 ·')
  })

  it('has no picker when the current season is the only one, and keeps the heading', async () => {
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27'])

    const html = await render()

    expect(html).not.toContain('<select')
    expect(html).not.toContain('Seizoen kiezen')
    expect(html).toContain('<h1 class="hf-heading-1">Cijfers</h1>')
  })

  it('has the bar of the page and the picker agree: a link for every card the page has', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2[^>]*\sid="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(statisticsShortcuts.map(({ href }) => href)).toEqual(ids)
  })
})

describe('the choice between all the matches and the Eredivisie on /wedstrijden/cijfers', () => {
  // The test data has a played cup tie, 1-0 away at SV Proefdorp, beside three played matches
  // of the Eredivisie.
  const switchOf = (html: string) => /<div [^>]*aria-label="Welke wedstrijden"[^>]*>.*?<\/div>/.exec(html)?.[0]
  const withoutCup = () =>
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: matchData.matches.filter((match) => match.competition === 'Eredivisie'),
    })
  /** The digest of the error that `notFound()` throws, which Next.js answers with a 404. */
  const digestOf = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (error: unknown) => (error as { digest?: string }).digest,
    )

  it('has a switch of three links in the toolbar, with the choice that the address asks for marked', async () => {
    const all = await render()
    const league = await render(eredivisie)

    expect(switchOf(all)).toBe(switchHtml('/wedstrijden/cijfers', 0, leagueAndCup))
    expect(switchOf(league)).toBe(switchHtml('/wedstrijden/cijfers', 1, leagueAndCup))
    expect(all.match(/aria-current/g)).toHaveLength(1)
  })

  it('puts the switch in the toolbar under the heading, after the season picker and before every card', async () => {
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26'])

    const html = await render()
    const toolbar = html.slice(
      html.indexOf('<div class="hf-page-toolbar"'),
      html.indexOf('<section aria-labelledby="competitie"'),
    )

    expect(html).toMatch(/<h1 class="hf-heading-1">Cijfers<\/h1><\/div><div class="hf-page-toolbar"/)
    expect(toolbar).toContain('aria-label="Seizoen kiezen"')
    expect(toolbar).toContain('aria-label="Welke wedstrijden"')
    expect(toolbar.indexOf('Seizoen kiezen')).toBeLessThan(toolbar.indexOf('Welke wedstrijden'))
    // It is no card and has no card around it, and it comes before every card it controls.
    expect(html.indexOf('Welke wedstrijden')).toBeLessThan(html.indexOf('id="verloop-van-het-seizoen"'))
    expect(html).not.toMatch(/<section[^>]*>(?:(?!<\/section>).)*Welke wedstrijden/s)
    expect(html.match(/Welke wedstrijden/g)).toHaveLength(1)
  })

  it('has no switch in a season without a played cup tie, nor for one that is still to come', async () => {
    withoutCup()

    expect(switchOf(await render())).toBeUndefined()

    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: matchData.matches.map((match) =>
        match.competition === 'Eredivisie'
          ? match
          : { ...match, goalsAgainst: null, goalsFor: null, status: 'scheduled' },
      ),
    })

    expect(switchOf(await render())).toBeUndefined()
  })

  it('counts all the matches without a parameter: the cup tie is in the streaks, home and away, and the extremes', async () => {
    const html = await render()

    expect(section(html, 'reeksen')).toContain('SV Proefdorp')
    expect(section(html, 'reeksen')).toContain(
      'De reeksen van sc Heerenveen in de Eredivisie en de KNVB Beker dit seizoen',
    )
    expect(section(html, 'thuis-en-uit')).toContain('Alle 4 gespeelde wedstrijden')
    expect(section(html, 'de-nul-gehouden')).toContain('SV Proefdorp')
  })

  it('counts the Eredivisie alone with ?competitie=eredivisie: no cup tie in the cards that follow the switch', async () => {
    const html = await render(eredivisie)

    expect(section(html, 'reeksen')).not.toContain('SV Proefdorp')
    expect(section(html, 'reeksen')).toContain('De reeksen van sc Heerenveen in de Eredivisie dit seizoen')
    expect(section(html, 'thuis-en-uit')).toContain('Alle 3 gespeelde wedstrijden')
    expect(section(html, 'de-nul-gehouden')).not.toContain('SV Proefdorp')
    expect(section(html, 'de-nul-gehouden')).toContain('1 keer de nul gehouden in 3 wedstrijden')
  })

  it('counts a season without a cup tie the same for both choices, in every card', async () => {
    withoutCup()

    const all = await render()
    const league = await render(eredivisie)

    // Only the links carry the choice, which is the same page. The visitors table has a column
    // for the competition under Alle wedstrijden, so it is the one card that differs. The
    // results per head coach count every season, not this one, and have tests of their own.
    for (const id of statisticsShortcuts
      .map(({ href }) => href.slice(1))
      .filter((id) => id !== 'toeschouwers' && id !== 'resultaten-per-hoofdtrainer')) {
      expect(section(all, id), id).toBe(section(league, id).replaceAll('?competitie=eredivisie', ''))
    }
  })

  it('keeps the season and how the matches go on the Eredivisie, whatever the choice', async () => {
    const all = await render()
    const league = await render(eredivisie)

    const card = (html: string, id: string) => section(html, id).slice(0, section(html, id).indexOf('</section>'))

    for (const id of ['verloop-van-het-seizoen', 'hoe-de-wedstrijden-verlopen']) {
      expect(card(all, id), id).toBe(card(league, id))
      expect(card(all, id), id).not.toContain('SV Proefdorp')
      expect(card(all, id), id).toMatch(/<p class="hf-meta">Alleen de Eredivisie<\/p>$/)
      expect(card(all, id), id).toContain('>Eredivisie</span>')
    }
  })

  it('says Alleen de Eredivisie on the cards that ignore the switch, and not on the cards that follow it', async () => {
    const html = await render()

    for (const id of ['verloop-van-het-seizoen', 'hoe-de-wedstrijden-verlopen']) {
      expect(html.indexOf(`id="${id}"`), id).toBeGreaterThan(html.indexOf('Welke wedstrijden'))
    }

    for (const id of [
      'reeksen',
      'thuis-en-uit',
      'toeschouwers',
      'hoe-vaak-welke-uitslag',
      'de-nul-gehouden',
      'doelpunten-per-kwartier',
      'uitersten',
    ]) {
      expect(html.indexOf(`id="${id}"`), id).toBeGreaterThan(html.indexOf('Welke wedstrijden'))
      expect(section(html, id), id).not.toContain('Alleen de Eredivisie')
      expect(section(html, id), id).not.toContain('>Eredivisie</span>')
    }
  })

  it('counts the card Hoe vaak welke uitslag by the choice: the cup tie only with all the matches', async () => {
    const all = section(await render(), 'hoe-vaak-welke-uitslag')
    const league = section(await render(eredivisie), 'hoe-vaak-welke-uitslag')

    expect(all).toContain('Alle 4 gespeelde wedstrijden')
    expect(league).toContain('Alle 3 gespeelde wedstrijden')
  })

  it('shows the points of home and away only when every counted match is a league match', async () => {
    const names = (html: string) =>
      [...section(html, 'thuis-en-uit').matchAll(/<th scope="row">([^<]*)<\/th>/g)].map(([, name]) => name)

    expect(names(await render())).not.toContain('Punten')
    expect(names(await render())).not.toContain('Punten per wedstrijd')
    expect(names(await render(eredivisie))).toEqual(expect.arrayContaining(['Punten', 'Punten per wedstrijd']))

    withoutCup()

    expect(names(await render())).toEqual(expect.arrayContaining(['Punten', 'Punten per wedstrijd']))
  })

  it('keeps the other rows of home and away for all the matches, with the cup tie in the figures', async () => {
    const rows = [
      ...section(await render(), 'thuis-en-uit').matchAll(
        /<th scope="row">([^<]*)<\/th><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td>/g,
      ),
    ].map(([, name, home, away, total]) => [name, home, away, total])

    expect(rows).toEqual([
      ['Gespeeld', '2', '2', '4'],
      ['Gewonnen', '2', '1', '3'],
      ['Gelijk', '0', '1', '1'],
      ['Verloren', '0', '0', '0'],
      ['Doelpunten voor', '5', '3', '8'],
      ['Doelpunten tegen', '1', '2', '3'],
      ['Doelpunten per wedstrijd', '2,50', '1,50', '2,00'],
      ['Zonder tegendoelpunt', '1', '1', '2'],
    ])
  })

  it('gives the page "niet gevonden" for a value that is not eredivisie, one that is empty and one that is given twice', async () => {
    for (const competitie of [
      'Eredivisie',
      'alle',
      'Beker',
      'Europa',
      '',
      ['eredivisie', 'eredivisie'],
      ['eredivisie'],
    ]) {
      expect(await digestOf(render({ competitie })), JSON.stringify(competitie)).toContain('404')
    }
  })

  it('keeps the choice in the season picker and in the button of the clean sheets', async () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      ...matchData.matches[1]!,
      goals: [],
      goalsAgainst: 0,
      matchDate: `2026-09-${String(index + 1).padStart(2, '0')}`,
      opponent: `Proefclub ${index + 1}`,
      round: `Speelronde ${100 + index}`,
    }))

    vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [...matchData.matches, ...many] })
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26'])

    const league = await render(eredivisie)
    const all = await render()
    const hidden = (html: string) => [...html.matchAll(/<input [^>]*type="hidden"[^>]*>/g)].map(([input]) => input)

    expect(hidden(league)).toHaveLength(2)
    expect(hidden(league).join('')).toMatch(/name="competitie"/)
    expect(hidden(league).join('')).toMatch(/value="eredivisie"/)
    expect(section(league, 'de-nul-gehouden')).toMatch(/<input [^>]*name="competitie"[^>]*value="eredivisie"/)
    expect(league).toMatch(/<form [^>]*aria-label="Seizoen kiezen"[^>]*>(<input [^>]*name="competitie"[^>]*>)/)
    expect(hidden(all)).toHaveLength(0)
  })

  it('reads the same data for both choices and keeps nothing between them: the choice only filters', async () => {
    // Frozen: a choice that changed the cached data would throw, not change the other choice.
    const freeze = <T extends object>(value: T): T => {
      for (const inner of Object.values(value)) {
        if (typeof inner === 'object' && inner !== null) {
          freeze(inner)
        }
      }

      return Object.freeze(value)
    }

    vi.mocked(getMatchData).mockResolvedValue(freeze(structuredClone(matchData)))

    const first = await render()

    await render(eredivisie)

    expect(await render()).toBe(first)
    expect(getMatchData).toHaveBeenCalledTimes(3)
    expect(vi.mocked(getMatchData).mock.calls.map(([season]) => season)).toEqual(['2026/27', '2026/27', '2026/27'])
  })
})

describe('the card Toeschouwers', () => {
  const home = (round: number, attendance: null | number, extra: Partial<PublicMatch> = {}): PublicMatch => ({
    ...matchData.matches[0]!,
    attendance,
    competition: 'Eredivisie',
    goals: [],
    home: true,
    matchDate: `2026-08-${String(round).padStart(2, '0')}`,
    opponent: `Proefclub ${round}`,
    round: `Speelronde ${round}`,
    status: 'played',
    ...extra,
  })
  const withMatches = (...list: PublicMatch[]) =>
    vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: list })
  const toeschouwers = async (searchParams = {}) => section(await render(searchParams), 'toeschouwers')

  it('has a bar for each home match, the average and the largest number in two sentences, and a table', async () => {
    withMatches(home(1, 20000), home(2, 26022), home(3, 0), home(4, null), home(5, 26022))

    const html = await toeschouwers()

    expect(html.match(/class="hf-bar-chart-slot"/g)).toHaveLength(5)
    expect(html).toContain('Gemiddeld 24.015 toeschouwers per thuiswedstrijd')
    expect(html).toContain('Het meest: 26.022, tegen Proefclub 2 op 2 augustus 2026')
    expect(html).toContain('3 van de 5 gespeelde wedstrijden')
    expect(html).toContain('>Zonder publiek<')
    expect(html).toContain('>Niet bekend<')
    expect(html).toContain('>26.022<')
    expect(html).toContain('aria-hidden="true" class="hf-bar-chart"')
  })

  it('has the table in a closed fold under the chart, and the average, the largest number and the credit outside it', async () => {
    withMatches(home(1, 20000), home(2, 26022))

    const html = await toeschouwers()
    const fold = html.indexOf('<details class="hf-disclosure"><summary>Aantal per thuiswedstrijd')

    expect(fold).toBeGreaterThan(html.indexOf('hf-bar-chart'))
    expect(html).not.toMatch(/<details[^>]* open/)
    expect(html.indexOf('<table')).toBeGreaterThan(fold)
    expect(html.indexOf('<table')).toBeLessThan(html.indexOf('</details>'))
    expect(html.indexOf('Gemiddeld')).toBeLessThan(fold)
    expect(html.indexOf('Het meest')).toBeLessThan(fold)
    expect(html.indexOf('gespeelde wedstrijd')).toBeGreaterThan(html.indexOf('</details>'))
  })

  it('writes the numbers at the side in Dutch, up to the largest number rounded up to 5.000', async () => {
    withMatches(home(1, 20001))

    const html = await toeschouwers()

    for (const tick of ['5.000', '10.000', '15.000', '20.000', '25.000']) {
      expect(html).toContain(`>${tick}</span>`)
    }
    expect(html).not.toContain('>30.000<')
  })

  it('leaves out an away match and a cancelled one, and keeps a home match still to be played as an empty place', async () => {
    withMatches(
      home(1, 20000),
      home(2, 30000, { home: false }),
      home(3, null, { status: 'cancelled' }),
      home(4, null, { status: 'scheduled' }),
    )

    const html = await toeschouwers()

    expect(html.match(/class="hf-bar-chart-slot"/g)).toHaveLength(2)
    expect(html).toContain('>Nog niet gespeeld<')
    expect(html).not.toContain('Proefclub 2')
    expect(html).not.toContain('Proefclub 3')
  })

  it('counts the cup only on Alle wedstrijden, which is also the only one with the column Competitie', async () => {
    withMatches(home(1, 20000), home(2, 25000, { competition: 'KNVB Beker' }))

    const all = await toeschouwers()
    const league = await toeschouwers(eredivisie)

    expect(all.match(/class="hf-bar-chart-slot"/g)).toHaveLength(2)
    expect(all).toContain('>Competitie<')
    expect(league.match(/class="hf-bar-chart-slot"/g)).toHaveLength(1)
    expect(league).not.toContain('>Competitie<')
  })

  it('says so in a sentence, and has no chart, without a number, with only zeroes, or without a home match', async () => {
    withMatches(home(1, null))
    expect(await toeschouwers()).toContain('We hebben van dit seizoen nog geen toeschouwersaantallen.')

    withMatches(home(1, 0), home(2, null))
    expect(await toeschouwers()).toContain('Alle thuiswedstrijden waarvan we het aantal kennen, waren zonder publiek.')

    withMatches(home(1, 5000, { home: false }))

    const none = await toeschouwers()

    expect(none).toContain('We hebben nog geen thuiswedstrijden van dit seizoen.')
    for (const html of [none]) {
      expect(html).not.toMatch(/hf-bar-chart|<table/)
    }
  })

  it('credits Wikipedia and has no request to another site or script', async () => {
    withMatches(home(1, 20000))

    const html = await toeschouwers()

    expect(html).toContain('volgens Wikipedia')
    expect(html).toContain('data-hf-card-share')
    expect(html).not.toMatch(/<script|<img/)
  })
})

describe('the old addresses of Cijfers', () => {
  // /statistieken, /statistieken/<seizoen> and /statistieken/kies have no route any more, so
  // they are "niet gevonden", and there is no redirect: the site is not public yet (#768).
  it.each(['page.tsx', '[seizoen]', 'kies'])('has no route %s under /statistieken', (route) => {
    expect(existsSync(new URL(`../statistieken/${route}`, import.meta.url))).toBe(false)
  })
})
