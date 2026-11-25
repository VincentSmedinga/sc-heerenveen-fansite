import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { type OpenGameCardItem, OpenGameCards } from './OpenGameCards'

const prognose: OpenGameCardItem = {
  game: 'prognose',
  href: '/fans/prognose',
  link: 'Voorspel',
  linkName: 'Voorspel sc Heerenveen – FC Twente',
  name: 'Prognose',
  tag: 'Open tot za 16.45',
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
    expect(screen.getByRole('region', { name: 'Prognose' }).className).toContain('hf-card-soft')
  })

  it('says until when it is open in a green tag, with a link that is named by what it is about', () => {
    render(<OpenGameCards items={[prognose]} />)

    expect(screen.getByText('Open tot za 16.45').className).toContain('hf-tag-open')
    expect(screen.getByRole('link', { name: 'Voorspel sc Heerenveen – FC Twente' }).getAttribute('href')).toBe(
      '/fans/prognose',
    )
  })

  it('is nothing without a game', () => {
    expect(render(<OpenGameCards items={[]} />).container.innerHTML).toBe('')
  })

  it('keeps two cards beside each other at every width', () => {
    const css = readFileSync(join(import.meta.dirname, 'open-game-cards.css'), 'utf8')

    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));')
    expect(css.match(/grid-template-columns/g)).toHaveLength(1)
  })

  it('makes the name smaller in a narrow card, so Uitblinker stays in one piece', () => {
    const css = readFileSync(join(import.meta.dirname, 'open-game-cards.css'), 'utf8')

    expect(css).toMatch(/@container \(width < 8rem\) \{[^}]*font-size: var\(--hf-heading-4-font-size\);/)
  })
})
