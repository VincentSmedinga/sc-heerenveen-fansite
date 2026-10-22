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

  it('is a tight list unless it is loose', () => {
    const { container } = render(
      <List>
        <li>Een</li>
      </List>,
    )

    expect(container.firstElementChild?.className).toBe('')
    expect(container.firstElementChild?.hasAttribute('class')).toBe(false)
  })

  it.each(listElements)('can be a loose %s', (element) => {
    const { container } = render(
      <List as={element} loose>
        <li>Een</li>
      </List>,
    )

    expect(container.firstElementChild?.tagName.toLowerCase()).toBe(element)
    expect(container.firstElementChild?.className).toBe('hf-list-loose')
    expect(container.firstElementChild?.hasAttribute('loose')).toBe(false)
  })

  it('does not make a list loose when loose is false', () => {
    const { container } = render(
      <List loose={false}>
        <li>Een</li>
      </List>,
    )

    expect(container.firstElementChild?.hasAttribute('class')).toBe(false)
  })

  it('keeps its own class next to the other classes', () => {
    const { container } = render(<List className="extra" loose />)

    expect(container.firstElementChild?.className).toBe('hf-list-loose extra')
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

describe('List.Item', () => {
  it('is an item of the list around it', () => {
    render(
      <List>
        <List.Item>Een</List.Item>
        <List.Item>Twee</List.Item>
      </List>,
    )

    expect(
      within(screen.getByRole('list'))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Een', 'Twee'])
  })

  it('keeps the other attributes', () => {
    render(
      <List>
        <List.Item className="extra" id="item">
          Een
        </List.Item>
      </List>,
    )

    expect(screen.getByRole('listitem').tagName).toBe('LI')
    expect(screen.getByRole('listitem').className).toBe('extra')
    expect(screen.getByRole('listitem').id).toBe('item')
  })

  it('is called List.Item in the developer tools and the code examples', () => {
    expect(List.Item.displayName).toBe('List.Item')
  })
})
