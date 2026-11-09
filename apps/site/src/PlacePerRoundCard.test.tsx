import type { PublicStaff } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { PlaceInRound } from './matches'

import { labelsOf, PlacePerRoundCard } from './PlacePerRoundCard'
import { withoutIcons } from './without-icons'

const at = (round: number, position: number, points = round * 2): PlaceInRound => ({ points, position, round })

// A whole season, then one that is going on (three rounds), then one with an open round.
const full = Array.from({ length: 34 }, (_, index) => at(index + 1, 1 + (index % 6)))
const going = [at(1, 3), at(2, 1), at(3, 2), ...Array.from({ length: 31 }, () => null)]
const gap = [at(1, 4), null, at(3, 7), ...Array.from({ length: 31 }, () => null)]

const rounds = (html: string) =>
  [...html.matchAll(/<th scope="row"><span class="hf-meta">(\d+)/g)].map(([, round]) => round)

const render = (places: readonly (null | PlaceInRound)[]) =>
  withoutIcons(renderToStaticMarkup(<PlacePerRoundCard places={places} />))

describe('labelsOf', () => {
  it('says the round and the place, with only the place heavy, and nothing for an open round', () => {
    const [label, open] = labelsOf([at(12, 4, 20), null])

    expect(open).toBeNull()
    expect(withoutIcons(renderToStaticMarkup(<>{label}</>))).toBe('Ronde 12: <strong>plek 4</strong>')
  })
})

const staff = (name: string, startDate: string, interim = false) =>
  ({ interim, name, startDate }) as unknown as PublicStaff
const game = (round: number, matchDate: string) => ({
  competition: 'Eredivisie' as const,
  matchDate,
  round: `Speelronde ${round}`,
})
const matchesOf = Array.from({ length: 34 }, (_, index) =>
  game(
    index + 1,
    `2026-${String(Math.floor(index / 4) + 8).padStart(2, '0')}-${String((index % 4) * 7 + 1).padStart(2, '0')}`,
  ),
)

