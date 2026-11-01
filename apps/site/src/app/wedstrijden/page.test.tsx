import type { PublicMatch, PublicStaff } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons } from '../../matches'
import { matchShortcuts } from '../../matchShortcuts'
import { matchData } from '../../test-matches'
import { withoutIcons } from '../../without-icons'
import MatchesPage, { generateMetadata } from './page'

// Only the query is replaced: the split into the programme and the results is the real one.
vi.mock('../../matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))

// The afternoon of Friday 23 October 2026 in the Netherlands.
const now = new Date('2026-10-23T13:40:00Z')

async function render() {
  return withoutIcons(renderToStaticMarkup(await MatchesPage()))
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
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27'])
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page /wedstrijden', () => {
  it('has one h1 and three h2 headings in order: the programme, the results and the table', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Wedstrijden</h1>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="programma"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#programma">Programma</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="uitslagen"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#uitslagen">Uitslagen</a></h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="stand"><span class="hf-heading-target"></span><a class="hf-heading-link" href="#stand">Stand</a></h2>',
    ])
  })

  it('has no introduction under the h1: the headings of the cards say what is on the page', async () => {
    const html = await render()

    expect(html).not.toContain('hf-intro')
    expect(html).toMatch(
      /<div class="hf-page-intro"><div class="hf-page-title"><h1 class="hf-heading-1">Wedstrijden<\/h1>/,
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

    it('has the legend of a table under it, and the link to our place in the league last', async () => {
      expectInOrder(section(await render(), 'stand'), [
        '</h2>',
        '<table',
        'hf-bar-legend',
        '#onze-plek-in-de-competitie',
      ])
    })

    it('has the legend of the abbreviations of a match under the list of matches, and the link to the course of the season last', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: matchData.matches.map((match) => (match.status === 'played' ? { ...match, extraTime: true } : match)),
      })

      expectInOrder(section(await render(), 'uitslagen'), [
        '</h2>',
        '<ul',
        'n.v. na verlenging',
        '#verloop-van-het-seizoen',
      ])
    })
  })

  it('has a heading for every link of the bar under the header, with the id the link goes to, in the same order', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2 [^>]*id="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(matchShortcuts.map((item) => item.href)).toEqual(ids)
  })

  it('has the programme and the results in the main with the h1, and the table in a named, wide sidebar after it', async () => {
    const html = await render()
    const main = html.match(/<main[^>]*>.*<\/main>/s)?.[0] ?? ''
    const sidebar = html.match(/<aside[^>]*>.*<\/aside>/s)?.[0] ?? ''

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(sidebar).toMatch(/^<aside class="hf-page-sidebar hf-page-sidebar-wide" aria-label="De stand">/)
    expect(main.match(/<h1/g)).toHaveLength(1)
    expect(main).toContain('id="programma"')
    expect(main.indexOf('id="programma"')).toBeLessThan(main.indexOf('id="uitslagen"'))
    expect(main).not.toContain('id="stand"')
    expect(sidebar).toContain('id="stand"')
    expect(sidebar).not.toContain('id="uitslagen"')
    expect(sidebar).not.toContain('<h1')
    expect(sidebar).not.toContain('id="programma"')
  })

  it('has none of the cards with figures: they are on the page Statistieken', async () => {
    const html = await render()

    for (const id of [
      'onze-plek-in-de-competitie',
      'verloop-van-het-seizoen',
      'reeksen',
      'thuis-en-uit',
      'doelpuntenmakers',
      'topscorers',
      'de-nul-gehouden',
      'nul-gehouden',
      'doelpunten-per-kwartier',
      'hoe-de-wedstrijden-verlopen',
      'uitersten',
    ]) {
      expect(html).not.toContain(`id="${id}"`)
    }
  })

  it('has under the table a link to our place in the league and under the results one to the course of the season, on the page Statistieken', async () => {
    const html = await render()

    expect(section(html, 'stand')).toContain(
      '<a href="/statistieken#onze-plek-in-de-competitie">Onze plek in de competitie</a>',
    )
    expect(section(html, 'uitslagen')).toContain(
      '<a href="/statistieken#verloop-van-het-seizoen">Het verloop van het seizoen</a>',
    )
  })

  it('has no link to the cards with figures under a table or results that are not there yet', async () => {
    vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [], standings: [] })

    expect(await render()).not.toContain('/statistieken')
  })

  it('has no order or style attribute but the length of a bar and the place of a label or a bar of a chart, so the order on a phone is the order in the source', async () => {
    expect(await render()).not.toMatch(
      / style="(?!--hf-bar-share:[\d.]+"|--hf-donut-cos:|--hf-bar-chart-(?:slots|at|share|across):[\d.]+")|order:/,
    )
  })

  it('names each card by its h2, so the links with a hash on the homepage have a target', async () => {
    const html = await render()

    for (const id of ['programma', 'uitslagen', 'stand']) {
      expect(html).toMatch(new RegExp(`<section class="hf-card[ a-z-]*" aria-labelledby="${id}">`))
    }
  })

  it('gives the programme and the results the white surface and the table the soft one', async () => {
    const html = await render()

    for (const [id, surface] of [
      ['programma', 'hf-card'],
      ['uitslagen', 'hf-card'],
      ['stand', 'hf-card hf-card-soft hf-card-shareable'],
    ] as const) {
      expect(html).toContain(`<section class="${surface}" aria-labelledby="${id}">`)
    }
  })

  it('lets the visitor make an image of the table, and of no other card', async () => {
    const html = await render()
    const shareable = [...html.matchAll(/<section class="[^"]*hf-card-shareable[^"]*" aria-labelledby="([^"]+)"/g)].map(
      ([, id]) => id,
    )

    expect(shareable).toEqual(['stand'])
    expect(html.match(/data-hf-card-share/g)).toHaveLength(1)
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

  it('calls the card with the table Stand, and not Eindstand, which is for a season that is over', async () => {
    const html = await render()

    expect(html).toContain('href="#stand">Stand</a>')
    expect(html).not.toContain('Eindstand')
    expect(html).not.toContain('eindstand')
    expect(html).toContain('aria-label="De stand"')
  })

  describe('a match that has begun and has no result', () => {
    const cup = (kickoff: string, round: string, extra: Partial<PublicMatch> = {}): PublicMatch => ({
      ...matchData.matches[3]!,
      goals: [],
      goalsAgainst: null,
      goalsFor: null,
      kickoffAt: new Date(kickoff),
      matchDate: kickoff.slice(0, 10),
      round,
      status: 'scheduled',
      ...extra,
    })
    const withMatch = (added: PublicMatch) =>
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: [...matchData.matches, added].toSorted((a, b) => a.matchDate.localeCompare(b.matchDate)),
      })

    it('puts it at the top of the results and not in the programme, with the sentence after two hours', async () => {
      withMatch(cup('2026-10-22T18:45:00Z', 'Derde ronde'))
      const html = await render()
      const results = section(html, 'uitslagen')

      expect(section(html, 'programma')).not.toContain('Derde ronde')
      expect(results.indexOf('Derde ronde')).toBeLessThan(results.indexOf('Tweede ronde'))
      expect(results.match(/Gegevens nog niet beschikbaar/g)).toHaveLength(1)
      expect(results).toContain('do 22 okt 20:45')
    })

    it('shows only the time within the two hours of the kick-off, still in the results', async () => {
      withMatch(cup('2026-10-23T12:00:00Z', 'Derde ronde'))
      const html = await render()

      expect(section(html, 'uitslagen')).toContain('Derde ronde')
      expect(section(html, 'programma')).not.toContain('Derde ronde')
      expect(html).not.toContain('Gegevens nog niet beschikbaar')
    })

    it('shows the result, and no sentence, as soon as the match is played with a score', async () => {
      withMatch(cup('2026-10-22T18:45:00Z', 'Derde ronde', { goalsAgainst: 1, goalsFor: 3, status: 'played' }))
      const html = await render()

      expect(section(html, 'uitslagen')).toContain('3–1')
      expect(html).not.toContain('Gegevens nog niet beschikbaar')
    })

    it('says nothing of the sort for a match still to come, and keeps a postponed match in the programme', async () => {
      const html = await render()

      expect(html).not.toContain('Gegevens nog niet beschikbaar')
      expect(section(html, 'programma')).toContain('Uitgesteld')
    })

    it('keeps the sentence about no results for a season in which no match has begun', async () => {
      vi.mocked(getMatchData).mockResolvedValue({
        ...matchData,
        matches: [cup('2026-11-22T18:45:00Z', 'Derde ronde')],
      })

      expect(section(await render(), 'uitslagen')).toContain('We hebben nog geen uitslagen van dit seizoen.')
    })
  })

  describe('a match of the play-offs for the Conference League', () => {
    const playoffs = (extra: Partial<PublicMatch> = {}): PublicMatch => ({
      ...matchData.matches[3]!,
      competition: 'Play-offs Conference League',
      goals: [],
      goalsAgainst: 3,
      goalsFor: 2,
      kickoffAt: new Date('2026-10-22T19:00:00Z'),
      matchDate: '2026-10-22',
      opponent: 'FC Voorbeeld',
      round: 'Halve finale',
      status: 'played',
      ...extra,
    })
    const withMatch = (added: PublicMatch) =>
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [...matchData.matches, added] })

    it('names the competition and the round as text in the results, with the result', async () => {
      withMatch(playoffs())

      const results = section(await render(), 'uitslagen')

      expect(results).toContain('Play-offs Conference League')
      expect(results).toContain('Halve finale')
      expect(results).toContain('FC Voorbeeld')
      expect(results).toContain('3–2')
      expect(results).toContain('3 tegen 2')
    })

    it('puts it in the programme, with the competition and the round, while it is still to be played', async () => {
      withMatch(
        playoffs({
          goalsAgainst: null,
          goalsFor: null,
          kickoffAt: new Date('2026-10-30T19:00:00Z'),
          matchDate: '2026-10-30',
          status: 'scheduled',
        }),
      )

      const html = await render()

      expect(section(html, 'programma')).toContain('Play-offs Conference League')
      expect(section(html, 'programma')).toContain('Halve finale')
      expect(section(html, 'uitslagen')).not.toContain('Halve finale')
    })

    it('says "Gegevens nog niet beschikbaar" after two hours without a result, like any other match', async () => {
      withMatch(playoffs({ goalsAgainst: null, goalsFor: null, status: 'scheduled' }))

      const results = section(await render(), 'uitslagen')

      expect(results).toContain('Halve finale')
      expect(results.match(/Gegevens nog niet beschikbaar/g)).toHaveLength(1)
    })
  })

  describe('the line under the table when the data is behind', () => {
    const lacking = (kickoff: string): PublicMatch => ({
      ...matchData.matches[3]!,
      goals: [],
      goalsAgainst: null,
      goalsFor: null,
      kickoffAt: new Date(kickoff),
      matchDate: kickoff.slice(0, 10),
      round: 'Derde ronde',
      status: 'scheduled',
    })
    const withMatch = (added: PublicMatch) =>
      vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [...matchData.matches, added] })

    it('says the data is not up to date, in the meta style, when a match has no result two hours after its kick-off', async () => {
      withMatch(lacking('2026-10-22T18:45:00Z'))
      const table = section(await render(), 'stand')

      expect(table.match(/Gegevens nog niet bijgewerkt/g)).toHaveLength(1)
      expect(table).toContain(
        '<p class="hf-meta hf-text-missing" data-hf-card-share-skip="">Gegevens nog niet bijgewerkt</p>',
      )
    })

    it('puts the line straight under the table and above the link to our place in the league', async () => {
      withMatch(lacking('2026-10-22T18:45:00Z'))
      const table = section(await render(), 'stand')
      const places = ['</table>', 'Gegevens nog niet bijgewerkt', 'Onze plek in de competitie'].map((part) =>
        table.indexOf(part),
      )

      expect(places.every((place) => place >= 0)).toBe(true)
      expect(places).toEqual([...places].sort((a, b) => a - b))
    })

    it('says nothing within the two hours of the kick-off, or when every result is there', async () => {
      expect(await render()).not.toContain('Gegevens nog niet bijgewerkt')

      withMatch(lacking('2026-10-23T12:00:00Z'))
      expect(await render()).not.toContain('Gegevens nog niet bijgewerkt')
    })

    it('has no line in a card without a table', async () => {
      withMatch(lacking('2026-10-22T18:45:00Z'))
      vi.mocked(getMatchData).mockResolvedValue({ ...(await getMatchData()), standings: [] })

      expect(await render()).not.toContain('Gegevens nog niet bijgewerkt')
    })
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
          playerPage: null,
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
          playerPage: null,
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
                playerPage: null,
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

  it('has one credit under the page, for the three pages, with the time of the last reading', async () => {
    const html = await render()

    expect(html.match(/class="hf-meta hf-wikipedia-credit"/g)).toHaveLength(1)
    expect(html).toContain('<summary>Bron: Wikipedia</summary>')
    expect(html).toContain('<details class="hf-meta hf-wikipedia-credit"><summary>')
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
    vi.mocked(getMatchData).mockResolvedValue({ coaches: [], matches: [], pages: [], season: '2026/27', standings: [] })

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

describe('the season picker on /wedstrijden', () => {
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
      /<div class="hf-page-title"><h1 class="hf-heading-1">Wedstrijden<\/h1><form [^>]*aria-label="Seizoen kiezen"/,
    )
    expect(html).toContain(
      '<option value="2026-27" selected="">2026/27</option><option value="2025-26">2025/26</option>',
    )
    expect(html).toContain('action="/wedstrijden/kies"')
  })

  it('keeps the card for the programme and the images as they were', async () => {
    const html = await render()

    expect(html).toContain('id="programma"')
    expect(html).not.toContain('Seizoen 2026/27 ·')
  })

  it('has no picker when the current season is the only one, and keeps the heading', async () => {
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27'])

    const html = await render()

    expect(html).not.toContain('<select')
    expect(html).not.toContain('Seizoen kiezen')
    expect(html).toContain('<h1 class="hf-heading-1">Wedstrijden</h1>')
  })

  it('has the bar of the page and the picker agree: a link for every card the page has', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2[^>]*\sid="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(matchShortcuts.map(({ href }) => href)).toEqual(ids)
  })
})

