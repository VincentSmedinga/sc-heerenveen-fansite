import type { Database } from '@fansite/db/client'
import type { Competition, Match, MatchGoal, MatchImport, Player, WikipediaPageKind } from '@fansite/db/schema'

import { createClubBook, repairClubs } from '@fansite/db/clubs'
import { lockedFields, type MatchPart } from '@fansite/db/match-edits'
import { compareClaim, findMatchByDate } from '@fansite/db/match-lookup'
import { createPersonBook, storePersonNames } from '@fansite/db/persons'
import {
  matches,
  matchGoals,
  matchImports,
  matchPageKinds,
  playerNameMaxLength,
  players,
  standings,
  wikipediaPages,
} from '@fansite/db/schema'
import { seasonOf, seasonStart } from '@fansite/db/season'
import { keepSourceDifferences, readTakenOverParts } from '@fansite/db/source-differences'
import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'

import type { Judgement } from './classify-change.ts'
import type { Fetcher } from './fetcher.ts'
import type { ResultCounts } from './league-results.ts'
import type { LinkedGoal, Proposal } from './match-changes.ts'
import type { ReadGoal, ReadMatch, ReadStandingsRow } from './read-wikipedia.ts'

import { checkGoals, checkMatches, checkResults, checkStandings } from './check-wikipedia.ts'
import {
  classifyChange,
  classifyRemoval,
  describeState,
  goalStateOf,
  goalStateOfRead,
  isMassChange,
} from './classify-change.ts'
import { clubFullNames } from './club-names.ts'
import { lookUpClubPages, repairClubPagesFromWikipedia } from './club-pages.ts'
import { importEditedMatch, mergeEntry, readEdits } from './edited-matches.ts'
import { matchClubNames, playedWarning, storeResults } from './league-results.ts'
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
import { nameOfTitle } from './person-name.ts'
import { aliasMap, personTitleAliases } from './person-names.ts'
import {
  describePersons,
  guessedNameWarnings,
  lookUpPersonPages,
  mergeListedPersons,
  similarPersons,
  similarPersonsWarning,
} from './person-pages.ts'
import { footballBoxPages, readFootballBoxes } from './read-football-box.ts'
import { nameKey, searchTerm } from './read-squad.ts'
import {
  europaLeaguePage,
  pageCandidates,
  pageUrl,
  readCup,
  readEuropaLeague,
  readLeague,
  readLeagueResults,
  readPlayoffs,
  readStandings,
} from './read-wikipedia.ts'
import { retryUnhealthyAfterMs, unhealthyAfter, waitLimits } from './run-log.ts'
import { storeCompleteness } from './store-completeness.ts'
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
  /**
   * The address of the English Wikipedia, which has the Europa League matches of 2012/13 and
   * most matches of 2007/08 to 2009/10. A test gives the address of its own web server.
   */
  englishOrigin?: string
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
      /**
       * What the import did for the persons of the scorers and the squad: the titles it asked
       * Wikipedia about and the persons it made. Empty when it asked and made nothing.
       */
      persons: string[]
      /** The results of the league matches of every club (`league_results`). */
      results: ResultCounts
      season: string
      /** The number of clubs in the table: 0 for a season whose pages have no table. */
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

/** The addresses of the two Wikipedias the import reads. */
type Origins = { english: string; nl: string }

type PageRead = { kind: WikipediaPageKind; text: string; title: string; version: null | string }

type Problem = Exclude<MatchReport, { kind: 'imported' | 'postponed' }>

/** What came of asking for one title: the page, that it does not exist, or why it failed. */
type TitleRead = Problem | { kind: 'missing'; message: string } | { kind: 'page'; text: string; version: null | string }

/** The address of the Dutch Wikipedia. */
export const wikipediaOrigin = 'https://nl.wikipedia.org'

/**
 * The address of the English Wikipedia: the Europa League matches of 2012/13 and most matches
 * of 2007/08 to 2009/10 come from there.
 */
export const englishWikipediaOrigin = 'https://en.wikipedia.org'

export type { LinkedGoal } from './match-changes.ts'

/**
 * A match that is still `postponed` once the season is over (the score says "Uitgesteld" or
 * "Afgelast", and no block under an `Inhaalronde` with a score has replaced it) will not be
 * played any more, so it is `cancelled`. Only the page of a season that is over says so: in the
 * current season the same block still waits for a new date.
 */
