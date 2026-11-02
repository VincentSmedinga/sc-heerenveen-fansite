import { fireEvent, render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { Input } from '../input/Input'
import { RadioGroup } from '../radio-group/RadioGroup'
import { Select } from '../select/Select'
import { InputTable, type InputTableProps } from './InputTable'

const team = (number: number, value: string) => ({
  group: (legend: React.ReactNode) => (
    <RadioGroup
      id={`team-${number}`}
      legend={legend}
      name={`team-${number}`}
      options={[
        { label: 'Testclub', value: 'thuis' },
        { label: 'FC Voorbeeld', value: 'uit' },
      ]}
      value={value}
    />
  ),
  id: `team-${number}`,
})

const props: InputTableProps = {
  add: { label: 'Doelpunt toevoegen', name: 'actie', value: 'toevoegen' },
  caption: 'Doelpunten',
  columns: [
    { name: 'Minuut', width: 'narrow' },
    { name: 'Soort', width: 'natural' },
    { line: 2, name: 'Team' },
    { line: 2, name: 'Speler' },
  ],
  rows: [
    {
      fields: [
        { control: <Input defaultValue="23" name="minuut-1" />, id: 'minuut-1' },
        {
          control: (
            <Select defaultValue="gewoon" name="soort-1">
              <Select.Option value="gewoon">Gewoon</Select.Option>
            </Select>
          ),
          id: 'soort-1',
        },
        team(1, 'thuis'),
        { control: <Input defaultValue="Sem de Vries" name="speler-1" />, id: 'speler-1' },
      ],
      header: 'Doelpunt 1',
      mark: '1',
      remove: { name: 'actie', value: 'weghalen-1' },
    },
    {
      fields: [
        { control: <Input name="minuut-2" />, error: 'Vul een minuut in.', id: 'minuut-2' },
        {
          control: (
            <Select defaultValue="gewoon" name="soort-2">
              <Select.Option value="gewoon">Gewoon</Select.Option>
            </Select>
          ),
          id: 'soort-2',
        },
        team(2, ''),
        { control: <Input name="speler-2" />, id: 'speler-2' },
      ],
      header: 'Doelpunt 2',
      mark: '2',
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

  it('shows the number of the row as its header, and keeps the full name for a screen reader', () => {
    render(<InputTable {...props} />)

    const headers = screen.getAllByRole('rowheader')

    expect(headers.map((header) => header.textContent)).toEqual(['1Doelpunt 1', '2Doelpunt 2'])
    expect(headers.map((header) => header.querySelector('[aria-hidden]')?.textContent)).toEqual(['1', '2'])
    expect(headers.map((header) => header.querySelector('.hf-visually-hidden')?.textContent)).toEqual([
      'Doelpunt 1',
      'Doelpunt 2',
    ])
    expect(document.querySelectorAll('tbody th[scope="row"]')).toHaveLength(2)
    expect(document.querySelector('thead')).toBeNull()
  })

  it('shows the name of the row as its header when it has no mark', () => {
    render(
      <InputTable {...props} rows={props.rows.map(({ fields, header, remove }) => ({ fields, header, remove }))} />,
    )

    expect(
      screen.getAllByRole('rowheader').map((header) => header.querySelector('[aria-hidden]')?.textContent),
    ).toEqual(['Doelpunt 1', 'Doelpunt 2'])
  })

  it('gives every field a label that names the column and the row', () => {
    render(<InputTable {...props} />)

    expect(screen.getByRole('textbox', { name: 'Minuut, doelpunt 1' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Minuut, doelpunt 2' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Soort, doelpunt 2' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Speler, doelpunt 2' })).toBeTruthy()
  })

  it('shows the column name as the visible label and keeps the name of the row for a screen reader', () => {
    render(<InputTable {...props} />)
    const label = document.querySelector('label[for="minuut-1"]')

    expect(label?.firstChild?.textContent).toBe('Minuut')
    expect(label?.querySelector('.hf-visually-hidden')?.textContent).toBe(', doelpunt 1')
  })

  it('puts the fields of each column on their own line, in the order of the columns', () => {
    render(<InputTable {...props} />)
    const first = screen.getAllByRole('row')[0] as HTMLElement
    const lines = first.querySelectorAll('td[class^="hf-input-table-line-"]')

    expect([...lines].map((line) => line.className)).toEqual(['hf-input-table-line-1', 'hf-input-table-line-2'])
    expect(within(lines[0] as HTMLElement).getAllByRole('textbox')).toHaveLength(1)
    expect(within(lines[0] as HTMLElement).getByRole('combobox')).toBeTruthy()
    expect(within(lines[1] as HTMLElement).getByRole('group', { name: 'Team, doelpunt 1' })).toBeTruthy()
    expect(within(lines[1] as HTMLElement).getByRole('textbox', { name: 'Speler, doelpunt 1' })).toBeTruthy()
  })

  it('has one line when no column asks for a second', () => {
    render(<InputTable {...props} columns={props.columns.map((column) => ({ ...column, line: 1 as const }))} />)

    expect(document.querySelectorAll('.hf-input-table-line-1')).toHaveLength(2)
    expect(document.querySelectorAll('.hf-input-table-line-2')).toHaveLength(0)
  })

  it('takes a group as a field, with the label as its legend', () => {
    render(<InputTable {...props} />)

    const group = screen.getByRole('group', { name: 'Team, doelpunt 2' })

    expect(group.querySelector('legend')?.firstChild?.textContent).toBe('Team')
    expect(within(group).getAllByRole('radio')).toHaveLength(2)
    expect((screen.getAllByRole('radio', { name: 'Testclub' })[0] as HTMLInputElement).checked).toBe(true)
  })

  it('shows the error of a field and marks the field as invalid', () => {
    render(<InputTable {...props} />)

    const field = screen.getByRole('textbox', { name: 'Minuut, doelpunt 2' })

    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.getAttribute('aria-describedby')).toBe('minuut-2-error')
    expect(document.getElementById('minuut-2-error')?.textContent).toContain('Vul een minuut in.')
  })

  it('has a bin in every row that removes the row, and says which row in its name', () => {
    render(<InputTable {...props} />)

    const second = screen.getAllByRole('row')[1] as HTMLElement
    const button = within(second).getByRole('button', { name: 'Doelpunt 2 weghalen' })

    expect(button.getAttribute('type')).toBe('submit')
    expect(button.getAttribute('name')).toBe('actie')
    expect(button.getAttribute('value')).toBe('weghalen-2')
    expect(button.getAttribute('title')).toBe('Doelpunt 2 weghalen')
    expect(button.textContent).toBe('')
  })

  it('uses the text for the remove button that it is given', () => {
    render(<InputTable {...props} removeLabel="Haal weg" />)

    expect(screen.getByRole('button', { name: 'Doelpunt 1 haal weg' })).toBeTruthy()
  })

  it('has a button under the table that adds a row', () => {
    render(<InputTable {...props} />)

    const button = screen.getByRole('button', { name: 'Doelpunt toevoegen' })

    expect(button.getAttribute('type')).toBe('submit')
    expect(button.getAttribute('name')).toBe('actie')
    expect(button.getAttribute('value')).toBe('toevoegen')
    expect(screen.getByRole('table').compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('marks a narrow column and a natural one', () => {
    render(<InputTable {...props} />)

    expect(screen.getByRole('textbox', { name: 'Minuut, doelpunt 1' }).closest('.hf-input-table-item')?.className).toBe(
      'hf-input-table-item hf-input-table-narrow',
    )
    expect(screen.getByRole('combobox', { name: 'Soort, doelpunt 1' }).closest('.hf-input-table-item')?.className).toBe(
      'hf-input-table-item hf-input-table-natural',
    )
    expect(screen.getByRole('textbox', { name: 'Speler, doelpunt 1' }).closest('.hf-input-table-item')?.className).toBe(
      'hf-input-table-item',
    )
  })

  it('shows what is given instead of the table when there are no rows, and keeps the add button', () => {
    render(<InputTable {...props} empty={<p>Er zijn nog geen doelpunten.</p>} rows={[]} />)

    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Er zijn nog geen doelpunten.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Doelpunt toevoegen' })).toBeTruthy()
  })

  it('marks the fields of a column that is not required as not required, in the label', () => {
    render(<InputTable {...props} columns={props.columns.map((column) => ({ ...column, required: false }))} />)

    const field = screen.getByRole('textbox', { name: /^Minuut, doelpunt 1/u })

    expect(field.hasAttribute('required')).toBe(false)
    expect(document.querySelector('label[for="minuut-1"]')?.textContent).toContain('(niet verplicht)')
    expect(screen.getByRole('textbox', { name: 'Minuut, doelpunt 2 (niet verplicht)' })).toBeTruthy()
  })

  it('leaves "niet verplicht" out with hideOptional, and keeps the fields as they were', () => {
    render(
      <InputTable
        {...props}
        columns={props.columns.map((column) => ({ ...column, hideOptional: true, required: false }))}
      />,
    )

    expect(screen.getByRole('textbox', { name: 'Minuut, doelpunt 1' }).hasAttribute('required')).toBe(false)
    expect(document.querySelector('.hf-field-status')).toBeNull()
  })

  it('makes the fields of a column that is required required, and says nothing about it', () => {
    render(<InputTable {...props} />)

    expect(screen.getByRole('textbox', { name: 'Minuut, doelpunt 1' }).hasAttribute('required')).toBe(true)
    expect(document.querySelector('.hf-field-status')).toBeNull()
  })

  it('hides a field that does not apply, and does not send it, but keeps what was entered', () => {
    const rows = props.rows.map((row, index) => ({
      ...row,
      fields: row.fields.map((field, position) => ({ ...field, hidden: index === 0 && position === 3 })),
    }))
    const { container } = render(
      <form>
        <InputTable {...props} rows={rows} />
      </form>,
    )
    const form = container.querySelector('form') as HTMLFormElement
    const hidden = container.querySelector('input[name="speler-1"]') as HTMLInputElement

    expect(hidden.closest('[hidden]')).toBeTruthy()
    expect(hidden.value).toBe('Sem de Vries')
    expect(new FormData(form).get('speler-1')).toBeNull()
    expect(new FormData(form).has('speler-2')).toBe(true)
    expect(screen.queryByRole('textbox', { name: 'Speler, doelpunt 1' })).toBeNull()
  })

  it('keeps the field itself when it is hidden and shown again, so what was typed is not lost', () => {
    const row = (hidden: boolean) => ({
      ...(props.rows[0] as (typeof props.rows)[number]),
      fields: (props.rows[0]?.fields ?? []).map((field, position) => ({ ...field, hidden: hidden && position === 3 })),
    })
    const { rerender } = render(<InputTable {...props} rows={[row(false)]} />)
    const input = screen.getByRole('textbox', { name: 'Speler, doelpunt 1' }) as HTMLInputElement

    fireEvent.change(input, { target: { value: 'Pim Bakker' } })
    rerender(<InputTable {...props} rows={[row(true)]} />)
    rerender(<InputTable {...props} rows={[row(false)]} />)

    expect(screen.getByRole('textbox', { name: 'Speler, doelpunt 1' })).toBe(input)
    expect(input.value).toBe('Pim Bakker')
  })

  it('puts every field in a fieldset without a role, so a screen reader hears no group around it', () => {
    render(<InputTable {...props} />)

    const items = document.querySelectorAll('.hf-input-table-item')

    expect(items).toHaveLength(8)
    expect([...items].every((item) => item.tagName === 'FIELDSET' && item.getAttribute('role') === 'none')).toBe(true)
    expect(screen.getAllByRole('group').map((group) => group.querySelector('legend')?.firstChild?.textContent)).toEqual(
      ['Team', 'Team'],
    )
  })

  it('does not send a hidden group either', () => {
    const rows = props.rows.map((row, index) => ({
      ...row,
      fields: row.fields.map((field, position) => ({ ...field, hidden: index === 0 && position === 2 })),
    }))
    const { container } = render(
      <form>
        <InputTable {...props} rows={rows} />
      </form>,
    )
    const form = container.querySelector('form') as HTMLFormElement

    expect(new FormData(form).has('team-1')).toBe(false)
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
    expect(css).toContain('@container (inline-size >= 40rem)')
    expect(css).not.toContain('@media')
  })

  it('makes every row a block by default, with the lines under the number and the button', () => {
    const blocks = css.slice(0, css.indexOf('@container'))

    expect(blocks).toMatch(/\.hf-input-table tr \{[^}]*display: grid;/u)
    expect(blocks).toMatch(/'number action'\s*'first first'\s*'second second'/u)
  })

  it('puts the lines next to the number and the button where the table has room', () => {
    const wide = css.slice(css.indexOf('@container'))

    expect(wide).toMatch(/'number first action'\s*'\. second \.'/u)
  })

  it('shows no label for a screen reader only: every field has its label in view', () => {
    expect(css).not.toContain('clip-path')
    expect(css).not.toContain('thead')
  })

  it('lets a form with the table be as wide as its parent, where a form is no wider than its longest field', () => {
    const form = readFileSync(join(import.meta.dirname, '../form/form.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

    expect(form).toMatch(/\.hf-form:has\(\.hf-input-table\) \{\s*max-inline-size: none;/u)
  })
})
