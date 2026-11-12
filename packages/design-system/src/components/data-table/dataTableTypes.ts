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
  /**
   * Hides the header from the eye and keeps it for a screen reader, for a column whose cells
   * say what it is, such as `3×`. It does not work for a `sortable` column, which needs its
   * button.
   */
  hidden?: boolean
  /**
   * Makes this column the key figure of the table: its cells get the heaviest weight, for the
   * figure the table is ordered by or the answer it gives, such as the average in a ranking.
   * The header stays as it is. At most one column can be the key figure, so a table with two
   * throws an error. In a table that sorts, the column the visitor sorts on takes over.
   */
  key?: boolean
  /** The whole word, as a screen reader says it, such as `gelijk`. It must be unique. */
  name: string
  /**
   * What the header shows when that is not the words a screen reader says, such as `Winst 12×`
   * for the name `Winst, 12 keer`. Unlike an `abbreviation` it is no abbreviation, so it gets
   * no `abbr`. It does not work for a `sortable` column, whose button is named by `name`.
   */
  shown?: string
  /**
   * Lets the visitor sort the table on this column. It only works with JavaScript: without it
   * the header is plain text and the table keeps the order of `rows`.
   */
  sortable?: boolean
}

export type DataTableRow = {
  /**
   * Words after the row header on the same line, in secondary text, such as the shirt number
   * after a season (`nr. 35`). A screen reader reads them as part of the row header. Keep them
   * short: on a phone they wrap under the header. Use `secondary` for a line of its own.
   */
  aside?: string
  /**
   * The numbers of the row, one for each column after the first. A number is written the Dutch
   * way, with a point between the thousands. Text is shown as it is. A cell as `{ sortValue,
   * text }` shows `text` and sorts on `sortValue`.
   */
  cells: readonly DataTableCell[]
  /**
   * What the row header shows in place of `header`, such as a `PlayerName`, where the weight of
   * the words matters. `header` stays the plain text of the row and its key.
   */
  display?: ReactNode
  /**
   * Makes this row an interruption in the rows, such as the seasons a player was not with the
   * club between two spells: a vertical ellipsis (⋮) in the row header and empty cells. The
   * sign is hidden from a screen reader, which reads `header` instead, such as `niet bij sc
   * Heerenveen`. The header of such a row need not be unique. It is for a table that is not
   * sortable, and `cells` stay empty.
   */
  gap?: boolean
  /** What the row is about, as plain text. It is the row header, so it must be unique. */
  header: string
  /**
   * Makes the row header a link, to the page about what the row is about, such as the page of a
   * club in a list of clubs. The link says the same as the header, so it names where it goes.
   */
  href?: string
  /**
   * A decoration before the row header, such as the swatch of a slice of a donut chart. It must
   * be hidden from a screen reader (`aria-hidden`), so `note` says what it means.
   */
  marker?: ReactNode
  /**
   * Words after the row header that only a screen reader gets, such as `winst` after `4–0`.
   * Colour or a shape is never the only way to know it.
   */
  note?: string
  /**
   * The place of the row in a ranking, from 1. Rows with the same place in a row share it: the
   * first shows the number and the rows after it a vertical ellipsis, which a screen reader
   * hears as "gedeeld 4" (see `PlaceCell`). A table in which a row has one gets a column
   * before the row headers, with the header `#` (`plaats` for a screen reader), and the rows
   * are in the order of the ranking, so give a place to every row or to none. It is for a
   * table that is not sortable: a sorted table keeps the places it was given, which would no
   * longer be the order.
   */
  position?: number
  /**
   * A second line under the row header in secondary text, such as the period of a coach. A
   * screen reader reads it as part of the row header.
   */
  secondary?: string
  /**
   * Makes this row the total of the table: bold, with a fill and a heavier line above it, for
   * the last row, such as `Totaal` under the seasons. A table has at most one, and it is not
   * sortable: a sorted table moves the row.
   */
  total?: boolean
}

/** A column of a table with text, given as an object when it can fold. */
export type DataTableTextColumn = {
  /**
   * Makes the column one of numbers with a `Bar` after each number: the header and the cells
   * are aligned to the end, so the header stands over the number and the bar together.
   */
  bar?: boolean
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
