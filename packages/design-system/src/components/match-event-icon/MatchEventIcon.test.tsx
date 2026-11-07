import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, role } from '../../tokens/colourRoles'
import { MatchEventIcon, matchEventIconKinds } from './MatchEventIcon'

// The CSS is read as text: jsdom doesn't apply rules in a cascade layer.
const css = readFileSync(join(import.meta.dirname, 'match-event-icon.css'), 'utf8').replaceAll(/\/\*[\s\S]*?\*\//gu, '')

const draw = (element: React.ReactElement) => render(element).container.querySelector('svg')

describe('MatchEventIcon', () => {
  it.each(matchEventIconKinds)('draws %s as shapes only, hidden from assistive technology', (kind) => {
    const icon = draw(<MatchEventIcon kind={kind} />)

    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.getAttribute('aria-label')).toBeNull()
    expect(icon?.getAttribute('role')).toBeNull()
    expect(icon?.getAttribute('focusable')).toBe('false')
    expect(icon?.querySelectorAll('circle, path, rect').length).toBeGreaterThan(0)
    expect(icon?.outerHTML).not.toMatch(/(href|src)=|https?:|url\(/u)
  })

  it('gives every kind a drawing of its own, so colour is never the only difference', () => {
    const drawings = matchEventIconKinds.map((kind) => draw(<MatchEventIcon kind={kind} />)?.innerHTML)

    expect(new Set(drawings).size).toBe(matchEventIconKinds.length)
  })

  it('names the icon with a label, as an image', () => {
    const icon = draw(<MatchEventIcon kind="red-card" label="Rode kaart" />)

    expect(icon?.getAttribute('role')).toBe('img')
    expect(icon?.getAttribute('aria-label')).toBe('Rode kaart')
    expect(icon?.getAttribute('aria-hidden')).toBeNull()
  })

  it('has the size next to text by default and the large one on request', () => {
    expect(draw(<MatchEventIcon kind="goal" />)?.getAttribute('class')).toBe('hf-match-event-icon')
    expect(draw(<MatchEventIcon kind="goal" size="text" />)?.getAttribute('class')).toBe('hf-match-event-icon')
    expect(draw(<MatchEventIcon kind="goal" size="large" />)?.getAttribute('class')).toBe(
      'hf-match-event-icon hf-match-event-icon-large',
    )
    expect(css).toMatch(/\.hf-match-event-icon-large \{\s*--hf-match-event-icon-size: 1\.375;/u)
  })

  it('turns every icon 12 degrees clockwise', () => {
    expect(css).toMatch(/\.hf-match-event-icon \{[^}]*transform: rotate\(12deg\);/u)
  })

  it('draws the own goal in the colour of a loss and the goal in the colour of a heading', () => {
    const goal = draw(<MatchEventIcon kind="goal" />)
    const own = draw(<MatchEventIcon kind="own-goal" />)

    expect(goal?.querySelector('circle')?.getAttribute('class')).toBe('hf-match-event-icon-ball')
    expect(own?.querySelector('circle')?.getAttribute('class')).toContain('hf-match-event-icon-own')
    expect(css).toMatch(/\.hf-match-event-icon-ball \{\s*fill: var\(--hf-colour-text-heading\)/u)
    expect(css).toMatch(/\.hf-match-event-icon-own \{\s*fill: var\(--hf-colour-outcome-loss\)/u)
  })

  it('draws the yellow-red card as a yellow and a red card', () => {
    const rects = [...(draw(<MatchEventIcon kind="yellow-red-card" />)?.querySelectorAll('rect') ?? [])]

    expect(rects.map((rect) => rect.getAttribute('class'))).toEqual([
      'hf-match-event-icon-card hf-match-event-icon-yellow',
      'hf-match-event-icon-card hf-match-event-icon-red',
    ])
  })

  it('draws the substitution as a green arrow up and a red arrow down, and in and out as one of them', () => {
    const classes = (kind: 'in' | 'out' | 'substitution') =>
      [...(draw(<MatchEventIcon kind={kind} />)?.querySelectorAll('path') ?? [])].map((path) =>
        path.getAttribute('class'),
      )

    expect(classes('substitution')).toEqual(['hf-match-event-icon-arrow-in', 'hf-match-event-icon-arrow-out'])
    expect(classes('in')).toEqual(['hf-match-event-icon-arrow-in'])
    expect(classes('out')).toEqual(['hf-match-event-icon-arrow-out'])
    expect(css).toMatch(/\.hf-match-event-icon-arrow-in \{\s*stroke: var\(--hf-colour-outcome-win\)/u)
    expect(css).toMatch(/\.hf-match-event-icon-arrow-out \{\s*stroke: var\(--hf-colour-outcome-loss\)/u)
  })

  it('gives a card a rim in the colour of the text and fills from the card tokens', () => {
    expect(css).toMatch(/\.hf-match-event-icon-card \{\s*stroke: var\(--hf-colour-text-default\)/u)
    expect(css).toMatch(/\.hf-match-event-icon-yellow \{\s*fill: var\(--hf-colour-card-yellow\)/u)
    expect(css).toMatch(/\.hf-match-event-icon-red \{\s*fill: var\(--hf-colour-card-red\)/u)
  })
})

describe('the colours of the cards', () => {
  const surfaces = ['surface', 'page', 'surface-strong', 'surface-soft', 'surface-warm'].map((name) =>
    role(`background-${name}`),
  )
  const rim = role('text-default')

  it.each(['light', 'dark'] as const)('has a rim that reaches 3:1 on every surface in %s', (theme) => {
    for (const surface of surfaces) {
      expect(contrast(rim[theme], surface[theme])).toBeGreaterThanOrEqual(3)
    }
  })

  it.each(['light', 'dark'] as const)('has fills that stay apart from each other and from the rim in %s', (theme) => {
    const yellow = role('card-yellow')[theme]
    const red = role('card-red')[theme]

    expect(yellow).not.toBe(red)
    expect(contrast(yellow, rim[theme])).toBeGreaterThanOrEqual(1.2)
    expect(contrast(red, rim[theme])).toBeGreaterThanOrEqual(1.2)
  })

  it('has a pair for light and one for dark, and a fallback for a browser without light-dark()', () => {
    const tokens = readFileSync(join(import.meta.dirname, '../../tokens/colour.css'), 'utf8')

    expect(tokens).toMatch(
      /--hf-colour-card-yellow: light-dark\(var\(--hf-colour-yellow-400\), var\(--hf-colour-yellow-300\)\)/u,
    )
    expect(tokens).toMatch(
      /--hf-colour-card-red: light-dark\(var\(--hf-colour-red-600\), var\(--hf-colour-red-400\)\)/u,
    )
    expect(tokens).toMatch(/ {6}--hf-colour-card-yellow: var\(--hf-colour-yellow-400\);/u)
    expect(tokens).toMatch(/ {6}--hf-colour-card-red: var\(--hf-colour-red-600\);/u)
  })
})
