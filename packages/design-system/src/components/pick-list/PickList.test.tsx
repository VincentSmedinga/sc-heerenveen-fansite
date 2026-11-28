import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PickList, type PickListGroup } from './PickList'

const midfield: PickListGroup = {
  chosen: 1,
  id: 'middenvelders',
  legend: 'Middenvelders',
  maximum: 2,
  name: 'middenvelder',
  options: [
    { label: 'Testspeler A', line: '31 punten · nog 3 keer', value: 'a' },
    { label: 'Testspeler B', line: '12 punten · nog 5 keer', value: 'b' },
    { disabled: true, label: 'Testspeler C', reason: 'Al 10 keer gekozen', value: 'c' },
  ],
  value: ['a'],
}

describe('PickList', () => {
  it('is a fieldset for each group, named by its legend, with the counter as text in the legend', () => {
    render(<PickList groups={[midfield]} />)
    const group = screen.getByRole('group', { name: 'Middenvelders, 1 van 2' })

    expect(group.tagName).toBe('FIELDSET')
    expect(group.querySelector('legend')?.textContent).toBe('Middenvelders, 1 van 2')
  })

  it('has a checkbox for each player with his name as the label, and the line behind it', () => {
    render(<PickList groups={[midfield]} />)
    const box = screen.getByRole('checkbox', { name: /Testspeler A/ })

    expect(box.getAttribute('name')).toBe('middenvelder')
    expect(box.getAttribute('value')).toBe('a')
    expect(box.closest('label')?.textContent).toBe('Testspeler A31 punten · nog 3 keer')
  })

  it('checks the values it is given and nothing else', () => {
    render(<PickList groups={[midfield]} />)

    expect(
      screen
        .getAllByRole('checkbox')
        .filter((box) => (box as HTMLInputElement).checked)
        .map((box) => box.getAttribute('value')),
    ).toEqual(['a'])
  })

  it('ties the reason to the disabled checkbox, so it is read with the name', () => {
    render(<PickList groups={[midfield]} />)
    const box = screen.getByRole('checkbox', { name: /Testspeler C/ }) as HTMLInputElement
    const reason = document.getElementById(box.getAttribute('aria-describedby') ?? '')

    expect(box.disabled).toBe(true)
    expect(reason?.textContent).toBe('Al 10 keer gekozen')
    expect(box.closest('label')?.hasAttribute('data-disabled')).toBe(true)
    expect(screen.getByRole('checkbox', { name: /Testspeler A/ }).hasAttribute('aria-describedby')).toBe(false)
  })

  it('shows the error under the legend, tied to the group, with the counter marked as invalid', () => {
    render(<PickList groups={[{ ...midfield, chosen: 3, error: 'Kies hoogstens 2 middenvelders.' }]} />)
    const group = screen.getByRole('group', { name: 'Middenvelders, 3 van 2' })
    const error = document.getElementById(group.getAttribute('aria-describedby') ?? '')

    expect(error?.textContent).toBe('Fout: Kies hoogstens 2 middenvelders.')
    expect(group.hasAttribute('data-invalid')).toBe(true)
  })

  it('has no error and no invalid mark without an error', () => {
    render(<PickList groups={[midfield]} />)
    const group = screen.getByRole('group')

    expect(group.hasAttribute('aria-describedby')).toBe(false)
    expect(group.hasAttribute('data-invalid')).toBe(false)
  })

  it('puts the id of the group on the first checkbox and numbers the others', () => {
    render(<PickList groups={[midfield]} />)

    expect(screen.getByRole('checkbox', { name: /Testspeler A/ }).id).toBe('middenvelders')
    expect(screen.getByRole('checkbox', { name: /Testspeler B/ }).id).toBe('middenvelders-2')
  })

  it('sends only the checked values with the form, under the name of the group', () => {
    const { container } = render(
      <form>
        <PickList groups={[midfield]} />
      </form>,
    )

    expect(new FormData(container.querySelector('form') as HTMLFormElement).getAll('middenvelder')).toEqual(['a'])
  })
})
