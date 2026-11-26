// Reads the two pages of 2007/08 that have their matches in tables per round (#1676), both on
// the Dutch Wikipedia: the programme of the Eredivisie, with every match of every club, and the
// KNVB Beker, with the scorers and their minutes. Our matches go through `readMatch`, so they
// are checked the way every other match is. A row of ours that we do not know is an error,
// never a guess.
import { matchGoalPlayerMaxLength, standingsClubMaxLength } from '@fansite/db/schema'

import type { ReadGoal, ReadMatch, ReadResult } from './read-wikipedia.ts'

import { clean, clubName, cupRoundName, linkedPage, months, plain, readMatch, withoutRefn } from './read-wikipedia.ts'

export type ReadCupTables = { kind: 'error'; message: string } | { kind: 'read'; matches: ReadMatch[] }

export type ReadProgrammeTables =
  { kind: 'error'; message: string } | { kind: 'read'; matches: ReadMatch[]; results: ReadResult[]; unread: string[] }

/** The headers of a round table on the cup page, in the order of its columns. */
const cupHeaders = ['Datum', 'Wedstrijd', 'Uitslag', 'Scoreverloop']

/**
 * A goal of the cup page: the minute, the player (linked or not), a remark in brackets and the
 * score after the goal. The groups are the minute, the stoppage time, the player, the remark
 * and the two numbers of the score.
 */
