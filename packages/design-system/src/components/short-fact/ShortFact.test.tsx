import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ShortFact } from './ShortFact'

describe('ShortFact', () => {
  it('writes the fact in the classes of a short line, so a List draws the lines between its lines', () => {
    const { container } = render(<ShortFact>Een feit</ShortFact>)

    expect(container.querySelector('.hf-short-line.hf-short-fact')).not.toBeNull()
    expect(container.querySelector('.hf-short-line-main')?.textContent).toBe('Een feit')
  })

  it('passes other props on', () => {
    const { container } = render(<ShortFact id="feit">Een feit</ShortFact>)

    expect(container.querySelector('#feit')).not.toBeNull()
  })
})
