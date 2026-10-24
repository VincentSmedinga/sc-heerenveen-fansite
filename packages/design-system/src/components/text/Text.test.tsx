import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Text, textAppearances, textElements } from './Text'

describe('Text', () => {
  it('is a paragraph by default', () => {
    const { container } = render(<Text>Een zin.</Text>)

    expect(container.firstElementChild?.tagName).toBe('P')
    expect(container.firstElementChild?.textContent).toBe('Een zin.')
  })

  it.each(textElements)('can be a %s', (element) => {
    const { container } = render(<Text as={element}>Een zin.</Text>)

    expect(container.firstElementChild?.tagName.toLowerCase()).toBe(element)
    expect(container.firstElementChild?.textContent).toBe('Een zin.')
  })

  it.each(textAppearances)('has the type style %s', (appearance) => {
    const { container } = render(<Text appearance={appearance}>Een zin.</Text>)

    expect(container.firstElementChild?.className).toBe(`hf-${appearance}`)
  })

  it('puts the content of an intro in one b, also when it holds a link, so it stands out without the stylesheet', () => {
    const { container } = render(
      <Text appearance="intro">
        Een zin met <a href="/bronnen">een link</a>.
      </Text>,
    )

    expect(container.innerHTML).toBe('<p class="hf-intro"><b>Een zin met <a href="/bronnen">een link</a>.</b></p>')
  })

  it.each(['body', 'meta'] as const)('does not put the content of %s in a b', (appearance) => {
    const { container } = render(<Text appearance={appearance}>Een zin.</Text>)

    expect(container.querySelector('b')).toBeNull()
  })

  it('has no class of its own without a type style, so it takes the style of its surroundings', () => {
    const { container } = render(<Text as="span">Een zin.</Text>)

    expect(container.firstElementChild?.hasAttribute('class')).toBe(false)
  })

  it('keeps the other attributes and adds a class to its own', () => {
    const { container } = render(
      <Text appearance="meta" className="extra" id="zin" lang="fy">
        Een zin.
      </Text>,
    )

    expect(container.firstElementChild?.className).toBe('hf-meta extra')
    expect(container.firstElementChild?.id).toBe('zin')
    expect(container.firstElementChild?.getAttribute('lang')).toBe('fy')
  })

  it('allows no other element or type style', () => {
    const elements = [
      // @ts-expect-error A div is not an element a Text can be.
      <Text as="div" />,
      // @ts-expect-error Kop 1 is not a style of running text.
      <Text appearance="heading-1" />,
      // @ts-expect-error An intro is a paragraph, not a span.
      <Text appearance="intro" as="span" />,
    ]

    expect(elements).toHaveLength(3)
  })
})
