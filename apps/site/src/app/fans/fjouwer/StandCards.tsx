import { CardLink, tableColumns, tableLegend } from '@fansite/design-system'

import { fjouwerRulesAddress } from '#src/fans-paths'
import { type FourRanking, rowOf, shownRows, topRows } from '#src/fans/fjouwer-ranking'
import { StandCard as GameStandCard, StandTable as GameStandTable, rankingRows } from '#src/fans/GameCards'

// The ranking of the game Fjouwer (issue 1473): the card with the top five on the page of the
// game, and the table of the page "Stand Fjouwer".

/** The address of the page with the whole ranking. */
export const standPath = '/fans/fjouwer/stand'

/** The legend under the table: what the short headers mean, and how a tie is settled. */
export const standLegend = (
  <>W wedstrijden · {tableLegend([tableColumns.points])}. Gelijk aantal punten? Dan delen jullie een plaats.</>
)

/** The caption of the table: how many matches the ranking counts. */
export const standCaption = (matchCount: number) =>
  `Stand na ${matchCount === 1 ? '1 wedstrijd' : `${matchCount} wedstrijden`}`

/**
 * The strong card "Stand" in the narrow column of the page of the game: the top five of the
 * season with their points, the row of the fan marked, and the link to the whole ranking.
 */
export function StandCard({
  ranking,
  season,
  supporterId,
}: {
  ranking: FourRanking
  season: string
  supporterId: number | undefined
}) {
  return (
    <GameStandCard
      game="fjouwer"
      href={standPath}
      rows={visibleRows(ranking, supporterId, topRows, false)}
      season={season}
    />
  )
}

/** The table of the whole ranking, as far as `shownRows`, with its legend. */
export function StandTable({ ranking, supporterId }: { ranking: FourRanking; supporterId: number | undefined }) {
  return (
    <GameStandTable
      caption={standCaption(ranking.matchCount)}
      columns={[
        { abbreviation: 'W', name: 'wedstrijden' },
        { ...tableColumns.points, key: true },
      ]}
      legend={standLegend}
      rows={visibleRows(ranking, supporterId, shownRows, true)}
    >
      <CardLink href={fjouwerRulesAddress}>Spelregels</CardLink>
    </GameStandTable>
  )
}

/**
 * The rows to show of a ranking: the first `limit`, and under them, set apart, the row of the
 * fan when they stand lower or have left their name out, with their real place.
 */
export function visibleRows(
  ranking: FourRanking,
  supporterId: number | undefined,
  limit: number,
  withFigures: boolean,
) {
  return rankingRows({
    figures: (row) => (withFigures ? [row.matches, row.total] : [row.total]),
    limit,
    own: rowOf(ranking, supporterId),
    rows: ranking.rows,
    supporterId,
  })
}
