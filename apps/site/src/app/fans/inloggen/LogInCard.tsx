'use client'

import type { ReactNode } from 'react'

import { Card, Disclosure, Heading, Link, Notice, Text } from '@fansite/design-system'

import { signUpPaths } from '#src/fans/sign-up-form'

import { LogInFields, useLogIn } from './LogInForm'

/**
 * The way in on a page of Fans (issue 1660): the white card with the heading "Inloggen", the
 * message of the page, and the form of the page to log in, so a fan asks for the link without
 * going to another page first. After logging in the fan comes back to `returnTo`.
 */
export function LogInCard({
  before,
  behind,
  level,
  message,
  returnTo,
}: {
  /** What stands above the card, inside the fold of `behind`. */
  before?: ReactNode
  /** Puts the card behind a fold with this summary, which opens when the form came back. */
  behind?: string
  /** The level of the heading, one under the heading above the card. */
  level: 2 | 3
  /** What logging in is for on this page. */
  message: ReactNode
  returnTo: string
}) {
  const logIn = useLogIn()
  const [{ error, failure }] = logIn
  const card = (
    <Card aria-labelledby="inloggen">
      <Heading id="inloggen" level={level}>
        Inloggen
      </Heading>
      <Notice>{message}</Notice>
      <Text>Vul je e-mailadres in. We mailen je een link en een code. Je hebt geen wachtwoord nodig.</Text>
      <LogInFields
        beside={
          <Text>
            Nog geen account? <Link href={signUpPaths.form}>Account maken</Link>
          </Text>
        }
        logIn={logIn}
        returnTo={returnTo}
        summaryLevel={level === 2 ? 3 : 4}
      />
    </Card>
  )

  return behind === undefined ? (
    <>
      {before}
      {card}
    </>
  ) : (
    <Disclosure open={error !== undefined || failure !== undefined} summary={behind}>
      {before}
      {card}
    </Disclosure>
  )
}
