import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, role } from '../../tokens/colourRoles'

const css = readFileSync(join(import.meta.dirname, 'player-name.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
const rule = (selector: string) => css.match(new RegExp(String.raw`${selector} \{([^{}]*)\}`))?.[1] ?? ''

const surfaces = ['surface', 'surface-strong', 'surface-soft', 'surface-warm'] as const

describe('the line round a flag in player-name.css', () => {
  it('is the darker line of the card the name stands in, with the darker line of the surface as its fallback', () => {
    expect(rule(String.raw`\.hf-player-name-flag`)).toContain(
      'border: 1px solid var(--hf-card-line-strong, var(--hf-colour-line-darker-surface));',
    )
  })

  it('sits tight round the drawing, with no space between the line and the flag', () => {
    expect(rule(String.raw`\.hf-player-name-flag`)).not.toContain('padding')
  })

  it('makes only the flag and the name a link, not the empty place beside them', () => {
    const body = rule(String.raw`\.hf-player-name-link`)

    expect(body).toContain('display: inline-flex;')
    expect(body).toContain('flex: 0 1 auto;')
    expect(body).toContain('align-self: flex-start;')
  })

  it('keeps the size of the flag and of the empty place the same, so the names stay in line', () => {
    const body = rule(String.raw`\.hf-player-name-flag`)

    expect(body).toMatch(/inline-size: 1\.25rem;/u)
    expect(body).toMatch(/block-size: 0\.9375rem;/u)
    expect(body).toMatch(/flex: none;/u)
    expect(rule(String.raw`span\.hf-player-name-flag:not\(\.hf-player-name-code\)`)).toContain(
      'border-color: transparent;',
    )
  })

  it('gives the code frame the line of a flag, and letters that read on every surface in light and dark', () => {
    expect(rule(String.raw`\.hf-player-name-code`)).toContain('color: var(--hf-colour-text-default);')

    for (const name of surfaces) {
      const text = role('text-default')
      const background = role(`background-${name}`)

      expect(contrast(text.light, background.light), name).toBeGreaterThanOrEqual(4.5)
      expect(contrast(text.dark, background.dark), name).toBeGreaterThanOrEqual(4.5)
    }
  })
})
