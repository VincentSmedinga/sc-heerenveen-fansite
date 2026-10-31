// Reads the squad of sc Heerenveen 1 (men) from the wikitext of the page of the season on the
// Dutch Wikipedia. The table under "Spelers" is written in two ways on the same page: all the
// cells of a row on one line, separated by `||`, and one cell to a line. This reader takes both
// as the same table. A page that has changed shape gives an error, never a guess, so the import
// keeps the squad it has. The numbers of a player (appearances, goals and assists in the
// Eredivisie and the KNVB Beker) are read from the same row; a number we cannot be sure of is
// left out with a warning, since the squad does not depend on it.
import type { Competition, PlayerPosition } from '@fansite/db/schema'

import { playerNameMaxLength } from '@fansite/db/schema'

import { clean, linkedPage, plain } from './read-wikipedia.ts'

/** What the import keeps of one player. */
export type ReadPlayer = {
  /** The name as the table shows it, such as `Joost van Aken`. */
  name: string
  position: PlayerPosition
  /** The surname the search page looks for, such as `van Aken` (see `searchTerm`). */
  searchTerm: string
  /** Null for a player without a shirt number (`-` in the table). */
  shirtNumber: null | number
  /**
   * The numbers per competition, Eredivisie first. A competition whose cells are empty is not
   * in the list, and a dash counts as zero. The total of the table is not read: it is the sum.
   */
  stats: ReadStats[]
  /**
   * The page the name links to, such as `Pim Verbeek (voetballer, 1999)`, with the addition
   * still on it. Null when the table does not link the name. Goals link to the same page.
   */
  wikipediaPage: null | string
}

export type ReadSquad =
  | { kind: 'error'; message: string }
  | {
      kind: 'read'
      players: ReadPlayer[]
      /** What was left out of the numbers and why, one sentence each. */
      warnings: string[]
    }

/** The appearances, goals and assists of a player in one competition. */
export type ReadStats = {
  appearances: number
  assists: number
  competition: Competition
  goals: number
}

/**
 * The columns of the numbers in a row of the table: after the shirt number, the nationality,
 * the name and the contract come three cells for the Eredivisie, three for the KNVB Beker and
 * three for the total.
 */
const statsColumns: { competition: Competition; first: number }[] = [
  { competition: 'Eredivisie', first: 4 },
  { competition: 'KNVB Beker', first: 7 },
]

/** The cells of a row with all numbers: four before, six for the competitions, three after */
const cellsWithStats = 13

/** The group headings of the table, with the position of the players under each. */
const groups: Record<string, PlayerPosition> = {
  aanvallers: 'aanvaller',
  doelmannen: 'doelman',
  middenvelders: 'middenvelder',
  verdedigers: 'verdediger',
}

/**
 * Words that start a surname. A name that starts with one has no given name before it, such as
 * `Van Bergen`, and is kept whole.
 */
const particles = new Set(["'t", 'da', 'de', 'den', 'der', 'di', 'el', 'het', 'te', 'ten', 'ter', 'van', 'von'])

/** A cell with a dash instead of a number: a hyphen, an en dash or an em dash. */
const dash = /^[-–—]$/u

/** What an attribute in front of a cell looks like: `align="left" |`. */
const cellAttributes = /^(?:\s*[a-z-]+\s*=\s*"[^"]*")+\s*\|(?!\|)/iu

