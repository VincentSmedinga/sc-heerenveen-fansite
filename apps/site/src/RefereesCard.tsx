import { Card, DataTable, Heading, tableColumns, tableLegend, Text } from '@fansite/design-system'

import { basisOf } from './matchBasis'
import { refereesCard } from './matchShortcuts'
import { type RefereeRow } from './referees'

const numberFormat = new Intl.NumberFormat('nl-NL')

const figureColumns = [tableColumns.played, tableColumns.won, tableColumns.drawn, tableColumns.lost] as const
const columns = ['Scheidsrechter', ...figureColumns] as const
const legend = tableLegend(figureColumns)

/**
 * The card "Scheidsrechters" of Cijfers: a table with a row for each referee, the one with the
 * most matches first, with the matches and how many sc Heerenveen won, drew and lost under him,
 * in the same columns as Seizoen voor seizoen. The name is text: a referee has no page of his
 * own (a link to his matches comes with #1227). A line under the table says how many of the
 * played matches have a referee in our data, and, for all seasons (`top`), that the table is
 * the top of all `referees`. Without a match that has a referee there is no card (#1214).
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
        caption="Onder welke scheidsrechter sc Heerenveen hoeveel wedstrijden speelde, met de wedstrijden gewonnen, gelijk en verloren"
        columns={columns}
        rows={rows.map(({ drawn, lost, name, played: matches, won }) => ({
          cells: [numberFormat.format(matches), won, drawn, lost],
          header: name,
        }))}
      />
      <Text appearance="meta">{legend}</Text>
      {top && (
        <Text appearance="meta">{`${numberFormat.format(referees)} scheidsrechters, de top 5 op aantal wedstrijden.`}</Text>
      )}
      <Text appearance="meta">{basisOf(known, played)}</Text>
    </Card>
  )
}
