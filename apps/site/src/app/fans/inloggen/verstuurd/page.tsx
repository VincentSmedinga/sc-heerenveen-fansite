import type { Metadata } from 'next'

import { Page } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { CheckMail, wrongCodeMessage } from '#src/fans/CheckMail'
import { logInPaths, returnPathOf } from '#src/fans/log-in'
import { returnParameter } from '#src/fans/log-in-form'
import { codeTriesLeft } from '#src/fans/sign-up'

import { confirmCode } from '../actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kijk in je mail' }

// What every request to log in leads to, whether the address has an account or not, in the same
// words. The `ref` in the address is a random reference of this request, not the address.
export default async function LogInSentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('accounts', notFound)

  const parameters = await searchParams
  const { fout, ref } = parameters
  const reference = typeof ref === 'string' ? ref : undefined
  const returnTo = returnPathOf(parameters[returnParameter])
  const triesLeft = fout === 'code' && reference !== undefined ? await codeTriesLeft(getDatabase().db, reference) : 0

  // After 5 wrong codes the link stops too, so the page says that instead of another try.
  if (fout === 'code' && triesLeft === 0) {
    redirect(`${logInPaths.confirm}?fout=link`)
  }

  const form =
    returnTo === undefined
      ? logInPaths.form
      : `${logInPaths.form}?${new URLSearchParams({ [returnParameter]: returnTo }).toString()}`

  return (
    <Page.Main>
      <Page.Cell>
        <CheckMail
          action={confirmCode.bind(null, reference ?? '', returnTo)}
          error={fout === 'code' ? wrongCodeMessage(triesLeft) : undefined}
          intro="Als dit adres een account heeft, hebben we een link en een code gemaild."
          otherAddress={form}
          reference={reference}
        />
      </Page.Cell>
    </Page.Main>
  )
}
