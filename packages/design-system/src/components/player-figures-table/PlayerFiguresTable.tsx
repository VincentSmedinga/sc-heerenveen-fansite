import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { PlayerName } from '../player-name/PlayerName'
import { tableColumns, tableLegend } from '../table-columns'

export type PlayerFiguresRow = {
  /** The assists: the goals he gave. */
  assists: number
  /** The given name of the player, in the normal weight. Leave it out when it is not known. */
  givenName?: string | undefined
  /** The goals he scored, without own goals. */
  goals: number
  /** What tells the player from the others, such as his id: it is the key of the row. */
  id: number | string
  /** The minutes he played. */
  minutes: number
  /** The matches he was in, also as a substitute. */
  played: number
  /** The red cards, and the yellow-red cards. */
  red: number
  /** The times he was in the line-up. */
  started: number
  /** The times he came on. */
  substituted: number
  /** The surname of the player, in the stronger weight (see `PlayerName`). */
  surname: string
  /** The yellow cards, and the yellow-red cards. */
  yellow: number
}

export type PlayerFiguresTableProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /**
   * The text of the table's caption, which names the table and says which season and which
   * competitions it counts, such as `Alle spelers in de verslagen van sc Heerenveen in het
   * seizoen 2026/27`. Only a screen reader gets it: the caption is not shown.
   */
  caption: string
  /** A table of the figures of the players has no children: everything comes from the props. */
  children?: never
  /** The players, in the order they are shown: the page orders them. */
  rows: PlayerFiguresRow[]
}

/** The columns of the figures, in the order they are shown. */
const columns = [
  { column: tableColumns.played, id: 'played' },
  { column: tableColumns.started, id: 'started' },
  { column: tableColumns.substituted, id: 'substituted' },
  { column: tableColumns.minutes, id: 'minutes' },
  { column: tableColumns.goals, id: 'goals' },
  { column: tableColumns.assists, id: 'assists' },
  { column: tableColumns.yellow, id: 'yellow' },
  { column: tableColumns.red, id: 'red' },
] as const

/**
 * The figures of every player of the match reports: a real `table` with a caption that is not
 * shown, column headers with `scope` and a row header for each player, whose name is a
 * `PlayerName`. The columns are the matches, the line-ups, the times he came on, the minutes,
 * the goals, the assists and the yellow and red cards, each with the letter of `tableColumns`
 * in the header, which a screen reader reads as the whole word. The minutes are bold, because
 * the page orders the list by them: they are the key figure of the table. Under the table
 * stand the letters with their words, and that a yellow-red card counts as a yellow and a red
 * card.
 * The table has no bars: it is for looking a player up, and its columns keep close together so
 * it fits a phone. player-figures.css gives the look.
 */
export const PlayerFiguresTable = ({ caption, className, rows, ...props }: PlayerFiguresTableProps) => (
  <div {...props} className={classNames('hf-player-figures hf-bar-place', className)}>
    <table className="hf-bar-table">
      <caption className="hf-visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Speler</th>
          {columns.map(({ column, id }) => (
            <th className="hf-numeric" key={id} scope="col">
              <abbr title={`${column.name.charAt(0).toUpperCase()}${column.name.slice(1)}`}>
                <span aria-hidden="true">{column.abbreviation}</span>
                <span className="hf-visually-hidden">{column.name}</span>
              </abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <th scope="row">
              <PlayerName givenName={row.givenName} surname={row.surname} />
            </th>
            {columns.map(({ id }) => (
              <td className={classNames('hf-numeric', id === 'minutes' && 'hf-key')} key={id}>
                {row[id]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <p className="hf-meta hf-bar-legend">
      {tableLegend(columns.map(({ column }) => column))}. Een geel-rode kaart telt als een gele en een rode.
    </p>
  </div>
)
