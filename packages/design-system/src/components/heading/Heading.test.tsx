import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Heading, headingLevels } from './Heading'

describe('Heading', () => {
  it.each(headingLevels)('is an h%i at level %i, with the style of the same number', (level) => {
    render(<Heading level={level}>Titel</Heading>)
    const heading = screen.getByRole('heading', { level, name: 'Titel' })

    expect(heading.tagName).toBe(`H${level}`)
    expect(heading.className).toBe(`hf-heading-${level}`)
  })

  it('has a level that is separate from the style: an h2 can look like Kop 3', () => {
    render(
      <Heading appearance={3} level={2}>
        Nieuwste discussies
      </Heading>,
    )
    const heading = screen.getByRole('heading', { level: 2 })

    expect(heading.tagName).toBe('H2')
    expect(heading.classList.contains('hf-heading-3')).toBe(true)
    expect(heading.classList.contains('hf-heading-2')).toBe(false)
  })

  it('does not change the level when the style changes', () => {
    render(
      <>
        <Heading appearance={1} level={4}>
          Klein in de structuur
        </Heading>
        <Heading appearance={4} level={1}>
          Groot in de structuur
        </Heading>
      </>,
    )

    expect(screen.getByRole('heading', { name: 'Klein in de structuur' }).tagName).toBe('H4')
    expect(screen.getByRole('heading', { name: 'Groot in de structuur' }).tagName).toBe('H1')
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(
      <Heading className="extra" id="titel" level={2}>
        Titel
      </Heading>,
    )
    const heading = screen.getByRole('heading')

    expect(heading.className).toBe('hf-heading-2 extra')
    expect(heading.id).toBe('titel')
  })

  it('allows only the levels 1 to 4, and needs a level', () => {
    const elements = [
      // @ts-expect-error Level 5 has no style of its own yet.
      <Heading level={5} />,
      // @ts-expect-error A heading needs a level.
      <Heading />,
    ]

    expect(elements).toHaveLength(2)
  })
})
