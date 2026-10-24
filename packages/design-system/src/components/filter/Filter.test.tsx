import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Filter } from './Filter'

const items = [
  { href: '/podcasts', label: 'Alle podcasts' },
  { current: true, href: '/podcasts?podcast=omroep-abe', label: 'Omroep Abe' },
  { href: '/podcasts?podcast=radio-camataru', label: 'Radio Camataru' },
]

describe('Filter', () => {
  it('is a nav with a name for screen readers, holding a link for each choice', () => {
    render(<Filter items={items} label="Podcasts filteren" />)
    const nav = screen.getByRole('navigation', { name: 'Podcasts filteren' })

    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Alle podcasts', '/podcasts'],
      ['Omroep Abe', '/podcasts?podcast=omroep-abe'],
      ['Radio Camataru', '/podcasts?podcast=radio-camataru'],
    ])
  })

  it('marks only the choice the visitor made with aria-current="page"', () => {
    render(<Filter items={items} label="Podcasts filteren" />)

    expect(screen.getByRole('link', { current: 'page' }).textContent).toBe('Omroep Abe')
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  it('marks no choice when the items have none', () => {
    render(<Filter items={items.map(({ href, label }) => ({ href, label }))} label="Podcasts filteren" />)

    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0)
  })

  it('has the class of its own next to the class of a navigation, and keeps the other attributes', () => {
    render(<Filter className="extra" id="filter" items={items} label="Podcasts filteren" />)
    const nav = screen.getByRole('navigation')

    expect(nav.className).toBe('hf-navigation hf-filter extra')
    expect(nav.id).toBe('filter')
  })
})