describe('PlacePerRoundCard with head coaches', () => {
  const coaches = [staff('Robin van Persie', '2026-07-01'), staff('Henk Brugge', '2026-10-01', true)]
  const renderWith = (list: PublicStaff[]) =>
    withoutIcons(renderToStaticMarkup(<PlacePerRoundCard coaches={list} matches={matchesOf} places={full} />))

  it('has a line for each coach after the lines of the places, with the rounds and the places', () => {
    const html = renderWith(coaches)
    const list = html.slice(html.indexOf('<ul'), html.indexOf('</ul>'))
    const items = [...list.matchAll(/<li>(.*?)<\/li>/g)].map(([, item]) => item!.replaceAll(/<[^>]+>/g, ''))

    expect(items.slice(3)).toEqual([
      'Robin van Persie Ronde 1 t/m 8 · plek 1 →  naar 2',
      'Henk Brugge (interim) Vanaf ronde 9 · plek 3 →  naar 4',
    ])
  })

  it('writes the arrow for the eye and the word "naar" for a screen reader', () => {
    const html = renderWith(coaches)

    expect(html).toContain('<span aria-hidden="true"> → </span><span class="hf-visually-hidden"> naar </span>')
  })

  it('has a dashed line in the chart on the edge before the round of each new coach, not for the first', () => {
    const html = renderWith(coaches)

    expect(
      [...html.matchAll(/hf-bar-chart-divider" style="--hf-bar-chart-across:([\d.]+)"/g)].map(([, at]) => at),
    ).toEqual(['23.53'])
  })

  it('has no line for a coach without a match, and no dashed line for one', () => {
    const html = renderWith([coaches[0]!, staff('Zonder Wedstrijd', '2027-06-01')])

    expect(html).toContain('Zonder')
    expect(html).not.toContain('hf-bar-chart-divider')
  })

  it('has no coach lines without coaches', () => {
    expect(render(full)).not.toContain('Ronde 1 t/m')
  })
})

describe('PlacePerRoundCard', () => {
  it('has no card without a round', () => {
    expect(render([])).toBe('')
    expect(render([null, null])).toBe('')
  })

  it('has the anchor, the soft surface and the Eredivisie note', () => {
    const html = render(full)

    expect(html).toContain('aria-labelledby="verloop-op-de-ranglijst"')
    expect(html).toContain('id="verloop-op-de-ranglijst"')
    expect(html).toContain('hf-card-soft')
    expect(html).toContain('Eredivisie')
  })

  it('hides the line from a screen reader and has 34 rounds on it, with 1 at the top', () => {
    const html = render(full)

    expect(html).toMatch(/<div[^>]*aria-hidden="true"[^>]*class="hf-bar-chart/)
    expect(html).toContain('--hf-bar-chart-slots:34')
    expect(html).toMatch(/hf-bar-chart-scale-number" style="--hf-bar-chart-at:100">1</)
    expect(html).toContain('Speelronde')
  })

  it('keeps the table and the sentence in a closed Disclosure, with a caption', () => {
    const html = render(full)
    const disclosure = html.slice(html.indexOf('<details'), html.indexOf('</details>'))

    expect(disclosure).not.toContain('<details open')
    expect(disclosure).toContain('<summary>Plek per speelronde</summary>')
    expect(disclosure).toContain('<caption class="hf-visually-hidden">')
    expect(disclosure).not.toContain('<p')
    expect([...disclosure.matchAll(/<th scope="row">/g)]).toHaveLength(34)
    expect(rounds(html)[0]).toBe('34')
    expect(rounds(html).at(-1)).toBe('1')
  })

  it('stops the table at the last complete round in a season that is going on', () => {
    const html = render(going)

    expect(rounds(html)).toEqual(['3', '2', '1'])
    expect(html).toContain('--hf-bar-chart-slots:34')
  })

  it('shows an open round as a row that says so, not as a guess', () => {
    const html = render(gap)

    expect(html).toContain('nog niet alle wedstrijden gespeeld')
    expect(html.slice(html.indexOf('>2<'), html.indexOf('>1<', html.indexOf('>2<')))).toContain('–')
  })

  it('says one place and no shift when it never changed', () => {
    const html = render([at(1, 3), at(2, 3)])

    expect(html).toContain('<li>Plek: 3, alle rondes</li>')
    expect(html).not.toContain('Totaal verschoven')
  })

  it('has a list of three lines above the Disclosure, not a sentence', () => {
    const html = render(going)
    const list = html.slice(html.indexOf('<ul'), html.indexOf('</ul>'))

    expect([...list.matchAll(/<li>(.*?)<\/li>/g)].map(([, line]) => line)).toEqual([
      'Hoogste: plek 1, ronde 2',
      'Laagste: plek 3, ronde 1',
      'Totaal verschoven: 3 plekken',
    ])
    expect(html).toContain('<ul class="hf-list-plain" role="list">')
    expect(html.indexOf('</ul>')).toBeLessThan(html.indexOf('<details'))
  })

  it('has strokes with a number at rounds 1, 8, 17, 25 and 34, and no others', () => {
    const html = render(full)
    const numbers = html.slice(html.indexOf('hf-bar-chart-numbers'), html.indexOf('hf-bar-chart-title'))

    expect(html).toContain('hf-bar-chart-numbers-marked')
    expect([...numbers.matchAll(/hf-bar-chart-number"[^>]*>(\d+)</g)].map(([, number]) => number)).toEqual([
      '1',
      '8',
      '17',
      '25',
      '34',
    ])
  })

  it('has the numbers 1, 9 and 18 at the side', () => {
    const html = render(full)

    expect([...html.matchAll(/hf-bar-chart-scale-number"[^>]*>(\d+)</g)].map(([, number]) => number)).toEqual([
      '1',
      '9',
      '18',
    ])
  })

  it('has the headers Ronde, # and P, and says Plek and Punten to a screen reader', () => {
    const html = render(full)
    const head = html.slice(html.indexOf('<thead'), html.indexOf('</thead>'))

    expect(head).toContain('Ronde')
    expect(head).toContain('<span aria-hidden="true">#</span><span class="hf-visually-hidden">plek</span>')
    expect(head).toContain('<span aria-hidden="true">P</span><span class="hf-visually-hidden">punten</span>')
    expect(html).toContain('Plek en punten van sc Heerenveen in de Eredivisie na elke speelronde')
  })

  it('shows the round in the muted colour and the place heavy, without the word Ronde in a row', () => {
    const html = render(going)
    const row = html.slice(html.indexOf('<tbody'))

    expect(row).toContain('<th scope="row"><span class="hf-meta">3</span></th>')
    expect(row).toContain('hf-numeric hf-key')
    expect(row).not.toContain('>Ronde ')
  })
})
