// Reads the squad of sc Heerenveen 1 from the page of a season on the Dutch Wikipedia, for the
// seasons 2007/08 to 2017/18. These pages have no table under "Spelers"; they have a section
// "Selectie" (or "Voorlopige selectie") in one of three forms:
//
// 1. 2007/08: a list with a flag, a name and the end of the contract, under a heading for the
//    contract. The list has no positions and no shirt numbers.
// 2. 2008/09 and 2009/10: a wide table with two players to a line (flag, name, previous club,
//    contract, twice), under a heading for each position. 2009/10 puts the shirt number in
//    front of the name; 2008/09 has none.
// 3. 2013/14 to 2017/18: a table with the shirt number, the name, the nationality, the date
//    of birth and the previous club in a row, under a heading for each position.
//
// The table in the section of the squad is all this reader looks at: a link in the text around
// it is not a player. A page without such a section gives `none`: the seasons 2010/11 to
// 2012/13 have no table. A section whose form is not one of the three gives an `error`, never
// a guess, so the import keeps what it has. The reader takes text and writes nothing; the
// import calls it (see `SeasonSquad`).
import type { PlayerPosition } from '@fansite/db/schema'

import { playerNameMaxLength } from '@fansite/db/schema'

import type { SeasonPlayer, SeasonSquad } from './season-squad.ts'

import { countryOfCell, countryWarning } from './read-country.ts'
import { dataCells, headerCells, nameOf, squadGroups } from './read-squad.ts'
import { clean, linkedPage, plain } from './read-wikipedia.ts'

/** A flag in front of a name or a club: `{{NL-VLAG}}`. */
const flag = /\{\{[A-Za-z0-9-]+-VLAG\}\}/gu

/** What marks the captain after a name: a link to a file, or the template `{{aanvoerder}}`. */
const captainMark = /\[\[(?:Bestand|File|Afbeelding|Image):[^\]]*\]\]|\{\{aanvoerder\}\}/giu

/** A cell with one link, such as `[[Brian Vandenbussche]]`, and nothing around it. */
const singleLink = /^\[\[[^\]]+\]\]$/u

