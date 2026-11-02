import { fireEvent, render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { RadioGroup } from './RadioGroup'

const options = [
  { label: 'Nee', value: 'nee' },
  { label: 'Ja', value: 'ja' },
]

describe('RadioGroup', () => {
  it('is a fieldset named by its legend, with a radio button for each option, in order', () => {
    render(<RadioGroup id="verlenging" legend="Verlenging" name="verlenging" options={options} />)
    const group = screen.getByRole('group', { name: 'Verlenging' })

    expect(group.tagName).toBe('FIELDSET')
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(['nee', 'ja'])
  })

  it('gives each radio button the name of the group and a visible label with the name of the option', () => {
    render(<RadioGroup id="verlenging" legend="Verlenging" name="verlenging" options={options} />)

    for (const option of options) {
      const radio = screen.getByRole('radio', { name: option.label })

      expect(radio.getAttribute('name')).toBe('verlenging')
      expect(radio.closest('label')?.textContent).toBe(option.label)
    }
  })

  it('puts the id on the first radio button, so a link goes to it, and numbers the others', () => {
    render(<RadioGroup id="doelpunt-1-kant" legend="Team" name="doelpunt-1-kant" options={options} />)

    expect(screen.getByRole('radio', { name: 'Nee' }).id).toBe('doelpunt-1-kant')
    expect(screen.getByRole('radio', { name: 'Ja' }).id).toBe('doelpunt-1-kant-2')
  })

  it('chooses nothing without a value, and the option that is the value when there is one', () => {
    const { rerender } = render(<RadioGroup id="v" legend="Verlenging" name="v" options={options} />)

    expect(screen.getAllByRole('radio').filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(0)

    rerender(<RadioGroup id="v" key="ja" legend="Verlenging" name="v" options={options} value="ja" />)
    expect((screen.getByRole('radio', { name: 'Ja' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: 'Nee' }) as HTMLInputElement).checked).toBe(false)
  })

  it('lets one be chosen at a time, and sends the chosen value under the name of the group', () => {
    const { container } = render(
      <form>
        <RadioGroup id="v" legend="Verlenging" name="verlenging" options={options} value="nee" />
      </form>,
    )

    fireEvent.click(screen.getByRole('radio', { name: 'Ja' }))

    const form = container.querySelector('form') as HTMLFormElement

    expect(new FormData(form).getAll('verlenging')).toEqual(['ja'])
    expect((screen.getByRole('radio', { name: 'Nee' }) as HTMLInputElement).checked).toBe(false)
  })

  it('chooses an option when its label is clicked', () => {
    render(<RadioGroup id="v" legend="Verlenging" name="v" options={options} />)

    fireEvent.click(screen.getByText('Ja'))

    expect((screen.getByRole('radio', { name: 'Ja' }) as HTMLInputElement).checked).toBe(true)
  })

  it('is required by default, and says nothing about it', () => {
    render(<RadioGroup id="v" legend="Verlenging" name="v" options={options} />)

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.hasAttribute('required')).toBe(true)
    }
    expect(document.querySelector('.hf-field-status')).toBeNull()
  })

  it('says in words that it is not required, unless hideOptional says not to', () => {
    const { rerender } = render(<RadioGroup id="v" legend="Verlenging" name="v" options={options} required={false} />)

    expect(screen.getByRole('group', { name: 'Verlenging (niet verplicht)' })).toBeTruthy()
    expect(screen.getAllByRole('radio')[0]?.hasAttribute('required')).toBe(false)

    rerender(<RadioGroup hideOptional id="v" legend="Verlenging" name="v" options={options} required={false} />)
    expect(screen.getByRole('group', { name: 'Verlenging' })).toBeTruthy()
    expect(screen.getAllByRole('radio')[0]?.hasAttribute('required')).toBe(false)
  })

  it('ties the hint and the error to the group with aria-describedby, and starts the error with Fout', () => {
    render(
      <RadioGroup
        error="Kies voor welk team het was."
        hint="Het team dat het doelpunt krijgt."
        id="kant"
        legend="Team"
        name="kant"
        options={options}
      />,
    )
    const group = screen.getByRole('group', { name: 'Team' })

    expect(group.getAttribute('aria-describedby')).toBe('kant-hint kant-error')
    expect(document.getElementById('kant-hint')?.textContent).toBe('Het team dat het doelpunt krijgt.')
    expect(document.getElementById('kant-error')?.textContent).toBe('Fout: Kies voor welk team het was.')
  })

  it('has no description when there is no hint and no error', () => {
    render(<RadioGroup id="v" legend="Verlenging" name="v" options={options} />)

    expect(screen.getByRole('group').hasAttribute('aria-describedby')).toBe(false)
  })

  it('takes a legend that is more than text, such as one with a part for a screen reader only', () => {
    render(
      <RadioGroup
        id="kant"
        legend={
          <>
            Team<span className="hf-visually-hidden">, doelpunt 2</span>
          </>
        }
        name="kant"
        options={options}
      />,
    )

    expect(screen.getByRole('group', { name: 'Team, doelpunt 2' })).toBeTruthy()
  })

  it('passes other props to the fieldset', () => {
    render(<RadioGroup className="extra" data-extra="1" id="v" legend="Verlenging" name="v" options={options} />)

    expect(screen.getByRole('group').className).toBe('hf-radio-group extra')
    expect(screen.getByRole('group').getAttribute('data-extra')).toBe('1')
  })
})

describe('radio-group.css', () => {
  const css = readFileSync(join(import.meta.dirname, 'radio-group.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

  it('makes each option a row as high as a field, from the same token, so it lines up and is easy to hit', () => {
    expect(css).toContain('min-block-size: var(--hf-size-control);')
  })

  it('gives the legend the colour of the text, so it looks like the label of a field', () => {
    expect(css).toMatch(/> legend \{[^}]*color: var\(--hf-colour-text-default\);/u)
  })

  it('puts the options next to each other where they fit, and under each other where they do not', () => {
    expect(css).toMatch(/\.hf-radio-group-options \{[^}]*display: flex;[^}]*flex-wrap: wrap;/u)
  })
})
