import { Card, CardLink, DataTable, type DataTableRow, Heading, tableColumns, Text } from '@fansite/design-system'

import { fjouwerRulesAddress } from '#src/fans-paths'
import { type FourRanking, type RankedFour, rowOf, shownRows, topRows } from '#src/fans/fjouwer-ranking'

// The ranking of the game Fjouwer (issue 1473): the card with the top five on the page of the
// game, and the table of the page "Stand Fjouwer".

/** The address of the page with the whole ranking. */
export const standPath = '/fans/fjouwer/stand'

/** The legend under the table: what the short headers mean, and how a tie is settled. */
export const standLegend = 'W wedstrijden · P punten. Gelijk aantal punten? Dan delen jullie een plaats.'

const youNote = 'Jij'

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
    <Card aria-labelledby="stand-kop" game="fjouwer" surface="strong">
      <Heading id="stand-kop" level={2}>
        Stand
      </Heading>
      {visibleRows(ranking, supporterId, topRows, false).length === 0 ? (
        <Text>Nog geen stand dit seizoen.</Text>
      ) : (
        <DataTable
          caption={`Stand ${season}`}
          columns={['Fan', { ...tableColumns.points, key: true }]}
          rows={visibleRows(ranking, supporterId, topRows, false)}
          sortable={false}
        />
      )}
      <CardLink href={standPath}>Hele stand</CardLink>
    </Card>
  )
}

/** The table of the whole ranking, as far as `shownRows`, with its legend. */
export function StandTable({ ranking, supporterId }: { ranking: FourRanking; supporterId: number | undefined }) {
  return (
    <>
      <DataTable
        caption={standCaption(ranking.matchCount)}
        columns={['Fan', { abbreviation: 'W', name: 'wedstrijden' }, { ...tableColumns.points, key: true }]}
        rows={visibleRows(ranking, supporterId, shownRows, true)}
        sortable={false}
      />
      <Text appearance="meta">{standLegend}</Text>
      <CardLink href={fjouwerRulesAddress}>Spelregels</CardLink>
    </>
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
  const shown = ranking.rows.slice(0, limit)
  const own = rowOf(ranking, supporterId)
  const below = own !== undefined && !shown.includes(own)

  return [
    ...shown.map((row) => tableRow(row, supporterId, withFigures)),
    ...(below
      ? [
          { cells: withFigures ? ['', ''] : [''], gap: true, header: 'andere fans' },
          tableRow(own, supporterId, withFigures),
        ]
      : []),
  ] satisfies DataTableRow[]
}

function tableRow(row: RankedFour, supporterId: number | undefined, withFigures: boolean): DataTableRow {
  const own = row.supporterId === supporterId

  return {
    cells: withFigures ? [row.matches, row.total] : [row.total],
    header: row.screenName,
    position: row.place,
    ...(own ? { aside: youNote, highlight: true } : {}),
  }
}
