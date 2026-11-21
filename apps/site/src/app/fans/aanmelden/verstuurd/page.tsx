import type { Metadata } from 'next'

import { Page } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { CheckMail, wrongCodeMessage } from '#src/fans/CheckMail'
import { codeTriesLeft, signUpPaths } from '#src/fans/sign-up'

import { confirmCode } from '../actions'

export const dynamic = 'force-dynamic'

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

  return (
    <Page.Main>
      <Page.Cell>
        <CheckMail
          action={confirmCode.bind(null, reference ?? '')}
          error={fout === 'code' ? wrongCodeMessage(triesLeft) : undefined}
          intro="We hebben een link en een code gemaild naar het adres dat je invulde."
          otherAddress={signUpPaths.form}
          reference={reference}
        />
      </Page.Cell>
    </Page.Main>
  )
}
