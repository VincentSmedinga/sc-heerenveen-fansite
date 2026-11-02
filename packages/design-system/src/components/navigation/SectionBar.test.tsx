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
})

describe('the button at the end', () => {
  const end = { action: () => undefined, label: 'Uitloggen' }

  it('is the last item of the list in the same nav, as a button in a form', () => {
    render(<SectionBar end={end} items={items} label="Beheer" />)
    const nav = screen.getByRole('navigation', { name: 'Beheer' })
    const listItems = within(nav).getAllByRole('listitem')
    const button = within(nav).getByRole('button', { name: 'Uitloggen' })

    expect(listItems).toHaveLength(3)
    expect(listItems.at(-1)?.contains(button)).toBe(true)
    expect(button.getAttribute('type')).toBe('submit')
    expect(button.closest('form')).not.toBeNull()
    expect(within(nav).getAllByRole('link')).toHaveLength(2)
  })

  it('is not there without it, and the links stay as they were', () => {
    render(<SectionBar items={items} label="Beheer" />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('comes after the last link in the document, so the keyboard reaches it after the links', () => {
    render(<SectionBar end={end} items={items} label="Beheer" />)

    const lastLink = screen.getAllByRole('link').at(-1)!

    expect(lastLink.compareDocumentPosition(screen.getByRole('button', { name: 'Uitloggen' }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
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

  it('puts the button at the end of a bar that is wider than the row, and keeps it a pill', () => {
    expect(css).toMatch(/\.hf-section-bar-list \{[^}]*min-inline-size: 100%/)
    expect(css).toMatch(/\.hf-section-bar-end \{[^}]*margin-inline-start: auto/)
    expect(css).toMatch(/:where\(\.hf-section-bar-end \.hf-navigation-sublink\) \{[^}]*border: 0/)
  })
})
