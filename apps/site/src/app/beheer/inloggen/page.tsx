import type { Metadata } from 'next'

import { Button, ErrorSummary, Field, Form, Heading, Input, Page, Text } from '@fansite/design-system'
import { redirect } from 'next/navigation'

import { sessionToken } from '../../../beheer/require-role'
import { findSession } from '../../../beheer/sessions'
import { getDatabase } from '../../../database'
import { requestLoginLink } from './actions'

// Render on each request: somebody who is logged in already goes on to the admin.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Inloggen voor beheer' }

const messages = {
  link: 'Die link werkt niet meer. Vraag hieronder een nieuwe aan.',
  ongeldig: 'Vul een e-mailadres in, zoals naam@voorbeeld.nl.',
  'te-veel': 'Er zijn te veel links gevraagd. Probeer het over een kwartier opnieuw.',
} as const

const isMessage = (value: string | string[] | undefined): value is keyof typeof messages =>
  typeof value === 'string' && Object.hasOwn(messages, value)

// A public page of the admin: the one place to ask for a login link. It has no password and no puzzle (WCAG 3.3.8).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const token = await sessionToken()

  if (token !== undefined && (await findSession(getDatabase().db, token)) !== undefined) {
    redirect('/beheer')
  }

  const { fout } = await searchParams
  const message = isMessage(fout) ? messages[fout] : undefined
  // Only a wrong address is an error of the field. A link that no longer works, or the rate limit, is not about what is typed.
  const error = fout === 'ongeldig' ? message : undefined
  const notice = fout === 'ongeldig' ? undefined : message

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Inloggen voor beheer</Heading>
        <Text appearance="intro">
          Vul het e-mailadres van je account in. We mailen je een link om in te loggen. Je hebt geen wachtwoord nodig.
        </Text>
        {notice === undefined ? null : <Text>{notice}</Text>}
        <ErrorSummary errors={error === undefined ? [] : [{ id: 'e-mail', message: error }]} level={2} />
        <Form action={requestLoginLink}>
          <Field error={error} hint="De link werkt 15 minuten en één keer." id="e-mail" label="E-mailadres">
            <Input autoComplete="email" name="email" spellCheck={false} type="email" />
          </Field>
          <Button type="submit">Stuur me een link</Button>
        </Form>
      </Page.Cell>
    </Page.Main>
  )
}
