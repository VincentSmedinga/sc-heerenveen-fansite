'use client'

import { Navigation } from '@fansite/design-system'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/', label: 'Nieuws' },
  { href: '/podcasts', label: 'Podcasts' },
  { href: '/bronnen', label: 'Onze bronnen' },
  { href: 'https://forum.heerenveen.org', label: 'Forum' },
]

/**
 * The main menu of the site: the news on the home page, the podcasts, Onze bronnen and the forum. It marks the page the visitor is on.
 * A layout gets no path, so this is a client component: usePathname gives the path, also when the server renders the
 * HTML. The home page is the current page on / only, not on a page below it.
 */
export function SiteNavigation() {
  const pathname = usePathname()

  return <Navigation items={items.map((item) => ({ ...item, current: item.href === pathname }))} label="Hoofdmenu" />
}
