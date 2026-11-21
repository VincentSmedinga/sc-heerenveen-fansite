import type { Metadata } from 'next'

import { Button, Form, Heading, Input, Link, Notice, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { supporterOfReminderCode } from '#src/fans/reminder'
import { signUpPaths } from '#src/fans/sign-up'

import { turnOffReminder } from './actions'

// Render on each request: the code in the link decides what the page says.
export const dynamic = 'force-dynamic'

// The code is in the address, so the page must never be indexed and never tell another site
// where the visitor came from.
export const metadata: Metadata = {
  referrer: 'no-referrer',
  robots: { follow: false, index: false },
  title: 'Herinnering uitzetten',
}

/**
 * The page of the link in a reminder (issue 1461): one narrow column with one task. It needs no
 * session, because the code in the link says whose reminder it is. Opening the page changes
 * nothing, so a mail scanner that follows the link does no harm; only the button turns the
 * reminder off. After it the page says so, and a wrong or expired link says that too.
 */
export default async function TurnOffReminderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('prognose', notFound)

  const { code, klaar } = await searchParams
  const valid = supporterOfReminderCode(code) !== undefined

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>{klaar === '1' ? 'Herinnering uitgezet' : 'Herinnering uitzetten'}</Heading>
        {klaar === '1' ? (
          <Notice>
            De herinnering staat uit. Je kunt hem aanzetten op{' '}
            <Link href={`${signUpPaths.account}#herinnering`}>Mijn account</Link>.
          </Notice>
        ) : valid && typeof code === 'string' ? (
          <>
            <Text appearance="intro">
              Met de knop zet je de herinnering uit. Je krijgt dan geen bericht meer de dag voor een wedstrijd.
            </Text>
            <Form action={turnOffReminder}>
              <Input name="code" type="hidden" value={code} />
              <Button type="submit">Herinnering uitzetten</Button>
            </Form>
          </>
        ) : (
          <Notice>
            Deze link werkt niet meer. Log in en zet de herinnering uit op{' '}
            <Link href={`${signUpPaths.account}#herinnering`}>Mijn account</Link>.
          </Notice>
        )}
      </Page.Cell>
    </Page.Main>
  )
}
