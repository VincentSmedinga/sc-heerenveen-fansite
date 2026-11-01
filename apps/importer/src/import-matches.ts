import type { Database } from '@fansite/db/client'
import type { Match, MatchGoal, MatchImport, WikipediaPageKind } from '@fansite/db/schema'

import { createClubBook, repairClubs } from '@fansite/db/clubs'
import {
  matches,
  matchGoals,
  matchImports,
  matchPageKinds,
  players,
  standings,
  wikipediaPages,
} from '@fansite/db/schema'
import { seasonOf, seasonStart } from '@fansite/db/season'
import { and, asc, eq, inArray } from 'drizzle-orm'

import type { Judgement } from './classify-change.ts'
import type { Fetcher } from './fetcher.ts'
import type { LinkedGoal, Proposal } from './match-changes.ts'
import type { ReadGoal, ReadMatch, ReadStandingsRow } from './read-wikipedia.ts'

import { checkGoals, checkMatches, checkStandings } from './check-wikipedia.ts'
import {
  classifyChange,
  classifyRemoval,
  describeState,
  goalStateOf,
  goalStateOfRead,
  isMassChange,
} from './classify-change.ts'
import { clubFullNames } from './club-names.ts'
import { isGoalOfOurPlayer, playerLinker } from './link-players.ts'
import {
  decide,
  hasStood,
  noteSeen,
  readSeasonChanges,
  recordChange,
  storeGoals,
  updateMatch,
} from './match-changes.ts'
import { pageTitles, pageUrl, readCup, readLeague, readPlayoffs, readStandings } from './read-wikipedia.ts'
import { retryUnhealthyAfterMs, unhealthyAfter, waitLimits } from './run-log.ts'
import { describeError, formatTime, printable } from './text.ts'

/**
 * What the health of an import needs from a report. The report of the matches and the report of
 * the squad both have it.
 */
export type HealthReport =
  | { kind: 'blocked-by-robots' }
  | { kind: 'error'; message: string }
  | { kind: 'imported'; warnings: string[] }
  | { kind: 'postponed' }
  | { kind: 'wait'; retryAfterSeconds: null | number }

export type MatchImportOptions = {
  clock?: () => Date
  /** The address of Wikipedia. A test gives the address of its own web server. */
  origin?: string
}

/** What came of the import of the matches. Like a feed report, every result is a value. */
export type MatchReport =
  | {
      /**
       * Nothing changed in the database: the reason says which check failed or what
       * changed.
       */
      kind: 'error'
      message: string
      season: string
    }
  | {
      /**
       * The clubs the import made or changed, one line each: a new club, the article of a
       * club, a new name. They go in the log of the run.
       */
      clubs: string[]
      kind: 'imported'
      matches: { added: number; held: number; removed: number; unchanged: number; updated: number }
      season: string
      /** The number of clubs in the table. */
      standings: number
      /** The day the table holds for. */
      validOn: string
      /** A correction that was taken over, a change that waits, and other news. */
      warnings: string[]
    }
  | {
      /**
       * The import did not ask: it reads Wikipedia once an hour, and that hour has not
       * passed.
       */
      kind: 'postponed'
      retryAt: Date
      season: string
    }
  | {
      kind: 'blocked-by-robots'
      season: string
      url: string
    }
  | {
      kind: 'wait'
      retryAfterSeconds: null | number
      season: string
      url: string
    }

type PageRead = { kind: WikipediaPageKind; text: string; title: string; version: null | string }

type Problem = Exclude<MatchReport, { kind: 'imported' | 'postponed' }>

/** The address of the Dutch Wikipedia. */
export const wikipediaOrigin = 'https://nl.wikipedia.org'

export type { LinkedGoal } from './match-changes.ts'

