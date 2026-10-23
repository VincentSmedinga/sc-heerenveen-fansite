import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Input } from '../input/Input'
import { Select } from '../select/Select'
import { Textarea } from '../textarea/Textarea'
import { Field } from './Field'

describe('Field', () => {
  it('ties the label to the field with for and id', () => {
    render(
      <Field id="naam" label="Naam">
        <Input name="naam" />
      </Field>,
    )

    const field = screen.getByRole('textbox', { name: /^Naam/ })

    expect(field.id).toBe('naam')
    expect(screen.getByText('Naam', { exact: false, selector: 'label' }).getAttribute('for')).toBe('naam')
  })

  it('is required by default, and does not say so in its label', () => {
    render(
      <Field id="naam" label="Naam">
        <Input />
      </Field>,
    )

    expect(screen.getByRole('textbox', { name: 'Naam' }).hasAttribute('required')).toBe(true)
  })

  it('says in words that a field is not required, and does not make it required', () => {
    render(
      <Field id="link" label="Link naar het bericht" required={false}>
        <Input />
      </Field>,
    )

    expect(
      screen.getByRole('textbox', { name: 'Link naar het bericht (niet verplicht)' }).hasAttribute('required'),
    ).toBe(false)
  })

  it('has no description and is not invalid when there is no hint and no error', () => {
    render(
      <Field id="naam" label="Naam">
        <Input />
      </Field>,
    )

    const field = screen.getByRole('textbox')

    expect(field.hasAttribute('aria-describedby')).toBe(false)
    expect(field.hasAttribute('aria-invalid')).toBe(false)
    expect(screen.queryByText(/Fout/)).toBeNull()
  })

  it('ties the hint to the field with aria-describedby', () => {
    render(
      <Field hint="Dit staat niet op de site." id="e-mail" label="E-mailadres">
        <Input type="email" />
      </Field>,
    )

    const field = screen.getByRole('textbox')

    expect(field.getAttribute('aria-describedby')).toBe('e-mail-hint')
    expect(document.getElementById('e-mail-hint')?.textContent).toBe('Dit staat niet op de site.')
    expect(field.getAttribute('aria-invalid')).toBeNull()
    expect(screen.getByRole('textbox').getAttribute('description')).toBeNull()
    expect(screen.getByRole('textbox', { description: 'Dit staat niet op de site.' })).toBe(field)
  })

  it('ties the error to the field with aria-describedby and marks the field invalid', () => {
    render(
      <Field error="Vul je e-mailadres in." id="e-mail" label="E-mailadres">
        <Input type="email" />
      </Field>,
    )

    const field = screen.getByRole('textbox')

    expect(field.getAttribute('aria-describedby')).toBe('e-mail-error')
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById('e-mail-error')?.textContent).toBe('Fout: Vul je e-mailadres in.')
    expect(screen.getByRole('textbox', { description: 'Fout: Vul je e-mailadres in.' })).toBe(field)
  })

  it('ties both the hint and the error to the field, the hint first', () => {
    render(
      <Field error="Dat is geen e-mailadres." hint="Zoals naam@voorbeeld.nl" id="e-mail" label="E-mailadres">
        <Input type="email" />
      </Field>,
    )

    expect(screen.getByRole('textbox').getAttribute('aria-describedby')).toBe('e-mail-hint e-mail-error')
    expect(
      screen.getByRole('textbox', { description: 'Zoals naam@voorbeeld.nl Fout: Dat is geen e-mailadres.' }),
    ).toBeTruthy()
  })

  it('puts the error in text, so a colour is not the only sign', () => {
    render(
      <Field error="Vul je naam in." id="naam" label="Naam">
        <Input />
      </Field>,
    )

    expect(screen.getByText('Vul je naam in.', { exact: false }).textContent).toContain('Fout:')
    expect(screen.getByText('Vul je naam in.', { exact: false }).className).toContain('hf-field-error')
  })

  it.each([
    ['an Input', <Input key="input" />, 'textbox'],
    ['a Textarea', <Textarea key="textarea" />, 'textbox'],
    [
      'a Select',
      <Select key="select">
        <Select.Option value="a">A</Select.Option>
      </Select>,
      'combobox',
    ],
  ] as const)('works with %s', (_name, control, role) => {
    render(
      <Field error="Kies iets." id="veld" label="Veld">
        {control}
      </Field>,
    )

    const field = screen.getByRole(role, { name: 'Veld' })

    expect(field.id).toBe('veld')
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.getAttribute('aria-describedby')).toBe('veld-error')
    expect(field.hasAttribute('required')).toBe(true)
  })

  it('keeps the attributes of the field', () => {
    render(
      <Field id="naam" label="Naam">
        <Input autoComplete="name" name="naam" />
      </Field>,
    )

    expect(screen.getByRole('textbox').getAttribute('autocomplete')).toBe('name')
    expect(screen.getByRole('textbox').getAttribute('name')).toBe('naam')
  })

  it('keeps its own class next to the other attributes', () => {
    const { container } = render(
      <Field className="extra" id="naam" label="Naam">
        <Input />
      </Field>,
    )

    expect(container.firstElementChild?.className).toBe('hf-field extra')
  })

  it('wants one field', () => {
    expect(() =>
      render(
        // @ts-expect-error A Field has one field.
        <Field id="naam" label="Naam">
          <Input />
          <Input />
        </Field>,
      ),
    ).toThrow()
  })
})
