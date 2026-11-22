import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CardLink, leavesTheSite } from './CardLink'

describe('CardLink', () => {
  it('is a link on a line of its own, named by its text, with an arrow behind it', () => {
    const { container } = render(<CardLink href="/fans/prognose/spelregels">Spelregels</CardLink>)
    const link = screen.getByRole('link', { name: 'Spelregels' })

    expect(link.getAttribute('href')).toBe('/fans/prognose/spelregels')
    expect(link.parentElement?.tagName).toBe('P')
    expect(container.querySelector('svg')).not.toBeNull()
    expect(link.querySelector('.hf-icon-tail')?.textContent).toBe('Spelregels')
  })

  it('keeps the arrow with the last word of a long text', () => {
    render(<CardLink href="/wedstrijden">Alle wedstrijden van het seizoen</CardLink>)

    expect(screen.getByRole('link').querySelector('.hf-icon-tail')?.textContent).toBe('seizoen')
  })

  it('says in hidden text that a link to another site leaves the site, in its name', () => {
    render(<CardLink href="https://forum.heerenveen.org">Naar het forum</CardLink>)
    const link = screen.getByRole('link', { name: 'Naar het forum (externe site)' })

    expect(link.querySelector('.hf-visually-hidden')?.textContent).toBe('(externe site)')
  })

  it('adds no hidden text to a link on our own site', () => {
    render(<CardLink href="/nieuws">Meer nieuws</CardLink>)

    expect(screen.getByRole('link').querySelector('.hf-visually-hidden')).toBeNull()
  })

  it('keeps "(externe site)" in the name of an external link that has a label', () => {
    render(
      <CardLink aria-label="Lees verder over de winst" href="https://example.org/winst">
        Lees verder
      </CardLink>,
    )

    expect(screen.getByRole('link', { name: 'Lees verder over de winst (externe site)' })).toBeTruthy()
  })

  it('keeps the other attributes of a link', () => {
    render(
      <CardLink aria-label="Lees verder over de winst" href="/redactie/winst">
        Lees verder
      </CardLink>,
    )

    expect(screen.getByRole('link', { name: 'Lees verder over de winst' })).toBeTruthy()
  })
})

describe('leavesTheSite', () => {
  it.each([
    ['https://forum.heerenveen.org', true],
    ['http://example.org/a', true],
    ['/fans', false],
    ['/wedstrijden#stand', false],
    ['#top', false],
  ])('says %s leaves the site: %s', (href, expected) => {
    expect(leavesTheSite(href)).toBe(expected)
  })
})
