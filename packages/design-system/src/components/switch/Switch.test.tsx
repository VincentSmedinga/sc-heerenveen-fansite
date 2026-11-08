import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Switch } from './Switch'

describe('Switch', () => {
  it('is a checkbox with the role switch, named by its label', () => {
    render(<Switch checked label="Ververs automatisch" onChange={() => undefined} />)

    const control = screen.getByRole('switch', { name: 'Ververs automatisch' })

    expect(control.getAttribute('type')).toBe('checkbox')
    expect(control).toHaveProperty('checked', true)
  })

  it('tells the page when it is turned off', () => {
    const onChange = vi.fn()

    render(<Switch checked label="Ververs automatisch" onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))

    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
