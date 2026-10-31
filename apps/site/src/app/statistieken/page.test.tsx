import type { PublicMatch } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons } from '../../matches'
import { statisticsShortcuts } from '../../statisticsShortcuts'
import { matchData } from '../../test-matches'
import { withoutIcons } from '../../without-icons'
import StatisticsPage, { generateMetadata } from './page'

// Only the query is replaced: the split into the programme and the results is the real one.
vi.mock('../../matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))

// The afternoon of Friday 23 October 2026 in the Netherlands.
const now = new Date('2026-10-23T13:40:00Z')

async function render(searchParams: Record<string, string | string[] | undefined> = {}) {
  return withoutIcons(renderToStaticMarkup(await StatisticsPage({ searchParams: Promise.resolve(searchParams) })))
}

/** The address `?competitie=eredivisie`: the cards count the Eredivisie alone. */
const eredivisie = { competitie: 'eredivisie' }

/** The part of the page under the h2 with this id, up to the next h2 or the end. */
function section(html: string, id: string) {
  const start = html.indexOf(`<h2 class="hf-heading-2 hf-heading-anchored" id="${id}">`)
  const end = html.indexOf('<h2', start + 1)

  return html.slice(start, end === -1 ? undefined : end)
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

describe('the page /statistieken', () => {
  it('has one h1 and nine h2 headings in order: our place in the league, the season, the streaks, home and away, the goal scorers, the clean sheets, the goals per quarter, how the matches go and the extremes', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Statistieken</h1>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="onze-plek-in-de-competitie"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#onze-plek-in-de-competitie">Onze plek in de competitie</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="verloop-van-het-seizoen"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#verloop-van-het-seizoen">Verloop van het seizoen</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="reeksen"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#reeksen">Reeksen</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="thuis-en-uit"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#thuis-en-uit">Thuis en uit</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="doelpuntenmakers"><span class="hf-heading-target"></span><span class="hf-heading-alias" id="topscorers"></span><a class="hf-heading-link" href="#doelpuntenmakers">Doelpuntenmakers</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="de-nul-gehouden"><span class="hf-heading-target"></span><span class="hf-heading-alias" id="nul-gehouden"></span><a class="hf-heading-link" href="#de-nul-gehouden">De nul gehouden</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="doelpunten-per-kwartier"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#doelpunten-per-kwartier">Doelpunten per kwartier</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="hoe-de-wedstrijden-verlopen"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#hoe-de-wedstrijden-verlopen">Hoe de wedstrijden verlopen</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="uitersten"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#uitersten">Uitersten</a></h2>',
    ])
  })

  it('has no introduction under the h1: the headings of the cards say what is on the page', async () => {
    const html = await render()

    expect(html).not.toContain('hf-intro')
    expect(html).toMatch(
      /<div class="hf-page-intro"><div class="hf-page-title"><h1 class="hf-heading-1">Statistieken<\/h1>/,
    )
  })

  describe('the order of the parts of a card', () => {
    // The parts of a card stand in a fixed order: the heading, the explanation, the content,
    // the legend, "Gebaseerd op" with the sentences that go with it, the link, and the credit.
    /** Fails when a part is missing, or stands before the one in front of it. */
    function expectInOrder(card: string, parts: string[]) {
      const places = parts.map((part) => card.indexOf(part))

      expect(places.filter((place) => place === -1).length, `missing from the card: ${parts.join(' | ')}`).toBe(0)
      expect(places, parts.join(' | ')).toEqual([...places].sort((a, b) => a - b))
    }

    it('has the explanation of the streaks under the heading and above the table', async () => {
      expectInOrder(section(await render(), 'reeksen'), [
        '</h2>',
        'Aantal wedstrijden achter elkaar',
        '<table',
        'Gebaseerd op',
      ])
    })

    it('has the legend of a table under it, and "Gebaseerd op" last', async () => {
      const html = await render()

      expectInOrder(section(html, 'doelpuntenmakers'), [
        '</h2>',
        '<table',
        'hf-bar-legend',
        'Gebaseerd op',
        'Alle doelpuntenmakers',
      ])
      expectInOrder(section(html, 'hoe-de-wedstrijden-verlopen'), [
        '</h2>',
        '<table',
        'Na een voorsprong',
        'G gespeeld, W winst',
        'Gebaseerd op',
      ])
    })

    it('has the key of the chart of the season under the chart, with the table of the same numbers after it', async () => {
      expectInOrder(section(await render(), 'verloop-van-het-seizoen'), [
        '</h2>',
        'hf-form-chart',
        'hf-form-chart-key',
        'hf-form-chart-line',
        '<table',
      ])
    })

    it('has "Gebaseerd op" under the content on the cards that count', async () => {
      const html = await render()

      expectInOrder(section(html, 'onze-plek-in-de-competitie'), ['</h2>', '<table', 'staat', 'Gebaseerd op'])
      expectInOrder(section(html, 'thuis-en-uit'), ['</h2>', '<table', 'Gebaseerd op'])
      expectInOrder(section(html, 'doelpunten-per-kwartier'), ['</h2>', '<table', 'Gebaseerd op'])
      expectInOrder(section(html, 'uitersten'), [
        '</h2>',
        '<ul',
        'Gebaseerd op alle',
        'Vroegste en laatste doelpunt: gebaseerd op',
      ])
    })

    it('has the sentence about extra time right after "Gebaseerd op"', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((match) => (match.goals.length > 0 ? { ...match, extraTime: true } : match)),
      })

      expectInOrder(section(await render(), 'doelpunten-per-kwartier'), [
        '</h2>',
        '<table',
        'Gebaseerd op',
        'Doelpunten in de verlenging',
      ])
    })
  })

  it('has a heading for every link of the bar under the header, with the id the link goes to, in the same order', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2 [^>]*id="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(statisticsShortcuts.map((item) => item.href)).toEqual(ids)
  })

  it('has the first four cards in the main with the h1 and the other five in a named, wide sidebar after it, so the two columns are equal', async () => {
    const html = await render()
    const main = html.match(/<main[^>]*>.*<\/main>/s)?.[0] ?? ''
    const sidebar = html.match(/<aside[^>]*>.*<\/aside>/s)?.[0] ?? ''
    const left = ['onze-plek-in-de-competitie', 'verloop-van-het-seizoen', 'reeksen', 'thuis-en-uit']
    const right = [
      'doelpuntenmakers',
      'de-nul-gehouden',
      'doelpunten-per-kwartier',
      'hoe-de-wedstrijden-verlopen',
      'uitersten',
    ]

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(sidebar).toMatch(
      /^<aside class="hf-page-sidebar hf-page-sidebar-wide" aria-label="Meer cijfers over het seizoen">/,
    )
    expect(main.match(/<h1/g)).toHaveLength(1)
    expect(sidebar).not.toContain('<h1')
    expect([...main.matchAll(/<h2[^>]*\sid="([^"]+)"/g)].map(([, id]) => id)).toEqual(left)
    expect([...sidebar.matchAll(/<h2[^>]*\sid="([^"]+)"/g)].map(([, id]) => id)).toEqual(right)
  })

  it('has none of the cards of Wedstrijden', async () => {
    const html = await render()

    for (const id of ['programma', 'uitslagen', 'stand', 'eindstand', 'hoofdtrainer']) {
      expect(html).not.toContain(`id="${id}"`)
    }
  })

  it('has no order or style attribute but the length of a bar and the place of a label or a bar of a chart, so the order on a phone is the order in the source', async () => {
    expect(await render()).not.toMatch(
      / style="(?!--hf-bar-share:[\d.]+"|--hf-donut-cos:|--hf-bar-chart-(?:slots|at|share|across):[\d.]+")|order:/,
    )
  })

  it('names each card by its h2, so a link with a hash has a target', async () => {
    const html = await render()

    for (const { href } of statisticsShortcuts) {
      expect(html).toMatch(new RegExp(`<section class="hf-card[ a-z-]*" aria-labelledby="${href.slice(1)}">`))
    }
  })

  it('gives our place in the league the white surface, the streaks, the goal scorers, the clean sheets, how the matches go and the extremes the soft one, and the season, home and away and the goals per quarter the warm one', async () => {
    const html = await render()

    for (const [id, surface] of [
      ['onze-plek-in-de-competitie', 'hf-card hf-card-shareable'],
      ['doelpuntenmakers', 'hf-card hf-card-soft hf-card-shareable'],
      ['de-nul-gehouden', 'hf-card hf-card-soft hf-card-shareable'],
      ['verloop-van-het-seizoen', 'hf-card hf-card-warm hf-card-shareable'],
      ['reeksen', 'hf-card hf-card-soft hf-card-shareable'],
      ['thuis-en-uit', 'hf-card hf-card-warm hf-card-shareable'],
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

    expect(shareable).toEqual(statisticsShortcuts.map(({ href }) => href.slice(1)))
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
      expect(sheets).toContain('<span class="hf-short-match-where">uit</span>')
      expect(sheets).toContain('<span class="hf-short-match-where">thuis</span>')
      expect(sheets).toContain('1–0')
      expect(sheets).toContain('2–0')
      expect(sheets).toContain('1 tegen 0')
      expect(sheets).not.toContain('Oud Resultaat')
      expect(sheets).not.toContain('Voorbeeld United')
    })

    it('has no competition, round, stadium, scorers or colour of the outcome', async () => {
      const sheets = section(await render(), 'de-nul-gehouden')

      expect(sheets).not.toContain('Eredivisie')
      expect(sheets).not.toContain('KNVB Beker')
      expect(sheets).not.toContain('Speelronde')
      expect(sheets).not.toContain('Stadion Proeflaan')
      expect(sheets).not.toContain('hf-match')
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
      expect(sheets).toContain('action="/statistieken#nul-11"')
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
      expect(sheets).toContain('action="/statistieken#nul-16"')
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

    it('is a card in the main directly under our place in the league, before the goal scorers in the sidebar', async () => {
      const html = await render()

      expect(html.indexOf('id="onze-plek-in-de-competitie"')).toBeLessThan(html.indexOf('id="verloop-van-het-seizoen"'))
      expect(html.indexOf('id="verloop-van-het-seizoen"')).toBeLessThan(html.indexOf('id="doelpuntenmakers"'))
      expect(html.match(/<section[^>]*aria-labelledby="verloop-van-het-seizoen"/g)).toHaveLength(1)
    })

    it('shows the chart, with the form and the key, and a table with the numbers of the chart', async () => {
      const card = section(await render(), 'verloop-van-het-seizoen')

      expect(card).toContain('hf-form-chart')
      expect(card).toContain('<b>W</b> winst (3 punten), <b>G</b> gelijk (1), <b>V</b> verlies (0).')
      expect(card.match(/<table/g)).toHaveLength(1)
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
      expect(card).toContain('in de laatste 5 wedstrijden')
      expect(card).not.toContain('De lijn begint na 5 wedstrijden.')
    })

    it('says the line starts after five matches while there are fewer', async () => {
      expect(section(await render(), 'verloop-van-het-seizoen')).toContain('De lijn begint na 5 wedstrijden.')
    })

    it('hides the chart from a screen reader and leaves the numbers to the table', async () => {
      const card = section(await render(), 'verloop-van-het-seizoen')

      expect(card).toContain('aria-hidden="true"')
      expect(card.match(/<table[^>]*>.*<\/table>/s)?.[0]).not.toContain('aria-hidden')
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

    it('is a card in the main directly after the season, before the goal scorers in the sidebar', async () => {
      const html = await render(eredivisie)

      expect(html.indexOf('id="verloop-van-het-seizoen"')).toBeLessThan(html.indexOf('id="reeksen"'))
      expect(html.indexOf('id="reeksen"')).toBeLessThan(html.indexOf('id="doelpuntenmakers"'))
      expect(html.match(/<section[^>]*aria-labelledby="reeksen"/g)).toHaveLength(1)
      expect(html.match(/<h2[^>]*id="reeksen"[^>]*>/g)).toHaveLength(1)
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
      expect(lines[0]).toContain('uit')
      expect(lines[0]).toContain('1 tegen 0')
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

      expect(section(await render(eredivisie), 'reeksen')).toContain('Gebaseerd op alle 6 gespeelde wedstrijden')

      withSeason(season.slice(0, 1))

      const card = section(await render(eredivisie), 'reeksen')

      expect(card).toContain('Gebaseerd op 1 gespeelde wedstrijd')
      expect(card).not.toContain('alle 1')
    })

    it('shows the matches there are when fewer than five are played', async () => {
      const card = section(await render(eredivisie), 'reeksen')

      expect(card.match(/class="hf-short-match"/g)).toHaveLength(3)
      expect(card).toContain('Gebaseerd op alle 3 gespeelde wedstrijden')
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
      expect(card).not.toContain('Gebaseerd op')
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

    it('is a card in the main directly after the streaks, before the goal scorers in the sidebar', async () => {
      const html = await render(eredivisie)

      expect(html.indexOf('id="reeksen"')).toBeLessThan(html.indexOf('id="thuis-en-uit"'))
      expect(html.indexOf('id="thuis-en-uit"')).toBeLessThan(html.indexOf('id="doelpuntenmakers"'))
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
      expect(section(await render(eredivisie), 'thuis-en-uit')).toContain('Gebaseerd op alle 3 gespeelde wedstrijden')
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
      expect(card).toContain('Gebaseerd op 1 gespeelde wedstrijd<')
    })

    it('says so in a sentence, with no table, when no match is played', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [] })

      const card = section(await render(eredivisie), 'thuis-en-uit')

      expect(card).toContain('We hebben nog geen uitslagen van dit seizoen.')
      expect(card).not.toContain('<table')
      expect(card).not.toContain('Gebaseerd op')
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
      expect(section(await render(), 'doelpunten-per-kwartier')).toContain(
        'Gebaseerd op 2 van de 4 gespeelde wedstrijden',
      )
    })

    it('says that extra time is left out when a match in the count went to extra time', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((match) => (match.goals.length > 0 ? { ...match, extraTime: true } : match)),
      })

      expect(section(await render(), 'doelpunten-per-kwartier')).toContain(
        '<p class="hf-meta">Doelpunten in de verlenging tellen niet mee.</p>',
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

      expect(section(await render(), 'doelpunten-per-kwartier')).toContain('Gebaseerd op alle 2 gespeelde wedstrijden')

      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: goalMatches.slice(0, 1) })

      expect(section(await render(), 'doelpunten-per-kwartier')).toContain('Gebaseerd op 1 gespeelde wedstrijd<')
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
        '<abbr title="Gelijk"><span aria-hidden="true">GL</span><span class="hf-visually-hidden">gelijk</span></abbr>',
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

      expect(card).toContain('G gespeeld, W winst, GL gelijk, V verlies, P punten')
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
        player: 'Proefman',
        playerId: null,
        playerName: null,
        playerPage: null,
        playerSearchTerm: null,
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
      expect(section(await render(), 'hoe-de-wedstrijden-verlopen')).toContain(
        'Gebaseerd op 2 van de 3 gespeelde wedstrijden',
      )
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
      expect(section(await render(), 'hoe-de-wedstrijden-verlopen')).toContain('Gebaseerd op 1 gespeelde wedstrijd<')
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
      expect(card).not.toContain('Gebaseerd op')
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
        expect.stringMatching(/^Grootste overwinning .*Testdorp FC.* thuis 2–0 2 tegen 0$/),
        expect.stringMatching(/^Meeste doelpunten .*Voorbeeld United.* uit 2–2 2 tegen 2$/),
        expect.stringMatching(/^Vroegste doelpunt · minuut 34 · Proefman .*Testdorp FC · thuis 2–0 2 tegen 0$/),
        expect.stringMatching(/^Laatste doelpunt · minuut 63 · Kopie .*Voorbeeld United · uit 2–2 2 tegen 2$/),
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
                    player: 'Teststraat',
                    playerId: null,
                    playerName: null,
                    playerPage: null,
                    playerSearchTerm: null,
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
        expect.stringMatching(/^Grootste nederlaag .*Oud Resultaat.* thuis 1–5 1 tegen 5$/),
        expect.stringMatching(/^Meeste doelpunten .*Oud Resultaat/),
        expect.stringMatching(/^Vroegste doelpunt · minuut 34 · Proefman /),
        expect.stringMatching(/^Laatste doelpunt · minuut 90\+4 · Teststraat \(eigen doelpunt\) .*Oud Resultaat/),
      ])
    })

    it('says what it is based on: every played match for the score, and the matches with goals for the two goals', async () => {
      const card = section(await render(eredivisie), 'uitersten')

      expect(card).toContain('<p class="hf-meta">Gebaseerd op alle 3 gespeelde wedstrijden</p>')
      expect(card).toContain(
        '<p class="hf-meta">Vroegste en laatste doelpunt: gebaseerd op 2 van de 3 gespeelde wedstrijden</p>',
      )
    })

    it('says one line when every played match has its goals, and one match in the singular', async () => {
      const withGoals = matchData.matches.filter((match) => match.goals.length > 0)

      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: withGoals })

      const all = section(await render(eredivisie), 'uitersten')

      expect(all).toContain('Gebaseerd op alle 2 gespeelde wedstrijden')
      expect(all).not.toContain('Het vroegste en het laatste doelpunt')

      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: withGoals.slice(0, 1) })

      const one = section(await render(eredivisie), 'uitersten')

      expect(one).toContain('Gebaseerd op 1 gespeelde wedstrijd<')
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
      expect(card).toContain('Gebaseerd op alle 3 gespeelde wedstrijden')
    })

    it('says so in a sentence, with no list, when there is no played match of the Eredivisie', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.filter((match) => match.competition === 'KNVB Beker' || match.status !== 'played'),
      })

      const card = section(await render(eredivisie), 'uitersten')

      expect(card).toContain('We hebben nog geen uitslagen van dit seizoen.')
      expect(card).not.toContain('<ul')
      expect(card).not.toContain('Gebaseerd op')
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

  describe('our place in the league', () => {
    const card = async () => section(await render(), 'onze-plek-in-de-competitie')
    const rows = (html: string) =>
      [...html.matchAll(/<tr><th scope="row">([^<]*)<\/th><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><\/tr>/g)].map(
        ([, measure, place, value]) => [measure, place, value],
      )
    const withStandings = (standings: typeof matchData.standings) =>
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, standings })
    const club = (position: number, name: string, played: number, points: number) => ({
      ...matchData.standings[0]!,
      club: name,
      played,
      points,
      position,
    })

    it('has a table with a caption for a screen reader, the columns place and value, and a row for each of the five measures', async () => {
      const html = await card()

      expect(html).toContain(
        '<caption class="hf-visually-hidden">De plek van sc Heerenveen in de Eredivisie, per onderdeel</caption>',
      )
      expect([...html.matchAll(/<th[^>]*scope="col"[^>]*>([^<]*)<\/th>/g)].map((match) => match[1])).toEqual([
        'Onderdeel',
        'Plaats',
        'Waarde',
      ])
      expect(rows(html)).toEqual([
        ['Punten per wedstrijd', '1e', '3,00'],
        ['Gewonnen wedstrijden', '1e', '2'],
        ['Beste aanval, doelpunten voor', '2e', '3'],
        ['Beste verdediging, doelpunten tegen', '1e', '0'],
        ['Doelsaldo', '1e', '+3'],
      ])
    })

    it('says a place is shared, with the points per match to two digits and a comma', async () => {
      withStandings([club(1, 'Een', 3, 5), club(2, 'sc Heerenveen', 3, 5), club(3, 'Drie', 4, 7)])

      expect(rows(await card())[0]).toEqual(['Punten per wedstrijd', 'gedeeld 2e', '1,67'])
    })

    it('says how many points sc Heerenveen is behind the leader and ahead of the last', async () => {
      withStandings([club(1, 'Een', 3, 9), club(2, 'sc Heerenveen', 3, 5), club(3, 'Drie', 3, 1)])

      const html = await card()

      expect(html).toContain('sc Heerenveen staat 4 punten achter de koploper, Een.')
      expect(html).toContain('sc Heerenveen staat 4 punten voor op de laatste, Drie.')
    })

    it('says sc Heerenveen is at the top, and is ahead of the last, when it leads', async () => {
      const html = await card()

      expect(html).toContain('sc Heerenveen staat bovenaan.')
      expect(html).toContain('sc Heerenveen staat 5 punten voor op de laatste, Testdorp FC.')
      expect(html).not.toContain('achter de koploper')
    })

    it('says sc Heerenveen is at the bottom when it is the last', async () => {
      withStandings([club(1, 'Een', 3, 9), club(2, 'sc Heerenveen', 3, 1)])

      const html = await card()

      expect(html).toContain('sc Heerenveen staat 8 punten achter de koploper, Een.')
      expect(html).toContain('sc Heerenveen staat onderaan.')
    })

    it('says what it is based on: the matches sc Heerenveen played, in the singular for one', async () => {
      expect(await card()).toContain('Gebaseerd op de stand na 2 wedstrijden van sc Heerenveen')

      withStandings([club(1, 'Een', 1, 3), club(2, 'sc Heerenveen', 1, 1), club(3, 'Drie', 0, 0)])

      const html = await card()

      expect(html).toContain('Gebaseerd op de stand na 1 wedstrijd van sc Heerenveen<')
      expect(rows(html)).toHaveLength(5)
      expect(html).toContain('sc Heerenveen staat 2 punten achter de koploper, Een.')
      expect(html).toContain('sc Heerenveen staat onderaan.')
    })

    it('says there is no table yet, as the card with the table does, and gives no button for an image', async () => {
      withStandings([])

      const html = await render()

      expect(section(html, 'onze-plek-in-de-competitie')).toContain(
        'We hebben de stand nog niet gevonden. Kijk straks nog eens.',
      )
      expect(section(html, 'onze-plek-in-de-competitie')).not.toContain('<table')
      expect(html).not.toMatch(
        /<section class="[^"]*hf-card-shareable[^"]*" aria-labelledby="onze-plek-in-de-competitie"/,
      )
    })

    it('says so when sc Heerenveen has played nothing yet, or is not in the table', async () => {
      withStandings([club(1, 'Een', 1, 3), { ...club(2, 'sc Heerenveen', 0, 0) }])

      expect(await card()).toContain('We hebben de plek van sc Heerenveen in de stand nog niet. Kijk straks nog eens.')

      withStandings([club(1, 'Een', 1, 3)])

      expect(await card()).toContain('We hebben de plek van sc Heerenveen in de stand nog niet.')
    })
  })

  describe('the goal scorers', () => {
    const topScorers = async () => section(await render(), 'doelpuntenmakers')
    /** The text of some HTML, as a screen reader and a copy have it. */
    const plain = (html: string | undefined) => (html ?? '').replaceAll(/<[^>]*>/g, '')

    it('is a table with a caption for a screen reader, in the card under the table', async () => {
      const card = await topScorers()

      expect(card).toContain(
        '<caption class="hf-visually-hidden">Doelpuntenmakers van sc Heerenveen in het seizoen 2026/27, in de Eredivisie en de KNVB Beker</caption>',
      )
      expect(card.match(/<table/g)).toHaveLength(1)
      expect(card.match(/<th [^>]*scope="col"/g)).toHaveLength(3)
      expect(card).toContain('<abbr title="Doelpunten"><span aria-hidden="true">D</span>')
      expect(card).toContain('<p class="hf-meta hf-bar-legend"><b>D</b> doelpunten</p>')
    })

    it('counts the goals of our players over the matches, with the opponent with the same name left out', async () => {
      const rows = [
        ...(await topScorers()).matchAll(/<tr><td[^>]*>(\d+)<\/td><th scope="row">(.+?)<\/th><td[^>]*>(\d+)/g),
      ]

      // Proefman scored in two matches. The Nepper of the opponent does not count for ours.
      expect(rows.map(([, position, player, goals]) => [position, plain(player), goals])).toEqual([
        ['1', 'Proefman', '2'],
        ['2', 'Kopie', '1'],
        ['2', 'Nepper', '1'],
      ])
    })

    it('shows the full name of a player the goals are linked to, and two players with the same surname as two rows', async () => {
      const played = matchData.matches.find((item) => item.status === 'played')!
      const goal = (id: number, name: string, minute: number) => ({
        minute,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: 'Jansen',
        playerId: id,
        playerName: name,
        playerPage: null,
        playerSearchTerm: 'Jansen',
        stoppageMinutes: null,
      })

      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: [
          {
            ...played,
            goals: [goal(1, 'Bram Jansen', 10), goal(2, 'Kees Jansen', 20), goal(2, 'Kees Jansen', 30)],
            goalsAgainst: 0,
            goalsFor: 3,
          },
        ],
      })

      const rows = [
        ...(await topScorers()).matchAll(/<tr><td[^>]*>(\d+)<\/td><th scope="row">(.+?)<\/th><td[^>]*>(\d+)/g),
      ]

      expect(rows.map(([, position, player, goals]) => [position, plain(player), goals])).toEqual([
        ['1', 'Kees Jansen', '2'],
        ['2', 'Bram Jansen', '1'],
      ])
      // The given name is plain and the surname heavier, in one name.
      expect(await topScorers()).toContain(
        '<span class="hf-player-name"><span class="hf-player-name-given">Kees</span> <span class="hf-player-name-surname">Jansen</span></span>',
      )
    })

    it('shows the full name from the Wikipedia page for goals without a linked player, and counts them together', async () => {
      const played = matchData.matches.find((item) => item.status === 'played')!
      const goal = (shown: string, page: null | string, minute: number) => ({
        minute,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: shown,
        playerId: null,
        playerName: null,
        playerPage: page,
        playerSearchTerm: null,
        stoppageMinutes: null,
      })

      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: [
          {
            ...played,
            goals: [
              goal('Kemper', 'Boy Kemper', 10),
              goal('Kemper', 'Boy Kemper', 20),
              goal('Van Bergen', 'Mitchell van Bergen (voetballer, 1999)', 30),
              goal('Proefman', null, 40),
            ],
            goalsAgainst: 0,
            goalsFor: 4,
          },
        ],
      })

      const card = await topScorers()
      const rows = [...card.matchAll(/<tr><td[^>]*>(\d+)<\/td><th scope="row">(.+?)<\/th><td[^>]*>(\d+)/g)]

      expect(rows.map(([, position, player, goals]) => [position, plain(player), goals])).toEqual([
        ['1', 'Boy Kemper', '2'],
        ['2', 'Proefman', '1'],
        ['2', 'Mitchell van Bergen', '1'],
      ])
      expect(card).toContain(
        '<span class="hf-player-name"><span class="hf-player-name-given">Boy</span> <span class="hf-player-name-surname">Kemper</span></span>',
      )
    })

    it('shows a bar next to the goals of every player, hidden from a screen reader, the top scorer filling it', async () => {
      const card = await topScorers()

      expect(card.match(/class="hf-bar" style="--hf-bar-share:[\d.]+"/g)).toHaveLength(3)
      expect(card).toContain('style="--hf-bar-share:100"')
      expect(card).toContain('style="--hf-bar-share:50"')
      expect(card.match(/aria-hidden="true" class="hf-bar"/g)).toHaveLength(3)
    })

    it('says in a line directly under the heading, above the table, how many players scored, as the clean sheets do', async () => {
      const card = await topScorers()

      expect(card).toContain(
        '</h2><div class="hf-card-share" data-hf-card-share=""></div><p>3 spelers hebben gescoord</p><div class="hf-top-scorers',
      )
      expect(card.indexOf('3 spelers hebben gescoord')).toBeLessThan(card.indexOf('<table'))
      expect(card.split('</table>')[1]).not.toContain('spelers hebben gescoord')
    })

    it('has the heading "Doelpuntenmakers" with the old anchor "topscorers" on it, and nothing called Topscorers', async () => {
      const card = await topScorers()

      expect(card).toContain('<span class="hf-heading-alias" id="topscorers"></span>')
      expect(card).toContain('href="#doelpuntenmakers">Doelpuntenmakers</a>')
      expect(card).not.toContain('Topscorers')
      expect((await render()).match(/id="topscorers"/g)).toHaveLength(1)
    })

    it('says "1 speler heeft gescoord" for one player', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((item) => ({
          ...item,
          goals: item.goals.filter((goal) => goal.player === 'Proefman'),
        })),
      })

      expect(await topScorers()).toContain('<p>1 speler heeft gescoord</p>')
    })

    /** One match in which each player scored the number of goals given, as made-up players. */
    const withScorers = (counts: number[]) => {
      const played = matchData.matches.find((item) => item.status === 'played')!
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

      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: [{ ...played, goals, goalsAgainst: 0, goalsFor: goals.length }],
      })
    }

    const rowsOf = (card: string) =>
      [...card.matchAll(/<tr><td[^>]*>(\d+)<\/td><th scope="row">(.+?)<\/th><td[^>]*>(\d+)/g)].map(
        ([, position, player, goals]) => [position, plain(player), goals],
      )

    it('shows the first five places only, and says it is the top 5 of how many players scored', async () => {
      withScorers([9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1])

      const card = await topScorers()

      expect(rowsOf(card)).toEqual([
        ['1', 'Speler A', '9'],
        ['2', 'Speler B', '8'],
        ['3', 'Speler C', '7'],
        ['4', 'Speler D', '6'],
        ['5', 'Speler E', '5'],
      ])
      expect(card).toContain('<p>De top 5 van 14 spelers die scoorden</p>')
      expect(card).toContain(
        '<caption class="hf-visually-hidden">De top 5 van de doelpuntenmakers van sc Heerenveen in het seizoen 2026/27, in de Eredivisie</caption>',
      )
      expect(card).not.toContain('14 spelers hebben gescoord')
    })

    it('shows all the players who share fifth place, so it has more than five names', async () => {
      withScorers([9, 8, 7, 6, 2, 2, 2, 1])

      const card = await topScorers()

      expect(rowsOf(card)).toEqual([
        ['1', 'Speler A', '9'],
        ['2', 'Speler B', '8'],
        ['3', 'Speler C', '7'],
        ['4', 'Speler D', '6'],
        ['5', 'Speler E', '2'],
        ['5', 'Speler F', '2'],
        ['5', 'Speler G', '2'],
      ])
      expect(card).toContain('<p>De top 5 van 8 spelers die scoorden</p>')
    })

    it('shows all of them, and counts the players, when nobody is left out', async () => {
      withScorers([3, 2, 1, 1, 1])

      const card = await topScorers()

      expect(rowsOf(card)).toHaveLength(5)
      expect(card).toContain('<p>5 spelers hebben gescoord</p>')
      expect(card).not.toContain('De top 5')
    })

    it('shows everybody when they all share the first place, however many that is', async () => {
      withScorers(Array.from({ length: 14 }, () => 1))

      const card = await topScorers()

      expect(rowsOf(card)).toHaveLength(14)
      expect(rowsOf(card).every(([position]) => position === '1')).toBe(true)
      expect(card).toContain('14 spelers hebben gescoord')
    })

    it('has the link "Alle doelpuntenmakers" to the page Spelers under the list', async () => {
      const card = await topScorers()

      expect(card).toContain('<p><a href="/statistieken/spelers">Alle doelpuntenmakers</a></p>')
      expect(card.indexOf('Alle doelpuntenmakers')).toBeGreaterThan(card.indexOf('</table>'))
      expect(card.match(/<a /g)).toHaveLength(2)
    })

    it('has the link also when everybody is shown, and none when nobody scored', async () => {
      expect(await topScorers()).toContain('Alle doelpuntenmakers')

      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((item) => ({ ...item, goals: [] })),
      })

      expect(await topScorers()).not.toContain('Alle doelpuntenmakers')
    })

    it('says which part of the played matches the list is based on, when scorers are missing', async () => {
      expect(await topScorers()).toContain('Gebaseerd op de doelpuntenmakers van 2 van de 4 gespeelde wedstrijden')
    })

    it('leaves that line out when every played match has its scorers', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.filter((item) => item.goals.length > 0),
      })

      expect(await topScorers()).not.toContain('Gebaseerd op')
    })

    it('says there are no scorers yet in a sentence, and shows no table, when there is no goal', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((item) => ({ ...item, goals: [] })),
      })

      const card = await topScorers()

      expect(card).toContain('We hebben nog geen doelpuntenmakers van dit seizoen. Kijk straks nog eens.')
      expect(card).not.toContain('<table')
      expect(card).not.toContain('Gebaseerd op')
    })

    it('has no link or request to another site', async () => {
      // The link of the heading to itself and the link to the page Spelers are not one of them.
      const withoutOurLinks = (await topScorers())
        .replace(/<a class="hf-heading-link" href="#doelpuntenmakers">/, '')
        .replace(/<a [^>]*href="\/statistieken\/spelers"[^>]*>/, '')

      expect(withoutOurLinks).not.toMatch(/https?:|<a |<img|src=/)
    })
  })

  it('has one credit under the page, for the three pages, with the time of the last reading', async () => {
    const html = await render()

    expect(html.match(/class="hf-meta hf-wikipedia-credit"/g)).toHaveLength(1)
    expect(html).toContain('Bron: Wikipedia (')
    expect(html).toContain('href="https://nl.wikipedia.org/wiki/Eredivisie_2026/27_(mannenvoetbal)"')
    expect(html).toContain('href="https://nl.wikipedia.org/wiki/KNVB_Beker_2026/27_(mannen)"')
    expect(html).toContain('<time dateTime="2026-10-23T12:05:00.000Z">23 oktober 2026 om 14:05</time>')
    expect(html.lastIndexOf('hf-wikipedia-credit')).toBeGreaterThan(html.lastIndexOf('</table>'))
    // Last in the sidebar, so on a phone it follows the results and not the programme.
    expect(html.lastIndexOf('hf-wikipedia-credit')).toBeGreaterThan(html.indexOf('id="uitslagen"'))
    expect(html.match(/<aside.*<\/aside>/s)?.[0]).toContain('hf-wikipedia-credit')
  })

  it('puts the credit in a card without a border or background to see, and links to no history', async () => {
    const html = await render()

    expect(html).toMatch(/<div class="hf-card hf-card-transparent"><p class="hf-meta hf-wikipedia-credit"/)
    expect(html).not.toContain('action=history')
    expect(html).not.toContain('geschiedenis')
  })

  it('has no link to another site except in the credit, and loads nothing from another domain', async () => {
    const html = await render()
    const outside = html.replace(/<p class="hf-meta hf-wikipedia-credit".*?<\/p>/s, '')

    expect(outside).not.toMatch(/https?:\/\//u)
    expect(html).not.toMatch(/<(?:img|script|iframe|link)\b/u)
  })

  it('says in a sentence for visitors that there is nothing yet when the importer has not run', async () => {
    vi.mocked(getMatchData).mockResolvedValue({ coaches: [], matches: [], pages: [], season: '2026/27', standings: [] })

    const html = await render()

    expect(html).toContain('We hebben de stand nog niet gevonden. Kijk straks nog eens.')
    expect(html).toContain('We hebben nog geen doelpuntenmakers van dit seizoen. Kijk straks nog eens.')
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
    expect(html).toContain('<a href="/statistieken">Probeer het opnieuw</a>')
    expect(error).toHaveBeenCalledWith(
      'Could not read the matches and the table for /statistieken: Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)',
    )
    expect(await generateMetadata()).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })

  it('has a title of its own, a description and the canonical link', async () => {
    const metadata = await generateMetadata()

    expect(metadata.title).toBe('Statistieken')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/statistieken')
    expect(metadata.description).toContain('cijfers')
  })
})

