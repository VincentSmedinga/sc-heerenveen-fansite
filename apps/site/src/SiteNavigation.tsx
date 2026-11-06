'use client'

import type { ReactNode } from 'react'

import { Navigation } from '@fansite/design-system'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'

import { readAdminMarker, subscribeToAdminMarker } from './admin-marker'
import { seasonFromSlug, seasonSlug } from './seasons'

// The sub-pages of Nieuws, in the bar under the menu: the podcasts, the editors and the
// search. Nieuws itself is the news overview, so there is no separate archive.
const newsSubitems = [
  { href: '/nieuws/podcasts', label: 'Podcasts' },
  { href: '/redactie', label: 'Redactie' },
  { href: '/nieuws/zoeken', label: 'Zoeken' },
]

// The sub-pages of Statistieken. Seizoenen comes later.
const statisticsSubitems = [{ href: '/statistieken/tegenstanders', label: 'Tegenstanders' }]

const statisticsPath = '/statistieken'

const matchesPath = '/wedstrijden'

const playersPath = '/spelers'

const seasonPages = [playersPath, statisticsPath, matchesPath]

const newsPath = '/nieuws'

type MenuItem = {
  external?: true
  href: string
  label: string
  subitems?: { href: string; label: string }[]
}

const adminPath = '/beheer'

const items: MenuItem[] = [
  { href: newsPath, label: 'Nieuws', subitems: newsSubitems },
  { href: matchesPath, label: 'Wedstrijden' },
  { href: statisticsPath, label: 'Statistieken', subitems: statisticsSubitems },
  { href: playersPath, label: 'Spelers' },
  { external: true, href: 'https://forum.heerenveen.org', label: 'Forum' },
]

// Before Forum, only in the browser of somebody who is logged in (see admin-marker.ts). The
// last item of the menu is drawn on the right edge, so Forum stays there and does not move.
const adminItem: MenuItem = { href: adminPath, label: 'Beheer' }

const itemsWithAdmin = [...items.slice(0, -1), adminItem, ...items.slice(-1)]

/**
 * The item of the menu and the sub-page that a path belongs to, each as an href, or undefined.
 * Nieuws has the news overview, its sub-pages and the articles of the editors
 * (`/redactie/<name>`), which are in the bar under Redactie; the home page has no item,
 * because it is the front page of the whole site and the logo links to it. Wedstrijden has
 * the page and every page below it, such as the season. Statistieken has the same, and two
 * sub-pages of its own: Spelers, with the page of each season below it (`/spelers/2025-26`),
 * and Tegenstanders, with the page of each club below it
 * (`/statistieken/tegenstanders/ado-den-haag`). A path that belongs to no
 * item, such as /bronnen, the home page or a page that does not exist, has neither.
 */
export function currentOf(pathname: string): { item?: string; subitem?: string } {
  const subitem = newsSubitems.find((candidate) => candidate.href === pathname)

  if (subitem !== undefined) {
    return { item: newsPath, subitem: subitem.href }
  }

  if (pathname.startsWith('/redactie/')) {
    return { item: newsPath, subitem: '/redactie' }
  }

  if (pathname === newsPath) {
    return { item: newsPath }
  }

  if (pathname === adminPath || pathname.startsWith(`${adminPath}/`)) {
    return { item: adminPath }
  }

  if (pathname === '/wedstrijden' || pathname.startsWith('/wedstrijden/')) {
    return { item: '/wedstrijden' }
  }

  if (pathname === playersPath || pathname.startsWith(`${playersPath}/`)) {
    return { item: playersPath }
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
 * Wedstrijden, Statistieken and Spelers, so a visitor in a past season stays in it, and the
 * fixed address for every other item and every other page. The current season has no season
 * in its address, so its pages keep the fixed addresses. A path with the current season
 * (`/wedstrijden/2026-27`) is redirected by the page itself to the base address.
 */
export function hrefOf(href: string, pathname: string): string {
  const season = seasonPages.includes(href) ? seasonOfPath(pathname) : undefined

  return season === undefined ? href : `${href}/${seasonSlug(season)}`
}

/**
 * The season in the address of a page that has one: `/wedstrijden/2023-24`,
 * `/statistieken/2023-24` and `/spelers/2023-24`. A path without a season, such as
 * `/wedstrijden`, and one whose last part is not a season, such as `/wedstrijden/kies` or
 * `/wedstrijden/onzin`, has none. The check is the one the pages use (`seasonFromSlug`).
 */
export function seasonOfPath(pathname: string): string | undefined {
  const base = seasonPages.find((candidate) => pathname.startsWith(`${candidate}/`))

  return base === undefined ? undefined : seasonFromSlug(pathname.slice(base.length + 1))
}

/**
 * The main menu of the site, under the header: the news, the matches, the statistics, the
 * players and the forum, and for somebody who is logged in to the admin Beheer before the
 * forum. The server never renders Beheer: the HTML is the same for every visitor, and the
 * browser adds the item after hydrating when it finds the mark of admin-marker.ts.
 *
 * The news and the statistics have a bar with their sub-pages under the menu. The menu marks
 * the item the visitor is on, and the bar the sub-page. A layout gets no path, so this is a
 * client component: usePathname gives the path, also when the server renders the HTML.
 *
 * The addresses of the items are fixed, except Wedstrijden, Statistieken and Spelers on the
 * page of a season: they take the season of the page along (see `hrefOf`). The links of the
 * bar of Nieuws are fixed too. The bar of Statistieken is different: its link keeps the choice
 * between all matches and the Eredivisie of the page, and the choice is in the query
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
  // The server and the first render in the browser have no item: the HTML is the same for
  // everyone, and the mark is read right after hydrating.
  const loggedIn = useSyncExternalStore(subscribeToAdminMarker, readAdminMarker, () => false)

  return (
    <Navigation
      appearance="header"
      items={(loggedIn ? itemsWithAdmin : items).map((item) => ({
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
