import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Field } from '../field/Field'
import { Input } from '../input/Input'
import { ErrorSummary } from './ErrorSummary'

const errors = [
  { id: 'naam', message: 'Vul je naam in.' },
  { id: 'e-mail', message: 'Dat is geen e-mailadres.' },
]

describe('ErrorSummary', () => {
  it('has a heading and a link to the field of every error', () => {
    render(<ErrorSummary errors={errors} level={2} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Er is iets mis' })).toBeTruthy()
    expect(
      within(screen.getByRole('list'))
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Vul je naam in.', '#naam'],
      ['Dat is geen e-mailadres.', '#e-mail'],
    ])
  })

  it('is a region named after its heading', () => {
    render(<ErrorSummary errors={errors} level={2} title="Controleer je invoer" />)

    expect(screen.getByRole('region', { name: 'Controleer je invoer' })).toBeTruthy()
  })

  it('can have a heading of another level', () => {
    render(<ErrorSummary errors={errors} level={3} />)

    expect(screen.getByRole('heading', { level: 3 })).toBeTruthy()
  })

  it('links to the field that has the error', () => {
    render(
      <>
        <ErrorSummary errors={[{ id: 'naam', message: 'Vul je naam in.' }]} level={2} />
        <Field error="Vul je naam in." id="naam" label="Naam" required>
          <Input />
        </Field>
      </>,
    )

    const href = screen.getByRole('link', { name: 'Vul je naam in.' }).getAttribute('href')

    expect(document.querySelector(href ?? '')).toBe(screen.getByRole('textbox'))
  })

  it('is not shown without errors', () => {
    const { container } = render(<ErrorSummary errors={[]} level={2} />)

    expect(container.firstElementChild).toBeNull()
  })

  it('keeps its own class next to the other attributes', () => {
    render(<ErrorSummary className="extra" errors={errors} id="fouten" level={2} />)

    expect(screen.getByRole('region').className).toBe('hf-error-summary extra')
    expect(screen.getByRole('region').id).toBe('fouten')
  })
})
