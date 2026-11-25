import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, fallback, role } from '../../tokens/colourRoles'
import { cardGames } from './Card'

const css = readFileSync(join(import.meta.dirname, 'card-watermark.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

// The text a card holds: the text, the secondary text and a link. The heading of a game card
// has the colour of its game.
const texts = ['text-default', 'text-secondary', 'text-link'] as const

const rule = (game: string) => css.match(new RegExp(String.raw`\.hf-card-game-${game} \{([^{}]*)\}`))?.[1] ?? ''

describe('the watermark of a game card in card-watermark.css', () => {
  it.each(cardGames)('keeps 4,5:1 for all the text of %s on the card and its watermark', (game) => {
    const surface = role('background-surface')
    const watermark = role(`watermark-${game}`)

    for (const text of [...texts, `text-heading-${game}`]) {
      for (const background of [surface, watermark]) {
        expect(contrast(role(text).light, background.light), `${text} in light`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(role(text).dark, background.dark), `${text} in dark`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  // One card stands out on the soft surface (Uitblinker van het jaar).
  it.each(cardGames)('keeps 4,5:1 for all the text of %s on a soft card', (game) => {
    const soft = role('background-surface-soft')

    for (const text of [...texts, `text-heading-${game}`]) {
      expect(contrast(role(text).light, soft.light), `${text} in light`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(role(text).dark, soft.dark), `${text} in dark`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(cardGames)('gives %s a watermark that shows on the card, in light and in dark', (game) => {
    const watermark = role(`watermark-${game}`)
    const surface = role('background-surface')

    expect(watermark.light).not.toBe(surface.light)
    expect(watermark.dark).not.toBe(surface.dark)
  })

  it.each(cardGames)('has the light colours of %s in a browser without light-dark()', (game) => {
    expect(fallback(`watermark-${game}`)).toBe(role(`watermark-${game}`).light)
    expect(fallback(`text-heading-${game}`)).toBe(role(`text-heading-${game}`).light)
  })

  it.each(cardGames)('paints the watermark and the headings of %s in its own colour', (game) => {
    const body = rule(game)

    expect(body).toContain(`--hf-card-watermark-colour: var(--hf-colour-watermark-${game});`)
    expect(body).toContain(`--hf-card-heading-colour: var(--hf-colour-text-heading-${game});`)
  })

  it('colours the headings of a game card that is not transparent', () => {
    expect(css).toMatch(
      /\.hf-card-game:not\(\.hf-card-transparent\) :is\(h1, h2, h3, h4, h5\) \{\s*color: var\(--hf-card-heading-colour\);/,
    )
  })

  it('takes 60% of the width of the card', () => {
    expect(css).toContain('inline-size: 60%;')
  })

  it.each(cardGames)('draws %s as a mask in SVG in the file, without a request to another address', (game) => {
    const body = rule(game)

    expect(body).toMatch(/--hf-card-watermark-image: url\(['"]data:image\/svg\+xml,/)
    // The only address is the namespace of SVG, which is a name and no request.
    expect(body.replace('http://www.w3.org/2000/svg', '')).not.toMatch(/https?:/)
  })

  it('draws the star of the Uitblinker in ten facets, every other one weaker', () => {
    const body = css.match(/\.hf-card-game-uitblinker \{([^{}]*)\}/)?.[1] ?? ''

    expect(body.match(/%3Cpath /g)).toHaveLength(10)
    expect(body.match(/fill-opacity=%22\.6%22/g)).toHaveLength(5)
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
