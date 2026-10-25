import type { Database } from '@fansite/db/client'
import type { Match, MatchImport, WikipediaPageKind } from '@fansite/db/schema'

import { matches, matchImports, standings, wikipediaPages } from '@fansite/db/schema'
import { seasonOf, seasonStart } from '@fansite/db/season'
import { eq, inArray } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { ReadMatch, ReadStandingsRow } from './read-wikipedia.ts'

import { checkMatches, checkStandings } from './check-wikipedia.ts'
import { pageTitles, pageUrl, readCup, readLeague, readStandings } from './read-wikipedia.ts'
import { retryUnhealthyAfterMs, unhealthyAfter, waitLimits } from './run-log.ts'
import { describeError, formatTime, printable } from './text.ts'

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
        ...report.warnings.map((warning) => `${head}: warning, ${warning}`),
      ].join('\n')
    case 'postponed':
      return `${head}: not read, the next time is from ${formatTime(report.retryAt)}`
    case 'wait':
      return `${head}: not read, Wikipedia asks us to wait${report.retryAfterSeconds === null ? '' : ` ${report.retryAfterSeconds} seconds`}`
  }
}

/**
 * What a report makes of the health of its season: the last time it succeeded, the failed runs
 * in a row, the last error and warning, and when the import may ask Wikipedia again. A refusal
 * by robots.txt and a request to wait are no fault of ours, and count as no failure. Undefined
 * when the report changes nothing.
 */
export function healthAfter(
  before: MatchImport | undefined,
  report: MatchReport,
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
 * It reads the current season only. The rows of an earlier season are never changed or removed.
 * It throws when the health in the database can't be written; the data itself fails into an
 * error report.
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

/** Whether the import has failed so often in a row that it counts as unhealthy. */
export function isUnhealthy(health: Pick<MatchImport, 'failuresInARow'>): boolean {
  return health.failuresInARow >= unhealthyAfter
}

/** The text of a result as a warning has it, from the side of the home team. */
function describeResult(match: Pick<Match, 'goalsAgainst' | 'goalsFor' | 'home' | 'opponent' | 'status'>): string {
  if (match.status !== 'played') {
    return 'no result'
  }

  return match.home
    ? `sc Heerenveen ${match.goalsFor}-${match.goalsAgainst} ${match.opponent}`
    : `${match.opponent} ${match.goalsAgainst}-${match.goalsFor} sc Heerenveen`
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

/** Whether a stored match is what Wikipedia says now, apart from `result_set_at`. */
function isSame(before: Match, now: ReadMatch): boolean {
  return (
    before.opponent === now.opponent &&
    before.home === now.home &&
    before.stadium === now.stadium &&
    before.status === now.status &&
    before.goalsFor === now.goalsFor &&
    before.goalsAgainst === now.goalsAgainst &&
    before.matchDate === now.matchDate &&
    before.kickoffAt?.getTime() === now.kickoffAt?.getTime() &&
    before.dateText === now.dateText
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

/** One row of the table, with the season and the day it holds for. */
function standingsRow(season: string, row: ReadStandingsRow, validOn: string) {
  return { ...row, season, validOn }
}

/**
 * Makes the matches of the season in the database the ones we found: a match is added when the
 * season has no row for its round, changed when its row differs, and removed when Wikipedia no
 * longer has it. Rows of another season are not touched. A result that changes after it stood
 * for three days gives a warning, and is taken over all the same.
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
  const counts = { added: 0, removed: 0, unchanged: 0, updated: 0 }
  const warnings: string[] = []

  for (const match of found) {
    const before = known.get(key(match))

    known.delete(key(match))

    if (before === undefined) {
      counts.added++
      await db.insert(matches).values({ ...match, resultSetAt: match.status === 'played' ? now : null, season })
    } else if (isSame(before, match)) {
      counts.unchanged++
    } else {
      counts.updated++

      const sameResult =
        before.status === match.status &&
        before.goalsFor === match.goalsFor &&
        before.goalsAgainst === match.goalsAgainst
      const stoodLong =
        before.status === 'played' &&
        before.resultSetAt !== null &&
        now.getTime() - before.resultSetAt.getTime() >= resultStandsAfterMs

      if (!sameResult && stoodLong) {
        warnings.push(
          `the result of ${match.round} (${match.competition}) changed after ${Math.floor((now.getTime() - (before.resultSetAt?.getTime() ?? 0)) / (24 * 60 * 60 * 1000))} days, from ${describeResult(before)} to ${describeResult(match)}`,
        )
      }

      await db
        .update(matches)
        .set({ ...match, resultSetAt: sameResult ? before.resultSetAt : match.status === 'played' ? now : null })
        .where(eq(matches.id, before.id))
    }
  }

  const gone = [...known.values()].map((row) => row.id)

  if (gone.length > 0) {
    counts.removed = gone.length
    await db.delete(matches).where(inArray(matches.id, gone))
  }

  return { counts, warnings }
}
