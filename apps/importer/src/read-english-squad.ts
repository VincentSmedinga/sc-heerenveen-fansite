// Reads the squad of sc Heerenveen 1 from the page of a season on the English Wikipedia, for
// the five seasons that have no page with a squad on the Dutch one: 2018/19 to 2021/22 and
// 2024/25 (`2018–19 SC Heerenveen season`, with an en dash). The pages come in two forms, and
// a page may have both:
//
// 1. A list under "First-team squad", written as the template `{{Fs player}}` with a shirt
//    number, a position and a name, and sometimes a second list "Out on loan". 2018/19,
//    2020/21, 2021/22 and 2024/25 have it; 2019/20 does not.
// 2. Tables of transfers under "Transfers" or "Player Transfers", one for "In" and one for
//    "Out". 2019/20 and 2024/25 have rows; 2018/19 has no table, and the tables of 2020/21 and
//    2021/22 are empty or hold a row of the template that nobody filled in.
//
// Who counts from the transfers: a player who came, a player who was loaned out and a player
// who left in the winter (January to March). A player who left in the summer for good did not
// take part in the season, so he is left out, as in `read-transfers.ts`. A player who left
// without a date we can read is left out with a warning: a missing player is a gap, a player
// who is there by mistake is an error nobody sees again. A player on both lists is one
// player, with the shirt number of the squad.
//
// The names link to pages of the English Wikipedia, whose titles differ from the Dutch ones
// (`Charlie Webster (footballer)` against `Charlie Webster`). So a player gets a name and no
// page: the link with the goals runs through the name (see `playerLinker`). The source is
// `engels`. The pages give no matches or goals.
//
// A page without a squad and without transfers gives `none`. A page whose squad or tables are
// not what this reader knows gives an `error`, never a guess, so the import keeps what it has.
// The reader takes text and writes nothing; the import calls it (see `SeasonSquad`).
import type { PlayerPosition } from '@fansite/db/schema'

import { playerNameMaxLength } from '@fansite/db/schema'

import type { SeasonPlayer, SeasonSquad } from './season-squad.ts'

import { dataCells, headerCells, nameKey, nameOf } from './read-squad.ts'
import { clean, plain } from './read-wikipedia.ts'

/** A player as a list or a table gives him, before the lists are put together. */
type Found = { name: string; position: null | PlayerPosition; shirtNumber: null | number }

/** A heading of the text: its level (`==` is 2), its title, and where its text runs. */
type Heading = { end: number; level: number; start: number; title: string }

/** The pages of the English Wikipedia with a squad, per season. */
const englishSquadPages: Readonly<Record<string, string>> = {
  '2018/19': '2018–19 SC Heerenveen season',
  '2019/20': '2019–20 SC Heerenveen season',
  '2020/21': '2020–21 SC Heerenveen season',
  '2021/22': '2021–22 SC Heerenveen season',
  '2024/25': '2024–25 SC Heerenveen season',
}

/** The positions the template and the tables use. */
const positions: Readonly<Record<string, PlayerPosition>> = {
  df: 'verdediger',
  fw: 'aanvaller',
  gk: 'doelman',
  mf: 'middenvelder',
}

const months = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

/** Months in which the winter window of the transfers falls: January to March. */
const winterMonths = new Set([1, 2, 3])

/**
 * The title of the page of a season on the English Wikipedia, or undefined when that season has
 * none we read. The seasons are listed by hand: the Dutch Wikipedia has a page for the other
 * seasons, and a season is added here after someone has read its English page.
 */
export function englishSquadPage(season: string): string | undefined {
  return Object.hasOwn(englishSquadPages, season) ? englishSquadPages[season] : undefined
}

/** The seasons that have a page of the English Wikipedia with a squad, oldest first. */
export function englishSquadSeasons(): string[] {
  return Object.keys(englishSquadPages)
}

/**
 * Reads the squad and the transfers of a season in the shape every reader of a season returns.
 * The source is `engels`. The pages give no matches or goals.
 */
export function readEnglishSquad(text: string): SeasonSquad {
  const cleaned = clean(text)
  const headings = headingsOf(cleaned)
  const squadHeadings = headings.filter((heading) => squadTitle.test(heading.title))
  const transfersHeading = headings.find((heading) => transfersTitle.test(heading.title))

  if (squadHeadings.length === 0 && transfersHeading === undefined) {
    return { kind: 'none', reason: 'the page has no squad and no transfers' }
  }

  const warnings: string[] = []
  const squad: Found[] = []

  for (const heading of squadHeadings) {
    const found = readFsList(cleaned.slice(heading.start, heading.end), heading.title)

    if (typeof found === 'string') {
      return { kind: 'error', message: found }
    }
    squad.push(...found)
  }
  if (squadHeadings.length > 0 && squad.length === 0) {
    return { kind: 'error', message: 'the squad of the page has no players we know' }
  }

  const transfers = transfersHeading === undefined ? [] : readTransfers(cleaned, headings, transfersHeading, warnings)

  if (typeof transfers === 'string') {
    return { kind: 'error', message: transfers }
  }

  const players = put(squad, transfers)

  if (players.length === 0) {
    return { kind: 'none', reason: 'the page has no squad and its transfers have no players' }
  }

  return { appearancesTotal: null, goalsTotal: null, kind: 'read', players, source: 'engels', warnings }
}