/** Writes a report as lines of text: one for the import, and one for each warning. */
export function formatMatchReport(report: MatchReport): string {
  const head = `Matches ${report.season}`

  switch (report.kind) {
    case 'blocked-by-robots':
      return `${head}: not read, robots.txt does not allow ${report.url}`
    case 'error':
      return `${head}: warning, nothing changed and the last good copy stays: ${printable(report.message)}`
    case 'imported':
      return [
        `${head}: ${report.matches.added} new, ${report.matches.updated} updated, ${report.matches.unchanged} unchanged, ${report.matches.removed} removed${report.matches.held === 0 ? '' : `, ${report.matches.held} held`}; table of ${report.standings} clubs for ${report.validOn}`,
        ...report.clubs.map((club) => `${head}: ${printable(club)}`),
        ...report.warnings.map((warning) => `${head}: warning, ${printable(warning)}`),
      ].join('\n')
    case 'postponed':
      return `${head}: not read, the next time is from ${formatTime(report.retryAt)}`
    case 'wait':
      return `${head}: not read, Wikipedia asks us to wait${report.retryAfterSeconds === null ? '' : ` ${report.retryAfterSeconds} seconds`}`
  }
}

/**
 * What a report makes of the health of its season, for the matches and for the squad: the last
 * time it succeeded, the failed runs in a row, the last error and warning, and when the import
 * may ask Wikipedia again. A refusal by robots.txt and a request to wait are no fault of ours,
 * and count as no failure. Undefined when the report changes nothing.
 */
export function healthAfter(
  before: MatchImport | undefined,
  report: HealthReport,
  now: Date,
): Omit<MatchImport, 'season'> | undefined {
  const kept: Omit<MatchImport, 'season'> = {
    failuresInARow: before?.failuresInARow ?? 0,
    lastError: before?.lastError ?? null,
    lastErrorAt: before?.lastErrorAt ?? null,
    lastOutcome: before?.lastOutcome ?? 'error',
    lastSuccessAt: before?.lastSuccessAt ?? null,
    lastWarning: before?.lastWarning ?? null,
    lastWarningAt: before?.lastWarningAt ?? null,
    retryAt: before?.retryAt ?? null,
  }
  const nextHour = new Date(now.getTime() + retryUnhealthyAfterMs)

  switch (report.kind) {
    case 'blocked-by-robots':
      return { ...kept, lastOutcome: 'blocked-by-robots', retryAt: nextHour }
    case 'error':
      return {
        ...kept,
        failuresInARow: kept.failuresInARow + 1,
        lastError: printable(report.message),
        lastErrorAt: now,
        lastOutcome: 'error',
        retryAt: nextHour,
      }
    case 'imported':
      return {
        ...kept,
        failuresInARow: 0,
        lastOutcome: 'imported',
        lastSuccessAt: now,
        retryAt: nextHour,
        ...(report.warnings.length === 0
          ? {}
          : { lastWarning: printable(report.warnings.join('; ')), lastWarningAt: now }),
      }
    case 'postponed':
      return undefined
    case 'wait': {
      const seconds = Math.min(
        report.retryAfterSeconds ?? waitLimits.withoutRetryAfterSeconds,
        waitLimits.longestSeconds,
      )

      return { ...kept, lastOutcome: 'wait', retryAt: new Date(now.getTime() + seconds * 1000) }
    }
  }
}

/**
 * Reads the three Wikipedia pages of the current season and stores the matches of sc Heerenveen
 * and the league table, once an hour at most. The data goes in the database only when every
 * page can be read and every check passes (`check-wikipedia.ts`), and then all at once in one
 * transaction. Otherwise nothing changes: the last good copy stays, and the report says why.
 *
 * It reads the current season only. The rows of an earlier season are never changed or removed
 * (`importPastSeason` is the way to read one). It throws when the health in the database can't
 * be written; the data itself fails into an error report.
 */
export async function importMatches(
  db: Database,
  fetcher: Fetcher,
  { clock = () => new Date(), origin = wikipediaOrigin }: MatchImportOptions = {},
): Promise<MatchReport> {
  const season = seasonOf(clock())
  const [before] = await db.select().from(matchImports).where(eq(matchImports.season, season))

  if (before?.retryAt !== null && before?.retryAt !== undefined && before.retryAt > clock()) {
    return { kind: 'postponed', retryAt: before.retryAt, season }
  }

  return readSeason(db, fetcher, season, before, origin, clock)
}

