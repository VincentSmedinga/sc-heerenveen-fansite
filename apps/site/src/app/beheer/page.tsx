import type { Metadata } from 'next'

import { adminRoles } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { Card, Heading, Link, List, Page, Text, Tile } from '@fansite/design-system'

import { roleLabels } from '#src/beheer/account-fields'
import { compact } from '#src/beheer/density'
import { countHeldChanges, countMatchesWithoutResult, countWaitingDifferences } from '#src/beheer/match-entries'
import { countReportsToCheck } from '#src/beheer/match-reports'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { listPath, matchesPath } from './wedstrijden/paths'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Beheer' }

/** One line of the card Te doen: a link that says what waits, with the number in it. */
type TodoItem = { href: string; text: string }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

// The start of the admin: who is logged in, a tile for every screen the role may see, and what
// is left to do in a card in the sidebar. An author sees his articles and his account only. The
// button to log out is in the bar (AdminScreens). The card is only there when something waits,
// and a next screen adds a line to it by adding an item to `todo`.
export default async function AdminPage() {
  const { email, firstName, role } = await requireRole(...adminRoles)
  const editor = role !== 'author'
  const now = new Date()
  // The list that holds the differences: this season's if it has any, else the newest season
  // that has.
  const current = seasonOf(now)
  const { db } = getDatabase()
  const { seasons, total: waiting } = editor ? await countWaitingDifferences(db) : { seasons: [], total: 0 }
  const season = seasons.includes(current) ? current : seasons[0]
  const { seasons: heldSeasons, total: held } = editor ? await countHeldChanges(db) : { seasons: [], total: 0 }
  const heldSeason = heldSeasons.includes(current) ? current : heldSeasons[0]
  const withoutResult = editor ? await countMatchesWithoutResult(db, current, now) : 0
  // The reports that were klaar and are no longer right, which the list shows as "Klopt niet".
  const { seasons: wrongSeasons, total: wrong } = editor ? await countReportsToCheck(db) : { seasons: [], total: 0 }
  const wrongSeason = wrongSeasons.includes(current) ? current : wrongSeasons[0]
  const todo: TodoItem[] = []

  if (waiting > 0) {
    todo.push({
      href: season === undefined ? matchesPath : listPath(season, 'aangepast'),
      text: `${plural(waiting, 'afwijking van Wikipedia wacht', 'afwijkingen van Wikipedia wachten')} op een besluit`,
    })
  }
  if (held > 0) {
    todo.push({
      href: heldSeason === undefined ? matchesPath : listPath(heldSeason, 'wikipedia-wacht'),
      text: `${plural(held, 'wijziging van Wikipedia wacht', 'wijzigingen van Wikipedia wachten')} op een besluit`,
    })
  }
  if (withoutResult > 0) {
    todo.push({
      href: matchesPath,
      text: plural(withoutResult, 'wedstrijd zonder uitslag', 'wedstrijden zonder uitslag'),
    })
  }

  if (wrong > 0) {
    todo.push({
      href: wrongSeason === undefined ? matchesPath : listPath(wrongSeason, 'alles'),
      text: plural(wrong, 'verslag klopt niet', 'verslagen kloppen niet'),
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
              Je bent ingelogd als {firstName === '' ? email : firstName} ({roleLabels[role]}).
            </Text>
          </>
        }
      >
        <Tile.Grid aria-label="Schermen van het beheer">
          {editor ? (
            <Tile href="/beheer/berichten" icon="speech" level={2} title="Berichten">
              Verberg berichten die niet op de site horen.
            </Tile>
          ) : null}
          <Tile href="/beheer/artikelen" icon="document" level={2} title="Artikelen">
            {editor ? 'Schrijf artikelen en publiceer ze.' : 'Schrijf je eigen artikelen en publiceer ze.'}
          </Tile>
          {editor ? (
            <>
              <Tile href={matchesPath} icon="ball" level={2} title="Wedstrijden">
                Vul wedstrijden in of verbeter ze.
              </Tile>
              <Tile href="/beheer/stadions" icon="ball" level={2} title="Stadions">
                Geef een club een eigen lijst van stadions, met een toelichting.
              </Tile>
              <Tile href="/beheer/clubnamen" icon="ball" level={2} title="Clubnamen">
                Houd bij welke namen een club droeg, en sinds wanneer.
              </Tile>
              <Tile href="/beheer/kwaliteit" icon="chart" level={2} title="Kwaliteit">
                Bekijk per seizoen wat we weten en wat ontbreekt.
              </Tile>
              <Tile href="/beheer/bezoek" icon="chart" level={2} title="Bezoek">
                Bekijk hoeveel mensen de site bezoeken.
              </Tile>
            </>
          ) : null}
          {role === 'owner' ? (
            <Tile href="/beheer/accounts" icon="document" level={2} title="Accounts">
              Voeg redacteuren en auteurs toe, en wijzig hun gegevens.
            </Tile>
          ) : null}
          <Tile href="/beheer/mijn-account" icon="envelope" level={2} title="Mijn account">
            {editor ? 'Bekijk je gegevens en kies of je de mail over Wikipedia krijgt.' : 'Bekijk je gegevens.'}
          </Tile>
        </Tile.Grid>
      </Page.Main>
      {todo.length === 0 ? null : (
        <Page.Sidebar aria-label="Te doen">
          <Card as="div" surface="soft">
            <Heading level={2}>Te doen</Heading>
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
