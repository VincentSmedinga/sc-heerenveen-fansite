import type { Metadata } from 'next'

import { Card, Heading, Link, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { nameOf, roleLabels } from '#src/beheer/account-fields'
import { findAccount } from '#src/beheer/account-management'
import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { AccountForm } from '../AccountForm'
import { submitAccount } from '../actions'
import { accountsPath } from '../paths'

// Render on each request: the account changes with every save.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Account wijzigen' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const notices: Readonly<Record<string, { text: string; title: string }>> = {
  gemaakt: { text: 'De persoon kan nu inloggen met een inloglink.', title: 'Account toegevoegd' },
  ongewijzigd: { text: 'Je hebt niets veranderd, dus er is niets opgeslagen.', title: 'Niets veranderd' },
  opgeslagen: { text: 'De wijziging staat in het logboek.', title: 'Opgeslagen' },
}

// The form of one account, for the owner only. The owner's own account has the first name and
// the address, but no role or status: only the command on the host changes those.
export default async function AccountPage({ params, searchParams }: Props) {
  await requireRole('owner')

  const id = parseItemId((await params).id)
  const account = id === undefined ? undefined : await findAccount(getDatabase().db, id)

  if (account === undefined) {
    notFound()
  }

  const { gedaan } = await searchParams
  const notice = typeof gedaan === 'string' ? notices[gedaan] : undefined
  const isOwner = account.role === 'owner'

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Heading level={1}>Account wijzigen</Heading>
          <Text appearance="intro">
            {nameOf(account.firstName)}, {roleLabels[account.role]}, {account.disabled ? 'uit' : 'aan'}.
          </Text>
          {isOwner ? (
            <Text>
              Dit is het account van de eigenaar. Het houdt zijn rol en blijft aan: dat verandert alleen de opdracht op
              de server.
            </Text>
          ) : null}
        </>
      }
    >
      {notice === undefined ? null : (
        <Card aria-labelledby="gedaan-kop" surface="soft">
          <Heading id="gedaan-kop" level={2}>
            {notice.title}
          </Heading>
          <Text>{notice.text}</Text>
        </Card>
      )}
      <AccountForm
        action={submitAccount.bind(null, account.id)}
        initial={{
          adres: account.email,
          rol: isOwner ? '' : account.role,
          status: isOwner ? '' : account.disabled ? 'uit' : 'aan',
          voornaam: account.firstName,
        }}
        key={`${account.id}-${account.email}-${account.firstName}-${account.role}-${String(account.disabled)}`}
        kind={isOwner ? 'owner' : 'edit'}
        submitLabel="Opslaan"
      />
      <Text>
        <Link href={accountsPath}>Terug naar de accounts</Link>
      </Text>
    </Page.Main>
  )
}
