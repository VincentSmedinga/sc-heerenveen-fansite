import type { PersonMergePlan } from '@fansite/db/person-merge'
import type { Metadata } from 'next'

import { Breadcrumb, Card, DataTable, Heading, Link, List, Page, Strong, Text } from '@fansite/design-system'

import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import { personLabels } from '#src/beheer/person-labels'
import { findMerge, type MergeDifference, mergeDifferences, none, personFacts } from '#src/beheer/person-merge'
import { findAdminPlayer } from '#src/beheer/players'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { submitMergePersons } from '../actions'
import { listPath, mergePath, playerPath } from '../paths'
import { MergeForm } from './MergeForm'

// Render on each request: the persons change with every save and every import.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Personen samenvoegen' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const count = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`

/** The seasons of a person in a cell: all of them, or that he has none. */
const seasonsText = (seasons: readonly string[]) =>
  seasons.length === 0 ? 'in geen seizoen' : [...new Set(seasons)].join(', ')

// The page that merges two persons of one player (issue 977), and the only place where it can
// be done: the form of a player leads here, with the two persons in the address (`persoon` and
// `met`), which of them stays (`blijft`, none for the default) and the player to go back to
// (`speler`). It shows the two persons next to each other in a table, what they do not share
// and which value stays, and what moves in numbers. Nothing changes before the button is
// pressed. Everything in the address is input: two numbers that are no two persons get a
// sentence that says so, and no button.
export default async function MergePersonsPage({ searchParams }: Props) {
  await requireRole('beheerder')

  const { db } = getDatabase()
  const { blijft, met, persoon, speler } = await searchParams
  const personId = parseItemId(persoon)
  const withId = parseItemId(met)
  const playerId = parseItemId(speler)
  const from = playerId === undefined ? undefined : await findAdminPlayer(db, playerId)
  const view =
    personId === undefined || withId === undefined
      ? 'missing'
      : await findMerge(db, personId, withId, parseItemId(blijft))
  const back =
    from === undefined
      ? { href: listPath(), label: 'Terug naar de spelers' }
      : { href: playerPath(from.player.id), label: `Terug naar ${from.player.name}` }
  const crumbs = [
    { href: '/beheer', label: 'Beheer' },
    ...(from === undefined
      ? [{ href: listPath(), label: 'Spelers' }]
      : [
          { href: listPath(from.player.season), label: `Spelers ${from.player.season}` },
          { href: playerPath(from.player.id), label: from.player.name },
        ]),
  ]

  if (view === 'missing' || view === 'same') {
    return (
      <Page.Main
        className={compact}
        intro={
          <>
            <Breadcrumb current="Personen samenvoegen" items={crumbs} label="Kruimelpad" />
            <Heading level={1}>Personen samenvoegen</Heading>
          </>
        }
        wide
      >
        <Text>
          <Strong>Samenvoegen kan niet.</Strong>{' '}
          {view === 'same'
            ? 'Je koos twee keer dezelfde persoon. Kies een andere persoon om mee samen te voegen.'
            : 'Een van de twee personen bestaat niet meer. Misschien zijn ze al samengevoegd. Zoek de speler opnieuw op en kijk wat er nu staat.'}
        </Text>
        <Text>
          <Link href={back.href}>{back.label}</Link>
        </Text>
      </Page.Main>
    )
  }

  const { kept, other } = view
  const [keptName, otherName] = personLabels(kept, other)
  const differences = mergeDifferences(view)
  const keptFacts = personFacts(kept)
  const otherFacts = personFacts(other)

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Breadcrumb current="Personen samenvoegen" items={crumbs} label="Kruimelpad" />
          <Heading level={1}>Personen samenvoegen</Heading>
          <Text appearance="intro">
            Je maakt van twee personen één persoon. {keptName} blijft en {otherName} verdwijnt: alles van {otherName}{' '}
            gaat naar {keptName}. Dat kun je niet terugdraaien. Lees daarom eerst wat er gebeurt.
          </Text>
        </>
      }
      wide
    >
      <Card aria-labelledby="personen-kop">
        <Heading id="personen-kop" level={2}>
          De twee personen
        </Heading>
        <DataTable
          appearance="text"
          caption="De twee personen naast elkaar: de persoon die blijft en de persoon die verdwijnt"
          columns={['Gegeven', `Blijft: ${keptName}`, `Verdwijnt: ${otherName}`]}
          rows={[
            ...keptFacts.map(({ label, value }, index) => ({
              cells: [value, otherFacts[index]?.value ?? none],
              header: label,
            })),
            {
              cells: [seasonsText(view.keptSeasons), seasonsText(view.rows.map((row) => row.season))],
              header: 'Seizoenen',
            },
            { cells: [kept.id, other.id], header: 'Nummer van de persoon' },
          ]}
        />
        <Text>
          Moet de andere blijven?{' '}
          <Link href={mergePath({ keptId: other.id, personId: kept.id, playerId: from?.player.id, withId: other.id })}>
            Laat {otherName} blijven en {keptName} verdwijnen
          </Link>
        </Text>
      </Card>
      <Card aria-labelledby="verschillen-kop">
        <Heading id="verschillen-kop" level={2}>
          Wat anders is, en wat blijft
        </Heading>
        {differences.length === 0 ? (
          <Text>De twee personen hebben geen gegevens die verschillen.</Text>
        ) : (
          <>
            <Text>
              Een waarde die de redactie instelde, gaat voor. Daarna geldt de waarde van {keptName}. Wat {keptName}{' '}
              mist, komt van {otherName}.
            </Text>
            <List role="list">
              {differences.map((difference) => (
                <List.Item key={difference.label}>{differenceText(difference, otherName)}</List.Item>
              ))}
            </List>
          </>
        )}
      </Card>
      <Card aria-labelledby="verhuist-kop">
        <Heading id="verhuist-kop" level={2}>
          Wat er verhuist
        </Heading>
        <Text>
          Dit gaat van {otherName} naar {keptName}:
        </Text>
        <List role="list">
          {movedLines(view).map((line) => (
            <List.Item key={line}>{line}</List.Item>
          ))}
        </List>
        {view.doubles.map(({ gone, season, stays }) => (
          <Text key={gone.id}>
            <Strong>In {season} hebben beide personen een rij.</Strong> Die twee rijen worden één:{' '}
            {gone.name === stays.name
              ? `de twee rijen van ${stays.name} gaan samen.`
              : `de rij van ${gone.name} gaat op in de rij van ${stays.name}.`}{' '}
            Wat de rij die blijft mist, zoals een rugnummer, komt van de andere rij.
          </Text>
        ))}
      </Card>
      <MergeForm
        action={submitMergePersons.bind(null, other.id, kept.id, from?.player.id)}
        backHref={back.href}
        backLabel={`${back.label}, zonder samen te voegen`}
        label={`Voeg ${otherName} samen met ${keptName}`}
      />
    </Page.Main>
  )
}

