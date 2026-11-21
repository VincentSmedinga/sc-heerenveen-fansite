import type { Metadata } from 'next'

import { Page, Strong } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { CheckMail, newCodeMessageOf, wrongCodeMessage } from '#src/fans/CheckMail'
import { signUpAddress } from '#src/fans/new-code'
import { codeTriesLeft, signUpPaths } from '#src/fans/sign-up'

import { confirmCode, newCode } from '../actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kijk in je mail' }

// What every sign-up leads to, whether the address has an account or not. The `ref` in the
// address is a random reference of this request, not the address: it binds the code to the
// request that made it. The page looks the address up by it, so the address is not in the
// address of the page, in a cookie or in a log. The field for the code helps where the mail
// opens on another device.
export default async function SentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('accounts', notFound)

  const { fout, melding, ref } = await searchParams
  const reference = typeof ref === 'string' ? ref : undefined
  const triesLeft = fout === 'code' && reference !== undefined ? await codeTriesLeft(getDatabase().db, reference) : 0

  // After 5 wrong codes the link stops too, so the page says that instead of another try.
  if (fout === 'code' && triesLeft === 0) {
    redirect(`${signUpPaths.confirm}?fout=link`)
  }

  // The address is only there while the request is, and a request that is gone or unknown says
  // the same as before, so the page tells nothing about an address.
  const address = reference === undefined ? undefined : await signUpAddress(getDatabase().db, reference)

  return (
    <Page.Main>
      <Page.Cell>
        <CheckMail
          action={confirmCode.bind(null, reference ?? '')}
          error={fout === 'code' ? wrongCodeMessage(triesLeft) : undefined}
          intro={
            address === undefined ? (
              'We hebben een link en een code gemaild naar het adres dat je invulde.'
            ) : (
              <>
                We hebben een link en een code gemaild naar <Strong>{address}</Strong>.
              </>
            )
          }
          message={newCodeMessageOf(melding)}
          newCode={reference === undefined ? undefined : newCode.bind(null, reference)}
          otherAddress={signUpPaths.form}
          reference={reference}
        />
      </Page.Cell>
    </Page.Main>
  )
}
