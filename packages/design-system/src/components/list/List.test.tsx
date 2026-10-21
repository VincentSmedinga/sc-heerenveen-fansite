import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { List, listElements } from './List'

describe('List', () => {
  it('is a bulleted list by default', () => {
    const { container } = render(
      <List>
        <li>Een</li>
        <li>Twee</li>
      </List>,
    )

    expect(container.firstElementChild?.tagName).toBe('UL')
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2)
  })

  it.each(listElements)('can be a %s', (element) => {
    const { container } = render(
      <List as={element}>
        <li>Een</li>
        <li>Twee</li>
      </List>,
    )

    expect(container.firstElementChild?.tagName.toLowerCase()).toBe(element)
    expect(
      within(screen.getByRole('list'))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Een', 'Twee'])
  })

  it('takes the attributes of a numbered list when it is one', () => {
    const { container } = render(
      <List as="ol" reversed start={3}>
        <li>Drie</li>
      </List>,
    )

    expect(container.firstElementChild?.getAttribute('start')).toBe('3')
    expect(container.firstElementChild?.hasAttribute('reversed')).toBe(true)
  })

  it('keeps the other attributes', () => {
    const { container } = render(<List className="extra" id="lijst" />)

    expect(container.firstElementChild?.className).toBe('extra')
    expect(container.firstElementChild?.id).toBe('lijst')
  })

  it('allows no other element, and the attributes of a numbered list only on one', () => {
    const elements = [
      // @ts-expect-error A dl is not an element a List can be.
      <List as="dl" />,
      // @ts-expect-error A bulleted list has no start.
      <List start={3} />,
    ]

    expect(elements).toHaveLength(2)
  })
})