/** One value the two persons do not share, as a sentence that says which stays and why. */
function differenceText({ kept, label, other, result }: MergeDifference, otherName: string) {
  if (result === kept) {
    return other === none ? `${label}: ${kept} blijft.` : `${label}: ${kept} blijft, ${other} verdwijnt.`
  }

  return kept === none
    ? `${label}: ${result} komt van ${otherName} en blijft.`
    : `${label}: ${result} blijft, want de redactie stelde die in bij ${otherName}. ${kept} verdwijnt.`
}

/** What moves from the person that goes to the person that stays, a line for each kind. */
function movedLines({ appearances, editorsValues, goals, pages, rows }: PersonMergePlan) {
  return [
    count(goals, 'doelpunt', 'doelpunten'),
    `${count(rows.length, 'spelersrij', 'spelersrijen')}${rows.length === 0 ? '' : `: ${rows.map((row) => `${row.name} in ${row.season}`).join(', ')}`}`,
    count(appearances, 'wedstrijdoptreden in onze verslagen', 'wedstrijdoptredens in onze verslagen'),
    pages.length === 0
      ? '0 titels van Wikipedia-pagina’s'
      : `${count(pages.length, 'titel van een Wikipedia-pagina', 'titels van Wikipedia-pagina’s')}: ${pages.join(', ')}. De import vindt de persoon daarna ook onder ${pages.length === 1 ? 'die titel' : 'die titels'}.`,
    count(editorsValues, 'handmatige wijziging van de redactie', 'handmatige wijzigingen van de redactie'),
  ]
}
