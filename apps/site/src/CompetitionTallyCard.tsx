import { Card, DataTable, Heading, tableColumns, tableLegend, Text } from '@fansite/design-system'

import type { CompetitionTally } from './competitionTally'

import { searchHref } from './match-search'
import { nothing } from './match-search-start'
import { competitionTallyCard } from './matchShortcuts'

const numberFormat = new Intl.NumberFormat('nl-NL')

const figureColumns = [
  tableColumns.played,
  tableColumns.won,
  tableColumns.drawn,
  tableColumns.lost,
  { ...tableColumns.goals, note: 'voor–tegen' },
] as const
const columns = ['Competitie', ...figureColumns] as const
const legend = tableLegend(figureColumns)

/**
 * The card "Per competitie" of Cijfers for all seasons: a row for each kind of competition we
 * have a played match of (see `competitionTalliesOf`), with the matches, won, drawn and lost
 * and the goals for and against, the same columns as Seizoen voor seizoen. A row is a link to
 * the search of matches with that competition chosen. The card counts every competition
 * whatever the choice of the page, so it does not say so. A line under the table says that
 * Europa is every European cup and the play-offs for them. Without a match there is no card.
 */
export function CompetitionTallyCard({ level = 2, tallies }: { level?: 2 | 3; tallies: readonly CompetitionTally[] }) {
  if (tallies.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby={competitionTallyCard.id} surface="soft">
      <Heading anchor id={competitionTallyCard.id} level={level}>
        {competitionTallyCard.name}
      </Heading>
      <DataTable
        caption="De wedstrijden van sc Heerenveen per soort competitie, met de wedstrijden gewonnen, gelijk en verloren en de doelpunten voor en tegen"
        columns={columns}
        rows={tallies.map(({ drawn, goalsAgainst, goalsFor, label, lost, played, value, won }) => ({
          cells: [numberFormat.format(played), won, drawn, lost, `${goalsFor}–${goalsAgainst}`],
          header: label,
          href: searchHref({ ...nothing, competitions: [value] }),
        }))}
      />
      <Text appearance="meta">{legend}</Text>
      {tallies.some(({ value }) => value === 'europa') && (
        <Text appearance="meta">Europa telt elke Europese beker en de play-offs erom.</Text>
      )}
    </Card>
  )
}
