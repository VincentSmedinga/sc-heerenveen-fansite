import type { Metadata } from 'next'

import { Button, ErrorSummary, Field, Form, Heading, Input, Link, Page, Text } from '@fansite/design-system'

import { compact } from '#src/beheer/density'

import { logInWithCode } from '../actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kijk in je mail' }

const codeError = 'Die code werkt niet. Controleer de 6 cijfers uit de mail, of vraag een nieuwe link aan.'

// What every request for a login link leads to, whether the address has an account or not. It
// has a field for the code in the mail too: the app on the Home Screen can't open the link, so
// the code logs in where the page is open. The `ref` in the address is a random reference of
// this request, not the address: it binds the code to the request that made it.
export default async function SentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { fout, ref } = await searchParams
  const reference = typeof ref === 'string' ? ref : undefined
  const error = fout === 'code' ? codeError : undefined

  return (
    <Page.Main className={compact}>
      <Page.Cell>
        <Heading level={1}>Kijk in je mail</Heading>
        <Text appearance="intro">Als dit adres een account heeft, hebben we een link en een code gemaild.</Text>
        <Text>De link en de code werken 15 minuten en één keer.</Text>
        {reference === undefined ? null : (
          <>
            <ErrorSummary errors={error === undefined ? [] : [{ id: 'code', message: error }]} level={2} />
            <Form action={logInWithCode.bind(null, reference)}>
              <Field
                error={error}
                hint="Werkt de link niet, bijvoorbeeld in de app op je beginscherm? Vul dan de code in."
                id="code"
                label="Code uit de mail"
              >
                <Input
                  autoCapitalize="off"
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  inputMode="numeric"
                  name="code"
                  spellCheck={false}
                />
              </Field>
              <Button type="submit">Inloggen met code</Button>
            </Form>
          </>
        )}
        <Text>
          <Link href="/beheer/inloggen">Een ander adres proberen</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
