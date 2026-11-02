import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { Input } from '../input/Input'
import { Select } from '../select/Select'
import { InputTable, type InputTableProps } from './InputTable'

const props: InputTableProps = {
  add: { label: 'Doelpunt toevoegen', name: 'actie', value: 'toevoegen' },
  caption: 'Doelpunten',
  columns: [{ name: 'Team' }, { name: 'Minuut', width: 'narrow' }],
  rows: [
    {
      fields: [
        {
          control: (
            <Select defaultValue="thuis" name="team-1">
              <Select.Option value="thuis">Testclub</Select.Option>
            </Select>
          ),
          id: 'team-1',
        },
        { control: <Input defaultValue="23" name="minuut-1" />, id: 'minuut-1' },
      ],
      header: 'Doelpunt 1',
      remove: { name: 'actie', value: 'weghalen-1' },
    },
    {
      fields: [
        {
          control: (
            <Select defaultValue="thuis" name="team-2">
              <Select.Option value="thuis">Testclub</Select.Option>
            </Select>
          ),
          id: 'team-2',
        },
        { control: <Input name="minuut-2" />, error: 'Vul een minuut in.', id: 'minuut-2' },
      ],
      header: 'Doelpunt 2',
      remove: { name: 'actie', value: 'weghalen-2' },
    },
  ],
}

describe('InputTable', () => {
  it('is a real table with a caption that names it, for a screen reader only', () => {
    render(<InputTable {...props} />)

    expect(screen.getByRole('table', { name: 'Doelpunten' })).toBeTruthy()
    expect(document.querySelector('caption')?.className).toBe('hf-visually-hidden')
  })

  it('has the columns as headers with scope, and the name of the row as the header of the row', () => {
    render(<InputTable {...props} />)

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Rij',
      'Team',
      'Minuut',
      'Weghalen',
    ])
    expect(document.querySelectorAll('thead th[scope="col"]')).toHaveLength(4)
    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual(['Doelpunt 1', 'Doelpunt 2'])
    expect(document.querySelectorAll('tbody th[scope="row"]')).toHaveLength(2)
  })

  it('gives every field a label that names the column and the row', () => {
    render(<InputTable {...props} />)

    expect(screen.getByRole('textbox', { name: 'Minuut, doelpunt 1' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Minuut, doelpunt 2' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Team, doelpunt 2' })).toBeTruthy()
  })

  it('shows the column name as the visible label and keeps the name of the row for a screen reader', () => {
    render(<InputTable {...props} />)

    const label = document.querySelector('label[for="minuut-1"]')

    expect(label?.firstChild?.textContent).toBe('Minuut')
    expect(label?.querySelector('.hf-visually-hidden')?.textContent).toBe(', doelpunt 1')
  })

  it('shows the error of a field and marks the field as invalid', () => {
    render(<InputTable {...props} />)

    const field = screen.getByRole('textbox', { name: 'Minuut, doelpunt 2' })

    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.getAttribute('aria-describedby')).toBe('minuut-2-error')
    expect(document.getElementById('minuut-2-error')?.textContent).toContain('Vul een minuut in.')
  })

  it('has a button in every row that removes the row, and says which row in its name', () => {
    render(<InputTable {...props} />)

    const second = screen.getAllByRole('row')[2] as HTMLElement
    const button = within(second).getByRole('button', { name: 'Weghalen doelpunt 2' })

    expect(button.getAttribute('type')).toBe('submit')
    expect(button.getAttribute('name')).toBe('actie')
    expect(button.getAttribute('value')).toBe('weghalen-2')
  })

  it('uses the text for the remove button that it is given', () => {
    render(<InputTable {...props} removeLabel="Haal weg" />)

    expect(screen.getByRole('button', { name: 'Haal weg doelpunt 1' })).toBeTruthy()
  })

  it('has a button under the table that adds a row', () => {
    render(<InputTable {...props} />)

    const button = screen.getByRole('button', { name: 'Doelpunt toevoegen' })

    expect(button.getAttribute('type')).toBe('submit')
    expect(button.getAttribute('name')).toBe('actie')
    expect(button.getAttribute('value')).toBe('toevoegen')
    expect(screen.getByRole('table').compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('marks a narrow column', () => {
    render(<InputTable {...props} />)

    expect(screen.getByRole('columnheader', { name: 'Minuut' }).className).toBe('hf-input-table-narrow')
    expect(screen.getByRole('columnheader', { name: 'Team' }).className).toBe('')
  })

  it('shows what is given instead of the table when there are no rows, and keeps the add button', () => {
    render(<InputTable {...props} empty={<p>Er zijn nog geen doelpunten.</p>} rows={[]} />)

    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Er zijn nog geen doelpunten.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Doelpunt toevoegen' })).toBeTruthy()
  })

  it('marks a field that is not required as not required', () => {
    const [first, ...others] = props.rows

    render(
      <InputTable
        {...props}
        rows={[
          {
            ...(first as InputTableProps['rows'][number]),
            fields: [
              ...(first?.fields.slice(0, 1) ?? []),
              { control: <Input name="minuut-1" />, id: 'minuut-1', required: false },
            ],
          },
          ...others,
        ]}
      />,
    )

    const field = screen.getByRole('textbox', { name: /^Minuut, doelpunt 1/u })

    expect(field.hasAttribute('required')).toBe(false)
    expect(document.querySelector('label[for="minuut-1"]')?.textContent).toContain('(niet verplicht)')
  })

  it('has the hf-input-table class and passes on other attributes and a class', () => {
    const { container } = render(<InputTable {...props} className="extra" id="doelpunten" />)

    expect(container.firstElementChild?.className).toBe('hf-input-table extra')
    expect(container.firstElementChild?.id).toBe('doelpunten')
  })
})

describe('input-table.css', () => {
  const css = readFileSync(join(import.meta.dirname, 'input-table.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

  it('asks the table itself for its room, not the window, so it is right in any column', () => {
    expect(css).toContain('container-type: inline-size;')
    expect(css).toContain('@container (inline-size >= 48rem)')
    expect(css).not.toContain('@media')
  })

  it('shows the labels of the fields only for a screen reader where the headers are the labels', () => {
    const table = css.slice(css.indexOf('@container'))

    expect(table).toMatch(/\.hf-input-table-field > \.hf-field-label \{[^}]*clip-path: inset\(50%\);/u)
  })

  it('hides the headers of the columns where every row is a block, as the labels are in view', () => {
    const blocks = css.slice(0, css.indexOf('@container'))

    expect(blocks).toMatch(/\.hf-input-table thead \{\s*display: none;/u)
  })

  it('lets a form with the table be as wide as its parent, where a form is no wider than its longest field', () => {
    const form = readFileSync(join(import.meta.dirname, '../form/form.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

    expect(form).toMatch(/\.hf-form:has\(\.hf-input-table\) \{\s*max-inline-size: none;/u)
  })
})
