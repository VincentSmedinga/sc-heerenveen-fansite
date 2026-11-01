'use client'

import type { ReactNode } from 'react'

import { Navigation } from '@fansite/design-system'
import { usePathname } from 'next/navigation'

import { seasonFromSlug, seasonSlug } from './seasons'

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

const matchesPath = '/wedstrijden'

const seasonPages = ['/statistieken/spelers', statisticsPath, matchesPath]

const newsPath = '/nieuws'

const items = [
  { href: newsPath, label: 'Nieuws', subitems: newsSubitems },
  { href: matchesPath, label: 'Wedstrijden' },
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
 * item, such as /bronnen, the home page or a page that does not exist, has neither.
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
 * The address a menu item gets on this path: the address of the season of the page for
 * Wedstrijden and Statistieken, so a visitor in a past season stays in it, and the fixed
 * address for every other item and every other page. The current season has no season in its
 * address, so its pages keep the fixed addresses. A path with the current season
 * (`/wedstrijden/2026-27`) is redirected by the page itself to the base address.
 */
export function hrefOf(href: string, pathname: string): string {
  const season = href === matchesPath || href === statisticsPath ? seasonOfPath(pathname) : undefined

  return season === undefined ? href : `${href}/${seasonSlug(season)}`
}

/**
 * The season in the address of a page that has one: `/wedstrijden/2023-24`,
 * `/statistieken/2023-24` and `/statistieken/spelers/2023-24`. A path without a season, such as
 * `/wedstrijden`, and one whose last part is not a season, such as `/wedstrijden/kies` or
 * `/wedstrijden/onzin`, has none. The check is the one the pages use (`seasonFromSlug`).
 */
export function seasonOfPath(pathname: string): string | undefined {
  // Spelers first: its addresses also start with the base address of Statistieken.
  const base = seasonPages.find((candidate) => pathname.startsWith(`${candidate}/`))

  return base === undefined ? undefined : seasonFromSlug(pathname.slice(base.length + 1))
}

/**
 * The main menu of the site, under the header: the news, the matches, the statistics and the
 * forum. The news and the statistics have a bar with their sub-pages under the menu. The menu
 * marks the item the visitor is on, and the bar the sub-page. A layout gets no path, so this is
 * a client component: usePathname gives the path, also when the server renders the HTML.
 *
 * The addresses of the items are fixed, except Wedstrijden and Statistieken on the page of a
 * season: they take the season of the page along (see `hrefOf`). The links of the bar of
 * Nieuws are fixed too. The bar of Statistieken is different: its links keep the season and the
 * choice between all matches and the Eredivisie of the page, and the choice is in the query
 * string, which a client component in a layout can only read with `useSearchParams` and a
 * Suspense boundary, and that would touch every page. So the pages of Statistieken draw the bar
 * on the server (the slot `@subnav`, see layout.tsx) and hand it in as `statisticsBar`. The
 * sub-pages listed here only tell which one is the current one, and give the bar when there is
 * no slot.
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
        href: hrefOf(item.href, pathname),
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
