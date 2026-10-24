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
  it('links to the news and the forum, in a navigation named Hoofdmenu', () => {
    const html = render('/')

    expect(html).toContain('<nav aria-label="Hoofdmenu"')
    expect(
      [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label]),
    ).toEqual([
      ['/', 'Nieuws'],
      ['https://forum.heerenveen.org', 'Forum'],
    ])
  })

  it('has no link to Onze bronnen: that is in the footer', () => {
    expect(render('/bronnen')).not.toContain('/bronnen')
    expect(currentLinks(render('/bronnen'))).toEqual([])
  })

  it('marks Nieuws as the current page on the home page, and nothing else', () => {
    expect(currentLinks(render('/'))).toEqual(['Nieuws'])
  })

  it('marks no link on a page that is not in the menu', () => {
    expect(currentLinks(render('/bestaat-niet'))).toEqual([])
  })
})