describe('the season picker on /statistieken', () => {
  beforeEach(() => {
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26'])
  })

  it('asks for the current season', async () => {
    await render()

    expect(getMatchData).toHaveBeenCalledExactlyOnceWith('2026/27')
  })

  it('has the picker next to the heading, with the current season chosen and the earlier seasons after it', async () => {
    const html = await render()

    expect(html).toMatch(
      /<div class="hf-page-title"><h1 class="hf-heading-1">Statistieken<\/h1><form [^>]*aria-label="Seizoen kiezen"/,
    )
    expect(html).toContain(
      '<option value="2026-27" selected="">2026/27</option><option value="2025-26">2025/26</option>',
    )
    expect(html).toContain('action="/statistieken/kies"')
  })

  it('keeps the images as they were, without a season on them', async () => {
    expect(await render()).not.toContain('Seizoen 2026/27 ·')
  })

  it('has no picker when the current season is the only one, and keeps the heading', async () => {
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27'])

    const html = await render()

    expect(html).not.toContain('<select')
    expect(html).not.toContain('Seizoen kiezen')
    expect(html).toContain('<h1 class="hf-heading-1">Statistieken</h1>')
  })

  it('has the bar of the page and the picker agree: a link for every card the page has', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2[^>]*\sid="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(statisticsShortcuts.map(({ href }) => href)).toEqual(ids)
  })
})

