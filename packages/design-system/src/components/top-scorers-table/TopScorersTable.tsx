import { type ComponentPropsWithoutRef, Fragment } from 'react'

import { Bar, sharesOf } from '../bar/Bar'
import { classNames } from '../classNames'
import { PlayerName } from '../player-name/PlayerName'
import { type TableColumn, tableColumns, tableLegend } from '../table-columns'

export type TopScorersTablePlayer = {
  /** The given name of the player, in the normal weight. Leave it out when it is not known. */
  givenName?: string | undefined
  /**
   * The goals per match of the player as text, such as `0,50`: the page works it out and
   * writes it, because it knows the matches. Only shown with `showGoalsPerMatch`.
   */
  goalsPerMatch?: string | undefined
  /** What tells the player from the others, such as his id: the first is the key of the row. */
  id: number | string
  /** The surname of the player, in the stronger weight (see `PlayerName`). */
  surname: string
}

export type TopScorersTableProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /**
   * The text of the table's caption, which names the table and says which season and which
   * competitions it counts, such as `Doelpuntenmakers van sc Heerenveen in het seizoen
   * 2026/27`. Only a screen reader gets it: the caption is not shown.
   */
  caption: string
  /** A top scorers table has no children: everything it shows comes from the props below. */
  children?: never
  /**
   * What the places are for, in the header, the name for a screen reader and the legend.
   * Without it, it is the goals (`tableColumns.goals`). A list of the assists or of the
   * minutes gives `tableColumns.assists` or `tableColumns.minutes`, and then `goals` in each
   * row holds that figure. `showGoalsPerMatch` is only for the goals.
   */
  figure?: TableColumn
  /** The places, from the most goals down. */
  rows: TopScorersTableRow[]
  /**
   * Adds the column D/W, the goals per match, after the goals, with the `goalsPerMatch` of each
   * player. A table with the column has a row for each player, also where players share a
   * place and a row has more than one: the row is split, and the players keep their place and
   * their goals. A table without it is as it was. The page only sets it when it knows the
   * matches of every player in the list (all or nothing).
   */
  showGoalsPerMatch?: boolean | undefined
}

export type TopScorersTableRow = {
  /**
   * The goals of each player in the row (or the figure that the table says it is for): players
   * who share a row have the same number.
   */
  goals: number
  /**
   * The players of the row, in the order they are shown. A row has one player, or more when
   * players with the same goals share it, such as in a short list.
   */
  players: [TopScorersTablePlayer, ...TopScorersTablePlayer[]]
  /** The place in the list, from 1. Players with the same goals have the same place. */
  position: number
}

/** What D/W is, under the table of a card that has the column. */
const goalsPerMatchSentence =
  'D/W: de doelpunten gedeeld door de wedstrijden die de speler speelde, ook als invaller, volgens de selectie op Wikipedia.'

/** The rows with one player each: a shared row is split, and each player keeps the place. */
const onePlayerPerRow = (rows: TopScorersTableRow[]): TopScorersTableRow[] =>
  rows.flatMap((row) => row.players.map((player) => ({ ...row, players: [player] as [TopScorersTablePlayer] })))

/**
 * The top scorers: a real `table` with a caption that is not shown, column headers with `scope`
 * and a row header for each row, whose names are `PlayerName`s: the given name in the normal
 * weight and the surname in the stronger one. A row with more than one player has all the names
 * in its one row header, with a comma and a space between them; the header wraps at a space,
 * also inside a name. The goals are bold, because the list is
 * ordered by them, belong to each player of the row, and have a bar next to them that is as
 * long as the share of the top scorer's goals.
 * The bar is the one of the standings: decoration that a screen reader skips, which goes when
 * the place of the table is too narrow. The header of the goals is the abbreviation D, so the
 * full word stands under the table as well, because a title on an abbreviation only shows under
 * a mouse. bar.css gives the look.
 *
 * With `showGoalsPerMatch` there is a column D/W after the goals, for a screen reader
 * "doelpunten per wedstrijd", and the legend under the table has it too, with a sentence that
 * says what it is. Every player then has a row of their own.
 *
 * With `figure` the list is of something else, such as the assists or the minutes: the places
 * and the bar are the same, and the header and the legend have its letter and word.
 */
export const TopScorersTable = ({
  caption,
  className,
  figure = tableColumns.goals,
  rows: placedRows,
  showGoalsPerMatch = false,
  ...props
}: TopScorersTableProps) => {
  const rows = showGoalsPerMatch ? onePlayerPerRow(placedRows) : placedRows
  const shares = sharesOf(rows.map((row) => row.goals))

  return (
    <div {...props} className={classNames('hf-top-scorers hf-bar-place', className)}>
      <table className="hf-top-scorers-table hf-bar-table">
        <caption className="hf-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th className="hf-numeric" scope="col">
              <abbr title="Plaats">
                <span aria-hidden="true">#</span>
                <span className="hf-visually-hidden">plaats</span>
              </abbr>
            </th>
            <th scope="col">Speler</th>
            <th className={classNames('hf-numeric', shares !== null && 'hf-bar-head')} scope="col">
              <abbr title={`${figure.name.charAt(0).toUpperCase()}${figure.name.slice(1)}`}>
                <span aria-hidden="true">{figure.abbreviation}</span>
                <span className="hf-visually-hidden">{figure.name}</span>
              </abbr>
            </th>
            {showGoalsPerMatch ? (
              <th className="hf-numeric" scope="col">
                <abbr title={tableColumns.goalsPerMatch.name}>
                  <span aria-hidden="true">{tableColumns.goalsPerMatch.abbreviation}</span>
                  <span className="hf-visually-hidden">{tableColumns.goalsPerMatch.name}</span>
                </abbr>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.players[0].id}>
              <td className="hf-numeric hf-rank">{row.position}</td>
              <th scope="row">
                {row.players.map((player, place) => (
                  <Fragment key={player.id}>
                    <PlayerName givenName={player.givenName} surname={player.surname} />
                    {place === row.players.length - 1 ? null : ', '}
                  </Fragment>
                ))}
              </th>
              <td className="hf-numeric hf-key">
                {row.goals}
                {shares !== null ? <Bar share={shares[index]!} /> : null}
              </td>
              {showGoalsPerMatch ? <td className="hf-numeric">{row.players[0].goalsPerMatch}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hf-meta hf-bar-legend">
        {showGoalsPerMatch ? (
          `${tableLegend([figure, tableColumns.goalsPerMatch])}. ${goalsPerMatchSentence}`
        ) : (
          <>
            <b>{figure.abbreviation}</b> {figure.name}
          </>
        )}
      </p>
    </div>
  )
}
