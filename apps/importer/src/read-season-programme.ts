// Reads the programme of a season of the old fansite from the page of that season on the Dutch
// Wikipedia (#1623): `Sc Heerenveen in het seizoen 2006/07`, under the heading Programma. Each
// competition has a table with the columns Datum, Thuis, Uit, Uitslag, Doelpuntenmakers and
// Bijzonderheden. A date is a day and a month (`19-08`), the result has the home club first and
// a goal is `2-1: [[Tininho]] '58 (p)`. Only the league and the play-offs are read; the cup and
// the UEFA Cup have other rules (extra time, penalties, two legs) and are left out. A row that
// cannot be read is a problem for that row, never a guess; the rest of the table is read.
import type { Competition } from '@fansite/db/schema'

import type { ReadGoal } from './read-wikipedia.ts'

import { clean, clubName, linkedPage, months, plain } from './read-wikipedia.ts'

/** A competition of the programme, and the match it is. `round` is empty for the league. */
export type ProgrammeCompetition = Extract<Competition, 'Eredivisie' | 'Play-offs Champions League'>

/** One row of a table of the programme. */
export type ProgrammeRow = {
  competition: ProgrammeCompetition
  /** The day of the month. */
  day: number
  /** The goals in the order of the clock, or null with the reason in `goalsProblem`. */
  goals: null | ReadGoal[]
  goalsProblem: null | string
  /** Whether sc Heerenveen played at home. */
  home: boolean
  /** The month, 1 to 12. */
  month: number
  /** The club of the other side as the row shows it, and the article it links to. */
  opponent: string
  opponentPage: null | string
  /**
   * The round of a match of the play-offs, such as `Eerste ronde, wedstrijd 1/2`, and null for
   * a league match.
   */
  round: null | string
  /** The result from the side of sc Heerenveen, or null when the cell has no score. */
  score: null | { against: number; for: number }
}

/** What was read: the rows, and a line for each row or table that could not be read. */
export type ReadProgramme =
  { kind: 'none'; reason: string } | { kind: 'read'; problems: string[]; rows: ProgrammeRow[] }

/** The names of the page for our own club in a row. */
const ourNames = new Set(['sc heerenveen'])

const headingLine = /^(={2,6})[ \t]*(.*?)[ \t]*\1[ \t]*$/u

/** A goal of the list: the score after it, the scorer with his minute, and the marks. */
const goalLine = /^(\d{1,2})\s*[–-]\s*(\d{1,2})\s*:\s*(.+?)\s*'\s*(\d{1,3})\s*(?:\(([^()]*)\))?$/u

const scoreCell = /^(\d{1,2})\s*[–-]\s*(\d{1,2})$/u

/**
 * Reads the league and the play-offs from the programme of a page of a season. The day is a day
 * and a month: the caller puts the year to it (August to December is the first year of the
 * season, January to July the second). The result is from the side of sc Heerenveen, and a goal
 * is ours or theirs by who scored it, which the running score of the list tells.
 */
export function readSeasonProgramme(text: string): ReadProgramme {
  const lines = clean(text).split('\n')
  const start = lines.findIndex(
    (line) => headingOf(line)?.level === 2 && /^programma$/iu.test(headingOf(line)?.title ?? ''),
  )

  if (start === -1) {
    return { kind: 'none', reason: 'the page has no section Programma' }
  }

  const rows: ProgrammeRow[] = []
  const problems: string[] = []
  let competition: ProgrammeCompetition | undefined
  let round = ''
  let tables = 0

  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index] ?? ''
    const heading = headingOf(line)

    if (heading?.level === 2) {
      break
    }
    if (heading?.level === 3) {
      competition = /^eredivisie$/iu.test(heading.title)
        ? 'Eredivisie'
        : /^play-offs$/iu.test(heading.title)
          ? 'Play-offs Champions League'
          : undefined
      round = ''
      continue
    }
    if (heading?.level === 4) {
      round = heading.title
      continue
    }
    if (!line.trimStart().startsWith('{|')) {
      continue
    }

    const end = lines.findIndex((one, at) => at > index && one.trimStart().startsWith('|}'))

    if (end === -1) {
      problems.push('a table of the programme is not closed')
      break
    }

    const body = lines.slice(index + 1, end)

    index = end
    if (competition === undefined) {
      continue
    }

    tables += 1

    const read = readTable(body, competition, round)

    rows.push(...read.rows)
    problems.push(...read.problems)
  }

  return tables === 0
    ? { kind: 'none', reason: 'the section Programma has no table of the league or of the play-offs' }
    : { kind: 'read', problems, rows }
}

function headingOf(line: string): undefined | { level: number; title: string } {
  const found = headingLine.exec(line.trim())

  return found === null ? undefined : { level: found[1]?.length ?? 0, title: plain(found[2] ?? '') }
}

