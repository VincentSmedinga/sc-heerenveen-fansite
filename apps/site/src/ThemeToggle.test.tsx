// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { themeStorageKey } from './theme'
import { ThemeToggle } from './ThemeToggle'

/**
 * Makes matchMedia answer for the system: dark or light. It also lets a test change the system
 * later.
 */
function stubSystem(isDark: boolean) {
  let listener: (() => void) | undefined
  let dark = isDark

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: (_type: string, callback: () => void) => {
        listener = callback
      },
      get matches() {
        return dark
      },
      removeEventListener: () => {
        listener = undefined
      },
    })),
  )

  return {
    change: (next: boolean) => {
      dark = next
      act(() => {
        listener?.()
      })
    },
  }
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    // Vitest has no globals here, so Testing Library doesn't clean up by itself.
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows nothing on the server, so a page without JavaScript has no button that does nothing', () => {
    expect(renderToStaticMarkup(<ThemeToggle />)).toBe('')
  })

  it('is one button named Donker, with no visible text, and pressed on a dark system without a choice', () => {
    stubSystem(true)
    render(<ThemeToggle />)

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('group')).toBeNull()
    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Donker' }).textContent).toBe('')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('is not pressed on a light system without a choice', () => {
    stubSystem(false)
    render(<ThemeToggle />)

    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('follows the page with aria-pressed, and hides the icon from assistive technology', () => {
    stubSystem(true)
    render(<ThemeToggle />)

    const button = () => screen.getByRole('button', { name: 'Donker' })

    expect(button().getAttribute('aria-pressed')).toBe('true')
    expect(button().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')

    fireEvent.click(button())

    expect(button().getAttribute('aria-pressed')).toBe('false')
    expect(button().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('switches aria-pressed with the theme when it is pressed', () => {
    stubSystem(false)
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Donker' }))

    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('keeps a choice that differs from the system, and puts it on the page', () => {
    stubSystem(false)
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Donker' }))

    expect(localStorage.getItem(themeStorageKey)).toBe('dark')
    expect(document.documentElement.dataset['theme']).toBe('dark')
    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('forgets the choice when the pressed theme is what the system gives, and follows the system again', () => {
    stubSystem(false)
    localStorage.setItem(themeStorageKey, 'dark')
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Donker' }))

    expect(localStorage.getItem(themeStorageKey)).toBeNull()
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('keeps a choice on a dark system when the page is light, and forgets it when pressed back to dark', () => {
    stubSystem(true)
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Donker' }))

    expect(localStorage.getItem(themeStorageKey)).toBe('light')
    expect(document.documentElement.dataset['theme']).toBe('light')
    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(screen.getByRole('button', { name: 'Donker' }))

    expect(localStorage.getItem(themeStorageKey)).toBeNull()
    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('keeps a choice when the system changes later, even if it then matches the system', () => {
    const system = stubSystem(false)
    localStorage.setItem(themeStorageKey, 'dark')
    render(<ThemeToggle />)
    system.change(true)

    expect(localStorage.getItem(themeStorageKey)).toBe('dark')
    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('takes the strip at the top of the page off for a moment when the system changes, so Safari reads its colour again', () => {
    const system = stubSystem(false)
    const edge = document.createElement('div')

    edge.className = 'hf-page-top-edge'
    document.body.append(edge)
    render(<ThemeToggle />)
    expect(edge.style.display).toBe('')

    system.change(true)

    expect(edge.style.display).toBe('none')
    edge.remove()
  })

  it('follows the system when it changes and there is no choice', () => {
    const system = stubSystem(false)
    render(<ThemeToggle />)
    system.change(true)

    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('true')
  })
})
