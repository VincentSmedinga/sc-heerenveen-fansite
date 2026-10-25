import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kijk in je mail' }

// What every request for a login link leads to, whether the address has an account or not.
export default function SentPage() {
  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Kijk in je mail</Heading>
        <Text appearance="intro">Als dit adres een account heeft, hebben we een link gemaild.</Text>
        <Text>De link werkt 15 minuten en één keer.</Text>
        <Text>
          <Link href="/beheer/inloggen">Een ander adres proberen</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
