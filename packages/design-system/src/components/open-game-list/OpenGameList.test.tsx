import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { OpenGameList, type OpenGameListItem } from './OpenGameList'

const prognose: OpenGameListItem = {
  href: '/fans/prognose',
  link: 'Voorspel',
  linkName: 'Voorspel sc Heerenveen – FC Twente',
  name: 'Prognose',
  sentence: 'Voorspel sc Heerenveen – FC Twente. Kan tot zaterdag 16.45 uur.',
}

describe('OpenGameList', () => {
  it('is a list with a row for each game', () => {
    render(<OpenGameList items={[prognose, { ...prognose, href: '/fans/uitblinker', name: 'Uitblinker' }]} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('says the name, a dash and the sentence, and ends with the link', () => {
    render(<OpenGameList items={[prognose]} />)
    const row = screen.getByRole('listitem')
    const link = within(row).getByRole('link', { name: 'Voorspel sc Heerenveen – FC Twente' })

    expect(row.textContent).toBe('Prognose — Voorspel sc Heerenveen – FC Twente. Kan tot zaterdag 16.45 uur.Voorspel')
    expect(link.getAttribute('href')).toBe('/fans/prognose')
    expect(link.textContent).toBe('Voorspel')
  })

  it('names the link by its words when there is no longer name', () => {
    render(<OpenGameList items={[{ ...prognose, linkName: undefined }]} />)

    expect(screen.getByRole('link', { name: 'Voorspel' })).toBeTruthy()
  })
})

describe('the look of the list', () => {
  const css = readFileSync(join(import.meta.dirname, 'open-game-list.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

  it('puts the link in a column of its own', () => {
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) max-content;')
  })
})
