import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { encodeProposal, type ReadMatch } from '@fansite/db/match-changes'
import { encodePartProposal, sourceDifferenceReasons } from '@fansite/db/match-conflicts'
import { describeEntryFacts } from '@fansite/db/match-edits'
import { matchChanges, matches, matchGoals, players, playerStatDifferences } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { and, asc, eq, or } from 'drizzle-orm'
import path from 'node:path'

import { earlierSeason } from './earlier-season.ts'

/**
 * The made-up change of Wikipedia that the checks hold back: Wikipedia says one goal more for
 * the first played match of the season before this one. The marker is in `old_value`, which the
 * pages of the admin don't show, so a run that was stopped halfway can be cleaned up.
 */
const marker = 'verzonnen wijziging voor de controles'

/**
 * The marker of the made-up difference between two sources on the same match (issue 974). It
 * is in `changed`, which the pages don't show either: they show both values.
 */
const differenceMarker = 'verzonnen verschil voor de controles'

/**
 * The moment the made-up difference in the numbers of a player was first seen: the row has no
 * text to put a marker in, and no real difference is this old.
 */
const statMarker = new Date('2000-01-01T00:00:00Z')

/** The season of the made-up squad, as the address of its page has it: `2026-27`. */
export const statSeasonSlug = () => seasonOf(new Date()).replace('/', '-')

/**
 * Puts a made-up change that waits for a decision on a played match of the season before this
 * one (see earlier-season.ts), and returns the function that takes it out again. The pages of
 * the admin show it on the match, in the list under "Wikipedia wacht" and on the start page.
 * The same match gets a made-up difference between two sources, and the first player of the
 * made-up squad a made-up difference in his goals, for the page of Kwaliteit that lists them.
 */
export async function addHeldChange() {
  const { close, db } = connectToDatabase()

  try {
    await removeMadeUp(db)

    const [match] = await db
      .select()
      .from(matches)
      .where(and(eq(matches.season, earlierSeason()), eq(matches.status, 'played')))
      .orderBy(asc(matches.id))
      .limit(1)

    if (match !== undefined) {
      const read: ReadMatch = {
        ...match,
        factsProblem: null,
        goals: null,
        goalsFor: (match.goalsFor ?? 0) + 1,
        goalsProblem: null,
        opponentPage: null,
      }

      // The goals stay as they are, so only the result differs.
      const goals = (
        await db.select().from(matchGoals).where(eq(matchGoals.matchId, match.id)).orderBy(asc(matchGoals.id))
      ).map(({ wikipediaPage, ...goal }) => ({ ...goal, playerPage: wikipediaPage }))

      await db.insert(matchChanges).values({
        changed: 'result',
        class: 'suspicious',
        competition: match.competition,
        firstSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(),
        matchId: match.id,
        newValue: 'verzonnen',
        oldValue: marker,
        proposal: encodeProposal({ clubId: match.clubId, goals, match: read }),
        reason: 'the season is over, and its matches do not change',
        round: match.round,
        season: match.season,
        status: 'pending',
        timesSeen: 2,
      })

      // Another source names another referee: the match keeps its own until someone decides.
      const other = { ...match, referee: 'Sanne Fluit' }

      await db.insert(matchChanges).values({
        changed: differenceMarker,
        class: 'suspicious',
        competition: match.competition,
        firstSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(),
        matchId: match.id,
        newValue: describeEntryFacts(other),
        oldValue: describeEntryFacts(match),
        part: 'facts',
        proposal: encodePartProposal('facts', { goals: [], match: other }),
        reason: sourceDifferenceReasons['oude-fansite'],
        round: match.round,
        season: match.season,
        status: 'pending',
      })
    }

    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.season, seasonOf(new Date())))
      .orderBy(asc(players.id))
      .limit(1)

    if (player !== undefined) {
      await db.insert(playerStatDifferences).values({
        comparedWith: 'matches',
        competition: 'Eredivisie',
        firstSeenAt: statMarker,
        lastSeenAt: new Date(),
        otherGoals: 2,
        playerId: player.id,
        season: player.season,
        status: 'pending',
        tableGoals: 1,
      })
    }
  } finally {
    await close()
  }

  return async () => {
    const connection = connectToDatabase()

    try {
      await removeMadeUp(connection.db)
    } finally {
      await connection.close()
    }
  }
}

/** The number of the match that the made-up change is about. */
export async function heldMatchId() {
  const { close, db } = connectToDatabase()

  try {
    const [row] = await db
      .select({ matchId: matchChanges.matchId })
      .from(matchChanges)
      .where(eq(matchChanges.oldValue, marker))

    if (row?.matchId === null || row?.matchId === undefined) {
      throw new Error('There is no made-up change of Wikipedia in the database. Did the global setup run?')
    }

    return row.matchId
  } finally {
    await close()
  }
}

/**
 * Connects with the DATABASE_URL of the environment or the .env in the root, like the server of
 * the check does.
 */
function connectToDatabase() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return connect(readDatabaseEnv().DATABASE_URL)
}

/** Takes the made-up change and the two made-up differences out. */
async function removeMadeUp(db: ReturnType<typeof connectToDatabase>['db']) {
  await db.delete(matchChanges).where(or(eq(matchChanges.oldValue, marker), eq(matchChanges.changed, differenceMarker)))
  await db.delete(playerStatDifferences).where(eq(playerStatDifferences.firstSeenAt, statMarker))
}
