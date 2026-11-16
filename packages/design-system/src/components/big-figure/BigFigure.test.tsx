import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BigFigure } from './BigFigure'

describe('BigFigure', () => {
  it('shows the number, and has what it counts in the same paragraph, out of sight', () => {
    const { container } = render(<BigFigure figure="9 keer" label="de nul gehouden" />)
    const paragraph = container.querySelector('p.hf-big-figure')

    expect(paragraph?.textContent).toBe('9 keer de nul gehouden')
    expect(paragraph?.querySelector('.hf-visually-hidden')?.textContent).toBe(' de nul gehouden')
  })

  it('is plain text and not a heading', () => {
    const { container } = render(<BigFigure figure="9 keer" label="de nul gehouden" />)

    expect(container.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull()
  })
})
