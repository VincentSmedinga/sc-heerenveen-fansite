// Reads the lists of transfers on the page of a season on the Dutch Wikipedia, for 2006/07 to
// 2017/18, and the list of scorers on the page of 2006/07. The pages of these seasons have no
// squad table that is complete (2006/07 and 2010/11 to 2012/13 have no table at all), but they
// name the players who came, went, were loaned out or came back, under the heading "Transfers"
// or "Mutaties". The lists come in these forms:
//
// 1. 2006/07: a heading Zomer and a heading Winter, each with a table Nieuw and a table Weg.
// 2. 2007/08: one table for each kind (Aangetrokken, Terugkerende, Vertrokken, Verhuurde and
//    Gestopte spelers) with the kind in its caption, and no summer or winter.
// 3. 2008/09 and 2009/10: a table for each kind under a heading Aangetrokken, Vertrokken or
//    Verhuurd. 2008/09 puts a row "Winterstop" between summer and winter in the tables of
//    arrivals and loans; its table of departures has none. 2008/09 also lists the players who
//    come next season, and both pages list the technical staff; those are not players of this
//    season and are left out.
// 4. 2010/11: a flat table of arrivals, and for departures and loans a column Zomer and a
//    column Winter, each with a small table.
// 5. 2011/12 to 2017/18: the same columns for arrivals, departures and loans.
//
// Who counts for the season: a player who came (summer or winter), who was loaned out, who came
// back from a loan, and who left in the winter. A player who left in the summer before the
// season did not take part in it, so he is left out, unless the row says he was loaned out. A
// page that does not tell the summer from the winter for its departures gives no departing
// player at all: a missing player is a gap, a player who is there by mistake is an error nobody
// sees again (decision of 5 November 2026).
//
// A page without the heading, or with a heading but no list, gives `none`. A page whose lists
// are not what this reader knows gives an `error`, never a guess, so the import keeps what it
// has. The reader takes text and writes nothing; the import calls it (see `SeasonSquad`).
import { playerNameMaxLength } from '@fansite/db/schema'

import type { SeasonPlayer, SeasonSquad } from './season-squad.ts'

import { nameKey } from './read-squad.ts'
import { clean, linkedPage, plain } from './read-wikipedia.ts'

/** What a list is about: players who came, players who left, or players on loan. */
type Group = 'arrived' | 'departed' | 'ignored' | 'loaned'

/** A heading of the text with the level it has: `==` is 2. */
type Heading = { level: number; title: string }

/** Where a list sits in the year: before the season, or in the winter break. */
type Window = 'summer' | 'winter'

/** The window of a heading or a bold label, and the level of the heading that set it. */
type WindowAt = null | { level: number; window: Window }

/** The level of a bold label `Zomer` or `Winter`: it has none, so a heading ends it. */
const boldLevel = 99

/**
 * What an attribute in front of a cell looks like: `align="left" |`, `align='left' |` or
 * `align=left|`, with or without quotes.
 */
