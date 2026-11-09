import type { PublicStaff } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { PlaceInRound } from './matches'

import { labelsOf, PlacePerRoundCard } from './PlacePerRoundCard'
import { withoutIcons } from './without-icons'

const at = (round: number, position: number, points = round * 2): PlaceInRound => ({ points, position, round })

// A whole season, then one that is going on (three rounds), one with an open round and one
// that is 20 rounds far.
const full = Array.from({ length: 34 }, (_, index) => at(index + 1, 1 + (index % 6)))
const going = [at(1, 3), at(2, 1), at(3, 2), ...Array.from({ length: 31 }, () => null)]
const gap = [at(1, 4), null, at(3, 7), ...Array.from({ length: 31 }, () => null)]
const twenty = Array.from({ length: 34 }, (_, index) => (index < 20 ? at(index + 1, 1 + (index % 6)) : null))

const text = (html: string) => html.replaceAll(/<[^>]+>/g, '')
const tablesOf = (html: string) => [...html.matchAll(/<table.*?<\/table>/g)].map(([table]) => table)

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

  it('has a paragraph and a bulleted list for more coaches, the name first and the rounds on a second line', () => {
    const html = renderWith(coaches)
    const list = html.slice(html.indexOf('<ul'), html.indexOf('</ul>'))
    const items = [...list.matchAll(/<li>(.*?)<\/li>/g)].map(([, item]) => item!)

    expect(html).toContain('<p>Hoofdtrainers:</p><ul>')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatch(/^<span class="hf-player-name">.*<\/span><p class="hf-meta">.*<\/p>$/)
    expect(items[1]).toMatch(/^<span class="hf-player-name">.*<\/span> \(interim\)<p class="hf-meta">/)
    expect(items.map(text)).toEqual([
      'Robin van PersieRonde 1– t/m 8 · plek 1 →  naar 2',
      'Henk Brugge (interim)Vanaf ronde 9 · plek 3 →  naar 4',
    ])
  })

  it('writes the arrow and the dash for the eye, and "naar" and "t/m" for a screen reader', () => {
    const html = renderWith(coaches)

    expect(html).toContain('<span aria-hidden="true"> → </span><span class="hf-visually-hidden"> naar </span>')
    expect(html).toContain('Ronde 1<span aria-hidden="true">–</span><span class="hf-visually-hidden"> t/m </span>8')
  })

  it('has a paragraph with the name for one coach, without rounds or a place', () => {
    const html = renderWith([coaches[0]!])

    expect(html).toMatch(/<p>Hoofdtrainer: <span class="hf-player-name">.*?<\/span><\/p><details/)
    expect(text(html)).toContain('Hoofdtrainer: Robin van Persie')
    expect(html).not.toContain('Hoofdtrainers:')
    expect(html).not.toContain('<ul')
    expect(html).not.toContain('Ronde 1<')
  })

  it('writes "(interim)" behind the name of one coach who is', () => {
    const html = renderWith([staff('Henk Brugge', '2026-07-01', true)])

    expect(text(html)).toContain('Hoofdtrainer: Henk Brugge (interim)')
    // Behind the name on the same line, not on the line of its own that PlayerName has.
    expect(html).toContain('</span> (interim)</p>')
    expect(html).not.toContain('hf-player-name-meta')
  })

  it('has a dashed line in the chart on the edge before the round of each new coach, not for the first', () => {
    const html = renderWith(coaches)

    expect(
      [...html.matchAll(/hf-bar-chart-divider" style="--hf-bar-chart-across:([\d.]+)"/g)].map(([, at]) => at),
    ).toEqual(['23.53'])
  })

  it('has only the name for a coach without a match, and no dashed line for one', () => {
    const html = renderWith([coaches[0]!, staff('Zonder Wedstrijd', '2027-06-01')])
    const items = [...html.matchAll(/<li>(.*?)<\/li>/g)].map(([, item]) => text(item!))

    expect(items).toEqual(['Robin van PersieRonde 1– t/m 34 · plek 1 →  naar 4', 'Zonder Wedstrijd'])
    expect(html).not.toContain('hf-bar-chart-divider')
  })

  it('has no coaches without coaches', () => {
    const html = render(full)

    expect(html).not.toContain('Hoofdtrainer')
    expect(html).not.toContain('<ul')
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

  it('keeps two tables side by side in a closed Disclosure, rounds 1 to 17 and 18 to 34, round 1 at the top', () => {
    const html = render(full)
    const disclosure = html.slice(html.indexOf('<details'), html.indexOf('</details>'))
    const tables = tablesOf(disclosure)

    expect(disclosure).not.toContain('<details open')
    expect(disclosure).toContain('<summary>Plek per speelronde</summary>')
    expect(disclosure).toContain('<div class="hf-data-table-group"><table')
    expect(disclosure).not.toContain('<p')
    expect(tables.map(rounds)).toEqual([
      Array.from({ length: 17 }, (_, index) => String(index + 1)),
      Array.from({ length: 17 }, (_, index) => String(index + 18)),
    ])
  })

  it('gives each table a caption that names its rounds', () => {
    const [first, second] = tablesOf(render(full))

    expect(first).toContain(
      '<caption class="hf-visually-hidden">Plek en punten van sc Heerenveen in de Eredivisie na ronde 1 tot en met 17</caption>',
    )
    expect(second).toContain('Eredivisie na ronde 18 tot en met 34</caption>')
  })

  it('splits a season that is 20 rounds far at the half of the season: 1 to 17 and 18 to 20', () => {
    const tables = tablesOf(render(twenty))

    expect(tables.map((table) => rounds(table).length)).toEqual([17, 3])
    expect(rounds(tables[1]!)).toEqual(['18', '19', '20'])
    expect(tables[1]).toContain('na ronde 18 tot en met 20</caption>')
  })

  it('has one table, up to the last complete round, in a season that is not halfway', () => {
    const html = render(going)

    expect(tablesOf(html)).toHaveLength(1)
    expect(rounds(html)).toEqual(['1', '2', '3'])
    expect(html).toContain('--hf-bar-chart-slots:34')
  })

  it('shows an open round as a row that says so, not as a guess', () => {
    const html = render(gap)

    expect(html).toContain('nog niet alle wedstrijden gespeeld')
    expect(html.slice(html.indexOf('>2<'), html.indexOf('>3<', html.indexOf('>2<')))).toContain('–')
  })

  it('says one place in one pair when it never changed', () => {
    const html = render([at(1, 3), at(2, 3)])

    expect(html).toContain('<dl class="hf-description-list"><div><dt>Plek</dt><dd>3, alle rondes</dd></div></dl>')
  })

  it('has a description list with the highest and the lowest place above the Disclosure, and no shift', () => {
    const html = render(going)
    const list = html.slice(html.indexOf('<dl'), html.indexOf('</dl>'))

    expect([...list.matchAll(/<dt>(.*?)<\/dt><dd>(.*?)<\/dd>/g)].map(([, term, value]) => [term, value])).toEqual([
      ['Hoogste', 'plek 1, ronde 2'],
      ['Laagste', 'plek 3, ronde 1'],
    ])
    expect(html).not.toContain('Totaal verschoven')
    expect(html.indexOf('</dl>')).toBeLessThan(html.indexOf('<details'))
  })

  it('writes a stretch of rounds with a dash for the eye and "t/m" for a screen reader', () => {
    const html = render([at(1, 2), at(2, 2), at(3, 5)])

    expect(html).toContain(
      '<dd>plek 2, ronde 1<span aria-hidden="true">–</span><span class="hf-visually-hidden"> t/m </span>2</dd>',
    )
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

  it('has the headers Ronde, # and P in each table, and says plek and punten to a screen reader', () => {
    const tables = tablesOf(render(full))

    expect(tables).toHaveLength(2)

    for (const table of tables) {
      const head = table.slice(table.indexOf('<thead'), table.indexOf('</thead>'))

      expect(head).toContain('Ronde')
      expect(head).toContain('<span aria-hidden="true">#</span><span class="hf-visually-hidden">plek</span>')
      expect(head).toContain('<span aria-hidden="true">P</span><span class="hf-visually-hidden">punten</span>')
    }
  })

  it('shows the round in the muted colour and the place heavy, without the word Ronde in a row', () => {
    const html = render(going)
    const row = html.slice(html.indexOf('<tbody'))

    expect(row).toContain('<th scope="row"><span class="hf-meta">1</span></th>')
    expect(row).toContain('hf-numeric hf-key')
    expect(row).not.toContain('>Ronde ')
  })
})