/** A heading `Squad` or `First-team squad`, or the list `Out on loan` under it. */
const squadTitle = /^(?:first[- ]team squad|squad|out on loan)$/iu

/** The heading of the tables of transfers. */
const transfersTitle = /^(?:player )?transfers$/iu

/** The columns of a table of transfers by what the heading of each says, in lower case. */
function columnsOf(header: string): { date: number; fee: number; player: number; position: number; type: number } {
  const names = headerCells(header).map((cell) => {
    const abbreviation = /^\{\{\s*abbr\s*\|([^|}]*)/iu.exec(cell.trim())

    return plain(abbreviation?.[1] ?? cell)
      .toLowerCase()
      .replace(/\.$/u, '')
  })

  return {
    date: names.indexOf('date'),
    fee: names.indexOf('fee'),
    player: names.indexOf('player'),
    position: names.findIndex((name) => name === 'pos' || name === 'position'),
    type: names.indexOf('type'),
  }
}

/** The headings of the text, with the text under each up to the next of its level. */
function headingsOf(text: string): Heading[] {
  const found = [...text.matchAll(/^(={2,6})[ \t]*(.+?)[ \t]*\1[ \t]*$/gmu)]

  return found.map((match, index) => {
    const level = (match[1] ?? '').length
    const start = match.index + match[0].length
    const next = found.slice(index + 1).find((other) => (other[1] ?? '').length <= level)

    return { end: next?.index ?? text.length, level, start, title: plain(match[2] ?? '') }
  })
}

/** Where the line of a heading starts, which is before the text under it. */
function headingStart(text: string, heading: Heading): number {
  return text.lastIndexOf('\n', heading.start - 1) + 1 || heading.start
}

/** Whether a text can be the name of a player. */
function isName(name: string): boolean {
  return name !== '' && name.length <= playerNameMaxLength && !/[{}[\]|<>=]/u.test(name)
}

/** The text of a cell, or its last argument when it is a template such as `{{sort|3|MF}}`. */
function lastArgument(cell: string): string {
  const text = plain(cell)
  const template = /^\{\{[^{}|]*(?:\|[^{}]*)\|([^{}|]*)\}\}$/u.exec(text)

  return (template?.[1] ?? text).trim()
}

/** The month (1 to 12) of the first date in a cell, such as `1 July 2019`, or null. */
function monthOf(cell: string): null | number {
  const found = /\b\d{1,2}\s+([A-Za-z]+)\s+\d{4}\b/u.exec(cell)
  const index = months.indexOf((found?.[1] ?? '').toLowerCase())

  return index < 0 ? null : index + 1
}

/** The name in the cell of a player: the first link, or the text without flags. */
function nameOfTransfer(cell: string): string {
  const link = /\[\[[^\]]+\]\]/u.exec(cell)?.[0]

  if (link !== undefined) {
    return nameOf(link)
  }

  let rest = cell.replace(/\{\{\s*(?:flag\w*|fba\w*)\s*\|[^{}]*\}\}/giu, '')

  rest = rest.replace(/\{\{\s*sort\s*\|[^{}|]*\|([^{}]*)\}\}/giu, '$1')
  for (let round = 0; round < 5 && /\{\{[^{}]*\}\}/u.test(rest); round++) {
    rest = rest.replace(/\{\{[^{}]*\}\}/gu, '')
  }

  return plain(rest).replace(/^[,\s]+$/u, '')
}

/** The squad and the players of the transfers as one list: a name is a player once. */
function put(squad: Found[], transfers: Found[]): SeasonPlayer[] {
  const seen = new Map<string, SeasonPlayer>()

  for (const { name, position, shirtNumber } of [...squad, ...transfers]) {
    const key = nameKey(name)
    const known = seen.get(key)

    if (known === undefined) {
      seen.set(key, { appearances: null, goals: null, name, page: null, position, shirtNumber })
    } else if (known.position === null && position !== null) {
      known.position = position
    }
  }

  return [...seen.values()]
}

/**
 * The `{{Fs player}}` templates of a list, each with the parameters it has. The template holds
 * links and templates of its own (`other=<small>on loan from [[Club]]</small>`), so the end is
 * found by counting the braces and the parameters are split at the bars outside of them.
 */