describe('the choice between all the matches and the Eredivisie on /statistieken', () => {
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

  it('has a switch of two links in the title row, with the choice that the address asks for marked', async () => {
    const all = await render()
    const league = await render(eredivisie)

    expect(switchOf(all)).toBe(
      '<div aria-label="Welke wedstrijden" class="hf-segmented-control" role="group"><a aria-current="page" href="/statistieken">Alle wedstrijden</a><a href="/statistieken?competitie=eredivisie">Eredivisie</a></div>',
    )
    expect(switchOf(league)).toBe(
      '<div aria-label="Welke wedstrijden" class="hf-segmented-control" role="group"><a href="/statistieken">Alle wedstrijden</a><a aria-current="page" href="/statistieken?competitie=eredivisie">Eredivisie</a></div>',
    )
    expect(all.match(/aria-current/g)).toHaveLength(1)
  })

  it('puts the switch in a plain cell, the first of the main column, right under the title row', async () => {
    const html = await render()
    const main = /<main class="hf-page-main">(.*?)<\/main>/s.exec(html)?.[1] ?? ''
    const cells = /<div class="hf-page-cells">(.*)/s.exec(main)?.[1] ?? ''

    // The title row is the introduction, and the switch the first child of the cells under it.
    expect(main).toMatch(
      /^<div class="hf-page-intro"><div class="hf-page-title">.*?<\/div><\/div><div class="hf-page-cells"><div aria-label="Welke wedstrijden"/s,
    )
    expect(cells.startsWith('<div aria-label="Welke wedstrijden" class="hf-segmented-control" role="group">')).toBe(
      true,
    )
    // It is no card and has no card around it, and it comes before the cards it controls.
    expect(main.indexOf('Welke wedstrijden')).toBeLessThan(main.indexOf('id="reeksen"'))
    expect(html.indexOf('Welke wedstrijden')).toBeLessThan(html.indexOf('id="doelpuntenmakers"'))
    expect(html).not.toMatch(/<section[^>]*>(?:(?!<\/section>).)*Welke wedstrijden/s)
    expect(html.match(/hf-page-title">.*?<\/div><\/div>/s)?.[0]).not.toContain('hf-segmented-control')
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
    expect(section(html, 'thuis-en-uit')).toContain('Gebaseerd op alle 4 gespeelde wedstrijden')
    expect(section(html, 'de-nul-gehouden')).toContain('SV Proefdorp')
  })

  it('counts the Eredivisie alone with ?competitie=eredivisie: no cup tie in the cards that follow the switch', async () => {
    const html = await render(eredivisie)

    expect(section(html, 'reeksen')).not.toContain('SV Proefdorp')
    expect(section(html, 'reeksen')).toContain('De reeksen van sc Heerenveen in de Eredivisie dit seizoen')
    expect(section(html, 'thuis-en-uit')).toContain('Gebaseerd op alle 3 gespeelde wedstrijden')
    expect(section(html, 'de-nul-gehouden')).not.toContain('SV Proefdorp')
    expect(section(html, 'de-nul-gehouden')).toContain('1 keer de nul gehouden in 3 wedstrijden')
  })

  it('counts a season without a cup tie the same for both choices, in every card', async () => {
    withoutCup()

    const all = await render()
    const league = await render(eredivisie)

    // Only the links carry the choice, which is the same page.
    for (const id of statisticsShortcuts.map(({ href }) => href.slice(1))) {
      expect(section(all, id), id).toBe(section(league, id).replaceAll('?competitie=eredivisie', ''))
    }
  })

  it('keeps our place in the league, the season and how the matches go on the Eredivisie, whatever the choice', async () => {
    const all = await render()
    const league = await render(eredivisie)

    for (const id of ['onze-plek-in-de-competitie', 'verloop-van-het-seizoen', 'hoe-de-wedstrijden-verlopen']) {
      expect(section(all, id), id).toBe(section(league, id))
      expect(section(all, id), id).not.toContain('SV Proefdorp')
    }
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
    for (const competitie of ['Eredivisie', 'alle', 'beker', '', ['eredivisie', 'eredivisie'], ['eredivisie']]) {
      expect(await digestOf(render({ competitie })), JSON.stringify(competitie)).toContain('404')
    }
  })

  it('keeps the choice in the link to Spelers, in the season picker and in the button of the clean sheets', async () => {
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

    expect(league).toContain('href="/statistieken/spelers?competitie=eredivisie"')
    expect(hidden(league)).toHaveLength(2)
    expect(hidden(league).join('')).toMatch(/name="competitie"/)
    expect(hidden(league).join('')).toMatch(/value="eredivisie"/)
    expect(section(league, 'de-nul-gehouden')).toMatch(/<input [^>]*name="competitie"[^>]*value="eredivisie"/)
    expect(league).toMatch(/<form [^>]*aria-label="Seizoen kiezen"[^>]*>(<input [^>]*name="competitie"[^>]*>)/)
    expect(all).toContain('href="/statistieken/spelers"')
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