/** A key that treats names as the database does: without accents and capitals. */
export function nameKey(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/**
 * Reads the table under the heading "Spelers". Every row is a player under the last group
 * heading. A row, number, name or heading we do not know is an error: half a squad says
 * something false.
 */
export function readSquad(text: string): ReadSquad {
  const table = findTable(clean(text))

  if (table === undefined) {
    return { kind: 'error', message: 'the squad page has no table under the heading Spelers' }
  }

  const players: ReadPlayer[] = []
  const warnings: string[] = []
  const rows = table.split(/^\|-.*$/gmu)
  let position: null | PlayerPosition = null

  // A number under the wrong heading is worse than none, so the numbers are read only when the
  // headings are in the order of `statsColumns`.
  const columnsKnown = competitionsInOrder(rows)

  if (!columnsKnown) {
    warnings.push(
      'the squad table does not have the columns Eredivisie and KNVB Beker in that order, so no numbers are read',
    )
  }

  for (const row of rows) {
    const header = headerCells(row)
    const cells = dataCells(row)

    if (header.length === 1) {
      const group = groups[plain(header[0] ?? '').toLowerCase()]

      if (group === undefined) {
        return {
          kind: 'error',
          message: `the squad table has a heading we do not know: '${plain(header[0] ?? '').slice(0, 40)}'`,
        }
      }
      position = group
    } else if (cells.length > 0) {
      if (position === null) {
        return { kind: 'error', message: 'the squad table has a player above the first group heading' }
      }

      const player = readPlayer(cells, position, columnsKnown, warnings)

      if (typeof player === 'string') {
        return { kind: 'error', message: player }
      }
      players.push(player)
    }
  }

  return { kind: 'read', players, warnings }
}

/**
 * The search term of a name: the name without the first given name. `Bernt Klaverboer` gives
 * `Klaverboer` and `Joost van Aken` gives `van Aken`. A name of one word stays as it is, and a
 * hyphenated given name (`Jan-Willem`) is one word. A name that starts with a particle has no
 * given name and stays whole.
 */
export function searchTerm(name: string): string {
  const words = name.split(/\s+/u).filter((word) => word !== '')
  const [first = ''] = words

  return words.length < 2 || particles.has(first.toLowerCase()) ? words.join(' ') : words.slice(1).join(' ')
}

/** The title of the page of a season: `Sc Heerenveen in het seizoen 2026/27 (mannen)`. */
export function squadPageTitle(season: string): string {
  return `Sc Heerenveen in het seizoen ${season} (mannen)`
}

/** Whether the column headings of the table name the Eredivisie and then the KNVB Beker. */
function competitionsInOrder(rows: string[]): boolean {
  const names = rows
    .flatMap(headerCells)
    .map((cell) => plain(cell).toLowerCase())
    .filter((name) => name === 'eredivisie' || name === 'knvb beker')

  return names[0] === 'eredivisie' && names[1] === 'knvb beker'
}

/** The cells of a row on the lines that start with `|`, in both writings, without attributes */
function dataCells(row: string): string[] {
  const cells: string[] = []

  for (const line of row.split('\n')) {
    if (line.startsWith('|') && !line.startsWith('|}') && !line.startsWith('{|')) {
      cells.push(...line.slice(1).split('||').map(stripAttributes))
    }
  }

  return cells
}

/** The text between `== Spelers ==` (any level) and the end of the first table under it. */
function findTable(text: string): string | undefined {
  const heading = /^(={2,6})[ \t]*Spelers[ \t]*\1[ \t]*$/mu.exec(text)

  if (heading === null) {
    return undefined
  }

  const rest = text.slice(heading.index + heading[0].length)
  const next = /^={2,6}[^=\n].*$/mu.exec(rest)
  const start = rest.search(/^\{\|/mu)

  if (start < 0 || (next !== null && next.index < start)) {
    return undefined
  }

  const end = rest.indexOf('\n|}', start)

  return end < 0 ? undefined : rest.slice(start, end)
}

/** The cells of a row that starts with `!`: the headings of the columns, or of a group. */
function headerCells(row: string): string[] {
  const cells: string[] = []

  for (const line of row.split('\n')) {
    if (line.startsWith('!')) {
      cells.push(...line.slice(1).split('!!').map(stripAttributes))
    }
  }

  return cells
}

/**
 * The name of a cell: what the link shows, `Roberts Uldrikis` for `[[Roberts Uldriķis|Roberts
 * Uldrikis]]`, or the title of the page without a disambiguation like `(voetballer)`.
 */
function nameOf(cell: string): string {
  const name = plain(cell)
  const piped = /\[\[[^\]|]*\|/u.test(cell)

  return piped ? name : name.replace(/\s*\([^()]*\)$/u, '')
}

/**
 * Turns the cells of a row into a player: the shirt number, the nationality (left out), then
 * the name. The contract is left out, and the numbers come after it (see `readStats`).
 */
function readPlayer(
  cells: string[],
  position: PlayerPosition,
  columnsKnown: boolean,
  warnings: string[],
): ReadPlayer | string {
  const [numberCell = '', , nameCell = ''] = cells

  if (cells.length < 3) {
    return `a row of the squad table has ${cells.length} cells, not three or more`
  }

  const number = plain(numberCell)
  const name = nameOf(nameCell)

  if (name === '' || name.length > playerNameMaxLength || /[{}[\]|<>=]/u.test(name)) {
    return `a row of the squad table has no usable name: '${plain(nameCell).slice(0, 40)}'`
  }
  if (number !== '-' && number !== '' && !/^\d{1,2}$/u.test(number)) {
    return `${name} has a shirt number we do not know: '${number.slice(0, 40)}'`
  }

  const shirtNumber = /^\d{1,2}$/u.test(number) ? Number(number) : null

  if (shirtNumber !== null && (shirtNumber < 1 || shirtNumber > 99)) {
    return `${name} has a shirt number we do not know: '${number}'`
  }

  const stats = columnsKnown ? readStats(cells, name, warnings) : []

  return { name, position, searchTerm: searchTerm(name), shirtNumber, stats, wikipediaPage: linkedPage(nameCell) }
}

/**
 * The numbers of a row, per competition. A cell with a number is that number and a dash is
 * zero. A competition with an empty cell has no numbers yet and gets none, without a warning.
 * Anything else in a cell, or a row that does not have all its cells, is left out with a
 * warning that names the player.
 */
function readStats(cells: string[], name: string, warnings: string[]): ReadStats[] {
  if (cells.length !== cellsWithStats) {
    // A row of three cells is a table without numbers, which is not a change.
    if (cells.length > 3) {
      warnings.push(`${name}: the row has ${cells.length} cells, not ${cellsWithStats}, so no numbers are read`)
    }

    return []
  }

  const stats: ReadStats[] = []

  for (const { competition, first } of statsColumns) {
    const values = cells.slice(first, first + 3).map(plain)
    const unknown = values.find((value) => value !== '' && !/^\d{1,3}$/u.test(value) && !dash.test(value))

    if (unknown !== undefined) {
      warnings.push(`${name}: the ${competition} numbers have a value we do not know: '${unknown.slice(0, 40)}'`)
    } else if (!values.includes('')) {
      const [appearances = 0, goals = 0, assists = 0] = values.map((value) => (dash.test(value) ? 0 : Number(value)))

      stats.push({ appearances, assists, competition, goals })
    }
  }

  return stats
}

/** Takes the attributes off the front of a cell: `align="left" |[[Naam]]` is `[[Naam]]`. */
function stripAttributes(cell: string): string {
  return cell.replace(cellAttributes, '').trim()
}
