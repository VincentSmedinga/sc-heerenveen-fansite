import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { FinalPlace } from './matches'

import { FinalPlacesCard, lineOf } from './FinalPlacesCard'
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

const render = (linkable = ['2023/24', '2025/26', '2026/27']) =>
  withoutIcons(renderToStaticMarkup(<FinalPlacesCard current="2026/27" linkable={linkable} places={places} />))

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

describe('FinalPlacesCard', () => {
  it('has no card without a place', () => {
    expect(renderToStaticMarkup(<FinalPlacesCard current="2026/27" linkable={[]} places={[]} />)).toBe('')
  })

  it('hides the chart from a screen reader and gives the same numbers in a table, the newest season first', () => {
    const html = render()
    const table = html.slice(html.indexOf('<table'), html.indexOf('</table>'))

    expect(html).toMatch(/<div[^>]*aria-hidden="true"[^>]*class="hf-bar-chart/)
    expect(table).toContain('Seizoen')
    expect(table).toContain('Doelsaldo')
    expect([...table.matchAll(/<th[^>]*scope="row"[^>]*>.*?(\d{4}\/\d{2})/g)].map(([, season]) => season)).toEqual([
      '2026/27',
      '2025/26',
      '2024/25',
      '2023/24',
    ])
    expect(table).toContain('−2')
    expect(table).toContain('+5')
  })

  it('marks the going season as nu, says how many points were taken off and marks a season without a table', () => {
    const html = render()

    expect(html).toContain('nu')
    expect(html).toContain('2 punten afgetrokken')
    expect(html).toContain('geen stand')
  })

  it('links a season to its page, the current season to the base address, and leaves out a season without a page', () => {
    const html = render()

    expect(html).toContain('href="/wedstrijden/2023-24"')
    expect(html).toContain('href="/wedstrijden/2025-26"')
    expect(html).toContain('href="/wedstrijden"')
    expect(html).not.toContain('href="/wedstrijden/2024-25"')
  })

  it('says the first season, and ends with Alleen de Eredivisie', () => {
    const html = render()

    expect(html).toContain('Sinds 2023/24')
    expect(html.indexOf('Sinds 2023/24')).toBeLessThan(html.indexOf('Alleen de Eredivisie'))
    expect(html.slice(html.indexOf('Alleen de Eredivisie'))).toMatch(/^Alleen de Eredivisie<\/p><\/section>$/)
  })

  it('is named by its heading and has the anchor the bar links to', () => {
    const html = render()

    expect(html).toContain('aria-labelledby="onze-plek-door-de-jaren"')
    expect(html).toContain('id="onze-plek-door-de-jaren"')
  })
})
