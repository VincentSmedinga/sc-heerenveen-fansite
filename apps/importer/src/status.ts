import type { Database } from '@fansite/db/client'
import type { MatchImport, WikipediaPage } from '@fansite/db/schema'

import { connect } from '@fansite/db/client'
import {
  feeds,
  importRuns,
  matches,
  matchGoals,
  matchImports,
  matchPageKinds,
  sources,
  squadImports,
  wikipediaPages,
} from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'

import type { ImportOptions } from './import-feeds.ts'

import { describeWaitingChange } from './import-changes.ts'
import { isUnhealthy } from './import-matches.ts'
import { isGoalOfOurPlayer } from './link-players.ts'
import { waitingChanges } from './match-changes.ts'
import { unhealthyAfter } from './run-log.ts'
import { formatTime, printable } from './text.ts'

/**
 * Shows the health of each feed of the sources that are switched on: the source, the address,
 * the last run that succeeded, the failed runs in a row, the last error and whether the feed
 * is healthy. Above it is the last run, so you can see that cron starts the import. After the
 * feeds comes the health of the match import and of the squad import for the current season,
 * in the same words, each with the Wikipedia pages it read, and the changes of a match that
 * wait for a decision. It only reads, and changes nothing in the database.
 *
 * Returns the exit code: 1 when a feed or one of the two Wikipedia imports is unhealthy, so a
 * check can tell.
 */
export async function showStatus(
  databaseUrl: string,
  { clock = () => new Date(), write = console.log }: Pick<ImportOptions, 'clock' | 'write'> = {},
): Promise<number> {
  const { close, db } = connect(databaseUrl)

  try {
    const [lastRun] = await db
      .select()
      .from(importRuns)
      .where(eq(importRuns.lockTaken, false))
      .orderBy(desc(importRuns.id))
      .limit(1)
    const rows = await db
      .select({
        failuresInARow: feeds.failuresInARow,
        lastError: feeds.lastError,
        lastErrorAt: feeds.lastErrorAt,
        lastSuccessAt: feeds.lastSuccessAt,
        retryAt: feeds.retryAt,
        source: sources.name,
        url: feeds.url,
      })
      .from(feeds)
      .innerJoin(sources, eq(sources.id, feeds.sourceId))
      .where(eq(sources.enabled, true))
      .orderBy(asc(feeds.id))

    if (lastRun === undefined) {
      write('Last run: none yet')
    } else {
      const end = lastRun.finishedAt === null ? 'not finished' : `finished ${formatTime(lastRun.finishedAt)}`

      write(`Last run: started ${formatTime(lastRun.startedAt)}, ${end}`)
    }

    const now = clock()
    let unhealthy = 0

    if (rows.length === 0) {
      write('There are no feeds: no source that is switched on has a feed. See `pnpm db:seed`.')
    }

    for (const row of rows) {
      const healthy = row.failuresInARow < unhealthyAfter

      if (!healthy) {
        unhealthy++
      }

      write('')
      write(`${row.source}: ${healthy ? 'healthy' : 'unhealthy'}`)
      write(`  feed: ${row.url}`)
      write(`  last success: ${row.lastSuccessAt === null ? 'never' : formatTime(row.lastSuccessAt)}`)
      write(`  failed runs in a row: ${row.failuresInARow}`)
      write(`  last error: ${row.lastErrorAt === null ? 'none' : `${formatTime(row.lastErrorAt)}, ${row.lastError}`}`)

      if (row.retryAt !== null && row.retryAt > now) {
        write(`  next try from: ${formatTime(row.retryAt)}`)
      }
    }

    if (rows.length > 0) {
      write('')
      write(`Unhealthy feeds: ${unhealthy} of ${rows.length}`)
    }

    const matchesUnhealthy = await showMatchStatus(db, now, write)
    const squadUnhealthy = await showSquadStatus(db, now, write)

    await showWaitingChanges(db, write)

    return matchesUnhealthy || squadUnhealthy || unhealthy > 0 ? 1 : 0
  } finally {
    await close()
  }
}

