import { tableColumns, tableLegend } from '@fansite/design-system'

import { StandCard as GameStandCard, StandTable as GameStandTable, rankingRows } from '#src/fans/GameCards'
import { type Ranking, rowOf, shownRows, topRows } from '#src/fans/prediction-ranking'
import { RulesLink } from '#src/fans/RulesLink'

// The ranking of the game Prognose (issue 1451): the card with the top five on the page of the
// game, and the table of the page "Stand Prognose".

/** The address of the page with the whole ranking. */
export const standPath = '/fans/prognose/stand'

/** The legend under the table: what the short headers mean, and how a tie is broken. */
export const standLegend = (
  <>
    V voorspellingen · Gem punten per voorspelling · {tableLegend([tableColumns.points])}. Gelijk? Meer precieze
    eindstanden eerst.
  </>
)

/** A number with a decimal comma: "12,3". */
export const decimalText = (value: number) => value.toFixed(1).replace('.', ',')

/**
 * The card "Stand" in the narrow column of the page of the game: the top five of the
 * season with their points, the row of the supporter marked, and the link to the whole ranking.
 */
export function StandCard({
  ranking,
  season,
  supporterId,
}: {
  ranking: Ranking
  season: string
  supporterId: number | undefined
}) {
  return (
    <GameStandCard
      game="prognose"
      href={standPath}
      rows={visibleRows(ranking, supporterId, topRows, false)}
      season={season}
    />
  )
}

/** The table of the whole ranking, as far as `shownRows`. */
export function StandTable({
  caption,
  ranking,
  supporterId,
}: {
  caption: string
  ranking: Ranking
  supporterId: number | undefined
}) {
  return (
    <GameStandTable
      caption={caption}
      columns={[
        { abbreviation: 'V', name: 'voorspellingen' },
        { abbreviation: 'Gem', name: 'gemiddelde punten per voorspelling' },
        { ...tableColumns.points, key: true },
      ]}
      legend={standLegend}
      rows={visibleRows(ranking, supporterId, shownRows, true)}
    >
      <RulesLink />
    </GameStandTable>
  )
}

/**
 * The rows to show of a ranking: the first `limit`, and under them, set apart, the row of the
 * supporter when they stand lower, with their real place.
 */
export function visibleRows(ranking: Ranking, supporterId: number | undefined, limit: number, withFigures: boolean) {
  return rankingRows({
    figures: (row) => (withFigures ? [row.count, decimalText(row.average), row.total] : [row.total]),
    limit,
    own: rowOf(ranking, supporterId),
    rows: ranking.rows,
    supporterId,
  })
}
