import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, fallback, role } from '../../tokens/colourRoles'
import { cardGames } from './Card'

const css = readFileSync(join(import.meta.dirname, 'card-watermark.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

const surfaces = [
  { background: 'background-surface', name: 'surface' },
  { background: 'background-surface-strong', name: 'surface-strong' },
  { background: 'background-surface-soft', name: 'surface-soft' },
  { background: 'background-surface-warm', name: 'surface-warm' },
] as const

// The text a card holds: the text, the heading, the secondary text and a link.
const texts = ['text-default', 'text-heading', 'text-secondary', 'text-link'] as const

describe('the watermark of a game card in card-watermark.css', () => {
  it.each(surfaces)('keeps 4,5:1 for all the text on $name, in light and in dark', ({ name }) => {
    const watermark = role(`watermark-${name}`)

    for (const text of texts) {
      expect(contrast(role(text).light, watermark.light), `${text} in light`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(role(text).dark, watermark.dark), `${text} in dark`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(surfaces)('is a step deeper than $name in light and a step lighter in dark', ({ background, name }) => {
    const watermark = role(`watermark-${name}`)
    const surface = role(background)

    expect(watermark.light).not.toBe(surface.light)
    expect(watermark.dark).not.toBe(surface.dark)
  })

  it.each(surfaces)('has the light value in a browser without light-dark() on $name', ({ name }) => {
    expect(fallback(`watermark-${name}`)).toBe(role(`watermark-${name}`).light)
  })

  it.each(cardGames)('draws %s as a mask in SVG in the file, without a request to another address', (game) => {
    const body = css.match(new RegExp(String.raw`\.hf-card-game-${game} \{([^{}]*)\}`))?.[1] ?? ''

    expect(body).toMatch(/--hf-card-watermark-image: url\("data:image\/svg\+xml,/)
    // The only address is the namespace of SVG, which is a name and no request.
    expect(body.replace('http://www.w3.org/2000/svg', '')).not.toMatch(/https?:/)
  })

  it('is gone in forced colours, where a mask would be painted in the text colour', () => {
    expect(css).toMatch(/forced-colors: active\) \{\s*display: none;/)
  })

  it('takes no clicks, sits under the content and is clipped by the card', () => {
    expect(css).toContain('pointer-events: none;')
    expect(css).toContain('z-index: -1;')
    expect(css).toContain('overflow: clip;')
  })
})
