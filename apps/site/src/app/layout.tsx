import '@fansite/design-system/index.css'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Body, Link, Logo, Navigation, Page, Root, Text } from '@fansite/design-system'

import { SiteNavigation } from '../SiteNavigation'
import { whatsNewPath, whatsNewTitle } from '../whats-new'

// The links in the footer, about the site itself: the page about us, its privacy section and what is new. The main menu
// stays as it is.
const footerItems = [
  { href: '/over-ons', label: 'Over ons' },
  { href: '/over-ons#privacy', label: 'Privacy' },
  { href: whatsNewPath, label: whatsNewTitle },
]

export const metadata: Metadata = {
  title: {
    default: 'sc Heerenveen Fansite',
    template: '%s – sc Heerenveen Fansite',
  },
}

// Every page has the same header and footer. Without data-theme on Root, light and dark follow the system setting.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <Root>
      <Body>
        <Page>
          <Page.Header>
            <Link href="/">
              <Logo />
            </Link>
            <SiteNavigation />
          </Page.Header>
          <Page.Body>{children}</Page.Body>
          <Page.Footer>
            <Text appearance="meta">Alle koppen en links op één plek. Voor supporters, door supporters.</Text>
            <Navigation items={footerItems} label="Over de site" />
          </Page.Footer>
        </Page>
      </Body>
    </Root>
  )
}
