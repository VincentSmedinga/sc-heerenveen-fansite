import type { Metadata } from 'next'

import { Heading, Link, Notice, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { returnPathOf } from '#src/fans/log-in'
import { logInExplanation, returnMessage, returnParameter } from '#src/fans/log-in-form'
import { currentSupporter } from '#src/fans/require-supporter'
import { signUpPaths } from '#src/fans/sign-up'

import { LogInForm } from './LogInForm'

// Render on each request: it depends on the setting of accounts and on the session.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Inloggen' }

// The page to log in as a supporter: an address, no password and no puzzle (WCAG 3.3.8).
// Somebody who is logged in already goes on to the account. A page that needs an account sends
// the visitor here with the page to go back to.
export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('accounts', notFound)

  if ((await currentSupporter()) !== undefined) {
    redirect(signUpPaths.account)
  }

  const returnTo = returnPathOf((await searchParams)[returnParameter])

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Inloggen</Heading>
        {returnTo === undefined ? null : <Notice>{returnMessage}</Notice>}
        <Text appearance="intro">{logInExplanation}</Text>
        <LogInForm returnTo={returnTo} />
        <Text>
          Nog geen account? <Link href={signUpPaths.form}>Account maken</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
