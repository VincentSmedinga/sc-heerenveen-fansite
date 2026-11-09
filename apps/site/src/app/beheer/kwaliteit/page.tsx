import type { SeasonCoverage } from '@fansite/db/season-coverage'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { similarPersons } from '@fansite/db/persons'
import { readSeasonCoverage } from '@fansite/db/season-coverage'
import { Card, DataTable, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { compact } from '#src/beheer/density'
import { waitingChangesBySeason, workListPath } from '#src/beheer/quality'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kwaliteit' }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** Where the matches came from, in the words of a sentence: "34 van Wikipedia". */
const sourceWords: Record<keyof SeasonCoverage['matchesBySource'], string> = {
  'oude-fansite': 'van de oude fansite',
  redactie: 'van de redactie',
  wikipedia: 'van Wikipedia',
}

/** How complete the squad of a season is, in the words of a sentence. */
const levelWords: Record<NonNullable<SeasonCoverage['squad']>['level'], string> = {
  bijna: 'bijna compleet',
  compleet: 'compleet',
  deels: 'deels compleet',
  onbekend: 'onbekend hoe compleet',
  weinig: 'lang niet compleet',
}

// What we have of each season since 1990/91, for a beheerder: one row for each season, the
// newest first, and the persons that look alike. A cell says in words what it counts, so it
// still reads where the column is folded under the season and its header is gone, and nothing
// is told by colour. What an editor can do something about is a link to its work list.
export default async function QualityPage() {
  await requireRole('beheerder')

  const { db } = getDatabase()
  const coverage = (await readSeasonCoverage(db)).reverse()
  const waiting = await waitingChangesBySeason(db)
  const alike = await similarPersons(db)

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Heading level={1}>Kwaliteit</Heading>
          <Text appearance="intro">
            Wat we van elk seizoen sinds 1990/91 weten, en wat er nog ontbreekt. Een koppeling in de tabel leidt naar
            een werklijst: de wedstrijden waar je iets aan kunt doen.
          </Text>
        </>
      }
      wide
    >
      <Card aria-labelledby="seizoenen-kop">
        <Heading id="seizoenen-kop" level={2}>
          Per seizoen
        </Heading>
        <DataTable
          appearance="text"
          caption="Wat we van elk seizoen weten, het nieuwste seizoen bovenaan"
          columns={[
            'Seizoen',
            { fold: true, name: 'Wedstrijden' },
            { fold: true, name: 'Doelpunten' },
            { fold: true, name: 'Verslagen' },
            { fold: true, name: 'Toeschouwers' },
            { fold: true, name: 'Scheidsrechter' },
            { fold: true, name: 'Selectie' },
            { fold: true, name: 'Wijzigingen' },
            { fold: true, name: 'Stand' },
          ]}
          rows={coverage.map((row) => ({
            cells: [
              matchesText(row),
              <GoalsCell key="doelpunten" row={row} />,
              <ReportsCell key="verslagen" row={row} />,
              `Toeschouwers bij ${plural(row.withAttendance, 'wedstrijd', 'wedstrijden')}`,
              `Scheidsrechter bij ${plural(row.withReferee, 'wedstrijd', 'wedstrijden')}`,
              squadText(row),
              <ChangesCell key="wijzigingen" season={row.season} total={waiting.get(row.season) ?? 0} />,
              row.hasStanding ? 'Stand bekend' : 'Geen stand',
            ],
            header: row.season,
          }))}
        />
      </Card>
      <Card aria-labelledby="personen-kop">
        <Heading id="personen-kop" level={2}>
          Personen die op elkaar lijken
        </Heading>
        {alike.length === 0 ? (
          <Text>Er zijn geen personen die op elkaar lijken.</Text>
        ) : (
          <>
            <Text>
              Deze personen hebben bijna dezelfde naam op Wikipedia, op accenten, hoofdletters en streepjes na. We
              voegen ze niet vanzelf samen, want twee spelers kunnen dezelfde naam hebben.
            </Text>
            <List role="list">
              {alike.map((titles) => (
                <List.Item key={titles.join('|')}>{sentenceList(titles)}</List.Item>
              ))}
            </List>
          </>
        )}
      </Card>
    </Page.Main>
  )
}

/** The changes that wait for a decision, as a link to their work list when there are any. */
function ChangesCell({ season, total }: { season: string; total: number }) {
  return total === 0 ? (
    'Geen wachtende wijzigingen'
  ) : (
    <Link href={workListPath(season, 'wachtende-wijzigingen')}>
      {plural(total, 'wijziging wacht', 'wijzigingen wachten')}
    </Link>
  )
}

/** What is missing of the goals, each as a link to its work list, or that nothing is. */
function GoalsCell({ row }: { row: SeasonCoverage }) {
  const links: ReactNode[] = []

  if (row.playedWithoutGoalList > 0) {
    links.push(
      <Link href={workListPath(row.season, 'zonder-doelpunten')} key="zonder-doelpunten">
        {plural(row.playedWithoutGoalList, 'wedstrijd zonder doelpunten', 'wedstrijden zonder doelpunten')}
      </Link>,
    )
  }
  if (row.goalsWithoutPlayer > 0) {
    links.push(
      <Link href={workListPath(row.season, 'doelpunten-zonder-speler')} key="doelpunten-zonder-speler">
        {plural(row.goalsWithoutPlayer, 'doelpunt zonder speler', 'doelpunten zonder speler')}
      </Link>,
    )
  }

  return links.length === 0 ? 'Doelpunten in orde' : links.length === 1 ? links : [links[0], ', ', links[1]]
}

/** The matches of a season, how many were played and where they came from. */
function matchesText(row: SeasonCoverage) {
  if (row.matchesTotal === 0) {
    return 'Geen wedstrijden'
  }

  const sources = Object.entries(row.matchesBySource)
    .filter(([, total]) => total > 0)
    .map(([source, total]) => `${total} ${sourceWords[source as keyof typeof sourceWords]}`)

  return `${plural(row.matchesTotal, 'wedstrijd', 'wedstrijden')}, ${row.played} gespeeld (${sources.join(', ')})`
}

/** The reports that are done, and those that are not as a link to their work list. */
function ReportsCell({ row }: { row: SeasonCoverage }) {
  const unfinished = row.reports - row.reportsDone

  if (row.reports === 0) {
    return 'Geen verslagen'
  }

  return (
    <>
      {plural(row.reportsDone, 'verslag klaar', 'verslagen klaar')}
      {unfinished === 0 ? null : (
        <>
          {', '}
          <Link href={workListPath(row.season, 'verslagen-bezig')}>
            {plural(unfinished, 'verslag niet af', 'verslagen niet af')}
          </Link>
        </>
      )}
    </>
  )
}

/** Names in a sentence: "A en B", "A, B en C". */
function sentenceList(names: readonly string[]) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} en ${names.at(-1)}`
}

/** The players of a season, and how complete `squad_completeness` says the squad is. */
function squadText(row: SeasonCoverage) {
  if (row.playerCount === 0 && row.squad === null) {
    return 'Geen spelers'
  }

  const players = plural(row.playerCount, 'speler', 'spelers')

  return row.squad === null
    ? `${players}, onbekend hoe compleet`
    : `${players}, ${levelWords[row.squad.level]} (beste bron: ${row.squad.bestSource})`
}
