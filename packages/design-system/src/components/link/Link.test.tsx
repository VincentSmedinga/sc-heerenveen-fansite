import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Link, linkIcons } from './Link'

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

  it('has no icon and no extra markup without the prop icon', () => {
    render(<Link href="/bronnen">Onze bronnen</Link>)

    expect(screen.getByRole('link').innerHTML).toBe('Onze bronnen')
  })

  it.each(['arrow-right', 'external-link'] as const)('puts the icon %s behind the text, with the last word', (icon) => {
    render(
      <Link href="/podcasts" icon={icon}>
        Alle podcasts
      </Link>,
    )
    const link = screen.getByRole('link')

    expect(link.innerHTML).toMatch(/^Alle <span class="hf-icon-tail">podcasts<svg [^>]*class="hf-icon"/)
    expect(link.lastElementChild?.lastElementChild?.tagName).toBe('svg')
  })

  it('puts the arrow to the left in front of the text, because it points back', () => {
    render(
      <Link href="/podcasts" icon="arrow-left">
        Vorige
      </Link>,
    )

    expect(screen.getByRole('link').innerHTML).toMatch(
      /^<span class="hf-icon-head"><svg [^>]*class="hf-icon"[^>]*>.*<\/svg>Vorige<\/span>$/,
    )
  })

  it('is named by its text alone: the icon is hidden from assistive technology', () => {
    render(
      <Link href="https://forum.heerenveen.org" icon="external-link">
        Naar het forum
      </Link>,
    )

    expect(screen.getByRole('link', { name: 'Naar het forum' }).querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

  it('puts the envelope in front of an address, with its first letter, because it says what the link does', () => {
    render(
      <Link href="mailto:fansite@heerenveen.org" icon="envelope">
        fansite@heerenveen.org
      </Link>,
    )
    const link = screen.getByRole('link', { name: 'fansite@heerenveen.org' })

    expect(link.innerHTML).toMatch(
      /^<span class="hf-icon-head"><svg [^>]*class="hf-icon"[^>]*>.*<\/svg>f<\/span>ansite@heerenveen\.org$/,
    )
    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('knows where each icon stands: behind the text, except the ones that stand in front', () => {
    expect(linkIcons).toEqual({
      'arrow-left': 'before',
      'arrow-right': 'after',
      envelope: 'before',
      'external-link': 'after',
    })
  })

  it('only takes the icons of the list', () => {
    const elements = [
      // @ts-expect-error A link has no plus.
      <Link href="/" icon="plus">
        Meer
      </Link>,
    ]

    expect(elements).toHaveLength(1)
  })

  it('needs an href', () => {
    const elements = [
      // @ts-expect-error A link without a destination is not a link.
      <Link>Nergens</Link>,
    ]

    expect(elements).toHaveLength(1)
  })
})
