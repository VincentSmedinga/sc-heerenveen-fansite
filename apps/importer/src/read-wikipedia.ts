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

/**
 * What the import keeps of a played league match of any club: who was at home, the goals of
 * both, the day and the round. Clubs are named as the page writes them (see `plain`), which is
 * also how the table is read, so the two can be matched (`matchClubNames`).
 */
export type ReadResult = {
  awayClub: string
  awayGoals: number
  homeClub: string
  homeGoals: number
  /** The day the match was played, or the first day when the page has only a weekend. */
  playedOn: string
  /** The number of the round, 12 for `Speelronde 12`. */
  round: number
}

/**
 * The results of the league, with a line for each played match the page lists but that could
 * not be read: a score or a date we do not know. They are left out, and the import says so in a
 * warning, since the table says how many each club has played (see `playedWarning`).
 */
export type ReadResults = { results: ReadResult[]; unread: string[] }

export type ReadStandings = { kind: 'error'; message: string } | { kind: 'read'; rows: ReadStandingsRow[] }

/**
 * One club in the table. `points` is the number on the page, so after a deduction;
 * `pointsDeducted` is the deduction itself, 0 for most clubs.
 */
export type ReadStandingsRow = {
  club: string
  drawn: number
  goalDifference: number
  goalsAgainst: number
  goalsFor: number
  lost: number
  played: number
  points: number
  pointsDeducted: number
  position: number
  won: number
}

/** The titles to try for each page of a season, the one the import prefers first. */
export type SeasonPageCandidates = Record<keyof SeasonPages, string[]>

export type SeasonPages = { cup: string; playoffs: string; programme: string; standings: string }

type Heading = { index: number; title: string }

type Template = { heading: null | string; index: number; params: Map<string, string> }

/** The name Wikipedia knows us by in the links of a match. */
const ourClub = 'sc Heerenveen'

/**
 * The headings of the play-offs of ours on the page of the play-offs, and the competition of
 * each: the Conference League from 2020/21, the Europa League before.
 */
const playoffHeadings: readonly { competition: Competition; heading: RegExp }[] = [
  { competition: 'Play-offs Conference League', heading: /^Play-offs voor de UEFA (?:Europa )?Conference League$/iu },
  { competition: 'Play-offs Europa League', heading: /^Play-offs voor de UEFA Europa League$/iu },
]

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

/** The index in `months` of the first month of a season: August. */
const seasonStartMonth = months.indexOf('augustus')

/** The two numbers of a score or a part of it, team 1 first. */
type Pair = { away: number; home: number }

type ParsedScore =
  | (Pair & {
      afterNinety: null | Pair
      extraTime: boolean
      halfTime: null | Pair
      kind: 'score'
      penalties: null | Pair
    })
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
 * The name of a club in a table or a programme: what the link shows, without the asterisks
 * after it that point to a footnote (`FC Twente *`).
 */
export function clubName(value: string): string {
  return plain(value).replace(/\s*\*+$/u, '')
}

/**
 * The page of the English Wikipedia with the Europa League matches of a season, or undefined
 * when the season has none. The seasons are listed by hand: the Dutch Wikipedia has the scores
 * of these matches only, without a date or a stadium, and the English page is the one place
 * that has them, so a season is added here after someone has read its page.
 */
