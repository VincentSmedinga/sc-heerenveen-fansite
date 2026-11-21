import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { signUpPaths } from '#src/fans/sign-up'
import { FocusOnLoad } from '#src/FocusOnLoad'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Je account is opgeheven' }

const headingId = 'opgeheven'

// The page after closing the account. There is no session any more, so it is open to anyone,
// and it shows nothing personal. The focus goes to its heading.
export default function ClosedPage() {
  requireFansPart('accounts', notFound)

  return (
    <Page.Main>
      <Page.Cell>
        <Heading id={headingId} level={1} tabIndex={-1}>
          Je account is opgeheven
        </Heading>
        <FocusOnLoad id={headingId} />
        <Text appearance="intro">
          Je naam en je e-mailadres zijn weg, en je bent uitgelogd. Bedankt voor het meespelen.
        </Text>
        <Text>
          <Link href="/">Naar de voorpagina</Link>
        </Text>
        <Text>
          <Link href={signUpPaths.form}>Opnieuw een account maken</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
