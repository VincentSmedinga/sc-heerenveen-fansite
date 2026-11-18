import { classNames } from './classNames'
import { TableColumnIcon, type TableColumnIconName } from './table-column-icon/TableColumnIcon'

/** A column of a table: its icon and the whole word that a screen reader says. */
export type TableColumn = {
  /** The icon the header shows instead of a letter, and the legend shows beside the word. */
  icon: TableColumnIconName
  /** The whole word, such as `gespeeld`: what a screen reader says and the legend gives. */
  name: string
  /** What the cells hold, if the word alone does not say it, such as `voor–tegen`. */
  note?: string
}

/**
 * The columns of every table, in one place: each has an icon and one word, and the icon is
 * named after the key (`TableColumnIcon`). The words of `won`, `drawn` and `lost` are those
 * of `MarkRow` and `FormChart`.
 *
 * The points come before the goals and the goal difference, as in every league table.
 *
 * The tables of the players have `played` (the matches he was in, also as a substitute),
 * `started` (the line-ups), `substituted` (the times he came on, `ingevallen`),
 * `substitutedOff` (the times he went off, `gewisseld`), `minutes`, `goals`, `assists`,
 * `yellow` and `red`; a yellow-red card counts as a yellow and a red card.
 *
 * The table of the goals per quarter has `goalsFor` (a ball with a green plus) next to
 * `conceded` (a ball with a red minus): the plus only means something beside the minus.
 * Everywhere else the goals are `goals`, a plain ball.
 *
 * The lists of all time of the players have `hattricks` and `penalties` (the penalties they
 * scored). The seasons in the squad are `seasons`.
 *
 * The table of a goalkeeper on the page of a player has `cleanSheets` (the matches in which he
 * kept a clean sheet) and `conceded` (the goals he conceded), both over the matches he played
 * from start to end.
 */
export const tableColumns = {
  assists: { icon: 'assists', name: 'assists' },
  cleanSheets: { icon: 'cleanSheets', name: 'nul' },
  conceded: { icon: 'conceded', name: 'tegendoelpunten' },
  drawn: { icon: 'drawn', name: 'gelijk' },
  goalDifference: { icon: 'goalDifference', name: 'doelsaldo' },
  goals: { icon: 'goals', name: 'doelpunten' },
  goalsFor: { icon: 'goalsFor', name: 'doelpunten voor' },
  goalsPerMatch: { icon: 'goalsPerMatch', name: 'doelpunten per wedstrijd' },
  hattricks: { icon: 'hattricks', name: 'hattricks' },
  lost: { icon: 'lost', name: 'verlies' },
  minutes: { icon: 'minutes', name: 'minuten' },
  penalties: { icon: 'penalties', name: 'strafschoppen' },
  played: { icon: 'played', name: 'gespeeld' },
  points: { icon: 'points', name: 'punten' },
  pointsPerMatch: { icon: 'pointsPerMatch', name: 'punten per wedstrijd' },
  red: { icon: 'red', name: 'rood' },
  seasons: { icon: 'seasons', name: 'seizoenen' },
  started: { icon: 'started', name: 'basis' },
  substituted: { icon: 'substituted', name: 'ingevallen' },
  substitutedOff: { icon: 'substitutedOff', name: 'gewisseld' },
  won: { icon: 'won', name: 'winst' },
  yellow: { icon: 'yellow', name: 'geel' },
} as const satisfies Record<string, TableColumn>

/**
 * The legend under a table: the icon and the word of each column, in the order of the columns,
 * with room between the items and no commas. A column can have a `note` in brackets, such as
 * `doelpunten (voor–tegen)`. It is something a page can show, in a `Text` or a paragraph, and
 * more text can follow it.
 */
export const tableLegend = (columns: readonly TableColumn[], className?: string) => (
  <span className={classNames('hf-table-legend', className)}>
    {columns.map(({ icon, name, note }) => (
      <span className="hf-table-legend-item" key={name}>
        <TableColumnIcon name={icon} /> {name}
        {note === undefined ? '' : ` (${note})`}
      </span>
    ))}
  </span>
)

/** A goal difference with its sign: `+6`, `−2` (a real minus sign) or `0`. */
export const signedNumber = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : String(value))
