// Reads the squad of sc Heerenveen 1 (men) from the wikitext of the page of the season on the
// Dutch Wikipedia. The table under "Spelers" is written in two ways on the same page: all the
// cells of a row on one line, separated by `||`, and one cell to a line. This reader takes both
// as the same table. A page that has changed shape gives an error, never a guess, so the import
// keeps the squad it has.
import type { PlayerPosition } from '@fansite/db/schema'

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
   * The page the name links to, such as `Pim Verbeek (voetballer, 1999)`, with the addition
   * still on it. Null when the table does not link the name. Goals link to the same page.
   */
  wikipediaPage: null | string
}

export type ReadSquad = { kind: 'error'; message: string } | { kind: 'read'; players: ReadPlayer[] }

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
  let position: null | PlayerPosition = null

  for (const row of table.split(/^\|-.*$/gmu)) {
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

      const player = readPlayer(cells, position)

      if (typeof player === 'string') {
        return { kind: 'error', message: player }
      }
      players.push(player)
    }
  }

  return { kind: 'read', players }
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
 * the name. The cells after the name (contract, statistics) are left out.
 */
function readPlayer(cells: string[], position: PlayerPosition): ReadPlayer | string {
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

  return { name, position, searchTerm: searchTerm(name), shirtNumber, wikipediaPage: linkedPage(nameCell) }
}

/** Takes the attributes off the front of a cell: `align="left" |[[Naam]]` is `[[Naam]]`. */
function stripAttributes(cell: string): string {
  return cell.replace(cellAttributes, '').trim()
}
