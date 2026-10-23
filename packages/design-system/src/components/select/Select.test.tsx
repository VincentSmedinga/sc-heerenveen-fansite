import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Select } from './Select'

describe('Select', () => {
  it('is a list with the choices of its options', () => {
    render(
      <Select aria-label="Onderwerp" defaultValue="fout" name="onderwerp">
        <Select.Option value="verwijderen">Een bericht laten verwijderen</Select.Option>
        <Select.Option value="fout">Een fout in een bericht</Select.Option>
      </Select>,
    )

    const select = screen.getByRole('combobox', { name: 'Onderwerp' })

    expect(select.tagName).toBe('SELECT')
    expect(select.getAttribute('name')).toBe('onderwerp')
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Een bericht laten verwijderen', 'Een fout in een bericht'])
    expect(screen.getByRole('option', { name: 'Een fout in een bericht', selected: true })).toBeTruthy()
  })

  it('passes the other attributes on to the list', () => {
    render(<Select aria-label="Onderwerp" className="extra" />)

    expect(screen.getByRole('combobox', { name: 'Onderwerp' }).className).toBe('extra')
  })
})

describe('Select.Option', () => {
  it('is an option of the list around it, with the attributes of an option', () => {
    render(
      <Select aria-label="Onderwerp">
        <Select.Option disabled value="kies">
          Kies een onderwerp
        </Select.Option>
      </Select>,
    )

    const option = screen.getByRole('option', { name: 'Kies een onderwerp' })

    expect(option.tagName).toBe('OPTION')
    expect(option.hasAttribute('disabled')).toBe(true)
    expect(option.getAttribute('value')).toBe('kies')
  })

  it('is called Select.Option in the developer tools and the code examples', () => {
    expect(Select.Option.displayName).toBe('Select.Option')
  })
})