export function europaLeaguePage(season: string): string | undefined {
  return Object.hasOwn(europaLeaguePages, season) ? europaLeaguePages[season] : undefined
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
 * The titles a page of a season may have, in the order to try them. The pages of 2012/13 to
 * 2014/15 are called `Eredivisie 2013/14` and `Eredivisie 2013/14/Wedstrijden`, without the
 * addition the other seasons have. That title comes second: for several seasons it is a page
 * that lists the competitions of that name, not a season. Before 2020/21 the play-offs have no
 * title: their page then holds no play-offs for the Conference League, which began that year.
 * The pages of 2011 to 2020 hold the play-offs for the Europa League, and are the pages of the
 * seasons 2010/11 to 2019/20.
 */
export function pageCandidates(season: string): SeasonPageCandidates {
  const titles = pageTitles(season)

  return {
    cup: [titles.cup],
    playoffs: Number(season.slice(0, 4)) >= firstPlayoffsSeason ? [titles.playoffs] : [],
    programme: [titles.programme, `Eredivisie ${season}/Wedstrijden`],
    standings: [titles.standings, `Eredivisie ${season}`],
  }
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
 * Reads the page of the English Wikipedia with the matches of the third qualifying round and
 * the play-off round of the Europa League, for the matches of sc Heerenveen: two ties of two
 * matches each. The page is read into the shape of the Dutch pages and goes through `readMatch`
 * like them, so a match is checked the same way. Only what the Dutch pages give is kept: the
 * scorers are left out, because the English links to players are no articles we know. The
 * opponent gets the name and the article of the Dutch Wikipedia (`europaLeagueClubs`). The
 * times are those of the page's own time zone; when the page does not name Central European
 * Summer Time, the matches get a day and no time. Anything that does not fit is an error, with
 * the season in it: the number of matches, and the sum of the scores against the aggregate of
 * the summary above them.
 */
export function readEuropaLeague(text: string, season: string): ReadProgramme {
  const cleaned = withoutRefn(clean(text))
  const name = `the Europa League page of ${season}`
  const headings = [...cleaned.matchAll(/^==[ \t]*([^=\n].*?)[ \t]*==[ \t]*$/gmu)]
  const timesKnown = /Times are \[\[Central European Summer Time/iu.test(cleaned.slice(0, headings[0]?.index))
  const matches: ReadMatch[] = []
  const problems: string[] = []

  for (const [index, heading] of headings.entries()) {
    const title = plain(heading[1] ?? '')

    if (!Object.hasOwn(europaLeagueRounds, title)) {
      continue
    }

    const round = europaLeagueRounds[title]

    const section = cleaned.slice(heading.index, headings[index + 1]?.index)
    const boxes = findTemplates(section, /\{\{\s*#invoke:\s*Football box\s*\|\s*main\s*(?=\||\n)/giu).filter(isOurs)
    const tie: ReadMatch[] = []

    if (boxes.length !== 2) {
      problems.push(`${name} has ${boxes.length} matches of ${ourClub} under '${title}', not 2`)
      continue
    }

    for (const [leg, box] of boxes.entries()) {
      const stranger = [box.params.get('team1'), box.params.get('team2')]
        .map((team) => linkTarget(team ?? ''))
        .find((target) => target.toLowerCase() !== ourClub.toLowerCase() && !Object.hasOwn(europaLeagueClubs, target))

      if (stranger !== undefined) {
        problems.push(
          `${name}: '${stranger.slice(0, 60)}' has no name on the Dutch Wikipedia in the list of the importer`,
        )
        continue
      }

      const read = readMatch(
        { ...box, heading: null, params: dutchBox(box, timesKnown) },
        'Europa League',
        `${round}, wedstrijd ${leg + 1}/2`,
      )

      if (typeof read === 'string') {
        problems.push(`${name}: ${read}`)
      } else if (read.status !== 'played') {
        problems.push(`${name}: ${read.round} has no result`)
      } else {
        tie.push(read)
      }
    }

    const problem = tie.length === 2 ? aggregateProblem(section, tie) : undefined

    if (problem !== undefined) {
      problems.push(`${name}: ${problem}`)
    }
    matches.push(...tie)
  }

  if (problems.length === 0 && matches.length !== 4) {
    problems.push(`${name} has ${matches.length} matches of ${ourClub}, not 4`)
  }

  return problems.length > 0
    ? { kind: 'error', message: problems.join('; ') }
    : { hasTemplates: true, kind: 'read', lastPlayedOn: null, matches }
}

/**
 * Reads the programme and the results of the league: the matches of sc Heerenveen, and
 * the day of the last match anyone played, which is the day the table holds for. A match
 * under a heading that is not a round of the league (a play-off) is not part of the
 * league and is left out. A match that was postponed and played later is under `Inhaalronde`
 * with its score, and counts for the round it was postponed from (see `leagueRoundOf`). A block
 * for a match that was stopped is the match, and the later block for the same two clubs only
 * finishes it (see `restOf`). The `season` (`2010/11`) gives the year of a date that has none
 * (see `parseDate`); without it such a date is not one we know.
 */
export function readLeague(text: string, season?: string): ReadProgramme {
  const boxes = matchBoxes(text)

  if (boxes.length === 0) {
    return { kind: 'error', message: 'the programme has no Footballbox2 templates' }
  }

  const matches: ReadMatch[] = []
  const problems: string[] = []
  let lastPlayedOn: null | string = null

  for (const box of boxes) {
    const round = leagueRoundOf(box, boxes)

    if (round === null) {
      continue
    }

    const result = stoppedOf(box) === undefined ? box : restOf(box, boxes)
    const played = parseScore(result?.params.get('score') ?? '')
    const day = parseDate(result?.params.get('date') ?? '', season)

    if (played.kind === 'score' && day !== undefined && (lastPlayedOn === null || day.isoDate > lastPlayedOn)) {
      lastPlayedOn = day.isoDate
    }
    if (isOurs(box) && !isRestOfStopped(box, boxes)) {
      const match = readMatch(box, 'Eredivisie', round.name, restOf(box, boxes), season)

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
 * Reads the results of the league for every club, from the same page as `readLeague`: one for
 * each match under a round of the league, an `Inhaalronde` too, that has a score. A match that
 * is planned, postponed or stopped and not finished has none. A match that was stopped and
 * finished later is one result with the final score, on the day of the block that finishes it,
 * and who was at home is as the block that began it has it (see `restOf`). A page with the
 * results of sc Heerenveen only, as the older pages are, gives no results at all: the form of
 * a club over its last matches needs all of them. The `season` is as for `readLeague`.
 */
export function readLeagueResults(text: string, season?: string): ReadResults {
  const boxes = matchBoxes(text)
  const results: ReadResult[] = []
  const unread: string[] = []
  let others = false

  for (const box of boxes) {
    const round = leagueRoundOf(box, boxes)

    if (round === null || isRestOfStopped(box, boxes)) {
      continue
    }

    const rest = restOf(box, boxes)
    const result = rest ?? box
    const score = parseScore(result.params.get('score') ?? '')
    const [homeClub, awayClub] = [clubName(box.params.get('team1') ?? ''), clubName(box.params.get('team2') ?? '')]

    // A match of another club on the page makes it a page with every club, played or not yet.
    others ||= !isOurs(box)
    if (
      (stoppedOf(box) !== undefined &&
        (rest === undefined || ['postponed', 'stopped', 'unknown'].includes(score.kind))) ||
      (rest !== undefined && stoppedAgain(box, rest))
    ) {
      unread.push(
        `${box.heading}: ${homeClub} - ${awayClub} was stopped, and the page has no usable block that finishes it`,
      )
      continue
    }
    if (score.kind !== 'score') {
      if (score.kind === 'unknown') {
        unread.push(
          `${box.heading}: ${homeClub} - ${awayClub} has a score we do not know: '${score.text.slice(0, 40)}'`,
        )
      }
      continue
    }

    const day = parseDate(result.params.get('date') ?? '', season)
    const sameSides =
      linkTarget(result.params.get('team1') ?? '').toLowerCase() ===
      linkTarget(box.params.get('team1') ?? '').toLowerCase()

    if (day === undefined || [homeClub, awayClub].some((club) => club === '' || club.length > standingsClubMaxLength)) {
      unread.push(`${box.heading}: ${homeClub} - ${awayClub} has no date or no club names we can use`)
      continue
    }

    results.push({
      awayClub,
      awayGoals: sameSides ? score.away : score.home,
      homeClub,
      homeGoals: sameSides ? score.home : score.away,
      playedOn: day.isoDate,
      round: round.number,
    })
  }

  return others ? { results, unread } : { results: [], unread: [] }
}

/**
 * Reads the page of the play-offs of a year for the matches of sc Heerenveen under the heading
 * of the Conference League or the Europa League, and nowhere else: the other play-offs on the
 * page are for promotion and relegation, and are no business of ours. The competition is the
 * one the heading names. The round is the heading of the level above the match, `Halve finales`
 * as `Halve finale`, `Finale`, `Eerste ronde` and `Tweede ronde`. In the years a round was
 * played over two matches, each box says which one it is (`Wedstrijd 1/2`, or `Wedstrijd 1` and
 * `Wedstrijd 2` on the pages of 2013 to 2018), and the round says so too. A year in which sc
 * Heerenveen did not play has the section and no match, and that is a page without a fault. A
 * page without the section is an error: it has changed shape.
 */
export function readPlayoffs(text: string): ReadProgramme {
  const cleaned = clean(text)
  const section = playoffSection(cleaned)

  if (section === undefined) {
    return {
      kind: 'error',
      message: `the play-offs page has no section 'Play-offs voor de UEFA Conference League' or 'Play-offs voor de UEFA Europa League'`,
    }
  }

  const { competition } = section
  const rounds: Heading[] = [...section.text.matchAll(/^===[ \t]*([^=\n].*?)[ \t]*===[ \t]*$/gmu)].map((heading) => ({
    index: heading.index,
    title: plain(heading[1] ?? ''),
  }))
  const boxes = findTemplates(section.text, /\{\{\s*Footballbox2\s*(?=\||\n)/giu)
  const matches: ReadMatch[] = []
  const problems: string[] = []

  for (const box of boxes.filter((found) => isOurs(found) && !isRestOfStopped(found, boxes))) {
    const heading = rounds.findLast((candidate) => candidate.index < box.index)?.title
    const round = heading === undefined ? null : playoffRound(heading, plain(box.params.get('round') ?? ''))
    const match = readMatch(box, competition, round, restOf(box, boxes))

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
 * page gives no matches played and no points; both follow from the rest. The older seasons have
 * no Sports table template but a table of their own under a heading (see `readTableStandings`).
 */
export function readStandings(text: string): ReadStandings {
  const [table] = findTemplates(clean(text), /\{\{\s*#invoke:\s*Sports table\s*\|/giu)

  if (table === undefined) {
    return readTableStandings(clean(text))
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

    const club = clubName(table.params.get(`name_${code}`) ?? '')

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
      pointsDeducted: 0,
      position: index + 1,
      won,
    })
  }

  return { kind: 'read', rows }
}

/**
 * The headings above the table with the numbers of the regular season: `Eindstand`, `Stand na
 * 34 wedstrijden` and `Eindstand na 34 wedstrijden`. `Officiële eindstand`, the order after the
 * play-offs, has only the reasons and is not matched.
 */
const standingsHeading = /^=+[ \t]*(?:eind)?stand(?: na \d+ wedstrijden)?[ \t]*=+[ \t]*$/imu

/**
 * The first season whose page of the play-offs we read: 2010/11, the page of 2011. The page
 * holds the play-offs for the Europa League up to 2019/20, and for the Conference League from
 * 2020/21.
 */
const firstPlayoffsSeason = 2010

/** The start of a footnote that is a template of its own. */
const refn = /\{\{\s*refn\s*\|/iu

/** The pages of the English Wikipedia with Europa League matches, per season. */
const europaLeaguePages: Readonly<Record<string, string>> = {
  '2012/13': '2012–13 UEFA Europa League qualifying (third and play-off round matches)',
}

/** The sections of that page we read, and what the round is called in Dutch. */
const europaLeagueRounds: Readonly<Record<string, string>> = {
  'Play-off round': 'Play-offronde',
  'Third qualifying round': 'Derde voorronde',
}

/**
 * The opponents on the English pages, by the title of their English article, with the name and
 * the article of the Dutch Wikipedia. An English title is no key of a club, so an opponent not
 * listed here is an error until someone adds it.
 */
const europaLeagueClubs: Readonly<Record<string, string>> = {
  'FC Rapid București': 'Rapid Boekarest',
  'Molde FK': 'Molde FK',
}

/**
 * The first line of the summary that has sc Heerenveen: the two clubs, each followed by its
 * country, with the aggregate between them (`4–1`, or `1–1 (a)`), as the summary writes it.
 */
const summaryRow =
  /^\|(\[\[[^\]]*\]\]|[^|\n]*)\|[A-Z]{3}\|(\d{1,2})[–-](\d{1,2})[^|\n]*\|(\[\[[^\]]*\]\]|[^|\n]*)\|[A-Z]{3}\|/gmu

/** The attributes a cell may start with: `align=left|` or `style="width: 10px;" |`. */
const cellAttributes = /^\s*(?:[a-z-]+\s*=\s*(?:"[^"]*"|[^\s|"]+)\s*)+\|(?!\|)/iu

/** The columns of a table and the abbreviation Wikipedia gives each in its header. */
const standingsColumns = {
  drawn: 'g',
  goalDifference: 'ds',
  goalsAgainst: 'dt',
  goalsFor: 'dv',
  lost: 'v',
  played: 'gs',
  points: 'pnt',
  won: 'w',
} as const

/**
 * What is wrong with the two matches of a tie against the aggregate that the summary of the
 * section gives, or undefined: the goals of both legs added up must be that aggregate.
 */
function aggregateProblem(section: string, tie: ReadMatch[]): string | undefined {
  const row = [...section.matchAll(summaryRow)].find((found) =>
    [found[1], found[4]].some((team) => linkTarget(team ?? '').toLowerCase() === ourClub.toLowerCase()),
  )

  if (row === undefined) {
    return `the summary has no row for ${ourClub}`
  }

  const first = linkTarget(row[1] ?? '').toLowerCase() === ourClub.toLowerCase()
  const [ours, theirs] = first ? [Number(row[2]), Number(row[3])] : [Number(row[3]), Number(row[2])]
  const [goalsFor, goalsAgainst] = [
    tie.reduce((total, match) => total + (match.goalsFor ?? 0), 0),
    tie.reduce((total, match) => total + (match.goalsAgainst ?? 0), 0),
  ]

  return ours === goalsFor && theirs === goalsAgainst
    ? undefined
    : `${tie[0]?.opponent}: the matches add up to ${goalsFor}-${goalsAgainst}, the summary says ${ours}-${theirs}`
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
 * The parameters of a block of the English page in the shape `readMatch` reads: the clubs by
 * their Dutch names, the date as `2 augustus 2012`, the attendance without the commas of the
 * thousands, and the stadium without its footnote and the town after it (`Abe Lenstra Stadion,
 * Heerenveen`), as the Dutch pages name a stadium. The scorers stay out. A time with the local
 * time in brackets after it is the time before the brackets, and no time at all when the page
 * does not say which zone it is in (`timesKnown`), so the match then has a day only.
 */
function dutchBox(box: Template, timesKnown: boolean): Map<string, string> {
  const params = new Map(box.params)
  const start = /\{\{\s*Start date\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})\b/iu.exec(
    box.params.get('date') ?? '',
  )
  const month = months[Number(start?.[2]) - 1]

  for (const team of ['team1', 'team2']) {
    const target = linkTarget(box.params.get(team) ?? '')

    params.set(
      team,
      target.toLowerCase() === ourClub.toLowerCase() ? `[[${ourClub}]]` : `[[${europaLeagueClubs[target] ?? target}]]`,
    )
  }
  params.set('date', start === null || month === undefined ? '' : `${Number(start[3])} ${month} ${start[1]}`)
  params.set('time', timesKnown ? plain(box.params.get('time') ?? '').replace(/\s*\(.*\)$/u, '') : '')
  params.set('attendance', plain(box.params.get('attendance') ?? '').replace(/(?<=\d),(?=\d{3}\b)/gu, ''))
  params.set(
    'stadium',
    plain(withoutRefn(box.params.get('stadium') ?? ''))
      .split(',')[0]
      ?.trim() ?? '',
  )
  params.delete('goals1')
  params.delete('goals2')

  return params
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

/** Whether a block has a score of some kind, so is not waiting for the match or called off. */
function hasResult(box: Template): boolean {
  return !['none', 'postponed'].includes(parseScore(box.params.get('score') ?? '').kind)
}

/** What a header cell stands for: the abbreviation of `{{afkorting|gs|...}}`, or its text. */
function headerKey(cell: string): string {
  const abbreviation = /^\{\{\s*afkorting\s*\|([^|}]*)/iu.exec(cell)?.[1]

  return (abbreviation ?? plain(cell)).trim().toLowerCase()
}

function isOurs(box: Template): boolean {
  return [box.params.get('team1'), box.params.get('team2')].some(
    (team) => team !== undefined && linkTarget(team).toLowerCase() === ourClub.toLowerCase(),
  )
}

/**
 * Whether a block finishes a match that was stopped: an earlier block is for the same two
 * clubs and is a stopped match that this block can finish (see `restOf`). That earlier block is
 * the match, so this one is not a match of its own.
 */
function isRestOfStopped(box: Template, boxes: Template[]): boolean {
  return boxes.some((other) => other.index < box.index && restsOf(other, boxes).includes(box))
}

/**
 * Whether a block under a round of the league has a plain score and says in its `report` that
 * the match was stopped, as the page of 2011/12 does for Excelsior - AZ: `0 – 0` and "In de
 * rust gestaakt". The block under an `Inhaalronde` with the same number finishes it.
 */
function isStoppedByReport(box: Template): boolean {
  return (
    /^Speelronde \d{1,2}(?: \(was \d{1,2}\))?$/u.test(box.heading ?? '') &&
    parseScore(box.params.get('score') ?? '').kind === 'score' &&
    /gestaakt/iu.test(reportText(box))
  )
}

/**
 * The round of the league a block counts for, or null when it counts for none. A block under
 * `Speelronde 17` is in that round. A match that was postponed is on the page twice: a block
 * without a score under its own round, and the block with the score under `Inhaalronde 17`,
 * where the number is the round it was postponed from. The second one is in round 17 as well,
 * and replaces the first. A block under an `Inhaalronde` without a score is nothing yet, and
 * the block of the round stays as it is. A round that moved says so in its heading, as
 * `Speelronde 33 (was 34)` in 2018/19: it is the round with the number before the bracket, the
 * one it was played as.
 */
function leagueRoundOf(box: Template, boxes: Template[]): null | { name: string; number: number } {
  const found = /^(Speelronde|Inhaalronde) (\d{1,2})(?: \(was \d{1,2}\))?$/u.exec(box.heading ?? '')

  if (found === null) {
    return null
  }

  const digits = found[2] ?? ''
  const counts =
    found[1] === 'Inhaalronde'
      ? hasResult(box)
      : hasResult(box) ||
        !boxes.some(
          (other) => other.heading === `Inhaalronde ${digits}` && clubsOf(other) === clubsOf(box) && hasResult(other),
        )

  return counts ? { name: `Speelronde ${digits}`, number: Number(digits) } : null
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
 * The one exception is a single day with no year (`15 december`) on a page for which the caller
 * says the season: a season runs from August to July, so the month gives the year, August to
 * December the first and January to July the second. The date is the first day, and `text` is
 * what Wikipedia wrote.
 */
function parseDate(
  value: string,
  season?: string,
): undefined | { day: number; isoDate: string; month: number; single: boolean; text: string; year: number } {
  const text = plain(value).replace(/\*+$/u, '').trim()
  const month = '(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)'
  const dash = '\\s*[-–]\\s*'
  const normalised = text.replaceAll('&ndash;', '–').replaceAll('&#8211;', '–')
  const single = new RegExp(`^(\\d{1,2}) ${month} (\\d{4})$`, 'u').exec(normalised)
  const yearless = season === undefined ? null : new RegExp(`^(\\d{1,2}) ${month}$`, 'u').exec(normalised)
  const several = new RegExp(`^(\\d{1,2})(?: ${month}(?: (\\d{4}))?)?${dash}(\\d{1,2}) ${month} (\\d{4})$`, 'u').exec(
    normalised,
  )
  let first: undefined | { day: number; monthName: string; year: number }

  if (single !== null) {
    first = { day: Number(single[1]), monthName: single[2] ?? '', year: Number(single[3]) }
  } else if (yearless !== null) {
    const monthName = yearless[2] ?? ''
    const firstYear = Number(season?.slice(0, 4))

    first = {
      day: Number(yearless[1]),
      monthName,
      year: months.indexOf(monthName) >= seasonStartMonth ? firstYear : firstYear + 1,
    }
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
    single: single !== null || yearless !== null,
    text,
    year: first.year,
  }
}

/**
 * A name and the minutes of its goals: `[[Luca Oyen|Oyen]] {{goal|52}}` for the home club, and
 * `{{goal|45}} [[Jacob Trenskow|Trenskow]]` for the away club, one player to a line and
 * lines cut by `<br />`. The template takes every goal of the player: `{{goal|78||80}}` is
 * two, and `e.d.` or `o.g.` (own goal) or `pen.` or `p` (penalty) after a minute belongs to
 * that goal. A mark in brackets before or after the name is a part of the goal as well, not of
 * the name: `([[Strafschop|pen]]) [[Hakim Ziyech]]` is a penalty of Hakim Ziyech. `pen`, `pen.`
 * and `p` mean a penalty and `e.d.` and `o.g.` an own goal. A mark belongs to one goal, so it
 * is no use on a line with more than one. Red cards and missed penalties in the same field are
 * not goals and are left out. Anything else, a goal without a name, a part we do not know, a
 * mark we do not know or a template we do not know, is a text we cannot read: the answer is
 * then a reason and no goals at all, since half a list says something false.
 */
function parseGoalLines(value: string, ours: boolean): { goals: ReadGoal[] } | { problem: string } {
  const goals: ReadGoal[] = []

  for (const line of value
    .replace(/\{\{\s*(?:rode kaart(?: VAR)?|penmis)\s*\|[^{}]*\}\}/giu, '')
    .split(/<br\s*\/?>/iu)) {
    const templates = [...line.matchAll(/\{\{\s*goal\s*\|([^{}]*)\}\}/giu)]
    // A mark in brackets is not a part of the name, and its link is not the page of the player.
    // A link is skipped whole, for its title may have brackets: `[[Wass (voetballer)|Wass]]`.
    const marks: string[] = []
    const withoutGoals = line
      .replace(/\{\{\s*goal\s*\|[^{}]*\}\}/giu, ' ')
      .replace(/\[\[[^\]]*\]\]|\(([^()]*)\)/gu, (found, mark: string | undefined) => {
        if (mark === undefined) {
          return found
        }
        marks.push(plain(mark))
        return ' '
      })
    // What is left of a line besides its goals is the name; a comma between templates is not.
    const name = plain(withoutGoals).replace(/^[\s,;]+|[\s,;]+$/gu, '')

    if (templates.length === 0) {
      if (/\{\{|\}\}/u.test(line)) {
        return { problem: `a line of the scorers has a template we do not know: '${plain(line).slice(0, 40)}'` }
      }
      continue
    }
    if (name === '' || name.length > matchGoalPlayerMaxLength || /[{}[\]|]/u.test(name)) {
      return { problem: `a goal has no usable name: '${plain(line).slice(0, 40)}'` }
    }

    const playerPage = linkedPage(withoutGoals)
    const lineStart = goals.length

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
        } else if (['e.d.', 'o.g.', 'p', 'pen.'].includes(token) && last !== undefined) {
          last[token === 'e.d.' || token === 'o.g.' ? 'ownGoal' : 'penalty'] = true
          if (last.ownGoal && last.penalty) {
            return { problem: `a goal of ${name} is both an own goal and a penalty` }
          }
        } else {
          return { problem: `a goal of ${name} has a part we do not know: '${token.slice(0, 40)}'` }
        }
      }
    }

    for (const mark of marks) {
      const own = ['e.d.', 'o.g.'].includes(mark)
      const lineGoals = goals.slice(lineStart)

      if (!own && !['p', 'pen', 'pen.'].includes(mark)) {
        return { problem: `a goal of ${name} has a mark we do not know: '(${mark.slice(0, 40)})'` }
      }
      if (lineGoals.length !== 1) {
        return { problem: `a mark '(${mark})' is on a line of ${name} with ${lineGoals.length} goals` }
      }

      const goal = lineGoals[0]

      if (goal !== undefined) {
        goal[own ? 'ownGoal' : 'penalty'] = true
        if (goal.ownGoal && goal.penalty) {
          return { problem: `a goal of ${name} is both an own goal and a penalty` }
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

/** The headings of a round of the play-offs, and the name of the round. */
const playoffRoundNames: readonly (readonly [RegExp, string])[] = [
  [/^halve finales?$/iu, 'Halve finale'],
  [/^finale$/iu, 'Finale'],
  [/^eerste ronde$/iu, 'Eerste ronde'],
  [/^tweede ronde$/iu, 'Tweede ronde'],
]

/**
 * The round of a play-off match from the heading above it, with the leg when the box says
 * which: `Halve finale, wedstrijd 1/2`. Null when the heading is not a round we know.
 */
function playoffRound(heading: string, leg: string): null | string {
  const name = playoffRoundNames.find(([pattern]) => pattern.test(heading))?.[1] ?? null
  const part = /^wedstrijd (\d)(?:\/(\d))?$/iu.exec(leg)

  // The pages of 2013 to 2018 write `Wedstrijd 1` and `Wedstrijd 2`, always in a pair.
  return name === null ? null : part === null ? name : `${name}, wedstrijd ${part[1]}/${part[2] ?? '2'}`
}

/**
 * The text under the heading of the play-offs for the Conference League or the Europa League,
 * up to the next heading of the same level, with the competition the heading names, or
 * undefined when the page has none. The heading was `UEFA Europa Conference League` for the
 * first years of the Conference League.
 */
function playoffSection(text: string): undefined | { competition: Competition; text: string } {
  const headings = [...text.matchAll(/^==[ \t]*([^=\n].*?)[ \t]*==[ \t]*$/gmu)]

  for (const [start, found] of headings.entries()) {
    const title = plain(found[1] ?? '')
    const known = playoffHeadings.find(({ heading }) => heading.test(title))

    if (known !== undefined) {
      return {
        competition: known.competition,
        text: text.slice(found.index + found[0].length, headings[start + 1]?.index),
      }
    }
  }

  return undefined
}

/**
 * Reads the table of the older seasons: a wikitable (`{|`) under a heading such as `Eindstand`,
 * with the columns told by the header, as `{{afkorting|gs|...}}` or as plain text. The columns
 * differ from season to season (a column `PA` for a deduction of points, the club under `club`
 * or `Team`), so each is found by its header, and a missing one is an error, except `PA`: a
 * table without it has no deductions. The numbers are the ones on the page, points and goal
 * difference included: `checkStandings` tests them with the deduction, and nothing is worked
 * out here. A position that is not the next one is an error too.
 */
function readTableStandings(text: string): ReadStandings {
  const noTable: ReadStandings = {
    kind: 'error',
    message: 'the league table has no Sports table template and no table under Eindstand or Stand na 34 wedstrijden',
  }
  const heading = standingsHeading.exec(text)

  if (heading === null) {
    return noTable
  }

  const rest = text.slice(heading.index + heading[0].length)
  const start = rest.indexOf('{|')
  const end = rest.indexOf('\n|}', start)

  // A table further down, under another heading, is not the table of this heading.
  if (start === -1 || end === -1 || /^=+[^=\n]+=+[ \t]*$/mu.test(rest.slice(0, start))) {
    return noTable
  }

  const [header = '', ...body] = rest.slice(start + 2, end).split(/^\|-.*$/mu)
  const names = tableCells(header, '!', '!!').map(headerKey)
  const index: Partial<Record<'club' | keyof typeof standingsColumns, number>> = {}

  for (const [field, key] of Object.entries(standingsColumns)) {
    const found = names.indexOf(key)

    if (found !== -1) {
      index[field as keyof typeof standingsColumns] = found
    }
  }
  index.club = names.findIndex((name) => name === 'club' || name === 'team')

  const deduction = names.indexOf('pa')

  for (const [field, found] of Object.entries(index)) {
    if (found === undefined || found < 0) {
      return { kind: 'error', message: `the league table has no column for ${field}` }
    }
  }

  const rows: ReadStandingsRow[] = []

  for (const line of body.filter((part) => part.trim() !== '')) {
    const cells = tableCells(line, '|', '||')

    if (cells.length !== names.length) {
      return { kind: 'error', message: `the league table has a row with ${cells.length} cells, not ${names.length}` }
    }

    const position = /^(\d{1,2})\.?$/u.exec(plain(cells[0] ?? ''))?.[1]
    const club = clubName(cells[index.club ?? 0] ?? '')

    if (position === undefined || Number(position) !== rows.length + 1) {
      return { kind: 'error', message: `the league table has no position ${rows.length + 1} in row ${rows.length + 1}` }
    }
    if (club === '' || club.length > standingsClubMaxLength) {
      return { kind: 'error', message: `the league table has no usable club in row ${rows.length + 1}` }
    }

    const deducted = deduction === -1 ? '' : plain(cells[deduction] ?? '').replaceAll('−', '-')

    // Wikipedia writes the deduction as a loss (`−6`) or as a number (`6`).
    if (deducted !== '' && !/^-?\d{1,3}$/u.test(deducted)) {
      return {
        kind: 'error',
        message: `${club} has no whole number for the deduction of points (${deducted.slice(0, 10)})`,
      }
    }

    const numbers: Partial<Record<keyof typeof standingsColumns, number>> = {}

    for (const field of Object.keys(standingsColumns) as (keyof typeof standingsColumns)[]) {
      const value = plain(cells[index[field] ?? 0] ?? '')
        .replaceAll('−', '-')
        .replace(/^\+/u, '')

      if (!/^-?\d{1,3}$/u.test(value)) {
        return { kind: 'error', message: `the league table has no number for ${field} of ${club}` }
      }
      numbers[field] = Number(value)
    }

    const { drawn = 0, goalDifference = 0, goalsAgainst = 0, goalsFor = 0, lost = 0, played = 0 } = numbers
    const { points = 0, won = 0 } = numbers

    rows.push({
      club,
      drawn,
      goalDifference,
      goalsAgainst,
      goalsFor,
      lost,
      played,
      points,
      pointsDeducted: Math.abs(Number(deducted)),
      position: rows.length + 1,
      won,
    })
  }

  return { kind: 'read', rows }
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

/**
 * The cells of a row or the header of a wikitable, without the attributes in front of each
 * (`align=left|`). `lead` starts a line with cells and `separator` separates cells on one line.
 */
function tableCells(part: string, lead: '!' | '|', separator: '!!' | '||'): string[] {
  return part
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith(lead) && !line.startsWith('|}'))
    .flatMap((line) => line.slice(1).split(separator))
    .map((cell) => cell.replace(cellAttributes, '').trim())
}

/** Whether no number of a part of the match is higher than the same number of the whole. */
function within(part: null | Pair, whole: Pair): boolean {
  return part === null || (part.home <= whole.home && part.away <= whole.away)
}

/** The text without the footnotes of `{{refn|...}}`, which can hold links and templates. */
function withoutRefn(text: string): string {
  let result = text

  for (let found = refn.exec(result); found !== null; found = refn.exec(result)) {
    const end = closingBraces(result, found.index)

    if (end === undefined) {
      break
    }
    result = result.slice(0, found.index) + result.slice(end + 2)
  }

  return result
}

/** A pair of numbers such as `2 – 1`, after the spaces and the dashes of Wikipedia. */
const pairPattern = '(\\d{1,2}) ?[–-] ?(\\d{1,2})'

/**
 * Whether a match of this competition and round keeps the score after 90 minutes when it goes
 * to extra time: the cup and the play-offs for the Conference League and the Europa League, and
 * in the play-offs only a round played over one match. In the years a round was played over two
 * matches, extra time came after the second one, and the round says which leg it is (see
 * `playoffRound`).
 */
function keepsScoreAfterNinety(competition: Competition, round: string): boolean {
  return (
    competition === 'KNVB Beker' ||
    ((competition === 'Play-offs Conference League' || competition === 'Play-offs Europa League') &&
      !round.includes(', wedstrijd'))
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
 * The score of a box: none yet, a score, stopped, called off, or something we do not know. A
 * score is the final score. The older cup pages add the score at half time in brackets
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
  // The older pages write `Gest. 57' (0 – 0)`, the 2018/19 page `(0 – 0)<br />Gestaakt 1'`.
  // `Gest.` is only a stopped score with the minute, since the word alone says too little.
  const stopped = stoppedScore.exec(text)

  if (stopped !== null) {
    return { kind: 'stopped', minute: Number(stopped[1] ?? stopped[6]) }
  }
  if (/^gestaakt\b/iu.test(text)) {
    const minute = /^gestaakt\s+(\d{1,3})\s*['’′]/iu.exec(text)?.[1]

    return { kind: 'stopped', minute: minute === undefined ? null : Number(minute) }
  }

  const score = readScoreParts(text)

  if (score !== undefined) {
    return { ...score, kind: 'score' }
  }

  return /^(uitgesteld|afgelast)\b/iu.test(text) ? { kind: 'postponed' } : { kind: 'unknown', text }
}

/**
 * A stopped score with its minute, in the two orders of the pages: the word and the minute and
 * then the score at that moment in brackets (`Gest. 57' (0 – 0)`), or the score in brackets
 * and then the word and the minute (`(0 – 0) Gestaakt 1'`). The brackets hold two numbers
 * each, so the minute is group 1 for the first order and group 6 for the other.
 */
const stoppedScore = new RegExp(
  `^(?:(?:gestaakt|gest\\.) ?(\\d{1,3}) ?['’′](?: ?\\(${pairPattern}\\))?|\\(${pairPattern}\\) ?(?:gestaakt|gest\\.) ?(\\d{1,3}) ?['’′])$`,
  'iu',
)

/** What follows the final score on older pages: `n.v.`, `(nv)`, brackets or `(6 – 7 pen.)`. */
const scorePart = new RegExp(
  `\\s*(?:(n\\.?v\\.?|\\(n\\.?v\\.?\\))|\\(${pairPattern}(?:, ?${pairPattern})?\\)|\\(${pairPattern} pen\\.\\))`,
  'uy',
)

/**
 * The time of a box in hours and minutes, null when it is empty, undefined when it is not
 * a time.
 */
function parseTime(value: string): null | undefined | { hours: number; minutes: number } {
  const text = plain(value).replace(/\*+$/u, '').trim()

  if (text === '') {
    return null
  }

  const time = /^(\d{1,2})[:.](\d{2})(?: uur)?$/u.exec(text)
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
function readMatch(
  box: Template,
  competition: Competition,
  round: null | string,
  rest?: Template,
  season?: string,
): ReadMatch | string {
  const name = `${round ?? 'a match'} (${competition})`
  const [team1, team2] = [box.params.get('team1') ?? '', box.params.get('team2') ?? '']
  const home = linkTarget(team1).toLowerCase() === ourClub.toLowerCase()
  const opponent = plain(home ? team2 : team1)
  const stadium = plain(box.params.get('stadium') ?? '') || null
  const day = parseDate(box.params.get('date') ?? '', season)
  const time = parseTime(box.params.get('time') ?? '')
  const began = stoppedOf(box)
  // The block with the result, and who is at home in it: the rest may name the clubs the other
  // way round.
  const result = rest ?? box
  const resultHome = linkTarget(result.params.get('team1') ?? '').toLowerCase() === ourClub.toLowerCase()
  const score = parseScore(result.params.get('score') ?? '')
  const shootOut = parsePenalties(result.params.get('penaltyscore') ?? '')
  const extraTimeSaid = plain(result.params.get('aet') ?? '') !== '' || (score.kind === 'score' && score.extraTime)
  // The older pages write the shoot-out in the score (`(6 – 7 pen.)`), the newer in a field.
  const penalties =
    shootOut.kind === 'none' && score.kind === 'score' && score.penalties !== null
      ? ({ ...score.penalties, kind: 'score' } as const)
      : shootOut

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
  if (score.kind === 'stopped' || (began !== undefined && rest === undefined)) {
    return `${name} was stopped, and the page has no later block for the same two clubs in this round`
  }
  if (score.kind === 'unknown') {
    return `${name} has a score we do not know: '${score.text.slice(0, 40)}'`
  }

  let note: null | string = null

  if (began !== undefined && rest !== undefined) {
    if (score.kind !== 'score' && score.kind !== 'none') {
      return `${name} was stopped, and the block that finishes it has no score we can use`
    }
    if (stoppedAgain(box, rest)) {
      return `${name} was stopped, and the block that finishes it was stopped too`
    }

    const problem = stoppedNote(began, rest, score.kind === 'score', season)

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
 * The parts of a score as the older pages write them: the final score first, then any of:
 * `n.v.` for extra time; one pair in brackets for half time (`2 – 1 (1 – 0)`); two pairs in one
 * pair of brackets for the score after 90 minutes and then half time (`2 – 4 (2 – 2, 1 – 1)`);
 * the same as two pairs in brackets of their own (`2 – 2 n.v. (2 – 2) (0 – 1)`); and the
 * shoot-out as `(6 – 7 pen.)`. Undefined for anything else, such as a part twice.
 */
function readScoreParts(text: string): Omit<Extract<ParsedScore, { kind: 'score' }>, 'kind'> | undefined {
  const head = new RegExp(`^${pairPattern}`, 'u').exec(text)

  if (head === null) {
    return undefined
  }

  const pair = (home: string | undefined, away: string | undefined): null | Pair =>
    home === undefined || away === undefined ? null : { away: Number(away), home: Number(home) }
  const brackets: { first: Pair; second: null | Pair }[] = []
  let extraTime = false
  let penalties: null | Pair = null

  let end = head[0].length

  scorePart.lastIndex = end

  for (let found = scorePart.exec(text); found !== null; found = scorePart.exec(text)) {
    end = scorePart.lastIndex
    const [, extra, firstHome, firstAway, secondHome, secondAway, penHome, penAway] = found
    const [first, second, shootOut] = [pair(firstHome, firstAway), pair(secondHome, secondAway), pair(penHome, penAway)]

    if (extra !== undefined) {
      if (extraTime) {
        return undefined
      }
      extraTime = true
    } else if (shootOut !== null) {
      if (penalties !== null) {
        return undefined
      }
      penalties = shootOut
    } else if (first !== null) {
      brackets.push({ first, second })
    }
  }

  const [one, two] = brackets

  if (end !== text.length || brackets.length > 2 || (two !== undefined && (one?.second || two.second))) {
    return undefined
  }

  const [afterNinety, halfTime] =
    one === undefined
      ? [null, null]
      : one.second !== null
        ? [one.first, one.second]
        : two === undefined
          ? [null, one.first]
          : [one.first, two.first]

  return {
    afterNinety,
    away: Number(head[2]),
    extraTime,
    halfTime,
    home: Number(head[1]),
    penalties,
  }
}

/**
 * What the `report` field of a block says, as the page shows it: without the addresses of the
 * links, since an address such as `nos.nl/artikel/2311740-...-gestaakt-duel` is no statement
 * of ours to read, only a link text is.
 */
function reportText(box: Template): string {
  return plain((box.params.get('report') ?? '').replace(/\[(?:https?:)?\/\/\S+\s*([^\]]*)\]/gu, '$1'))
}

/**
 * The block that finishes a match that was stopped: the last block for the same two clubs
 * after it, or undefined when the box is not stopped or nothing follows. The block is the one
 * with the result, as the stopped block has only the score up to the minute it stopped.
 */
function restOf(box: Template, boxes: Template[]): Template | undefined {
  return restsOf(box, boxes).at(-1)
}

/**
 * The blocks that can finish a match that was stopped, in the order of the page: those after
 * it for the same two clubs under the same heading and, for a block under `Speelronde 13`,
 * those under `Inhaalronde 13` (the number before any bracket), and nowhere else.
 */
function restsOf(box: Template, boxes: Template[]): Template[] {
  if (stoppedOf(box) === undefined) {
    return []
  }

  const round = /^Speelronde (\d{1,2})\b/u.exec(box.heading ?? '')?.[1]

  return boxes.filter(
    (other) =>
      other.index > box.index &&
      clubsOf(other) === clubsOf(box) &&
      (other.heading === box.heading || (round !== undefined && other.heading === `Inhaalronde ${round}`)),
  )
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
 * Whether the block that finishes a stopped match, under an `Inhaalronde`, is stopped itself:
 * its `report` says so. A block under the same heading is read as it always was.
 */
function stoppedAgain(box: Template, rest: Template): boolean {
  return rest.heading !== box.heading && /gestaakt/iu.test(reportText(rest))
}

/**
 * The line under a match that was stopped: the minute, and when and where the rest was played.
 * It says what the page says and nothing about why, and nothing about who was there. A rest
 * without a result yet is still to be played. A name that ends in "Stadion" gets "het" before
 * it, as in "in het Abe Lenstra Stadion"; any other name is written as the page has it, since
 * its article can't be told from the name. The answer is a text when the page does not give
 * what the line needs.
 */
function stoppedNote(
  began: { inBreak: boolean; minute: null | number },
  rest: Template,
  played: boolean,
  season?: string,
): string | { note: string } {
  const day = parseDate(rest.params.get('date') ?? '', season)
  const stadium = plain(rest.params.get('stadium') ?? '')

  if (began.minute === null && !began.inBreak) {
    return 'was stopped at a minute we do not know'
  }
  if (day === undefined || !day.single) {
    return `was finished on a day we do not know: '${plain(rest.params.get('date') ?? '').slice(0, 40)}'`
  }

  const note = `Gestaakt ${began.minute === null ? 'in de rust' : `in minuut ${began.minute}`}. Het restant ${played ? 'is' : 'wordt'} op ${day.day} ${months[day.month - 1]} gespeeld${stadium === '' ? '' : ` in ${/stadion$/iu.test(stadium) ? 'het ' : ''}${stadium}`}.`

  return note.length > matchLimits.note ? 'has a note that is too long' : { note }
}

/**
 * What a block says about being stopped: undefined when it is not. A score like `Gestaakt 82'
 * (2 – 0)` is a stopped match, with the minute. A plain score with the word in `report` is one
 * too (see `isStoppedByReport`), and has no minute. Either may say in `report` that it was
 * "in de rust".
 */
function stoppedOf(box: Template): undefined | { inBreak: boolean; minute: null | number } {
  const score = parseScore(box.params.get('score') ?? '')

  if (score.kind !== 'stopped' && !isStoppedByReport(box)) {
    return undefined
  }

  return {
    inBreak: /\bin de rust\b/iu.test(reportText(box)),
    minute: score.kind === 'stopped' ? score.minute : null,
  }
}