export function cancelledOf(found: ReadMatch[], pastSeason: boolean): ReadMatch[] {
  return pastSeason
    ? found.map((match) => (match.status === 'postponed' ? { ...match, status: 'cancelled' } : match))
    : found
}

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
        `${head}: ${report.matches.added} new, ${report.matches.updated} updated, ${report.matches.unchanged} unchanged, ${report.matches.removed} removed${report.matches.held === 0 ? '' : `, ${report.matches.held} held`}; ${report.standings === 0 ? 'the pages of this season have no table' : `table of ${report.standings} clubs for ${report.validOn}`}`,
        // A season without a table (2007/08 to 2009/10) has no results of every club either.
        ...(report.standings === 0
          ? []
          : [
              `${head}: league results of all clubs: ${report.results.added} new, ${report.results.updated} updated, ${report.results.unchanged} unchanged, ${report.results.removed} removed`,
            ]),
        ...report.clubs.map((club) => `${head}: ${printable(club)}`),
        ...report.persons.map((line) => `${head}: ${printable(line)}`),
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
  {
    clock = () => new Date(),
    englishOrigin = englishWikipediaOrigin,
    origin = wikipediaOrigin,
  }: MatchImportOptions = {},
): Promise<MatchReport> {
  const season = seasonOf(clock())
  const [before] = await db.select().from(matchImports).where(eq(matchImports.season, season))

  if (before?.retryAt !== null && before?.retryAt !== undefined && before.retryAt > clock()) {
    return { kind: 'postponed', retryAt: before.retryAt, season }
  }

  return readSeason(db, fetcher, season, before, { english: englishOrigin, nl: origin }, clock)
}

/**
 * Reads the three Wikipedia pages of a season that is over, once, and stores its matches,
 * goals, table and pages like `importMatches` does, with the same checks and in one
 * transaction. The seasons 2007/08 to 2009/10 have other pages, and no table (see
 * `readAndStoreFootballBoxes`). A season that is over doesn't change, so the hourly import
 * doesn't read it again, but for the season that has just ended, once a week in July and August
 * (`importEndedSeason`). This is the command that does (`pnpm import:season`), and it asks
 * every time it is run. It writes the rows of that season only, and never those of the current
 * season, which is the hourly import's. A season that is not over is an error report, and
 * nothing is asked or written.
 */
