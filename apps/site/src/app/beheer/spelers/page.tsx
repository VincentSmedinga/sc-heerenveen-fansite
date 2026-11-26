import type { PlayerSource } from '@fansite/db/schema'
import type { Metadata } from 'next'

import { Card, DataTable, Heading, Link, Notice, Page, SeasonPicker, Tag, Text } from '@fansite/design-system'

import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { personQualityPath } from '#src/beheer/person-table'
import { positionChoices } from '#src/beheer/player-fields'
import { type AdminPlayerRow, doubleShirtNumbers, listAdminPlayers, listPlayerSeasons } from '#src/beheer/players'
import { requireRole } from '#src/beheer/require-role'
import { findSquadMark } from '#src/beheer/squad-mark'
import { getDatabase } from '#src/database'
import { FocusOnLoad } from '#src/FocusOnLoad'
import { describePeriod, describeShowDelay } from '#src/matches'
import { squadKeptFor } from '#src/season-squad'
import { seasonChoices, seasonFromSlug, seasonSlug } from '#src/seasons'

import { addPlayerPath, playerPath, playersPath } from './paths'
import { SquadMarkCard } from './SquadMarkCard'

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

const labelOf = (position: null | string) => positionChoices.find((choice) => choice.value === position)?.label

/**
 * The cell of the position: that of the season, and otherwise the line of the person, said in
 * words, the rule of the page of a season on the site (`listSeasonPlayers`, issue 1051).
 */
function positionText({ personLine, position }: Pick<AdminPlayerRow, 'personLine' | 'position'>) {
  const own = labelOf(position)
  if (own !== undefined) return own
  const line = labelOf(personLine)

  return line === undefined ? 'Positie onbekend' : `${line} (linie van de persoon)`
}

const errors: Record<string, string> = {
  markeren:
    'Dit seizoen kun je niet als compleet markeren. Dat kan vanaf 1 juli na het seizoen, als het spelers heeft. Er is niets veranderd.',
  'persoon-weg': 'Deze persoon bestaat niet meer. Er is niets veranderd. Kies hieronder een speler.',
  seizoen: 'Dit seizoen kennen we niet: het heeft nog geen wedstrijd. Er is niets veranderd.',
  weg: 'Deze speler bestaat niet. Er is niets veranderd. Kies hieronder een speler.',
}

/** The words of the address after an action on the mark: their notice gets the focus. */
const markWords = ['compleet', 'ingetrokken', 'markeren', 'was-al-compleet', 'was-al-ingetrokken']

// The players of a season for an editor, to add one or to change one (issue 1020). The list
// opens on the current season, and the season picker is a form with method GET, so the page
// works without JavaScript. A player who left the squad says so in words. Every column but the
// name folds under the name where the table has no room, as on a phone, and its header is gone
// then: so a cell says in words what it holds, such as "Rugnummer 7".
export default async function PlayersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('owner', 'editor')

  const { db } = getDatabase()
  const { fout, gedaan, seizoen } = await searchParams
  const now = new Date()
  const seasons = await listPlayerSeasons(db, now)
  const [current = ''] = seasons
  const requested = typeof seizoen === 'string' ? seasonFromSlug(seizoen) : undefined
  const season = requested !== undefined && seasons.includes(requested) ? requested : current
  const rows = await listAdminPlayers(db, season)
  const doubles = doubleShirtNumbers(rows)
  const squad = await findSquadMark(db, season, now)
  const markDelay = `De site toont dat binnen ${describePeriod(squadKeptFor)}.`
  const notices: Record<string, string> = {
    compleet: `De selectie van ${season} is gemarkeerd als compleet. ${markDelay}`,
    ingetrokken: `De markering van de selectie van ${season} is ingetrokken. ${markDelay}`,
    samengevoegd: 'De twee personen zijn één persoon.',
    toegevoegd: `De speler staat in de selectie van ${season} en is te kiezen bij een doelpunt. Op de site staat hij ${describeShowDelay(season, now)}.`,
    'was-al-compleet': `De selectie van ${season} was al gemarkeerd. Er is niets veranderd.`,
    'was-al-ingetrokken': `De selectie van ${season} had geen markering meer. Er is niets veranderd.`,
    weggehaald: `De speler is uit de selectie van ${season} gehaald. Hij blijft in de lijst van het seizoen staan.`,
  }
  // Only a word the page knows: the address is input, and `__proto__` is no notice.
  const known = (texts: Record<string, string>, word: string | string[] | undefined) =>
    typeof word === 'string' && Object.hasOwn(texts, word) ? texts[word] : undefined
  const notice = known(errors, fout) ?? known(notices, gedaan)
  const word = [fout, gedaan].find((value) => typeof value === 'string' && markWords.includes(value))

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Page.Title>
          <Heading level={1}>Spelers</Heading>
          <SeasonPicker action={playersPath} options={seasonChoices(seasons)} value={seasonSlug(season)} />
        </Page.Title>
        <Text appearance="intro">
          De spelers van een seizoen, uit Wikipedia en van de redactie. Voeg een speler toe die ontbreekt, zodat je hem
          bij een doelpunt kunt kiezen, of verbeter er een.
        </Text>
        <Text>
          <Link href={addPlayerPath(season)}>Speler toevoegen aan {season}</Link>
        </Text>
        <Text>
          <Link href={personQualityPath}>Kwaliteit van spelers en personen</Link>: wat we missen, per letter.
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        {notice === undefined ? null : typeof word === 'string' ? (
          <>
            <Notice id="gedaan" tabIndex={-1}>
              {notice}
            </Notice>
            <FocusOnLoad id="gedaan" key={word} />
          </>
        ) : (
          <Notice>{notice}</Notice>
        )}
        {doubles.length === 0 ? null : (
          <Notice>
            Dubbel rugnummer in de selectie van {season}:{' '}
            {doubles.map((double) => `${double.number} (${double.names.join(', ')})`).join('; ')}. Controleer of een van
            hen een ander nummer heeft gekregen.
          </Notice>
        )}
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
              columns={[
                'Speler',
                { fold: true, name: 'Rugnummer' },
                { fold: true, name: 'Positie' },
                { fold: true, name: 'Bron' },
                { fold: true, name: 'Selectie' },
              ]}
              rows={rows.map((player) => ({
                cells: [
                  player.shirtNumber === null
                    ? { content: 'Geen rugnummer', sortValue: null }
                    : { content: `Rugnummer ${player.shirtNumber}`, sortValue: player.shirtNumber },
                  positionText(player),
                  player.source === 'redactie'
                    ? { content: <Tag tone="highlight">Redactie</Tag>, sortValue: 'Redactie' }
                    : sourceLabels[player.source],
                  player.inSquad ? 'In de selectie' : 'Uit de selectie',
                ],
                header: player.name,
                href: playerPath(player.id),
              }))}
            />
          </Card>
        )}
        <SquadMarkCard season={season} squad={squad} />
      </Page.Cell>
    </Page.Main>
  )
}
