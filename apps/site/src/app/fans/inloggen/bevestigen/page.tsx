import type { Metadata } from 'next'

import { Button, Form, Heading, Page, Strong, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { getDatabase } from '#src/database'
import { LinkGone } from '#src/fans/CheckMail'
import { logInLinkState, logInPaths, returnPathOf } from '#src/fans/log-in'
import { returnParameter } from '#src/fans/log-in-form'

import { confirm } from '../actions'

export const dynamic = 'force-dynamic'

const titles = { gone: 'Deze link werkt niet meer', 'log-in': 'Bijna klaar' } as const

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// The title follows the heading of the page, so a tab and a screen reader name what it says.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  requireFansPart('accounts', notFound)

  const { link } = await stateOf(searchParams)

  return { robots: { follow: false, index: false }, title: titles[link.state] }
}

// The page the link in the mail opens. Like the link of signing up it logs nobody in by itself:
// a mail scanner or a preview opens the link before the person does. The button does.
export default async function LogInConfirmPage({ searchParams }: Props) {
  requireFansPart('accounts', notFound)

  const { link, returnTo, token } = await stateOf(searchParams)

  return (
    <Page.Main>
      <Page.Cell>
        {token !== undefined && link.state === 'log-in' ? (
          <>
            <Heading level={1}>Bijna klaar</Heading>
            <Text appearance="intro">
              Je logt in als <Strong>{link.screenName}</Strong>.
            </Text>
            <Form action={confirm.bind(null, token, returnTo)}>
              <Button type="submit">Inloggen</Button>
            </Form>
            <Text>Deze knop staat er zodat een virusscanner in je mail de link niet voor je gebruikt.</Text>
          </>
        ) : (
          <LinkGone again={{ href: logInPaths.form, label: 'Vraag een nieuwe link' }} />
        )}
      </Page.Cell>
    </Page.Main>
  )
}

/** The state of the link in the address, which the title and the page both follow. */
async function stateOf(searchParams: Props['searchParams']) {
  const parameters = await searchParams
  const { token } = parameters
  const returnTo = returnPathOf(parameters[returnParameter])

  return typeof token === 'string'
    ? { link: await logInLinkState(getDatabase().db, token), returnTo, token }
    : { link: { state: 'gone' as const }, returnTo, token: undefined }
}
