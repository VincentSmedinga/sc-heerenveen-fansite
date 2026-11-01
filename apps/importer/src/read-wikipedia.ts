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

import { printable } from './text.ts'

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
  /**
   * The score after 90 minutes of a match with extra time, from our side, when the page
   * gives it. Both or neither. It may equal the result, and is never above it.
   */
  afterNinetyAgainst: null | number
  afterNinetyFor: null | number
  /**
   * The number of spectators of a played match: 0 for a match without an audience, null when
   * the page has no number or none we can read (see `factsProblem`).
   */
  attendance: null | number
  competition: Competition
  /** The date as Wikipedia writes it, only when the time is unknown. */
  dateText: null | string
  /** Whether a played match went to extra time. Only the cup and the play-offs have it. */
  extraTime: boolean
  /**
   * Why the attendance or the referee could not be read, or null. Then the field in question
   * is null and the match is imported all the same: it is a side issue.
   */
  factsProblem: null | string
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
  /**
   * A line about the match as the page tells it, now only for a match that was stopped and
   * finished later: the minute it stopped and the day and the stadium of the rest. Null for
   * every other match.
   */
  note: null | string
  opponent: string
  /**
   * The article of the opponent as the match links it: `Telstar (voetbalclub)` for
   * `[[Telstar (voetbalclub)|Telstar]]`, or null when the name has no link (`linkedPage`).
   */
  opponentPage: null | string
  /** The shoot-out of a match level after extra time, from our side. Both or neither. */
  penaltiesAgainst: null | number
  penaltiesFor: null | number
  /**
   * The full name of the referee, from the link target when the name is linked, else the text
   * (`Sander van der Eijk` for `[[Sander van der Eijk|Van der Eijk]]`). Null when the page has
   * none or none we can read: see `factsProblem`.
   */
  referee: null | string
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

export type SeasonPages = { cup: string; playoffs: string; programme: string; standings: string }

type Heading = { index: number; title: string }

type Template = { heading: null | string; index: number; params: Map<string, string> }

/** The name Wikipedia knows us by in the links of a match. */
const ourClub = 'sc Heerenveen'

/** The heading of the play-offs for the Conference League on the page of the play-offs. */
const playoffHeading = /^Play-offs voor de UEFA (?:Europa )?Conference League$/iu

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

/** The two numbers of a score or a part of it, team 1 first. */
type Pair = { away: number; home: number }

type ParsedScore =
  | (Pair & { afterNinety: null | Pair; halfTime: null | Pair; kind: 'score' })
  | { kind: 'none' }
  | { kind: 'postponed' }
  | { kind: 'stopped'; minute: null | number }
  | { kind: 'unknown'; text: string }

/**
 * Takes the comments and the footnotes out of the text. Both can hold a `|` or a `}}` of their
 * own, and a footnote after a date (`11 mei 2026<ref>...</ref>`) would make it a date we do not
 * know.
 */
export function clean(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/gu, '')
    .replace(/<ref\b[^>]*\/>/giu, '')
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/giu, '')
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

/**
 * The titles of the pages of a season, such as `2026/27`. The play-offs have a page for the
 * year the season ends in: `Play-offs Nederlands voetbal 2027`. That page comes in May, so a
 * season that is still going has no such page yet.
 */
