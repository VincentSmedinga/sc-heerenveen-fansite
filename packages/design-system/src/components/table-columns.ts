/** A column of a table: the letter in the header and the whole word a screen reader says. */
export type TableColumn = {
  /** One letter, shown in the header, except for `D/W`. */
  abbreviation: string
  /** The whole word, such as `gespeeld`: what a screen reader says and the legend gives. */
  name: string
  /** What the cells hold, if the word alone does not say it, such as `voor–tegen`. */
  note?: string
}

/**
 * The abbreviations of the columns of every table, in one place. Each is one letter and has
 * one word, with one exception for the letters, `D/W` (`doelpunten per wedstrijd`): `D` is
 * already the goals, and the owner calls this column D/W. Three letters have two words: `G` is
 * both `gespeeld` and `gelijk`, `D` is both
 * `doelpunten` and `doelsaldo`, and `P` is both `punten` and `punten per wedstrijd`. The two
 * `G`s never stand next to each other, because `G` gespeeld is the first figure of a table and
 * `G` gelijk comes straight after `W` winst. The two `D`s stand in different tables: the goal
 * difference in a table of the results of the club, the goals in a table of players, and the
 * two `P`s too: the average points in the ranking of the opponents, the points in their list.
 * The legend under the table and the whole word in the name of the header tell them apart.
 * The words of `W`, `G` gelijk and `V` are those of `MarkRow` and `FormChart`.
 *
 * The points come before the goals and the goal difference, as in every league table: `P`
 * stands before `D`.
 *
 * The tables of the players have `G` gespeeld (the matches he was in, also as a substitute),
 * `B` basis (the line-ups), `I` invallers (the times he came on), `M` minuten, `D` doelpunten,
 * `A` assists, `Y` geel and `R` rood. `G` is taken for gelijk and gespeeld, so the yellow
 * cards have `Y`; a yellow-red card counts as a yellow and a red card.
 *
 * The table of a goalkeeper on the page of a player has `N` nul (the matches in which he
 * kept a clean sheet) and `T` tegendoelpunten (the goals he conceded), both over the matches
 * he played from start to end. `N` and `T` were free, and `G` and `D` are taken.
 */
export const tableColumns = {
  assists: { abbreviation: 'A', name: 'assists' },
  cleanSheets: { abbreviation: 'N', name: 'nul' },
  conceded: { abbreviation: 'T', name: 'tegendoelpunten' },
  drawn: { abbreviation: 'G', name: 'gelijk' },
  goalDifference: { abbreviation: 'D', name: 'doelsaldo' },
  goals: { abbreviation: 'D', name: 'doelpunten' },
  goalsPerMatch: { abbreviation: 'D/W', name: 'doelpunten per wedstrijd' },
  lost: { abbreviation: 'V', name: 'verlies' },
  minutes: { abbreviation: 'M', name: 'minuten' },
  played: { abbreviation: 'G', name: 'gespeeld' },
  points: { abbreviation: 'P', name: 'punten' },
  pointsPerMatch: { abbreviation: 'P', name: 'punten per wedstrijd' },
  red: { abbreviation: 'R', name: 'rood' },
  started: { abbreviation: 'B', name: 'basis' },
  substituted: { abbreviation: 'I', name: 'invallers' },
  won: { abbreviation: 'W', name: 'winst' },
  yellow: { abbreviation: 'Y', name: 'geel' },
} as const satisfies Record<string, TableColumn>

/**
 * The legend under a table: the letter and the word of each column, in the order of the
 * columns, such as `G gespeeld, W winst, G gelijk, V verlies, P punten, D doelsaldo`. A column
 * can have a `note` in brackets, such as `D doelpunten (voor–tegen)`.
 */
export const tableLegend = (columns: readonly TableColumn[]) =>
  columns
    .map(({ abbreviation, name, note }) => `${abbreviation} ${name}${note === undefined ? '' : ` (${note})`}`)
    .join(', ')

/** A goal difference with its sign: `+6`, `−2` (a real minus sign) or `0`. */
export const signedNumber = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : String(value))
