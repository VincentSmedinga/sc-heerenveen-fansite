import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type RecordTableProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /**
   * The text of the table's caption, which names the table and says what it holds, such as
   * `De uitslagen van sc Heerenveen tegen Demo Boys, in totaal, thuis en uit`. Only a screen
   * reader gets it: the caption is not shown.
   */
  caption: string
  /** A record table has no children: everything it shows comes from the props below. */
  children?: never
  /** The rows of the table, in the order they are shown. */
  rows: RecordTableRow[]
}

export type RecordTableRow = {
  /** The matches drawn. */
  drawn: number
  /** The goals scored against the opponent. */
  goalsAgainst: number
  /** The goals scored for sc Heerenveen. */
  goalsFor: number
  /** The matches lost. */
  lost: number
  /** What the row is about, such as `Totaal`, `Thuis` or `Uit`. */
  name: string
  /** The matches played. */
  played: number
  /** The matches won. */
  won: number
}

type Column = {
  abbreviation: string
  /** What the column is, for the key of its cells. */
  id: keyof Omit<RecordTableRow, 'name'>
  name: string
}

const columns: Column[] = [
  { abbreviation: 'G', id: 'played', name: 'gespeeld' },
  { abbreviation: 'W', id: 'won', name: 'gewonnen' },
  { abbreviation: 'GL', id: 'drawn', name: 'gelijk' },
  { abbreviation: 'V', id: 'lost', name: 'verloren' },
  { abbreviation: 'DV', id: 'goalsFor', name: 'doelpunten voor' },
  { abbreviation: 'DT', id: 'goalsAgainst', name: 'doelpunten tegen' },
]

/**
 * The record of sc Heerenveen against one opponent: a real `table` with a row for each part
 * (the total, at home and away) and a column for each figure. It has the look of the table of
 * `StandingsTable`, with a caption that is not shown, column headers with `scope`, a row header
 * for each row, and under the table the full words of the abbreviations, as "G gespeeld, W
 * gewonnen, …". A screen reader hears the full word, not the letter.
 *
 * It is a form of its own next to `StandingsTable` and not a general version of it: a standings
 * table has a place, a club and points, with a bar, and this one has none of them. The two
 * share the look of the table (base/table.css) and of the legend and the place (bar/bar.css),
 * so they match without sharing code.
 */
export const RecordTable = ({ caption, className, rows, ...props }: RecordTableProps) => (
  <div {...props} className={classNames('hf-record-table hf-bar-place', className)}>
    <table className="hf-bar-table">
      <caption className="hf-visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">
            <span className="hf-visually-hidden">Onderdeel</span>
          </th>
          {columns.map((column) => (
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
            {columns.map((column) => (
              <td className="hf-numeric" key={column.id}>
                {row[column.id]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <p className="hf-meta hf-bar-legend">
      {columns.map((column, index) => (
        <span key={column.id}>
          {index > 0 ? ', ' : ''}
          <b>{column.abbreviation}</b> {column.name}
        </span>
      ))}
    </p>
  </div>
)

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
