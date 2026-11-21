import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Field } from '../field/Field'
import { CodeInput } from './CodeInput'

const field = () => screen.getByRole('textbox', { name: 'Code uit de mail' }) as HTMLInputElement

const renderField = (props: { error?: string } = {}) =>
  render(
    <Field hint="Vul de 6 cijfers in." id="code" label="Code uit de mail" {...props}>
      <CodeInput name="code" />
    </Field>,
  )

describe('CodeInput', () => {
  it('is one field with one label, and its boxes are only drawing', () => {
    const { container } = renderField()

    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(field().getAttribute('autocomplete')).toBe('one-time-code')
    expect(field().getAttribute('inputmode')).toBe('numeric')
    expect(container.querySelector('.hf-code-input-boxes')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('.hf-code-input-box')).toHaveLength(6)
  })

  it('keeps the digits of a pasted code with a space, and no more than six', () => {
    renderField()
    fireEvent.change(field(), { target: { value: '482 190' } })

    expect(field().value).toBe('482190')

    fireEvent.change(field(), { target: { value: '12345678' } })

    expect(field().value).toBe('123456')
  })

  it('marks the box that is next, and the last one when the code is full', () => {
    const { container } = renderField()
    const current = () =>
      [...container.querySelectorAll('.hf-code-input-box')].findIndex((box) => box.hasAttribute('data-current'))

    expect(current()).toBe(-1)

    fireEvent.focus(field())

    expect(current()).toBe(0)

    fireEvent.change(field(), { target: { value: '48' } })

    expect(current()).toBe(2)

    fireEvent.change(field(), { target: { value: '482190' } })

    expect(current()).toBe(5)

    fireEvent.blur(field())

    expect(current()).toBe(-1)
  })

  it('carries a wrong code as an invalid field with its message, so the colour is not the only sign', () => {
    renderField({ error: 'Die code klopt niet.' })

    expect(field().getAttribute('aria-invalid')).toBe('true')
    expect(field().getAttribute('aria-describedby')).toContain('code-error')
    expect(screen.getByText('Fout:')).toBeTruthy()
  })

  it('passes the attributes on to the field', () => {
    render(<CodeInput aria-label="Code" className="extra" defaultValue="123456" name="code" />)

    const input = screen.getByRole('textbox', { name: 'Code' }) as HTMLInputElement

    expect(input.name).toBe('code')
    expect(input.value).toBe('123456')
    expect(input.closest('.hf-code-input')?.className).toContain('extra')
  })
})
