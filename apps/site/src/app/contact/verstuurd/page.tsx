import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'

// The confirmation has an address of its own, so reloading it sends nothing again. A search
// engine has no use for it.
export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Bericht verstuurd' }

export default function SentPage() {
  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Bericht verstuurd</Heading>
        <Text appearance="intro">Bedankt, we hebben je bericht ontvangen.</Text>
        <Text>
          We antwoorden per mail. Terug naar <Link href="/">de homepage</Link>.
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
