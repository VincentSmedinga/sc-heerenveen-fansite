import type { Metadata } from 'next'

import { Button, Form, Heading, Link, Page, Text } from '@fansite/design-system'

import { loginLinkWorks } from '../../../../beheer/sessions'
import { getDatabase } from '../../../../database'
import { logIn } from '../actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Inloggen' }

// The page the link in the mail opens. It does not log in by itself: a mail scanner or a
// preview opens the link before the person does and would use it up. The button logs in.
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { token } = await searchParams
  const works = typeof token === 'string' && (await loginLinkWorks(getDatabase().db, token))

  return (
    <Page.Main>
      <Page.Cell>
        {works ? (
          <>
            <Heading level={1}>Inloggen</Heading>
            <Text appearance="intro">Deze link klopt. Kies hieronder Inloggen om binnen te komen.</Text>
            <Form action={logIn.bind(null, token)}>
              <Button type="submit">Inloggen</Button>
            </Form>
          </>
        ) : (
          <>
            <Heading level={1}>Deze link werkt niet</Heading>
            <Text appearance="intro">De link is verlopen of al gebruikt.</Text>
            <Text>
              <Link href="/beheer/inloggen">Vraag een nieuwe link aan</Link>
            </Text>
          </>
        )}
      </Page.Cell>
    </Page.Main>
  )
}