/**
 * Reads the three Wikipedia pages of a season that is over, once, and stores its matches,
 * goals, table and pages like `importMatches` does, with the same checks and in one
 * transaction. A season that is over doesn't change, so the hourly import doesn't read it
 * again: this is the command that does (`pnpm import:season`), and it asks every time it is
 * run. It writes the rows of that season only, and never those of the current season, which is
 * the hourly import's. A season that is not over is an error report, and nothing is asked or
 * written.
 */
export async function importPastSeason(
  db: Database,
  fetcher: Fetcher,
  season: string,
  { clock = () => new Date(), origin = wikipediaOrigin }: MatchImportOptions = {},
): Promise<MatchReport> {
  if (!isPastSeason(season, clock())) {
    return {
      kind: 'error',
      message: `${season} is not a season that is over; the hourly import reads the current season`,
      season,
    }
  }

  const [before] = await db.select().from(matchImports).where(eq(matchImports.season, season))

  return readSeason(db, fetcher, season, before, origin, clock)
}

/** Whether a season, such as `2025/26`, ended before the moment. */
export function isPastSeason(season: string, moment: Date): boolean {
  return isSeason(season) && Number(season.slice(0, 4)) < Number(seasonOf(moment).slice(0, 4))
}

/** Whether a text is a season: the year, a slash and the last two digits of the next year. */
export function isSeason(text: string): boolean {
  const parts = /^(\d{4})\/(\d{2})$/u.exec(text)

  return parts !== null && Number(parts[2]) === (Number(parts[1]) + 1) % 100
}

/** Whether the import has failed so often in a row that it counts as unhealthy. */
export function isUnhealthy(health: Pick<MatchImport, 'failuresInARow'>): boolean {
  return health.failuresInARow >= unhealthyAfter
}

/**
 * Makes the clubs of `club-names.ts` right in the database: a club that is there twice, or
 * under another name, is merged and gets its full name and its slug (`repairClubs` in the
 * database package). It runs at the start of every import run, before any season is read, in a
 * transaction of its own, and so does not wait for a season that can be read and stored. A run
 * that has nothing to repair writes nothing. Returns the lines for the log, one for each thing
 * it did, in English.
 *
 * A failure is no reason to stop the import: it gives a line that says so, and the warning goes
 * on the health of the current season (`match_imports`), where `pnpm run import:status` shows
 * it. The next run tries again. It never throws: when the warning can't be written either, the
 * line says that too.
 */
export async function repairKnownClubs(db: Database, clock: () => Date = () => new Date()): Promise<string[]> {
  try {
    const events = await db.transaction((transaction) => repairClubs(transaction, clubFullNames))

    return events.map((event) => `Clubs: ${printable(event)}`)
  } catch (error) {
    const now = clock()
    const warning = printable(`clubs not repaired: ${describeError(error)}`)
    const values = { lastWarning: warning, lastWarningAt: now }

    try {
      await db
        .insert(matchImports)
        .values({ lastOutcome: 'error', season: seasonOf(now), ...values })
        .onDuplicateKeyUpdate({ set: values })

      return [`Clubs: warning, ${warning}`]
    } catch (writeError) {
      return [`Clubs: warning, ${warning}; the warning was not saved: ${describeError(writeError)}`]
    }
  }
}

/**
 * A cup page without a template is no cup matches yet, early in a season. It is the page we
 * know only if the cup matches we have did not come from that page: when we read cup matches
 * from it before, a page that has none now has changed shape, and the import keeps what it has.
 * The made-up matches of the seed are not from the page, because the page was never read.
 */
async function checkEmptyCupPage(db: Database, season: string, title: string): Promise<string | undefined> {
  const [cupMatch] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.season, season), eq(matches.competition, 'KNVB Beker')))
    .limit(1)
  const [page] = await db
    .select({ title: wikipediaPages.title })
    .from(wikipediaPages)
    .where(eq(wikipediaPages.title, title))

  return cupMatch !== undefined && page !== undefined
    ? 'the cup page has no Footballbox2 templates, and we have cup matches from it'
    : undefined
}

