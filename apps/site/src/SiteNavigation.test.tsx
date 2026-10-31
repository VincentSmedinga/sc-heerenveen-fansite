import { usePathname } from 'next/navigation'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { currentOf, SiteNavigation } from './SiteNavigation'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))

/** The text of the links in the bar under the menu. */
function barLinks(html: string) {
  const bar = /<div class="hf-navigation-bar">(.*?)<\/div>/.exec(html)?.[1] ?? ''

  return [...bar.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label])
}

/** The text of the links marked as the current page. */
function currentLinks(html: string) {
  return linksWith(html, 'page')
}

/** The text of the links with this value of aria-current. */
function linksWith(html: string, value: 'page' | 'true') {
  return [
    ...html.matchAll(new RegExp(`<a [^>]*aria-current="${value}"[^>]*>([^<]*)(?:<svg.*?<\\/svg>)?<\\/a>`, 'g')),
  ].map(([, label]) => label)
}

function render(pathname: string) {
  vi.mocked(usePathname).mockReturnValue(pathname)

  return renderToStaticMarkup(<SiteNavigation />)
}

describe('SiteNavigation', () => {
  it('links to the news, the matches and the forum, in a navigation named Hoofdmenu', () => {
    const html = render('/wedstrijden')

    expect(html).toContain('<nav aria-label="Hoofdmenu"')
    expect(
      [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)(?:<svg.*?<\/svg>)?<\/a>/g)].map(([, href, label]) => [
        href,
        label,
      ]),
    ).toEqual([
      ['/', 'Nieuws'],
      ['/wedstrijden', 'Wedstrijden'],
      ['https://forum.heerenveen.org', 'Forum'],
    ])
  })

  it('draws the icon for a link to another site at the forum only, hidden from screen readers', () => {
    const html = render('/wedstrijden')
    const links = [...html.matchAll(/<a [^>]*>(.*?)<\/a>/g)].map(([, content]) => content ?? '')

    expect(links.map((content) => content.includes('<svg'))).toEqual([false, false, true])
    expect(links[2]).toMatch(/^Forum<svg aria-hidden="true" class="hf-icon"/)
    expect(html.match(/<svg/g)).toHaveLength(1)
  })

  it('has no link to the archive, the podcasts or the search in the menu itself', () => {
    expect(render('/wedstrijden')).not.toMatch(/href="\/nieuws/)
  })

  it('shows the bar with the archive, the podcasts and the search on the home page, with no sub-page current', () => {
    const html = render('/')

    expect(barLinks(html)).toEqual([
      ['/nieuws', 'Archief'],
      ['/nieuws/podcasts', 'Podcasts'],
      ['/nieuws/zoeken', 'Zoeken'],
    ])
    expect(currentLinks(html)).toEqual(['Nieuws'])
    expect(linksWith(html, 'true')).toEqual([])
  })

  it.each([
    ['/nieuws', 'Archief'],
    ['/nieuws/podcasts', 'Podcasts'],
    ['/nieuws/zoeken', 'Zoeken'],
  ])('marks %s as the current sub-page in the bar, and Nieuws as the item that holds it', (path, label) => {
    const html = render(path)

    expect(barLinks(html).map(([, text]) => text)).toEqual(['Archief', 'Podcasts', 'Zoeken'])
    expect(currentLinks(html)).toEqual([label])
    expect(linksWith(html, 'true')).toEqual(['Nieuws'])
  })

  it('shows the bar on an article of the editors, with Nieuws as the current item and no sub-page', () => {
    const html = render('/redactie/een-artikel')

    expect(barLinks(html)).toHaveLength(3)
    expect(currentLinks(html)).toEqual(['Nieuws'])
  })

  it.each(['/wedstrijden', '/wedstrijden/2025-26'])(
    'marks Wedstrijden as the current page on %s, with no bar',
    (path) => {
      const html = render(path)

      expect(currentLinks(html)).toEqual(['Wedstrijden'])
      expect(html).not.toContain('hf-navigation-bar')
    },
  )

  it.each(['/bronnen', '/nieuws/bestaat-niet', '/podcasts', '/zoeken', '/redactie', '/bestaat-niet'])(
    'marks nothing on %s, which is not in the menu, and shows no bar',
    (path) => {
      const html = render(path)

      expect(currentLinks(html)).toEqual([])
      expect(linksWith(html, 'true')).toEqual([])
      expect(html).not.toContain('hf-navigation-bar')
    },
  )

  it('has no link to Onze bronnen: that is in the footer', () => {
    expect(render('/bronnen')).not.toContain('/bronnen')
  })
})

describe('currentOf', () => {
  it.each([
    ['/', { item: '/' }],
    ['/nieuws', { item: '/', subitem: '/nieuws' }],
    ['/nieuws/podcasts', { item: '/', subitem: '/nieuws/podcasts' }],
    ['/nieuws/zoeken', { item: '/', subitem: '/nieuws/zoeken' }],
    ['/redactie/een-artikel', { item: '/' }],
    ['/wedstrijden', { item: '/wedstrijden' }],
    ['/wedstrijden/2025-26', { item: '/wedstrijden' }],
    ['/bronnen', {}],
    ['/nieuws/bestaat-niet', {}],
    ['/podcasts', {}],
    ['/zoeken', {}],
  ])('puts %s in the item and the sub-page %j', (path, expected) => {
    expect(currentOf(path)).toEqual(expected)
  })
})