const cupGoal =
  /^(\d{1,3})(?:\+(\d{1,2}))?\s*['’′]\s*(\[\[[^\]]*\]\]|[^[(]+?)\s*(?:\(((?:\[\[[^\]]*\]\]|[^()[\]])+)\)\s*)?(\d{1,2})\s*[-–]\s*(\d{1,2})$/u

/** The most characters of one goal in the cell of the cup page. */
const longestGoal = 200

/** The heading of a round of the programme: `Inhaal` in front of the rows that were late. */
const roundHeading = /^(?:Inhaal )?Eredivisie (\d{4}\/\d{2}) Ronde (\d{1,2})$/u

/**
 * Reads the round tables of the cup page for the matches of sc Heerenveen: the day, the two
 * clubs, the result with the half-time score, and the goals with their minutes. The round is
 * the heading of the second level above the table. A match of "Jong sc Heerenveen" is not one
 * of ours. A match of ours with extra time or a shoot-out is a row we do not know. The page
 * must have `matches` matches of ours.
 */
export function readCupTables(
  text: string,
  { matches: expected, title }: { matches: number; title: string },
): ReadCupTables {
  const cleaned = withoutRefn(clean(text))
  const name = `the page '${title}'`
  const headings = [...cleaned.matchAll(/^==[ \t]*([^=\n].*?)[ \t]*==[ \t]*$/gmu)]
  const matches: ReadMatch[] = []
  const problems: string[] = []

  for (const found of cleaned.matchAll(/^\{\|[^\n]*\n[\s\S]*?^\|\}/gmu)) {
    const [header = [], ...rows] = rowsOf(found[0])

    // A header may have an attribute in front: `! style="…" | Datum`.
    const columns = header.map((line) => plain(line.slice(line.lastIndexOf('|') + 1).replace(/^!/u, '')))

    if (columns.join('|') !== cupHeaders.join('|')) {
      continue
    }

    const heading = headings.findLast((candidate) => candidate.index < found.index)?.[1]
    const round = cupRoundName(heading === undefined ? null : plain(heading))

    for (const lines of rows) {
      const [date = '', clubs = '', score = '', goals = ''] = lines.map(cell)
      const teams = /^(.*?)(?:–|--)(.*)$/u.exec(clubs)
      const sides = teams === null ? [] : [(teams[1] ?? '').trim(), (teams[2] ?? '').trim()]
      const shown = sides.map((team) => plain(team).toLowerCase())

      // Only a row with us in it matters; "Jong sc Heerenveen" links to our article too.
      if (!/heerenveen/iu.test(plain(clubs)) || /jong (?:sc )?heerenveen/iu.test(plain(clubs))) {
        continue
      }

      const result = /^(\d{1,2}) – (\d{1,2})(?: \(\d{1,2} – \d{1,2}\))?$/u.exec(plain(score))

      if (teams === null || lines.length !== cupHeaders.length || !shown.includes('sc heerenveen')) {
        problems.push(`a row of ours we do not know: '${plain(lines.join(' ')).slice(0, 80)}'`)
        continue
      }
      if (result === null) {
        problems.push(`a row of ours has no result we know: '${plain(score).slice(0, 40)}'`)
        continue
      }

      // The two clubs without the bold of the winner, and with our link where we are.
      const [team1 = '', team2 = ''] = sides.map((team) =>
        plain(team).toLowerCase() === 'sc heerenveen' ? '[[sc Heerenveen]]' : team.replace(/'{2,}/gu, ''),
      )
      const read = readMatch(
        {
          heading: null,
          index: 0,
          params: new Map([
            ['date', date],
            ['score', `${result[1]} – ${result[2]}`],
            ['team1', team1],
            ['team2', team2],
          ]),
        },
        'KNVB Beker',
        round,
      )

      if (typeof read === 'string') {
        problems.push(read)
      } else if (read.status !== 'played') {
        problems.push(`${read.round} (KNVB Beker) has no result`)
      } else {
        matches.push({ ...read, ...cupGoals(goals, read) })
      }
    }
  }

  if (problems.length === 0 && matches.length !== expected) {
    problems.push(`it has ${matches.length} matches of sc Heerenveen, not ${expected}`)
  }

  return problems.length > 0
    ? { kind: 'error', message: problems.map((problem) => `${name}: ${problem}`).join('; ') }
    : { kind: 'read', matches }
}

/**
 * Reads the section "Programma" of the page of the league: a table with a heading for each
 * round and a row of four lines for each match: the day without a year, the two clubs, the
 * stadium and the result. A round has a second heading where a match was played later, and the
 * match keeps the number of its round. Every match of every club is a result; one of another
 * club that has no day or no score we know is left out and named in `unread`. Our own matches
 * must be complete, and there must be `matches` of them.
 */
export function readProgrammeTables(
  text: string,
  { matches: expected, season, title }: { matches: number; season: string; title: string },
): ReadProgrammeTables {
  const cleaned = withoutRefn(clean(text))
  const name = `the page '${title}'`
  const start = /^==[ \t]*Programma[ \t]*==[ \t]*$/mu.exec(cleaned)
  const after = start === null ? '' : cleaned.slice(start.index + start[0].length)
  const table = /^\{\|[\s\S]*?^\|\}/mu.exec(after.split(/^==[^=]/mu)[0] ?? '')?.[0]

  if (table === undefined) {
    return { kind: 'error', message: `${name} has no table under Programma` }
  }

  const firstYear = Number(season.slice(0, 4))
  const matches: ReadMatch[] = []
  const results: ReadResult[] = []
  const unread: string[] = []
  const problems: string[] = []
  let round: number | undefined

  for (const lines of rowsOf(table)) {
    if (lines.length === 1 && /^\|\s*colspan/u.test(lines[0] ?? '')) {
      const heading = roundHeading.exec(plain(cell(lines[0] ?? '')))

      if (heading === null || heading[1] !== season) {
        problems.push(`a heading we do not know: '${plain(cell(lines[0] ?? '')).slice(0, 60)}'`)
        round = undefined
      } else {
        round = Number(heading[2])
      }
      continue
    }

    const [date = '', clubs = '', stadium = '', score = ''] = lines.map(cell)
    const teams = /^(\[\[[^\]]*\]\])\s*[-–]\s*(\[\[[^\]]*\]\])$/u.exec(clubs)

    if (round === undefined || lines.length !== 4 || teams === null) {
      problems.push(`a row we do not know: '${plain(lines.join(' ')).slice(0, 80)}'`)
      continue
    }

    const [, team1 = '', team2 = ''] = teams
    const [homeClub, awayClub] = [clubName(team1), clubName(team2)]
    const ours = [homeClub, awayClub].filter((club) => /heerenveen/iu.test(club))
    const day = /^(\d{1,2}) (\p{L}+)$/u.exec(plain(date))
    const month = months.indexOf(day?.[2] ?? '')
    const year = month >= 6 ? firstYear : firstYear + 1
    const playedOn =
      day === null || month === -1 || !isDay(year, month, Number(day[1]))
        ? undefined
        : `${year}-${String(month + 1).padStart(2, '0')}-${String(Number(day[1])).padStart(2, '0')}`
    const goals = /^(\d{1,2})\s*[-–]\s*(\d{1,2})$/u.exec(plain(score))
    const described = `Ronde ${round}: ${homeClub} - ${awayClub}`

    if (ours.length > 0) {
      if (ours.length !== 1 || ours[0] !== 'sc Heerenveen') {
        problems.push(`${described} is no match of ours against another club`)
        continue
      }

      const read = readMatch(
        {
          heading: null,
          index: 0,
          params: new Map([
            ['date', playedOn === undefined ? date : `${Number(day?.[1])} ${day?.[2]} ${year}`],
            ['score', goals === null ? score : `${goals[1]} – ${goals[2]}`],
            ['stadium', stadium],
            ['team1', team1],
            ['team2', team2],
          ]),
        },
        'Eredivisie',
        `Speelronde ${round}`,
      )

      if (typeof read === 'string') {
        problems.push(read)
        continue
      }
      if (read.status !== 'played') {
        problems.push(`${read.round} (Eredivisie) has no result`)
        continue
      }
      matches.push(read)
    }

    if (
      playedOn === undefined ||
      goals === null ||
      [homeClub, awayClub].some((club) => club === '' || club.length > standingsClubMaxLength)
    ) {
      unread.push(`${described} has no day or score we know`)
      continue
    }

    results.push({
      awayClub,
      awayGoals: Number(goals[2]),
      homeClub,
      homeGoals: Number(goals[1]),
      playedOn,
      round,
    })
  }

  if (problems.length === 0 && matches.length !== expected) {
    problems.push(`it has ${matches.length} matches of sc Heerenveen, not ${expected}`)
  }

  return problems.length > 0
    ? { kind: 'error', message: problems.map((problem) => `${name}: ${problem}`).join('; ') }
    : { kind: 'read', matches, results, unread }
}

