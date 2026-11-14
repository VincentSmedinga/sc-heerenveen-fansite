import { Card, DataTable, Heading, tableColumns, tableLegend, Text } from '@fansite/design-system'

import { type FormationRow } from './formations'

const numberFormat = new Intl.NumberFormat('nl-NL')

const columns = ['Formatie', tableColumns.played, 'Resultaat'] as const

/**
 * The line under the table: the sentence on how many matches it counts, as every card with a
 * count of its own says it ("Op basis van 12 van de 14 gespeelde wedstrijden."), and the
 * legend of the two short columns.
 */
const basisOf = (known: number, played: number) =>
  known === played
    ? `Op basis van ${played === 1 ? 'de gespeelde wedstrijd' : `alle ${numberFormat.format(played)} gespeelde wedstrijden`}.`
    : `Op basis van ${numberFormat.format(known)} van de ${numberFormat.format(played)} gespeelde wedstrijden.`

/**
 * The card "Formaties" of Cijfers for a season: a table with a row for each formation we played
 * in, the one with the most matches first, with the number of matches and how they ended
 * (won–drawn–lost, as in "6–3–2"). It counts the played matches of the choice of competition
 * that have a finished report with a formation, and says how many that is of all the played
 * matches. Without a match that has a formation there is no card (#1216), so a season
 * without finished reports does not have it.
 */
export function FormationsCard({
  known,
  level = 2,
  played,
  rows,
}: {
  known: number
  level?: 2 | 3
  played: number
  rows: readonly FormationRow[]
}) {
  if (rows.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby="formaties" surface="soft">
      <Heading anchor id="formaties" level={level}>
        Formaties
      </Heading>
      <DataTable
        caption="Hoe vaak sc Heerenveen met welke formatie speelde, en hoe die wedstrijden eindigden"
        columns={columns}
        rows={rows.map(({ drawn, formation, lost, played: matches, won }) => ({
          cells: [matches, `${won}–${drawn}–${lost}`],
          header: formation,
        }))}
      />
      <Text appearance="meta">{`${tableLegend([tableColumns.played])}. Resultaat: gewonnen–gelijk–verloren.`}</Text>
      <Text appearance="meta">{basisOf(known, played)}</Text>
    </Card>
  )
}
