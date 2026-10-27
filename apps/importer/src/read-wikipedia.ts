// Reads the wikitext of the pages of the Dutch Wikipedia that hold the matches and the league
// table of sc Heerenveen 1 (men). The fetcher gets the text from `/wiki/<page>?action=raw`; the
// pages are not HTML, so this file reads their templates: `Footballbox2` for a match and
// `#invoke:Sports table` for the table. A page that has changed shape gives an error, never a
// guess, so the import keeps what it has.
import type { Competition, MatchStatus } from '@fansite/db/schema'

import {
  matchGoalPlayerMaxLength,
  matchLimits,
  standingsClubMaxLength,
  wikipediaPageMaxLength,
} from '@fansite/db/schema'

/** One goal of a played match, as the page names it. */
export type ReadGoal = {
  /** The minute on the clock: 45 for "45+1". */
  minute: number
  /** True for a goal of sc Heerenveen, false for a goal of the opponent. */
  ours: boolean
  /** An own goal, which is listed under the club that benefits from it. */
  ownGoal: boolean
  penalty: boolean
  /** The name as the page shows it, such as `Van Bergen`. */
  player: string
  /** The page of the link: `Luca Oyen` for `[[Luca Oyen|Oyen]]`, or null (`linkedPage`). */
  playerPage: null | string
  /** The minutes of added time: 1 for "45+1". Null in regular time. */
  stoppageMinutes: null | number
}

/** What the import keeps of one match of sc Heerenveen. */
export type ReadMatch = {
  competition: Competition
  /** The date as Wikipedia writes it, only when the time is unknown. */
  dateText: null | string
  /** Whether a played cup match went to extra time. Only the cup has it. */
  extraTime: boolean
  /**
   * The goals in the order of the clock, both clubs together. Null when the page names no
   * scorers (yet), and for a match that is not played. They are not checked against the score
   * yet: see `checkGoals`.
   */
  goals: null | ReadGoal[]
  /** Empty unless the match is played. */
  goalsAgainst: null | number
  goalsFor: null | number
  /** Why the scorers of a played match could not be read, or null. Then `goals` is null. */
  goalsProblem: null | string
  home: boolean
  /** Empty while the time is unknown. UTC. */
  kickoffAt: Date | null
  /** The local day, or the first day when only a weekend is known: `2026-10-24`. */
  matchDate: string
  opponent: string
  /** The shoot-out of a cup match level after extra time, from our side. Both or neither. */
  penaltiesAgainst: null | number
  penaltiesFor: null | number
  /** As Wikipedia has it: `Speelronde 12`, `Eerste ronde`. */
  round: string
  stadium: null | string
  status: MatchStatus
}

export type ReadProgramme =
  | {
      /** Whether the page has any Footballbox2 template at all. */
      hasTemplates: boolean
      kind: 'read'
      /** The day of the last match anyone played in the league, or null before the first. */
      lastPlayedOn: null | string
      matches: ReadMatch[]
    }
  | { kind: 'error'; message: string }

export type ReadStandings = { kind: 'error'; message: string } | { kind: 'read'; rows: ReadStandingsRow[] }

/** One club in the table, worked out from the wins, draws, losses and goals Wikipedia gives. */
export type ReadStandingsRow = {
  club: string
  drawn: number
  goalDifference: number
  goalsAgainst: number
  goalsFor: number
  lost: number
  played: number
  points: number
  position: number
  won: number
}

export type SeasonPages = { cup: string; programme: string; standings: string }

type Heading = { index: number; title: string }

type Template = { heading: null | string; index: number; params: Map<string, string> }

/** The name Wikipedia knows us by in the links of a match. */
const ourClub = 'sc Heerenveen'

const months = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
]

/** Takes the comments out of the text, which can hold a `|` or a `}}` of their own. */
export function clean(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/gu, '')
}

/**
 * The page the first link in a wikitext value points to, written the way Wikipedia names a
 * page: `Luca Oyen` for `[[Luca Oyen|Oyen]]` and `Pim Verbeek (voetballer)` for `[[pim_Verbeek
 * (voetballer)]]`, with spaces for underscores and a capital first letter, and without a
 * section (`#Carrière`). A value without a link, a link to a file or a category, and a title
 * longer than the database keeps give null.
 */
