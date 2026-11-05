// Reads the players who played from the page of a season on the Dutch Wikipedia, for 1990/91
// to 1999/00 and 2005/06. These pages have no squad table: they name the players in a
// table of statistics, in one of two forms.
//
// 1. 1990/91 to 1999/00: under the heading "Aantal wedstrijden/doelpunten" one small table for
//    each competition, with a link, the matches and the goals of each player. A player who
//    played in two competitions is in two tables; his numbers are added up. The table of a
//    competition ends with the own goals of other clubs' players and a row "Totaal"; both are
//    left out, because a row there is not one of our players.
// 2. 2005/06: under the heading "Statistieken" one table with a group heading for each
//    position, and the shirt number, the date of birth and the matches and goals of each
//    competition in a row.
//
// A page without such a heading or table gives `none`. A page whose table is not what this
// reader knows gives an `error`, never a guess, so the import keeps what it has. The reader
// takes text and writes nothing; the import calls it (see `SeasonSquad`).
import type { PlayerPosition } from '@fansite/db/schema'

import { playerNameMaxLength } from '@fansite/db/schema'

import type { SeasonPlayer, SeasonSquad } from './season-squad.ts'

import { nameKey, squadGroups } from './read-squad.ts'
import { clean, linkedPage, plain } from './read-wikipedia.ts'

/** One player in one table, before the players of the tables are put together. */
type Row = {
  appearances: null | number
  goals: null | number
  name: string
  page: null | string
  position: null | PlayerPosition
  shirtNumber: null | number
}

/** A heading of the page and the text under it, up to the next heading of any level. */
type Section = { body: string; title: string }

/** A number of matches or goals: a few digits. */
const count = /^\d{1,3}$/u

/**
 * What an attribute in front of a cell looks like: `align="left" |`, `align='left' |` or
 * `align=left|`, with or without quotes.
 */