describe('the head coaches of the season', () => {
  const veldman = {
    endDate: null,
    endPrecision: null,
    interim: false,
    name: 'Robin Veldman',
    startDate: '2025-03-21',
    startPrecision: 'day',
    wikipediaPage: 'Robin Veldman',
  } as const
  const brugge = {
    endDate: '2026-12-20',
    endPrecision: 'day',
    interim: true,
    name: 'Henk Brugge',
    startDate: '2026-09-01',
    startPrecision: 'day',
    wikipediaPage: 'Henk Brugge',
  } as const
  const persie = {
    endDate: '2026-08-31',
    endPrecision: 'day',
    interim: false,
    name: 'Robin van Persie',
    startDate: '2024-01-01',
    startPrecision: 'year',
    wikipediaPage: null,
  } as const

  const withCoaches = (coaches: PublicStaff[]) => vi.mocked(getMatchData).mockResolvedValue({ ...matchData, coaches })

  /** The card of the coaches: from its heading to the end of the card. */
  async function coachesCard() {
    const html = await render()
    const card = section(html, 'hoofdtrainer')

    return { card: card.slice(0, card.indexOf('</section>')), html }
  }

  const textOf = (html: string) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|')

  it('has no card for a season without a coach in the table', async () => {
    const { html } = await coachesCard()

    expect(html).not.toContain('Hoofdtrainer')
  })

  it('is a card named "Hoofdtrainer" for one coach, with one line that has the name and nothing else', async () => {
    withCoaches([veldman])

    const { card } = await coachesCard()

    expect(card).toContain('href="#hoofdtrainer">Hoofdtrainer')
    expect(card).toContain('<ul role="list">')
    expect(card.match(/<li>/g)).toHaveLength(1)
    expect(card).not.toContain('hele seizoen')
    expect(card).not.toContain('hf-short-match-when')
    expect(textOf(card)).toBe('|Hoofdtrainer|Robin| |Veldman|')
  })

  it('is named "Hoofdtrainers" for more, with "tot" and the day for each but the last, and "vanaf" for the last', async () => {
    withCoaches([persie, brugge, veldman])

    const { card } = await coachesCard()

    expect(card).toContain('href="#hoofdtrainer">Hoofdtrainers')
    expect(textOf(card)).toContain(
      '|Hoofdtrainers|tot 31 aug 2026|Robin| |van Persie|tot 20 dec 2026|Henk| |Brugge| |(interim)|vanaf 21 mrt 2025|Robin| |Veldman|',
    )
  })

  it('has the given name in the normal weight and the surname in the stronger one, like a player', async () => {
    withCoaches([persie, veldman])

    const { card } = await coachesCard()

    expect(card).toContain(
      '<span class="hf-player-name"><span class="hf-player-name-given">Robin</span> <span class="hf-player-name-surname">van Persie</span></span>',
    )
  })

  it('says "(interim)" in the quiet style behind the name, and has no link to Wikipedia', async () => {
    withCoaches([persie, brugge])

    const { card } = await coachesCard()

    expect(card).toContain('<span class="hf-short-match-where">(interim)</span>')
    expect(card).not.toContain('<a href="https://nl.wikipedia.org')
    expect(card).not.toContain('wikipedia')
  })

  it('is a card with the strong blue surface in the sidebar right after the table, named by its heading, without a source of its own', async () => {
    withCoaches([veldman])

    const { card, html } = await coachesCard()

    expect(html).toContain('<section class="hf-card hf-card-strong" aria-labelledby="hoofdtrainer">')
    expect(html.indexOf('id="hoofdtrainer"')).toBeGreaterThan(html.indexOf('id="stand"'))
    expect(html.indexOf('id="hoofdtrainer"')).toBeLessThan(html.indexOf('hf-wikipedia-credit'))
    expect(card).not.toContain('hf-wikipedia-credit')
    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toHaveLength(5)
  })
})