const cellAttributes = /^(?:\s*[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'|]+))+\s*\|(?!\|)/iu

/** A flag in front of a name: `{{NL-VLAG}}`. */
const flag = /\{\{[A-Za-z0-9-]+-VLAG\}\}/gu

/** A number of goals: a few digits. */
const count = /^\d{1,3}$/u

const headingLine = /^(={2,6})[ \t]*(.*?)[ \t]*\1[ \t]*$/u

/**
 * Reads the list of scorers under the heading "Doelpuntenmakers": a small table for each
 * competition with a name and the goals. A player who scored in two competitions is one player,
 * with his goals added up. The row "Totaal" is left out. The source is `doelpunten`.
 */
export function readSeasonScorers(text: string): SeasonSquad {
  const lines = sectionLines(clean(text), /^doelpuntenmakers$/iu)

  if (lines === undefined) {
    return { kind: 'none', reason: 'the page has no section Doelpuntenmakers' }
  }

  const tables = leafTables(lines)

  if (tables === null) {
    return { kind: 'error', message: 'a table in the section Doelpuntenmakers is not closed' }
  }
  if (tables.length === 0) {
    return { kind: 'none', reason: 'the section Doelpuntenmakers has no table' }
  }

  const warnings: string[] = []
  const players = new Map<string, SeasonPlayer>()

  for (const table of tables) {
    const problem = readScorerTable(table.lines, players, warnings)

    if (problem !== undefined) {
      return { kind: 'error', message: problem }
    }
  }
  if (players.size === 0) {
    return { kind: 'error', message: 'the tables of scorers have no players' }
  }

  const all = [...players.values()]

  return {
    appearancesTotal: null,
    goalsTotal: all.reduce((total, player) => total + (player.goals ?? 0), 0),
    kind: 'read',
    players: all,
    source: 'doelpunten',
    warnings,
  }
}

/**
 * Reads the players of the lists of transfers in the shape every reader of a season returns.
 * The source is `transfers`: only the players who came or went, not the whole selection.
 */
export function readSeasonTransfers(text: string): SeasonSquad {
  const lines = sectionLines(clean(text), /^(?:transfers|mutaties)$/iu)

  if (lines === undefined) {
    return { kind: 'none', reason: 'the page has no section Transfers or Mutaties' }
  }

  const tables = leafTables(lines)

  if (tables === null) {
    return { kind: 'error', message: 'a table in the section Transfers is not closed' }
  }
  if (tables.length === 0) {
    return { kind: 'none', reason: 'the section Transfers has no list' }
  }

  const warnings: string[] = []
  const players = new Map<string, SeasonPlayer>()
  const inside = new Set(
    tables.flatMap((table) => Array.from({ length: table.end - table.start + 1 }, (_, offset) => table.start + offset)),
  )
  let group: Group | null = null
  let windowAt: WindowAt = null

  for (const [index, line] of lines.entries()) {
    const table = tables.find((candidate) => candidate.start === index)

    if (table !== undefined) {
      const problem = readTable(table.lines, group, windowAt?.window ?? null, players, warnings)

      if (problem !== undefined) {
        return { kind: 'error', message: problem }
      }
    } else if (!inside.has(index)) {
      const heading = headingOf(line)
      const label = windowOf(/^'''(.+?)'''$/u.exec(line.trim())?.[1] ?? '')

      if (heading !== undefined) {
        const found = windowOf(heading.title)

        if (found !== undefined) {
          windowAt = { level: heading.level, window: found }
          group = null
        } else {
          const known = groupOf(heading.title)

          if (known === undefined) {
            return {
              kind: 'error',
              message: `the section Transfers has a heading we do not know: '${plain(heading.title).slice(0, 40)}'`,
            }
          }
          group = known
          if (windowAt !== null && windowAt.level >= heading.level) {
            windowAt = null
          }
        }
      } else if (label !== undefined) {
        windowAt = { level: boldLevel, window: label }
      }
    }
  }

  if (players.size === 0) {
    return { kind: 'error', message: 'the lists of transfers have no players' }
  }

  return {
    appearancesTotal: null,
    goalsTotal: null,
    kind: 'read',
    players: [...players.values()],
    source: 'transfers',
    warnings,
  }
}

/** The title of the page of a season from 2007/08 on: the same as for the squad. */
export function transfersPageTitle(season: string): string {
  return season === '2006/07'
    ? `Sc Heerenveen in het seizoen ${season}`
    : `Sc Heerenveen in het seizoen ${season} (mannen)`
}

/** Adds a player, or keeps the first row of a player who is in more than one list. */
function addPlayer(players: Map<string, SeasonPlayer>, name: string, page: null | string, goals: null | number): void {
  const key = nameKey(page ?? name)
  const earlier = players.get(key)

  if (earlier === undefined) {
    players.set(key, { appearances: null, goals, name, page, position: null, shirtNumber: null })
  } else if (goals !== null) {
    earlier.goals = (earlier.goals ?? 0) + goals
  }
}

/** The cells on the first line of a row that starts with `|`, without attributes. */
function cellsOf(row: string[]): string[] {
  const line = row.find((candidate) => candidate.startsWith('|') && !/^\|[+}]/u.test(candidate))

  return line === undefined
    ? []
    : line
        .slice(1)
        .split('||')
        .map((cell) => cell.replace(cellAttributes, '').trim())
}

/** The text of the first column heading of a table, without the attributes in front of it. */
function firstHeading(lines: string[]): string | undefined {
  const header = lines.find((line) => line.startsWith('!'))

  return header === undefined
    ? undefined
    : plain(
        header
          .slice(1)
          .split('!!')[0]
          ?.replace(/^[^|[]*\|/u, '') ?? '',
      ).toLowerCase()
}

/** The group of a heading or a caption, or undefined when we do not know it. */
function groupOf(title: string): Group | undefined {
  const text = plain(title).toLowerCase()

  if (/staf|directie|volgend seizoen/u.test(text)) {
    return 'ignored'
  }
  if (/^(?:aangetrokken|nieuw|terugkerende)\b/u.test(text)) {
    return 'arrived'
  }
  if (/^(?:vertrokken|weg|gestopte)\b/u.test(text)) {
    return 'departed'
  }
  if (/^verhuur/u.test(text)) {
    return 'loaned'
  }

  return undefined
}

function headingOf(line: string): Heading | undefined {
  const match = headingLine.exec(line)

  return match === null ? undefined : { level: (match[1] ?? '').length, title: match[2] ?? '' }
}

/**
 * The tables that hold no table of their own, with the line they start on and end on. Null when
 * a table is not closed.
 */
function leafTables(lines: string[]): null | { end: number; lines: string[]; start: number }[] {
  const open: { hasChild: boolean; start: number }[] = []
  const leaves: { end: number; lines: string[]; start: number }[] = []

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
        leaves.push({ end: index, lines: lines.slice(table.start, index + 1), start: table.start })
      }
    }
  }

  return open.length === 0 ? leaves.toSorted((a, b) => a.start - b.start) : null
}

