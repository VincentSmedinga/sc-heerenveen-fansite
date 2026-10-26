import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { Heading } from '../heading/Heading'
import { Page } from '../page/Page'
import { Card, cardElements, cardSurfaces } from './Card'

describe('Card', () => {
  it('is a section with the white surface by default', () => {
    const { container } = render(<Card>Inhoud</Card>)

    expect(container.firstElementChild?.tagName).toBe('SECTION')
    expect(container.firstElementChild?.className).toBe('hf-card')
    expect(container.firstElementChild?.textContent).toBe('Inhoud')
  })

  it.each(cardElements)('can be a %s', (element) => {
    const { container } = render(<Card as={element}>Inhoud</Card>)

    expect(container.firstElementChild?.tagName.toLowerCase()).toBe(element)
    expect(container.firstElementChild?.className).toBe('hf-card')
    expect(container.firstElementChild?.hasAttribute('as')).toBe(false)
  })

  it('has the white surface when it is asked for', () => {
    const { container } = render(<Card surface="default">Inhoud</Card>)

    expect(container.firstElementChild?.className).toBe('hf-card')
    expect(container.firstElementChild?.hasAttribute('surface')).toBe(false)
  })

  it.each(cardSurfaces.filter((surface) => surface !== 'default'))('has the %s surface', (surface) => {
    const { container } = render(<Card surface={surface}>Inhoud</Card>)

    expect(container.firstElementChild?.className).toBe(`hf-card hf-card-${surface}`)
    expect(container.firstElementChild?.hasAttribute('surface')).toBe(false)
  })

  it('can combine any element with any surface', () => {
    const { container } = render(
      <Card as="aside" surface="warm">
        Inhoud
      </Card>,
    )

    expect(container.firstElementChild?.tagName).toBe('ASIDE')
    expect(container.firstElementChild?.className).toBe('hf-card hf-card-warm')
  })

  it('takes its name from its heading when it is a section with aria-labelledby', () => {
    render(
      <Card aria-labelledby="kop">
        <Heading id="kop" level={2}>
          Nieuws
        </Heading>
      </Card>,
    )

    expect(screen.getByRole('region', { name: 'Nieuws' }).className).toBe('hf-card')
  })

  it('is a region only when it has a name, as any section is', () => {
    render(<Card>Inhoud</Card>)

    expect(screen.queryByRole('region')).toBeNull()
  })

  it('is an article, or a complementary landmark, when it is one of those', () => {
    render(
      <>
        <Card aria-label="Verslag" as="article">
          Inhoud
        </Card>
        <Card aria-label="Zijkant" as="aside">
          Inhoud
        </Card>
      </>,
    )

    expect(screen.getByRole('article', { name: 'Verslag' })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Zijkant' })).toBeTruthy()
  })

  it('is a cell of its own in a column, like any other child of the column', () => {
    render(
      <Page.Main>
        <Card aria-label="Een">Een</Card>
        <Card aria-label="Twee">Twee</Card>
      </Page.Main>,
    )

    expect(Array.from(screen.getByRole('main').children).map((child) => child.textContent)).toEqual(['Een', 'Twee'])
    expect(screen.getAllByRole('region')).toHaveLength(2)
  })

  it('keeps the other attributes and adds a class to its own', () => {
    const { container } = render(
      <Card className="extra" id="kaart" surface="soft">
        Inhoud
      </Card>,
    )

    expect(container.firstElementChild?.className).toBe('hf-card hf-card-soft extra')
    expect(container.firstElementChild?.id).toBe('kaart')
  })

  it('allows no other element or surface', () => {
    const elements = [
      // @ts-expect-error A main is not an element a Card can be.
      <Card as="main" />,
      // @ts-expect-error A card has no surface called dark: the theme sets the colours.
      <Card surface="dark" />,
    ]

    expect(elements).toHaveLength(2)
  })
})

describe('the transparent surface in card.css', () => {
  const css = readFileSync(join(import.meta.dirname, 'card.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
  const rule = (selector: string) =>
    css.match(new RegExp(String.raw`${selector} \{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}`))?.[1] ?? ''

  it('has the class of its surface', () => {
    const { container } = render(<Card surface="transparent">Inhoud</Card>)

    expect(container.firstElementChild?.className).toBe('hf-card hf-card-transparent')
  })

  it('has no background and no border to see, and keeps the border, so the text sits where it does in the others', () => {
    const transparent = rule(String.raw`\.hf-card-transparent`)

    expect(transparent).toContain('background-color: transparent;')
    expect(transparent).toContain('border-color: transparent;')
    expect(transparent).not.toMatch(/(^|\s)(border|border-width|border-style|padding)[a-z-]*: (?!transparent|Canvas)/)
    expect(transparent).not.toMatch(/(^|\s)(border:|border-width:|border-style:|padding)/)
    // .hf-card has the border (1px solid) and the padding, which this surface does not change.
    expect(rule(String.raw`\.hf-card`)).toContain('border: 1px solid')
    expect(rule(String.raw`\.hf-card`)).toContain('padding: 1rem 1.25rem;')
  })

  it('draws no border in forced colours either', () => {
    expect(rule(String.raw`\.hf-card-transparent`)).toMatch(
      /@media \(forced-colors: active\) \{\s*border-color: Canvas;/,
    )
  })
})
