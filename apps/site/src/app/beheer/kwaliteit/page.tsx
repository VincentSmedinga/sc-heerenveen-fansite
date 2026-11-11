import type { PlayerListReport } from '@fansite/db/persons'
import type { SeasonCoverage } from '@fansite/db/season-coverage'
import type { Metadata } from 'next'

import { playerListReport, similarPersons } from '@fansite/db/persons'
import { countWaitingFieldDifferences } from '@fansite/db/player-field-differences'
import { countWaitingStatDifferences } from '@fansite/db/player-stat-differences'
import { readSeasonCoverage } from '@fansite/db/season-coverage'
import { Card, DataTable, Heading, Link, List, Page, Text } from '@fansite/design-system'
import { Fragment } from 'react'

import { compact } from '#src/beheer/density'
import { countPersonsWithout, personFactsPath } from '#src/beheer/person-facts'
import {
  fieldDifferencesPath,
  statDifferencesPath,
  waitingChangesBySeason,
  type WorkList,
  workListPath,
} from '#src/beheer/quality'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kwaliteit' }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** Where the matches came from, in the words of a sentence: "34 van Wikipedia". */
const sourceWords: Record<keyof SeasonCoverage['matchesBySource'], string> = {
  'oude-fansite': 'van de sc Heerenveen Fansite',
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
// is told by colour. What an editor can do something about is a link to its work list, in the
// last column.
export default async function QualityPage() {
  await requireRole('beheerder')

  const { db } = getDatabase()
  const coverage = (await readSeasonCoverage(db)).reverse()
  const waiting = await waitingChangesBySeason(db)
  const differing = await countWaitingStatDifferences(db)
  const edited = await countWaitingFieldDifferences(db)
  const alike = await similarPersons(db)
  const list = await playerListReport(db)
  const without = await countPersonsWithout(db)

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
            { fold: true, name: 'Details' },
            { fold: true, name: 'Selectie' },
            { fold: true, name: 'Verslagen' },
            { fold: true, name: 'Te doen' },
          ]}
          rows={coverage.map((row) => ({
            cells: [
              matchesText(row),
              detailsText(row),
              squadText(row),
              row.reports === 0 ? 'Geen verslagen' : plural(row.reportsDone, 'verslag klaar', 'verslagen klaar'),
              <TodoCell
                differing={differing.get(row.season) ?? 0}
                edited={edited.get(row.season) ?? 0}
                key="te-doen"
                row={row}
                waiting={waiting.get(row.season) ?? 0}
              />,
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
      <PlayerListCard report={list} />
      <Card aria-labelledby="linie-en-land-kop">
        <Heading id="linie-en-land-kop" level={2}>
          Personen zonder linie of land
        </Heading>
        {without.linie + without.land === 0 ? (
          <Text>Elke persoon heeft een linie en een land.</Text>
        ) : (
          <Text>
            {plural(without.linie, 'persoon heeft', 'personen hebben')} geen linie en{' '}
            {plural(without.land, 'persoon heeft', 'personen hebben')} geen land.{' '}
            <Link href={personFactsPath}>Vul de linie en het land aan</Link>
          </Text>
        )}
      </Card>
    </Page.Main>
  )
}

/** What we know of the matches besides the result, and whether the season has a table. */
function detailsText(row: SeasonCoverage) {
  if (row.matchesTotal === 0) {
    return row.hasStanding ? 'Stand bekend' : 'Geen stand'
  }

  return `Toeschouwers bij ${row.withAttendance}, scheidsrechter bij ${row.withReferee}, ${row.hasStanding ? 'stand bekend' : 'geen stand'}`
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

/**
 * What the list of players of sc Heerenveen on Wikipedia says about our names. It is
 * information: nothing is made, changed or merged from it.
 */
function PlayerListCard({ report }: { report: PlayerListReport }) {
  const groups = [
    {
      empty: 'Elke persoon van ons staat op de lijst.',
      text: 'Deze personen staan niet op de lijst van spelers van sc Heerenveen. Dat kan kloppen: de lijst is niet altijd compleet.',
      titles: report.notOnList,
    },
    {
      empty: 'Elke titel op de lijst is een persoon van ons.',
      text: 'Deze titels staan op de lijst en zijn geen persoon van ons. Het kan een speler zijn die we nog niet hebben.',
      titles: report.notOurs,
    },
    {
      empty: 'Geen titel verschilt alleen in een teken.',
      text: 'Deze titels verschillen alleen in een teken: onze titel en die van de lijst.',
      titles: report.spelling.map(([ours, listed]) => sentenceList([ours, listed])),
    },
  ]

  return (
    <Card aria-labelledby="lijst-kop">
      <Heading id="lijst-kop" level={2}>
        Namen en de lijst van spelers
      </Heading>
      {report.read === 0 ? (
        <Text>De lijst van spelers van sc Heerenveen is nog niet gelezen.</Text>
      ) : (
        groups.map(({ empty, text, titles }) =>
          titles.length === 0 ? (
            <Text key={empty}>{empty}</Text>
          ) : (
            <Fragment key={empty}>
              <Text>
                {text} Er zijn er {titles.length}.
              </Text>
              <List role="list">
                {titles.slice(0, 20).map((title) => (
                  <List.Item key={title}>{title}</List.Item>
                ))}
              </List>
              {titles.length > 20 ? <Text>En nog {titles.length - 20}.</Text> : null}
            </Fragment>
          ),
        )
      )}
    </Card>
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

/**
 * What an editor can do about a season, each as a link to its work list: the matches without
 * goals, the goals without a player, the reports that are not finished, the changes that wait,
 * the numbers of players that differ and the fields of players where the import says something
 * else than the editors. A season without work says so.
 */
function TodoCell({
  differing,
  edited,
  row,
  waiting,
}: {
  differing: number
  edited: number
  row: SeasonCoverage
  waiting: number
}) {
  const unfinished = row.reports - row.reportsDone
  const work: { list: 'spelerscijfers' | 'spelersgegevens' | WorkList; text: string; total: number }[] = [
    {
      list: 'zonder-doelpunten',
      text: plural(row.playedWithoutGoalList, 'wedstrijd zonder doelpunten', 'wedstrijden zonder doelpunten'),
      total: row.playedWithoutGoalList,
    },
    {
      list: 'doelpunten-zonder-speler',
      text: plural(row.goalsWithoutPlayer, 'doelpunt zonder speler', 'doelpunten zonder speler'),
      total: row.goalsWithoutPlayer,
    },
    { list: 'verslagen-bezig', text: plural(unfinished, 'verslag niet af', 'verslagen niet af'), total: unfinished },
    {
      list: 'wachtende-wijzigingen',
      text: plural(waiting, 'wijziging wacht', 'wijzigingen wachten'),
      total: waiting,
    },
    {
      list: 'spelerscijfers',
      text: plural(differing, 'spelerscijfer verschilt', 'spelerscijfers verschillen'),
      total: differing,
    },
    {
      list: 'spelersgegevens',
      text: plural(edited, 'spelersgegeven verschilt', 'spelersgegevens verschillen'),
      total: edited,
    },
  ]
  const links = work.filter(({ total }) => total > 0)

  return links.length === 0
    ? 'Niets te doen'
    : links.map(({ list, text }, index) => (
        <Fragment key={list}>
          {index === 0 ? null : ', '}
          <Link
            href={
              list === 'spelerscijfers'
                ? statDifferencesPath(row.season)
                : list === 'spelersgegevens'
                  ? fieldDifferencesPath(row.season)
                  : workListPath(row.season, list)
            }
          >
            {text}
            {/* The same words are in every row, so the name of the link says which season. */}
            <Text as="span" className="hf-visually-hidden">
              {' '}
              in {row.season}
            </Text>
          </Link>
        </Fragment>
      ))
}
