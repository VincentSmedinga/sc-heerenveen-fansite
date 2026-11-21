import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { logInPaths } from '#src/fans/log-in'
import { currentSupporter } from '#src/fans/require-supporter'
import { signUpPaths } from '#src/fans/sign-up'
import { emptySignUpState, takenMeanwhileMessage } from '#src/fans/sign-up-form'

import { SignUpForm } from './SignUpForm'

// Render on each request: it depends on the setting of accounts and on the session.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Account maken' }

// The page to sign up as a supporter: a screen name and an address, no password and no puzzle
// (WCAG 3.3.8). Somebody who is logged in already goes on to the account.
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('accounts', notFound)

  if ((await currentSupporter()) !== undefined) {
    redirect(signUpPaths.account)
  }

  const { fout } = await searchParams
  const initial =
    fout === 'naam-bezet' ? { ...emptySignUpState, errors: { screenName: takenMeanwhileMessage } } : emptySignUpState

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Account maken</Heading>
        <Text appearance="intro">
          Met een account doe je mee aan de Prognose, de Uitblinker en Fjouwer. Je hebt geen wachtwoord nodig.
        </Text>
        <SignUpForm initial={initial} />
        <Text>
          We bewaren je schermnaam, je e-mailadres en wat je speelt. <Link href="/privacy">Wat we bewaren</Link>
        </Text>
        <Text>
          Heb je al een account? <Link href={logInPaths.form}>Inloggen</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
