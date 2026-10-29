import type { Database } from '@fansite/db/client'
import type { Match, MatchGoal, MatchImport, NewMatchGoal, WikipediaPageKind } from '@fansite/db/schema'

import { matches, matchGoals, matchImports, players, standings, wikipediaPages } from '@fansite/db/schema'
import { seasonOf, seasonStart } from '@fansite/db/season'
import { and, asc, eq, inArray } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { ReadGoal, ReadMatch, ReadStandingsRow } from './read-wikipedia.ts'

import { checkGoals, checkMatches, checkStandings } from './check-wikipedia.ts'
import { isGoalOfOurPlayer, playerLinker } from './link-players.ts'
import { pageTitles, pageUrl, readCup, readLeague, readStandings } from './read-wikipedia.ts'
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
      kind: 'imported'
      matches: { added: number; removed: number; unchanged: number; updated: number }
      season: string
      /** The number of clubs in the table. */
      standings: number
      /** The day the table holds for. */
      validOn: string
      /** A result that had stood for days changed. The new result is taken over. */
      warnings: string[]
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

/** A result that stood this long and then changes is worth a warning. */
export const resultStandsAfterMs = 3 * 24 * 60 * 60 * 1000

/** A goal as it is kept: what the page says, and the player of ours it is linked to or null. */
export type LinkedGoal = ReadGoal & { playerId: null | number }

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
        `${head}: ${report.matches.added} new, ${report.matches.updated} updated, ${report.matches.unchanged} unchanged, ${report.matches.removed} removed; table of ${report.standings} clubs for ${report.validOn}`,
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
  return /^\d{4}\//u.test(season) && Number(season.slice(0, 4)) < Number(seasonOf(moment).slice(0, 4))
}

