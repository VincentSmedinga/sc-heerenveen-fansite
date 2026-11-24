import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Flag } from './Flag'

describe('Flag', () => {
  it('draws the flag as an image, with no text alternative when the name stands next to it', () => {
    const { container } = render(<Flag address="data:image/svg+xml,x" />)

    expect(container.querySelector('img.hf-flag')?.getAttribute('alt')).toBe('')
  })

  it('gives the image the label as its text alternative', () => {
    const { container } = render(<Flag address="data:image/svg+xml,x" label="Nederland" />)

    expect(container.querySelector('img.hf-flag')?.getAttribute('alt')).toBe('Nederland')
  })

  it('shows the code in a frame, as decoration unless it has a label', () => {
    const { container, rerender } = render(<Flag code="xk" />)

    expect(container.querySelector('.hf-flag.hf-flag-code')?.textContent).toBe('XK')
    expect(container.querySelector('.hf-flag-code')?.getAttribute('aria-hidden')).toBe('true')

    rerender(<Flag code="xk" label="Kosovo" />)

    expect(container.querySelector('.hf-flag-code')?.getAttribute('role')).toBe('img')
    expect(container.querySelector('.hf-flag-code')?.getAttribute('aria-label')).toBe('Kosovo')
  })

  it('leaves an empty place of the size of a flag', () => {
    const { container } = render(<Flag />)

    expect(container.querySelector('span.hf-flag')?.childNodes).toHaveLength(0)
  })
})
