'use client'

import type { ReactNode } from 'react'

import { Navigation } from '@fansite/design-system'
import { usePathname } from 'next/navigation'

// The sub-pages of Nieuws, in the bar under the menu: the podcasts and the search. Nieuws
// itself is the news overview, so there is no separate archive.
const newsSubitems = [
  { href: '/nieuws/podcasts', label: 'Podcasts' },
  { href: '/nieuws/zoeken', label: 'Zoeken' },
]

// The sub-pages of Statistieken. Seizoenen comes later.
const statisticsSubitems = [
  { href: '/statistieken/spelers', label: 'Spelers' },
  { href: '/statistieken/tegenstanders', label: 'Tegenstanders' },
]

const statisticsPath = '/statistieken'

const newsPath = '/nieuws'

const items = [
  { href: newsPath, label: 'Nieuws', subitems: newsSubitems },
  { href: '/wedstrijden', label: 'Wedstrijden' },
  { href: statisticsPath, label: 'Statistieken', subitems: statisticsSubitems },
  { external: true, href: 'https://forum.heerenveen.org', label: 'Forum' },
]

/**
 * The item of the menu and the sub-page that a path belongs to, each as an href, or undefined.
 * Nieuws has the news overview, its sub-pages and the articles of the editors
 * (`/redactie/<name>`); the home page has no item, because it is the front page of the whole
 * site and the logo links to it. Wedstrijden has the page and every page below it, such as the
 * season. Statistieken has the same, and two sub-pages of its own: Spelers, with the page of
 * each season below it (`/statistieken/spelers/2025-26`), and Tegenstanders, with the page of
 * each club below it (`/statistieken/tegenstanders/ado-den-haag`). A path that belongs to no
 * item, such as
 * /bronnen, the home page or a page that does not exist, has neither.
 */
export function currentOf(pathname: string): { item?: string; subitem?: string } {
  const subitem = newsSubitems.find((candidate) => candidate.href === pathname)

  if (subitem !== undefined) {
    return { item: newsPath, subitem: subitem.href }
  }

  if (pathname === newsPath || pathname.startsWith('/redactie/')) {
    return { item: newsPath }
  }

  if (pathname === '/wedstrijden' || pathname.startsWith('/wedstrijden/')) {
    return { item: '/wedstrijden' }
  }

  if (pathname === '/statistieken/spelers' || pathname.startsWith('/statistieken/spelers/')) {
    return { item: '/statistieken', subitem: '/statistieken/spelers' }
  }

  if (pathname === '/statistieken/tegenstanders' || pathname.startsWith('/statistieken/tegenstanders/')) {
    return { item: '/statistieken', subitem: '/statistieken/tegenstanders' }
  }

  if (pathname === '/statistieken' || pathname.startsWith('/statistieken/')) {
    return { item: '/statistieken' }
  }

  return {}
}

/**
 * The main menu of the site, under the header: the news, the matches, the statistics and the
 * forum. The news and the statistics have a bar with their sub-pages under the menu. The menu
 * marks the item the visitor is on, and the bar the sub-page. A layout gets no path, so this is
 * a client component: usePathname gives the path, also when the server renders the HTML.
 *
 * The addresses of the items are fixed, and so are the links of the bar of Nieuws. The bar of
 * Statistieken is different: its links keep the season and the choice between all matches and
 * the Eredivisie of the page, and the choice is in the query string, which a client component
 * in a layout can only read with `useSearchParams` and a Suspense boundary, and that would
 * touch every page. So the pages of Statistieken draw the bar on the server (the slot
 * `@subnav`, see layout.tsx) and hand it in as `statisticsBar`. The sub-pages listed here only
 * tell which one is the current one, and give the bar when there is no slot.
 *
 * On a sub-page the item Nieuws or Statistieken is not the current page itself (the design
 * system gives it `aria-current="true"` then); only on /nieuws and on an article of the
 * editors, and on /statistieken and the page of a season below it, is it.
 */
export function SiteNavigation({ statisticsBar }: { statisticsBar?: ReactNode }) {
  const pathname = usePathname()
  const here = currentOf(pathname)

  return (
    <Navigation
      appearance="header"
      items={items.map((item) => ({
        ...item,
        ...(item.href === statisticsPath && statisticsBar !== undefined && { bar: statisticsBar }),
        current: item.href === here.item && here.subitem === undefined,
        ...(item.subitems && {
          subitems: item.subitems.map((subitem) => ({ ...subitem, current: subitem.href === here.subitem })),
        }),
      }))}
      label="Hoofdmenu"
    />
  )
}
