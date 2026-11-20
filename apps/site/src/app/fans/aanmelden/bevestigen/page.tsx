import type { Metadata } from 'next'

import { Button, Form, Heading, Link, Page, Strong, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { getDatabase } from '#src/database'
import { signUpLinkState, signUpPaths } from '#src/fans/sign-up'

import { confirm } from '../actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Account bevestigen' }

// The page the link in the mail opens. It makes nothing by itself: a mail scanner or a preview
// opens the link before the person does and would use it up. The button makes the account, or
// logs in for an address that had an account already.
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('accounts', notFound)

  const { token } = await searchParams
  const link = typeof token === 'string' ? await signUpLinkState(getDatabase().db, token) : { state: 'gone' as const }

  return (
    <Page.Main>
      <Page.Cell>
        {typeof token === 'string' && link.state === 'sign-up' ? (
          <>
            <Heading level={1}>Bijna klaar</Heading>
            <Text appearance="intro">
              Je maakt een account als <Strong>{link.screenName}</Strong>.
            </Text>
            <Form action={confirm.bind(null, token)}>
              <Button type="submit">Account bevestigen</Button>
            </Form>
            <Text>Deze knop staat er zodat een virusscanner in je mail de link niet voor je gebruikt.</Text>
          </>
        ) : typeof token === 'string' && link.state === 'log-in' ? (
          <>
            <Heading level={1}>Inloggen</Heading>
            <Text appearance="intro">Dit e-mailadres heeft al een account. Kies Inloggen om binnen te komen.</Text>
            <Form action={confirm.bind(null, token)}>
              <Button type="submit">Inloggen</Button>
            </Form>
          </>
        ) : (
          <>
            <Heading level={1}>Deze link werkt niet meer</Heading>
            <Text appearance="intro">
              Een link en een code werken 15 minuten en één keer. Na 5 foute codes werken ze ook niet meer.
            </Text>
            <Text>
              <Link href={signUpPaths.form}>Meld je opnieuw aan</Link>
            </Text>
          </>
        )}
      </Page.Cell>
    </Page.Main>
  )
}
