import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { supporterToken } from '#src/fans/require-supporter'
import { signUpPaths } from '#src/fans/sign-up'
import { emptySignUpState, takenMeanwhileMessage } from '#src/fans/sign-up-form'
import { supporterKind } from '#src/fans/supporter-login'
import { findSession } from '#src/login/sessions'

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

  const token = await supporterToken()

  if (token !== undefined && (await findSession(getDatabase().db, supporterKind, token)) !== undefined) {
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
          Met een account doe je mee aan de spellen van Fans. Je hebt alleen een schermnaam en een e-mailadres nodig, en
          geen wachtwoord: we mailen je een link en een code.
        </Text>
        <Text>
          Je schermnaam komt in de standen. Je e-mailadres ziet niemand anders. Wat we bewaren, lees je bij{' '}
          <Link href="/privacy">Privacy</Link>.
        </Text>
        <SignUpForm initial={initial} />
      </Page.Cell>
    </Page.Main>
  )
}
