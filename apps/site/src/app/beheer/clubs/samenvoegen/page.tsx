import type { ClubMergePlan } from '@fansite/db/club-merge'
import type { Metadata } from 'next'

import { defaultKeptClub } from '@fansite/db/club-merge'
import { Card, DataTable, Heading, Link, List, Page, Strong, Text } from '@fansite/design-system'

import { adminAreas } from '#src/beheer/areas'
import { clubFacts, findClubMerge } from '#src/beheer/club-merge'
import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { submitMergeClubs } from '../actions'
import { clubPath, clubsPath, mergePath } from '../paths'
import { ClubMergeForm } from './ClubMergeForm'

// Render on each request: the clubs change with every import.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Clubs samenvoegen' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const count = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`

// The page that merges two clubs that are one club (#1345), and the only place where it can be
// done: the form of a club leads here, with the two clubs in the address (`club` and `met`) and
// which of them stays (`blijft`, none for the default). It shows the two clubs next to each
// other, which stays and why, and what moves in numbers. Nothing changes before the button is
// pressed. Everything in the address is input: two numbers that are no two clubs that can be
// merged get a sentence that says so, and no button.
export default async function MergeClubsPage({ searchParams }: Props) {
  await requireRole('owner', 'editor')

  const { blijft, club, met } = await searchParams
  const clubId = parseItemId(club)
  const withId = parseItemId(met)
  const view =
    clubId === undefined || withId === undefined
      ? 'missing'
      : await findClubMerge(getDatabase().db, clubId, withId, parseItemId(blijft))
  const plan = typeof view === 'string' ? undefined : view

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Clubs samenvoegen</Heading>
        {plan === undefined ? null : (
          <Text appearance="intro">
            Je maakt van twee clubs één club. {plan.kept.name} blijft en {plan.other.name} verdwijnt: alles van{' '}
            {plan.other.name} gaat naar {plan.kept.name}. Dat kun je niet terugdraaien. Lees daarom eerst wat er
            gebeurt.
          </Text>
        )}
      </Page.Cell>
      <Page.Cell area="main">
        {plan === undefined ? (
          <>
            <Text>
              <Strong>Samenvoegen kan niet.</Strong>{' '}
              {view === 'same'
                ? 'Je koos twee keer dezelfde club. Kies een andere club om mee samen te voegen.'
                : view === 'both-wikidata'
                  ? 'Beide clubs hebben een Wikidata-nummer, dus het zijn twee clubs. Een club met een nummer gaat niet op in een andere.'
                  : 'Een van de twee clubs bestaat niet meer. Misschien zijn ze al samengevoegd. Zoek de club opnieuw op en kijk wat er nu staat.'}
            </Text>
            <Text>
              <Link href={clubsPath}>Terug naar de clubs</Link>
            </Text>
          </>
        ) : (
          <MergePlan plan={plan} reason={await keptReason(plan)} />
        )}
      </Page.Cell>
    </Page.Main>
  )
}

/** Why this club stays, in words: the rule of the default, or that the editor chose it. */
async function keptReason({ kept, keptMatches, matches, other }: ClubMergePlan) {
  if ((await defaultKeptClub(getDatabase().db, other, kept)) !== kept.id) {
    return `${kept.name} blijft omdat je dat koos.`
  }

  const why =
    kept.wikidataId !== null && other.wikidataId === null
      ? 'heeft een Wikidata-nummer'
      : kept.wikipediaPage !== null && other.wikipediaPage === null
        ? 'heeft een artikel op Wikipedia'
        : keptMatches > matches
          ? 'heeft de meeste wedstrijden'
          : 'is de oudste van de twee'

  return `${kept.name} blijft, want die ${why}.`
}

/** What the merge does, in cards, and the form that confirms it. */
function MergePlan({ plan, reason }: { plan: ClubMergePlan; reason: string }) {
  const { kept, other } = plan
  const keptFacts = clubFacts(kept, plan.keptMatches)
  const otherFacts = clubFacts(other, plan.matches)

  return (
    <>
      <Card aria-labelledby="clubs-kop">
        <Heading id="clubs-kop" level={2}>
          De twee clubs
        </Heading>
        <DataTable
          appearance="text"
          caption="De twee clubs naast elkaar: de club die blijft en de club die verdwijnt"
          columns={['Gegeven', `Blijft: ${kept.name}`, `Verdwijnt: ${other.name}`]}
          rows={[
            ...keptFacts.map(({ label, value }, index) => ({
              cells: [value, otherFacts[index]?.value ?? ''],
              header: label,
            })),
            { cells: [kept.id, other.id], header: 'Nummer van de club' },
          ]}
          // A comparison side by side, not a list: no sorting.
          sortable={false}
        />
        <Text>{reason}</Text>
        <Text>
          Moet de andere blijven?{' '}
          <Link href={mergePath({ clubId: kept.id, keptId: other.id, withId: other.id })}>
            Laat {other.name} blijven en {kept.name} verdwijnen
          </Link>
        </Text>
      </Card>
      <Card aria-labelledby="verhuist-kop">
        <Heading id="verhuist-kop" level={2}>
          Wat er verhuist
        </Heading>
        <Text>
          Dit gaat van {other.name} naar {kept.name}:
        </Text>
        <List role="list">
          {movedLines(plan).map((line) => (
            <List.Item key={line}>{line}</List.Item>
          ))}
        </List>
        <Text>
          De naam {other.name} wordt een andere naam van {kept.name}. De import van het archief van de Fansite vindt de
          club daarna onder die naam en maakt hem niet opnieuw. Het adres van {other.name} (
          <Strong>{other.slug}</Strong>) bestaat daarna niet meer.
        </Text>
      </Card>
      <ClubMergeForm
        action={submitMergeClubs.bind(null, other.id, kept.id)}
        backHref={clubPath(kept.slug)}
        backLabel={`Terug naar ${kept.name}, zonder samen te voegen`}
        keptName={kept.name}
        label={`Voeg ${other.name} samen met ${kept.name}`}
      />
    </>
  )
}

/** What moves from the club that goes to the club that stays, a line for each kind. */
function movedLines({
  groundsLeft,
  groundsMoved,
  itemClubs,
  leagueResults,
  matches,
  names,
  pages,
  standings,
}: ClubMergePlan) {
  return [
    count(matches, 'wedstrijd', 'wedstrijden'),
    names.length === 0
      ? '0 andere namen'
      : `${count(names.length, 'andere naam', 'andere namen')}: ${names.join(', ')}`,
    pages.length === 0
      ? '0 titels van Wikipedia-pagina’s'
      : `${count(pages.length, 'titel van een Wikipedia-pagina', 'titels van Wikipedia-pagina’s')}: ${pages.join(', ')}`,
    `${count(groundsMoved, 'thuisstadion', 'thuisstadions')}${groundsLeft.length === 0 ? '' : `, en ${count(groundsLeft.length, 'stadion dat al bij de club staat of geen plaats heeft', 'stadions die al bij de club staan of geen plaats hebben')} blijft achter`}`,
    count(itemClubs, 'kop in het nieuws', 'koppen in het nieuws'),
    count(standings, 'regel in de eindstanden', 'regels in de eindstanden'),
    count(leagueResults, 'uitslag in de competitie', 'uitslagen in de competitie'),
  ]
}
