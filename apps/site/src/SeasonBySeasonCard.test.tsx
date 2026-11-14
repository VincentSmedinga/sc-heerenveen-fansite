import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { FinalPlace } from './matches'
import type { SeasonTally } from './seasonTally'

import { lineOf, SeasonBySeasonCard } from './SeasonBySeasonCard'
import { withoutIcons } from './without-icons'

const row = (position: number, pointsDeducted = 0, goalDifference = 5) => ({
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

  it('stretches the scale for a table of more than 18 clubs', () => {
    expect(lineOf([{ now: false, row: row(20), season: '2000/01' }]).max).toBe(20)
  })
})

describe('SeasonBySeasonCard', () => {
  it('has no card without a season', () => {
    expect(render({ seasons: [] })).toBe('')
  })

  it('hides the chart from a screen reader and shows the latest five seasons in a table, the newest first', () => {
    const html = render()
    const table = html.slice(html.indexOf('<table'), html.indexOf('</table>'))

    expect(html).toMatch(/<div[^>]*aria-hidden="true"[^>]*class="hf-bar-chart/)
    expect([...table.matchAll(/<th[^>]*scope="row"[^>]*>.*?(\d{4}\/\d{2})/g)].map(([, season]) => season)).toEqual([
      '2026/27',
      '2025/26',
      '2024/25',
      '2023/24',
      '2022/23',
    ])
  })

  it('has the other seasons in a closed Disclosure that says how many there are, without JavaScript', () => {
    const html = render()
    const fold = html.indexOf('<details class="hf-disclosure"><summary>Toon alle 7 seizoenen')

    expect(fold).toBeGreaterThan(html.indexOf('</table>'))
    expect(html).not.toMatch(/<details[^>]* open/)
    expect(html.slice(fold, html.indexOf('</details>'))).toMatch(/2021\/22[\s\S]*2009\/10/)
    expect(html).not.toContain('<script')
  })

  it('has no Disclosure when the table holds every season', () => {
    expect(render({ seasons: seasons.slice(0, 5) })).not.toContain('<details')
  })

  it('counts won, drawn and lost and the goals for and against, with short headers and a legend', () => {
    const html = render()

    expect(html).toContain('>12<')
    expect(html).toContain('54–55')
    expect(html).toContain('W winst, G gelijk, V verlies, D doelpunten (voor–tegen)')
    expect(html).toContain('<abbr title="Winst">')
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
    expect(html).toContain('De plek is altijd die in de Eredivisie')
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