/** A cell without the bars in front of it and without its attributes: `|width=200|0-0`. */
function cell(line: string): string {
  // One class for everything up to the bar keeps this linear on any line of the page.
  return line.replace(/^\|+\s*(?:[a-z]+=[^|[\]{}]*\|)?/u, '').trim()
}

/**
 * The goals of a cell of the cup page, in the order of the cell. The score after each goal says
 * which club it counts for: one of the two numbers goes up by one. `(e.d.)` is an own goal and
 * `(pen)` a penalty. A part we do not know is a problem and no goals at all, since half a list
 * says something false. An empty cell names no scorers.
 */
function cupGoals(
  value: string,
  match: Pick<ReadMatch, 'competition' | 'home' | 'round'>,
): Pick<ReadMatch, 'goals' | 'goalsProblem'> {
  const problem = (text: string) => ({ goals: null, goalsProblem: `${match.round} (${match.competition}): ${text}` })
  const parts = value
    .split(/<br\s*\/?>|,/giu)
    .map((part) => part.trim())
    .filter((part) => part !== '')
  const goals: ReadGoal[] = []
  let [home, away] = [0, 0]

  for (const part of parts) {
    // A goal is short; a longer part is not matched at all.
    const found = part.length > longestGoal ? null : cupGoal.exec(part)

    if (found === null) {
      return problem(`the scorers have a part we do not know: '${plain(part).slice(0, 40)}'`)
    }

    const [, minute = '', stoppage, scorer = '', remark = '', homeAfter = '', awayAfter = ''] = found
    const player = plain(scorer)
    const note = plain(remark).toLowerCase()
    const forHome = Number(homeAfter) === home + 1 && Number(awayAfter) === away

    if (!forHome && !(Number(homeAfter) === home && Number(awayAfter) === away + 1)) {
      return problem(`the score ${homeAfter}-${awayAfter} does not follow ${home}-${away}`)
    }
    if (!['', 'e.d.', 'pen', 'pen.'].includes(note)) {
      return problem(`a goal has a remark we do not know: '${note.slice(0, 40)}'`)
    }
    if (player === '' || player.length > matchGoalPlayerMaxLength) {
      return problem(`a goal has no usable name: '${plain(part).slice(0, 40)}'`)
    }

    ;[home, away] = [Number(homeAfter), Number(awayAfter)]
    goals.push({
      minute: Number(minute),
      ours: forHome === match.home,
      ownGoal: note === 'e.d.',
      penalty: note.startsWith('pen'),
      player,
      playerPage: linkedPage(scorer),
      stoppageMinutes: stoppage === undefined ? null : Number(stoppage),
    })
  }

  return { goals: goals.length === 0 ? null : goals, goalsProblem: null }
}

function isDay(year: number, month: number, day: number): boolean {
  return new Date(Date.UTC(year, month, day)).getUTCDate() === day
}

/** The rows of a wikitable, without its first line and its end, each a list of its lines. */
function rowsOf(table: string): string[][] {
  return table
    .split(/^\|-[^\n]*$/mu)
    .map((row) =>
      row
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '' && !line.startsWith('{|') && line !== '|}'),
    )
    .filter((lines) => lines.length > 0)
}
