import '@fansite/design-system/index.css'

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { Body, Head, Link, Logo, Navigation, Page, PullToRefresh, Root, Text } from '@fansite/design-system'

import { headerColour } from '../colours'
import { reviewBranch } from '../env'
import { SiteNavigation } from '../SiteNavigation'
import { ThemeToggle } from '../ThemeToggle'
import { withBranch } from '../title'
import { TopEdge } from '../TopEdge'
import { updatesPath, updatesTitle } from '../updates'

// The links in the footer, about the site itself: the search, the page about us, the contact
// form, the sources, the privacy page, the accessibility statement and the updates. The main
// menu does not have them.
const footerItems = [
  { href: '/zoeken', label: 'Zoeken' },
  { href: '/over-ons', label: 'Over ons' },
  { href: '/contact', label: 'Contact' },
  { href: '/bronnen', label: 'Bronnen' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/toegankelijkheid', label: 'Toegankelijkheid' },
  { href: updatesPath, label: updatesTitle },
]

const branch = reviewBranch()

export const metadata: Metadata = {
  // The icon for the tab is the SVG, and browsers that don't read SVG or ask for /favicon.ico
  // themselves get the ICO. The PNGs for the home screen of an iPhone and for the manifest are
  // in app/manifest.ts. All are made by scripts/make-icons.js. The status bar of the app is
  // see-through, so the header runs under it (see the decision in docs/beslissingen.md).
  appleWebApp: { statusBarStyle: 'black-translucent', title: 'Fansite' },
  icons: {
    apple: { sizes: '180x180', type: 'image/png', url: '/apple-touch-icon.png' },
    icon: [
      { type: 'image/svg+xml', url: '/icon.svg' },
      { sizes: '16x16 32x32 48x48', type: 'image/x-icon', url: '/favicon.ico' },
    ],
  },
  // The error page sets its own title in the browser, and reads the branch from this tag (see
  // app/error.tsx).
  ...(branch === undefined ? {} : { other: { 'review-branch': branch } }),
  title: {
    default: withBranch('sc Heerenveen Fansite', branch),
    template: withBranch('%s – sc Heerenveen Fansite', branch),
  },
}

// The browser colours its own bars with the header of the site, which is a step lighter in
// dark. Safari on an iPhone doesn't use this for its status bar: it takes the colour of the
// strip at the top of the page (see .hf-page-top-edge in page.css). The page uses the whole
// screen, also behind a notch, and keeps its content clear of it with the insets in page.css
// (viewport-fit=cover).
export const viewport: Viewport = {
  themeColor: [
    { color: headerColour.light, media: '(prefers-color-scheme: light)' },
    { color: headerColour.dark, media: '(prefers-color-scheme: dark)' },
  ],
  viewportFit: 'cover',
}

// Every page has the same header and footer, and puts its content in a Page.Main in the
// Page.Body, so a page with a sidebar can add a Page.Sidebar beside it. Without data-theme on
// Root, light and dark follow the system setting. A visitor who pressed the theme button in the
// header gets data-theme on it from public/theme.js, which runs before the first paint, so
// React must not mind the attribute it did not render (suppressHydrationWarning). The header
// has the logo and the theme button, and the main menu comes right after it, on the same blue;
// the order in the code is the order of the focus.
//
// A page can put a bar under the header, outside the Page.Body and so outside its main (see
// Page.Shortcuts). The page's children sit in the Page.Body, so the page can't render the bar
// there itself. The slot `@shortcuts` (a parallel route, see app/@shortcuts) lets a page add
// it: the route of the same path in the slot renders the bar, in the HTML, before the
// Page.Body, without JavaScript to move it. A page without a route in the slot gets an empty
// one.
export default function RootLayout({ children, shortcuts }: { children: ReactNode; shortcuts: ReactNode }) {
  return (
    <Root suppressHydrationWarning>
      <Head script="/theme.js" />
      <Body>
        <PullToRefresh />
        <TopEdge />
        <Page>
          <Page.Header>
            <Link href="/">
              <Logo />
            </Link>
            <ThemeToggle />
          </Page.Header>
          <SiteNavigation />
          {shortcuts}
          <Page.Body>{children}</Page.Body>
          <Page.Footer>
            <Text appearance="meta">Alles over onze club op één plek.</Text>
            <Text appearance="meta">Voor supporters door supporters.</Text>
            <Navigation items={footerItems} label="Over de site" />
          </Page.Footer>
        </Page>
      </Body>
    </Root>
  )
}