function readFsList(section: string, title: string): Found[] | string {
  const found: Found[] = []
  const lines = section.match(/\{\{\s*fs\b[^|}]*/giu) ?? []
  const known = lines.filter((line) => /^\{\{\s*fs\s+(?:start|mid|end|player)\s*$/iu.test(line))

  if (known.length !== lines.length) {
    return `the list '${title}' has a template we do not know`
  }
  if (/^\{\|/mu.test(section) && !/\{\{\s*fs\s+player/iu.test(section)) {
    return `the list '${title}' is a table we do not know`
  }

  for (const match of section.matchAll(/\{\{\s*fs\s+player\s*\|/giu)) {
    const body = templateBody(section, match.index + match[0].length)

    if (body === undefined) {
      return `a player of the list '${title}' has no end`
    }

    const parameters = new Map<string, string>()

    for (const part of splitParameters(body)) {
      const at = part.indexOf('=')

      if (at > 0) {
        parameters.set(part.slice(0, at).trim().toLowerCase(), part.slice(at + 1).trim())
      }
    }

    const name = nameOf(parameters.get('name') ?? '')
    const position = positions[plain(parameters.get('pos') ?? '').toLowerCase()]
    const shirtNumber = shirtNumberOf(parameters.get('no') ?? '')

    if (!isName(name)) {
      return `a player of the list '${title}' has no usable name: '${name.slice(0, 40)}'`
    }
    if (position === undefined) {
      return `a player of the list '${title}' has a position we do not know: '${plain(parameters.get('pos') ?? '').slice(0, 40)}'`
    }
    if (shirtNumber === undefined) {
      return `a player of the list '${title}' has a shirt number we do not know: '${plain(parameters.get('no') ?? '').slice(0, 40)}'`
    }
    found.push({ name, position, shirtNumber })
  }

  return found
}

/** The players of the tables under the heading of the transfers, who count for the season. */
function readTransfers(text: string, headings: Heading[], root: Heading, warnings: string[]): Found[] | string {
  const players: Found[] = []
  const below = headings.filter((heading) => heading.start > root.start && heading.end <= root.end)
  const sections =
    below.length === 0 ? [{ ...root, title: 'transfers' }] : below.filter((heading) => heading.start >= root.start)

  for (const section of sections) {
    const direction = /^(?:players )?(in|out)$/iu.exec(section.title)?.[1]?.toLowerCase()
    const tables = [...text.slice(section.start, tableEnd(section, below, text)).matchAll(/^\{\|[\s\S]*?^\|\}/gmu)]

    if (tables.length === 0) {
      continue
    }
    if (direction === undefined) {
      return `the transfers have a table under a heading we do not know: '${section.title.slice(0, 40)}'`
    }

    for (const [table] of tables) {
      const read = readTransferTable(table, direction === 'in', warnings)

      if (typeof read === 'string') {
        return read
      }
      players.push(...read)
    }
  }

  return players
}

/** The players of one table of transfers that count for the season. */
function readTransferTable(table: string, arrivals: boolean, warnings: string[]): Found[] | string {
  const chunks = table.split(/^\|-.*$/gmu)
  const headerAt = chunks.findIndex((chunk) => headerCells(chunk).length > 0)
  const columns = columnsOf(chunks[headerAt] ?? '')
  const rows = chunks.slice(headerAt + 1)

  if (columns.player < 0) {
    return 'a table of transfers has no column Player'
  }

  const players: Found[] = []

  for (const row of rows) {
    const cells = dataCells(row)
    const name = nameOfTransfer(cells[columns.player] ?? '')

    if (cells.length === 0 || name === '') {
      continue
    }
    if (!isName(name)) {
      return `a row of the transfers has no usable name: '${name.slice(0, 40)}'`
    }

    const loan = /\bloan/iu.test(`${cells[columns.type] ?? ''} ${cells[columns.fee] ?? ''}`)
    const month = monthOf(cells[columns.date] ?? '')
    const counts = arrivals || loan || (month !== null && winterMonths.has(month))

    if (!counts) {
      if (month === null) {
        warnings.push(`'${name.slice(0, 40)}' is left out: the date of leaving is not one we can read`)
      }
      continue
    }

    const position = positions[lastArgument(cells[columns.position] ?? '').toLowerCase()] ?? null

    players.push({ name, position, shirtNumber: null })
  }

  return players
}

/** The shirt number of a template: nothing, or one or two digits. */
function shirtNumberOf(value: string): null | number | undefined {
  const text = plain(value)

  if (text === '') {
    return null
  }

  const number = /^\d{1,2}$/u.test(text) ? Number(text) : 0

  return number >= 1 ? number : undefined
}

/** The parameters of a template, split at the bars that are not inside a link or a template. */
function splitParameters(body: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''

  for (let index = 0; index < body.length; index++) {
    const pair = body.slice(index, index + 2)

    if (pair === '{{' || pair === '[[') {
      depth++
      current += pair
      index++
    } else if (pair === '}}' || pair === ']]') {
      depth--
      current += pair
      index++
    } else if (body[index] === '|' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += body[index]
    }
  }

  return [...parts, current]
}

/** Where the text of a heading of the transfers ends: at the next heading, at any level. */
function tableEnd(section: Heading, below: Heading[], text: string): number {
  const next = below.find((heading) => heading.start > section.start)

  return next === undefined ? section.end : Math.min(section.end, headingStart(text, next))
}

/** The text of a template from just after its first bar to the braces that close it. */
function templateBody(text: string, from: number): string | undefined {
  let depth = 1

  for (let index = from; index < text.length - 1; index++) {
    const pair = text.slice(index, index + 2)

    if (pair === '{{') {
      depth++
      index++
    } else if (pair === '}}') {
      depth--
      if (depth === 0) {
        return text.slice(from, index)
      }
      index++
    }
  }

  return undefined
}
