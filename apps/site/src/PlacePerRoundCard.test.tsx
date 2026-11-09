import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { PlaceInRound } from './matches'

import { extremesOfPlaces, labelsOf, PlacePerRoundCard } from './PlacePerRoundCard'
import { withoutIcons } from './without-icons'

const at = (round: number, position: number, points = round * 2): PlaceInRound => ({ points, position, round })

// A whole season, then one that is going on (three rounds), then one with an open round.
const full = Array.from({ length: 34 }, (_, index) => at(index + 1, 1 + (index % 6)))
const going = [at(1, 3), at(2, 1), at(3, 2), ...Array.from({ length: 31 }, () => null)]
const gap = [at(1, 4), null, at(3, 7), ...Array.from({ length: 31 }, () => null)]

const render = (places: readonly (null | PlaceInRound)[]) =>
  withoutIcons(renderToStaticMarkup(<PlacePerRoundCard places={places} />))

describe('labelsOf', () => {
  it('says the round, the place and the points, and nothing for an open round', () => {
    expect(labelsOf([at(12, 4, 20), null])).toEqual(['Ronde 12: plek 4, 20 punten', null])
  })
})

describe('extremesOfPlaces', () => {
  it('finds the highest and the lowest place, with the first round of each', () => {
    expect(extremesOfPlaces([at(1, 3), at(2, 1), at(3, 1), at(4, 5), at(5, 5)])).toEqual({
      highest: at(2, 1),
      lowest: at(4, 5),
    })
  })

  it('has nothing without a round', () => {
    expect(extremesOfPlaces([null, null])).toBeUndefined()
  })
})

describe('PlacePerRoundCard', () => {
  it('has no card without a round', () => {
    expect(render([])).toBe('')
    expect(render([null, null])).toBe('')
  })

  it('has the anchor, the soft surface and the Eredivisie note', () => {
    const html = render(full)

    expect(html).toContain('aria-labelledby="onze-plek-per-speelronde"')
    expect(html).toContain('id="onze-plek-per-speelronde"')
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
    const disclosure = html.slice(html.indexOf('<details'))

    expect(disclosure).not.toContain('<details open')
    expect(disclosure).toContain('<summary>Plek per speelronde</summary>')
    expect(disclosure).toContain('<caption class="hf-visually-hidden">')
    expect(disclosure).toContain('Onze hoogste plek was 1, na ronde 1, en onze laagste plek was 6, na ronde 6.')
    expect([...disclosure.matchAll(/<th scope="row">Ronde (\d+)<\/th>/g)]).toHaveLength(34)
    expect(disclosure.indexOf('Ronde 34')).toBeLessThan(disclosure.indexOf('Ronde 1<'))
  })

  it('stops the table at the last complete round in a season that is going on', () => {
    const html = render(going)

    expect([...html.matchAll(/<th scope="row">Ronde (\d+)<\/th>/g)].map(([, round]) => round)).toEqual(['3', '2', '1'])
    expect(html).toContain('--hf-bar-chart-slots:34')
  })

  it('shows an open round as a row that says so, not as a guess', () => {
    const html = render(gap)

    expect(html).toContain('nog niet alle wedstrijden gespeeld')
    expect(html.slice(html.indexOf('Ronde 2<'), html.indexOf('Ronde 1<'))).toContain('–')
  })

  it('says one place when it never changed', () => {
    expect(render([at(1, 3), at(2, 3)])).toContain('Onze plek was na elke ronde 3.')
  })
})
