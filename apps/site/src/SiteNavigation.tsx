'use client'

import { Navigation } from '@fansite/design-system'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/bronnen', label: 'Onze bronnen' },
  { href: 'https://forum.heerenveen.org', label: 'Forum' },
]

/**
 * The main menu of the site. It marks the page the visitor is on. A layout gets no path, so this is a client
 * component: usePathname gives the path, also when the server renders the HTML.
 */
export function SiteNavigation() {
  const pathname = usePathname()

  return <Navigation items={items.map((item) => ({ ...item, current: item.href === pathname }))} label="Hoofdmenu" />
}
