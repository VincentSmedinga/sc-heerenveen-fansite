import { DataTable, type DataTableRow, tableColumns, tableLegend } from '@fansite/design-system'

import { decimalText } from '#src/app/fans/prognose/StandCards'
import { type RankedQuiz, shownRows } from '#src/fans/fantest-ranking'

// The two tables of the ranking of the Fantest (issue 1483).

const youNote = 'Jij'

const tie = 'Gelijk aantal punten? Dan delen jullie een plaats.'

/** The table of one month: the score of everybody. */
export function MonthTable({
  caption,
  rows,
  supporterId,
}: {
  caption: string
  rows: readonly RankedQuiz[]
  supporterId: number | undefined
}) {
  return (
    <DataTable
      caption={caption}
      columns={['Fan', { ...tableColumns.points, key: true }]}
      legend={
        <>
          {tableLegend([tableColumns.points])}. {tie}
        </>
      }
      rows={visibleRows(rows, supporterId, (row) => [row.total])}
      sortable={false}
    />
  )
}

/** The table of a calendar year: the points, the number of quizzes and the average. */
export function YearTable({
  caption,
  rows,
  supporterId,
}: {
  caption: string
  rows: readonly RankedQuiz[]
  supporterId: number | undefined
}) {
  return (
    <DataTable
      caption={caption}
      columns={[
        'Fan',
        { abbreviation: 'Q', name: 'quizzen' },
        { abbreviation: 'Gem', name: 'gemiddelde punten per quiz' },
        { ...tableColumns.points, key: true },
      ]}
      legend={
        <>
          Q quizzen · Gem punten per quiz · {tableLegend([tableColumns.points])}. {tie}
        </>
      }
      rows={visibleRows(rows, supporterId, (row) => [row.quizzes, decimalText(row.average), row.total])}
      sortable={false}
    />
  )
}

/**
 * The first rows of a ranking, and under them, set apart, the row of the supporter when they
 * stand lower, with their real place. The own row is marked and says "Jij".
 */
function visibleRows(
  rows: readonly RankedQuiz[],
  supporterId: number | undefined,
  cellsOf: (row: RankedQuiz) => (number | string)[],
): DataTableRow[] {
  const shown = rows.slice(0, shownRows)
  const own = rows.find((row) => row.supporterId === supporterId)
  const tableRow = (row: RankedQuiz): DataTableRow => ({
    cells: cellsOf(row),
    header: row.screenName,
    position: row.place,
    ...(row.supporterId === supporterId ? { aside: youNote, highlight: true } : {}),
  })

  return [
    ...shown.map(tableRow),
    ...(own !== undefined && !shown.includes(own)
      ? [{ cells: cellsOf(own).map(() => ''), gap: true, header: 'andere fans' }, tableRow(own)]
      : []),
  ]
}
