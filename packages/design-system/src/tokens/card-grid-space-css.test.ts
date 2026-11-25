import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = (file: string) =>
  readFileSync(join(import.meta.dirname, '..', 'components', file), 'utf8').replace(/\/\*.*?\*\//gs, '')

// A card in a grid inside a column stands as far from its neighbour as the cards of the page
// do from each other.
describe('the space between cards in a grid', () => {
  it.each([
    ['card-columns/card-columns.css', '.hf-card-columns-grid'],
    ['key-figures/key-figures.css', '.hf-key-figures'],
    ['open-game-cards/open-game-cards.css', '.hf-open-game-cards'],
    ['question-card/question-card.css', '.hf-question-grid'],
    ['tile/tile.css', '.hf-tile-grid'],
  ])('is the space of the grid of the page in %s', (file, selector) => {
    const rules = [...css(file).matchAll(/([^{}]+)\{(?=([^{}]*))/g)].filter(([, name]) => name?.trim() === selector)

    expect(rules.map(([, , body]) => body).join('')).toContain('gap: var(--hf-space-xl);')
  })

  it('is counted in the widths of the cards that share a row', () => {
    for (const file of ['key-figures/key-figures.css', 'question-card/question-card.css']) {
      expect(css(file), file).toContain('var(--hf-space-xl)) / ')
      expect(css(file), file).not.toMatch(/100% -[^;]*--hf-space-m/)
    }
  })
})
