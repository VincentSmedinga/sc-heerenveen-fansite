import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { Field } from '../field/Field'
import { Input } from '../input/Input'
import { FieldGroup } from './FieldGroup'

const renderGroup = (props: Partial<Parameters<typeof FieldGroup>[0]> = {}) =>
  render(
    <FieldGroup legend="Aftrap" {...props}>
      <Field id="datum" label="Datum">
        <Input name="datum" />
      </Field>
      <Field id="tijd" label="Tijd">
        <Input name="tijd" />
      </Field>
    </FieldGroup>,
  )

describe('FieldGroup', () => {
  it('is a group named by its legend, which holds the fields with a label each', () => {
    renderGroup()

    const group = screen.getByRole('group', { name: 'Aftrap' })

    expect(group.tagName).toBe('FIELDSET')
    expect(within(group).getByRole('textbox', { name: 'Datum' })).toBeTruthy()
    expect(within(group).getByRole('textbox', { name: 'Tijd' })).toBeTruthy()
    expect(group.querySelector('legend')?.textContent).toBe('Aftrap')
  })

  it('describes the group with its hint, when it has one', () => {
    renderGroup({ hint: 'Alleen bij verlenging.' })

    expect(screen.getByRole('group', { description: 'Alleen bij verlenging.', name: 'Aftrap' })).toBeTruthy()
  })

  it('has no description without a hint', () => {
    renderGroup()

    expect(screen.getByRole('group').getAttribute('aria-describedby')).toBeNull()
  })

  it('puts the separator between the first two fields and hides it from a screen reader', () => {
    renderGroup({ separator: '–' })

    const fields = screen.getByRole('group').querySelector('.hf-field-group-fields')
    const children = Array.from(fields?.children ?? [])

    expect(children.map((child) => child.className)).toEqual(['hf-field', 'hf-field-group-separator', 'hf-field'])
    expect(children[1]?.getAttribute('aria-hidden')).toBe('true')
    expect(children[1]?.textContent).toBe('–')
    expect(fields?.className).toContain('hf-field-group-separated')
    expect(screen.getByRole('group').textContent).not.toBe('')
  })

  it('has no separator without the prop', () => {
    renderGroup()

    expect(document.querySelector('.hf-field-group-separator')).toBeNull()
    expect(document.querySelector('.hf-field-group-separated')).toBeNull()
  })

  it('passes on other attributes and a class', () => {
    renderGroup({ className: 'extra', id: 'aftrap' })

    expect(screen.getByRole('group').className).toBe('hf-field-group extra')
    expect(screen.getByRole('group').id).toBe('aftrap')
  })
})

describe('field-group.css', () => {
  const css = readFileSync(join(import.meta.dirname, 'field-group.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

  it('puts the fields under each other on a phone, where two do not fit in 12rem columns', () => {
    expect(css).toContain('grid-template-columns: repeat(auto-fill, minmax(min(12rem, 100%), 16rem));')
  })

  it('keeps the two fields with a separator in a row at any width', () => {
    expect(css).toContain('grid-template-columns: minmax(0, 16rem) auto minmax(0, 16rem);')
  })
})
