/** A column of a table: the letter in the header and the whole word a screen reader says. */
export type TableColumn = {
  /** One letter, shown in the header. */
  abbreviation: string
  /** The whole word, such as `gespeeld`: what a screen reader says and the legend gives. */
  name: string
  /** What the cells hold, if the word alone does not say it, such as `voor–tegen`. */
  note?: string
}

/**
 * The abbreviations of the columns of every table, in one place. Each is one letter and has
 * one word, with one exception: `G` is both `gespeeld` and `gelijk`. The two never stand next
 * to each other, because `G` gespeeld is the first figure of a table and `G` gelijk comes
 * straight after `W` winst; the legend under the table and the whole word in the name of the
 * header tell them apart. The words of `W`, `G` gelijk and `V` are those of `MarkRow` and
 * `FormChart`.
 */
export const tableColumns = {
  drawn: { abbreviation: 'G', name: 'gelijk' },
  goalDifference: { abbreviation: 'S', name: 'doelsaldo' },
  goals: { abbreviation: 'D', name: 'doelpunten' },
  lost: { abbreviation: 'V', name: 'verlies' },
  played: { abbreviation: 'G', name: 'gespeeld' },
  points: { abbreviation: 'P', name: 'punten' },
  won: { abbreviation: 'W', name: 'winst' },
} as const satisfies Record<string, TableColumn>

/**
 * The letters that are taken for a table that does not exist yet. `A` is assists, for the
 * tables of the players: a table that gets the column takes it from here and moves it to
 * `tableColumns`.
 */
export const reservedTableColumns = {
  assists: { abbreviation: 'A', name: 'assists' },
} as const satisfies Record<string, TableColumn>

/**
 * The legend under a table: the letter and the word of each column, in the order of the
 * columns, such as `G gespeeld, W winst, G gelijk, V verlies, D doelpunten (voor–tegen)`.
 */
export const tableLegend = (columns: readonly TableColumn[]) =>
  columns
    .map(({ abbreviation, name, note }) => `${abbreviation} ${name}${note === undefined ? '' : ` (${note})`}`)
    .join(', ')
