import type * as React from 'react'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ErrorPage from './error'

const usePathname = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ usePathname }))
// renderToStaticMarkup doesn't run effects, so run them at once.
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof React>()),
  useEffect: (effect: () => void) => effect(),
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the page for an error that nothing caught', () => {
  it('shows the error page, with a link back to the page that failed', () => {
    usePathname.mockReturnValue('/bronnen')
    vi.stubGlobal('document', { querySelector: () => null, title: '' })

    const html = renderToStaticMarkup(<ErrorPage />)

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
    expect(html).toContain('<a href="/bronnen">Probeer het opnieuw</a>')
    expect(html).toContain('<a href="/">Naar de homepage</a>')
  })

  it('gives the page its own title, because the title is still the one of the page that failed', () => {
    usePathname.mockReturnValue('/bronnen')
    vi.stubGlobal('document', { querySelector: () => null, title: 'Onze bronnen – sc Heerenveen Fansite' })

    renderToStaticMarkup(<ErrorPage />)

    expect(document.title).toBe('Er ging iets mis – sc Heerenveen Fansite')
  })

  it('keeps the branch in the title when the layout has put one in a meta tag', () => {
    usePathname.mockReturnValue('/bronnen')
    vi.stubGlobal('document', {
      querySelector: (selector: string) =>
        selector === 'meta[name="review-branch"]' ? { content: 'feat/125-pnpm-review' } : null,
      title: 'feat/125-pnpm-review · Onze bronnen – sc Heerenveen Fansite',
    })

    renderToStaticMarkup(<ErrorPage />)

    expect(document.title).toBe('feat/125-pnpm-review · Er ging iets mis – sc Heerenveen Fansite')
  })
})
