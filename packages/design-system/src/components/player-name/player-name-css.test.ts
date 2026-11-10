import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, role } from '../../tokens/colourRoles'

const css = readFileSync(join(import.meta.dirname, 'player-name.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
const rule = (selector: string) => css.match(new RegExp(String.raw`${selector} \{([^{}]*)\}`))?.[1] ?? ''

const surfaces = ['surface', 'surface-strong', 'surface-soft', 'surface-warm'] as const

describe('the line round a flag in player-name.css', () => {
  it('is the graphic line of the card the name stands in, with the line of the surface as its fallback', () => {
    expect(rule(String.raw`\.hf-player-name-flag`)).toContain(
      'border: 1px solid var(--hf-card-line-graphic, var(--hf-colour-line-graphic-surface));',
    )
  })

  it.each(surfaces)('reaches 3:1 against the surface %s in light and in dark, so a white flag shows', (name) => {
    const line = role(`line-graphic-${name}`)
    const background = role(`background-${name}`)

    expect(contrast(line.light, background.light)).toBeGreaterThanOrEqual(3)
    expect(contrast(line.dark, background.dark)).toBeGreaterThanOrEqual(3)
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
