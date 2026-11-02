import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { Tile, tileLevels } from './Tile'

// The CSS is read as text: jsdom doesn't apply rules in a cascade layer.
const css = readFileSync(join(import.meta.dirname, 'tile.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const tile = (props: Partial<React.ComponentProps<typeof Tile>> = {}) => (
  <Tile.Grid aria-label="De schermen">
    <Tile href="/beheer/wedstrijden" level={2} title="Wedstrijden" {...{ icon: 'ball', ...props }}>
      Vul wedstrijden in of verbeter ze.
    </Tile>
  </Tile.Grid>
)

describe('Tile', () => {
  it('is a list item in a named list, so a screen reader says how many there are', () => {
    render(
      <Tile.Grid aria-label="De schermen">
        <Tile href="/a" level={2} title="A">
          Een
        </Tile>
        <Tile href="/b" level={2} title="B">
          Twee
        </Tile>
      </Tile.Grid>,
    )
    const list = screen.getByRole('list', { name: 'De schermen' })

    expect(list.tagName).toBe('UL')
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
  })

  it('is one link whose text is the heading, so the link is named by the name of the place', () => {
    render(tile())
    const heading = screen.getByRole('heading', { level: 2 })
    const link = screen.getByRole('link')

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(link.textContent).toBe('Wedstrijden')
    expect(link.getAttribute('href')).toBe('/beheer/wedstrijden')
    expect(heading.contains(link)).toBe(true)
    expect(screen.getByRole('link', { name: 'Wedstrijden' })).toBe(link)
  })

  it.each(tileLevels)('makes the heading an h%i', (level) => {
    render(tile({ level }))

    expect(screen.getByRole('heading', { level }).textContent).toBe('Wedstrijden')
  })

  it('shows the description under the heading', () => {
    render(tile())

    expect(screen.getByText('Vul wedstrijden in of verbeter ze.').tagName).toBe('P')
  })

  it('draws the icon in front of the text, hidden from assistive technology', () => {
    const { container } = render(tile())
    const icon = container.querySelector('.hf-tile-icon svg')

    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.hf-tile')?.firstElementChild?.className).toBe('hf-tile-icon hf-space-end-0')
  })

  it('has no icon, and no space for it, when it has none', () => {
    const { container } = render(
      <Tile.Grid aria-label="De schermen">
        <Tile href="/a" level={2} title="A">
          Een
        </Tile>
      </Tile.Grid>,
    )

    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('.hf-tile-icon')).toBeNull()
  })

  it('is a card, and keeps a class of its own and the other attributes on the item', () => {
    const { container } = render(tile({ className: 'extra', id: 'tegel' }))
    const item = container.querySelector('li')

    expect(item?.className).toBe('hf-tile-item extra')
    expect(item?.id).toBe('tegel')
    expect(item?.querySelector('.hf-card.hf-tile')).not.toBeNull()
  })
})

describe('the CSS of the tile', () => {
  it('makes the whole tile the area of the link, with one focus ring around the tile', () => {
    expect(css).toMatch(/&::after\s*{[^}]*content:\s*''[^}]*inset:\s*0[^}]*position:\s*absolute/)
    // The ring is on the ::after that covers the tile, and the words of the heading have none.
    expect(css).toMatch(/&:focus-visible\s*{\s*outline:\s*none;\s*&::after\s*{[^}]*outline:\s*0\.1875rem solid/)
  })

  it('puts the tiles side by side where they fit and under each other on a narrow screen, without a media query', () => {
    expect(css).toMatch(/grid-template-columns:\s*repeat\(auto-fill, minmax\(min\(100%, 15rem\), 1fr\)\)/)
    expect(css).not.toContain('@media')
  })

  it('takes every colour from a token', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i)
  })
})
