import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'

import { emptyAccountValues } from '#src/beheer/account-fields'
import { toolbarAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { accountFormId } from '#src/beheer/form-ids'
import { requireRole } from '#src/beheer/require-role'
import { SaveButtons } from '#src/beheer/SaveButtons'

import { AccountForm } from '../AccountForm'
import { submitNewAccount } from '../actions'
import { accountsPath } from '../paths'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Nieuw account' }

// The form for a new account, for the owner only. There is no mail: the person asks for a login
// link on the login page with the address the owner filled in.
export default async function NewAccountPage() {
  await requireRole('owner')

  return (
    <Page.Main areas={toolbarAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Nieuw account</Heading>
        <Text appearance="intro">
          Vul de voornaam, het e-mailadres en de rol in. De persoon logt daarna in met een inloglink op de pagina
          Inloggen.
        </Text>
      </Page.Cell>
      <Page.Toolbar>
        <SaveButtons buttons={[{ label: 'Account toevoegen' }]} cancelHref={accountsPath} formId={accountFormId} />
      </Page.Toolbar>
      <Page.Cell area="main">
        <AccountForm
          action={submitNewAccount}
          initial={emptyAccountValues}
          kind="new"
          submitLabel="Account toevoegen"
        />
        <Text>
          <Link href={accountsPath}>Terug naar de accounts</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
