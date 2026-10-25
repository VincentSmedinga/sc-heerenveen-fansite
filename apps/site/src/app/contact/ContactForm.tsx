'use client'

import {
  Button,
  Card,
  ErrorSummary,
  Field,
  Form,
  Heading,
  Honeypot,
  Input,
  Link,
  Select,
  Text,
  Textarea,
} from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import { email } from '../../contact'
import { type ContactState, emptyState, fieldNames, honeypotName, maxLengths, subjects } from '../../contact-message'
import { sendContactMessage } from './actions'

const summaryId = 'fouten'
const failureId = 'mislukt'

/**
 * The failure that is not about one field: the mail did not go, or too many messages came in.
 */
const Failure = ({ failure }: { failure: 'limit' | 'send' }) => (
  <Card aria-labelledby={`${failureId}-kop`} id={failureId} surface="soft" tabIndex={-1}>
    <Heading id={`${failureId}-kop`} level={2}>
      {failure === 'send' ? 'Het versturen is niet gelukt.' : 'Er komen nu veel berichten binnen.'}
    </Heading>
    <Text>
      {failure === 'send' ? 'Mail ons zelf: ' : 'Probeer het later nog eens, of mail ons zelf: '}
      <Link href={`mailto:${email}`} icon="envelope">
        {email}
      </Link>
    </Text>
  </Card>
)

// The form of the page Contact. It is a client component only to show what the server says: the
// form is a plain POST that works without JavaScript, and with JavaScript the page doesn't
// reload.
export function ContactForm() {
  const [state, action] = useActionState<ContactState, FormData>(sendContactMessage, emptyState)
  const { errors, failure, values } = state
  const summary = fieldNames.flatMap((name) => {
    const message = errors[name]

    return message === undefined ? [] : [{ id: name, message }]
  })

  // After a submit the visitor must hear what is wrong. Without JavaScript the page loads again
  // and the screen reader starts at the top, with JavaScript the focus goes to the block,
  // because the page doesn't change.
  useEffect(() => {
    const hasErrors = fieldNames.some((name) => state.errors[name] !== undefined)

    if (hasErrors) {
      document.getElementById(summaryId)?.focus()
    } else if (state.failure !== undefined) {
      document.getElementById(failureId)?.focus()
    }
  }, [state])

  return (
    <>
      <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} />
      {failure === undefined ? null : <Failure failure={failure} />}
      <Form action={action}>
        <Field error={errors.naam} id="naam" label="Naam" required={false}>
          <Input autoComplete="name" defaultValue={values.naam} name="naam" />
        </Field>
        <Field error={errors['e-mail']} hint="Hierop antwoorden we." id="e-mail" label="E-mailadres">
          <Input autoComplete="email" defaultValue={values['e-mail']} name="e-mail" type="email" />
        </Field>
        <Field error={errors.onderwerp} id="onderwerp" label="Onderwerp">
          <Select defaultValue={values.onderwerp} name="onderwerp">
            <Select.Option value="">Kies een onderwerp</Select.Option>
            {subjects.map(({ label, value }) => (
              <Select.Option key={value} value={value}>
                {label}
              </Select.Option>
            ))}
          </Select>
        </Field>
        <Field
          error={errors.link}
          hint="Het adres van de pagina waar het over gaat."
          id="link"
          label="Link naar het bericht"
          required={false}
        >
          <Input defaultValue={values.link} name="link" type="url" />
        </Field>
        <Field error={errors.bericht} hint={`Hoogstens ${maxLengths.bericht} tekens.`} id="bericht" label="Bericht">
          <Textarea defaultValue={values.bericht} name="bericht" rows={8} />
        </Field>
        <Honeypot name={honeypotName} />
        <Button icon="envelope" type="submit">
          Versturen
        </Button>
      </Form>
    </>
  )
}