/** The text of a result as a warning has it, from the side of the home team. */
function describeResult(
  match: Pick<
    Match,
    'goalsAgainst' | 'goalsFor' | 'home' | 'opponent' | 'penaltiesAgainst' | 'penaltiesFor' | 'status'
  >,
): string {
  if (match.status !== 'played') {
    return 'no result'
  }

  const result = match.home
    ? `sc Heerenveen ${match.goalsFor}-${match.goalsAgainst} ${match.opponent}`
    : `${match.opponent} ${match.goalsAgainst}-${match.goalsFor} sc Heerenveen`

  if (match.penaltiesFor === null || match.penaltiesAgainst === null) {
    return result
  }

  return match.home
    ? `${result} (penalties ${match.penaltiesFor}-${match.penaltiesAgainst})`
    : `${result} (penalties ${match.penaltiesAgainst}-${match.penaltiesFor})`
}

/**
 * Fetches the pages one after the other, or says why one could not be read. The page of the
 * play-offs may not be there: it comes in May, and a season that is going has none. Wikipedia
 * answering 404 for it is no fault, and the pages are then the other three. Any other answer
 * is a fault, as for the other pages.
 */
async function fetchPages(fetcher: Fetcher, season: string, origin: string): Promise<PageRead[] | Problem> {
  const titles = pageTitles(season)
  const pages: PageRead[] = []

  for (const kind of ['programme', 'standings', 'cup', 'playoffs'] as const) {
    const title = titles[kind]
    const outcome = await fetcher.fetch(pageUrl(origin, title))

    switch (outcome.kind) {
      case 'blocked-by-robots':
        return { kind: 'blocked-by-robots', season, url: outcome.url }
      case 'error':
        if (kind === 'playoffs' && outcome.reason === 'http-status' && outcome.status === 404) {
          break
        }

        return { kind: 'error', message: `${title}: ${outcome.message}`, season }
      case 'fetched':
        pages.push({
          kind,
          text: new TextDecoder('utf-8').decode(outcome.body),
          title,
          version: outcome.lastModified,
        })
        break
      case 'not-modified':
        return { kind: 'error', message: `${title}: the page answered 304 to a request without conditions`, season }
      case 'wait':
        return { kind: 'wait', retryAfterSeconds: outcome.retryAfterSeconds, season, url: outcome.url }
    }
  }

  return pages
}

/** The most names of players the warning about goals without a player lists. */
const mostUnlinkedNames = 8

/** What `storeMatches` decided to do with a match, before it writes anything. */
type Entry =
  | {
      before: Match
      goalsChanged: boolean
      judgement: Judgement
      kind: 'update'
      newValue: string
      oldValue: string
      proposal: Proposal
    }
  | { judgement: Judgement; kind: 'remove'; oldValue: string; row: Match }
  | { kind: 'add'; proposal: Proposal }

/** What `storeMatches` needs to know about the season besides the matches. */
type StoreContext = {
  /** The import has never read this season, so nothing stored comes from Wikipedia. */
  firstRead: boolean
  pastSeason: boolean
  /** The last run that read the pages with success, before this one. */
  previousReadAt: Date | null
}

/**
 * The warning for the goals of our players that have no player in the table: how many, and
 * the names as the pages show them. Undefined when every goal of ours has one.
 */
export function unlinkedWarning(goals: LinkedGoal[]): string | undefined {
  const unlinked = goals.filter((goal) => isGoalOfOurPlayer(goal) && goal.playerId === null)

  if (unlinked.length === 0) {
    return undefined
  }

  const names = [...new Set(unlinked.map((goal) => goal.player))].sort((a, b) => a.localeCompare(b, 'nl'))
  const shown = names.slice(0, mostUnlinkedNames).join(', ')

  return `${unlinked.length} ${unlinked.length === 1 ? 'goal' : 'goals'} of ours ${unlinked.length === 1 ? 'has' : 'have'} no player in the squad table: ${shown}${names.length > mostUnlinkedNames ? ', …' : ''}`
}

/** The line of the log for a change that was taken over with a note, or that waits. */
function changeLine(
  waits: boolean,
  row: Pick<Match, 'competition' | 'round'>,
  judgement: Judgement,
  before: Match,
  now: ReadMatch | undefined,
): string {
  const values =
    now !== undefined && judgement.changed.includes('result')
      ? `, from ${describeResult(before)} to ${describeResult(now)}`
      : ''

  return `${waits ? 'held, ' : ''}${row.round} (${row.competition}): ${judgement.reason}${values}`
}

