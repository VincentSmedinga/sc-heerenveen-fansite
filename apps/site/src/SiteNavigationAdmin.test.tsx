// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { saveAdminMarker } from './admin-marker'
import { SiteNavigation } from './SiteNavigation'

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/wedstrijden') }))

// The item Beheer of the main menu depends on the mark in localStorage, which only the browser
// has. The tests of the menu itself render on the server (SiteNavigation.test.tsx); these need
// a DOM.

const names = () => screen.getAllByRole('link').map((link) => link.textContent)

describe('the item Beheer in the main menu', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    // Vitest has no globals here, so Testing Library doesn't clean up by itself.
    cleanup()
    vi.restoreAllMocks()
  })

  it('is not in the HTML of the server, also when the browser has the mark', () => {
    saveAdminMarker(true)

    const html = renderToString(<SiteNavigation />)

    expect(html).not.toContain('Beheer')
    expect(html).not.toContain('/beheer')
  })

  it('is not there without the mark', () => {
    render(<SiteNavigation />)

    expect(names()).toEqual(['Nieuws', 'Wedstrijden', 'Statistieken', 'Forum'])
  })

  it('comes before Forum, which stays last, as a plain link to /beheer, when the browser has the mark', () => {
    saveAdminMarker(true)
    render(<SiteNavigation />)

    expect(names()).toEqual(['Nieuws', 'Wedstrijden', 'Statistieken', 'Beheer', 'Forum'])
    expect(screen.getByRole('link', { name: 'Beheer' })).toHaveProperty('pathname', '/beheer')
    expect(screen.getByRole('link', { name: 'Beheer' }).hasAttribute('target')).toBe(false)
    expect(screen.getByRole('link', { name: 'Beheer' }).querySelector('svg')).toBeNull()
  })

  it('appears and goes away in the same tab when the mark changes', () => {
    render(<SiteNavigation />)
    expect(screen.queryByRole('link', { name: 'Beheer' })).toBeNull()

    act(() => {
      saveAdminMarker(true)
    })
    expect(screen.getByRole('link', { name: 'Beheer' })).toBeTruthy()

    act(() => {
      saveAdminMarker(false)
    })
    expect(screen.queryByRole('link', { name: 'Beheer' })).toBeNull()
  })

  it('hydrates the HTML of the server without a mismatch, and then adds the item', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const container = document.createElement('div')

    container.innerHTML = renderToString(<SiteNavigation />)
    saveAdminMarker(true)

    act(() => {
      hydrateRoot(container, <SiteNavigation />)
    })

    expect(error).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Beheer')
  })

  it('is the current page, like the other items, anywhere in the admin', async () => {
    const { usePathname } = await import('next/navigation')

    saveAdminMarker(true)
    vi.mocked(usePathname).mockReturnValue('/beheer/berichten')
    render(<SiteNavigation />)

    expect(screen.getByRole('link', { name: 'Beheer' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Wedstrijden' }).hasAttribute('aria-current')).toBe(false)
  })
})
