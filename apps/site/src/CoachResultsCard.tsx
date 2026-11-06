import { Card, DataTable, Heading, PlayerName, tableColumns, tableLegend, Text } from '@fansite/design-system'

import type { CompetitionChoice } from './competition'

import { type CoachResult } from './coachResults'
import { coachResultsCard } from './matchShortcuts'
import { BasedOnSince } from './OpponentViews'
import { splitStaffName } from './player-name'

/** The columns of the figures, in order, with the points per match as the key figure. */
const figureColumns = [
  tableColumns.played,
  tableColumns.won,
  tableColumns.drawn,
  tableColumns.lost,
  { ...tableColumns.pointsPerMatch, key: true },
] as const

const legend = tableLegend(figureColumns)

/**
 * The plain text of the row: the name and the period. It is the key of the row, so two periods
 * of one person have different ones.
 */
const headerOf = ({ name, period }: CoachResult) => `${name}, ${period}`

/** The line under the name: the period, with "interim" in front where the coach stood in. */
const periodLineOf = ({ interim, period }: CoachResult) => (interim ? `interim \u00b7 ${period}` : period)

/**
 * The card "Resultaten per hoofdtrainer" of Cijfers: a table with a row for each head coach who
 * has a played match in our data, the newest first, with the matches he played, won, drew and
 * lost, and the points per match. The row header is the name (`PlayerName`, the surname in the
 * stronger weight) with his period on a line of its own under it (see `periodLineOf`). The card
 * follows the switch between all the matches and the Eredivisie (see `coachResultsOf`) and, as
 * a long table, has no button for an image. `since` is the season from which we have matches.
 * Without a coach with a match there is no card.
 */
export function CoachResultsCard({
  choice,
  results,
  since,
}: {
  choice: CompetitionChoice
  results: readonly CoachResult[]
  since: string
}) {
  if (results.length === 0) {
    return null
  }

  const played = results.reduce((sum, result) => sum + result.played, 0)

  return (
    <Card aria-labelledby={coachResultsCard.id} surface="soft">
      <Heading anchor id={coachResultsCard.id} level={2}>
        {coachResultsCard.name}
      </Heading>
      <DataTable
        caption={`De resultaten van sc Heerenveen per hoofdtrainer, de nieuwste eerst${choice === 'league' ? ', in de Eredivisie' : ''}`}
        columns={['Hoofdtrainer', ...figureColumns]}
        rows={results.map((result) => ({
          cells: [result.played, result.won, result.drawn, result.lost, result.pointsPerMatch],
          display: <PlayerName {...splitStaffName(result.name)} />,
          header: headerOf(result),
          secondary: periodLineOf(result),
        }))}
      />
      <Text appearance="meta">{legend}</Text>
      <BasedOnSince choice={choice} played={played} since={since} />
    </Card>
  )
}
