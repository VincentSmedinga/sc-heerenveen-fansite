import type { ReactNode } from 'react'

import { usePathname } from 'next/navigation'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { currentOf, hrefOf, seasonOfPath, SiteNavigation } from './SiteNavigation'

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

function render(pathname: string, matchesBar?: ReactNode) {
  vi.mocked(usePathname).mockReturnValue(pathname)

  return renderToStaticMarkup(<SiteNavigation matchesBar={matchesBar} />)
}

describe('SiteNavigation', () => {
  it('links to the news, the matches, the statistics, the players and the forum, in a navigation named Hoofdmenu', () => {
    const html = render('/statistieken')

    expect(html).toContain('<nav aria-label="Hoofdmenu"')
    expect(
      [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)(?:<svg.*?<\/svg>)?<\/a>/g)].map(([, href, label]) => [
        href,
        label,
      ]),
    ).toEqual([
      ['/nieuws', 'Nieuws'],
      ['/wedstrijden', 'Wedstrijden'],
      ['/statistieken', 'Statistieken'],
      ['/spelers', 'Spelers'],
      ['https://forum.heerenveen.org', 'Forum'],
    ])
  })

  it('draws the icon for a link to another site at the forum only, hidden from screen readers', () => {
    const html = render('/statistieken')
    const links = [...html.matchAll(/<a [^>]*>(.*?)<\/a>/g)].map(([, content]) => content ?? '')

    expect(links.map((content) => content.includes('<svg'))).toEqual([false, false, false, false, true])
    expect(links[4]).toMatch(/^Forum<svg aria-hidden="true" class="hf-icon"/)
    expect(html.match(/<svg/g)).toHaveLength(1)
  })

  it('has no link to the podcasts or the search in the menu itself', () => {
    expect(render('/statistieken')).not.toMatch(/href="\/nieuws\//)
  })

  it('has no link to Tegenstanders in the menu itself, only in the bar of Wedstrijden', () => {
    for (const path of ['/statistieken', '/nieuws']) {
      expect(render(path)).not.toContain('/tegenstanders')
    }
  })

  it('marks Nieuws as the current page on /nieuws, with the bar of the podcasts and the search and no sub-page current', () => {
    const html = render('/nieuws')

    expect(barLinks(html)).toEqual([
      ['/nieuws/podcasts', 'Podcasts'],
      ['/nieuws/zoeken', 'Zoeken'],
    ])
    expect(currentLinks(html)).toEqual(['Nieuws'])
    expect(linksWith(html, 'true')).toEqual([])
  })

  it('has no item that is current and no bar on the home page', () => {
    const html = render('/')

    expect(currentLinks(html)).toEqual([])
    expect(linksWith(html, 'true')).toEqual([])
    expect(html).not.toContain('hf-navigation-bar')
  })

  it.each([
    ['/nieuws/podcasts', 'Podcasts'],
    ['/nieuws/zoeken', 'Zoeken'],
  ])('marks %s as the current sub-page in the bar, and Nieuws as the item that holds it', (path, label) => {
    const html = render(path)

    expect(barLinks(html).map(([, text]) => text)).toEqual(['Podcasts', 'Zoeken'])
    expect(currentLinks(html)).toEqual([label])
    expect(linksWith(html, 'true')).toEqual(['Nieuws'])
  })

  it('shows the bar on an article of the editors, with Nieuws as the current item and no sub-page', () => {
    const html = render('/redactie/een-artikel')

    expect(barLinks(html)).toHaveLength(2)
    expect(currentLinks(html)).toEqual(['Nieuws'])
  })

  it.each(['/wedstrijden', '/wedstrijden/2025-26'])(
    'marks Wedstrijden as the current page on %s, with the bar of its sub-pages and none of them current',
    (path) => {
      const html = render(path)

      expect(currentLinks(html)).toEqual(['Wedstrijden'])
      expect(barLinks(html)).toEqual([['/tegenstanders', 'Tegenstanders']])
      expect(linksWith(html, 'true')).toEqual([])
    },
  )

  it.each(['/statistieken', '/statistieken/2025-26'])(
    'marks Statistieken as the current page on %s, with no bar',
    (path) => {
      const html = render(path)

      expect(currentLinks(html)).toEqual(['Statistieken'])
      expect(html).not.toContain('hf-navigation-bar')
      expect(linksWith(html, 'true')).toEqual([])
    },
  )

  it.each(['/spelers', '/spelers/2025-26'])(
    'marks Spelers as the current page on %s, and not Statistieken, with no bar',
    (path) => {
      const html = render(path)

      expect(currentLinks(html)).toEqual(['Spelers'])
      expect(linksWith(html, 'true')).toEqual([])
      expect(html).not.toContain('hf-navigation-bar')
    },
  )

  it('has exactly one item with aria-current on every page of the menu', () => {
    for (const path of ['/nieuws', '/wedstrijden', '/statistieken', '/spelers', '/spelers/2025-26']) {
      expect(render(path).match(/aria-current="page"/g)).toHaveLength(1)
    }
  })

  it.each(['/tegenstanders', '/tegenstanders/ado-den-haag'])(
    'marks Tegenstanders as the current sub-page on %s, and Wedstrijden as the item that holds it',
    (path) => {
      const html = render(path)

      expect(currentLinks(html)).toEqual(['Tegenstanders'])
      expect(linksWith(html, 'true')).toEqual(['Wedstrijden'])
      expect(barLinks(html)).toEqual([['/tegenstanders', 'Tegenstanders']])
    },
  )

  describe('with the bar of Wedstrijden from the slot', () => {
    // What the slot @subnav draws for ?competitie=eredivisie on the page of a season.
    const bar = (
      <div className="hf-navigation-bar">
        <a href="/tegenstanders?competitie=eredivisie">Tegenstanders</a>
      </div>
    )

    it.each(['/wedstrijden', '/wedstrijden/2025-26', '/tegenstanders', '/tegenstanders/ado-den-haag'])(
      'draws that bar instead of the fixed one on %s, in the item of Wedstrijden',
      (path) => {
        const html = render(path, bar)

        expect(barLinks(html)).toEqual([['/tegenstanders?competitie=eredivisie', 'Tegenstanders']])
        expect(html.match(/hf-navigation-bar/g)).toHaveLength(1)
        expect(html).toMatch(/<a [^>]*href="\/wedstrijden[^"]*"[^>]*>Wedstrijden<\/a><div class="hf-navigation-bar">/)
      },
    )

    it('draws no bar on Statistieken, which has no sub-pages', () => {
      expect(render('/statistieken/2025-26', bar)).toBe(render('/statistieken/2025-26'))
    })

    it('draws no bar on Spelers, which has no sub-pages', () => {
      expect(render('/spelers/2025-26', bar)).toBe(render('/spelers/2025-26'))
      expect(currentOf('/spelers/2025-26')).toEqual({ item: '/spelers' })
    })

    it('takes the season of the page along in the main menu, and no choice', () => {
      const html = render('/statistieken/2025-26', bar)
      const menu = html.replace(/<div class="hf-navigation-bar">.*?<\/div>/, '')

      expect([...menu.matchAll(/href="([^"]*)"/g)].map(([, href]) => href)).toEqual([
        '/nieuws',
        '/wedstrijden/2025-26',
        '/statistieken/2025-26',
        '/spelers/2025-26',
        'https://forum.heerenveen.org',
      ])
    })

    it.each(['/', '/nieuws', '/nieuws/podcasts', '/statistieken', '/bronnen'])(
      'leaves the other pages as they are, with their own bar or none, on %s',
      (path) => {
        expect(render(path, bar)).toBe(render(path))
      },
    )
  })

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

