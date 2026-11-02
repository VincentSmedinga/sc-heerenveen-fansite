import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Input, inputTypes, inputWidths } from './Input'

describe('Input', () => {
  it('is a text field by default', () => {
    render(<Input aria-label="Naam" />)

    expect(screen.getByRole('textbox', { name: 'Naam' }).getAttribute('type')).toBe('text')
  })

  it.each(inputTypes)('can be of the type %s', (type) => {
    const { container } = render(<Input type={type} />)

    expect(container.querySelector('input')?.getAttribute('type')).toBe(type)
  })

  it('can carry a value along with a form without being a field to see', () => {
    const { container } = render(
      <form>
        <Input name="q" type="hidden" value="klaverboer" />
      </form>,
    )

    expect(screen.queryByRole('textbox')).toBeNull()
    expect(new FormData(container.querySelector('form') ?? undefined).get('q')).toBe('klaverboer')
  })

  it('passes autocomplete and the other attributes on to the field', () => {
    render(<Input aria-label="E-mailadres" autoComplete="email" className="extra" name="e-mail" />)

    const field = screen.getByRole('textbox', { name: 'E-mailadres' })

    expect(field.getAttribute('autocomplete')).toBe('email')
    expect(field.getAttribute('name')).toBe('e-mail')
    expect(field.className).toBe('extra')
  })

  it('allows no type that is another component', () => {
    const elements = [
      // @ts-expect-error A checkbox is not a text field.
      <Input type="checkbox" />,
    ]

    expect(elements).toHaveLength(1)
  })

  it('has no width class by default, and one for each other width', () => {
    expect(inputWidths).toEqual(['default', 'narrow', 'natural'])

    const { rerender } = render(<Input aria-label="Minuut" />)

    expect(screen.getByRole('textbox').hasAttribute('class')).toBe(false)

    rerender(<Input aria-label="Minuut" className="extra" size="small" width="narrow" />)
    expect(screen.getByRole('textbox').className).toBe('hf-size-small hf-width-narrow extra')

    rerender(<Input aria-label="Datum" type="date" width="natural" />)
    expect(document.querySelector('input')?.className).toBe('hf-width-natural')
  })
})
