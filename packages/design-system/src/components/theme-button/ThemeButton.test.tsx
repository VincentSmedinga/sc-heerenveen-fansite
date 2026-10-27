import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ThemeButton } from './ThemeButton'

describe('ThemeButton', () => {
  it('is a button named by its label, with no visible text', () => {
    render(<ThemeButton dark={false} label="Donker" />)
    const button = screen.getByRole('button', { name: 'Donker' })

    expect(button.tagName).toBe('BUTTON')
    expect(button.textContent).toBe('')
    expect(button.className).toBe('hf-theme-button')
  })

  it('is a button that does not send a form', () => {
    render(<ThemeButton dark={false} label="Donker" />)

    expect(screen.getByRole('button').getAttribute('type')).toBe('button')
  })

  it('is not pressed in the light theme, and draws a filled sun with its rays', () => {
    render(<ThemeButton dark={false} label="Donker" />)
    const button = screen.getByRole('button', { name: 'Donker' })
    const icon = button.querySelector('svg')

    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(icon?.getAttribute('fill')).toBe('currentColor')
    expect(icon?.querySelectorAll('circle')).toHaveLength(1)
  })

  it('is pressed in the dark theme, and draws a filled moon', () => {
    render(<ThemeButton dark label="Donker" />)
    const button = screen.getByRole('button', { name: 'Donker' })
    const icon = button.querySelector('svg')

    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(icon?.getAttribute('fill')).toBe('currentColor')
    expect(icon?.querySelectorAll('circle')).toHaveLength(0)
    expect(icon?.querySelectorAll('path')).toHaveLength(1)
  })

  it('hides the icon from assistive technology, so the name and the state are all a screen reader hears', () => {
    render(<ThemeButton dark label="Donker" />)

    expect(screen.getByRole('button').querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('calls onClick when pressed, and keeps no state of its own', () => {
    const onClick = vi.fn()

    render(<ThemeButton dark={false} label="Donker" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Donker' }))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false')
  })

  it('adds a class and passes other attributes on', () => {
    render(<ThemeButton className="extra" dark={false} id="thema" label="Donker" />)

    expect(screen.getByRole('button').className).toBe('hf-theme-button extra')
    expect(screen.getByRole('button').id).toBe('thema')
  })
})
