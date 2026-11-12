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

// The sub-pages of Wedstrijden. Seizoenen comes later.
const opponentsPath = '/tegenstanders'

const statisticsPath = '/cijfers'

const matchesPath = '/wedstrijden'

const matchesSearchPath = `${matchesPath}/zoeken`

const matchesSubitems = [
  { href: statisticsPath, label: 'Cijfers' },
  { href: opponentsPath, label: 'Tegenstanders' },
  { href: matchesSearchPath, label: 'Zoeken' },
]

const playersPath = '/spelers'

// The sub-pages of Spelers: the overview of all players (by name, and by country below it) and
// the search. The page of a season has none of them as its current page.
const playersOverviewPath = `${playersPath}/overzicht`

const playersSearchPath = `${playersPath}/zoeken`

const playersSubitems = [
  { href: playersOverviewPath, label: 'Overzicht' },
  { href: playersSearchPath, label: 'Zoeken' },
]

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
  { href: matchesPath, label: 'Wedstrijden', subitems: matchesSubitems },
  { href: playersPath, label: 'Spelers', subitems: playersSubitems },
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
 * the page and every page below it, such as the season, and a sub-page of its own:
 * Cijfers, with the page of each season below it (`/cijfers/2025-26`), and Tegenstanders,
 * with the page of each club below it (`/tegenstanders/ado-den-haag`). Spelers has the page
 * and the page of each season below it (`/spelers/2025-26`), and two sub-pages: the overview
 * (with the page by country below it) and the search. A path that belongs to no item,
 * such as /bronnen, the home page or a page that does not exist, has neither.
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

  if (pathname === matchesSearchPath) {
    return { item: matchesPath, subitem: matchesSearchPath }
  }

  if (pathname === '/wedstrijden' || pathname.startsWith('/wedstrijden/')) {
    return { item: '/wedstrijden' }
  }

  if (pathname === playersOverviewPath || pathname.startsWith(`${playersOverviewPath}/`)) {
    return { item: playersPath, subitem: playersOverviewPath }
  }

  if (pathname === playersSearchPath) {
    return { item: playersPath, subitem: playersSearchPath }
  }

  if (pathname === playersPath || pathname.startsWith(`${playersPath}/`)) {
    return { item: playersPath }
  }

  if (pathname === opponentsPath || pathname.startsWith(`${opponentsPath}/`)) {
    return { item: matchesPath, subitem: opponentsPath }
  }

  if (pathname === statisticsPath || pathname.startsWith(`${statisticsPath}/`)) {
    return { item: matchesPath, subitem: statisticsPath }
  }

  return {}
}

/**
 * The address a menu item gets on this path: the address of the season of the page for
 * Wedstrijden, Cijfers and Spelers, so a visitor in a past season stays in it, and the
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
 * `/cijfers/2023-24` and `/spelers/2023-24`. A path without a season, such as
 * `/wedstrijden`, and one whose last part is not a season, such as `/wedstrijden/kies` or
 * `/wedstrijden/onzin`, has none. The check is the one the pages use (`seasonFromSlug`).
 */
export function seasonOfPath(pathname: string): string | undefined {
  const base = seasonPages.find((candidate) => pathname.startsWith(`${candidate}/`))

  return base === undefined ? undefined : seasonFromSlug(pathname.slice(base.length + 1))
}

/**
 * The main menu of the site, under the header: the news, the matches, the
 * players and the forum, and for somebody who is logged in to the admin Beheer before the
 * forum. The server never renders Beheer: the HTML is the same for every visitor, and the
 * browser adds the item after hydrating when it finds the mark of admin-marker.ts.
 *
 * The news and the matches have a bar with their sub-pages under the menu. The menu marks
 * the item the visitor is on, and the bar the sub-page. A layout gets no path, so this is a
 * client component: usePathname gives the path, also when the server renders the HTML.
 *
 * The addresses of the items are fixed, except Wedstrijden, Cijfers and Spelers on the
 * page of a season: they take the season of the page along (see `hrefOf`). The links of the
 * bar of Nieuws are fixed too. The bar of Wedstrijden is different: its link keeps the choice
 * between all matches and the Eredivisie of the page, and the choice is in the query
 * string, which a client component in a layout can only read with `useSearchParams` and a
 * Suspense boundary, and that would touch every page. So the pages of Wedstrijden draw the bar
 * on the server (the slot `@subnav`, see layout.tsx) and hand it in as `matchesBar`. The
 * sub-pages listed here only tell which one is the current one, and give the bar when there is
 * no slot.
 *
 * On a sub-page the item Nieuws or Wedstrijden is not the current page itself (the design
 * system gives it `aria-current="true"` then); only on /nieuws and on an article of the
 * editors, and on /wedstrijden and the page of a season below it, is it.
 */
export function SiteNavigation({ matchesBar }: { matchesBar?: ReactNode }) {
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
        ...(item.href === matchesPath && matchesBar !== undefined && { bar: matchesBar }),
        current: item.href === here.item && here.subitem === undefined,
        ...(item.subitems && {
          subitems: item.subitems.map((subitem) => ({ ...subitem, current: subitem.href === here.subitem })),
        }),
      }))}
      label="Hoofdmenu"
    />
  )
}
