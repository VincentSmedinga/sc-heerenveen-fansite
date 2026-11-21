// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { saveSupporterMarker } from './supporter-marker'
import { SupporterButton } from './SupporterButton'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('SupporterButton', () => {
  it('is the link Inloggen in the HTML of the server, also when the browser has the mark', () => {
    saveSupporterMarker('Blauwwit_Sjoerd')

    const html = renderToString(<SupporterButton />)

    expect(html).toContain('aria-label="Inloggen"')
    expect(html).toContain('href="/fans/inloggen"')
    expect(html).not.toContain('Mijn account')
    expect(html).not.toContain('Blauwwit')
    expect(html).not.toContain('data-signed-in')
  })

  it('is the link Inloggen without the mark', () => {
    render(<SupporterButton />)

    expect(screen.getByRole('link', { name: 'Inloggen' })).toHaveProperty('pathname', '/fans/inloggen')
  })

  it('is Mijn account with the initials, never the screen name, when the browser has the mark', () => {
    saveSupporterMarker('Blauwwit_Sjoerd')
    const { container } = render(<SupporterButton />)

    expect(screen.getByRole('link', { name: 'Mijn account' })).toHaveProperty('pathname', '/fans/mijn-account')
    expect(screen.queryByRole('link', { name: 'Inloggen' })).toBeNull()
    expect(container.innerHTML).not.toContain('Blauwwit')
    expect(container.innerHTML).not.toContain('Sjoerd')
    expect(container.querySelector('.hf-account-button-initials path')).not.toBeNull()
  })

  it('hydrates the HTML of the server without a mismatch, and then shows the mark', async () => {
    saveSupporterMarker('Tjalle99')

    const container = document.createElement('div')

    container.innerHTML = renderToString(<SupporterButton />)
    document.body.append(container)

    const errors: unknown[] = []

    await act(async () => {
      hydrateRoot(container, <SupporterButton />, {
        onRecoverableError: (error) => {
          errors.push(error)
        },
      })
    })

    expect(errors).toEqual([])
    expect(container.querySelector('a')?.getAttribute('aria-label')).toBe('Mijn account')
    container.remove()
  })

  it('follows the mark in the same tab when somebody logs in and out', () => {
    render(<SupporterButton />)
    expect(screen.queryByRole('link', { name: 'Mijn account' })).toBeNull()

    act(() => {
      saveSupporterMarker('Tjalle99')
    })
    expect(screen.getByRole('link', { name: 'Mijn account' })).toBeTruthy()

    act(() => {
      saveSupporterMarker(undefined)
    })
    expect(screen.getByRole('link', { name: 'Inloggen' })).toBeTruthy()
  })

  it('keeps the size of the button: the same element and classes with and without initials', () => {
    const { container } = render(<SupporterButton />)
    const before = container.querySelector('a')?.className

    act(() => {
      saveSupporterMarker('Tjalle99')
    })

    expect(container.querySelector('a')?.className).toBe(before)
  })
})