export function pageTitles(season: string): SeasonPages {
  return {
    cup: `KNVB Beker ${season} (mannen)`,
    playoffs: `Play-offs Nederlands voetbal ${Number(season.slice(0, 4)) + 1}`,
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

  for (const box of boxes.filter((found) => isOurs(found) && !isRestOfStopped(found, boxes))) {
    const match = readMatch(box, 'KNVB Beker', box.heading, restOf(box, boxes))

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
 * league and is left out. A block for a match that was stopped is the match, and the later
 * block for the same two clubs only finishes it (see `restOf`).
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
    if (isOurs(box) && !isRestOfStopped(box, boxes)) {
      const match = readMatch(box, 'Eredivisie', round, restOf(box, boxes))

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
 * Reads the page of the play-offs of a year for the matches of sc Heerenveen under the heading
 * of the Conference League, and nowhere else: the other play-offs on the page are for promotion
 * and relegation, and are no business of ours. The round is the heading of the level above the
 * match, `Halve finales` as `Halve finale` and `Finale`. In the years the semi-finals were
 * played over two matches, each box says which one it is (`Wedstrijd 1/2`), and the round says
 * so too. A year in which sc Heerenveen did not play has the section and no match, and that is
 * a page without a fault. A page without the section is an error: it has changed shape.
 */
export function readPlayoffs(text: string): ReadProgramme {
  const cleaned = clean(text)
  const section = playoffSection(cleaned)

  if (section === undefined) {
    return { kind: 'error', message: `the play-offs page has no section 'Play-offs voor de UEFA Conference League'` }
  }

  const rounds: Heading[] = [...section.matchAll(/^===[ \t]*([^=\n].*?)[ \t]*===[ \t]*$/gmu)].map((heading) => ({
    index: heading.index,
    title: plain(heading[1] ?? ''),
  }))
  const boxes = findTemplates(section, /\{\{\s*Footballbox2\s*(?=\||\n)/giu)
  const matches: ReadMatch[] = []
  const problems: string[] = []

  for (const box of boxes.filter((found) => isOurs(found) && !isRestOfStopped(found, boxes))) {
    const heading = rounds.findLast((candidate) => candidate.index < box.index)?.title
    const round = heading === undefined ? null : playoffRound(heading, plain(box.params.get('round') ?? ''))
    const match = readMatch(box, 'Play-offs Conference League', round, restOf(box, boxes))

    if (typeof match === 'string') {
      problems.push(match)
    } else {
      matches.push(match)
    }
  }

  return problems.length > 0
    ? { kind: 'error', message: problems.join('; ') }
    : { hasTemplates: boxes.length > 0, kind: 'read', lastPlayedOn: null, matches }
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

/** The two clubs of a block as one text, whichever is named first. */
function clubsOf(box: Template): string {
  return [box.params.get('team1') ?? '', box.params.get('team2') ?? '']
    .map((team) => linkTarget(team).toLowerCase())
    .sort()
    .join('|')
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
 * Whether a block finishes a match that was stopped: an earlier block under the same heading
 * is for the same two clubs and has a score like `Gestaakt 82' (2 – 0)`. That earlier block is
 * the match (see `restOf`), so this one is not a match of its own.
 */
function isRestOfStopped(box: Template, boxes: Template[]): boolean {
  return boxes.some(
    (other) =>
      other.index < box.index &&
      other.heading === box.heading &&
      clubsOf(other) === clubsOf(box) &&
      parseScore(other.params.get('score') ?? '').kind === 'stopped',
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

/**
 * The date of a match, or undefined when it is not one of the shapes we know: one day, or
 * several days from the first to the last (a weekend, or the days a cup round is played on).
 * The days of several are joined by a hyphen or an en dash, with or without spaces around it:
 * `12-14 februari 2027`, `1–3 december 2026`, `29 april-3 mei 2027`, `30 november–2 december
 * 2026`. The year is on the last day, and may be on the first as well (`31 december 2026 – 2
 * januari 2027`); a date without a year is not one we know, because the year would be a guess.
 * The date is the first day, and `text` is what Wikipedia wrote.
 */
function parseDate(
  value: string,
): undefined | { day: number; isoDate: string; month: number; single: boolean; text: string; year: number } {
  const text = plain(value).replace(/\*+$/u, '').trim()
  const month = '(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)'
  const dash = '\\s*[-–]\\s*'
  const normalised = text.replaceAll('&ndash;', '–').replaceAll('&#8211;', '–')
  const single = new RegExp(`^(\\d{1,2}) ${month} (\\d{4})$`, 'u').exec(normalised)
  const several = new RegExp(`^(\\d{1,2})(?: ${month}(?: (\\d{4}))?)?${dash}(\\d{1,2}) ${month} (\\d{4})$`, 'u').exec(
    normalised,
  )
  let first: undefined | { day: number; monthName: string; year: number }

  if (single !== null) {
    first = { day: Number(single[1]), monthName: single[2] ?? '', year: Number(single[3]) }
  } else if (several !== null) {
    const monthName = several[2] ?? several[5] ?? ''

    first = {
      day: Number(several[1]),
      monthName,
      // A weekend from 31 December to 2 January belongs to the year before the one named.
      year:
        several[3] === undefined
          ? Number(several[6]) - (months.indexOf(monthName) > months.indexOf(several[5] ?? '') ? 1 : 0)
          : Number(several[3]),
    }
  }

  if (first === undefined) {
    return undefined
  }

  const monthNumber = months.indexOf(first.monthName) + 1
  const start = Date.UTC(first.year, monthNumber - 1, first.day)
  const check = new Date(start)

  if (check.getUTCMonth() !== monthNumber - 1 || check.getUTCDate() !== first.day) {
    return undefined
  }

  if (several !== null) {
    const lastMonth = months.indexOf(several[5] ?? '')
    const lastYear = Number(several[6])
    const last = new Date(Date.UTC(lastYear, lastMonth, Number(several[4])))

    // The last day exists, and does not come before the first. A first day that is put in the
    // year before is a weekend over the New Year, not eleven months.
    if (
      last.getUTCMonth() !== lastMonth ||
      last.getUTCDate() !== Number(several[4]) ||
      last.getTime() < start ||
      (first.year < lastYear && last.getTime() - start > 31 * 24 * 60 * 60 * 1000)
    ) {
      return undefined
    }
  }

  return {
    day: first.day,
    isoDate: `${first.year}-${String(monthNumber).padStart(2, '0')}-${String(first.day).padStart(2, '0')}`,
    month: monthNumber,
    single: single !== null,
    text,
    year: first.year,
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

  for (const line of value
    .replace(/\{\{\s*(?:rode kaart(?: VAR)?|penmis)\s*\|[^{}]*\}\}/giu, '')
    .split(/<br\s*\/?>/iu)) {
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

/**
 * The round of a play-off match from the heading above it, with the leg when the box says
 * which: `Halve finale, wedstrijd 1/2`. Null when the heading is not a round we know.
 */
function playoffRound(heading: string, leg: string): null | string {
  const name = /^halve finales?$/iu.test(heading) ? 'Halve finale' : /^finale$/iu.test(heading) ? 'Finale' : null
  const part = /^wedstrijd (\d)\/(\d)$/iu.exec(leg)

  return name === null ? null : part === null ? name : `${name}, wedstrijd ${part[1]}/${part[2]}`
}

/**
 * The text under the heading of the play-offs for the Conference League, up to the next heading
 * of the same level, or undefined when the page has none. The heading was `UEFA Europa
 * Conference League` for the first years.
 */
function playoffSection(text: string): string | undefined {
  const headings = [...text.matchAll(/^==[ \t]*([^=\n].*?)[ \t]*==[ \t]*$/gmu)]
  const start = headings.findIndex((heading) => playoffHeading.test(plain(heading[1] ?? '')))
  const found = headings[start]

  if (found === undefined) {
    return undefined
  }

  const next = headings[start + 1]

  return text.slice(found.index + found[0].length, next?.index)
}

/**
 * What is wrong with the brackets of a score, or null: a part of the match cannot be higher
 * than what follows it, and a score after 90 minutes needs extra time.
 */
function scoreProblem(score: Extract<ParsedScore, { kind: 'score' }>, extraTimeSaid: boolean): null | string {
  if (score.afterNinety !== null && !extraTimeSaid) {
    return 'after 90 minutes but no extra time'
  }

  const afterNinety = score.afterNinety ?? score

  return within(score.afterNinety, score) && within(score.halfTime, afterNinety) ? null : 'that does not add up'
}

/** Whether no number of a part of the match is higher than the same number of the whole. */
function within(part: null | Pair, whole: Pair): boolean {
  return part === null || (part.home <= whole.home && part.away <= whole.away)
}

/** A pair of numbers such as `2 – 1`, after the spaces and the dashes of Wikipedia. */
const pairPattern = '(\\d{1,2}) ?[–-] ?(\\d{1,2})'

/**
 * Whether a match of this competition and round keeps the score after 90 minutes when it goes
 * to extra time: the cup and the play-offs for the Conference League, and in the play-offs only
 * a round played over one match. In the years the semi-final was played over two matches, extra
 * time came after the second one, and the round says which leg it is (see `playoffRound`).
 */
function keepsScoreAfterNinety(competition: Competition, round: string): boolean {
  return (
    competition === 'KNVB Beker' || (competition === 'Play-offs Conference League' && !round.includes(', wedstrijd'))
  )
}

/**
 * The number of spectators of a box: none when the page leaves it open (empty, a dash or
 * `n.b.`), a count, or something we cannot read. Dots, spaces and non-breaking spaces separate
 * the thousands (`21.022`), and a count above `matchLimits.attendance` is a typing error.
 */
function parseAttendance(value: string): { count: number; kind: 'count' } | { kind: 'none' } | { kind: 'unknown' } {
  const text = plain(value)

  if (text === '' || /^(?:[–—-]|n\.? ?b\.?)$/iu.test(text)) {
    return { kind: 'none' }
  }
  if (!/^(?:\d{1,3}(?:[.\s]\d{3})+|\d+)$/u.test(text)) {
    return { kind: 'unknown' }
  }

  const count = Number(text.replace(/[.\s]/gu, ''))

  return count > matchLimits.attendance ? { kind: 'unknown' } : { count, kind: 'count' }
}

/**
 * The full name of the referee of a box: from the target of the first link when the name is
 * linked (a replacement after it, `([[Joshua Kuipers|Kuipers]] 46')`, is left out), else the
 * text up to a bracket. A disambiguation in the title (`Jan Smit (scheidsrechter)`) goes, and
 * the control characters with it. None when the page leaves it open; unknown when what is left
 * is no name: markup we do not read, or a name longer than the database holds.
 */
function parseReferee(value: string): { kind: 'name'; name: string } | { kind: 'none' } | { kind: 'unknown' } {
  const page = linkedPage(value)
  const text = plain(value)

  if (text === '' || /^(?:[–—-]|n\.? ?b\.?)$/iu.test(text)) {
    return { kind: 'none' }
  }

  const name = printable(page === null ? text.replace(/\s*\(.*$/u, '') : page.replace(/\s*\([^)]*\)$/u, ''))
    .replace(/\s+/gu, ' ')
    .trim()

  return name === '' || /[[\]{}<>|]/u.test(name) || name.length > matchLimits.referee
    ? { kind: 'unknown' }
    : { kind: 'name', name }
}

/**
 * The score of a box: none yet, a score, called off, or something we do not know. A score is
 * the final score. The older cup pages add the score at half time in brackets
 * (`2 – 1 (1 – 0)`), or after extra time the score after 90 minutes and then the score at half
 * time (`2 – 4 (2 – 2, 1 – 1)`). The final score is the score of the match; the brackets are
 * read and checked, and `readMatch` keeps the score after 90 minutes (see `scoreAfterNinety`),
 * not the half time score.
 */
function parseScore(value: string): ParsedScore {
  const text = plain(value)

  if (text === '' || /^[–-]$/u.test(text)) {
    return { kind: 'none' }
  }
  if (/^gestaakt\b/iu.test(text)) {
    const minute = /^gestaakt\s+(\d{1,3})\s*['’′]/iu.exec(text)?.[1]

    return { kind: 'stopped', minute: minute === undefined ? null : Number(minute) }
  }

  const score = new RegExp(`^${pairPattern}(?: ?\\(${pairPattern}(?:, ?${pairPattern})?\\))?$`, 'u').exec(text)

  if (score !== null) {
    const pair = (at: number): null | Pair =>
      score[at] === undefined ? null : { away: Number(score[at + 1]), home: Number(score[at]) }
    const [inBrackets, last] = [pair(3), pair(5)]

    return {
      afterNinety: last === null ? null : inBrackets,
      away: Number(score[2]),
      halfTime: last ?? inBrackets,
      home: Number(score[1]),
      kind: 'score',
    }
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

  const time = /^(\d{1,2}):(\d{2})(?: uur)?$/u.exec(text)
  const hours = Number(time?.[1])
  const minutes = Number(time?.[2])

  return time === null || hours > 23 || minutes > 59 ? undefined : { hours, minutes }
}

/**
 * The spectators and the referee of a match, from the block that began it: the block of a match
 * that was stopped is leading, as the rest is another day with another audience. A field that
 * is open or cannot be read is null, and `problem` says which of them could not be read; they
 * never stop the import of the match. Only a played match has spectators.
 */
function readFacts(
  box: Template,
  played: boolean,
  name: string,
): { attendance: null | number; problem: null | string; referee: null | string } {
  const attendance = parseAttendance(box.params.get('attendance') ?? '')
  const referee = parseReferee(box.params.get('referee') ?? '')
  const problems = [
    ...(attendance.kind === 'unknown' ? ['the attendance is not a number we can use'] : []),
    ...(referee.kind === 'unknown' ? ['the referee is not a name we can use'] : []),
  ]

  return {
    attendance: played && attendance.kind === 'count' ? attendance.count : null,
    problem: problems.length === 0 ? null : `${name} ${problems.join(' and ')}`,
    referee: referee.kind === 'name' ? referee.name : null,
  }
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
 *
 * A match that was stopped is the block that says `Gestaakt 82' (2 – 0)`, with `rest` the
 * later block that finished it (see `restOf`). The stopped block gives where and when the
 * match began: the stadium, the date, the kick-off and who was at home, so the statistics per
 * stadium count the match for the place it began. The rest gives the result and the goals, and
 * the day and the stadium for the note (see `stoppedNote`). The spectators and the referee
 * are the ones of the stopped block (see `readFacts`).
 */
function readMatch(box: Template, competition: Competition, round: null | string, rest?: Template): ReadMatch | string {
  const name = `${round ?? 'a match'} (${competition})`
  const [team1, team2] = [box.params.get('team1') ?? '', box.params.get('team2') ?? '']
  const home = linkTarget(team1).toLowerCase() === ourClub.toLowerCase()
  const opponent = plain(home ? team2 : team1)
  const stadium = plain(box.params.get('stadium') ?? '') || null
  const day = parseDate(box.params.get('date') ?? '')
  const time = parseTime(box.params.get('time') ?? '')
  const began = parseScore(box.params.get('score') ?? '')
  // The block with the result, and who is at home in it: the rest may name the clubs the other
  // way round.
  const result = rest ?? box
  const resultHome = linkTarget(result.params.get('team1') ?? '').toLowerCase() === ourClub.toLowerCase()
  const score = parseScore(result.params.get('score') ?? '')
  const penalties = parsePenalties(result.params.get('penaltyscore') ?? '')
  const extraTimeSaid = plain(result.params.get('aet') ?? '') !== ''

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
  if (score.kind === 'stopped') {
    return `${name} was stopped, and the page has no later block for the same two clubs in this round`
  }
  if (score.kind === 'unknown') {
    return `${name} has a score we do not know: '${score.text.slice(0, 40)}'`
  }

  let note: null | string = null

  if (began.kind === 'stopped' && rest !== undefined) {
    if (score.kind !== 'score' && score.kind !== 'none') {
      return `${name} was stopped, and the block that finishes it has no score we can use`
    }

    const problem = stoppedNote(began.minute, rest, score.kind === 'score')

    if (typeof problem === 'string') {
      return `${name} ${problem}`
    }
    note = problem.note
  }
  if (score.kind === 'score') {
    const problem = scoreProblem(score, extraTimeSaid)

    if (problem !== null) {
      return `${name} has a score ${problem}: '${plain(result.params.get('score') ?? '').slice(0, 40)}'`
    }
  }
  if (competition === 'Eredivisie' && (extraTimeSaid || penalties.kind !== 'none')) {
    return `${name} has extra time or a shoot-out, which only the cup and the play-offs have`
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
  const ours = score.kind === 'score' ? (resultHome ? score.home : score.away) : null
  const theirs = score.kind === 'score' ? (resultHome ? score.away : score.home) : null
  const scorers = status === 'played' ? readGoals(result, resultHome) : { goals: null, problem: null }
  const facts = readFacts(box, status === 'played', name)
  const afterNinety =
    keepsScoreAfterNinety(competition, round) && extraTimeSaid && score.kind === 'score'
      ? scoreAfterNinety(score, result.params.get('half time score') ?? '')
      : null

  return {
    afterNinetyAgainst: afterNinety === null ? null : resultHome ? afterNinety.away : afterNinety.home,
    afterNinetyFor: afterNinety === null ? null : resultHome ? afterNinety.home : afterNinety.away,
    attendance: facts.attendance,
    competition,
    dateText: kickoffAt === null ? day.text.slice(0, matchLimits.dateText) : null,
    extraTime: extraTimeSaid && score.kind === 'score',
    factsProblem: facts.problem,
    goals: scorers.goals,
    goalsAgainst: theirs,
    goalsFor: ours,
    goalsProblem: scorers.problem === null ? null : `${name}: ${scorers.problem}`,
    home,
    kickoffAt,
    matchDate: day.isoDate,
    note,
    opponent,
    opponentPage: linkedPage(home ? team2 : team1),
    penaltiesAgainst: penalties.kind === 'score' ? (resultHome ? penalties.away : penalties.home) : null,
    penaltiesFor: penalties.kind === 'score' ? (resultHome ? penalties.home : penalties.away) : null,
    referee: facts.referee,
    round,
    stadium,
    status,
  }
}

/**
 * The block that finishes a match that was stopped: the last block under the same heading for
 * the same two clubs after it, or undefined when the box is not stopped or nothing follows.
 * The block is the one with the result, as the stopped block has only the score up to the
 * minute it stopped.
 */
function restOf(box: Template, boxes: Template[]): Template | undefined {
  return parseScore(box.params.get('score') ?? '').kind === 'stopped'
    ? boxes.findLast(
        (other) => other.index > box.index && other.heading === box.heading && clubsOf(other) === clubsOf(box),
      )
    : undefined
}

/**
 * The score after 90 minutes of a match with extra time, or null when the page does not give
 * it. The older pages put it in the brackets of the score (read by `parseScore`). The newer
 * ones have it in `half time score` as two pairs, the score after 90 minutes first and then
 * the score at half time: `2 – 2, 1 – 1`. A field with one pair, an empty one or one we cannot
 * read gives null, and so does one where the pairs are the other way round or above the final
 * score, because half time cannot be later than the 90th minute. That is not a fault: the
 * match is kept without that score. It may equal the final score, when extra time had no goal.
 */
function scoreAfterNinety(score: Extract<ParsedScore, { kind: 'score' }>, field: string): null | Pair {
  if (score.afterNinety !== null) {
    return score.afterNinety
  }

  const pairs = new RegExp(`^${pairPattern}, ?${pairPattern}$`, 'u').exec(plain(field))

  if (pairs === null) {
    return null
  }

  const afterNinety = { away: Number(pairs[2]), home: Number(pairs[1]) }
  const halfTime = { away: Number(pairs[4]), home: Number(pairs[3]) }

  return within(halfTime, afterNinety) && within(afterNinety, score) ? afterNinety : null
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

/**
 * The line under a match that was stopped: the minute, and when and where the rest was played.
 * It says what the page says and nothing about why, and nothing about who was there. A rest
 * without a result yet is still to be played. A name that ends in "Stadion" gets "het" before
 * it, as in "in het Abe Lenstra Stadion"; any other name is written as the page has it, since
 * its article can't be told from the name. The answer is a text when the page does not give
 * what the line needs.
 */
function stoppedNote(minute: null | number, rest: Template, played: boolean): string | { note: string } {
  const day = parseDate(rest.params.get('date') ?? '')
  const stadium = plain(rest.params.get('stadium') ?? '')

  if (minute === null) {
    return 'was stopped at a minute we do not know'
  }
  if (day === undefined || !day.single) {
    return `was finished on a day we do not know: '${plain(rest.params.get('date') ?? '').slice(0, 40)}'`
  }

  const note = `Gestaakt in minuut ${minute}. Het restant ${played ? 'is' : 'wordt'} op ${day.day} ${months[day.month - 1]} gespeeld${stadium === '' ? '' : ` in ${/stadion$/iu.test(stadium) ? 'het ' : ''}${stadium}`}.`

  return note.length > matchLimits.note ? 'has a note that is too long' : { note }
}
