import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Cup } from './Cup'

describe('Cup', () => {
  it('is a drawing that a screen reader skips, twice as high as wide', () => {
    const { container } = render(<Cup />)
    const svg = container.querySelector('svg')

    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 96 192')
    expect(svg?.getAttribute('focusable')).toBe('false')
    expect(svg?.getAttribute('class')).toBe('hf-cup')
  })

  it('keeps the class of the caller next to its own', () => {
    const { container } = render(<Cup className="eigen" />)

    expect(container.querySelector('svg')?.getAttribute('class')).toBe('hf-cup eigen')
  })
})
