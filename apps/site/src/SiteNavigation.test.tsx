import { usePathname } from 'next/navigation'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SiteNavigation } from './SiteNavigation'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))

/** The text of the links marked as the current page. */
function currentLinks(html: string) {
  return [...html.matchAll(/<a [^>]*aria-current="page"[^>]*>([^<]*)<\/a>/g)].map(([, label]) => label)
}

function render(pathname: string) {
  vi.mocked(usePathname).mockReturnValue(pathname)

  return renderToStaticMarkup(<SiteNavigation />)
}

describe('SiteNavigation', () => {
  it('links to Onze bronnen and the forum, in a navigation named Hoofdmenu', () => {
    const html = render('/')

    expect(html).toContain('<nav aria-label="Hoofdmenu"')
    expect(
      [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label]),
    ).toEqual([
      ['/bronnen', 'Onze bronnen'],
      ['https://forum.heerenveen.org', 'Forum'],
    ])
  })

  it('marks Onze bronnen as the current page on /bronnen, and nothing else', () => {
    expect(currentLinks(render('/bronnen'))).toEqual(['Onze bronnen'])
  })

  it.each(['/', '/bestaat-niet'])('marks no link on %s', (pathname) => {
    expect(currentLinks(render(pathname))).toEqual([])
  })
})
