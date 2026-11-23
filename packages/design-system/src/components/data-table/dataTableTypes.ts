import type { ReactNode } from 'react'

import type { TableColumnIconName } from '../table-column-icon/TableColumnIcon'

/**
 * A cell: a number or text, or text with the value the column sorts on, such as `7–5` that
 * sorts as the goal difference `2`. Text that is empty sorts as an empty cell.
 */
export type DataTableCell = number | string | { sortValue: DataTableSortValue; text: string }

export type DataTableColumn = {
  /**
   * What the header shows, a short text such as `Gem`. Without it the header shows
   * `name` itself, as it does for a column given as a string. A column of `tableColumns` has
   * an `icon` and no abbreviation.
   */
  abbreviation?: string
  /**
   * Hides the header from the eye and keeps it for a screen reader, for a column whose cells
   * say what it is, such as `3×`. It does not work for a `sortable` column, which needs its
   * button.
   */
  hidden?: boolean
  /**
   * The icon the header shows instead of the words, from `tableColumns`. A screen reader hears
   * the whole `name`, and a sortable header's button is named by it.
   */
  icon?: TableColumnIconName
  /**
   * Makes this column the key figure of the table: its cells get the heaviest weight, for the
   * figure the table is ordered by or the answer it gives, such as the average in a ranking.
   * The header stays as it is. At most one column can be the key figure, so a table with two
   * throws an error. In a table that sorts, the column the visitor sorts on takes over.
   */
  key?: boolean
  /**
   * Puts this column behind the button of `MoreColumns` where the table is narrow, such as the
   * wins, draws and losses on a phone. Where the table has room, and without JavaScript, the
   * column is always there. Only a column of a table of numbers can have it, and it needs a
   * `MoreColumns` round the table, which also holds the button.
   */
  more?: boolean
  /** The whole word, as a screen reader says it, such as `gelijk`. It must be unique. */
  name: string
  /**
   * What the header shows when that is not the words a screen reader says, such as `Winst 12×`
   * for the name `Winst, 12 keer`. Unlike an `abbreviation` it is no abbreviation, so it gets
   * no `abbr`. It does not work for a `sortable` column, whose button is named by `name`.
   */
  shown?: string
  /**
   * Whether the visitor can sort the table on this column, which is the default. It only works
   * with JavaScript: without it the header is plain text and the table keeps the order of
   * `rows`. Give `false`, with the reason in a comment, for a column that has no order, such as
   * one with only a link. A column with a `hidden` header or a `shown` header does not sort
   * unless it says `sortable: true`.
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
   * sortable (`sortable={false}`, or it throws), and `cells` stay empty. A gap row with
   * `display` shows that text in place of the sign, for an interruption that says what it
   * hides, such as `9 clubs ertussen`.
   */
  gap?: boolean
  /** What the row is about, as plain text. It is the row header, so it must be unique. */
  header: string
  /**
   * Marks the row as one the table is about, such as the two clubs of a match in a stretch of
   * the league table: the strong fill and a bar on the start side that also shows in
   * forced colours. Colour is never the only sign, so give the row a `note` that says why it
   * stands out, such as `deze club`. Not for a total (use `total`).
   */
  highlight?: boolean
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
   * table that is not sortable (`sortable={false}`, or it throws): a sorted table keeps the
   * places it was given, which would no longer be the order.
   */
  position?: number
  /**
   * A second line under the row header in secondary text, such as the period of a coach. A
   * screen reader reads it as part of the row header.
   */
  secondary?: string
  /**
   * What the row header sorts on, when that is not the header itself, such as `Basten, van` for
   * `van Basten`, so he stands under the B. The header is shown as it is.
   */
  sortHeader?: string
  /**
   * Makes this row the total of the table: bold, with a fill and a heavier line above it, for
   * the last row, such as `Totaal` under the seasons. A table has at most one, and it is not
   * sortable (`sortable={false}`, or it throws): a sorted table moves the row.
   */
  total?: boolean
}

/**
 * What a cell sorts on: a number, text, or `null` for a cell that counts as empty, such as `?`.
 * An empty cell stands last, whichever way the column is sorted.
 */
export type DataTableSortValue = null | number | string

/** A column of a table with text, given as an object when it can fold. */
export type DataTableTextColumn = {
  /**
   * A short header for a table with many columns, such as `Gem`: where the table is too narrow
   * for the whole words the header shows it, and where it has room the whole `name`. A screen
   * reader always hears the `name`. Explain it in a line above the table.
   */
  abbreviation?: string
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
  /**
   * The icon the header shows with the whole `name` where the table has room, and alone where
   * it has not, from `tableColumns`. A screen reader always hears the `name`.
   */
  icon?: TableColumnIconName
  /**
   * Makes the column one of short signs, each a `DataTable.Mark` or empty, such as the gaps in
   * the data of a match: the header and the cells are centred.
   */
  mark?: boolean
  /** The header of the column, as plain text. It must be unique. */
  name: string
  /**
   * Whether the visitor can sort the table on this column, which is the default. Give `false`,
   * with the reason in a comment, for a column that has no order, such as one with only a link.
   * A column of which a cell is more than text or a number, with no `sortValue`, does not sort.
   */
  sortable?: boolean
}

export type DataTableTextRow = {
  /**
   * The cells of the row, one for each column after the first. A cell is text, a number or any
   * other content, such as a link, but not interactive controls that need a label of their own.
   * A cell as `{ content, sortValue }` shows `content` and sorts on `sortValue`. A column in
   * which a cell is a link or a sign without a `sortValue` does not sort.
   */
  cells: readonly (DataTableTextValueCell | ReactNode)[]
  /** What the row is about, as plain text. It is the row header, so it must be unique. */
  header: string
  /** Makes the row header a link, as in a row with numbers. The link repeats the header. */
  href?: string
  /** A second line under the row header, in secondary text, such as the date of a match. */
  secondary?: string
  /** What the row header sorts on, as in a row with numbers. */
  sortHeader?: string
}

/** A cell of a table with text that holds more than text, with the value to sort on. */
export type DataTableTextValueCell = { content: ReactNode; sortValue: DataTableSortValue }
