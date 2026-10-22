import '@fansite/design-system/index.css'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Body, Link, Logo, Page, PageBody, PageFooter, PageHeader, Root, Text } from '@fansite/design-system'

import { SiteNavigation } from '../SiteNavigation'

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
          <PageHeader>
            <Link href="/">
              <Logo />
            </Link>
            <SiteNavigation />
          </PageHeader>
          <PageBody>{children}</PageBody>
          <PageFooter>
            <Text appearance="meta">sc Heerenveen Fansite, sinds 1997. Voor supporters, door supporters.</Text>
          </PageFooter>
        </Page>
      </Body>
    </Root>
  )
}
