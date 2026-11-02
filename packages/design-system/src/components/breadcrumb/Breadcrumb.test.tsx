import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Breadcrumb } from './Breadcrumb'

const items = [
  { href: '/beheer', label: 'Beheer' },
  { href: '/beheer/wedstrijden', label: 'Wedstrijden' },
]

describe('Breadcrumb', () => {
  it('is a nav with a name for screen readers, holding an ordered list', () => {
    render(<Breadcrumb current="Testclub - Testvoort" items={items} label="Kruimelpad" />)
    const nav = screen.getByRole('navigation', { name: 'Kruimelpad' })

    expect(within(nav).getByRole('list').tagName).toBe('OL')
    expect(within(nav).getAllByRole('listitem')).toHaveLength(3)
  })

  it('has a link for each page above the current one, the highest first', () => {
    render(<Breadcrumb current="Testclub - Testvoort" items={items} label="Kruimelpad" />)

    expect(screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Beheer', '/beheer'],
      ['Wedstrijden', '/beheer/wedstrijden'],
    ])
  })

  it('ends with the current page as text without a link, marked with aria-current="page"', () => {
    render(<Breadcrumb current="Testclub - Testvoort" items={items} label="Kruimelpad" />)
    const last = screen.getAllByRole('listitem').at(-1)

    expect(within(last!).queryByRole('link')).toBeNull()
    expect(within(last!).getByText('Testclub - Testvoort').getAttribute('aria-current')).toBe('page')
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  it('has only the current page when there are no pages above it', () => {
    render(<Breadcrumb current="Beheer" items={[]} label="Kruimelpad" />)

    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('has no text between the crumbs for a screen reader', () => {
    render(<Breadcrumb current="Testclub - Testvoort" items={items} label="Kruimelpad" />)

    expect(screen.getByRole('navigation').textContent).toBe('BeheerWedstrijdenTestclub - Testvoort')
  })

  it('has the class of a navigation and one of its own next to the class passed in, and keeps the other attributes', () => {
    render(<Breadcrumb className="extra" current="Beheer" id="pad" items={[]} label="Kruimelpad" />)
    const nav = screen.getByRole('navigation')

    expect(nav.className).toBe('hf-navigation hf-breadcrumb extra')
    expect(nav.id).toBe('pad')
  })
})
