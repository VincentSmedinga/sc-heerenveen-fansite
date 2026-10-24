// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { themeStorageKey } from './theme'
import { ThemeToggle } from './ThemeToggle'

/** Makes matchMedia answer for the system: dark or light. It also lets a test change the system later. */
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

  it('shows nothing on the server, so a page without JavaScript has no buttons that do nothing', () => {
    expect(renderToStaticMarkup(<ThemeToggle />)).toBe('')
  })

  it('is a group named Thema with Licht and Donker, and presses the theme of the system without a choice', () => {
    stubSystem(true)
    render(<ThemeToggle />)

    expect(screen.getByRole('group', { name: 'Thema' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Licht' }).getAttribute('aria-pressed')).toBe('false')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
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
    fireEvent.click(screen.getByRole('button', { name: 'Licht' }))

    expect(localStorage.getItem(themeStorageKey)).toBeNull()
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(screen.getByRole('button', { name: 'Licht' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('does nothing when the pressed button is the one that is already pressed', () => {
    stubSystem(false)
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Licht' }))

    expect(localStorage.getItem(themeStorageKey)).toBeNull()
  })

  it('keeps a choice when the system changes later, even if it then matches the system', () => {
    const system = stubSystem(false)
    localStorage.setItem(themeStorageKey, 'dark')
    render(<ThemeToggle />)
    system.change(true)

    expect(localStorage.getItem(themeStorageKey)).toBe('dark')
    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('follows the system when it changes and there is no choice', () => {
    const system = stubSystem(false)
    render(<ThemeToggle />)
    system.change(true)

    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('true')
  })
})
