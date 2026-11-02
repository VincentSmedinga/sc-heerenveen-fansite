import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type RecordTableProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /**
   * The text of the table's caption, which names the table and says what it holds, such as
   * `De uitslagen van sc Heerenveen tegen Demo Boys, thuis, uit en in totaal`. Only a screen
   * reader gets it: the caption is not shown.
   */
  caption: string
  /** A record table has no children: everything it shows comes from the props below. */
  children?: never
  /** The rows of the table, in the order they are shown. */
  rows: RecordTableRow[]
  /**
   * The row with the sums, such as `Totaal`, under the other rows and in bold. It is a `tfoot`,
   * so a screen reader knows it is the total of the rows above.
   */
  total?: RecordTableRow
}

export type RecordTableRow = {
  /** The matches drawn. */
  drawn: number
  /** The goals for minus the goals against, negative when we scored fewer. */
  goalDifference: number
  /** The matches lost. */
  lost: number
  /** What the row is about, such as `Thuis`, `Uit` or `Totaal`. */
  name: string
  /** The matches played. */
  played: number
  /**
   * The points. The column of the points is there when every row, and the total, has them,
   * so a table of matches that give no points leaves them out.
   */
  points?: number | undefined
  /** The matches won. */
  won: number
}

type Column = {
  abbreviation: string
  /** The class of the figures: the colour of the result, or the weight of the points. */
  figureClass?: string
  /** What the column is, for the key of its cells. */
  id: 'drawn' | 'goalDifference' | 'lost' | 'played' | 'points' | 'won'
  name: string
}

const columns: Column[] = [
  { abbreviation: 'G', id: 'played', name: 'gespeeld' },
  { abbreviation: 'W', figureClass: 'hf-match-win', id: 'won', name: 'gewonnen' },
  { abbreviation: 'L', figureClass: 'hf-match-draw', id: 'drawn', name: 'gelijk' },
  { abbreviation: 'V', figureClass: 'hf-match-loss', id: 'lost', name: 'verloren' },
  { abbreviation: 'P', figureClass: 'hf-bar-value', id: 'points', name: 'punten' },
  { abbreviation: 'D', id: 'goalDifference', name: 'doelsaldo' },
]

/** A goal difference with its sign: `+6`, `−2` (a real minus sign) or `0`. */
const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : String(value))

/**
 * The record of sc Heerenveen against one opponent: a real `table` with a row for each part
 * (at home and away) and a column for each figure, and under them the row with the total. It
 * has the look of the table of `StandingsTable`, with a caption that is not shown, column
 * headers with `scope`, a row header for each row, and under the table the full words of the
 * abbreviations, as "G gespeeld, W gewonnen, …". A screen reader hears the full word, not the
 * letter. The wins, draws and losses have the colours of the results (green, grey and red), as
 * in `ShortMatch`; the words in the header say what they are, so the colour is not alone. The
 * points and the total row are bold.
 *
 * It is a form of its own next to `StandingsTable` and not a general version of it: a standings
 * table has a place, a club and points, with a bar, and this one has none of them. The two
 * share the look of the table (base/table.css) and of the legend and the place (bar/bar.css),
 * so they match without sharing code.
 */
export const RecordTable = ({ caption, className, rows, total, ...props }: RecordTableProps) => {
  const withPoints = [...rows, ...(total ? [total] : [])].every((row) => row.points !== undefined)
  const shown = columns.filter((column) => column.id !== 'points' || withPoints)

  const cells = (row: RecordTableRow) =>
    shown.map((column) => (
      <td className={classNames('hf-numeric', column.figureClass)} key={column.id}>
        {column.id === 'goalDifference' ? signed(row.goalDifference) : row[column.id]}
      </td>
    ))

  return (
    <div {...props} className={classNames('hf-record-table hf-bar-place', className)}>
      <table className="hf-bar-table">
        <caption className="hf-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="hf-visually-hidden">Onderdeel</span>
            </th>
            {shown.map((column) => (
              <th className="hf-numeric" key={column.id} scope="col">
                <abbr title={capitalise(column.name)}>
                  <span aria-hidden="true">{column.abbreviation}</span>
                  <span className="hf-visually-hidden">{column.name}</span>
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              {cells(row)}
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr>
              <th scope="row">{total.name}</th>
              {cells(total)}
            </tr>
          </tfoot>
        )}
      </table>
      <p className="hf-meta hf-bar-legend">
        {shown.map((column, index) => (
          <span key={column.id}>
            {index > 0 ? ', ' : ''}
            <b>{column.abbreviation}</b> {column.name}
          </span>
        ))}
      </p>
    </div>
  )
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
