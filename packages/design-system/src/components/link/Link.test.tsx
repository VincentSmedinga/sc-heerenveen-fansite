import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Link } from './Link'

describe('Link', () => {
  it('is a link, named by its text, that goes to its href', () => {
    render(<Link href="https://www.omropfryslan.nl/">Omrop Fryslân</Link>)
    const link = screen.getByRole('link', { name: 'Omrop Fryslân' })

    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('https://www.omropfryslan.nl/')
  })

  it('keeps the other attributes', () => {
    render(
      <Link className="extra" href="/nieuws" rel="noopener">
        Nieuws
      </Link>,
    )
    const link = screen.getByRole('link')

    expect(link.className).toBe('extra')
    expect(link.getAttribute('rel')).toBe('noopener')
  })

  it('needs an href', () => {
    const elements = [
      // @ts-expect-error A link without a destination is not a link.
      <Link>Nergens</Link>,
    ]

    expect(elements).toHaveLength(1)
  })
})
