import type { Metadata } from 'next'

import { adminRoles } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { Button, Form, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { compact } from '../../beheer/density'
import { countWaitingDifferences } from '../../beheer/match-entries'
import { requireRole } from '../../beheer/require-role'
import { getDatabase } from '../../database'
import { logOut } from './actions'
import { listPath, matchesPath } from './wedstrijden/paths'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Beheer' }

// The start of the admin: who is logged in, the way to the screens, and the button to log out.
export default async function AdminPage() {
  const { email, role } = await requireRole(...adminRoles)
  const { seasons, total: waiting } =
    role === 'beheerder' ? await countWaitingDifferences(getDatabase().db) : { seasons: [], total: 0 }
  // The list that holds them: this season's if it has any, else the newest season that has.
  const current = seasonOf(new Date())
  const season = seasons.includes(current) ? current : seasons[0]

  return (
    <Page.Main className={compact}>
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
                <Link href={season === undefined ? matchesPath : listPath(season, 'aangepast')}>
                  Wedstrijden invullen of verbeteren
                </Link>
                {waiting === 0
                  ? null
                  : ` (${waiting} ${waiting === 1 ? 'afwijking van Wikipedia wacht' : 'afwijkingen van Wikipedia wachten'} op een besluit)`}
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
