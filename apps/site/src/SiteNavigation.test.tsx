import { usePathname } from 'next/navigation'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SiteNavigation } from './SiteNavigation'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))

/** The text of the links marked as the current page. */
function currentLinks(html: string) {
  return [...html.matchAll(/<a [^>]*aria-current="page"[^>]*>([^<]*)(?:<svg.*?<\/svg>)?<\/a>/g)].map(
    ([, label]) => label,
  )
}

function render(pathname: string) {
  vi.mocked(usePathname).mockReturnValue(pathname)

  return renderToStaticMarkup(<SiteNavigation />)
}

describe('SiteNavigation', () => {
  it('links to the news, the matches, the podcasts and the forum, in a navigation named Hoofdmenu', () => {
    const html = render('/')

    expect(html).toContain('<nav aria-label="Hoofdmenu"')
    expect(
      [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)(?:<svg.*?<\/svg>)?<\/a>/g)].map(([, href, label]) => [
        href,
        label,
      ]),
    ).toEqual([
      ['/', 'Nieuws'],
      ['/wedstrijden', 'Wedstrijden'],
      ['/podcasts', 'Podcasts'],
      ['https://forum.heerenveen.org', 'Forum'],
    ])
  })

  it('draws the icon for a link to another site at the forum only, hidden from screen readers', () => {
    const html = render('/')
    const links = [...html.matchAll(/<a [^>]*>(.*?)<\/a>/g)].map(([, content]) => content ?? '')

    expect(links.map((content) => content.includes('<svg'))).toEqual([false, false, false, true])
    expect(links[3]).toMatch(/^Forum<svg aria-hidden="true" class="hf-icon"/)
    expect(html.match(/<svg/g)).toHaveLength(1)
  })

  it('marks Podcasts as the current page on /podcasts, and nothing else', () => {
    expect(currentLinks(render('/podcasts'))).toEqual(['Podcasts'])
  })

  it('marks Wedstrijden as the current page on /wedstrijden, and nothing else', () => {
    expect(currentLinks(render('/wedstrijden'))).toEqual(['Wedstrijden'])
  })

  it('has no link to Onze bronnen: that is in the footer', () => {
    expect(render('/bronnen')).not.toContain('/bronnen')
    expect(currentLinks(render('/bronnen'))).toEqual([])
  })

  it('has no link to Zoeken: that is in the footer', () => {
    expect(render('/zoeken')).not.toContain('/zoeken')
    expect(currentLinks(render('/zoeken'))).toEqual([])
  })

  it('marks Nieuws as the current page on the home page, and nothing else', () => {
    expect(currentLinks(render('/'))).toEqual(['Nieuws'])
  })

  it('marks no link on a page that is not in the menu', () => {
    expect(currentLinks(render('/bestaat-niet'))).toEqual([])
  })
})
