import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Strong } from './Strong'

describe('Strong', () => {
  it('is a strong element with the text, and no class', () => {
    const { container } = render(<Strong>belangrijk</Strong>)

    expect(container.firstElementChild?.tagName).toBe('STRONG')
    expect(container.firstElementChild?.textContent).toBe('belangrijk')
    expect(container.firstElementChild?.hasAttribute('class')).toBe(false)
  })

  it('keeps the other attributes', () => {
    const { container } = render(<Strong className="extra">belangrijk</Strong>)

    expect(container.firstElementChild?.className).toBe('extra')
  })
})
