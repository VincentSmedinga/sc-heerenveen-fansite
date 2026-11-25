import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { type OpenGameCardItem, OpenGameCards } from './OpenGameCards'

const prognose: OpenGameCardItem = {
  game: 'prognose',
  href: '/fans/prognose',
  link: 'Voorspel de uitslag',
  linkName: 'Voorspel de uitslag van sc Heerenveen – FC Twente',
  name: 'Prognose',
}

const uitblinker: OpenGameCardItem = { ...prognose, game: 'uitblinker', name: 'Uitblinker' }

describe('OpenGameCards', () => {
  it('has a card for each game, in order, each named by its h2', () => {
    render(<OpenGameCards items={[prognose, uitblinker]} />)

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Prognose',
      'Uitblinker',
    ])
    expect(screen.getByRole('region', { name: 'Uitblinker' }).className).toContain('hf-card-game-uitblinker')
    expect(screen.getByRole('region', { name: 'Prognose' }).className).not.toContain('hf-card-soft')
  })

  it('has a link that is named by what it is about, and no tag', () => {
    const { container } = render(<OpenGameCards items={[prognose]} />)

    expect(
      screen.getByRole('link', { name: 'Voorspel de uitslag van sc Heerenveen – FC Twente' }).getAttribute('href'),
    ).toBe('/fans/prognose')
    expect(container.querySelector('.hf-tag')).toBeNull()
  })

  it('is nothing without a game', () => {
    expect(render(<OpenGameCards items={[]} />).container.innerHTML).toBe('')
  })

  it('puts the cards below each other, with their own padding and heading size', () => {
    const css = readFileSync(join(import.meta.dirname, 'open-game-cards.css'), 'utf8')

    expect(css).toContain('grid-template-columns: minmax(0, 1fr);')
    expect(css.match(/grid-template-columns/g)).toHaveLength(1)
    expect(css).not.toMatch(/--hf-card-padding|font-size|@container/)
  })
})
