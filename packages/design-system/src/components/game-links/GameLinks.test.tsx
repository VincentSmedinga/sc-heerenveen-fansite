import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { type GameLinkItem, GameLinks } from './GameLinks'

const match = 'sc Heerenveen – FC Twente'

const items: GameLinkItem[] = [
  { game: 'prognose', href: '/fans/prognose', match, text: 'Wat denk je dat het wordt?' },
  { game: 'fjouwer', href: '/fans/fjouwer', match, text: 'Welke fjouwer stel jij op?' },
]

describe('GameLinks', () => {
  it('names each link by its text and then the match', () => {
    render(<GameLinks items={items} />)

    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/fans/prognose',
      '/fans/fjouwer',
    ])
    expect(screen.getByRole('link', { name: `Wat denk je dat het wordt? ${match}` })).toBeDefined()
    expect(screen.getByRole('link', { name: `Welke fjouwer stel jij op? ${match}` })).toBeDefined()
  })

  it('has the icon of the game and an arrow, both hidden from a screen reader', () => {
    const { container } = render(<GameLinks items={items} />)
    const icons = [...container.querySelectorAll('svg')]

    expect(icons).toHaveLength(4)
    expect(icons.every((icon) => icon.getAttribute('aria-hidden') === 'true')).toBe(true)
  })

  it('keeps its space above it under the last match of a list, which has none of its own', () => {
    const css = readFileSync(join(import.meta.dirname, 'game-links.css'), 'utf8')

    expect(css).toMatch(/li:last-child > \.hf-match \+ \.hf-game-links \{\s*padding-block: var\(--hf-space-m\) 0;/)
  })

  it('is nothing without a game', () => {
    expect(render(<GameLinks items={[]} />).container.innerHTML).toBe('')
  })
})
