import type { Metadata } from 'next'

import { Button, ErrorSummary, Field, Form, Heading, Input, Link, Notice, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { codeTriesLeft, signUpPaths } from '#src/fans/sign-up'
import { FocusOnLoad } from '#src/FocusOnLoad'

import { confirmCode } from '../actions'

export const dynamic = 'force-dynamic'

const summaryId = 'fouten'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kijk in je mail' }

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
  const triesLeft = fout === 'code' && reference !== undefined ? await codeTriesLeft(getDatabase().db, reference) : 0

  // After 5 wrong codes the link stops too, so the page says that instead of another try.
  if (fout === 'code' && triesLeft === 0) {
    redirect(`${signUpPaths.confirm}?fout=link`)
  }

  // The same words in the summary and at the field.
  const error = fout === 'code' ? `Die code klopt niet. Je kunt het nog ${triesLeft} keer proberen.` : undefined

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Kijk in je mail</Heading>
        <Text appearance="intro">We hebben een link en een code gemaild naar het adres dat je invulde.</Text>
        <Text>Klik op de link in de mail, of vul hier de code in. Ze werken 15 minuten.</Text>
        {reference === undefined ? null : (
          <>
            <ErrorSummary
              errors={error === undefined ? [] : [{ id: 'code', message: error }]}
              id={summaryId}
              level={2}
              tabIndex={-1}
              title="Die code klopt niet"
            />
            {/* After a wrong code the page loads again, and the focus goes to the summary. */}
            {error === undefined ? null : <FocusOnLoad id={summaryId} />}
            <Form action={confirmCode.bind(null, reference)}>
              <Field
                error={error}
                hint="Zoek de mail met de code. Vul dan de 6 cijfers in. Plakken kan ook."
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
        <Notice>
          Geen mail? Kijk in je ongewenste post, of <Link href={signUpPaths.form}>gebruik een ander adres</Link>.
        </Notice>
      </Page.Cell>
    </Page.Main>
  )
}
