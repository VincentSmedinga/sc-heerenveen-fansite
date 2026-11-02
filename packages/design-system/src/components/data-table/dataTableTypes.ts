import type { ReactNode } from 'react'

/**
 * A cell: a number or text, or text with the value the column sorts on, such as `7–5` that
 * sorts as the goal difference `2`.
 */
export type DataTableCell = number | string | { sortValue: number | string; text: string }

export type DataTableColumn = {
  /**
   * What the header shows, one letter such as `G`. Without it the header shows
   * `name` itself, as it does for a column given as a string.
   */
  abbreviation?: string
  /** The whole word, as a screen reader says it, such as `gelijk`. It must be unique. */
  name: string
  /**
   * Makes the column narrow: for numbers that stay below 100, such as the matches played. A
   * number of three digits still fits, because the column grows with it. Leave it out for a
   * column that can hold more, such as a score like `35–17` or the visitors of a day.
   */
  short?: boolean
  /**
   * Lets the visitor sort the table on this column. It only works with JavaScript: without it
   * the header is plain text and the table keeps the order of `rows`.
   */
  sortable?: boolean
}

export type DataTableRow = {
  /**
   * The numbers of the row, one for each column after the first. A number is written the Dutch
   * way, with a point between the thousands. Text is shown as it is. A cell as `{ sortValue,
   * text }` shows `text` and sorts on `sortValue`.
   */
  cells: readonly DataTableCell[]
  /** What the row is about, as plain text. It is the row header, so it must be unique. */
  header: string
  /**
   * Makes the row header a link, to the page about what the row is about, such as the page of a
   * club in a list of clubs. The link says the same as the header, so it names where it goes.
   */
  href?: string
}

/** A column of a table with text, given as an object when it can fold. */
export type DataTableTextColumn = {
  /**
   * Lets the column fold where the table has no room: its header and cells are gone then, and
   * the text of its cells stands under the name of the row, in secondary text, on one line in
   * the order of the columns. Where the table has room, the column is a column and the line is
   * gone. Without it, the column is always there.
   */
  fold?: boolean
  /** The header of the column, as plain text. It must be unique. */
  name: string
}

export type DataTableTextRow = {
  /**
   * The cells of the row, one for each column after the first. A cell is text, a number or any
   * other content, such as a link, but not interactive controls that need a label of their own.
   */
  cells: readonly ReactNode[]
  /** What the row is about, as plain text. It is the row header, so it must be unique. */
  header: string
  /** Makes the row header a link, as in a row with numbers. The link repeats the header. */
  href?: string
  /** A second line under the row header, in secondary text, such as the date of a match. */
  secondary?: string
}