export function linkedPage(value: string): null | string {
  const target = /\[\[([^\]|]*)/u.exec(value)?.[1]
  const title = target?.split('#')[0]?.replaceAll('_', ' ').replace(/\s+/gu, ' ').trim()

  if (title === undefined || title === '' || title.length > wikipediaPageMaxLength || /^[^:]*:/u.test(title)) {
    return null
  }

  return title.charAt(0).toUpperCase() + title.slice(1)
}

/** The titles of the three pages of a season, such as `2026/27`. */
export function pageTitles(season: string): SeasonPages {
  return {
    cup: `KNVB Beker ${season} (mannen)`,
    programme: `Eredivisie ${season} (mannenvoetbal)/Wedstrijden`,
    standings: `Eredivisie ${season} (mannenvoetbal)`,
  }
}

/**
 * The address of the raw text of a page. `/w/` is closed to us by robots.txt, `/wiki/` is
 * not.
 */
export function pageUrl(origin: string, title: string): string {
  return `${origin}/wiki/${encodeURI(title.replaceAll(' ', '_'))}?action=raw`
}

/**
 * The text of a wikitext value as it reads: without comments, line breaks, bold and italics,
 * and with a link replaced by what it shows.
 */
export function plain(value: string): string {
  return value
    .replace(/<[^>]*>/gu, ' ')
    .replace(/'{2,}/gu, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/gu, '$1')
    .replace(/\[\[([^\]]*)\]\]/gu, '$1')
    .replaceAll('&nbsp;', ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

/**
 * Reads the KNVB Beker page for the matches of sc Heerenveen. The round is the heading above
 * the match, so a new round needs no code. There may be no match of ours yet (before the draw,
 * or after we are out). A page without any template is read as no matches, with `hasTemplates`
 * false: early in a season the page can exist for weeks before the first round is on it. The
 * import decides whether that is the page we know (see `readAndStore`).
 */
export function readCup(text: string): ReadProgramme {
  const boxes = matchBoxes(text)

  if (boxes.length === 0) {
    return { hasTemplates: false, kind: 'read', lastPlayedOn: null, matches: [] }
  }

  const matches: ReadMatch[] = []
  const problems: string[] = []

  for (const box of boxes.filter(isOurs)) {
    const match = readMatch(box, 'KNVB Beker', box.heading)

    if (typeof match === 'string') {
      problems.push(match)
    } else {
      matches.push(match)
    }
  }

  return problems.length > 0
    ? { kind: 'error', message: problems.join('; ') }
    : { hasTemplates: true, kind: 'read', lastPlayedOn: null, matches }
}

/**
 * Reads the programme and the results of the league: the matches of sc Heerenveen, and
 * the day of the last match anyone played, which is the day the table holds for. A match
 * under a heading that is not a round of the league (a play-off) is not part of the
 * league and is left out.
 */
export function readLeague(text: string): ReadProgramme {
  const boxes = matchBoxes(text)

  if (boxes.length === 0) {
    return { kind: 'error', message: 'the programme has no Footballbox2 templates' }
  }

  const matches: ReadMatch[] = []
  const problems: string[] = []
  let lastPlayedOn: null | string = null

  for (const box of boxes) {
    const round = box.heading !== null && /^Speelronde \d{1,2}$/u.test(box.heading) ? box.heading : null

    if (round === null) {
      continue
    }

    const played = parseScore(box.params.get('score') ?? '')
    const day = parseDate(box.params.get('date') ?? '')

    if (played.kind === 'score' && day !== undefined && (lastPlayedOn === null || day.isoDate > lastPlayedOn)) {
      lastPlayedOn = day.isoDate
    }
    if (isOurs(box)) {
      const match = readMatch(box, 'Eredivisie', round)

      if (typeof match === 'string') {
        problems.push(match)
      } else {
        matches.push(match)
      }
    }
  }

  return problems.length > 0
    ? { kind: 'error', message: problems.join('; ') }
    : { hasTemplates: true, kind: 'read', lastPlayedOn, matches }
}

/**
 * Reads the table: the order of the clubs and, for each, the wins, draws, losses and goals. The
 * page gives no matches played and no points; both follow from the rest.
 */
export function readStandings(text: string): ReadStandings {
  const [table] = findTemplates(clean(text), /\{\{\s*#invoke:\s*Sports table\s*\|/giu)

  if (table === undefined) {
    return { kind: 'error', message: 'the league table has no Sports table template' }
  }

  const order = (table.params.get('team_order') ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter((code) => code !== '')

  if (order.length === 0 || new Set(order).size !== order.length) {
    return { kind: 'error', message: 'the league table has no usable team_order' }
  }

  const rows: ReadStandingsRow[] = []

  for (const [index, code] of order.entries()) {
    const numbers = { drawn: 'draw', goalsAgainst: 'ga', goalsFor: 'gf', lost: 'loss', won: 'win' } as const
    const found: Partial<Record<keyof typeof numbers, number>> = {}

    for (const [field, prefix] of Object.entries(numbers) as [keyof typeof numbers, string][]) {
      const value = table.params.get(`${prefix}_${code}`)

      if (value === undefined || !/^\d{1,3}$/u.test(value)) {
        return { kind: 'error', message: `the league table has no number for ${prefix}_${code}` }
      }
      found[field] = Number(value)
    }

    const club = plain(table.params.get(`name_${code}`) ?? '')

    if (club === '' || club.length > standingsClubMaxLength) {
      return { kind: 'error', message: `the league table has no usable name_${code}` }
    }

    const { drawn = 0, goalsAgainst = 0, goalsFor = 0, lost = 0, won = 0 } = found

    rows.push({
      club,
      drawn,
      goalDifference: goalsFor - goalsAgainst,
      goalsAgainst,
      goalsFor,
      lost,
      played: won + drawn + lost,
      points: 3 * won + drawn,
      position: index + 1,
      won,
    })
  }

  return { kind: 'read', rows }
}

/** How far the clock in the Netherlands is ahead of UTC at a moment: one or two hours. */
function amsterdamOffsetMs(moment: number): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
    minute: 'numeric',
    month: 'numeric',
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
  }).formatToParts(new Date(moment))
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)

  return (
    Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) -
    Math.floor(moment / 60_000) * 60_000
  )
}

/** A local time in the Netherlands as a moment in UTC. */
function amsterdamToUtc(day: { day: number; month: number; year: number }, time: { hours: number; minutes: number }) {
  const local = Date.UTC(day.year, day.month - 1, day.day, time.hours, time.minutes)
  // The offset at the first guess may differ from the offset at the answer around a change of
  // the clock, so the guess is corrected twice.
  let moment = local - amsterdamOffsetMs(local)

  moment = local - amsterdamOffsetMs(moment)

  return new Date(moment)
}

/** The index of the `}}` that closes the `{{` at `start`, or undefined when there is none. */
function closingBraces(text: string, start: number): number | undefined {
  let depth = 0

  for (let index = start; index < text.length - 1; index++) {
    const pair = text.slice(index, index + 2)

    if (pair === '{{') {
      depth++
      index++
    } else if (pair === '}}') {
      depth--
      index++
      if (depth === 0) {
        return index - 1
      }
    }
  }

  return undefined
}

/**
 * Finds the templates that start with this pattern, with their parameters and the heading above
 * each. A template ends at its own `}}`, so templates inside it (`{{goal|52}}`) and links
 * (`[[a|b]]`) do not cut it short. A parameter without `=` is ignored.
 */
function findTemplates(text: string, start: RegExp): Template[] {
  const headings: Heading[] = [...text.matchAll(/^(={2,6})[ \t]*(.+?)[ \t]*\1[ \t]*$/gmu)].map((heading) => ({
    index: heading.index,
    title: plain(heading[2] ?? ''),
  }))
  const templates: Template[] = []

  for (const found of text.matchAll(start)) {
    const end = closingBraces(text, found.index)

    if (end === undefined) {
      continue
    }

    const parts = splitParameters(text.slice(found.index + 2, end))
    const params = new Map<string, string>()

    for (const part of parts.slice(1)) {
      const equals = part.indexOf('=')

      if (equals > 0) {
        params.set(part.slice(0, equals).trim(), part.slice(equals + 1).trim())
      }
    }

    const heading = headings.findLast((candidate) => candidate.index < found.index)

    templates.push({ heading: heading?.title ?? null, index: found.index, params })
  }

  return templates
}

function isOurs(box: Template): boolean {
  return [box.params.get('team1'), box.params.get('team2')].some(
    (team) => team !== undefined && linkTarget(team).toLowerCase() === ourClub.toLowerCase(),
  )
}

/**
 * Where a link in a value points: `sc Heerenveen` for `[[sc Heerenveen|HEE]]`, else the
 * text.
 */
function linkTarget(value: string): string {
  return /\[\[([^\]|]*)/u.exec(value)?.[1]?.trim() ?? plain(value)
}

function matchBoxes(text: string): Template[] {
  return findTemplates(clean(text), /\{\{\s*Footballbox2\s*(?=\||\n)/giu)
}

/** The date of a match, or undefined when it is not one of the shapes we know. */
function parseDate(
  value: string,
): undefined | { day: number; isoDate: string; month: number; single: boolean; text: string; year: number } {
  const text = plain(value).replace(/\*+$/u, '').trim()
  const month = '(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)'
  let day: number
  let monthName: string
  let year: number
  let single = false
  let match: null | RegExpExecArray

  if ((match = new RegExp(`^(\\d{1,2}) ${month} (\\d{4})$`, 'u').exec(text))) {
    single = true
    day = Number(match[1])
    monthName = match[2] ?? ''
    year = Number(match[3])
  } else if ((match = new RegExp(`^(\\d{1,2})-\\d{1,2} ${month} (\\d{4})$`, 'u').exec(text))) {
    day = Number(match[1])
    monthName = match[2] ?? ''
    year = Number(match[3])
  } else if ((match = new RegExp(`^(\\d{1,2}) ${month}-\\d{1,2} ${month} (\\d{4})$`, 'u').exec(text))) {
    day = Number(match[1])
    monthName = match[2] ?? ''
    // A weekend from 31 December to 2 January belongs to the year before the one that is named.
    year = Number(match[4]) - (months.indexOf(monthName) > months.indexOf(match[3] ?? '') ? 1 : 0)
  } else {
    return undefined
  }

  const monthNumber = months.indexOf(monthName) + 1
  const check = new Date(Date.UTC(year, monthNumber - 1, day))

  if (check.getUTCMonth() !== monthNumber - 1 || check.getUTCDate() !== day) {
    return undefined
  }

  return {
    day,
    isoDate: `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    month: monthNumber,
    single,
    text,
    year,
  }
}

/**
 * A name and the minutes of its goals: `[[Luca Oyen|Oyen]] {{goal|52}}` for the home club, and
 * `{{goal|45}} [[Jacob Trenskow|Trenskow]]` for the away club, one player to a line and
 * lines cut by `<br />`. The template takes every goal of the player: `{{goal|78||80}}` is
 * two, and `e.d.` (own goal) or `pen.` (penalty) after a minute belongs to that goal. Red cards
 * and missed penalties in the same field are not goals and are left out. Anything else, a goal
 * without a name or a template we do not know, is a text we cannot read: the answer is then a
 * reason and no goals at all, since half a list says something false.
 */
function parseGoalLines(value: string, ours: boolean): { goals: ReadGoal[] } | { problem: string } {
  const goals: ReadGoal[] = []

  for (const line of value.replace(/\{\{\s*(?:rode kaart|penmis)\s*\|[^{}]*\}\}/giu, '').split(/<br\s*\/?>/iu)) {
    const templates = [...line.matchAll(/\{\{\s*goal\s*\|([^{}]*)\}\}/giu)]
    // What is left of a line besides its goals is the name; a comma between templates is not.
    const name = plain(line.replace(/\{\{\s*goal\s*\|[^{}]*\}\}/giu, ' ')).replace(/^[\s,;]+|[\s,;]+$/gu, '')

    if (templates.length === 0) {
      if (/\{\{|\}\}/u.test(line)) {
        return { problem: `a line of the scorers has a template we do not know: '${plain(line).slice(0, 40)}'` }
      }
      continue
    }
    if (name === '' || name.length > matchGoalPlayerMaxLength || /[{}[\]|]/u.test(name)) {
      return { problem: `a goal has no usable name: '${plain(line).slice(0, 40)}'` }
    }

    const playerPage = linkedPage(line.replace(/\{\{\s*goal\s*\|[^{}]*\}\}/giu, ' '))

    for (const [, inner = ''] of templates) {
      let last: ReadGoal | undefined

      for (const token of inner.split('|').map((part) => part.trim())) {
        const minute = /^(\d{1,3})(?:\+(\d{1,2}))?$/u.exec(token)

        if (token === '') {
          continue
        }
        if (minute !== null) {
          last = {
            minute: Number(minute[1]),
            ours,
            ownGoal: false,
            penalty: false,
            player: name,
            playerPage,
            stoppageMinutes: minute[2] === undefined ? null : Number(minute[2]),
          }
          if (last.minute < 1 || last.minute > 150 || last.stoppageMinutes === 0) {
            return { problem: `a goal of ${name} has a minute we do not know: '${token}'` }
          }
          goals.push(last)
        } else if ((token === 'e.d.' || token === 'pen.') && last !== undefined) {
          last[token === 'e.d.' ? 'ownGoal' : 'penalty'] = true
          if (last.ownGoal && last.penalty) {
            return { problem: `a goal of ${name} is both an own goal and a penalty` }
          }
        } else {
          return { problem: `a goal of ${name} has a part we do not know: '${token.slice(0, 40)}'` }
        }
      }
    }
  }

  return { goals }
}

/**
 * The score of the shoot-out of a box, in the order of the template: team 1 first. Empty or
 * missing is no shoot-out; anything but two numbers is a text we do not know.
 */
function parsePenalties(
  value: string,
): { away: number; home: number; kind: 'score' } | { kind: 'none' } | { kind: 'unknown'; text: string } {
  const text = plain(value)

  if (text === '') {
    return { kind: 'none' }
  }

  const score = /^(\d{1,2}) ?[–-] ?(\d{1,2})$/u.exec(text)

  return score === null ? { kind: 'unknown', text } : { away: Number(score[2]), home: Number(score[1]), kind: 'score' }
}

/** The score of a box: none yet, a score, called off, or something we do not know. */
function parseScore(
  value: string,
):
  | { away: number; home: number; kind: 'score' }
  | { kind: 'none' }
  | { kind: 'postponed' }
  | { kind: 'unknown'; text: string } {
  const text = plain(value)

  if (text === '' || /^[–-]$/u.test(text)) {
    return { kind: 'none' }
  }

  const score = /^(\d{1,2}) ?[–-] ?(\d{1,2})$/u.exec(text)

  if (score !== null) {
    return { away: Number(score[2]), home: Number(score[1]), kind: 'score' }
  }

  return /^(uitgesteld|afgelast)\b/iu.test(text) ? { kind: 'postponed' } : { kind: 'unknown', text }
}

/**
 * The time of a box in hours and minutes, null when it is empty, undefined when it is not
 * a time.
 */
function parseTime(value: string): null | undefined | { hours: number; minutes: number } {
  const text = plain(value).replace(/\*+$/u, '').trim()

  if (text === '') {
    return null
  }

  const time = /^(\d{1,2}):(\d{2}) uur$/u.exec(text)
  const hours = Number(time?.[1])
  const minutes = Number(time?.[2])

  return time === null || hours > 23 || minutes > 59 ? undefined : { hours, minutes }
}

/**
 * The goals of a played match from `goals1` (the home club) and `goals2` (the away club), in
 * order of the clock; at the same minute the home club's goal comes first. Null goals mean the
 * page names no scorers yet: both fields are empty.
 */
function readGoals(box: Template, home: boolean): { goals: null | ReadGoal[]; problem: null | string } {
  const sides = [box.params.get('goals1') ?? '', box.params.get('goals2') ?? '']

  if (sides.every((side) => plain(side) === '')) {
    return { goals: null, problem: null }
  }

  const goals: ReadGoal[] = []

  for (const [index, side] of sides.entries()) {
    const read = parseGoalLines(side, (index === 0) === home)

    if ('problem' in read) {
      return { goals: null, problem: read.problem }
    }
    goals.push(...read.goals)
  }

  // A stable sort: two goals in the same minute keep the order of the page.
  goals.sort((a, b) => a.minute - b.minute || (a.stoppageMinutes ?? 0) - (b.stoppageMinutes ?? 0))

  return { goals, problem: null }
}

/**
 * Turns a `Footballbox2` of ours into a match, or says in a text what is wrong with it.
 * The round is what the caller found above it.
 */
function readMatch(box: Template, competition: Competition, round: null | string): ReadMatch | string {
  const name = `${round ?? 'a match'} (${competition})`
  const [team1, team2] = [box.params.get('team1') ?? '', box.params.get('team2') ?? '']
  const home = linkTarget(team1).toLowerCase() === ourClub.toLowerCase()
  const opponent = plain(home ? team2 : team1)
  const stadium = plain(box.params.get('stadium') ?? '') || null
  const day = parseDate(box.params.get('date') ?? '')
  const time = parseTime(box.params.get('time') ?? '')
  const score = parseScore(box.params.get('score') ?? '')
  const penalties = parsePenalties(box.params.get('penaltyscore') ?? '')
  const extraTimeSaid = plain(box.params.get('aet') ?? '') !== ''

  if (round === null || round.length > matchLimits.round) {
    return `${name} has no usable round heading`
  }
  if (opponent === '' || opponent.length > matchLimits.opponent) {
    return `${name} has no usable opponent`
  }
  if (stadium !== null && stadium.length > matchLimits.stadium) {
    return `${name} has no usable stadium`
  }
  if (day === undefined) {
    return `${name} has a date we do not know: '${plain(box.params.get('date') ?? '').slice(0, 40)}'`
  }
  if (time === undefined) {
    return `${name} has a time we do not know: '${plain(box.params.get('time') ?? '').slice(0, 40)}'`
  }
  if (score.kind === 'unknown') {
    return `${name} has a score we do not know: '${score.text.slice(0, 40)}'`
  }
  if (competition !== 'KNVB Beker' && (extraTimeSaid || penalties.kind !== 'none')) {
    return `${name} has extra time or a shoot-out, which only the cup has`
  }
  if (penalties.kind === 'unknown') {
    return `${name} has a shoot-out score we do not know: '${penalties.text.slice(0, 40)}'`
  }
  if (penalties.kind === 'score') {
    if (!extraTimeSaid) {
      return `${name} has a shoot-out without extra time`
    }
    if (score.kind !== 'score' || score.home !== score.away) {
      return `${name} has a shoot-out but no level score`
    }
  }

  const kickoffAt = time === null || !day.single ? null : amsterdamToUtc(day, time)
  const status: MatchStatus = score.kind === 'score' ? 'played' : score.kind === 'postponed' ? 'postponed' : 'scheduled'
  const ours = score.kind === 'score' ? (home ? score.home : score.away) : null
  const theirs = score.kind === 'score' ? (home ? score.away : score.home) : null
  const scorers = status === 'played' ? readGoals(box, home) : { goals: null, problem: null }

  return {
    competition,
    dateText: kickoffAt === null ? day.text.slice(0, matchLimits.dateText) : null,
    extraTime: extraTimeSaid && score.kind === 'score',
    goals: scorers.goals,
    goalsAgainst: theirs,
    goalsFor: ours,
    goalsProblem: scorers.problem === null ? null : `${name}: ${scorers.problem}`,
    home,
    kickoffAt,
    matchDate: day.isoDate,
    opponent,
    penaltiesAgainst: penalties.kind === 'score' ? (home ? penalties.away : penalties.home) : null,
    penaltiesFor: penalties.kind === 'score' ? (home ? penalties.home : penalties.away) : null,
    round,
    stadium,
    status,
  }
}

/** Cuts the inside of a template at the `|` that belong to it, not to a link or a template. */
function splitParameters(inner: string): string[] {
  const parts: string[] = []
  let braces = 0
  let brackets = 0
  let current = ''

  for (let index = 0; index < inner.length; index++) {
    const pair = inner.slice(index, index + 2)

    if (pair === '{{' || pair === '}}' || pair === '[[' || pair === ']]') {
      braces += pair === '{{' ? 1 : pair === '}}' ? -1 : 0
      brackets += pair === '[[' ? 1 : pair === ']]' ? -1 : 0
      current += pair
      index++
    } else if (inner[index] === '|' && braces === 0 && brackets === 0) {
      parts.push(current)
      current = ''
    } else {
      current += inner[index]
    }
  }
  parts.push(current)

  return parts
}