/**
 * The goals to keep for a match, and the warning when the page's scorers are not used. The
 * scorers are an extra: a list that cannot be read or does not fit the result is left out, the
 * match itself stays. Every goal gets its player from `link` (see `link-players.ts`).
 */
function goalsOf(match: ReadMatch, link: (goal: ReadGoal) => null | number): { goals: LinkedGoal[]; warning?: string } {
  const problem = checkGoals(match)

  return problem === undefined
    ? { goals: (match.goals ?? []).map((goal) => ({ ...goal, playerId: link(goal) })) }
    : { goals: [], warning: `no scorers: ${problem}` }
}

/** Whether the season has a match of the play-offs in the database. */
async function hasPlayoffMatch(db: Pick<Database, 'select'>, season: string): Promise<boolean> {
  const [row] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.season, season), eq(matches.competition, 'Play-offs Conference League')))
    .limit(1)

  return row !== undefined
}

/** Whether a stored match is what Wikipedia says now, apart from `result_set_at`. */
function isSame(before: Match, now: ReadMatch, clubId: number): boolean {
  return (
    before.clubId === clubId &&
    before.opponent === now.opponent &&
    before.home === now.home &&
    before.stadium === now.stadium &&
    before.attendance === now.attendance &&
    before.referee === now.referee &&
    before.status === now.status &&
    before.goalsFor === now.goalsFor &&
    before.goalsAgainst === now.goalsAgainst &&
    before.extraTime === now.extraTime &&
    before.penaltiesFor === now.penaltiesFor &&
    before.penaltiesAgainst === now.penaltiesAgainst &&
    before.afterNinetyFor === now.afterNinetyFor &&
    before.afterNinetyAgainst === now.afterNinetyAgainst &&
    before.matchDate === now.matchDate &&
    before.kickoffAt?.getTime() === now.kickoffAt?.getTime() &&
    before.dateText === now.dateText &&
    before.note === now.note
  )
}

/** Whether the stored goals of a match are the goals we found, in the same order. */
function isSameGoals(before: MatchGoal[], now: LinkedGoal[]): boolean {
  return (
    before.length === now.length &&
    before.every(
      (goal, index) =>
        goal.ours === now[index]?.ours &&
        goal.minute === now[index].minute &&
        goal.stoppageMinutes === now[index].stoppageMinutes &&
        goal.player === now[index].player &&
        goal.playerId === now[index].playerId &&
        goal.wikipediaPage === now[index].playerPage &&
        goal.ownGoal === now[index].ownGoal &&
        goal.penalty === now[index].penalty,
    )
  )
}

/** The round of a competition, which is unique in a season. */
function key(match: Pick<ReadMatch, 'competition' | 'round'>): string {
  return `${match.competition}|${match.round}`
}

/**
 * Reads, checks and stores. A database failure throws; `importMatches` turns it into a
 * report.
 */
