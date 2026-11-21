import type { Metadata } from 'next'

import { Heading, Notice, Page, Text } from '@fansite/design-system'
import { eq } from 'drizzle-orm'

import { getDatabase } from '#src/database'
import { accountFields, changeNameHint, nameWaitMessage } from '#src/fans/account-form'
import { changeNamePath, nameWait } from '#src/fans/change-name'
import { requireSupporter } from '#src/fans/require-supporter'
import { supporterKind } from '#src/fans/supporter-login'

import { AccountForm } from '../AccountForm'
import { changeName } from '../actions'
import { BackToAccount } from '../BackToAccount'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Schermnaam wijzigen' }

// The page to change the screen name: one narrow column with the field, or, within 30 days of
// the last change, a notice that says from when it can be changed again.
export default async function ChangeNamePage() {
  const { supporterId } = await requireSupporter({ from: changeNamePath })
  const { users } = supporterKind.tables
  const [account] = await getDatabase()
    .db.select({ changedAt: users.screenNameChangedAt })
    .from(users)
    .where(eq(users.id, supporterId))
  const wait = nameWait(account?.changedAt ?? null)

  return (
    <Page.Main>
      <Page.Cell>
        <BackToAccount />
        <Heading level={1}>Schermnaam wijzigen</Heading>
        {wait === undefined ? (
          <>
            <Text appearance="intro">Je nieuwe naam staat meteen in alle standen, ook bij wat je eerder speelde.</Text>
            <AccountForm
              action={changeName}
              field={{ hint: changeNameHint, id: accountFields.screenName, label: 'Nieuwe schermnaam' }}
              input={{ autoComplete: 'nickname' }}
              submit="Opslaan"
            />
          </>
        ) : (
          <Notice>{nameWaitMessage(wait)}</Notice>
        )}
      </Page.Cell>
    </Page.Main>
  )
}