export async function importPastSeason(
  db: Database,
  fetcher: Fetcher,
  season: string,
  {
    clock = () => new Date(),
    englishOrigin = englishWikipediaOrigin,
    origin = wikipediaOrigin,
  }: MatchImportOptions = {},
): Promise<MatchReport> {
  if (!isPastSeason(season, clock())) {
    return {
      kind: 'error',
      message: `${season} is not a season that is over; the hourly import reads the current season`,
      season,
    }
  }

  const [before] = await db.select().from(matchImports).where(eq(matchImports.season, season))

  return readSeason(db, fetcher, season, before, { english: englishOrigin, nl: origin }, clock)
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
 * Makes the clubs right in the database at the start of every import run, before any season is
 * read, in two steps. A step that fails does not stop the other.
 *
 * 1. A club under the title of a redirect on Wikipedia is one club with the club of the article
 *    the redirect ends in (`repairClubPagesFromWikipedia`). The title of every club that is
 *    not in `club_pages` is asked about once, so a run with nothing to check asks nothing.
 *    Without an `origin` (no Wikipedia to read from) it is skipped.
 * 2. A club of `club-names.ts` that is there twice, or under another name, is merged and gets
 *    its full name and its slug (`repairClubs` in the database package). The first step goes
 *    first, so two clubs with an article each that were one article do not stay apart.
 *
 * Each step has a transaction of its own and does not wait for a season that can be read and
 * stored. A run that has nothing to repair writes nothing. Returns the lines for the log, one
 * for each thing it did, in English.
 *
 * A failure is no reason to stop the import: it gives a line that says so, and the warning goes
 * on the health of the current season (`match_imports`), where `pnpm run import:status` shows
 * it. The next run tries again. It never throws: when the warning can't be written either, the
 * line says that too.
 */
export async function repairKnownClubs(
  db: Database,
  fetcher: Fetcher,
  origin: null | string,
  clock: () => Date = () => new Date(),
): Promise<string[]> {
  const lines: string[] = []
  const steps = [
    async () => (origin === null ? [] : repairClubPagesFromWikipedia(db, fetcher, origin)),
    async () => db.transaction((transaction) => repairClubs(transaction, clubFullNames)),
  ]

  for (const step of steps) {
    try {
      lines.push(...(await step()).map((event) => `Clubs: ${printable(event)}`))
    } catch (error) {
      const now = clock()
      const warning = printable(
        error instanceof Error && error.message.startsWith('club pages not checked')
          ? error.message
          : `clubs not repaired: ${describeError(error)}`,
      )
      const values = { lastWarning: warning, lastWarningAt: now }

      try {
        await db
          .insert(matchImports)
          .values({ lastOutcome: 'error', season: seasonOf(now), ...values })
          .onDuplicateKeyUpdate({ set: values })

        lines.push(`Clubs: warning, ${warning}`)
      } catch (writeError) {
        lines.push(`Clubs: warning, ${warning}; the warning was not saved: ${describeError(writeError)}`)
      }
    }
  }

  return lines
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
    .where(and(eq(matches.season, season), eq(matches.competition, 'KNVB Beker'), eq(matches.dataSource, 'wikipedia')))
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
 * Fetches the pages one after the other, or says why one could not be read. The pages are on
 * the Dutch Wikipedia, except the page of the Europa League matches of 2012/13, which is on the
 * English one (`europaLeaguePage`) and is asked for only for a season that has one. A page
 * may have more than one title (see `pageCandidates`): the first that exists is the page, and
 * a 404 on every title is a fault that names them all. The page of the play-offs may not be
 * there: it comes in May, and a season that is going has none. Wikipedia answering 404 for it
 * is no fault, and the pages are then the other three. Any other answer is a fault, as for the
 * other pages.
 */
async function fetchPages(fetcher: Fetcher, season: string, origins: Origins): Promise<PageRead[] | Problem> {
  const candidates = pageCandidates(season)
  const europaLeague = europaLeaguePage(season)
  const pages: PageRead[] = []
  const wanted = [
    { kind: 'programme', origin: origins.nl, titles: candidates.programme },
    { kind: 'standings', origin: origins.nl, titles: candidates.standings },
    { kind: 'cup', origin: origins.nl, titles: candidates.cup },
    { kind: 'playoffs', origin: origins.nl, titles: candidates.playoffs },
    // The only page of the English Wikipedia: a season either has it or is not asked for it.
    { kind: 'europa-league', origin: origins.english, titles: europaLeague === undefined ? [] : [europaLeague] },
  ] as const

  for (const { kind, origin, titles } of wanted) {
    let missing = ''

    for (const title of titles) {
      const read = await fetchTitle(fetcher, origin, title, season)

      if (read.kind === 'missing') {
        missing = read.message
        continue
      }
      if (read.kind !== 'page') {
        return read
      }

      pages.push({ kind, text: read.text, title, version: read.version })
      missing = ''
      break
    }

    if (missing !== '' && kind !== 'playoffs') {
      return {
        kind: 'error',
        message: titles.length === 1 ? missing : `none of the pages ${titles.join(' or ')} exists: ${missing}`,
        season,
      }
    }
  }

  return pages
}

/**
 * Asks for the raw text of one page (`pageUrl`). A page that does not exist (404) is `missing`,
 * so the caller can try another title or do without; anything else that is no page is the
 * report of the season.
 */
async function fetchTitle(fetcher: Fetcher, origin: string, title: string, season: string): Promise<TitleRead> {
  const outcome = await fetcher.fetch(pageUrl(origin, title))

  switch (outcome.kind) {
    case 'blocked-by-robots':
      return { kind: 'blocked-by-robots', season, url: outcome.url }
    case 'error':
      return outcome.reason === 'http-status' && outcome.status === 404
        ? { kind: 'missing', message: `${title}: ${outcome.message}` }
        : { kind: 'error', message: `${title}: ${outcome.message}`, season }
    case 'fetched':
      return { kind: 'page', text: new TextDecoder('utf-8').decode(outcome.body), version: outcome.lastModified }
    case 'not-modified':
      return { kind: 'error', message: `${title}: the page answered 304 to a request without conditions`, season }
    case 'wait':
      return { kind: 'wait', retryAfterSeconds: outcome.retryAfterSeconds, season, url: outcome.url }
  }
}

/**
 * Asks the Dutch Wikipedia about the articles the matches link to and the database does not
 * know yet, before the transaction: no request is made while rows are locked. First the clubs
 * (`lookUpClubPages`), where a failure is the report of the season. Then the persons: the
 * scorers, ours and the opponents', and the squad. A request for a person that fails is a
 * warning, never a failed season (see `lookUpPersonPages`).
 */
async function lookUpArticles(db: Database, fetcher: Fetcher, origin: string, season: string, found: ReadMatch[]) {
  const lookup = await lookUpClubPages(
    db,
    fetcher,
    origin,
    found.flatMap((match) => (match.opponentPage === null ? [] : [match.opponentPage])),
  )

  if (lookup.kind === 'error') {
    return { kind: 'error', message: `the article of a club, ${lookup.message}`, season } as const
  }
  if (lookup.kind !== 'found') {
    return { ...lookup, season }
  }

  const squadPages = await db
    .select({ page: players.wikipediaPage })
    .from(players)
    .where(and(eq(players.season, season), isNotNull(players.wikipediaPage)))
  const mergedPersons = await mergeListedPersons(db)
  const personLookup = await lookUpPersonPages(
    db,
    fetcher,
    origin,
    [
      ...found.flatMap((match) =>
        (match.goals ?? []).flatMap((goal) => (goal.playerPage === null ? [] : [goal.playerPage])),
      ),
      ...squadPages.flatMap((row) => (row.page === null ? [] : [row.page])),
    ],
    aliasMap(personTitleAliases),
  )

  personLookup.warnings.unshift(...mergedPersons)

  return { kind: 'found', lookup, personLookup } as const
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
  /** Where the titles of persons that were new to the database end (`lookUpPersonPages`). */
  personRedirects: ReadonlyMap<string, string>
  /** The last run that read the pages with success, before this one. */
  previousReadAt: Date | null
  /** Where the titles of the clubs that were new to the database end (`lookUpClubPages`). */
  redirects: ReadonlyMap<string, string>
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

/**
 * Makes a player of the season of each scorer of ours whose stored goal links to a page and has
 * no player (#1024): the squad table of Wikipedia runs behind, and the page says who he is. It
 * looks at the goals in `match_goals` after the run has written them, so a goal of a change
 * that waits, or of a page that is held whole, makes no player. Only the matches of Wikipedia
 * count, and not those in `skip`. The player gets the source `doelpunten`, the page, the person
 * of the page and the name of the title, and is added to `squad`. A goal without a link, or
 * with a page that has no person yet, makes no player, and neither does a scorer whose name or
 * person another player of the season already has: such a goal stays without a player. Then
 * every stored goal of these matches that still has no player gets the player the rules of
 * `playerLinker` find now, so a goal that names only his surname has him in the same run.
 * Gives the names of the players it made.
 */
async function adoptScorers(
  db: Pick<Database, 'insert' | 'select' | 'update'>,
  season: string,
  squad: Player[],
  skip: ReadonlySet<number>,
): Promise<string[]> {
  const adopted: string[] = []
  const goals = (
    await db
      .select({ goal: matchGoals })
      .from(matchGoals)
      .innerJoin(matches, eq(matchGoals.matchId, matches.id))
      .where(and(eq(matches.season, season), eq(matches.dataSource, 'wikipedia'), isNull(matchGoals.playerId)))
      .orderBy(asc(matchGoals.id))
  )
    .map(({ goal }) => ({ ...goal, playerPage: goal.wikipediaPage }))
    .filter((goal) => isGoalOfOurPlayer(goal) && !skip.has(goal.matchId))

  for (const goal of goals) {
    const { personId, playerPage } = goal

    if (playerPage === null || personId === null || playerLinker(squad)(goal) !== null) {
      continue
    }

    const name = nameOfTitle(playerPage)

    if (
      name === '' ||
      name.length > playerNameMaxLength ||
      squad.some((player) => player.personId === personId || nameKey(player.name) === nameKey(name))
    ) {
      continue
    }

    const row = {
      name,
      personId,
      searchTerm: searchTerm(name),
      season,
      source: 'doelpunten' as const,
      wikipediaPage: playerPage,
    }
    const [{ insertId }] = await db.insert(players).values(row)

    squad.push({
      ...row,
      country: null,
      editorsFields: [],
      id: insertId,
      inSquad: true,
      leftSquadAt: null,
      position: null,
      shirtNumber: null,
    })
    adopted.push(name)
  }

  if (adopted.length > 0) {
    const link = playerLinker(squad)

    for (const goal of goals) {
      const playerId = link(goal)

      if (playerId !== null) {
        await db.update(matchGoals).set({ playerId }).where(eq(matchGoals.id, goal.id))
      }
    }
  }

  return adopted
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
 * match itself stays. Every goal gets its person from `personOf`, by the page it links to, and
 * its player from `link` (see `link-players.ts`).
 */
function goalsOf(
  match: ReadMatch,
  link: (goal: ReadGoal & { personId: null | number }) => null | number,
  personOf: ReadonlyMap<string, null | number>,
): { goals: LinkedGoal[]; warning?: string } {
  const problem = checkGoals(match)

  return problem === undefined
    ? {
        goals: (match.goals ?? []).map((goal) => {
          const personId = goal.playerPage === null ? null : (personOf.get(goal.playerPage) ?? null)

          return { ...goal, personId, playerId: link({ ...goal, personId }) }
        }),
      }
    : { goals: [], warning: `no scorers: ${problem}` }
}

/** The competitions on the play-offs page: Conference League from 2020/21, else Europa. */
const playoffCompetitions: Competition[] = ['Play-offs Conference League', 'Play-offs Europa League']

/** Whether the season has a match of the play-offs in the database. */
async function hasPlayoffMatch(db: Pick<Database, 'select'>, season: string): Promise<boolean> {
  const [row] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.season, season),
        inArray(matches.competition, playoffCompetitions),
        eq(matches.dataSource, 'wikipedia'),
      ),
    )
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
        goal.personId === now[index].personId &&
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
  origins: Origins,
  clock: () => Date,
  previousReadAt: Date | null,
): Promise<MatchReport> {
  if (footballBoxPages(season).length > 0) {
    return readAndStoreFootballBoxes(db, fetcher, season, origins, clock, previousReadAt)
  }

  const pages = await fetchPages(fetcher, season, origins)

  if (!Array.isArray(pages)) {
    return pages
  }

  const textOf = (kind: WikipediaPageKind) => pages.find((page) => page.kind === kind)?.text ?? ''
  const league = readLeague(textOf('programme'), season)
  const cup = readCup(textOf('cup'))
  const table = readStandings(textOf('standings'))
  const playoffs = pages.some((page) => page.kind === 'playoffs') ? readPlayoffs(textOf('playoffs')) : undefined
  const europaLeague = pages.some((page) => page.kind === 'europa-league')
    ? readEuropaLeague(textOf('europa-league'), season)
    : undefined
  const problems: string[] = []

  for (const read of [league, cup, table, playoffs, europaLeague]) {
    if (read?.kind === 'error') {
      problems.push(read.message)
    }
  }
  if (
    league.kind === 'error' ||
    cup.kind === 'error' ||
    table.kind === 'error' ||
    playoffs?.kind === 'error' ||
    europaLeague?.kind === 'error'
  ) {
    return { kind: 'error', message: problems.join('; '), season }
  }

  const now = clock()
  const pastSeason = isPastSeason(season, now)
  const found = cancelledOf(
    [...league.matches, ...cup.matches, ...(playoffs?.matches ?? []), ...(europaLeague?.matches ?? [])],
    pastSeason,
  )

  if (!cup.hasTemplates) {
    const problem = await checkEmptyCupPage(db, season, pages.find((page) => page.kind === 'cup')?.title ?? '')

    if (problem !== undefined) {
      problems.push(problem)
    }
  }

  const everyClub = readLeagueResults(textOf('programme'), season)
  const named = matchClubNames(everyClub.results, table.rows)

  problems.push(...checkMatches(found), ...checkStandings(table.rows, found), ...checkResults(named.results))

  if (problems.length > 0) {
    return { kind: 'error', message: problems.join('; '), season }
  }

  // Wikipedia is asked before the transaction: no request is made while rows are locked.
  const asked = await lookUpArticles(db, fetcher, origins.nl, season, found)

  if (asked.kind !== 'found') {
    return asked
  }

  const { lookup, personLookup } = asked
  const validOn = league.lastPlayedOn ?? seasonStart(season)
  const stored = await db.transaction(async (transaction) => {
    const [read] = await transaction
      .select({ title: wikipediaPages.title })
      .from(wikipediaPages)
      .where(and(eq(wikipediaPages.season, season), inArray(wikipediaPages.kind, matchPageKinds)))
      .limit(1)
    const result = await storeMatches(
      transaction,
      season,
      found,
      now,
      { europaLeague: europaLeague !== undefined, playoffs: playoffs !== undefined },
      {
        firstRead: read === undefined,
        pastSeason,
        personRedirects: personLookup.redirects,
        previousReadAt,
        redirects: lookup.redirects,
      },
    )

    // A page that changes too much at once is held whole, like a page that fails a check.
    if (result.heldAll) {
      return { ...result, results: { added: 0, removed: 0, unchanged: 0, updated: 0 } }
    }

    await transaction.delete(standings).where(eq(standings.season, season))
    await transaction.insert(standings).values(table.rows.map((row) => standingsRow(season, row, validOn)))

    const results = await storeResults(transaction, season, named.results)

    for (const page of pages) {
      // A page of the play-offs without a match of ours is no source of the site, unless a
      // play-off match that waits to be removed is still shown.
      if (
        page.kind === 'playoffs' &&
        playoffs?.kind === 'read' &&
        playoffs.matches.length === 0 &&
        !(await hasPlayoffMatch(transaction, season))
      ) {
        await transaction
          .delete(wikipediaPages)
          .where(and(eq(wikipediaPages.title, page.title), eq(wikipediaPages.kind, 'playoffs')))
        continue
      }

      // The page of the Europa League is the one page of these on the English Wikipedia.
      const language = page.kind === 'europa-league' ? 'en' : 'nl'
      const values = { kind: page.kind, language, readAt: now, season, version: page.version }

      await transaction
        .insert(wikipediaPages)
        .values({ title: page.title, ...values })
        .onDuplicateKeyUpdate({ set: values })
    }

    return { ...result, results }
  })

  if (stored.heldAll) {
    return {
      kind: 'error',
      message: `${stored.overwrites} matches changed at once, which looks like an edit of the whole page: the changes wait (pnpm run import:changes)`,
      season,
    }
  }

  // The names of the persons that were new or had none, after their rows are in the database.
  const personNames = await storePersonNames(db, personLookup.names)
  const alikeWarning = similarPersonsWarning(await similarPersons(db))
  const alike = alikeWarning === undefined ? [] : [alikeWarning]

  return {
    clubs: stored.clubs,
    kind: 'imported',
    matches: stored.counts,
    persons: [...describePersons(personLookup.asked, stored.persons, personNames.counts), ...stored.players],
    results: stored.results,
    season,
    standings: table.rows.length,
    validOn,
    warnings: [
      ...stored.warnings,
      ...personLookup.warnings,
      ...guessedNameWarnings(personNames.guessed),
      ...alike,
      ...resultWarnings(everyClub.unread, playedWarning(named.results, table.rows, named.strangers)),
    ],
  }
}

/**
 * Reads, checks and stores a season whose matches are in `football box` blocks: 2007/08 to
 * 2009/10 (`read-football-box.ts`). It asks for the pages of the list of that season and for
 * no other, each on the Wikipedia of its language, and stores the matches the way
 * `readAndStore` does: every page must be read and every check must pass, or nothing changes.
 * These pages have no league table and no results of the other clubs, so the report has none.
 * Each page is kept in `wikipedia_pages` with the kind `matches` and its language, for the
 * credit.
 */
async function readAndStoreFootballBoxes(
  db: Database,
  fetcher: Fetcher,
  season: string,
  origins: Origins,
  clock: () => Date,
  previousReadAt: Date | null,
): Promise<MatchReport> {
  const pages: (PageRead & { language: string })[] = []
  const found: ReadMatch[] = []
  const problems: string[] = []

  for (const page of footballBoxPages(season)) {
    const read = await fetchTitle(fetcher, page.language === 'en' ? origins.english : origins.nl, page.title, season)

    if (read.kind === 'missing') {
      return { kind: 'error', message: read.message, season }
    }
    if (read.kind !== 'page') {
      return read
    }

    const matchesOfPage = readFootballBoxes(read.text, page)

    if (matchesOfPage.kind === 'error') {
      problems.push(matchesOfPage.message)
    } else {
      found.push(...matchesOfPage.matches)
    }
    pages.push({ kind: 'matches', language: page.language, text: read.text, title: page.title, version: read.version })
  }

  if (problems.length === 0) {
    problems.push(...checkMatches(found, { league: found.some((match) => match.competition === 'Eredivisie') }))
  }
  if (problems.length > 0) {
    return { kind: 'error', message: problems.join('; '), season }
  }

  const asked = await lookUpArticles(db, fetcher, origins.nl, season, found)

  if (asked.kind !== 'found') {
    return asked
  }

  const now = clock()
  const stored = await db.transaction(async (transaction) => {
    const [read] = await transaction
      .select({ title: wikipediaPages.title })
      .from(wikipediaPages)
      .where(and(eq(wikipediaPages.season, season), inArray(wikipediaPages.kind, matchPageKinds)))
      .limit(1)
    const result = await storeMatches(
      transaction,
      season,
      found,
      now,
      { europaLeague: true, playoffs: true },
      {
        firstRead: read === undefined,
        pastSeason: isPastSeason(season, now),
        personRedirects: asked.personLookup.redirects,
        previousReadAt,
        redirects: asked.lookup.redirects,
      },
    )

    if (!result.heldAll) {
      for (const page of pages) {
        const values = { kind: page.kind, language: page.language, readAt: now, season, version: page.version }

        await transaction
          .insert(wikipediaPages)
          .values({ title: page.title, ...values })
          .onDuplicateKeyUpdate({ set: values })
      }
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

  const personNames = await storePersonNames(db, asked.personLookup.names)
  const alikeWarning = similarPersonsWarning(await similarPersons(db))

  return {
    clubs: stored.clubs,
    kind: 'imported',
    matches: stored.counts,
    persons: [...describePersons(asked.personLookup.asked, stored.persons, personNames.counts), ...stored.players],
    results: { added: 0, removed: 0, unchanged: 0, updated: 0 },
    season,
    standings: 0,
    validOn: seasonStart(season),
    warnings: [
      ...stored.warnings,
      ...asked.personLookup.warnings,
      ...guessedNameWarnings(personNames.guessed),
      ...(alikeWarning === undefined ? [] : [alikeWarning]),
    ],
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
  origins: Origins,
  clock: () => Date,
): Promise<MatchReport> {
  let report: MatchReport

  try {
    report = await readAndStore(db, fetcher, season, origins, clock, before?.lastSuccessAt ?? null)
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

/**
 * The warnings about the results of every club: the played matches the page lists that could
 * not be read, and a club with another number of results than the table says (`playedWarning`).
 */
function resultWarnings(unread: string[], played: string | undefined): string[] {
  return [
    ...(unread.length === 0 ? [] : [`league results left out: ${unread.join('; ')}`]),
    ...(played === undefined ? [] : [played]),
  ]
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
 * kept in `match_changes` until it has stood for seven days in the season that is on
 * (`hasStood`), a person decides, or Wikipedia puts the old value back. A match that is no
 * longer on the page waits the same way. More than six matches that overwrite what we have, in
 * one run, look like an edit of the whole page: then only their changes are kept and `heldAll`
 * is true, so the caller leaves the rest alone. Rows of another season are not touched.
 *
 * The goals are linked to the players of the season as they are in the table now, so a goal
 * gets its player as soon as the squad has him, and a goal that is linked keeps its link until
 * the table says otherwise. A scorer of ours who links to a page and is not among the players
 * of the season becomes one, with the source `doelpunten` (see `adoptScorers`). A goal of
 * ours that still has no player is a warning (once the season has players), and no reason to
 * keep the match out. The play-offs have a page that may be
 * missing (`fetchPages`), and then `read.playoffs` is false: the play-off matches we have stay,
 * since a page that is not there tells us nothing about them. The same goes for the Europa
 * League matches, which only some seasons have a page for (`read.europaLeague`). Every match
 * gets its club (`clubs.ts` in the database package): the club with the article the match
 * links, or else with the name, or a new one, by the full names and spellings of
 * `club-names.ts`. A club of that list that is in the database twice is merged before the
 * import reads a season (`repairKnownClubs`). What the import made or changed comes back as
 * lines for the log.
 */
async function storeMatches(
  db: Pick<Database, 'delete' | 'insert' | 'select' | 'update'>,
  season: string,
  found: ReadMatch[],
  now: Date,
  read: { europaLeague: boolean; playoffs: boolean },
  { firstRead, pastSeason, personRedirects, previousReadAt, redirects }: StoreContext,
) {
  const clubLines: string[] = []
  // This import reads, changes and removes only the matches it made itself. A match of the old
  // fansite or of the editors stays as it is, and a match of Wikipedia on its key is left out
  // (see below).
  const seasonRows = await db.select().from(matches).where(eq(matches.season, season))
  const known = new Map(seasonRows.filter((row) => row.dataSource === 'wikipedia').map((row) => [key(row), row]))
  const otherSources = new Map(
    seasonRows.filter((row) => row.dataSource !== 'wikipedia').map((row) => [key(row), row.dataSource]),
  )
  const existing = new Map(known)
  const squad = await db.select().from(players).where(eq(players.season, season))
  const personBook = await createPersonBook(db, { aliases: aliasMap(personTitleAliases), redirects: personRedirects })

  // A player of the squad that has no person yet gets it from the page of his name. Then the
  // goals under a redirect of that page find him by his person (see `playerLinker`).
  for (const player of squad) {
    if (player.personId === null && player.wikipediaPage !== null) {
      const personId = await personBook.resolve(player.wikipediaPage)

      if (personId !== null) {
        player.personId = personId
        await db.update(players).set({ personId }).where(eq(players.id, player.id))
      }
    }
  }

  const personOf = new Map<string, null | number>()

  for (const match of found) {
    for (const goal of match.goals ?? []) {
      if (goal.playerPage !== null && !personOf.has(goal.playerPage)) {
        personOf.set(goal.playerPage, await personBook.resolve(goal.playerPage))
      }
    }
  }

  const storedGoals = new Map<number, MatchGoal[]>()

  for (const goal of await db
    .select({ goal: matchGoals })
    .from(matchGoals)
    .innerJoin(matches, eq(matchGoals.matchId, matches.id))
    .where(eq(matches.season, season))
    .orderBy(asc(matchGoals.id))) {
    storedGoals.set(goal.goal.matchId, [...(storedGoals.get(goal.goal.matchId) ?? []), goal.goal])
  }

  const edits = await readEdits(db, season)
  const link = playerLinker(squad)
  // The parts the editors took over from another source (#974) stay as they decided.
  const takenOver = await readTakenOverParts(
    db,
    [...known.values()].map((row) => row.id),
  )
  const book = await createClubBook(db, { fullNames: clubFullNames, redirects })
  const changes = await readSeasonChanges(db, season, now)
  const counts = { added: 0, held: 0, removed: 0, unchanged: 0, updated: 0 }
  const warnings: string[] = []
  const linkedGoals: LinkedGoal[] = []
  const entries: Entry[] = []
  let waiting = 0
  const handled = new Set<string>()
  const storedStates = (id: number) => (storedGoals.get(id) ?? []).map(goalStateOf)

  for (const match of found) {
    const otherSource = otherSources.get(key(match))

    if (otherSource !== undefined) {
      warnings.push(
        `${match.competition} ${match.round} left out: the match is already there from ${otherSource === 'redactie' ? 'the editors' : 'the old fansite'}, and the import of Wikipedia leaves those alone`,
      )
      counts.unchanged++
      continue
    }

    const before = known.get(key(match))
    const scorers = goalsOf(match, link, personOf)
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
      // The same match may be there already from another source under another round.
      const lookup = await findMatchByDate(db, {
        clubId: club.id,
        competition: match.competition,
        date: match.matchDate,
        season,
      })

      if (lookup.kind === 'ambiguous' && lookup.matches.some((row) => row.dataSource !== 'wikipedia')) {
        warnings.push(
          `${match.competition} ${match.round} (${match.matchDate}) fits ${lookup.matches.length} matches against the same club within a day, so it is not matched to one of them`,
        )
      }
      if (lookup.kind === 'found' && lookup.match.dataSource === 'redactie') {
        // A match the editors added is theirs: it is skipped whole, with one line, and never
        // filled or compared, also when one of its fields is empty (#970).
        warnings.push(
          `${match.competition} ${match.round} (${match.matchDate}) left out: the editors added this match (match ${lookup.match.id}), and the import of Wikipedia leaves it as it is`,
        )
        counts.unchanged++
        continue
      }
      if (lookup.kind === 'found' && lookup.match.dataSource !== 'wikipedia') {
        const compared = compareClaim(lookup.match, match, lockedFields(edits.get(lookup.match.id)))

        // A difference waits for the editors as a change, once, and is no warning (#974).
        // The match keeps the value of its own source until they decide.
        await keepSourceDifferences(db, lookup.match, match, compared, 'wikipedia', now)

        if (Object.keys(compared.fill).length > 0) {
          counts.updated++
          await db.update(matches).set(compared.fill).where(eq(matches.id, lookup.match.id))
        } else {
          counts.unchanged++
        }

        continue
      }

      entries.push({ kind: 'add', proposal })
      continue
    }

    const edit = edits.get(before.id)
    // The parts the editors took over from another source stay, with who played at home for
    // the result, next to the parts of an entry (`keep`).
    const held = [...(takenOver.get(before.id) ?? [])]
    const mergeKept = (keep: MatchPart[]) => ({
      ...mergeEntry(before, match, [...new Set([...keep, ...held])]),
      ...(held.includes('result') ? { home: before.home } : {}),
    })

    if (edit !== undefined) {
      // The editors filled in a part of this match: see `edited-matches.ts`. What stays theirs
      // stays, and the rest follows the page without the judgement of `classify-change.ts`.
      const stored = storedGoals.get(before.id) ?? []
      const outcome = await importEditedMatch(
        db,
        { before, edit, storedGoals: stored, wikipedia: match, wikipediaGoals: scorers.goals },
        now,
      )
      const merged = mergeKept(outcome.keep)
      const keepsGoals = outcome.keep.includes('goals')
      const goalsDiffer = !keepsGoals && !isSameGoals(stored, scorers.goals)

      warnings.push(...outcome.warnings)

      if (isSame(before, merged, club.id) && !goalsDiffer) {
        counts.unchanged++
      } else {
        counts.updated++
        await updateMatch(db, before, { clubId: club.id, goals: scorers.goals, match: merged }, goalsDiffer, now)
      }

      continue
    }

    if (held.length > 0) {
      // The editors took a part of this match over from another source: that part stays and
      // the rest follows the page, as for an entry.
      const merged = mergeKept([])
      const goalsDiffer = !isSameGoals(storedGoals.get(before.id) ?? [], scorers.goals)

      if (isSame(before, merged, club.id) && !goalsDiffer) {
        counts.unchanged++
      } else {
        counts.updated++
        await updateMatch(db, before, { clubId: club.id, goals: scorers.goals, match: merged }, goalsDiffer, now)
      }

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
    if (
      (!read.playoffs && playoffCompetitions.includes(row.competition)) ||
      (!read.europaLeague && row.competition === 'Europa League')
    ) {
      continue
    }

    if (edits.has(row.id)) {
      // A match the editors filled in stays, whether the page still has it or not.
      counts.unchanged++
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
  // they are decided or, in the season that is on, have stood for seven days.
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

  // A scorer with a page becomes a player once his goal is stored. A season with matches of the
  // old fansite has its players from there. A match whose goals the editors entered is
  // compared with the page as it is: its scorer becomes a player once the entry is gone, so a
  // goal they entered by name stays the same goal as the one on the page (`judgeGoals`).
  const adopted = seasonRows.some((row) => row.dataSource === 'oude-fansite')
    ? []
    : await adoptScorers(
        db,
        season,
        squad,
        new Set([...edits].flatMap(([matchId, edit]) => (edit.goalsEdited ? [matchId] : []))),
      )

  // A season whose players come from goals has no page of the squad to rate it, so the rating
  // is worked out here (#1040). It runs on every read, not only when a player was just added:
  // a season that got its players before this rule has no row yet. A row that doesn't change
  // is not written again.
  await storeCompleteness(db, season, undefined, now)

  const linkNow = adopted.length === 0 ? link : playerLinker(squad)
  // In a season without players nobody can be linked, which is no news.
  const unlinked =
    squad.length === 0
      ? undefined
      : unlinkedWarning(linkedGoals.map((goal) => ({ ...goal, playerId: goal.playerId ?? linkNow(goal) })))

  if (unlinked !== undefined) {
    warnings.push(unlinked)
  }

  return {
    clubs: clubLines,
    counts,
    heldAll,
    overwrites: mass,
    persons: personBook.counts,
    // One line for the log, such as `1 player added from a goal: Pelle van Amersfoort`.
    players:
      adopted.length === 0
        ? []
        : [`${adopted.length} ${adopted.length === 1 ? 'player' : 'players'} added from a goal: ${adopted.join(', ')}`],
    warnings,
  }
}
