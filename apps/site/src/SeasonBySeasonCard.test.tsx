import type { StandingsCompetition } from '@fansite/db/schema'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { FinalPlace } from './matches'
import type { SeasonTally } from './seasonTally'

import { lineOf, SeasonBySeasonCard } from './SeasonBySeasonCard'
import { legendsOf } from './test-legend'
import { withoutIcons } from './without-icons'

const row = (
  position: number,
  pointsDeducted = 0,
  goalDifference = 5,
  competition: StandingsCompetition = 'Eredivisie',
) => ({
  competition,
  goalDifference,
  points: 60,
  pointsDeducted,
  position,
})

const places: FinalPlace[] = [
  { now: false, row: row(4, 0, -2), season: '2023/24' },
  { now: false, row: undefined, season: '2024/25' },
  { now: false, row: row(9, 2), season: '2025/26' },
  { now: true, row: row(1), season: '2026/27' },
]

const seasons = ['2026/27', '2025/26', '2024/25', '2023/24', '2022/23', '2021/22', '2009/10']
const tally = (won: number, goalsFor: number, goalsAgainst: number): SeasonTally => ({
  drawn: 1,
  goalsAgainst,
  goalsFor,
  lost: 2,
  won,
})
const tallies = new Map([
  ['2009/10', tally(9, 40, 41)],
  ['2025/26', tally(12, 54, 55)],
  ['2026/27', tally(5, 20, 9)],
])

const render = (props: Partial<Parameters<typeof SeasonBySeasonCard>[0]> = {}) =>
  withoutIcons(
    renderToStaticMarkup(
      <SeasonBySeasonCard
        choice="all"
        current="2026/27"
        places={places}
        seasons={seasons}
        tallies={tallies}
        {...props}
      />,
    ),
  )

describe('lineOf', () => {
  it('puts place 1 highest and a lower place lower, with a gap for a season without a row', () => {
    const { max, values } = lineOf(places)

    expect(max).toBe(18)
    expect(values).toEqual([15, null, 10, 18])
    expect(values[3]!).toBeGreaterThan(values[0]!)
    expect(values[0]!).toBeGreaterThan(values[2]!)
  })

  it('numbers the axis with the places, 1 at the top', () => {
    const { max, ticks } = lineOf(places)

    expect(ticks.map((height) => max + 1 - height)).toEqual([1, 5, 10, 15, 18])
    expect(ticks[0]).toBe(max)
  })

  it('puts a season in the Eerste divisie in a band under the 18, and makes the line drop into it', () => {
    const { apart, max, textOf, ticks, values } = lineOf([
      { now: false, row: row(7), season: '1990/91' },
      { now: false, row: row(3, 0, 5, 'Eerste divisie'), season: '1991/92' },
      { now: false, row: row(2, 0, 5, 'Eerste divisie'), season: '1992/93' },
      { now: false, row: row(5), season: '1993/94' },
    ])

    // Three places of the band, a gap of one, and the 18 places of the Eredivisie.
    expect(max).toBe(22)
    expect(values).toEqual([16, null, null, 18])
    expect(apart).toEqual([null, 1, 2, null])
    expect(ticks).toEqual([22, 18, 13, 8, 5, 1])
    expect(ticks.map(textOf)).toEqual(['1', '5', '10', '15', '18', '3'])
  })

  it('has no band without a season in another league', () => {
    const { apart, max, ticks } = lineOf(places)

    expect(max).toBe(18)
    expect(apart.every((height) => height === null)).toBe(true)
    expect(ticks).toHaveLength(5)
  })

  it('stretches the scale for a table of more than 18 clubs', () => {
    expect(lineOf([{ now: false, row: row(20), season: '2000/01' }]).max).toBe(20)
  })
})

