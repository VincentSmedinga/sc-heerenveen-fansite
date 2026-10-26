import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** The name of our own club, whose row stands out. */
const ourClub = 'sc Heerenveen'

export type StandingsTableProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /**
   * The text of the table's caption, which names the table and says what day it holds for, such
   * as `Stand op 18 oktober 2026`. Only a screen reader gets it: the caption is not shown.
   */
  caption: string
  /** A standings table has no children: everything it shows comes from the props below. */
  children?: never
  /**
   * `all` (default) has every column and scrolls sideways inside its own area when it is wider
   * than the space. `compact` leaves out the columns for won, drawn and lost, and
   * fits a narrow column without scrolling.
   */
  columns?: 'all' | 'compact'
  /**
   * The name of the area that scrolls, which a screen reader reads when it reaches the area,
   * such as `De volledige stand`. It is only used with `all`.
   */
  label: string
  /** The rows of the table, from the first place down. */
  rows: StandingsTableRow[]
}

export type StandingsTableRow = {
  /** The club, as plain text. */
  club: string
  /** The matches drawn. */
  drawn: number
  /** The goals for minus the goals against, as one number. It can be negative. */
  goalDifference: number
  /** The matches lost. */
  lost: number
  /** The matches played. */
  played: number
  /** The points. */
  points: number
  /** The place in the table, from 1. */
  position: number
  /** The matches won. */
  won: number
}

type Column = {
  abbreviation: string
  compact: boolean
  /** What the column is, for the key of its cells. Two columns can share an abbreviation. */
  id: string
  name: string
  value: (row: StandingsTableRow) => number | string
}

const numberFormat = new Intl.NumberFormat('nl-NL')

/** The goal difference: a plus for a positive one, a real minus sign for a negative one. */
const formatDifference = (difference: number) =>
  difference > 0 ? `+${numberFormat.format(difference)}` : difference < 0 ? `−${numberFormat.format(-difference)}` : '0'

const columns: Column[] = [
  { abbreviation: 'G', compact: true, id: 'played', name: 'gespeeld', value: (row) => row.played },
  { abbreviation: 'W', compact: false, id: 'won', name: 'gewonnen', value: (row) => row.won },
  { abbreviation: 'G', compact: false, id: 'drawn', name: 'gelijk', value: (row) => row.drawn },
  { abbreviation: 'V', compact: false, id: 'lost', name: 'verloren', value: (row) => row.lost },
  {
    abbreviation: 'D',
    compact: true,
    id: 'goalDifference',
    name: 'doelsaldo',
    value: (row) => formatDifference(row.goalDifference),
  },
  { abbreviation: 'P', compact: true, id: 'points', name: 'punten', value: (row) => row.points },
]

/**
 * The league table: a real `table` with a caption that is not shown, column headers with
 * `scope` and a row header for each club. The headers are abbreviations. In the full table the
 * full words stand under it as well, as "G gespeeld, W gewonnen, …", because a title on an
 * abbreviation only shows under a mouse. A screen reader hears the full word, not the letter,
 * so the two columns that are a G are told apart. The row of sc Heerenveen is bold, has a bar
 * on its start side and says so for a screen reader, so it stands out by more than colour.
 *
 * With every column the table is wider than a phone. It then sits in an area of its own that
 * scrolls sideways, has the name `label` and can be reached with the keyboard, so the page
 * itself never scrolls sideways. In `compact` the columns of won, drawn and lost are
 * left out, nothing scrolls and there is no legend. standings-table.css gives it its look.
 */
export const StandingsTable = ({
  caption,
  className,
  columns: set = 'all',
  label,
  rows,
  ...props
}: StandingsTableProps) => {
  const shown = columns.filter((column) => set === 'all' || column.compact)
  const table = (
    <table className="hf-standings-table">
      <caption className="hf-visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <th className="hf-numeric" scope="col">
            <abbr title="Positie">
              <span aria-hidden="true">#</span>
              <span className="hf-visually-hidden">positie</span>
            </abbr>
          </th>
          <th scope="col">Club</th>
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
          <tr className={row.club === ourClub ? 'hf-highlight hf-standings-table-own' : undefined} key={row.position}>
            <td className="hf-numeric hf-rank">{row.position}</td>
            <th scope="row">
              {row.club}
              {row.club === ourClub ? <span className="hf-visually-hidden"> (onze club)</span> : null}
            </th>
            {shown.map((column) => (
              <td className={classNames('hf-numeric', column.id === 'points' && 'hf-standings-points')} key={column.id}>
                {column.value(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div {...props} className={classNames('hf-standings', className)}>
      {set === 'all' ? (
        // The area scrolls sideways when the table is wider than the space. It has a name and
        // can be focused, so someone without a mouse can scroll it with the arrow keys.
        <div aria-label={label} className="hf-standings-scroll" role="region" tabIndex={0}>
          {table}
        </div>
      ) : (
        table
      )}
      {set === 'all' && (
        <p className="hf-meta hf-standings-legend">
          {shown.map((column, index) => (
            <span key={column.id}>
              {index > 0 ? ', ' : ''}
              <b>{column.abbreviation}</b> {column.name}
            </span>
          ))}
        </p>
      )}
    </div>
  )
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
