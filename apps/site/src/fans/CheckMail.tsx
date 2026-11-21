import type { ReactNode } from 'react'

import { Button, ErrorSummary, Field, Form, Heading, Input, Link, Notice, Text } from '@fansite/design-system'

import { FocusOnLoad } from '#src/FocusOnLoad'

const summaryId = 'fouten'

/**
 * The page "Kijk in je mail", after signing up and after asking to log in: what was mailed, the
 * field for the code and what to do without a mail. Without `reference` there is no field, for
 * an address that no request made. `error` is the message of a wrong code, the same in the
 * summary and at the field.
 */
export function CheckMail({
  action,
  error,
  intro,
  otherAddress,
  reference,
}: {
  action: (formData: FormData) => Promise<void>
  error: string | undefined
  intro: ReactNode
  otherAddress: string
  reference: string | undefined
}) {
  return (
    <>
      <Heading level={1}>Kijk in je mail</Heading>
      <Text appearance="intro">{intro}</Text>
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
          <Form action={action}>
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
        Geen mail? Kijk in je ongewenste post, of <Link href={otherAddress}>gebruik een ander adres</Link>.
      </Notice>
    </>
  )
}

/** The page of a link or a code that no longer works, with the way to ask for a new one. */
export function LinkGone({ again }: { again: { href: string; label: string } }) {
  return (
    <>
      <Heading level={1}>Deze link werkt niet meer</Heading>
      <Text appearance="intro">
        Een link en een code werken 15 minuten en één keer. Na 5 foute codes werken ze ook niet meer.
      </Text>
      <Text>
        <Link href={again.href}>{again.label}</Link>
      </Text>
    </>
  )
}

/** The message of a wrong code, with the tries that are left. */
export function wrongCodeMessage(triesLeft: number) {
  return `Die code klopt niet. Je kunt het nog ${triesLeft} keer proberen.`
}