/**
 * The name in the first cell of a row: what the first link shows, or the title of the page
 * without a disambiguation like `(voetballer)`. A cell without a link must give a full name.
 * Returns a problem when the cell is not a name at all, and a skip when it is a name we cannot
 * keep.
 */
function nameOf(cell: string): { name: string; page: null | string } | { problem: string } | { skip: string } {
  const text = cell.replace(flag, '').trim()
  const link = /\[\[[^\]]*\]\]/u.exec(text)?.[0]

  if (link !== undefined) {
    const page = linkedPage(link)
    const name = /\[\[[^\]|]*\|/u.test(link) ? plain(link) : plain(link).replace(/\s*\([^()]*\)$/u, '')

    if (page === null || name === '' || name.length > playerNameMaxLength || /[{}[\]|<>=]/u.test(name)) {
      return { problem: `a row has a link we do not know as a name: '${plain(cell).slice(0, 40)}'` }
    }

    return { name, page }
  }

  const name = plain(text.replace(/^[\s/&]+/u, ''))

  if (name === '' || name.length > playerNameMaxLength || /[{}[\]|<>=]/u.test(name)) {
    return { problem: `a row has no usable name: '${plain(cell).slice(0, 40)}'` }
  }
  if (!/\s/u.test(name) || name.split(/\s+/u).some((word) => word.endsWith('.'))) {
    return { skip: `'${name}' is left out: the name is not linked and not a full name` }
  }

  return { name, page: null }
}