/** The goals of the cell of the scorers, with the running score of the match. */
function parseGoals(
  cell: string,
  home: boolean,
  result: { against: number; for: number },
): { goals: ReadGoal[] } | { problem: string } {
  const goals: ReadGoal[] = []
  const lines = cell
    .split(/<br\s*\/?>/iu)
    .map((line) => line.trim())
    .filter((line) => line !== '')

  if (lines.length === 0 || (lines.length === 1 && /^[-–—]$/u.test(plain(lines[0] ?? '')))) {
    return result.for === 0 && result.against === 0
      ? { goals }
      : { problem: `there are no scorers for the result ${result.for}-${result.against}` }
  }

  let before = { away: 0, home: 0 }

  for (const line of lines) {
    const found = goalLine.exec(plain(line).replaceAll('’', "'"))
    const named = /^\s*\d{1,2}\s*[–-]\s*\d{1,2}\s*:\s*(.+?)\s*'/u.exec(line.replace(/\s+/gu, ' '))

    if (found === null || named === null) {
      return { problem: `a goal of the scorers has a form we do not know: '${plain(line).slice(0, 40)}'` }
    }

    const [, homeGoals = '0', awayGoals = '0', , minute = '0', marks] = found
    const after = { away: Number(awayGoals), home: Number(homeGoals) }
    const homeScored = after.home === before.home + 1 && after.away === before.away
    const awayScored = after.away === before.away + 1 && after.home === before.home

    if (!homeScored && !awayScored) {
      return { problem: `the running score ${after.home}-${after.away} does not follow ${before.home}-${before.away}` }
    }

    before = after

    const name = plain(named[1] ?? '')
    const goal: ReadGoal = {
      minute: Number(minute),
      ours: homeScored === home,
      ownGoal: false,
      penalty: false,
      player: name,
      playerPage: linkedPage(named[1] ?? ''),
      stoppageMinutes: null,
    }

    if (name === '' || Number(minute) < 1 || Number(minute) > 150) {
      return { problem: `a goal has no usable name or minute: '${plain(line).slice(0, 40)}'` }
    }

    for (const mark of (marks ?? '').split(',').map((part) => part.trim())) {
      const stoppage = /^\+(\d{1,2})$/u.exec(mark)

      if (mark === '') {
        continue
      }
      if (stoppage !== null && Number(stoppage[1]) > 0) {
        goal.stoppageMinutes = Number(stoppage[1])
      } else if (['p', 'pen', 'pen.'].includes(mark)) {
        goal.penalty = true
      } else if (['e.d.', 'o.g.'].includes(mark)) {
        goal.ownGoal = true
      } else {
        return { problem: `a goal of ${name} has a mark we do not know: '(${mark.slice(0, 40)})'` }
      }
    }

    goals.push(goal)
  }

  const total = home ? { against: before.away, for: before.home } : { against: before.home, for: before.away }

  return total.for === result.for && total.against === result.against
    ? { goals }
    : { problem: `the scorers add up to ${total.for}-${total.against}, the result is ${result.for}-${result.against}` }
}

/** Reads the rows of one table: the cells of a row are separated by `||` or by a new line. */
function readTable(
  body: string[],
  competition: ProgrammeCompetition,
  heading: string,
): { problems: string[]; rows: ProgrammeRow[] } {
  const problems: string[] = []
  const rows: ProgrammeRow[] = []
  const sets: string[][] = []
  let current: string[] = []

  for (const raw of body) {
    const line = raw.trim()

    if (line.startsWith('|-')) {
      sets.push(current)
      current = []
    } else if (line.startsWith('|') && !line.startsWith('|+')) {
      current.push(...line.slice(1).split('||'))
    } else if (line !== '' && !line.startsWith('!') && current.length > 0) {
      // A cell that goes on the next line.
      current[current.length - 1] = `${current.at(-1) ?? ''}\n${line}`
    }
  }
  sets.push(current)

  const found = sets.filter((cells) => cells.length > 0)
  const legs = found.length
  const roundName = competition === 'Eredivisie' ? null : (roundOf(heading) ?? heading)

  for (const [position, cells] of found.entries()) {
    if (cells.length < 5) {
      problems.push(`a row of the programme has ${cells.length} cells: '${plain(cells.join(' ')).slice(0, 40)}'`)
      continue
    }

    const [dateCell = '', homeCell = '', awayCell = '', scoreText = '', goalsCell = ''] = cells
    const date = /^(\d{1,2})\s*[-/]\s*(\d{1,2})$/u.exec(plain(dateCell))
    const day = Number(date?.[1])
    const month = Number(date?.[2])

    if (date === null || day < 1 || day > 31 || month < 1 || month > months.length) {
      problems.push(`a row of the programme has a date we do not know: '${plain(dateCell).slice(0, 20)}'`)
      continue
    }

    const [homeName, awayName] = [clubName(homeCell), clubName(awayCell)]
    const ourHome = ourNames.has(homeName.toLowerCase())
    const ourAway = ourNames.has(awayName.toLowerCase())

    if (ourHome === ourAway) {
      problems.push(
        `a row of the programme on ${day}-${month} does not have sc Heerenveen once: '${homeName} - ${awayName}'`,
      )
      continue
    }

    const otherCell = ourHome ? awayCell : homeCell
    const label = `${plain(dateCell)} ${ourHome ? awayName : homeName}`
    const shown = scoreCell.exec(plain(scoreText))
    const score =
      shown === null
        ? null
        : ourHome
          ? { against: Number(shown[2]), for: Number(shown[1]) }
          : { against: Number(shown[1]), for: Number(shown[2]) }
    const read = score === null ? undefined : parseGoals(goalsCell, ourHome, score)
    const row: ProgrammeRow = {
      competition,
      day,
      goals: read !== undefined && 'goals' in read ? read.goals : null,
      goalsProblem:
        score === null
          ? `${label} has no result we can read: '${plain(scoreText).slice(0, 20)}'`
          : read !== undefined && 'problem' in read
            ? read.problem
            : null,
      home: ourHome,
      month,
      opponent: clubName(otherCell),
      opponentPage: linkedPage(otherCell),
      round: roundName === null ? null : `${roundName}, wedstrijd ${position + 1}/${legs}`,
      score,
    }

    rows.push(row)
  }

  return { problems, rows }
}

/** The name of a round of the play-offs from the heading above its table, or undefined. */
function roundOf(heading: string): string | undefined {
  return /^eerste ronde$/iu.test(heading) ? 'Eerste ronde' : undefined
}
