import type { Metadata } from 'next'

import { Page, Strong } from '@fansite/design-system'
import { redirect } from 'next/navigation'

import { confirmEmailCode } from '#src/app/fans/mijn-account/actions'
import { getDatabase } from '#src/database'
import { changeAddress, changeCodeTriesLeft, changeEmailPaths } from '#src/fans/change-email'
import { CheckMail, wrongCodeMessage } from '#src/fans/CheckMail'
import { requireSupporter } from '#src/fans/require-supporter'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kijk in je mail' }

// What every request for a new address leads to, whether the address has an account or not.
// The `ref` in the address of the page is a random reference of the request, not the address:
// the page looks the new address up by it, for the supporter who asked.
export default async function ChangeEmailSentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { supporterId } = await requireSupporter({ from: changeEmailPaths.form })
  const { fout, ref } = await searchParams
  const reference = typeof ref === 'string' ? ref : undefined
  const { db } = getDatabase()
  const triesLeft =
    fout === 'code' && reference !== undefined ? await changeCodeTriesLeft(db, supporterId, reference) : 0

  // After 5 wrong codes the link stops too, so the page says that instead of another try.
  if (fout === 'code' && triesLeft === 0) {
    redirect(`${changeEmailPaths.confirm}?fout=link`)
  }

  const address = reference === undefined ? undefined : await changeAddress(db, supporterId, reference)

  return (
    <Page.Main>
      <Page.Cell>
        <CheckMail
          action={confirmEmailCode.bind(null, reference ?? '')}
          error={fout === 'code' ? wrongCodeMessage(triesLeft) : undefined}
          intro={
            address === undefined ? (
              'We hebben een link en een code gemaild naar je nieuwe adres.'
            ) : (
              <>
                We hebben een link en een code gemaild naar <Strong>{address}</Strong>.
              </>
            )
          }
          otherAddress={changeEmailPaths.form}
          reference={address === undefined ? undefined : reference}
        />
      </Page.Cell>
    </Page.Main>
  )
}
