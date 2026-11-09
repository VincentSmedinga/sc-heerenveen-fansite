// Reads the cross table of a league from the page of its season on the Dutch Wikipedia (#976):
// the table under the heading `Uitslagen`, with a row for each club at home and a column for
// each club away. The pages of 1990/91 to 2006/07 have it as a plain wiki table, not as a
// template. A table that has changed shape gives an error, never a guess. The table has scores
// and no dates.
import { clean, clubName, linkedPage, plain } from './read-wikipedia.ts'

/**
 * Why a table could not be read: the page has no heading `Uitslagen`, the heading has no table
 * under it, the table has no row of headers with a link for each club, or its rows do not fit
 * its columns (`detail` says which row).
 */
export type CrossTableProblem = 'no-clubs' | 'no-heading' | 'no-table' | 'rows-differ'

/** One cell of the table that has a score. A club is named as its own row shows it. */
export type CrossTableResult = {
  awayClub: string
  awayGoals: number
  /** The article the column of the away club links to. */
  awayPage: string
  homeClub: string
  homeGoals: number
  /** The article the row of the home club links to. */
  homePage: string
}

/** A cell that has a text that is no score, such as a match that was never played. */
export type CrossTableUnread = Pick<CrossTableResult, 'awayClub' | 'awayPage' | 'homeClub' | 'homePage'> & {
  text: string
}

export type ReadCrossTable =
  | { detail?: string; kind: 'error'; problem: CrossTableProblem }
  | { kind: 'read'; results: CrossTableResult[]; unread: CrossTableUnread[] }

/** A league has at least this many clubs; fewer columns is no cross table of a league. */
const fewestClubs = 10

/** A score as the tables write it: `2 – 0`, with an en dash or a hyphen. */
const scorePattern = /^(\d{1,2})\s*[–-]\s*(\d{1,2})$/u

/**
 * Reads the first table under the first heading `Uitslagen`, which is the table of the league:
 * the pages of the Eerste divisie have more of them further down, for the groups of the
 * play-offs. An empty cell is a match without a result and is left out. The cell of a club
 * against itself must be empty, and every row must have a cell for every column: that is how
 * the reader knows the table still has the shape it reads. A `{{nowrap|...}}` around a wide
 * score (`10 – 0`) or a long name (`RBC Roosendaal`) is taken away first.
 */
export function readCrossTable(text: string): ReadCrossTable {
  const page = clean(text).replace(/\{\{\s*nowrap\s*\|([^{}]*)\}\}/giu, '$1')
  const heading = /^(={2,6})[ \t]*Uitslagen[ \t]*\1[ \t]*$/imu.exec(page)

  if (heading === null) {
    return { kind: 'error', problem: 'no-heading' }
  }

  const rest = page.slice(heading.index + heading[0].length)
  const section = rest.slice(0, /^={2,6}[^=\n].*=[ \t]*$/mu.exec(rest)?.index ?? rest.length)
  const start = section.indexOf('{|')
  const end = section.indexOf('\n|}', start)

  if (start === -1 || end === -1) {
    return { kind: 'error', problem: 'no-table' }
  }

  const rows = section
    .slice(start, end)
    .split(/^\|-.*$/mu)
    .slice(1)
    .map((row) => row.trim())
    .filter((row) => row !== '')
  const header = rows.findIndex((row) => row.startsWith('!'))
  const columns = header === -1 ? [] : cellsOf(rows[header] ?? '').flatMap((cell) => linkedPage(cell) ?? [])

  if (columns.length < fewestClubs || new Set(columns).size !== columns.length) {
    return { kind: 'error', problem: 'no-clubs' }
  }

  const homes = rows.slice(header + 1).map((row) => {
    const [first = '', ...cells] = cellsOf(row)

    return { cells, name: clubName(first), page: linkedPage(first) }
  })
  const names = new Map(homes.flatMap((home) => (home.page === null ? [] : [[home.page, home.name]])))
  const results: CrossTableResult[] = []
  const unread: CrossTableUnread[] = []

  if (homes.length !== columns.length) {
    return { detail: `${homes.length} rows for ${columns.length} columns`, kind: 'error', problem: 'rows-differ' }
  }

  for (const home of homes) {
    const own = home.page === null ? -1 : columns.indexOf(home.page)

    if (home.page === null || own === -1 || home.cells.length !== columns.length || cellText(home.cells[own]) !== '') {
      return { detail: `the row of ${home.name}`, kind: 'error', problem: 'rows-differ' }
    }

    for (const [index, awayPage] of columns.entries()) {
      const value = cellText(home.cells[index])
      const score = scorePattern.exec(value)
      const clubs = {
        awayClub: names.get(awayPage) ?? awayPage,
        awayPage,
        homeClub: home.name,
        homePage: home.page,
      }

      if (score !== null) {
        results.push({ ...clubs, awayGoals: Number(score[2]), homeGoals: Number(score[1]) })
      } else if (value !== '' && index !== own) {
        unread.push({ ...clubs, text: value })
      }
    }
  }

  return { kind: 'read', results, unread }
}

/**
 * Where the first `|` of a cell is that is not inside a link (`[[AFC Ajax|Ajax]]`) or a
 * template, or -1.
 */
function barOutsideLinks(cell: string): number {
  let depth = 0

  for (let index = 0; index < cell.length; index++) {
    if (cell.startsWith('[[', index) || cell.startsWith('{{', index)) {
      depth++
      index++
    } else if (cell.startsWith(']]', index) || cell.startsWith('}}', index)) {
      depth = Math.max(0, depth - 1)
      index++
    } else if (cell[index] === '|' && depth === 0) {
      return index
    }
  }

  return -1
}

/**
 * The cells of a row, each without the attributes before its text (`bgcolor="#C0F0D0"|2 – 0`).
 * Cells are divided by `||` or `!!` on one line, or each start a line with `|` or `!`.
 */
function cellsOf(row: string): string[] {
  return row
    .replace(/^[|!]/u, '')
    .split(/\|\||!!|\n[|!]/u)
    .map((cell) => {
      const bar = barOutsideLinks(cell)

      return bar === -1 ? cell : cell.slice(bar + 1)
    })
}

/**
 * What a cell reads as: without the `&nbsp;` some pages fill an empty cell with and without the
 * asterisks that point to a footnote (`2 – 1*`).
 */
function cellText(cell: string | undefined): string {
  return plain(cell ?? '')
    .replace(/&nbsp;/giu, ' ')
    .replace(/\s*\*+$/u, '')
    .trim()
}
