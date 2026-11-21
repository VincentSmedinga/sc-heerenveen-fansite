import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'
import { redirect } from 'next/navigation'

import { email as editorsEmail } from '#src/contact'
import { logInPaths } from '#src/fans/log-in'
import { requireSupporter } from '#src/fans/require-supporter'
import { signUpPaths } from '#src/fans/sign-up'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Je account is geblokkeerd' }

// What a blocked supporter sees instead of the games (issue 1448): every personal page but Mijn
// account sends a blocked account here. A supporter who isn't blocked goes on to Fans.
export default async function BlockedPage() {
  const supporter = await requireSupporter({ blocked: 'allow', from: logInPaths.blocked })

  if (!supporter.blocked) {
    redirect(logInPaths.home)
  }

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Je account is geblokkeerd</Heading>
        <Text appearance="intro">
          De redactie heeft je account geblokkeerd. Je cijfers en voorspellingen tellen niet meer mee.
        </Text>
        <Text>
          Denk je dat dit niet klopt? Mail de redactie op <Link href={`mailto:${editorsEmail}`}>{editorsEmail}</Link>,
          of gebruik het formulier op <Link href="/contact">Contact</Link>.
        </Text>
        <Text>
          Je gegevens zien of je account opheffen? Dat kan op <Link href={signUpPaths.account}>Mijn account</Link>.
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
