import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Rule } from './Rule'

describe('Rule', () => {
  it('is a separator, with the class it gets', () => {
    render(<Rule className="extra" />)

    const rule = screen.getByRole('separator')

    expect(rule.tagName).toBe('HR')
    expect(rule.className).toBe('extra')
  })
})
