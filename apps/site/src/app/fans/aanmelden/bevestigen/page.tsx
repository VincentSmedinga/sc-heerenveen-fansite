import type { Metadata } from 'next'

import { Button, Form, Heading, Page, Strong, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { LinkGone } from '#src/fans/CheckMail'
import { logInPaths } from '#src/fans/log-in'
import { signUpLinkState, signUpPaths } from '#src/fans/sign-up'

import { confirm } from '../actions'

export const dynamic = 'force-dynamic'

const titles = { gone: 'Deze link werkt niet meer', 'log-in': 'Bijna klaar', 'sign-up': 'Bijna klaar' } as const

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// The page the link in the mail opens. It makes nothing by itself: a mail scanner or a preview
// opens the link before the person does and would use it up. The button makes the account. A
// link to log in from before #1448, for an address that had an account already, goes on to the
// page of logging in.
export default async function ConfirmPage({ searchParams }: Props) {
  requireFansPart('accounts', notFound)

  const { link, token } = await stateOf(searchParams)

  if (typeof token === 'string' && link.state === 'log-in') {
    redirect(`${logInPaths.confirm}?${new URLSearchParams({ token }).toString()}`)
  }

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
        ) : (
          <LinkGone again={{ href: signUpPaths.form, label: 'Meld je opnieuw aan' }} />
        )}
      </Page.Cell>
    </Page.Main>
  )
}

// The title follows the heading of the page, so a tab and a screen reader name what it says.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  requireFansPart('accounts', notFound)

  const { link } = await stateOf(searchParams)

  return { robots: { follow: false, index: false }, title: titles[link.state] }
}

/** The state of the link in the address, which the title and the page both follow. */
async function stateOf(searchParams: Props['searchParams']) {
  const { token } = await searchParams

  return typeof token === 'string'
    ? { link: await signUpLinkState(getDatabase().db, token), token }
    : { link: { state: 'gone' as const }, token: undefined }
}
