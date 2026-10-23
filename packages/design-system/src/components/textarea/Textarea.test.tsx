import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Textarea } from './Textarea'

describe('Textarea', () => {
  it('is a text field of more than one line', () => {
    render(<Textarea aria-label="Toelichting" rows={4} />)

    const field = screen.getByRole('textbox', { name: 'Toelichting' })

    expect(field.tagName).toBe('TEXTAREA')
    expect(field.getAttribute('rows')).toBe('4')
  })

  it('passes the other attributes on to the field', () => {
    render(<Textarea aria-label="Toelichting" autoComplete="off" className="extra" name="toelichting" />)

    const field = screen.getByRole('textbox', { name: 'Toelichting' })

    expect(field.getAttribute('autocomplete')).toBe('off')
    expect(field.getAttribute('name')).toBe('toelichting')
    expect(field.className).toBe('extra')
  })
})
