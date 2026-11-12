import type { PlayerListReport } from '@fansite/db/persons'
import type { Metadata } from 'next'

import { playerListReport, similarPersons } from '@fansite/db/persons'
import { readSeasonCoverage } from '@fansite/db/season-coverage'
import { Card, DataTable, Heading, Link, List, Page, Text } from '@fansite/design-system'
import { Fragment } from 'react'

import { gapLegend, gapTableColumns } from '#src/app/beheer/kwaliteit/gap-table'
import { compact } from '#src/beheer/density'
import { countPersonsWithout, personFactsPath } from '#src/beheer/person-facts'
import { countGapsBySeason, gapColumns, readMatchGaps, seasonTablePath } from '#src/beheer/quality-table'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Kwaliteit' }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

// What we miss of each season since 1990/91, for an editor (issue 1163): one row for each
// season, the newest first, with a column for each part of a match. A number is how many
// matches of the season have a gap in that part, and leads to them. Under it the persons that
// look alike, the list of players of Wikipedia and the persons without a line or a country,
// until the table of persons takes their place (issue 1165).
export default async function QualityPage() {
  await requireRole('owner', 'editor')

  const { db } = getDatabase()
  const coverage = (await readSeasonCoverage(db)).reverse()
  const matchGaps = await readMatchGaps(db)
  const gaps = countGapsBySeason(matchGaps)
  const withGaps = matchGaps.filter((match) => Object.keys(match.gaps).length > 0)
  const total = withGaps.reduce(
    (sum, match) => sum + Object.values(match.gaps).reduce((inMatch, gap) => inMatch + gap.total, 0),
    0,
  )
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
            {withGaps.length === 0
              ? 'Alle wedstrijden zijn compleet.'
              : `Nog ${plural(total, 'gat', 'gaten')} in ${plural(withGaps.length, 'wedstrijd', 'wedstrijden')} van de ${matchGaps.length}. Een getal in de tabel leidt naar de wedstrijden van dat seizoen met een gat in die kolom.`}
          </Text>
        </>
      }
      wide
    >
      <Card aria-labelledby="seizoenen-kop">
        <Heading id="seizoenen-kop" level={2}>
          Per seizoen
        </Heading>
        <Text appearance="meta">{gapLegend}</Text>
        <DataTable
          appearance="text"
          caption="Wedstrijden met een gat per seizoen en per deel, het nieuwste seizoen bovenaan"
          columns={gapTableColumns('Seizoen')}
          rows={coverage.map((row) => {
            const counts = gaps.get(row.season)
            const complete = counts === undefined || gapColumns.every(({ key }) => counts.columns[key] === 0)
            const matchCount = plural(counts?.matches ?? 0, 'wedstrijd', 'wedstrijden')

            return {
              cells: gapColumns.map(({ key, name }) => {
                const total = counts?.columns[key] ?? 0

                return total === 0 ? null : (
                  <DataTable.Mark
                    description={`${total === 1 ? 'wedstrijd' : 'wedstrijden'} met een gat in ${name} in ${row.season}`}
                    href={seasonTablePath(row.season, key)}
                    key={key}
                  >
                    {String(total)}
                  </DataTable.Mark>
                )
              }),
              header: row.season,
              href: seasonTablePath(row.season),
              secondary: complete ? `${matchCount}, alles compleet` : matchCount,
            }
          })}
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