/** The health of one import from Wikipedia, in the words of a feed. True when unhealthy. */
function showImportStatus(
  head: string,
  health: MatchImport | undefined,
  pages: WikipediaPage[],
  now: Date,
  write: (line: string) => void,
): boolean {
  write('')

  if (health === undefined) {
    write(`${head}: not read yet`)

    return false
  }

  const unhealthy = isUnhealthy(health)

  write(`${head}: ${unhealthy ? 'unhealthy' : 'healthy'}`)
  write(`  last success: ${health.lastSuccessAt === null ? 'never' : formatTime(health.lastSuccessAt)}`)
  write(`  last outcome: ${health.lastOutcome}`)
  write(`  failed runs in a row: ${health.failuresInARow}`)
  write(
    `  last error: ${health.lastErrorAt === null ? 'none' : `${formatTime(health.lastErrorAt)}, ${health.lastError}`}`,
  )
  write(
    `  last warning: ${health.lastWarningAt === null ? 'none' : `${formatTime(health.lastWarningAt)}, ${health.lastWarning}`}`,
  )

  if (health.retryAt !== null && health.retryAt > now) {
    write(`  next try from: ${formatTime(health.retryAt)}`)
  }
  for (const page of pages) {
    write(`  page: ${page.title}, version ${page.version ?? 'unknown'}, read ${formatTime(page.readAt)}`)
  }

  return unhealthy
}

/**
 * Shows the health of the match import for the current season. Returns true when it is
 * unhealthy.
 */
async function showMatchStatus(db: Database, now: Date, write: (line: string) => void): Promise<boolean> {
  const season = seasonOf(now)
  const [health] = await db.select().from(matchImports).where(eq(matchImports.season, season))
  const pages = await db
    .select()
    .from(wikipediaPages)
    .where(and(eq(wikipediaPages.season, season), inArray(wikipediaPages.kind, matchPageKinds)))
    .orderBy(asc(wikipediaPages.title))

  const unhealthy = showImportStatus(`Matches ${season} (Wikipedia)`, health, pages, now, write)

  if (health !== undefined) {
    await showUnlinkedGoals(db, season, write)
  }

  return unhealthy
}

/**
 * Shows the health of the squad import for the current season. Returns true when it is
 * unhealthy.
 */
async function showSquadStatus(db: Database, now: Date, write: (line: string) => void): Promise<boolean> {
  const season = seasonOf(now)
  const [health] = await db.select().from(squadImports).where(eq(squadImports.season, season))
  const pages = await db
    .select()
    .from(wikipediaPages)
    .where(and(eq(wikipediaPages.season, season), eq(wikipediaPages.kind, 'squad')))

  return showImportStatus(`Squad ${season} (Wikipedia)`, health, pages, now, write)
}

/**
 * Shows how many goals of our players have no player in the table `players`, and whose they are
 * as the pages name them. It is information and no fault: the import keeps such a goal, and
 * links it when a later read of the squad or the matches allows.
 */
async function showUnlinkedGoals(db: Database, season: string, write: (line: string) => void): Promise<void> {
  const ours = (
    await db
      .select({
        ours: matchGoals.ours,
        ownGoal: matchGoals.ownGoal,
        player: matchGoals.player,
        playerId: matchGoals.playerId,
      })
      .from(matchGoals)
      .innerJoin(matches, eq(matchGoals.matchId, matches.id))
      .where(eq(matches.season, season))
  ).filter((goal) => isGoalOfOurPlayer(goal))
  const unlinked = ours.filter((goal) => goal.playerId === null)
  const names = [...new Set(unlinked.map((goal) => goal.player))].sort((a, b) => a.localeCompare(b, 'nl'))

  write(
    `  goals of ours without a player: ${unlinked.length} of ${ours.length}${names.length === 0 ? '' : ` (${printable(names.join(', '))})`}`,
  )
}

/**
 * Shows the changes of a match that wait: what Wikipedia shows now against what the site shows,
 * and when the import takes the change over. They are information and no fault: the site shows
 * the old value until the change has stood for seven days or a person decides
 * (`pnpm run import:changes`). It says nothing when none wait.
 */
async function showWaitingChanges(db: Database, write: (line: string) => void): Promise<void> {
  const waiting = await waitingChanges(db)

  if (waiting.length === 0) {
    return
  }

  write('')
  write(`Changes of matches that wait: ${waiting.length}`)
  for (const change of waiting) {
    for (const line of describeWaitingChange(change)) {
      write(`  ${line}`)
    }
  }
}
