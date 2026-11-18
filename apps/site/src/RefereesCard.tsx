import { Card, DataTable, Heading, tableColumns, tableLegend, Text } from '@fansite/design-system'

import { DataLine, incompleteMatches } from './DataLine'
import { refereesCard } from './matchShortcuts'
import { textSortName } from './player-name'
import { pointsPerMatchOf, type RefereeRow } from './referees'
import { figureCell } from './table-values'

const numberFormat = new Intl.NumberFormat('nl-NL')
const pointsFormat = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2, minimumFractionDigits: 2 })

const figureColumns = [
  tableColumns.played,
  tableColumns.won,
  tableColumns.drawn,
  tableColumns.lost,
  { ...tableColumns.pointsPerMatch, key: true },
] as const
const columns = ['Scheidsrechter', ...figureColumns] as const
const legend = tableLegend(figureColumns)

/**
 * The card "Scheidsrechters" of Cijfers: a table with a row for each referee, the one with the
 * most points per match first, with the matches and how many sc Heerenveen won, drew and lost
 * under him, in the same columns as Seizoen voor seizoen, plus the points per match (P). The
 * name is text: a referee has no page of his own (a link to his matches comes with #1227). A
 * line under the table says how many of the played matches have a referee in our data, and,
 * for all seasons (`top`), that the table is the top of all `referees`. Without a match that
 * has a referee there is no card (#1214).
 */
export function RefereesCard({
  known,
  level = 2,
  played,
  referees,
  rows,
  top = false,
}: {
  known: number
  level?: 2 | 3
  played: number
  referees: number
  rows: readonly RefereeRow[]
  top?: boolean
}) {
  if (rows.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby={refereesCard.id} surface="soft">
      <Heading anchor id={refereesCard.id} level={level}>
        {refereesCard.name}
      </Heading>
      <DataTable
        caption="Onder welke scheidsrechter sc Heerenveen hoeveel wedstrijden speelde, met de wedstrijden gewonnen, gelijk en verloren, en de punten per wedstrijd"
        columns={columns}
        rows={rows.map((row) => ({
          cells: [
            row.played,
            row.won,
            row.drawn,
            row.lost,
            figureCell(pointsPerMatchOf(row), pointsFormat.format(pointsPerMatchOf(row))),
          ],
          header: row.name,
          sortHeader: textSortName(row.name),
        }))}
      />
      <Text appearance="meta">{legend}</Text>
      {top && (
        <Text appearance="meta">{`${numberFormat.format(referees)} scheidsrechters, de top 5 op punten per wedstrijd.`}</Text>
      )}
      <DataLine limits={[incompleteMatches(known, played)]} />
    </Card>
  )
}