/** Reads one table of scorers into `players`. Returns what is wrong, or undefined. */
function readScorerTable(lines: string[], players: Map<string, SeasonPlayer>, warnings: string[]): string | undefined {
  const headings = lines.filter((line) => line.startsWith('!')).map((line) => plain(line.slice(1)).toLowerCase())

  if (headings[0] !== 'naam' || headings[1] !== 'doelpunten') {
    return 'a table of scorers does not have the column headings Naam and Doelpunten'
  }

  for (const row of rowsOf(lines)) {
    const [nameCell = '', goalsCell = ''] = cellsOf(row)

    if (cellsOf(row).length === 0) {
      continue
    }
    if (plain(nameCell).toLowerCase() === 'totaal') {
      continue
    }

    const who = nameOf(nameCell)

    if ('problem' in who) {
      return who.problem
    }
    if ('skip' in who) {
      warnings.push(who.skip)
      continue
    }
    if (!count.test(plain(goalsCell))) {
      return `${who.name} has a number of goals we do not know: '${plain(goalsCell).slice(0, 40)}'`
    }
    addPlayer(players, who.name, who.page, Number(plain(goalsCell)))
  }

  return undefined
}

/** Reads one table of transfers into `players`. Returns what is wrong, or undefined. */
function readTable(
  lines: string[],
  heading: Group | null,
  windowBefore: null | Window,
  players: Map<string, SeasonPlayer>,
  warnings: string[],
): string | undefined {
  const caption = lines.find((line) => line.startsWith('|+'))
  const group = caption === undefined ? heading : groupOf(caption.slice(2))

  if (group === undefined || group === null) {
    return caption === undefined
      ? 'a table of transfers has no heading above it'
      : `a table of transfers has a caption we do not know: '${plain(caption.slice(2)).slice(0, 40)}'`
  }
  if (group === 'ignored') {
    return undefined
  }

  const first = firstHeading(lines)

  if (first !== 'speler' && first !== 'naam') {
    return 'a table of transfers does not have the column heading Speler or Naam'
  }

  let window = windowBefore

  for (const row of rowsOf(lines)) {
    const cells = cellsOf(row)

    if (cells.some((cell) => plain(cell).toLowerCase() === 'winterstop')) {
      window = 'winter'
    } else if (cells.some((cell) => plain(cell) !== '')) {
      const [nameCell = '', , ...rest] = cells
      const remark = plain(rest.join(' '))
      const counts =
        group !== 'departed' || window === 'winter' || (window === 'summer' && /^verhuurd\b/iu.test(remark))

      if (plain(nameCell) === '') {
        return 'a row of a table of transfers has no name'
      }

      const who = nameOf(nameCell)

      if ('problem' in who) {
        return who.problem
      }
      if ('skip' in who) {
        if (counts) {
          warnings.push(who.skip)
        }
      } else if (counts) {
        addPlayer(players, who.name, who.page, null)
      }
    }
  }

  return undefined
}

/** The rows of a table, split on the lines that start with `|-`. */
function rowsOf(lines: string[]): string[][] {
  const rows: string[][] = [[]]

  for (const line of lines) {
    if (line.startsWith('|-')) {
      rows.push([])
    } else {
      rows.at(-1)?.push(line)
    }
  }

  return rows
}

/**
 * The lines under the first heading of level 2 whose title matches, up to the next heading of
 * level 2. Undefined when the page has no such heading.
 */
function sectionLines(text: string, title: RegExp): string[] | undefined {
  const lines = text.split('\n')
  const start = lines.findIndex((line) => {
    const heading = headingOf(line)

    return heading?.level === 2 && title.test(plain(heading.title))
  })

  if (start < 0) {
    return undefined
  }

  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => headingOf(line)?.level === 2)

  return end < 0 ? rest : rest.slice(0, end)
}

/** `zomer` or `winter` as the title of a heading or a label, undefined for anything else. */
function windowOf(title: string): undefined | Window {
  const text = plain(title).toLowerCase()

  return text === 'zomer' ? 'summer' : text === 'winter' ? 'winter' : undefined
}
