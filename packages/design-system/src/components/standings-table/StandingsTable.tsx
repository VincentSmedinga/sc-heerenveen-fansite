import type { ComponentPropsWithoutRef, CSSProperties } from 'react'

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
   * `all` (default) is the full table: a bar next to the points, which goes
   * when the place is too narrow, and the full words of the abbreviations under the table.
   * `compact` has neither, and fits a narrow column such as the sidebar of the homepage.
   */
  columns?: 'all' | 'compact'
  /** The rows of the table, from the first place down. */
  rows: StandingsTableRow[]
}

export type StandingsTableRow = {
  /** The club, as plain text. */
  club: string
  /** The matches played. */
  played: number
  /** The points. */
  points: number
  /** The place in the table, from 1. */
  position: number
}

type Column = {
  abbreviation: string
  /** What the column is, for the key of its cells. */
  id: string
  name: string
  value: (row: StandingsTableRow) => number | string
}

const columns: Column[] = [
  { abbreviation: 'G', id: 'played', name: 'gespeeld', value: (row) => row.played },
  { abbreviation: 'P', id: 'points', name: 'punten', value: (row) => row.points },
]

/**
 * The points of a club as a share of the points of the leader, in percent from 0 to 100, so a
 * bar from zero shows the real proportion. The leader is the club with the most points, which
 * is not always the first row. Nobody has points: no share, so the table has no bars.
 */
export function pointsShares(rows: StandingsTableRow[]): null | number[] {
  const leader = Math.max(0, ...rows.map((row) => row.points))

  return leader === 0
    ? null
    : rows.map((row) => Math.round(Math.min(100, Math.max(0, (row.points / leader) * 100)) * 100) / 100)
}

/**
 * The league table: a real `table` with a caption that is not shown, column headers with
 * `scope` and a row header for each club. The headers are abbreviations. In the full table the
 * full words stand under it as well, as "G gespeeld, P punten, …", because a title on an
 * abbreviation only shows under a mouse. A screen reader hears the full word, not the letter.
 * The row of sc Heerenveen is bold, has a bar on its start side and says so for a screen
 * reader, so it stands out by more than colour.
 *
 * The full table has a bar at the end of each row, next to the points and in their
 * cell, as long as the points are compared to those of the leader. The bar is decoration: it
 * is hidden from a screen reader, which reads the numbers only. It goes when the place of the
 * table is too narrow, chosen with a container query. standings-table.css gives the look.
 */
export const StandingsTable = ({ caption, className, columns: set = 'all', rows, ...props }: StandingsTableProps) => {
  const shares = set === 'all' ? pointsShares(rows) : null

  return (
    <div {...props} className={classNames('hf-standings', className)}>
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
            {columns.map((column) => (
              <th
                className={classNames('hf-numeric', column.id === 'points' && shares !== null && 'hf-standings-bars')}
                key={column.id}
                scope="col"
              >
                <abbr title={capitalise(column.name)}>
                  <span aria-hidden="true">{column.abbreviation}</span>
                  <span className="hf-visually-hidden">{column.name}</span>
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr className={row.club === ourClub ? 'hf-highlight hf-standings-table-own' : undefined} key={row.position}>
              <td className="hf-numeric hf-rank">{row.position}</td>
              <th scope="row">
                {row.club}
                {row.club === ourClub ? <span className="hf-visually-hidden"> (onze club)</span> : null}
              </th>
              {columns.map((column) => (
                <td
                  className={classNames('hf-numeric', column.id === 'points' && 'hf-standings-points')}
                  key={column.id}
                >
                  {column.value(row)}
                  {column.id === 'points' && shares !== null ? (
                    <span
                      aria-hidden="true"
                      className="hf-standings-bar"
                      style={{ '--hf-points-share': shares[index] } as CSSProperties}
                    />
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {set === 'all' && (
        <p className="hf-meta hf-standings-legend">
          {columns.map((column, index) => (
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
