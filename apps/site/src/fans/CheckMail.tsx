import type { ReactNode } from 'react'

import { Button, CodeInput, ErrorSummary, Field, Form, Heading, Link, Notice, Text } from '@fansite/design-system'

import { FocusOnLoad } from '#src/FocusOnLoad'

const summaryId = 'fouten'
const noticeId = 'melding'

/** The words of a notice above the field, after asking for a new code. */
export const newCodeMessages = {
  limiet: 'Het lukt nu even niet. Probeer het over een kwartier opnieuw.',
  nieuw: 'We hebben een nieuwe link en een nieuwe code gemaild.',
  wacht: 'Wacht nog even. Je kunt over een minuut een nieuwe code vragen.',
} as const

/**
 * The page "Kijk in je mail", after signing up and after asking to log in: what was mailed, the
 * field for the code and what to do without a mail. Without `reference` there is no field, for
 * an address that no request made. `error` is the message of a wrong code, the same in the
 * summary and at the field. With `newCode` the notice offers a button to mail a new code; a
 * `message` is the answer to the last one, above the field.
 */
export function CheckMail({
  action,
  error,
  intro,
  message,
  newCode,
  otherAddress,
  reference,
}: {
  action: (formData: FormData) => Promise<void>
  error: string | undefined
  intro: ReactNode
  message?: string | undefined
  newCode?: (() => Promise<void>) | undefined
  otherAddress: string
  reference: string | undefined
}) {
  return (
    <>
      <Heading level={1}>Kijk in je mail</Heading>
      <Text appearance="intro">{intro}</Text>
      <Text>Klik op de link in de mail, of vul hier de code in. Ze werken 15 minuten.</Text>
      {message === undefined ? null : (
        <>
          <Notice id={noticeId} tabIndex={-1}>
            {message}
          </Notice>
          <FocusOnLoad id={noticeId} />
        </>
      )}
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
              <CodeInput name="code" />
            </Field>
            <Button type="submit">Doorgaan</Button>
          </Form>
        </>
      )}
      {newCode === undefined ? (
        <Notice>
          Geen mail? Kijk in je ongewenste post, of <Link href={otherAddress}>gebruik een ander adres</Link>.
        </Notice>
      ) : (
        <>
          <Notice>Geen mail? Kijk in je ongewenste post. Nog steeds niets?</Notice>
          <Form action={newCode}>
            <Button appearance="soft" type="submit">
              Stuur een nieuwe code (kan over 1 minuut)
            </Button>
          </Form>
          <Text>
            Of <Link href={otherAddress}>gebruik een ander adres</Link>.
          </Text>
        </>
      )}
    </>
  )
}

/**
 * The page of a link or a code that no longer works, with the way to ask for a new one and the
 * way back to Fans. The button only goes to the page where the supporter starts again: nothing
 * is left of a link that has expired, not even an address.
 */
export function LinkGone({ again }: { again: { href: string; label: string } }) {
  return (
    <>
      <Heading level={1}>Deze link werkt niet meer</Heading>
      <Text appearance="intro">
        Een link en een code werken 15 minuten en één keer. Na 5 foute codes werken ze ook niet meer.
      </Text>
      {/* A form that only goes to the page: the design system has no link as a button. */}
      <Form action={again.href}>
        <Button type="submit">{again.label}</Button>
      </Form>
      <Text>
        <Link href="/fans">Naar Fans</Link>
      </Text>
    </>
  )
}

/** The message of a notice after asking for a new code, or `undefined` for any other value. */
export function newCodeMessageOf(value: unknown) {
  return typeof value === 'string' && Object.hasOwn(newCodeMessages, value)
    ? newCodeMessages[value as keyof typeof newCodeMessages]
    : undefined
}

/** The message of a wrong code, with the tries that are left. */
export function wrongCodeMessage(triesLeft: number) {
  return `Die code klopt niet. Je kunt het nog ${triesLeft} keer proberen.`
}
