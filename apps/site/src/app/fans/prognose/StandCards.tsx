import { Card, DataTable, type DataTableRow, Heading, Link, Text } from '@fansite/design-system'

import { type RankedRow, type Ranking, rowOf, shownRows, topRows } from '#src/fans/prediction-ranking'
import { RulesLink } from '#src/fans/RulesLink'

// The ranking of the game Prognose (issue 1451): the card with the top five on the page of the
// game, and the table of the page "Stand Prognose".

/** The address of the page with the whole ranking. */
export const standPath = '/fans/prognose/stand'

/** The legend under the table: what the short headers mean, and how a tie is broken. */
export const standLegend =
  'V voorspellingen · Gem punten per voorspelling · P punten. Gelijk? Meer precieze eindstanden eerst.'

/** A number with a decimal comma: "12,3". */
export const decimalText = (value: number) => value.toFixed(1).replace('.', ',')

const youNote = 'Jij'

/**
 * The strong card "Stand" in the narrow column of the page of the game: the top five of the
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
    <Card aria-labelledby="stand-kop" game="prognose" surface="strong">
      <Heading id="stand-kop" level={2}>
        Stand
      </Heading>
      {ranking.rows.length === 0 ? (
        <Text>Nog geen stand dit seizoen.</Text>
      ) : (
        <DataTable
          caption={`Stand ${season}`}
          columns={['Fan', { abbreviation: 'P', key: true, name: 'totaal punten' }]}
          rows={visibleRows(ranking, supporterId, topRows, false)}
          sortable={false}
        />
      )}
      <Text>
        <Link href={standPath}>Hele stand</Link>
      </Text>
    </Card>
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
    <>
      <DataTable
        caption={caption}
        columns={[
          'Fan',
          { abbreviation: 'V', name: 'voorspellingen' },
          { abbreviation: 'Gem', name: 'gemiddelde punten per voorspelling' },
          { abbreviation: 'P', key: true, name: 'totaal punten' },
        ]}
        rows={visibleRows(ranking, supporterId, shownRows, true)}
        sortable={false}
      />
      <Text appearance="meta">{standLegend}</Text>
      <RulesLink />
    </>
  )
}

/**
 * The rows to show of a ranking: the first `limit`, and under them, set apart, the row of the
 * supporter when they stand lower, with their real place.
 */
export function visibleRows(ranking: Ranking, supporterId: number | undefined, limit: number, withFigures: boolean) {
  const shown = ranking.rows.slice(0, limit)
  const own = rowOf(ranking, supporterId)
  const below = own !== undefined && !shown.includes(own)

  return [
    ...shown.map((row) => tableRow(row, supporterId, withFigures)),
    ...(below
      ? [
          { cells: withFigures ? ['', '', ''] : [''], gap: true, header: 'andere fans' },
          tableRow(own, supporterId, withFigures),
        ]
      : []),
  ] satisfies DataTableRow[]
}

/** A row of the table: the place, the screen name and the figures. */
function tableRow(row: RankedRow, supporterId: number | undefined, withFigures: boolean): DataTableRow {
  const own = row.supporterId === supporterId

  return {
    cells: withFigures ? [row.count, decimalText(row.average), row.total] : [row.total],
    header: row.screenName,
    position: row.place,
    ...(own ? { aside: youNote, highlight: true } : {}),
  }
}
