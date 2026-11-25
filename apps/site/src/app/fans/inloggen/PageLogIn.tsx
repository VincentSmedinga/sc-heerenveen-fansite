'use client'

import type { ReactNode } from 'react'

import { Card, Disclosure, Heading, Link, Rule, Strong, Text } from '@fansite/design-system'

import { logInExplanation } from '#src/fans/log-in-form'
import { signUpPaths } from '#src/fans/sign-up-form'

import { LogInFields, useLogIn } from './LogInForm'

/**
 * The way in on a page of Fans (issue 1660): what logging in is for, and the form of the page
 * to log in, so a fan asks for the link without going to another page first. After logging in
 * the fan comes back to `returnTo`. Inside the card of a game it stands under a rule. With
 * `card` it stands on its own, as a white card with the heading "Inloggen".
 */
export function PageLogIn({
  before,
  behind,
  card,
  message,
  returnTo,
}: {
  /** What stands above it, inside the fold of `behind`. */
  before?: ReactNode
  /** Puts it behind a fold with this summary, which opens when the form came back. */
  behind?: string
  /**
   * The level of the heading of the white card, one under the heading above it. Leave it out
   * inside the card of a game, whose heading is of level 2.
   */
  card?: 2 | 3
  /** What logging in is for on this page: one sentence, which stands out. */
  message: string
  returnTo: string
}) {
  const logIn = useLogIn()
  const [{ error, failure }] = logIn
  const form = (
    <>
      <Text>
        <Strong>{message}</Strong> {logInExplanation}
      </Text>
      <LogInFields
        beside={<Link href={signUpPaths.form}>Maak een account</Link>}
        logIn={logIn}
        returnTo={returnTo}
        summaryLevel={card === 3 ? 4 : 3}
      />
    </>
  )
  const body =
    card === undefined ? (
      <>
        <Rule />
        {form}
      </>
    ) : (
      <Card aria-labelledby="inloggen">
        <Heading id="inloggen" level={card}>
          Inloggen
        </Heading>
        {form}
      </Card>
    )

  return behind === undefined ? (
    <>
      {before}
      {body}
    </>
  ) : (
    <Disclosure open={error !== undefined || failure !== undefined} summary={behind}>
      {before}
      {body}
    </Disclosure>
  )
}