async function readAndStore(
  db: Database,
  fetcher: Fetcher,
  season: string,
  origin: string,
  clock: () => Date,
  previousReadAt: Date | null,
): Promise<MatchReport> {
  const pages = await fetchPages(fetcher, season, origin)

  if (!Array.isArray(pages)) {
    return pages
  }

  const textOf = (kind: WikipediaPageKind) => pages.find((page) => page.kind === kind)?.text ?? ''
  const league = readLeague(textOf('programme'))
  const cup = readCup(textOf('cup'))
  const table = readStandings(textOf('standings'))
  const playoffs = pages.some((page) => page.kind === 'playoffs') ? readPlayoffs(textOf('playoffs')) : undefined
  const problems: string[] = []

  for (const read of [league, cup, table, playoffs]) {
    if (read?.kind === 'error') {
      problems.push(read.message)
    }
  }
  if (league.kind === 'error' || cup.kind === 'error' || table.kind === 'error' || playoffs?.kind === 'error') {
    return { kind: 'error', message: problems.join('; '), season }
  }

  const found = [...league.matches, ...cup.matches, ...(playoffs?.matches ?? [])]

  if (!cup.hasTemplates) {
    const problem = await checkEmptyCupPage(db, season, pageTitles(season).cup)

    if (problem !== undefined) {
      problems.push(problem)
    }
  }

  problems.push(...checkMatches(found), ...checkStandings(table.rows, found))

  if (problems.length > 0) {
    return { kind: 'error', message: problems.join('; '), season }
  }

  const now = clock()
  const validOn = league.lastPlayedOn ?? seasonStart(season)
  const stored = await db.transaction(async (transaction) => {
    const [read] = await transaction
      .select({ title: wikipediaPages.title })
      .from(wikipediaPages)
      .where(and(eq(wikipediaPages.season, season), inArray(wikipediaPages.kind, matchPageKinds)))
      .limit(1)
    const result = await storeMatches(transaction, season, found, now, playoffs !== undefined, {
      firstRead: read === undefined,
      pastSeason: isPastSeason(season, now),
      previousReadAt,
    })

    // A page that changes too much at once is held whole, like a page that fails a check.
    if (result.heldAll) {
      return result
    }

    await transaction.delete(standings).where(eq(standings.season, season))
    await transaction.insert(standings).values(table.rows.map((row) => standingsRow(season, row, validOn)))

    for (const page of pages) {
      // A page of the play-offs without a match of ours is no source of the site, unless a
      // play-off match that waits to be removed is still shown.
      if (
        page.kind === 'playoffs' &&
        playoffs?.kind === 'read' &&
        playoffs.matches.length === 0 &&
        !(await hasPlayoffMatch(transaction, season))
      ) {
        await transaction.delete(wikipediaPages).where(eq(wikipediaPages.title, page.title))
        continue
      }

      const values = { kind: page.kind, readAt: now, season, version: page.version }

      await transaction
        .insert(wikipediaPages)
        .values({ title: page.title, ...values })
        .onDuplicateKeyUpdate({ set: values })
    }

    return result
  })

  if (stored.heldAll) {
    return {
      kind: 'error',
      message: `${stored.overwrites} matches changed at once, which looks like an edit of the whole page: the changes wait (pnpm run import:changes)`,
      season,
    }
  }

  return {
    clubs: stored.clubs,
    kind: 'imported',
    matches: stored.counts,
    season,
    standings: table.rows.length,
    validOn,
    warnings: stored.warnings,
  }
}

/**
 * Reads and stores one season, and writes the health of that season: an error becomes a report,
 * and a database failure while writing the health throws.
 */
async function readSeason(
  db: Database,
  fetcher: Fetcher,
  season: string,
  before: MatchImport | undefined,
  origin: string,
  clock: () => Date,
): Promise<MatchReport> {
  let report: MatchReport

  try {
    report = await readAndStore(db, fetcher, season, origin, clock, before?.lastSuccessAt ?? null)
  } catch (error) {
    report = { kind: 'error', message: describeError(error), season }
  }

  const health = healthAfter(before, report, clock())

  if (health !== undefined) {
    await db
      .insert(matchImports)
      .values({ season, ...health })
      .onDuplicateKeyUpdate({ set: health })
  }

  return report
}

/** One row of the table, with the season and the day it holds for. */
function standingsRow(season: string, row: ReadStandingsRow, validOn: string) {
  return { ...row, season, validOn }
}

/**
 * Makes the matches of the season in the database the ones we found, and judges every change
 * by how reliable it looks (`classify-change.ts`). A match is added when the season has no row
 * for its round. A match that differs is changed at once when the change is new information or
 * a correction of a few hours old (the correction gets a warning with the old and the new
 * result), and otherwise it waits: the match and its goals stay as they are, and the change is
 * kept in `match_changes` until it has stood for seven days, a person decides, or Wikipedia
 * puts the old value back. A match that is no longer on the page waits the same way. More
 * than six matches that overwrite what we have, in one run, look like an edit of the whole
 * page: then only their changes are kept and `heldAll` is true, so the caller leaves the rest
 * alone. Rows
 * of another season are not touched.
 *
 * The goals are linked to the players of the season as they are in the table now, so a goal
 * gets its player as soon as the squad has him, and a goal that is linked keeps its link until
 * the table says otherwise. A goal of ours that has no player is a warning too (once the squad
 * has been read), and no reason to keep the match out. The play-offs have a page that may be
 * missing (`fetchPages`), and then `playoffsRead` is false: the play-off matches we have stay,
 * since a page that is not there tells us nothing about them. Every match gets its club
 * (`clubs.ts` in the database package): the club with the article the match links, or else with
 * the name, or a new one, by the full names and spellings of `club-names.ts`. A club of that
 * list that is in the database twice is merged before the import reads a season
 * (`repairKnownClubs`). What the import made or changed comes back as lines for the log.
 */
