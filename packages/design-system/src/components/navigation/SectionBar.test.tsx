import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { SectionBar } from './SectionBar'

const items = [
  { href: '/beheer', label: 'Beheer' },
  { current: true, href: '/beheer/berichten', label: 'Berichten' },
]

describe('SectionBar', () => {
  it('is a nav with a name of its own, holding a list of the screens', () => {
    render(<SectionBar items={items} label="Beheer" />)
    const nav = screen.getByRole('navigation', { name: 'Beheer' })

    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/beheer', '/beheer/berichten'])
    expect(within(nav).getAllByRole('listitem')).toHaveLength(2)
  })

  it('marks only the current screen with aria-current="page"', () => {
    render(<SectionBar items={items} label="Beheer" />)

    expect(screen.getByRole('link', { name: 'Berichten' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Beheer' }).hasAttribute('aria-current')).toBe(false)
  })

  it('draws the account beside the navigation, not inside it', () => {
    render(<SectionBar account={<button type="button">Uitloggen</button>} items={items} label="Beheer" />)

    const nav = screen.getByRole('navigation', { name: 'Beheer' })
    const button = screen.getByRole('button', { name: 'Uitloggen' })

    expect(nav.contains(button)).toBe(false)
    expect(nav.parentElement?.contains(button)).toBe(true)
  })

  it('draws no empty account without one', () => {
    const { container } = render(<SectionBar items={items} label="Beheer" />)

    expect(container.querySelector('.hf-section-bar-account')).toBeNull()
  })
})

describe('the look of the bar', () => {
  const css = readFileSync(join(import.meta.dirname, 'section-bar.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

  it('takes its colours from the roles of the tokens, and writes none itself', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(|color-mix\(/i)
    expect(css).not.toMatch(/--hf-colour-(blue|red|grey|sand|steel)-\d+/)
    expect(css).toContain('var(--hf-colour-background-submenu)')
    expect(css).toContain('var(--hf-colour-text-on-header)')
  })

  it('puts the account under the links on a narrow screen and beside them from 52rem', () => {
    expect(css).toMatch(/flex-wrap: wrap;/)
    expect(css).toMatch(/@media \(width >= 52rem\)/)
  })
})