const cellAttributes = /^(?:\s*[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'|]+))+\s*\|(?!\|)/iu

/** A flag in front of a name: `{{NL-VLAG}}` or `{{DK-VLAG|15}}`. */
const flag = /\{\{[A-Za-z0-9-]+-VLAG(?:\|[^{}]*)?\}\}/gu

/**
 * Reads the table of players of a season page in the shape every reader of a season returns.
 * The source is `statistieken`: the players who played, not the whole selection.
 */
export function readSeasonStatistics(text: string): SeasonSquad {
  const sections = sectionsOf(clean(text))
  const withTable = (kind: RegExp) =>
    sections.find((section) => kind.test(plain(section.title)) && section.body.includes('{|'))
  const matches = withTable(/^Aantal wedstrijden\/doelpunten$/iu)
  const statistics = withTable(/^Statistieken\b/iu)
  const section = matches ?? statistics

  if (section === undefined) {
    return { kind: 'none', reason: 'the page has no table under Aantal wedstrijden/doelpunten or Statistieken' }
  }

  const warnings: string[] = []
  const rows =
    matches === undefined ? readPositionTable(section.body, warnings) : readMatchTables(section.body, warnings)

  if (typeof rows === 'string') {
    return { kind: 'error', message: rows }
  }
  if (rows.length === 0) {
    return { kind: 'error', message: 'the table of statistics has no players' }
  }

  const players = rows.map((row): SeasonPlayer => ({
    appearances: row.appearances,
    goals: row.goals,
    name: row.name,
    page: row.page,
    position: row.position,
    shirtNumber: row.shirtNumber,
  }))

  return {
    appearancesTotal: totalOf(players.map((player) => player.appearances)),
    goalsTotal: totalOf(players.map((player) => player.goals)),
    kind: 'read',
    players,
    source: 'statistieken',
    warnings,
  }
}

/** The title of the page of a season before 2006/07: `Sc Heerenveen in het seizoen 1995/96`. */
export function statisticsPageTitle(season: string): string {
  return `Sc Heerenveen in het seizoen ${season}`
}

/** The sum of two numbers of the same player, null when either is not known. */
function add(first: null | number, second: null | number): null | number {
  return first === null || second === null ? null : first + second
}

/** The cells of a row on the lines that start with `|`, in both writings, without attributes */
function dataCells(row: string): string[] {
  const cells: string[] = []

  for (const line of row.split('\n')) {
    if (line.startsWith('|') && !/^\|[}+]/u.test(line)) {
      cells.push(...line.slice(1).split('||').map(stripAttributes))
    }
  }

  return cells
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

/** The tables that hold no table of their own, in the text. Null when a table is not closed. */
function leafTables(body: string): null | string[] {
  const lines = body.split('\n')
  const open: { hasChild: boolean; start: number }[] = []
  const leaves: string[] = []

  for (const [index, line] of lines.entries()) {
    if (line.startsWith('{|')) {
      const parent = open.at(-1)

      if (parent !== undefined) {
        parent.hasChild = true
      }
      open.push({ hasChild: false, start: index })
    } else if (line.startsWith('|}')) {
      const table = open.pop()

      if (table === undefined) {
        return null
      }
      if (!table.hasChild) {
        leaves.push(lines.slice(table.start, index + 1).join('\n'))
      }
    }
  }

  return open.length === 0 ? leaves : null
}

/** What a link shows, or the title of the page without a disambiguation like `(voetballer)`. */
function linkedName(link: string): string {
  const name = plain(link)

  return /\[\[[^\]|]*\|/u.test(link) ? name : name.replace(/\s*\([^()]*\)$/u, '')
}

/**
 * Adds the numbers of a player to the earlier row of the same player, or appends him. Players
 * are the same when their names are the same without accents, since a page writes one name two
 * ways at times (`Mitriță` and `Mitriţă` on the page of 1998/99).
 */
function mergeRow(rows: Map<string, Row>, row: Row): void {
  const key = nameKey(row.name)
  const earlier = rows.get(key)

  if (earlier === undefined) {
    rows.set(key, row)
  } else {
    earlier.appearances = add(earlier.appearances, row.appearances)
    earlier.goals = add(earlier.goals, row.goals)
  }
}

/**
 * The name of a cell: what the link shows, or the title of the page without a disambiguation
 * like `(voetballer)`. A cell without a link must give a full name, since a surname such as
 * `v. Amersfoort` is not one we can keep. Anything else in the cell is an error.
 */
function nameOf(cell: string): string | { name: string; page: null | string } {
  const text = cell
    .replace(/\{\{nowrap\|((?:[^{}]|\{\{[^{}]*\}\})*)\}\}/giu, '$1')
    .replace(flag, '')
    .trim()
  const links = text.match(/\[\[[^\]]*\]\]/gu) ?? []
  const [link] = links

  if (links.length > 1 || (link !== undefined && text !== link) || /[{}]/u.test(text)) {
    return `a row has a name cell we do not know: '${plain(cell).slice(0, 40)}'`
  }

  const name = link === undefined ? plain(text) : linkedName(link)
  const full = link !== undefined || (/\s/u.test(name) && !name.split(/\s+/u).some((word) => word.endsWith('.')))

  if (name === '' || name.length > playerNameMaxLength || /[{}[\]|<>=]/u.test(name) || !full) {
    return `a row has no usable name: '${plain(cell).slice(0, 40)}'`
  }

  return { name, page: linkedPage(text) }
}

/**
 * A number of matches or goals. A cell that is not a number (a typo such as '`3', or a dash) is
 * left out with a warning that names the player: the player was there, only the number is not
 * sure. A dash is not taken for a zero.
 */
function numberOf(cell: string, name: string, what: string, warnings: string[]): null | number {
  const value = plain(cell)

  if (count.test(value)) {
    return Number(value)
  }
  warnings.push(`${name}: the ${what} '${value.slice(0, 40)}' is not a number, so it is left out`)

  return null
}

/** The position under a group heading such as `[[Doelverdediger (voetbal)|Doel]]`. */
function positionOf(cell: string): null | PlayerPosition {
  const target = /\[\[([^\]|#]*)/u.exec(cell)?.[1]?.replace(/\s*\([^()]*\)$/u, '')
  const keys = [target, plain(cell)].map((key) => key?.trim().toLowerCase())

  for (const key of keys) {
    if (key !== undefined && Object.hasOwn(squadGroups, key)) {
      return squadGroups[key] ?? null
    }
  }

  return null
}

/** A row of four cells (rank, name, matches, goals), or three below a shared rank. */
function readMatchRow(cells: string[], rows: Map<string, Row>, warnings: string[]): string | undefined {
  if (cells.length !== 3 && cells.length !== 4) {
    return `a row of a table of matches and goals has ${cells.length} cells, not three or four`
  }

  const [nameCell = '', appearancesCell = '', goalsCell = ''] = cells.length === 4 ? cells.slice(1) : cells
  const who = nameOf(nameCell)

  if (typeof who === 'string') {
    return who
  }

  const appearances = numberOf(appearancesCell, who.name, 'matches', warnings)
  const goals = numberOf(goalsCell, who.name, 'goals', warnings)

  mergeRow(rows, { appearances, goals, name: who.name, page: who.page, position: null, shirtNumber: null })

  return undefined
}

/** Adds the players of one competition to `rows`. Returns what is wrong, or undefined. */
function readMatchTable(table: string, rows: Map<string, Row>, warnings: string[]): string | undefined {
  let ownGoals = false
  let hasHeader = false

  for (const row of table.split(/^\|-.*$/gmu)) {
    const header = headerCells(row).map((cell) => plain(cell).toLowerCase())
    const cells = dataCells(row)

    if (header.length > 0 && cells.length === 0) {
      if (header.includes('naam') && header.includes('aw')) {
        hasHeader = true
      } else if (header.length === 1 && header[0]?.startsWith('eigen doelpunt') === true) {
        ownGoals = true
      } else if (header.length > 1) {
        return 'a table of matches and goals does not have the column headings Naam and AW'
      } else {
        return `a table of matches and goals has a heading we do not know: '${(header[0] ?? '').slice(0, 40)}'`
      }
    } else if (cells.length > 0) {
      if (!hasHeader) {
        return 'a table of matches and goals has a row above its column headings'
      }
      if (cells.some((cell) => plain(cell) === 'Totaal')) {
        ownGoals = false
      } else if (!ownGoals) {
        const problem = readMatchRow(cells, rows, warnings)

        if (problem !== undefined) {
          return problem
        }
      }
    }
  }

  return hasHeader ? undefined : 'a table of matches and goals has no column headings Naam and AW'
}

/**
 * Reads the small tables of a competition under "Aantal wedstrijden/doelpunten". A row has a
 * rank (left out in a row below a shared rank), a name, the matches and the goals. The rows
 * under "Eigen doelpunt" up to the row "Totaal" are goals of players of other clubs.
 */
function readMatchTables(body: string, warnings: string[]): Row[] | string {
  const tables = leafTables(body)

  if (tables === null || tables.length === 0) {
    return 'the table of matches and goals is not closed, or has no table of a competition'
  }

  const rows = new Map<string, Row>()

  for (const table of tables) {
    const problem = readMatchTable(table, rows, warnings)

    if (problem !== undefined) {
      return problem
    }
  }

  return [...rows.values()]
}

/** A row: shirt number, name, date of birth, then the matches and goals of each competition. */
function readPositionRow(
  cells: string[],
  competitions: number,
  position: PlayerPosition,
  warnings: string[],
): Row | string {
  if (cells.length !== 3 + competitions * 2) {
    return `a row of the table of statistics has ${cells.length} cells, not ${3 + competitions * 2}`
  }

  const [numberCell = '', nameCell = '', , ...numbers] = cells
  const who = nameOf(nameCell)

  if (typeof who === 'string') {
    return who
  }

  const shirt = plain(numberCell)

  if (!/^\d{1,2}$/u.test(shirt) || Number(shirt) < 1) {
    return `${who.name} has a shirt number we do not know: '${shirt.slice(0, 40)}'`
  }

  let appearances: null | number = 0
  let goals: null | number = 0

  for (const [index, cell] of numbers.entries()) {
    const matches = index % 2 === 0
    const value = numberOf(cell, who.name, matches ? 'matches' : 'goals', warnings)

    if (matches) {
      appearances = add(appearances, value)
    } else {
      goals = add(goals, value)
    }
  }

  return { appearances, goals, name: who.name, page: who.page, position, shirtNumber: Number(shirt) }
}

/**
 * Reads the table with a group heading for each position. The first two header rows name the
 * columns: shirt number, name, date of birth, then a group of two (matches and goals) for each
 * competition. A row has that many cells, and the numbers of the competitions are added up.
 */
function readPositionTable(body: string, warnings: string[]): Row[] | string {
  const tables = leafTables(body)
  const [table] = tables ?? []

  if (tables === null || tables.length !== 1 || table === undefined) {
    return 'the table of statistics is not closed, or the section holds more than one table'
  }

  const rows: Row[] = []
  let competitions: number | undefined
  let position: null | PlayerPosition = null

  for (const row of table.split(/^\|-.*$/gmu)) {
    const header = headerCells(row)
    const cells = dataCells(row)

    if (header.length > 0 && cells.length === 0) {
      if (header.length === 1) {
        position = positionOf(header[0] ?? '')

        if (position === null) {
          return `the table of statistics has a group heading we do not know: '${plain(header[0] ?? '').slice(0, 40)}'`
        }
      } else if (competitions === undefined) {
        const [, name, born] = header.map((cell) => plain(cell))

        if (name !== 'Naam' || born !== 'Geboren' || header.length < 4) {
          return 'the table of statistics does not have the columns Naam and Geboren'
        }
        competitions = header.length - 3
      } else if (header.length !== competitions * 2) {
        return `the table of statistics has ${header.length} columns of numbers for ${competitions} competitions`
      }
    } else if (cells.length > 0) {
      if (competitions === undefined || position === null) {
        return 'the table of statistics has a player above its column headings or its first group heading'
      }

      const read = readPositionRow(cells, competitions, position, warnings)

      if (typeof read === 'string') {
        return read
      }
      rows.push(read)
    }
  }

  return rows
}

/** The headings of the text, each with the text under it up to the next heading. */
function sectionsOf(text: string): Section[] {
  const headings = [...text.matchAll(/^(={2,6})[ \t]*(.*?)[ \t]*\1[ \t]*$/gmu)]

  return headings.map((heading, index) => {
    const start = heading.index + heading[0].length
    const end = headings[index + 1]?.index ?? text.length

    return { body: text.slice(start, end), title: heading[2] ?? '' }
  })
}

function stripAttributes(cell: string): string {
  return cell.replace(cellAttributes, '').trim()
}

/** The sum of what the players have, or null when a player's number is not known. */
function totalOf(numbers: (null | number)[]): null | number {
  return numbers.reduce<null | number>((total, number) => add(total, number), 0)
}
