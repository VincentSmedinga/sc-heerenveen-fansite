// Reads the squad of another club from the wikitext of its article on the Dutch Wikipedia
// (#1541): the table under the heading "Selectie". It uses the pieces of the reader of our own
// squad (`read-squad.ts`) for the cells, the names and the group headings, and finds the
// columns by their headings when the table has them. A table of another shape, or a section
// without a table, is an error and never a guess, so the import keeps the rows it has.
import type { PlayerPosition } from '@fansite/db/schema'

import { playerNameMaxLength } from '@fansite/db/schema'

import { dataCells, headerCells, nameOf, squadGroups } from './read-squad.ts'
import { clean, linkedPage, plain } from './read-wikipedia.ts'

/** One player of the squad of a club. */
export type ClubSquadPlayer = {
  name: string
  position: null | PlayerPosition
  shirtNumber: null | number
  /** The page the name links to, with the addition still on it, or null without a link. */
  wikipediaPage: null | string
}

export type ReadClubSquad =
  { kind: 'error'; message: string } | { kind: 'read'; players: ClubSquadPlayer[]; warnings: string[] }

/** The letters and the singular words of a position, besides the words of `squadGroups`. */
const positionLetters: Record<string, PlayerPosition> = {
  a: 'aanvaller',
  doelman: 'doelman',
  k: 'doelman',
  keeper: 'doelman',
  m: 'middenvelder',
  v: 'verdediger',
}

/** Where the columns are in the rows of one table: the index of each, or -1 for none. */
type Columns = { name: number; number: number; position: number }

/** The columns of a table that has no headings: number, flag and name, as our own table. */
const ownShape: Columns = { name: 2, number: 0, position: -1 }

/**
 * Reads the tables under the heading "Selectie" (also "Huidige selectie" and "Spelerskern"),
 * up to the next heading of the same level or higher. A heading of a lower level inside it,
 * such as one per position, is a group heading of the tables under it.
 */
export function readClubSquad(text: string): ReadClubSquad {
  const section = findSection(clean(text))

  if (section === undefined) {
    return { kind: 'error', message: 'the article has no section Selectie' }
  }

  const tables = section.split(/^(?=\{\|)/mu).filter((part) => part.startsWith('{|'))

  if (tables.length === 0) {
    return { kind: 'error', message: 'the section Selectie has no table' }
  }

  const players: ClubSquadPlayer[] = []
  const warnings: string[] = []
  let skipped = 0

  for (const table of tables) {
    const end = table.indexOf('\n|}')
    const body = end < 0 ? table : table.slice(0, end)
    const rows = body.split(/^\|-.*$/gmu)
    let columns: Columns | undefined
    let group: null | PlayerPosition = null

    for (const row of rows) {
      const header = headerCells(row)
      const cells = dataCells(row)

      if (header.length === 1 && cells.length === 0) {
        const heading = plain(header[0] ?? '').toLowerCase()

        group = Object.hasOwn(squadGroups, heading) ? (squadGroups[heading] ?? null) : null
      } else if (header.length > 1) {
        columns = columnsOf(header.map((cell) => plain(cell).toLowerCase()))
      } else if (cells.length > 0) {
        const player = readRow(cells, columns ?? ownShape, group)

        if (player === undefined) {
          skipped++
        } else {
          players.push(player)
        }
      }
    }
  }

  if (players.length === 0) {
    return { kind: 'error', message: 'the table under Selectie has no player we can read' }
  }
  if (skipped > 0) {
    warnings.push(`${skipped} ${skipped === 1 ? 'row' : 'rows'} of the table under Selectie could not be read`)
  }

  return { kind: 'read', players: dropDoubles(players), warnings }
}

/** The columns by their headings, or the shape of our own table when no heading says a name. */
function columnsOf(headings: string[]): Columns {
  const find = (pattern: RegExp) => headings.findIndex((heading) => pattern.test(heading))
  const name = find(/^(naam|speler)/u)

  if (name < 0) {
    return ownShape
  }

  return { name, number: find(/^(nr|#|nummer|no)\b/u), position: find(/^pos/u) }
}

/** Keeps the first of two rows with the same name, since a club has one row for a name. */
function dropDoubles(players: ClubSquadPlayer[]): ClubSquadPlayer[] {
  const seen = new Set<string>()

  return players.filter((player) => {
    const key = player.name.toLowerCase()

    if (seen.has(key)) {
      return false
    }

    seen.add(key)

    return true
  })
}

/**
 * The text between the heading "Selectie" and the next heading of the same level or higher.
 * A heading with more equals signs is inside the section, and so is the text before it.
 */
function findSection(text: string): string | undefined {
  const heading = /^(={2,6})[ \t]*(?:Huidige selectie|Selectie|Spelerskern)[ \t]*\1[ \t]*$/imu.exec(text)

  if (heading === null) {
    return undefined
  }

  const level = heading[1]?.length ?? 2
  const rest = text.slice(heading.index + heading[0].length)
  const next = new RegExp(`^={2,${level}}[^=\\n].*$`, 'mu').exec(rest)

  return next === null ? rest : rest.slice(0, next.index)
}

/** The position a cell names: a word of `squadGroups` or one letter, else null. */
function positionOf(cell: string): null | PlayerPosition {
  const word = plain(cell).toLowerCase().replace(/\.$/u, '')

  if (Object.hasOwn(squadGroups, word)) {
    return squadGroups[word] ?? null
  }

  return Object.hasOwn(positionLetters, word) ? (positionLetters[word] ?? null) : null
}

/** One row as a player, or undefined for a row with no usable name (a total, a note). */
function readRow(cells: string[], columns: Columns, group: null | PlayerPosition): ClubSquadPlayer | undefined {
  const nameCell = cells[columns.name]

  if (nameCell === undefined) {
    return undefined
  }

  const name = nameOf(nameCell)

  if (name === '' || name.length > playerNameMaxLength || /[{}[\]|<>=]/u.test(name)) {
    return undefined
  }

  const number = columns.number < 0 ? '' : plain(cells[columns.number] ?? '')
  const shirtNumber = /^\d{1,2}$/u.test(number) && Number(number) >= 1 ? Number(number) : null
  const position = columns.position < 0 ? group : (positionOf(cells[columns.position] ?? '') ?? group)

  return { name, position, shirtNumber, wikipediaPage: linkedPage(nameCell) }
}
