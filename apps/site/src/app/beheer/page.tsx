import type { Metadata } from 'next'

import { adminRoles } from '@fansite/db/schema'
import { Button, Form, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { requireRole } from '../../beheer/require-role'
import { logOut } from './actions'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Beheer' }

// The start of the admin: who is logged in, the way to the screens, and the button to log out.
export default async function AdminPage() {
  const { email, role } = await requireRole(...adminRoles)

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Beheer</Heading>
        <Text>Je bent ingelogd als {email}.</Text>
        <List role="list">
          <List.Item>
            <Link href="/beheer/berichten">Berichten verbergen of weer tonen</Link>
          </List.Item>
          {role === 'beheerder' ? (
            <>
              <List.Item>
                <Link href="/beheer/artikelen">Artikelen schrijven en publiceren</Link>
              </List.Item>
              <List.Item>
                <Link href="/beheer/bezoek">Cijfers over het bezoek</Link>
              </List.Item>
            </>
          ) : null}
        </List>
        <Form action={logOut}>
          <Button type="submit">Uitloggen</Button>
        </Form>
      </Page.Cell>
    </Page.Main>
  )
}
