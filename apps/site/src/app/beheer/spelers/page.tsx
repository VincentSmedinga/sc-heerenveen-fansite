import type { PlayerSource } from '@fansite/db/schema'
import type { Metadata } from 'next'

import {
  Breadcrumb,
  Card,
  DataTable,
  Heading,
  Link,
  Notice,
  Page,
  SeasonPicker,
  Tag,
  Text,
} from '@fansite/design-system'

import { compact } from '#src/beheer/density'
import { positionChoices } from '#src/beheer/player-fields'
import { listAdminPlayers, listPlayerSeasons } from '#src/beheer/players'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { describeShowDelay } from '#src/matches'
import { seasonChoices, seasonFromSlug, seasonSlug } from '#src/seasons'

import { addPlayerPath, playerPath, playersPath } from './paths'

// Render on each request: who is logged in and the players of a season are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Spelers' }

type SearchParams = Record<string, string | string[] | undefined>

/** Where a player comes from, in the words of the list. */
const sourceLabels: Record<PlayerSource, string> = {
  doelpunten: 'Wikipedia: doelpunten',
  engels: 'Engelse Wikipedia',
  redactie: 'Redactie',
  selectie: 'Wikipedia: selectie',
  statistieken: 'Wikipedia: statistieken',
  transfers: 'Wikipedia: transfers',
  verslag: 'Verslag van de redactie',
  wikidata: 'Wikidata',
}

const errors: Record<string, string> = {
  seizoen: 'Dit seizoen kennen we niet: het heeft nog geen wedstrijd. Er is niets veranderd.',
  weg: 'Deze speler bestaat niet. Er is niets veranderd. Kies hieronder een speler.',
}

// The players of a season for a beheerder, to add one or to change one (issue 1020). The list
// opens on the current season, and the season picker is a form with method GET, so the page
// works without JavaScript. A player who left the squad says so in words.
export default async function PlayersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('beheerder')

  const { db } = getDatabase()
  const { fout, gedaan, seizoen } = await searchParams
  const now = new Date()
  const seasons = await listPlayerSeasons(db, now)
  const [current = ''] = seasons
  const requested = typeof seizoen === 'string' ? seasonFromSlug(seizoen) : undefined
  const season = requested !== undefined && seasons.includes(requested) ? requested : current
  const rows = await listAdminPlayers(db, season)
  const notices: Record<string, string> = {
    toegevoegd: `De speler staat in de selectie van ${season} en is te kiezen bij een doelpunt. Op de site staat hij ${describeShowDelay(season, now)}.`,
    weggehaald: `De speler is uit de selectie van ${season} gehaald. Hij blijft in de lijst van het seizoen staan.`,
  }
  const notice = typeof fout === 'string' ? errors[fout] : typeof gedaan === 'string' ? notices[gedaan] : undefined

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Breadcrumb current="Spelers" items={[{ href: '/beheer', label: 'Beheer' }]} label="Kruimelpad" />
          <Page.Title>
            <Heading level={1}>Spelers</Heading>
            <SeasonPicker action={playersPath} options={seasonChoices(seasons)} value={seasonSlug(season)} />
          </Page.Title>
          <Text appearance="intro">
            De spelers van een seizoen, uit Wikipedia en van de redactie. Voeg een speler toe die ontbreekt, zodat je
            hem bij een doelpunt kunt kiezen, of verbeter er een.
          </Text>
          <Text>
            <Link href={addPlayerPath(season)}>Speler toevoegen aan {season}</Link>
          </Text>
        </>
      }
      wide
    >
      {notice === undefined ? null : <Notice>{notice}</Notice>}
      {rows.length === 0 ? (
        <Text>Er zijn nog geen spelers in het seizoen {season}.</Text>
      ) : (
        <Card aria-labelledby="spelers-kop">
          <Heading className="hf-visually-hidden" id="spelers-kop" level={2}>
            Spelers in het seizoen {season}
          </Heading>
          <DataTable
            appearance="text"
            caption={`Spelers in het seizoen ${season}`}
            columns={['Speler', 'Rugnummer', 'Positie', 'Bron', 'Selectie']}
            rows={rows.map((player) => ({
              cells: [
                player.shirtNumber ?? 'Geen',
                positionChoices.find((choice) => choice.value === player.position)?.label ?? 'Onbekend',
                player.source === 'redactie' ? <Tag tone="highlight">Redactie</Tag> : sourceLabels[player.source],
                player.inSquad ? 'In de selectie' : 'Uit de selectie',
              ],
              header: player.name,
              href: playerPath(player.id),
            }))}
          />
        </Card>
      )}
    </Page.Main>
  )
}
