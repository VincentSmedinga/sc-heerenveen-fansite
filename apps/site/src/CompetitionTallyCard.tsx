import { Card, DataTable, Heading, tableColumns, tableLegend, Text } from '@fansite/design-system'

import type { MatchLink } from './cijfers-search'
import type { CompetitionTally } from './competitionTally'
import type { CompetitionValue } from './match-search'

import { searchHref } from './match-search'
import { nothing } from './match-search-start'
import { rowLinkText } from './MatchSearchLink'
import { competitionTallyCard } from './matchShortcuts'
import { scoreCell } from './table-values'

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
 * Play-offs is the play-offs for European football. Every European cup has a row of its own,
 * and there is no row Europa (#1354). Without a match there is no card.
 */
export function CompetitionTallyCard({
  level = 2,
  matchLink,
  tallies,
}: {
  level?: 2 | 3
  /** The link to the matches of a competition, with their number, as the search shows them. */
  matchLink?: (value: CompetitionValue) => MatchLink | undefined
  tallies: readonly CompetitionTally[]
}) {
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
        legend={legend}
        rows={tallies.map(({ drawn, goalsAgainst, goalsFor, label, lost, played, value, won }) => {
          const link = matchLink?.(value)

          return {
            cells: [played, won, drawn, lost, scoreCell(goalsFor, goalsAgainst)],
            header: label,
            href: link?.href ?? searchHref({ ...nothing, competitions: [value] }),
            ...(link === undefined ? {} : { display: rowLinkText(label, link, `in ${label}`) }),
          }
        })}
      />
      {tallies.some(({ value }) => value === 'play-offs') && (
        <Text appearance="meta">De play-offs zijn de wedstrijden tegen Nederlandse clubs om een plek in Europa.</Text>
      )}
    </Card>
  )
}
