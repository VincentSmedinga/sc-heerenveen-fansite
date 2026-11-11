import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OutcomeBar } from './OutcomeBar'

describe('OutcomeBar', () => {
  it('is hidden from a screen reader and has no text', () => {
    const { container } = render(<OutcomeBar draws={1} losses={2} wins={3} />)

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
    expect(container.textContent).toBe('')
  })

  it('makes a part as wide as its number, in the colour of its result, and leaves out a part without matches', () => {
    const { container } = render(<OutcomeBar draws={0} losses={2} wins={3} />)
    const parts = [...container.querySelectorAll<HTMLElement>('.hf-outcome-bar-part')]

    expect(parts.map((part) => part.className)).toEqual([
      'hf-outcome-bar-part hf-chart-tone-positive',
      'hf-outcome-bar-part hf-chart-tone-negative',
    ])
    expect(parts.map((part) => part.style.getPropertyValue('--hf-outcome-bar-count'))).toEqual(['3', '2'])
  })
})