async function storeMatches(
  db: Pick<Database, 'delete' | 'insert' | 'select' | 'update'>,
  season: string,
  found: ReadMatch[],
  now: Date,
  playoffsRead: boolean,
  { firstRead, pastSeason, previousReadAt }: StoreContext,
) {
  const clubLines: string[] = []
  const known = new Map(
    (await db.select().from(matches).where(eq(matches.season, season))).map((row) => [key(row), row]),
  )
  const existing = new Map(known)
  const squad = await db.select().from(players).where(eq(players.season, season))
  const link = playerLinker(squad)
  const storedGoals = new Map<number, MatchGoal[]>()

  for (const goal of await db
    .select({ goal: matchGoals })
    .from(matchGoals)
    .innerJoin(matches, eq(matchGoals.matchId, matches.id))
    .where(eq(matches.season, season))
    .orderBy(asc(matchGoals.id))) {
    storedGoals.set(goal.goal.matchId, [...(storedGoals.get(goal.goal.matchId) ?? []), goal.goal])
  }

  const book = await createClubBook(db, { fullNames: clubFullNames })
  const changes = await readSeasonChanges(db, season, now)
  const counts = { added: 0, held: 0, removed: 0, unchanged: 0, updated: 0 }
  const warnings: string[] = []
  const linkedGoals: LinkedGoal[] = []
  const entries: Entry[] = []
  let waiting = 0
  const handled = new Set<string>()
  const storedStates = (id: number) => (storedGoals.get(id) ?? []).map(goalStateOf)

  for (const match of found) {
    const before = known.get(key(match))
    const scorers = goalsOf(match, link)
    const club = await book.resolve({ name: match.opponent, page: match.opponentPage, season })

    clubLines.push(...club.events)

    linkedGoals.push(...scorers.goals)

    known.delete(key(match))
    if (scorers.warning !== undefined) {
      warnings.push(scorers.warning)
    }
    if (match.factsProblem !== null) {
      warnings.push(match.factsProblem)
    }

    const proposal: Proposal = { clubId: club.id, goals: scorers.goals, match }

    if (before === undefined) {
      entries.push({ kind: 'add', proposal })
      continue
    }

    const goalsChanged = !isSameGoals(storedGoals.get(before.id) ?? [], scorers.goals)
    const same = isSame(before, match, club.id) && !goalsChanged
    const nowValue = describeState({ ...match, clubId: club.id }, scorers.goals.map(goalStateOfRead))
    const pending = changes.pending.get(key(match))

    if (pending !== undefined) {
      handled.add(key(match))

      if (pending.newValue === nowValue) {
        // The page still shows the change that waits.
        if (hasStood(pending, now)) {
          await updateMatch(db, before, proposal, goalsChanged, now)
          await decide(db, pending, 'accepted', 'stood', now)
          counts.updated++
        } else {
          await noteSeen(db, pending, now)
          counts.held++
          waiting++
        }

        continue
      }

      await decide(db, pending, 'rejected', same ? 'reverted' : 'replaced', now)
    }
    if (same) {
      counts.unchanged++
      continue
    }
    if (changes.rejectedByPerson(key(match)) === nowValue) {
      // A person said no to this value, and the page has not changed since.
      counts.unchanged++
      continue
    }

    entries.push({
      before,
      goalsChanged,
      judgement: classifyChange({
        at: now,
        before,
        beforeGoals: storedStates(before.id),
        firstRead,
        history: changes.history(key(match)),
        now: { ...match, clubId: club.id },
        nowGoals: scorers.goals.map(goalStateOfRead),
        pastSeason,
        previousReadAt,
      }),
      kind: 'update',
      newValue: nowValue,
      oldValue: describeState(before, storedStates(before.id)),
      proposal,
    })
  }

  for (const row of known.values()) {
    if (!playoffsRead && row.competition === 'Play-offs Conference League') {
      continue
    }

    const pending = changes.pending.get(key(row))

    if (pending !== undefined) {
      handled.add(key(row))

      if (pending.newValue === null) {
        // The page still lacks the match that waits to be removed.
        if (hasStood(pending, now)) {
          await db.delete(matches).where(eq(matches.id, row.id))
          await decide(db, pending, 'accepted', 'stood', now)
          counts.removed++
        } else {
          await noteSeen(db, pending, now)
          counts.held++
          waiting++
        }

        continue
      }

      await decide(db, pending, 'rejected', 'replaced', now)
    }
    if (changes.rejectedByPerson(key(row)) === null) {
      counts.unchanged++
      continue
    }

    entries.push({
      judgement: classifyRemoval(firstRead, pastSeason),
      kind: 'remove',
      oldValue: describeState(row, storedStates(row.id)),
      row,
    })
  }

  for (const [pendingKey, pending] of changes.pending) {
    if (!handled.has(pendingKey) && !existing.has(pendingKey)) {
      // The match is gone from the database, so there is nothing left to change.
      await decide(db, pending, 'rejected', 'replaced', now)
    }
  }

  const overwrites = entries.filter((entry) => entry.kind !== 'add' && entry.judgement.overwrites).length
  // The changes that waited already and are still on the page count: the page stays held until
  // they are decided or have stood for seven days.
  const heldAll = isMassChange(overwrites + waiting)
  const mass = overwrites + waiting

  for (const entry of entries) {
    if (entry.kind === 'add') {
      if (heldAll) {
        counts.held++
        continue
      }

      counts.added++

      const [{ insertId }] = await db.insert(matches).values({
        ...entry.proposal.match,
        clubId: entry.proposal.clubId,
        resultSetAt: entry.proposal.match.status === 'played' ? now : null,
        season,
      })

      await storeGoals(db, insertId, entry.proposal.goals)
      continue
    }

    const { judgement } = entry
    const target = entry.kind === 'update' ? entry.before : entry.row
    const waits = heldAll ? judgement.overwrites : judgement.class === 'suspicious'

    if (heldAll && !judgement.overwrites) {
      counts.held++
      continue
    }
    if (waits) {
      counts.held++

      const reason = heldAll ? `${mass} matches changed at once: it looks like an edit of the page` : judgement.reason

      await recordChange(
        db,
        {
          competition: target.competition,
          judgement: { ...judgement, reason },
          matchId: target.id,
          newValue: entry.kind === 'update' ? entry.newValue : null,
          oldValue: entry.oldValue,
          proposal: entry.kind === 'update' ? entry.proposal : null,
          round: target.round,
          season,
        },
        now,
        true,
      )
      warnings.push(
        changeLine(
          true,
          target,
          { ...judgement, reason },
          target,
          entry.kind === 'update' ? entry.proposal.match : undefined,
        ),
      )
      continue
    }
    if (entry.kind === 'remove') {
      counts.removed++
      await db.delete(matches).where(eq(matches.id, entry.row.id))
      continue
    }

    counts.updated++
    await updateMatch(db, entry.before, entry.proposal, entry.goalsChanged, now)

    if (judgement.class === 'improvement') {
      await recordChange(
        db,
        {
          competition: target.competition,
          judgement,
          matchId: target.id,
          newValue: entry.newValue,
          oldValue: entry.oldValue,
          proposal: null,
          round: target.round,
          season,
        },
        now,
        false,
      )
      warnings.push(changeLine(false, target, judgement, entry.before, entry.proposal.match))
    }
  }

  // Before the first read of the squad nobody can be linked, which is no news.
  const unlinked = squad.length === 0 ? undefined : unlinkedWarning(linkedGoals)

  if (unlinked !== undefined) {
    warnings.push(unlinked)
  }

  return { clubs: clubLines, counts, heldAll, overwrites: mass, warnings }
}
