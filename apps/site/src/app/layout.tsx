import '@fansite/design-system/index.css'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Body, Link, Logo, Navigation, Page, Root, Text } from '@fansite/design-system'

import { reviewBranch } from '../env'
import { SiteNavigation } from '../SiteNavigation'
import { withBranch } from '../title'
import { whatsNewPath, whatsNewTitle } from '../whats-new'

// The links in the footer, about the site itself: the page about us, its privacy section and what is new. The main menu
// does not have them.
const footerItems = [
  { href: '/over-ons', label: 'Over ons' },
  { href: '/over-ons#privacy', label: 'Privacy' },
  { href: whatsNewPath, label: whatsNewTitle },
]

const branch = reviewBranch()

export const metadata: Metadata = {
  // The error page sets its own title in the browser, and reads the branch from this tag (see app/error.tsx).
  ...(branch === undefined ? {} : { other: { 'review-branch': branch } }),
  title: {
    default: withBranch('sc Heerenveen Fansite', branch),
    template: withBranch('%s – sc Heerenveen Fansite', branch),
  },
}

// Every page has the same header and footer, and puts its content in a Page.Main in the Page.Body, so a page with a
// sidebar can add a Page.Sidebar beside it. Without data-theme on Root, light and dark follow the system setting.
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
            <Text appearance="meta">Alle koppen en links op één plek.</Text>
            <Text appearance="meta">Voor supporters, door supporters.</Text>
            <Navigation items={footerItems} label="Over de site" />
          </Page.Footer>
        </Page>
      </Body>
    </Root>
  )
}
