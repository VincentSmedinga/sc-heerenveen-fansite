import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RefreshButton } from './RefreshButton'

describe('RefreshButton', () => {
  it('is a button with a name that says what it does, and it does not send a form', () => {
    render(<RefreshButton onClick={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Pagina verversen' })

    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.className).toBe('hf-refresh-button')
  })

  it('calls onClick when it is pressed', () => {
    const onClick = vi.fn()

    render(<RefreshButton onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is not hidden from screen readers: it is only hidden from the eye, in the CSS', () => {
    const { container } = render(<RefreshButton onClick={vi.fn()} />)

    expect(container.querySelector('[aria-hidden], [hidden], [tabindex="-1"]')).toBeNull()
  })
})
