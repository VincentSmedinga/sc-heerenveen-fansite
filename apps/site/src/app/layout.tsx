import '@fansite/design-system/index.css'

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { Body, Link, Logo, Navigation, Page, PullToRefresh, Root, Text } from '@fansite/design-system'

import { headerColour } from '../colours'
import { reviewBranch } from '../env'
import { SiteNavigation } from '../SiteNavigation'
import { withBranch } from '../title'
import { updatesPath, updatesTitle } from '../updates'

// The links in the footer, about the site itself: the page about us, the sources, the privacy page, the accessibility
// statement and the updates. The main menu does not have them.
const footerItems = [
  { href: '/over-ons', label: 'Over ons' },
  { href: '/bronnen', label: 'Bronnen' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/toegankelijkheid', label: 'Toegankelijkheid' },
  { href: updatesPath, label: updatesTitle },
]

const branch = reviewBranch()

export const metadata: Metadata = {
  // The icon for the tab is the SVG, and browsers that don't read SVG or ask for /favicon.ico themselves get the ICO.
  // The PNGs for the home screen of an iPhone and for the manifest are in app/manifest.ts. All are made by
  // scripts/make-icons.js.
  appleWebApp: { title: 'Fansite' },
  icons: {
    apple: { sizes: '180x180', type: 'image/png', url: '/apple-touch-icon.png' },
    icon: [
      { type: 'image/svg+xml', url: '/icon.svg' },
      { sizes: '16x16 32x32 48x48', type: 'image/x-icon', url: '/favicon.ico' },
    ],
  },
  // The error page sets its own title in the browser, and reads the branch from this tag (see app/error.tsx).
  ...(branch === undefined ? {} : { other: { 'review-branch': branch } }),
  title: {
    default: withBranch('sc Heerenveen Fansite', branch),
    template: withBranch('%s – sc Heerenveen Fansite', branch),
  },
}

// The browser colours its own bars with the header of the site, which is a step lighter in dark.
export const viewport: Viewport = {
  themeColor: [
    { color: headerColour.light, media: '(prefers-color-scheme: light)' },
    { color: headerColour.dark, media: '(prefers-color-scheme: dark)' },
  ],
}

// Every page has the same header and footer, and puts its content in a Page.Main in the Page.Body, so a page with a
// sidebar can add a Page.Sidebar beside it. Without data-theme on Root, light and dark follow the system setting.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <Root>
      <Body>
        <PullToRefresh />
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
            <Text appearance="meta">Voor supporters door supporters.</Text>
            <Navigation items={footerItems} label="Over de site" />
          </Page.Footer>
        </Page>
      </Body>
    </Root>
  )
}