/** A name that is not linked: letters, spaces, hyphens, apostrophes and dots. */
const writtenName = /^\p{L}[\p{L}'’. -]*$/u

/** A link to a year, such as `[[2011]]`: the end of a contract, not a name. */
const yearLink = /^\[\[\d{4}\]\]$/u

/** A shirt number in front of a name, such as the `25` in `25 [[Brian Vandenbussche]]`. */
const leadingNumber = /^(\d{1,2})\s+/u

/** A player as the page gives him, before the checks on the name. */
type Positioned = {
  cell: string
  /** The cell with the flag, or an empty string when the row has none. */
  countryCell: string
  position: null | PlayerPosition
  shirtNumber: null | number
}

/**
 * Reads the squad of a season in the shape every reader of a season returns. The section lists
 * the whole selection, so the source is `selectie`. The pages give no matches or goals.
 */
export function readSeasonSelection(text: string): SeasonSquad {
  const section = findSection(clean(text))

  if (section === undefined) {
    return { kind: 'none', reason: 'the page has no section Selectie or Voorlopige selectie' }
  }

  const warnings: string[] = []
  const candidates = readCandidates(section)

  if (typeof candidates === 'string') {
    return { kind: 'error', message: candidates }
  }
  if (candidates.length === 0) {
    return { kind: 'error', message: 'the section Selectie has no players' }
  }

  const players: SeasonPlayer[] = []

  for (const { cell, countryCell, position, shirtNumber } of candidates) {
    const name = nameOf(cell.replace(captainMark, ''))
    const linked = linkedPage(cell.replace(captainMark, ''))

    if (linked === null && (name.split(' ').length < 2 || name.includes('.'))) {
      warnings.push(`'${name.slice(0, 40)}' is left out: the name is not linked and not a full name`)
    } else if (name === '' || name.length > playerNameMaxLength || /[{}[\]|<>=]/u.test(name)) {
      return { kind: 'error', message: `a row of the section Selectie has no usable name: '${name.slice(0, 40)}'` }
    } else {
      const { country, problem } = countryOfCell(countryCell)

      if (problem !== null) {
        warnings.push(countryWarning(name, problem))
      }
      players.push({ appearances: null, country, goals: null, name, page: linked, position, shirtNumber })
    }
  }

  return {
    appearancesTotal: null,
    goalsTotal: null,
    kind: 'read',
    players,
    source: 'selectie',
    warnings,
  }
}

/** The text under the first heading `Selectie` or `Voorlopige selectie`, up to the next one. */
function findSection(text: string): string | undefined {
  const headings = [...text.matchAll(/^(={2,6})[ \t]*(.+?)[ \t]*\1[ \t]*$/gmu)]
  const index = headings.findIndex((heading) => /^(?:voorlopige )?selectie\b/iu.test(plain(heading[2] ?? '')))
  const heading = headings[index]

  if (heading === undefined) {
    return undefined
  }

  const start = heading.index + heading[0].length
  const next = headings[index + 1]

  return text.slice(start, next?.index ?? text.length)
}

/** Whether a cell holds a flag and nothing else. */
function isFlagCell(cell: string): boolean {
  return /\{\{[A-Za-z0-9-]+-VLAG\}\}/u.test(cell) && withoutFlags(cell) === ''
}

/** The players of the section, in whichever of the three forms it has. */
function readCandidates(section: string): Positioned[] | string {
  const table = /^\{\|[\s\S]*?^\|\}/mu.exec(section)

  if (table === null) {
    return /^\*/mu.test(section) ? readList(section) : 'the section Selectie has no list and no table'
  }

  return readTable(table[0])
}

/** The players of a bulleted list: `* {{NL-VLAG}} [[Name]] (medio 2008)`. */
function readList(section: string): Positioned[] | string {
  const players: Positioned[] = []

  for (const line of section.split('\n').map((value) => value.trim())) {
    if (line === '' || line.startsWith(';')) {
      continue
    }

    const match = line.startsWith('*')
      ? /^\*\s*((?:\{\{[A-Za-z0-9-]+-VLAG\}\}\s*)*)(\[\[[^\]]+\]\]|[^([{]+?)\s*(?:\(.*\))?$/u.exec(line)
      : null
    const cell = match?.[2]

    if (cell === undefined) {
      return `a line of the list Selectie has a shape we do not know: '${plain(line).slice(0, 40)}'`
    }
    players.push({ cell, countryCell: match?.[1] ?? '', position: null, shirtNumber: null })
  }

  return players
}

/** A row with the shirt number, the name and four more cells. Anything else is an error. */
function readNarrowRow(cells: string[], position: PlayerPosition): Positioned[] | string {
  const [numberCell = '', nameCell = '', countryCell = ''] = cells
  const number = plain(numberCell)

  if (cells.length < 4 || nameCell === '') {
    return `a row of the table Selectie has ${cells.length} cells, not four or more`
  }
  if (number !== '-' && number !== '' && !/^\d{1,2}$/u.test(number)) {
    return `a row of the table Selectie has a shirt number we do not know: '${number.slice(0, 40)}'`
  }

  const shirtNumber = /^\d{1,2}$/u.test(number) ? Number(number) : null

  if (shirtNumber !== null && (shirtNumber < 1 || shirtNumber > 99)) {
    return `a row of the table Selectie has a shirt number we do not know: '${number}'`
  }

  return [{ cell: nameCell, countryCell, position, shirtNumber }]
}

/** The players of the table, under the heading of their position. */
function readTable(table: string): Positioned[] | string {
  const rows = table.split(/^\|-.*$/gmu)
  const columns = rows.flatMap(headerCells).map((cell) => plain(cell).toLowerCase())
  const wide = columns.filter((name) => name === 'speler').length === 2
  const narrow = columns.includes('naam')

  if (wide === narrow) {
    return 'the table of the section Selectie has columns we do not know'
  }

  const players: Positioned[] = []
  let position: null | PlayerPosition = null

  for (const row of rows) {
    const headers = headerCells(row).filter((cell) => cell !== '')
    const cells = dataCells(row)
    const heading =
      headers.length === 1 ? headers[0] : headers.length === 0 && cells.length === 1 ? cells[0] : undefined

    if (heading !== undefined) {
      const name = plain(heading).toLowerCase()

      if (!Object.hasOwn(squadGroups, name)) {
        return `the table of the section Selectie has a heading we do not know: '${plain(heading).slice(0, 40)}'`
      }
      position = squadGroups[name] ?? null
    } else if (cells.length > 0) {
      if (position === null) {
        return 'the table of the section Selectie has a player above the first heading'
      }

      const found = wide ? readWideRow(row, position) : readNarrowRow(cells, position)

      if (typeof found === 'string') {
        return found
      }
      players.push(...found)
    }
  }

  return players
}

/**
 * The players on the lines of a row of the wide table. A line holds one or two players, each as
 * a cell with a flag, then a cell with the name (and a shirt number before it in 2009/10).
 * The cell after a flag is the name; a flag with an empty cell after it is a gap in the table.
 */
function readWideRow(row: string, position: PlayerPosition): Positioned[] | string {
  const players: Positioned[] = []

  for (const line of row.split('\n')) {
    if (!line.startsWith('|') || /^\|[-+}]/u.test(line)) {
      continue
    }

    const cells = line
      .slice(1)
      .split('||')
      .map((cell) => cell.trim())

    for (const [index, cell] of cells.entries()) {
      const next = cells[index + 1]

      if (!isFlagCell(cell) || next === undefined || next === '') {
        continue
      }

      const [, shirt] = leadingNumber.exec(next) ?? []
      const rest = next.replace(leadingNumber, '')

      if (!singleLink.test(rest) && !writtenName.test(rest)) {
        return `a row of the table Selectie has a cell after a flag that is not a name: '${plain(next).slice(0, 40)}'`
      }
      if (!yearLink.test(rest)) {
        players.push({
          cell: rest,
          countryCell: cell,
          position,
          shirtNumber: shirt === undefined ? null : Number(shirt),
        })
      }
    }
  }

  return players
}

/** The text of a cell without the flags, the line breaks and the marks that open a cell. */
function withoutFlags(cell: string): string {
  return cell
    .replace(flag, '')
    .replace(/<br\s*\/?>/giu, '')
    .replace(/[|\s]/gu, '')
}
