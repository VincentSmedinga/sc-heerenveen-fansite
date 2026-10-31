/**
 * A cell: a number or text, or text with the value the column sorts on, such as `7–5` that
 * sorts as the goal difference `2`.
 */
export type DataTableCell = number | string | { sortValue: number | string; text: string }

export type DataTableColumn = {
  /**
   * What the header shows, one to three letters such as `GL`. Without it the header shows
   * `name` itself, as it does for a column given as a string.
   */
  abbreviation?: string
  /** The whole word, as a screen reader says it, such as `gelijk`. It must be unique. */
  name: string
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
