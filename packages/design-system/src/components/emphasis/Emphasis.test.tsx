import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Emphasis } from './Emphasis'

describe('Emphasis', () => {
  it('is an em element with the text, and no class', () => {
    const { container } = render(<Emphasis>nadruk</Emphasis>)

    expect(container.firstElementChild?.tagName).toBe('EM')
    expect(container.firstElementChild?.textContent).toBe('nadruk')
    expect(container.firstElementChild?.hasAttribute('class')).toBe(false)
  })

  it('keeps the other attributes', () => {
    const { container } = render(<Emphasis className="extra">nadruk</Emphasis>)

    expect(container.firstElementChild?.className).toBe('extra')
  })
})
