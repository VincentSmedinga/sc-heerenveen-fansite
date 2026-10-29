import type { PublicMatch } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData } from '../../matches'
import { matchShortcuts } from '../../matchShortcuts'
import { matchData } from '../../test-matches'
import { withoutIcons } from '../../without-icons'
import MatchesPage, { generateMetadata } from './page'

// Only the query is replaced: the split into the programme and the results is the real one.
vi.mock('../../matches', async (importOriginal) => ({ ...(await importOriginal<object>()), getMatchData: vi.fn() }))

// The afternoon of Friday 23 October 2026 in the Netherlands.
const now = new Date('2026-10-23T13:40:00Z')

async function render(searchParams: Record<string, string | string[] | undefined> = {}) {
  return withoutIcons(renderToStaticMarkup(await MatchesPage({ searchParams: Promise.resolve(searchParams) })))
}

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
  vi.mocked(getMatchData).mockResolvedValue(matchData)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page /wedstrijden', () => {
  it('has one h1 and nine h2 headings in order: the programme, the results, the table, the season, the streaks, the goal scorers, the clean sheets, the goals per quarter and how the matches go', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Wedstrijden</h1>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="programma"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#programma">Programma</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="uitslagen"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#uitslagen">Uitslagen</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="stand"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#stand">Stand</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="verloop-van-het-seizoen"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#verloop-van-het-seizoen">Verloop van het seizoen</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="reeksen"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#reeksen">Reeksen</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="doelpuntenmakers"><span class="hf-heading-target"></span><span class="hf-heading-alias" id="topscorers"></span><a class="hf-heading-link" href="#doelpuntenmakers">Doelpuntenmakers</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="de-nul-gehouden"><span class="hf-heading-target"></span><span class="hf-heading-alias" id="nul-gehouden"></span><a class="hf-heading-link" href="#de-nul-gehouden">De nul gehouden</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="doelpunten-per-kwartier"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#doelpunten-per-kwartier">Doelpunten per kwartier</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="hoe-de-wedstrijden-verlopen"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#hoe-de-wedstrijden-verlopen">Hoe de wedstrijden verlopen</a></h2>',
    ])
  })

  it('has a heading for every link of the bar under the header, with the id the link goes to, in the same order', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2 [^>]*id="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(matchShortcuts.map((item) => item.href)).toEqual(ids)
  })

  it('has the programme and the results in the main with the h1, and the table, the season, the streaks, the goal scorers, the clean sheets, the goals per quarter and how the matches go in a named, wide sidebar after it', async () => {
    const html = await render()
    const main = html.match(/<main[^>]*>.*<\/main>/s)?.[0] ?? ''
    const sidebar = html.match(/<aside[^>]*>.*<\/aside>/s)?.[0] ?? ''

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(sidebar).toMatch(
      /^<aside class="hf-page-sidebar hf-page-sidebar-wide" aria-label="De stand, de ranglijsten en de doelpunten per kwartier">/,
    )
    expect(main.match(/<h1/g)).toHaveLength(1)
    expect(main).toContain('id="programma"')
    expect(main.indexOf('id="programma"')).toBeLessThan(main.indexOf('id="uitslagen"'))
    expect(main).not.toContain('id="stand"')
    expect(main).not.toContain('id="verloop-van-het-seizoen"')
    expect(main).not.toContain('id="reeksen"')
    expect(main).not.toContain('id="doelpunten-per-kwartier"')
    expect(sidebar).not.toContain('id="uitslagen"')
    expect(sidebar.indexOf('id="stand"')).toBeLessThan(sidebar.indexOf('id="verloop-van-het-seizoen"'))
    expect(sidebar.indexOf('id="verloop-van-het-seizoen"')).toBeLessThan(sidebar.indexOf('id="reeksen"'))
    expect(sidebar.indexOf('id="reeksen"')).toBeLessThan(sidebar.indexOf('id="doelpuntenmakers"'))
    expect(sidebar.indexOf('id="doelpuntenmakers"')).toBeLessThan(sidebar.indexOf('id="de-nul-gehouden"'))
    expect(sidebar.indexOf('id="de-nul-gehouden"')).toBeLessThan(sidebar.indexOf('id="doelpunten-per-kwartier"'))
    expect(sidebar.indexOf('id="doelpunten-per-kwartier"')).toBeLessThan(
      sidebar.indexOf('id="hoe-de-wedstrijden-verlopen"'),
    )
    expect(main).not.toContain('id="hoe-de-wedstrijden-verlopen"')
    expect(main).not.toContain('id="doelpuntenmakers"')
    expect(sidebar).not.toContain('<h1')
    expect(sidebar).not.toContain('id="programma"')
  })

  it('has no order or style attribute but the length of a bar and the place of a label or a bar of a chart, so the order on a phone is the order in the source', async () => {
    expect(await render()).not.toMatch(
      / style="(?!--hf-bar-share:[\d.]+"|--hf-donut-cos:|--hf-bar-chart-(?:slots|at|share|across):[\d.]+")|order:/,
    )
  })

  it('names each card by its h2, so the links with a hash on the homepage have a target', async () => {
    const html = await render()

    for (const id of [
      'programma',
      'doelpunten-per-kwartier',
      'uitslagen',
      'stand',
      'verloop-van-het-seizoen',
      'reeksen',
      'doelpuntenmakers',
      'de-nul-gehouden',
      'hoe-de-wedstrijden-verlopen',
    ]) {
      expect(html).toMatch(new RegExp(`<section class="hf-card[ a-z-]*" aria-labelledby="${id}">`))
    }
  })

  it('gives the programme and the results the white surface, the table, the streaks, the goal scorers, the clean sheets and how the matches go the soft one, and the season and the goals per quarter the warm one', async () => {
    const html = await render()

    for (const [id, surface] of [
      ['programma', 'hf-card'],
      ['uitslagen', 'hf-card'],
      ['stand', 'hf-card hf-card-soft hf-card-shareable'],
      ['doelpuntenmakers', 'hf-card hf-card-soft hf-card-shareable'],
      ['de-nul-gehouden', 'hf-card hf-card-soft hf-card-shareable'],
      ['verloop-van-het-seizoen', 'hf-card hf-card-warm hf-card-shareable'],
      ['reeksen', 'hf-card hf-card-soft hf-card-shareable'],
      ['doelpunten-per-kwartier', 'hf-card hf-card-warm hf-card-shareable'],
      ['hoe-de-wedstrijden-verlopen', 'hf-card hf-card-soft hf-card-shareable'],
    ] as const) {
      expect(html).toContain(`<section class="${surface}" aria-labelledby="${id}">`)
    }
  })

  it('lets the visitor make an image of the seven cards with statistics, and of no other card', async () => {
    const html = await render()
    const shareable = [...html.matchAll(/<section class="[^"]*hf-card-shareable[^"]*" aria-labelledby="([^"]+)"/g)].map(
      ([, id]) => id,
    )

    expect(shareable).toEqual([
      'stand',
      'verloop-van-het-seizoen',
      'reeksen',
      'doelpuntenmakers',
      'de-nul-gehouden',
      'doelpunten-per-kwartier',
      'hoe-de-wedstrijden-verlopen',
    ])
    expect(html.match(/data-hf-card-share/g)).toHaveLength(7)
    for (const id of ['programma', 'uitslagen']) {
      expect(html).toContain(`<section class="hf-card" aria-labelledby="${id}">`)
    }
  })

  it('has no button for an image on a card that has no facts yet', async () => {
    vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [], standings: [] })

    expect(await render()).not.toContain('hf-card-shareable')
  })

  it('shows every match still to come in the programme, in order, a postponed one and a weekend included', async () => {
    const programme = section(await render(), 'programma')

    expect(programme.match(/class="hf-match"/g)).toHaveLength(3)
    expect(programme.indexOf('Speelronde 5')).toBeLessThan(programme.indexOf('Speelronde 10'))
    expect(programme.indexOf('Speelronde 10')).toBeLessThan(programme.indexOf('Speelronde 22'))
    expect(programme).toContain('Uitgesteld')
    expect(programme).toContain('wo 28 okt 19:45')
    expect(programme).toContain('weekend 12–14 februari')
    expect(programme).not.toContain('Speelronde 9')
  })

  it('shows the results with the newest first, with the day', async () => {
    const results = section(await render(), 'uitslagen')

    expect(results.match(/class="hf-match"/g)).toHaveLength(4)
    expect(results.indexOf('Tweede ronde')).toBeLessThan(results.indexOf('Speelronde 9'))
    expect(results.indexOf('Speelronde 9')).toBeLessThan(results.indexOf('Speelronde 8'))
    expect(results.indexOf('Speelronde 8')).toBeLessThan(results.indexOf('Speelronde 7'))
    expect(results).toContain('zo 11 okt')
    expect(results).toContain('2–0')
  })

  describe('a cup tie after extra time or penalties', () => {
    const tie = {
      ...matchData.matches[3]!,
      competition: 'KNVB Beker',
      extraTime: true,
      goalsAgainst: 1,
      goalsFor: 1,
      penaltiesAgainst: 3,
      penaltiesFor: 4,
    } as const

    it('shows the shoot-out and says in words what the abbreviations are, under the results', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [...matchData.matches, tie] })

      const results = section(await render(), 'uitslagen')

      expect(results).toContain('(3–4 <abbr title="Na strafschoppen">n.s.</abbr>)')
      expect(results).toContain('1 tegen 1, na strafschoppen 3 tegen 4')
      expect(results).toContain('n.s. na strafschoppen')
      expect(results).not.toContain('n.v. na verlenging')
    })

    it('names only the abbreviations a line uses', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: [...matchData.matches, { ...tie, penaltiesAgainst: null, penaltiesFor: null, round: 'Derde ronde' }],
      })

      const results = section(await render(), 'uitslagen')

      expect(results).toContain('<abbr title="Na verlenging">n.v.</abbr>')
      expect(results).toContain('n.v. na verlenging')
      expect(results).not.toContain('n.s.')
    })

    it('has no abbreviations and no explanation when no line needs them', async () => {
      const results = section(await render(), 'uitslagen')

      expect(results).not.toContain('<abbr')
      expect(results).not.toContain('na verlenging')
      expect(results).not.toContain('na strafschoppen')
    })
  })

  describe('the goal scorers', () => {
    const flagged: PublicMatch = {
      ...matchData.matches[3]!,
      goals: [
        {
          minute: 7,
          ours: false,
          ownGoal: true,
          penalty: false,
          player: 'Klaverboer',
          playerId: null,
          playerName: null,
          playerSearchTerm: null,
          stoppageMinutes: null,
        },
        {
          minute: 90,
          ours: true,
          ownGoal: false,
          penalty: true,
          player: 'Vente',
          playerId: null,
          playerName: null,
          playerSearchTerm: null,
          stoppageMinutes: 5,
        },
      ],
      goalsAgainst: 1,
      goalsFor: 1,
      round: 'Derde ronde',
    }

    it('shows the scorers of a played match on one line, with the club for a screen reader', async () => {
      const results = section(await render(), 'uitslagen')

      expect(results.match(/class="hf-match-goals"/g)).toHaveLength(2)
      expect(results).toContain('12’')
      expect(results).toContain('Teststraat')
      expect(results).toContain('minuut 90 plus 3, ')
      expect(results).toContain(', Voorbeeld United')
      expect(results).toContain(', sc Heerenveen')
    })

    it('shows no line for a match without scorers, and none for a match still to come', async () => {
      const html = await render()

      expect(html.match(/class="hf-match-goals"/g)).toHaveLength(2)
      expect(section(html, 'programma')).not.toContain('hf-match-goals')
    })

    it('names the abbreviations of an own goal and a penalty under the results, and only those', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [...matchData.matches, flagged] })

      const results = section(await render(), 'uitslagen')

      expect(results).toContain('<abbr title="Eigen doelpunt">e.d.</abbr>')
      expect(results).toContain('<abbr title="Penalty">pen.</abbr>')
      expect(results).toContain('e.d. eigen doelpunt, pen. penalty')

      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: [...matchData.matches, { ...flagged, goals: flagged.goals.slice(0, 1) }],
      })

      const own = section(await render(), 'uitslagen')

      expect(own).toContain('e.d. eigen doelpunt')
      expect(own).not.toContain('pen. penalty')
    })

    it('has no explanation of abbreviations when no line uses them', async () => {
      const results = section(await render(), 'uitslagen')

      expect(results).not.toContain('eigen doelpunt')
      expect(results).not.toContain('penalty')
    })

    it('shows names as text', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: [
          ...matchData.matches,
          {
            ...flagged,
            goals: [
              {
                minute: 9,
                ours: true,
                ownGoal: false,
                penalty: false,
                player: '<img src=x onerror=alert(1)>',
                playerId: null,
                playerName: null,
                playerSearchTerm: null,
                stoppageMinutes: null,
              },
            ],
          },
        ],
      })

      const results = section(await render(), 'uitslagen')

      expect(results).toContain('&lt;img src=x onerror=alert(1)&gt;')
      expect(results).not.toContain('<img')
    })
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
      expect(sheets).toContain('action="/wedstrijden#nul-11"')
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
      expect(sheets).toContain('action="/wedstrijden#nul-16"')
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

    it('is a card in the sidebar directly under the table, before the goal scorers', async () => {
      const html = await render()
      const sidebar = html.match(/<aside[^>]*>.*<\/aside>/s)?.[0] ?? ''

      expect(sidebar.indexOf('id="stand"')).toBeLessThan(sidebar.indexOf('id="verloop-van-het-seizoen"'))
      expect(sidebar.indexOf('id="verloop-van-het-seizoen"')).toBeLessThan(sidebar.indexOf('id="doelpuntenmakers"'))
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

    it('is a card in the sidebar directly after the season, before the goal scorers', async () => {
      const html = await render()
      const sidebar = html.match(/<aside[^>]*>.*<\/aside>/s)?.[0] ?? ''

      expect(sidebar.indexOf('id="verloop-van-het-seizoen"')).toBeLessThan(sidebar.indexOf('id="reeksen"'))
      expect(sidebar.indexOf('id="reeksen"')).toBeLessThan(sidebar.indexOf('id="doelpuntenmakers"'))
      expect(html.match(/<section[^>]*aria-labelledby="reeksen"/g)).toHaveLength(1)
      expect(html.match(/<h2[^>]*id="reeksen"[^>]*>/g)).toHaveLength(1)
    })

    it('shows a table with a row for each of the six streaks, as it stands now and the longest', async () => {
      withSeason(season)

      const card = section(await render(), 'reeksen')

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

      const card = section(await render(), 'reeksen')

      expect(card).not.toContain('SV Proefdorp')
      expect(card).not.toContain('KNVB Beker')
    })

    it('shows the latest five matches, the oldest first, as letters and as lines with the opponent and the score', async () => {
      withSeason(season)

      const card = section(await render(), 'reeksen')
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

      const card = section(await render(), 'reeksen')

      expect(card).toContain('<span aria-hidden="true" class="hf-mark-row-marks">')
      expect(card.match(/<table[^>]*>.*<\/table>/s)?.[0]).not.toContain('aria-hidden')
    })

    it('says on how many matches it is based, and the same with one match', async () => {
      withSeason(season)

      expect(section(await render(), 'reeksen')).toContain('Gebaseerd op alle 6 gespeelde wedstrijden')

      withSeason(season.slice(0, 1))

      const card = section(await render(), 'reeksen')

      expect(card).toContain('Gebaseerd op 1 gespeelde wedstrijd')
      expect(card).not.toContain('alle 1')
    })

    it('shows the matches there are when fewer than five are played', async () => {
      const card = section(await render(), 'reeksen')

      expect(card.match(/class="hf-short-match"/g)).toHaveLength(3)
      expect(card).toContain('Gebaseerd op alle 3 gespeelde wedstrijden')
    })

    it('shows one line, one letter and the table for one played match', async () => {
      withSeason([league(1, 0, 1)])

      const card = section(await render(), 'reeksen')

      expect(card.match(/class="hf-short-match"/g)).toHaveLength(1)
      expect(card.match(/class="hf-mark-row-mark /g)).toHaveLength(1)
      expect(rows(card)).toContainEqual(['Verloren', '1', '1'])
    })

    it('says so in a sentence, with no table or lines, when no match of the Eredivisie is played', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.filter((match) => match.competition !== 'Eredivisie' || match.status !== 'played'),
      })

      const card = section(await render(), 'reeksen')

      expect(card).toContain('We hebben nog geen uitslagen van dit seizoen.')
      expect(card).not.toContain('<table')
      expect(card).not.toContain('hf-short-match')
      expect(card).not.toContain('Gebaseerd op')
      expect(card).not.toContain('hf-card-shareable')
    })

    it('says so in a sentence for a season without matches', async () => {
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [] })

      expect(section(await render(), 'reeksen')).toContain('We hebben nog geen uitslagen van dit seizoen.')
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

    it('explains the abbreviations of the columns in a line under the tables', async () => {
      const card = section(await render(), 'hoe-de-wedstrijden-verlopen')

      expect(card).toContain('G gespeeld, W winst, GL gelijk, V verlies, P punten')
      expect(card.lastIndexOf('</table>')).toBeLessThan(card.indexOf('G gespeeld, W winst'))
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

  it('shows the full table with a caption for a screen reader that says the day, and the row of sc Heerenveen marked', async () => {
    const stand = section(await render(), 'stand')

    expect(stand).toContain('<caption class="hf-visually-hidden">Stand op 18 oktober 2026</caption>')
    expect(stand).not.toContain('role="region"')
    expect(stand).toContain('class="hf-highlight hf-standings-table-own"')
    expect(stand).toContain('<b>G</b> gespeeld')
    expect(stand).toContain('<b>P</b> punten')
    expect(stand.match(/<th scope="col"/g)?.length).toBeGreaterThan(0)
    expect(stand.match(/<tr[ >]/g)).toHaveLength(4)
  })

  it('has the columns position, played and points in the full table, in the headers and in the row of sc Heerenveen', async () => {
    const stand = section(await render(), 'stand')
    const head = stand.slice(stand.indexOf('<thead>'), stand.indexOf('</thead>'))
    const ours = stand.slice(
      stand.indexOf('hf-standings-table-own'),
      stand.indexOf('</tr>', stand.indexOf('hf-standings-table-own')),
    )

    expect([...head.matchAll(/<span aria-hidden="true">([^<]*)<\/span>/g)].map((match) => match[1])).toEqual([
      '#',
      'G',
      'P',
    ])
    // The bar is inside a cell, so the text of a cell is what is left without the tags.
    expect([...ours.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((match) => match[1]?.replaceAll(/<[^>]*>/g, ''))).toEqual([
      '2',
      '2',
      '6',
    ])
    expect(stand).toContain('<span>, <b>P</b> punten</span>')
  })

  it('shows a bar next to the points of every club in the full table, hidden from a screen reader', async () => {
    const stand = section(await render(), 'stand')

    // The leader (sc Heerenveen, with 6 points) has the full bar, a club with 1 point a sixth.
    expect(stand.match(/class="hf-bar" style="--hf-bar-share:[\d.]+"/g)).toHaveLength(3)
    expect(stand).toContain('style="--hf-bar-share:100"')
    expect(stand).toContain('style="--hf-bar-share:16.67"')
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

    it('shows everybody who scored, not only the best five, with level players on one place', async () => {
      const scorers = Array.from({ length: 14 }, (_, index) => ({
        minute: index + 1,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: `Speler ${String.fromCharCode(65 + index)}`,
        playerId: null,
        playerName: null,
        playerSearchTerm: null,
        stoppageMinutes: null,
      }))
      const played = matchData.matches.find((item) => item.status === 'played')!

      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: [{ ...played, goals: scorers, goalsAgainst: 0, goalsFor: 14 }],
      })

      const card = await topScorers()
      const rows = [...card.matchAll(/<tr><td[^>]*>(\d+)<\/td><th scope="row">(.+?)<\/th>/g)]

      expect(rows).toHaveLength(14)
      expect(rows.every(([, position]) => position === '1')).toBe(true)
      expect(card).toContain('14 spelers hebben gescoord')
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
      // The link of the heading to itself is not one of them.
      const withoutAnchor = (await topScorers()).replace(/<a class="hf-heading-link" href="#doelpuntenmakers">/, '')

      expect(withoutAnchor).not.toMatch(/https?:|<a |<img|src=/)
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
    vi.mocked(getMatchData).mockResolvedValue({ matches: [], pages: [], season: '2026/27', standings: [] })

    const html = await render()

    expect(html).toContain('We hebben het programma nog niet gevonden. Kijk straks nog eens.')
    expect(html).toContain('We hebben nog geen uitslagen van dit seizoen.')
    expect(html).toContain('We hebben de stand nog niet gevonden. Kijk straks nog eens.')
    expect(html).not.toContain('Bron: Wikipedia')
    expect(html.match(/<h1/g)).toHaveLength(1)
  })

  it('says the programme is empty when the season is over', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: matchData.matches.filter((match) => match.status === 'played'),
    })

    expect(await render()).toContain('Er staan dit seizoen geen wedstrijden meer op het programma.')
  })

  it('shows the error page in the HTML, and logs the reason, when the database can not be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getMatchData).mockRejectedValue(
      new Error('Failed query: select 1\nparams: geheim', { cause: new Error('connect ECONNREFUSED 127.0.0.1:3306') }),
    )

    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
    expect(html).toContain('<a href="/wedstrijden">Probeer het opnieuw</a>')
    expect(error).toHaveBeenCalledWith(
      'Could not read the matches and the table for /wedstrijden: Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)',
    )
    expect(await generateMetadata()).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })

  it('has a title of its own, a description and the canonical link', async () => {
    const metadata = await generateMetadata()

    expect(metadata.title).toBe('Wedstrijden')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/wedstrijden')
    expect(metadata.description).toMatch(/programma.*uitslagen.*stand/u)
  })
})
