import type { Metadata } from 'next'

import { Button, ErrorSummary, Field, Form, Heading, Input, Link, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { signUpPaths } from '#src/fans/sign-up'

import { confirmCode } from '../actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kijk in je mail' }

const codeError =
  'Die code klopt niet of werkt niet meer. Kijk of je de 6 cijfers uit de laatste mail hebt, of meld je opnieuw aan.'

// What every sign-up leads to, whether the address has an account or not. The `ref` in the
// address is a random reference of this request, not the address: it binds the code to the
// request that made it. The field for the code helps where the mail opens on another device.
export default async function SentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('accounts', notFound)

  const { fout, ref } = await searchParams
  const reference = typeof ref === 'string' ? ref : undefined
  const error = fout === 'code' ? codeError : undefined

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Kijk in je mail</Heading>
        <Text appearance="intro">We hebben een link en een code gemaild naar het adres dat je invulde.</Text>
        <Text>Klik op de link in de mail, of vul hier de code in. Ze werken 15 minuten en één keer.</Text>
        {reference === undefined ? null : (
          <>
            <ErrorSummary errors={error === undefined ? [] : [{ id: 'code', message: error }]} level={2} />
            <Form action={confirmCode.bind(null, reference)}>
              <Field
                error={error}
                hint="Werkt de link niet, of staat je mail op een ander apparaat? Vul dan de 6 cijfers in. Plakken kan ook."
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
                  width="natural"
                />
              </Field>
              <Button type="submit">Doorgaan</Button>
            </Form>
          </>
        )}
        <Heading level={2}>Geen mail?</Heading>
        <Text>
          Kijk in je ongewenste mail. Nog steeds niets? <Link href={signUpPaths.form}>Gebruik een ander adres</Link>.
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