/** The addresses of the links of the menu, without the bar. */
function menuAddresses(pathname: string) {
  const html = render(pathname).replace(/<div class="hf-navigation-bar">.*?<\/div>/, '')

  return [...html.matchAll(/href="([^"]*)"/g)].map(([, href]) => href)
}

describe('the addresses of the main menu', () => {
  const fixed = ['/nieuws', '/wedstrijden', '/statistieken', '/spelers', 'https://forum.heerenveen.org']
  const inSeason = [
    '/nieuws',
    '/wedstrijden/2023-24',
    '/statistieken/2023-24',
    '/spelers/2023-24',
    'https://forum.heerenveen.org',
  ]

  it.each(['/wedstrijden/2023-24', '/statistieken/2023-24', '/spelers/2023-24'])(
    'take the season of the page along on %s, in the HTML of the server',
    (path) => {
      expect(menuAddresses(path)).toEqual(inSeason)
    },
  )

  it.each([
    '/',
    '/wedstrijden',
    '/statistieken',
    '/spelers',
    '/tegenstanders',
    '/tegenstanders/ado-den-haag',
    '/nieuws',
    '/nieuws/podcasts',
    '/redactie/een-artikel',
    '/bronnen',
    '/wedstrijden/kies',
    '/wedstrijden/onzin',
    '/wedstrijden/2023-25',
    '/wedstrijden/2023-24/',
    '/wedstrijden/2023-24/onzin',
    '/statistieken/kies',
    '/spelers/kies',
    '/spelers/onzin',
    '/spelers/2023-24/onzin',
    '/tegenstanders/2023-24',
  ])('stay as they are on %s: no season, no valid season, or not a page with a season', (path) => {
    expect(menuAddresses(path)).toEqual(fixed)
  })

  it('keeps the current item and the sub-page as the path says, whatever the address', () => {
    expect(currentLinks(render('/wedstrijden/2023-24'))).toEqual(['Wedstrijden'])
    expect(currentLinks(render('/statistieken/2023-24'))).toEqual(['Statistieken'])
    expect(currentLinks(render('/spelers/2023-24'))).toEqual(['Spelers'])
    expect(linksWith(render('/spelers/2023-24'), 'true')).toEqual([])
  })
})

