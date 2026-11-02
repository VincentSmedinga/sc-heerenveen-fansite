import type { Metadata } from 'next'

import { adminRoles } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { Button, Card, Form, Heading, Link, List, Page, Text, Tile } from '@fansite/design-system'

import { compact } from '#src/beheer/density'
import { countMatchesWithoutResult, countWaitingDifferences } from '#src/beheer/match-entries'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { logOut } from './actions'
import { listPath, matchesPath } from './wedstrijden/paths'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Beheer' }

/** One line of the card Te doen: a link that says what waits, with the number in it. */
type TodoItem = { href: string; text: string }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

// The start of the admin: who is logged in, a tile for every screen, what is left to do in a
// card in the sidebar, and the button to log out. The card is only there when something waits,
// and a next screen adds a line to it by adding an item to `todo`.
export default async function AdminPage() {
  const { email, role } = await requireRole(...adminRoles)
  const beheerder = role === 'beheerder'
  const now = new Date()
  // The list that holds the differences: this season's if it has any, else the newest season
  // that has.
  const current = seasonOf(now)
  const { db } = getDatabase()
  const { seasons, total: waiting } = beheerder ? await countWaitingDifferences(db) : { seasons: [], total: 0 }
  const season = seasons.includes(current) ? current : seasons[0]
  const withoutResult = beheerder ? await countMatchesWithoutResult(db, current, now) : 0
  const todo: TodoItem[] = []

  if (waiting > 0) {
    todo.push({
      href: season === undefined ? matchesPath : listPath(season, 'aangepast'),
      text: `${plural(waiting, 'afwijking van Wikipedia wacht', 'afwijkingen van Wikipedia wachten')} op een besluit`,
    })
  }
  if (withoutResult > 0) {
    todo.push({
      href: matchesPath,
      text: plural(withoutResult, 'wedstrijd zonder uitslag', 'wedstrijden zonder uitslag'),
    })
  }

  return (
    <>
      <Page.Main
        className={compact}
        intro={
          <>
            <Heading level={1}>Beheer</Heading>
            <Text>
              Je bent ingelogd als {email} ({role}).
            </Text>
          </>
        }
      >
        <Tile.Grid aria-label="Schermen van het beheer">
          <Tile href="/beheer/berichten" icon="speech" level={2} title="Berichten">
            Verberg berichten die niet op de site horen.
          </Tile>
          {beheerder ? (
            <>
              <Tile href="/beheer/artikelen" icon="document" level={2} title="Artikelen">
                Schrijf artikelen en publiceer ze.
              </Tile>
              <Tile href={matchesPath} icon="ball" level={2} title="Wedstrijden">
                Vul wedstrijden in of verbeter ze.
              </Tile>
              <Tile href="/beheer/bezoek" icon="chart" level={2} title="Bezoek">
                Bekijk hoeveel mensen de site bezoeken.
              </Tile>
            </>
          ) : null}
        </Tile.Grid>
        <Form action={logOut}>
          <Button type="submit">Uitloggen</Button>
        </Form>
      </Page.Main>
      {todo.length === 0 ? null : (
        <Page.Sidebar aria-label="Te doen">
          <Card aria-labelledby="te-doen" surface="soft">
            <Heading id="te-doen" level={2}>
              Te doen
            </Heading>
            <List role="list">
              {todo.map((item) => (
                <List.Item key={item.href + item.text}>
                  <Link href={item.href}>{item.text}</Link>
                </List.Item>
              ))}
            </List>
          </Card>
        </Page.Sidebar>
      )}
    </>
  )
}
