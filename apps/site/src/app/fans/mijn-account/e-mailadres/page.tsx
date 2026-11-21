import type { Metadata } from 'next'

import { Heading, Page, Text } from '@fansite/design-system'

import { accountFields, changeEmailLimitedMessage } from '#src/fans/account-form'
import { changeEmailPaths } from '#src/fans/change-email'
import { requireSupporter } from '#src/fans/require-supporter'

import { AccountForm } from '../AccountForm'
import { requestEmailChange } from '../actions'
import { BackToAccount } from '../BackToAccount'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'E-mailadres wijzigen' }

// The page to change the address: a link and a code go to the new address, and the address of
// the account changes only when one of them is used.
export default async function ChangeEmailPage() {
  await requireSupporter({ from: changeEmailPaths.form })

  return (
    <Page.Main>
      <Page.Cell>
        <BackToAccount />
        <Heading level={1}>E-mailadres wijzigen</Heading>
        <Text appearance="intro">
          We mailen een link en een code naar je nieuwe adres. Pas als je die gebruikt, wijzigt het adres. Je oude adres
          krijgt daarna een bericht.
        </Text>
        <AccountForm
          action={requestEmailChange}
          failureMessage={changeEmailLimitedMessage}
          field={{ id: accountFields.email, label: 'Nieuw e-mailadres' }}
          input={{ autoComplete: 'email', type: 'email' }}
          submit="Stuur de link"
        />
      </Page.Cell>
    </Page.Main>
  )
}
