import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, fallback, role, scale } from '../../tokens/colourRoles'

// jsdom doesn't apply rules in a cascade layer, so the test reads the files' text, without the
// comments.
const read = (file: string) => readFileSync(join(import.meta.dirname, '..', file), 'utf8').replace(/\/\*.*?\*\//gs, '')

describe('the track of a bar list', () => {
  it('is the colour of a bar track, or the track of the card it is on', () => {
    expect(read('bar-list/bar-list.css')).toContain(
      'background-color: var(--hf-card-track, var(--hf-colour-background-bar-track));',
    )
  })

  it('stays grey-100 in light, a step darker than the page, so it shows on a white card too', () => {
    expect(role('background-bar-track').light).toBe(scale('grey-100'))
    expect(fallback('background-bar-track')).toBe(scale('grey-100'))
    expect(role('background-page').light).toBe(scale('grey-50'))
    expect(fallback('background-page')).toBe(scale('grey-50'))
  })

  it('stays the colour of the page in dark', () => {
    expect(role('background-bar-track').dark).toBe(role('background-page').dark)
  })

  it('is the tint of the track of a switch on a soft card, so it shows against the blue', () => {
    const soft = read('card/card.css').match(/\.hf-card-soft \{[^}]*\}/s)?.[0] ?? ''

    expect(soft).toContain('--hf-card-track: var(--hf-colour-background-track);')
  })
})

describe('the bars', () => {
  it('are thick in a list and thin in a table cell, with one corner on all four sides', () => {
    const list = read('bar-list/bar-list.css')

    expect(list.match(/block-size: var\(--hf-size-bar-thick\)/g)).toHaveLength(1)
    expect(list.match(/border-radius: var\(--hf-radius-bar\)/g)).toHaveLength(2)
    expect(read('bar/bar.css')).toContain('block-size: var(--hf-size-bar-thin)')
  })

  it('count in the same colour in a list and a table: the tone plain, which is the green of a win at 70%', () => {
    const tone = read('chart/chart.css').match(/\.hf-chart-tone-plain \{[^}]*\}/s)?.[0] ?? ''

    expect(tone).toContain('--hf-chart-colour: var(--hf-colour-outcome-win);')
    expect(tone).toContain('--hf-chart-strength: 70%;')
    expect(read('bar-list/BarList.tsx')).toContain('hf-chart-tone-plain')
    expect(read('bar/Bar.tsx')).toContain('hf-chart-tone-plain')
  })

  it('give the bars of the results the thick or the thin size and the same corner', () => {
    expect(read('outcome-bar/outcome-bar.css')).toContain('block-size: var(--hf-size-bar-thick)')
    expect(read('outcome-bar/outcome-bar.css')).toContain('border-radius: var(--hf-radius-bar)')
    expect(read('outcome-line/outcome-line.css')).toContain('block-size: var(--hf-size-bar-thin)')
    expect(read('match-score-bar/match-score-bar.css')).toContain('block-size: var(--hf-size-bar-thin)')
    expect(read('match-score-bar/match-score-bar.css')).toContain('border-radius: var(--hf-radius-bar)')
  })
})

describe('a marked row of a bar list', () => {
  const css = read('bar-list/bar-list.css')

  it('has the colours of a marked row in a table, and a track in the colour of the card', () => {
    const band = css.match(/\.hf-bar-list-highlight \{[^}]*\}/s)?.[0] ?? ''
    const track = css.match(/\.hf-bar-list-highlight \.hf-bar-list-track \{[^}]*\}/s)?.[0] ?? ''

    expect(band).toContain('background-color: var(--hf-colour-background-highlight);')
    expect(band).toContain('color: var(--hf-colour-text-highlight);')
    expect(track).toContain('background-color: var(--hf-colour-background-surface);')
  })

  it.each(['light', 'dark'] as const)('keeps its text and its bar readable in %s', (theme) => {
    // The bar is the green of a count at 70% on its track (see chart.css).
    const surface = role('background-surface')[theme]
    const parts = [1, 3, 5].map((start) => {
      const of = (hex: string) => Number.parseInt(hex.slice(start, start + 2), 16)

      return Math.round(of(role('outcome-win')[theme]) * 0.7 + of(surface) * 0.3)
    })
    const fill = `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`
    const text = contrast(role('text-highlight')[theme], role('background-highlight')[theme])

    expect(text).toBeGreaterThanOrEqual(7)
    expect(contrast(fill, surface)).toBeGreaterThanOrEqual(3)
  })
})
