import type { Metadata } from 'next'

import { Button, Card, FigureList, Form, Heading, Link, Page, Text } from '@fansite/design-system'

import { nameOf, roleLabels } from '#src/beheer/account-fields'
import { listAccounts } from '#src/beheer/account-management'
import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { accountPath, newAccountPath } from './paths'

// Render on each request: who is logged in and which accounts exist are not known when the site
// is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Accounts' }

type SearchParams = Record<string, string | string[] | undefined>

// The accounts of the admin, for the owner only (issue 1156): the owner first, then the others
// in the order they were made, each a row of a FigureList with its first name, address, role
// and whether it is on. "Nieuw account" is under the card. The link of each account is its
// first name with its address for screen readers, or its address when it has none yet, so the
// name of the link says which account it opens. There is no button to delete one: the log
// refers to it.
export default async function AccountsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('owner')

  const { fout } = await searchParams
  const accounts = await listAccounts(getDatabase().db)

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Heading level={1}>Accounts</Heading>
          <Text appearance="intro">
            Hier voeg je redacteuren en auteurs toe, en wijzig je hun voornaam, adres en rol. Een account dat je uitzet,
            kan niet meer inloggen. Verwijderen kan niet, want het logboek verwijst ernaar.
          </Text>
        </>
      }
    >
      {fout === 'weg' ? (
        <Card aria-labelledby="weg-kop" surface="soft">
          <Heading id="weg-kop" level={2}>
            Dit account bestaat niet
          </Heading>
          <Text>Er is niets veranderd. Kies hieronder een account.</Text>
        </Card>
      ) : null}
      <Card as="div">
        <Text appearance="meta">
          {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}.
        </Text>
        <FigureList>
          {accounts.map((account) => (
            <FigureList.Item
              figure={`${roleLabels[account.role]} · ${account.disabled ? 'uit' : 'aan'}`}
              key={account.id}
              note={account.firstName === '' ? nameOf('') : account.email}
            >
              <Link href={accountPath(account.id)}>
                {account.firstName === '' ? (
                  account.email
                ) : (
                  <>
                    {account.firstName}
                    {/* Two accounts can share a first name: the address tells them apart. */}
                    <Text as="span" className="hf-visually-hidden">
                      {` (${account.email})`}
                    </Text>
                  </>
                )}
              </Link>
            </FigureList.Item>
          ))}
        </FigureList>
      </Card>
      <Form action={newAccountPath} method="get">
        <Button icon="plus" type="submit">
          Nieuw account
        </Button>
      </Form>
    </Page.Main>
  )
}
