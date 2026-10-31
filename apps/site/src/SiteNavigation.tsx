'use client'

import { Navigation } from '@fansite/design-system'
import { usePathname } from 'next/navigation'

// The sub-pages of Nieuws, in the bar under the menu: the archive, the podcasts and the search.
const newsSubitems = [
  { href: '/nieuws', label: 'Archief' },
  { href: '/nieuws/podcasts', label: 'Podcasts' },
  { href: '/nieuws/zoeken', label: 'Zoeken' },
]

const items = [
  { href: '/', label: 'Nieuws', subitems: newsSubitems },
  { href: '/wedstrijden', label: 'Wedstrijden' },
  { href: '/statistieken', label: 'Statistieken' },
  { external: true, href: 'https://forum.heerenveen.org', label: 'Forum' },
]

/**
 * The item of the menu and the sub-page that a path belongs to, each as an href, or undefined.
 * Nieuws has the home page, its sub-pages and the articles of the editors (`/redactie/<name>`);
 * Wedstrijden and Statistieken have the page and every page below it, such as the season. A
 * path that belongs to no item, such as /bronnen or a page that does not exist, has neither.
 */
export function currentOf(pathname: string): { item?: string; subitem?: string } {
  const subitem = newsSubitems.find((candidate) => candidate.href === pathname)

  if (subitem !== undefined) {
    return { item: '/', subitem: subitem.href }
  }

  if (pathname === '/' || pathname.startsWith('/redactie/')) {
    return { item: '/' }
  }

  if (pathname === '/wedstrijden' || pathname.startsWith('/wedstrijden/')) {
    return { item: '/wedstrijden' }
  }

  if (pathname === '/statistieken' || pathname.startsWith('/statistieken/')) {
    return { item: '/statistieken' }
  }

  return {}
}

/**
 * The main menu of the site, under the header: the news, the matches, the statistics and the
 * forum. The news has a bar with its sub-pages under the menu. The menu marks the item the
 * visitor is on, and the bar the sub-page. A layout gets no path, so this is a client
 * component: usePathname gives the path, also when the server renders the HTML.
 *
 * On a sub-page the item Nieuws is not the current page itself (the design system gives it
 * `aria-current="true"` then); only on the home page and on an article of the editors is it.
 */
export function SiteNavigation() {
  const here = currentOf(usePathname())

  return (
    <Navigation
      appearance="header"
      items={items.map((item) => ({
        ...item,
        current: item.href === here.item && here.subitem === undefined,
        ...(item.subitems && {
          subitems: item.subitems.map((subitem) => ({ ...subitem, current: subitem.href === here.subitem })),
        }),
      }))}
      label="Hoofdmenu"
    />
  )
}