/** Whether the import has failed so often in a row that it counts as unhealthy. */
export function isUnhealthy(health: Pick<MatchImport, 'failuresInARow'>): boolean {
  return health.failuresInARow >= unhealthyAfter
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

/** Fetches the three pages one after the other, or says why one could not be read. */
async function fetchPages(fetcher: Fetcher, season: string, origin: string): Promise<PageRead[] | Problem> {
  const titles = pageTitles(season)
  const pages: PageRead[] = []

  for (const kind of ['programme', 'standings', 'cup'] as const) {
    const title = titles[kind]
    const outcome = await fetcher.fetch(pageUrl(origin, title))

    switch (outcome.kind) {
      case 'blocked-by-robots':
        return { kind: 'blocked-by-robots', season, url: outcome.url }
      case 'error':
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

/** Whether a stored match is what Wikipedia says now, apart from `result_set_at`. */
function isSame(before: Match, now: ReadMatch): boolean {
  return (
    before.opponent === now.opponent &&
    before.home === now.home &&
    before.stadium === now.stadium &&
    before.status === now.status &&
    before.goalsFor === now.goalsFor &&
    before.goalsAgainst === now.goalsAgainst &&
    before.extraTime === now.extraTime &&
    before.penaltiesFor === now.penaltiesFor &&
    before.penaltiesAgainst === now.penaltiesAgainst &&
    before.matchDate === now.matchDate &&
    before.kickoffAt?.getTime() === now.kickoffAt?.getTime() &&
    before.dateText === now.dateText
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
): Promise<MatchReport> {
  const pages = await fetchPages(fetcher, season, origin)

  if (!Array.isArray(pages)) {
    return pages
  }

  const textOf = (kind: WikipediaPageKind) => pages.find((page) => page.kind === kind)?.text ?? ''
  const league = readLeague(textOf('programme'))
  const cup = readCup(textOf('cup'))
  const table = readStandings(textOf('standings'))
  const problems: string[] = []

  for (const read of [league, cup, table]) {
    if (read.kind === 'error') {
      problems.push(read.message)
    }
  }
  if (league.kind === 'error' || cup.kind === 'error' || table.kind === 'error') {
    return { kind: 'error', message: problems.join('; '), season }
  }

  const found = [...league.matches, ...cup.matches]

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
    const result = await storeMatches(transaction, season, found, now)

    await transaction.delete(standings).where(eq(standings.season, season))
    await transaction.insert(standings).values(table.rows.map((row) => standingsRow(season, row, validOn)))

    for (const page of pages) {
      const values = { kind: page.kind, readAt: now, season, version: page.version }

      await transaction
        .insert(wikipediaPages)
        .values({ title: page.title, ...values })
        .onDuplicateKeyUpdate({ set: values })
    }

    return result
  })

  return {
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
    report = await readAndStore(db, fetcher, season, origin, clock)
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

/** Writes the goals of a match in the order they are shown, so `id` keeps that order. */
async function storeGoals(db: Pick<Database, 'insert'>, matchId: number, goals: LinkedGoal[]) {
  if (goals.length > 0) {
    await db.insert(matchGoals).values(
      goals.map(({ playerPage, ...goal }): NewMatchGoal => ({
        ...goal,
        matchId,
        wikipediaPage: playerPage,
      })),
    )
  }
}

/**
 * Makes the matches of the season in the database the ones we found: a match is added when the
 * season has no row for its round, changed when its row differs, and removed when Wikipedia no
 * longer has it. Rows of another season are not touched. A result that changes after it stood
 * for three days gives a warning, and is taken over all the same. The goals are linked to the
 * players of the season as they are in the table now, so a goal gets its player as soon as the
 * squad has him, and a goal that is linked keeps its link until the table says otherwise. A
 * goal of ours that has no player is a warning too (once the squad has been read), and no
 * reason to keep the match out.
 */
async function storeMatches(
  db: Pick<Database, 'delete' | 'insert' | 'select' | 'update'>,
  season: string,
  found: ReadMatch[],
  now: Date,
) {
  const known = new Map(
    (await db.select().from(matches).where(eq(matches.season, season))).map((row) => [key(row), row]),
  )
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

  const counts = { added: 0, removed: 0, unchanged: 0, updated: 0 }
  const warnings: string[] = []
  const linkedGoals: LinkedGoal[] = []

  for (const match of found) {
    const before = known.get(key(match))
    const scorers = goalsOf(match, link)

    linkedGoals.push(...scorers.goals)

    known.delete(key(match))
    if (scorers.warning !== undefined) {
      warnings.push(scorers.warning)
    }

    if (before === undefined) {
      counts.added++

      const [{ insertId }] = await db
        .insert(matches)
        .values({ ...match, resultSetAt: match.status === 'played' ? now : null, season })

      await storeGoals(db, insertId, scorers.goals)
    } else if (isSame(before, match) && isSameGoals(storedGoals.get(before.id) ?? [], scorers.goals)) {
      counts.unchanged++
    } else {
      counts.updated++

      const sameResult =
        before.status === match.status &&
        before.goalsFor === match.goalsFor &&
        before.goalsAgainst === match.goalsAgainst
      // A shoot-out that arrives later is news, not a change; one that changes is a change.
      const samePenalties =
        before.penaltiesFor === null ||
        (before.penaltiesFor === match.penaltiesFor && before.penaltiesAgainst === match.penaltiesAgainst)
      const stoodLong =
        before.status === 'played' &&
        before.resultSetAt !== null &&
        now.getTime() - before.resultSetAt.getTime() >= resultStandsAfterMs

      if ((!sameResult || !samePenalties) && stoodLong) {
        warnings.push(
          `the result of ${match.round} (${match.competition}) changed after ${Math.floor((now.getTime() - (before.resultSetAt?.getTime() ?? 0)) / (24 * 60 * 60 * 1000))} days, from ${describeResult(before)} to ${describeResult(match)}`,
        )
      }

      await db
        .update(matches)
        .set({ ...match, resultSetAt: sameResult ? before.resultSetAt : match.status === 'played' ? now : null })
        .where(eq(matches.id, before.id))
      if (!isSameGoals(storedGoals.get(before.id) ?? [], scorers.goals)) {
        await db.delete(matchGoals).where(eq(matchGoals.matchId, before.id))
        await storeGoals(db, before.id, scorers.goals)
      }
    }
  }

  const gone = [...known.values()].map((row) => row.id)

  if (gone.length > 0) {
    counts.removed = gone.length
    await db.delete(matches).where(inArray(matches.id, gone))
  }

  // Before the first read of the squad nobody can be linked, which is no news.
  const unlinked = squad.length === 0 ? undefined : unlinkedWarning(linkedGoals)

  if (unlinked !== undefined) {
    warnings.push(unlinked)
  }

  return { counts, warnings }
}
