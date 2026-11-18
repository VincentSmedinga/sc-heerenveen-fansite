// Reads the table of the group sc Heerenveen played in from the page of a European tournament
// on the Dutch Wikipedia (#1405). Every group has a wikitable with a row for each club: a
// header with the abbreviations of the columns (`Ptn Wed W G V DV DT DS`, or `GS W G V DV DT DS
// P` on the page of 2009/10), and a row per club with its place in front of the name (`1.`) or
// not. The table of our group is the one with a row of sc Heerenveen; the others are not read.
import { clean, clubName, linkedPage, plain } from './read-wikipedia.ts'

/** One club of the group, as the page has it: the name and the article of the club. */
export type ReadGroupClub = {
  club: string
  drawn: number
  goalDifference: number
  goalsAgainst: number
  goalsFor: number
  lost: number
  /** The title of the article the club links to, or null when the cell has no link. */
  page: null | string
  played: number
  points: number
  position: number
  won: number
}

export type ReadGroupStandings =
  { group: string; kind: 'read'; rows: ReadGroupClub[] } | { kind: 'error'; message: string } | { kind: 'none' }

/** The name of our club, in lower case and without punctuation, as `ownClub` compares it. */
const ownName = 'scheerenveen'

/** The columns of a table and the abbreviation Wikipedia gives each in its header. */
const columnOf: Readonly<Record<string, keyof Numbers>> = {
  dt: 'goalsAgainst',
  dv: 'goalsFor',
  g: 'drawn',
  gs: 'played',
  p: 'points',
  ptn: 'points',
  pts: 'points',
  v: 'lost',
  w: 'won',
  wed: 'played',
}

type Numbers = {
  drawn: number
  goalDifference: number
  goalsAgainst: number
  goalsFor: number
  lost: number
  played: number
  points: number
  won: number
}

/**
 * What a table must be before we keep it: places 1 to n once each, the numbers of every club
 * adding up (played = won + drawn + lost, the goal difference, the points as 3 × won + drawn),
 * the same number of matches for every club, and as many goals for as against in all. Each
 * fault names the club, so a mistake on the page is a line in the log and no table.
 */
export function checkGroupStandings(rows: readonly ReadGroupClub[]): string[] {
  const faults: string[] = []

  for (const [index, row] of rows.entries()) {
    if (row.position !== index + 1) {
      faults.push(`${row.club} has place ${row.position}, where ${index + 1} was expected`)
    }
    if (row.played !== row.won + row.drawn + row.lost) {
      faults.push(
        `${row.club} has ${row.played} matches played, but ${row.won} won + ${row.drawn} drawn + ${row.lost} lost`,
      )
    }
    if (row.goalDifference !== row.goalsFor - row.goalsAgainst) {
      faults.push(`${row.club} has goal difference ${row.goalDifference}, but ${row.goalsFor} − ${row.goalsAgainst}`)
    }
    if (row.points !== 3 * row.won + row.drawn) {
      faults.push(
        `${row.club} has ${row.points} points, but ${row.won} won and ${row.drawn} drawn is ${3 * row.won + row.drawn}`,
      )
    }
  }
  if (new Set(rows.map((row) => row.played)).size > 1) {
    faults.push('the clubs have not played the same number of matches')
  }
  if (rows.reduce((sum, row) => sum + row.goalsFor, 0) !== rows.reduce((sum, row) => sum + row.goalsAgainst, 0)) {
    faults.push('the goals for and against of the clubs do not add up to the same number')
  }

  return faults
}

/** Whether the name, in the way the page writes it, is sc Heerenveen. */
export function isOwnClub(name: string): boolean {
  return name.toLowerCase().replaceAll(/[^a-z]/gu, '') === ownName
}

/**
 * Reads the group of sc Heerenveen: the heading above its table (`Groep D`) and the clubs from
 * the first place down. A page without a table that has our club gives `none`, and a table that
 * cannot be read gives an error that says which.
 */
export function readGroupStandings(text: string): ReadGroupStandings {
  const lines = clean(text).split('\n')
  const tables: { group: string; lines: string[] }[] = []
  let heading = ''
  let open: null | { group: string; lines: string[] } = null

  for (const line of lines) {
    const found = /^=+\s*(.*?)\s*=+\s*$/u.exec(line)

    if (open === null && found !== null) {
      heading = plain(found[1] ?? '')
    }
    if (open === null && line.startsWith('{|')) {
      open = { group: heading, lines: [] }
    } else if (open !== null && line.startsWith('|}')) {
      tables.push(open)
      open = null
    } else if (open !== null) {
      open.lines.push(line)
    }
  }

  for (const table of tables) {
    const read = readTable(table.lines)

    if (read === undefined || !read.some((row) => isOwnClub(row.club))) {
      continue
    }

    return { group: table.group, kind: 'read', rows: read }
  }

  return tables.some((table) => table.lines.some((line) => /heerenveen/iu.test(line)))
    ? { kind: 'error', message: 'the page has a table with sc Heerenveen, but not one with the points of a group' }
    : { kind: 'none' }
}

