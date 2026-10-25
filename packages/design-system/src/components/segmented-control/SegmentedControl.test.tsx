import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SegmentedControl } from './SegmentedControl'

const options = [
  { label: 'Licht', value: 'light' },
  { label: 'Donker', value: 'dark' },
] as const

describe('SegmentedControl', () => {
  it('is a group with a name, with a button for each option', () => {
    render(<SegmentedControl label="Thema" onChange={vi.fn()} options={options} value="light" />)

    const group = screen.getByRole('group', { name: 'Thema' })

    expect(group.className).toBe('hf-segmented-control')
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Licht', 'Donker'])
  })

  it('has no icons unless an option asks for one', () => {
    render(<SegmentedControl label="Thema" onChange={vi.fn()} options={options} value="light" />)

    expect(document.querySelector('svg')).toBeNull()
  })

  it('puts the icon of an option in front of its text, filled on the pressed button and a line on the others', () => {
    render(
      <SegmentedControl
        label="Thema"
        onChange={vi.fn()}
        options={[
          { icon: 'sun', label: 'Licht', value: 'light' },
          { icon: 'moon', label: 'Donker', value: 'dark' },
        ]}
        value="dark"
      />,
    )
    const light = screen.getByRole('button', { name: 'Licht' })
    const dark = screen.getByRole('button', { name: 'Donker' })

    expect(light.querySelector('svg')?.getAttribute('fill')).toBe('none')
    expect(dark.querySelector('svg')?.getAttribute('fill')).toBe('currentColor')
    expect(light.firstElementChild?.className).toBe('hf-icon-head')
    expect(light.textContent).toBe('Licht')
    expect(dark.textContent).toBe('Donker')
  })

  it('keeps the pressed state in aria-pressed whatever the icon shows', () => {
    render(
      <SegmentedControl
        label="Thema"
        onChange={vi.fn()}
        options={[
          { icon: 'sun', label: 'Licht', value: 'light' },
          { icon: 'moon', label: 'Donker', value: 'dark' },
        ]}
        value="light"
      />,
    )

    expect(screen.getByRole('button', { name: 'Licht' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('presses only the button of the value, and none of them sends a form', () => {
    render(<SegmentedControl label="Thema" onChange={vi.fn()} options={options} value="dark" />)

    expect(screen.getByRole('button', { name: 'Licht' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('true')
    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('type')).toBe('button')
    }
  })

  it('calls onChange with the value of the button that is pressed, also the one that is already pressed', () => {
    const onChange = vi.fn()

    render(<SegmentedControl label="Thema" onChange={onChange} options={options} value="light" />)
    fireEvent.click(screen.getByRole('button', { name: 'Donker' }))
    fireEvent.click(screen.getByRole('button', { name: 'Licht' }))

    expect(onChange.mock.calls).toEqual([['dark'], ['light']])
  })

  it('holds no state: the pressed button stays the one of the value until the page changes it', () => {
    render(<SegmentedControl label="Thema" onChange={vi.fn()} options={options} value="light" />)
    fireEvent.click(screen.getByRole('button', { name: 'Donker' }))

    expect(screen.getByRole('button', { name: 'Licht' }).getAttribute('aria-pressed')).toBe('true')
  })
})
