import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CheckboxGroup } from './CheckboxGroup'

const options = [
  { label: 'Leeuwarder Courant', value: 'leeuwarder-courant' },
  { label: 'Omrop Fryslân', value: 'omrop-fryslan' },
  { label: 'Voorbeeldkrant, met dank aan de redactie', value: 'voorbeeldkrant' },
]

describe('CheckboxGroup', () => {
  it('is a fieldset named by its legend, with a checkbox for each option, in order', () => {
    render(<CheckboxGroup legend="Bronnen" name="bron" options={options} />)
    const group = screen.getByRole('group', { name: 'Bronnen' })

    expect(group.tagName).toBe('FIELDSET')
    expect(group.querySelector('legend')?.textContent).toBe('Bronnen')
    expect(within(group).getAllByRole('checkbox')).toHaveLength(3)
    expect(
      within(group)
        .getAllByRole('checkbox')
        .map((box) => box.getAttribute('value')),
    ).toEqual(['leeuwarder-courant', 'omrop-fryslan', 'voorbeeldkrant'])
  })

  it('gives each checkbox the name of the group and a visible label with the name of the option', () => {
    render(<CheckboxGroup legend="Bronnen" name="bron" options={options} />)

    for (const option of options) {
      const box = screen.getByRole('checkbox', { name: option.label })

      expect(box.getAttribute('name')).toBe('bron')
      expect(box.closest('label')?.textContent).toBe(option.label)
    }
  })

  it('checks nothing without a value, and checks the options that are in the value', () => {
    const { rerender } = render(<CheckboxGroup legend="Bronnen" name="bron" options={options} />)

    expect(screen.getAllByRole('checkbox').filter((box) => (box as HTMLInputElement).checked)).toHaveLength(0)

    rerender(
      <CheckboxGroup key="twee" legend="Bronnen" name="bron" options={options} value={['voorbeeldkrant', 'x']} />,
    )

    expect(
      screen
        .getAllByRole('checkbox')
        .filter((box) => (box as HTMLInputElement).checked)
        .map((box) => box.getAttribute('value')),
    ).toEqual(['voorbeeldkrant'])
  })

  it('sends only the checked values, each under the name of the group, in the order of the options', () => {
    render(
      <form>
        <CheckboxGroup legend="Bronnen" name="bron" options={options} />
      </form>,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: 'Voorbeeldkrant, met dank aan de redactie' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Leeuwarder Courant' }))

    const form = document.querySelector('form') as HTMLFormElement

    expect(new FormData(form).getAll('bron')).toEqual(['leeuwarder-courant', 'voorbeeldkrant'])
  })

  it('checks a box when its label is clicked', () => {
    render(<CheckboxGroup legend="Bronnen" name="bron" options={options} />)

    fireEvent.click(screen.getByText('Leeuwarder Courant'))

    expect((screen.getByRole('checkbox', { name: 'Leeuwarder Courant' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('checkbox', { name: 'Omrop Fryslân' }) as HTMLInputElement).checked).toBe(false)
  })

  it('passes other props to the fieldset', () => {
    render(<CheckboxGroup aria-describedby="uitleg" className="extra" legend="Bronnen" name="bron" options={options} />)

    expect(screen.getByRole('group', { name: 'Bronnen' }).className).toBe('hf-checkbox-group extra')
    expect(screen.getByRole('group', { name: 'Bronnen' }).getAttribute('aria-describedby')).toBe('uitleg')
  })
})