describe('seasonOfPath', () => {
  it.each([
    ['/wedstrijden/2023-24', '2023/24'],
    ['/statistieken/2023-24', '2023/24'],
    ['/spelers/2023-24', '2023/24'],
    ['/wedstrijden', undefined],
    ['/spelers', undefined],
    ['/wedstrijden/2023-25', undefined],
    ['/wedstrijden/kies', undefined],
    ['/nieuws/2023-24', undefined],
    ['/', undefined],
  ])('reads %s as the season %s', (path, expected) => {
    expect(seasonOfPath(path)).toBe(expected)
  })
})

describe('hrefOf', () => {
  it('takes the season of Wedstrijden and Statistieken along to Spelers, and the other way', () => {
    expect(hrefOf('/spelers', '/wedstrijden/2023-24')).toBe('/spelers/2023-24')
    expect(hrefOf('/spelers', '/statistieken/2023-24')).toBe('/spelers/2023-24')
    expect(hrefOf('/wedstrijden', '/spelers/2023-24')).toBe('/wedstrijden/2023-24')
    expect(hrefOf('/statistieken', '/spelers/2023-24')).toBe('/statistieken/2023-24')
  })

  it('gives Spelers its own address on a page without a season', () => {
    expect(hrefOf('/spelers', '/wedstrijden')).toBe('/spelers')
    expect(hrefOf('/spelers', '/spelers/kies')).toBe('/spelers')
  })

  it('leaves the other items alone, also on the page of a season', () => {
    expect(hrefOf('/nieuws', '/wedstrijden/2023-24')).toBe('/nieuws')
    expect(hrefOf('https://forum.heerenveen.org', '/wedstrijden/2023-24')).toBe('https://forum.heerenveen.org')
  })
})

describe('currentOf', () => {
  it.each([
    ['/', {}],
    ['/nieuws', { item: '/nieuws' }],
    ['/nieuws/podcasts', { item: '/nieuws', subitem: '/nieuws/podcasts' }],
    ['/nieuws/zoeken', { item: '/nieuws', subitem: '/nieuws/zoeken' }],
    ['/redactie/een-artikel', { item: '/nieuws' }],
    ['/wedstrijden', { item: '/wedstrijden' }],
    ['/wedstrijden/2025-26', { item: '/wedstrijden' }],
    ['/statistieken', { item: '/statistieken' }],
    ['/statistieken/2025-26', { item: '/statistieken' }],
    ['/spelers', { item: '/spelers' }],
    ['/spelers/2025-26', { item: '/spelers' }],
    ['/statistieken/spelers', { item: '/statistieken' }],
    ['/tegenstanders', { item: '/wedstrijden', subitem: '/tegenstanders' }],
    ['/tegenstanders/ado-den-haag', { item: '/wedstrijden', subitem: '/tegenstanders' }],
    ['/statistieken/tegenstanders', { item: '/statistieken' }],
    ['/bronnen', {}],
    ['/nieuws/bestaat-niet', {}],
    ['/podcasts', {}],
    ['/zoeken', {}],
  ])('puts %s in the item and the sub-page %j', (path, expected) => {
    expect(currentOf(path)).toEqual(expected)
  })
})
