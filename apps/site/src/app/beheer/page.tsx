import type { Metadata } from 'next'

import { adminRoles } from '@fansite/db/schema'
import { Button, Form, Heading, Page, Text } from '@fansite/design-system'

import { requireRole } from '../../beheer/require-role'
import { logOut } from './actions'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Beheer' }

// The admin has nothing to do yet. The page shows who is logged in, and the button to log out.
export default async function AdminPage() {
  const { email } = await requireRole(...adminRoles)

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Beheer</Heading>
        <Text>Je bent ingelogd als {email}.</Text>
        <Form action={logOut}>
          <Button type="submit">Uitloggen</Button>
        </Form>
      </Page.Cell>
    </Page.Main>
  )
}