describe('SeasonBySeasonCard with a season in the Eerste divisie', () => {
  const mixed: FinalPlace[] = [
    { now: false, row: row(3, 0, 5, 'Eerste divisie'), season: '2023/24' },
    { now: false, row: row(2, 0, 5, 'Eerste divisie'), season: '2024/25' },
    { now: false, row: row(9, 2), season: '2025/26' },
    { now: true, row: row(1), season: '2026/27' },
  ]

  it('writes the league in the place cell, only for a season outside the Eredivisie', () => {
    const html = render({ places: mixed })

    expect(html).toContain('3 (Eerste divisie)')
    expect(html).toContain('2 (Eerste divisie)')
    expect(html).not.toContain('9 (')
    expect(html).not.toContain('1 (')
  })

  it('names those seasons under the card and says what the dotted line is', () => {
    const html = render({ places: mixed })

    expect(html).toContain('In 2023/24 en 2024/25 speelden we in de Eerste divisie.')
    expect(html).toContain('gestippeld')
  })

  it('has no such line when every season is in the Eredivisie', () => {
    expect(render()).not.toContain('gestippeld')
  })
})

describe('SeasonBySeasonCard', () => {
  it('has no card without a season', () => {
    expect(render({ seasons: [] })).toBe('')
  })

  it('hides the chart from a screen reader and has the seasons in a table, the newest first', () => {
    const html = render()
    const table = html.slice(html.indexOf('<table'), html.indexOf('</table>'))

    expect(html).toMatch(/<div[^>]*aria-hidden="true"[^>]*class="hf-bar-chart/)
    expect([...table.matchAll(/<th[^>]*scope="row"[^>]*>.*?(\d{4}\/\d{2})/g)].map(([, season]) => season)).toEqual([
      '2026/27',
      '2025/26',
      '2024/25',
      '2023/24',
      '2022/23',
      '2021/22',
      '2009/10',
    ])
  })

  it('has every season in one table, with a button that says how many there are', () => {
    const html = render()

    expect(html.match(/<table/g)).toHaveLength(1)
    expect(html).toMatch(/2021\/22[\s\S]*2009\/10/)
    expect(html).toContain('nth-child(n + 6)')
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>Toon alle 7 seizoenen<\/button>/)
    expect(html).not.toContain('<details')
    expect(html).not.toContain('<script')
  })

  it('has no button when the table shows every season', () => {
    expect(render({ seasons: seasons.slice(0, 5) })).not.toContain('<button')
  })

  it('counts won, drawn and lost and the goals for and against, with short headers and a legend', () => {
    const html = render()

    expect(html).toContain('>12<')
    expect(html).toContain('54–55')
    expect(legendsOf(html)).toEqual(['winst, gelijk, verlies, doelpunten (voor–tegen)'])
    expect(html).toContain('<span title="Winst">')
  })

  it('marks the going season as nu and says in the caption which competitions are counted', () => {
    expect(render()).toContain('2026/27 (nu)')
    expect(render({ choice: 'cup' })).toContain('in de KNVB Beker')
    expect(render()).not.toContain('in de KNVB Beker')
  })

  it('gives a season without a table a dash and "geen stand", before the first table and in between', () => {
    const html = render()

    expect(html).toContain('2024/25</a><span class="hf-visually-hidden">, geen stand')
    expect(html).toContain('2009/10</a><span class="hf-visually-hidden">, geen stand')
    expect(html).not.toContain('2025/26</a><span class="hf-visually-hidden">, geen stand')
  })

  it('says since when we know the place, that it is the Eredivisie whatever the choice, and what was taken off', () => {
    const html = render({ choice: 'europe' })

    expect(html).toContain('We kennen de plek sinds 2023/24.')
    expect(html).toContain('De plek is die in de competitie waarin we speelden')
    expect(html).toContain('2025/26: 2 punten afgetrokken')
  })

  it('is a card with seasons but no place at all: no chart, and a line that says so', () => {
    const html = render({ places: [] })

    expect(html).not.toContain('hf-bar-chart')
    expect(html).toContain('De plek kennen we nog niet.')
  })

  it('links a season to its page and the current season to the base address', () => {
    const html = render()

    expect(html).toContain('href="/wedstrijden/2025-26"')
    expect(html).toContain('href="/wedstrijden/2009-10"')
    expect(html).toContain('href="/wedstrijden"')
  })

  it('is named by its heading and has the anchor the bar links to', () => {
    const html = render()

    expect(html).toContain('aria-labelledby="seizoen-voor-seizoen"')
    expect(html).toContain('id="seizoen-voor-seizoen"')
  })
})