/** The text of a cell without the attributes in front of it (`align=left|`, `style="…"|`). */
function cellText(cell: string): string {
  return cell.replace(/^\s*(?:[a-z-]+\s*=\s*(?:"[^"]*"|[^\s|"]+)\s*)+\|(?!\|)/iu, '').trim()
}

/** A number as the page writes it: with a plus or a Unicode minus, and maybe in bold. */
function numberOf(cell: string): number | undefined {
  const text = plain(cell).replace('−', '-').replace(/^\+/u, '')

  return /^-?\d{1,3}$/u.test(text) ? Number(text) : undefined
}

function readTable(lines: string[]): ReadGroupClub[] | undefined {
  const rows = rowsOf(lines)
  const header = rows.find((row) => row.header)

  if (header === undefined) {
    return undefined
  }

  // The columns with numbers, in the order of the header; the others (`#`, `Team`) have none.
  const fields = header.cells.map(
    (cell) => columnOf[plain(cell).toLowerCase()] ?? (/^ds$/iu.test(plain(cell)) ? 'goalDifference' : undefined),
  )
  const numbered = fields.filter((field): field is keyof Numbers => field !== undefined)

  if (!numbered.includes('points') || !numbered.includes('goalsFor') || !numbered.includes('won')) {
    return undefined
  }

  const read: ReadGroupClub[] = []

  for (const row of rows.filter((candidate) => !candidate.header)) {
    // The club is the first cell with a name; a place in front of it (`1.`) is no name.
    const nameAt = row.cells.findIndex((cell) => /[\p{L}]{2}/u.test(plain(cell).replaceAll(/\{\{[^}]*\}\}/gu, '')))

    if (nameAt === -1) {
      continue
    }

    const cell = row.cells[nameAt] ?? ''
    const place = /^(?:\s*(\d+)\.\s*)/u.exec(plain(cell)) ?? /^(\d+)\.$/u.exec(plain(row.cells[nameAt - 1] ?? ''))
    // A footnote mark after the name (`Dinamo Zagreb ¹`) is no part of it.
    const name = clubName(
      cell
        .replaceAll(/\{\{[^}]*\}\}/gu, '')
        .replace(/^\s*\d+\.\s*/u, '')
        .trim(),
    ).replace(/\s*[¹²³⁴⁵*]+$/u, '')
    const values = row.cells.slice(nameAt + 1).map(numberOf)

    if (values.length < numbered.length || values.slice(0, numbered.length).includes(undefined)) {
      continue
    }

    const found: Partial<Numbers> = {}

    for (const [index, field] of numbered.entries()) {
      found[field] = values[index] as number
    }

    read.push({
      club: name,
      drawn: found.drawn ?? 0,
      goalDifference: found.goalDifference ?? (found.goalsFor ?? 0) - (found.goalsAgainst ?? 0),
      goalsAgainst: found.goalsAgainst ?? 0,
      goalsFor: found.goalsFor ?? 0,
      lost: found.lost ?? 0,
      page: linkedPage(cell),
      played: found.played ?? (found.won ?? 0) + (found.drawn ?? 0) + (found.lost ?? 0),
      points: found.points ?? 0,
      position: place === null ? read.length + 1 : Number(place[1]),
      won: found.won ?? 0,
    })
  }

  return read.length === 0 ? undefined : read
}

/** The cells of the rows of a table, a row being what is between two lines that start `|-`. */
function rowsOf(lines: string[]): { cells: string[]; header: boolean }[] {
  const rows: { cells: string[]; header: boolean }[] = []
  let current: { cells: string[]; header: boolean } = { cells: [], header: false }

  for (const line of lines) {
    if (line.startsWith('|-')) {
      if (current.cells.length > 0) {
        rows.push(current)
      }
      current = { cells: [], header: false }
    } else if (line.startsWith('!')) {
      current.header = true
      current.cells.push(...line.slice(1).split('!!').map(cellText))
    } else if (line.startsWith('|') && !line.startsWith('|+')) {
      current.cells.push(...line.slice(1).split('||').map(cellText))
    }
  }
  if (current.cells.length > 0) {
    rows.push(current)
  }

  return rows
}
