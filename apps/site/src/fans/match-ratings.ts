import type { Database } from '@fansite/db/client'

import { matchAppearances, matchPlayerRatings, players } from '@fansite/db/schema'
import { and, asc, eq } from 'drizzle-orm'

import { cacheForKey } from '#src/cache'
import { getDatabase } from '#src/database'

// What supporters rated the players of one match (issue 1467): the card Uitblinker on the page
// of an old match. It holds averages and counts of a group and never a person who rated.

/** A player counts for the Uitblinker of a match with at least this many ratings. */
export const ratingMinimum = 5

/** The ratings of one match, in the order of the line-up. */
export type MatchRatings = {
  players: RatedPlayer[]
  /** The Uitblinker, or nothing when no player has `ratingMinimum` ratings. */
  winner?: RatedPlayer
}

/** One player of a match with the average of his ratings. */
export type RatedPlayer = {
  /** The row of the player in the line-up of the report, or `null` when the report has none. */
  appearanceId: null | number
  average: number
  count: number
  name: string
  playerId: number
}

const hundredths = (average: number) => Math.round(average * 100)

/**
 * The ratings that visitors of the old fansite gave in one match, 2001 to 2007, from the
 * averages that the import keeps. A match without ratings has none (`undefined`). The players
 * stand in the order of the line-up of the report; a player the report does not have, such as
 * one who is no longer in the squad of the season, stands last, by name. The name is the one of
 * the table of players, which keeps a player who left the squad.
 */
export async function loadOldMatchRatings(db: Database, matchId: number): Promise<MatchRatings | undefined> {
  const rows = await db
    .select({
      appearanceId: matchAppearances.id,
      average: matchPlayerRatings.average,
      count: matchPlayerRatings.ratingCount,
      name: players.name,
      playerId: matchPlayerRatings.playerId,
    })
    .from(matchPlayerRatings)
    .innerJoin(players, eq(players.id, matchPlayerRatings.playerId))
    .leftJoin(
      matchAppearances,
      and(
        eq(matchAppearances.matchId, matchPlayerRatings.matchId),
        eq(matchAppearances.playerId, matchPlayerRatings.playerId),
        eq(matchAppearances.ours, true),
      ),
    )
    .where(and(eq(matchPlayerRatings.matchId, matchId), eq(matchPlayerRatings.source, 'oude-fansite')))
    .orderBy(asc(matchAppearances.id), asc(players.name))

  if (rows.length === 0) {
    return undefined
  }

  const rated = [
    ...rows.filter((row) => row.appearanceId !== null),
    ...rows.filter((row) => row.appearanceId === null),
  ].map((row) => ({ ...row, average: Number(row.average) }))
  const winner = uitblinkerOf(rated)

  return { players: rated, ...(winner === undefined ? {} : { winner }) }
}

/**
 * The Uitblinker of a match: the player with the highest average among those with at least
 * `ratingMinimum` ratings. With an equal average the player with fewer ratings goes first, as
 * on the old fansite, and with those equal too the one who stands first in the line-up.
 */
export function uitblinkerOf(rated: readonly RatedPlayer[]): RatedPlayer | undefined {
  return rated
    .filter((player) => player.count >= ratingMinimum)
    .toSorted((a, b) => hundredths(b.average) - hundredths(a.average) || a.count - b.count)[0]
}

const getOldMatchRatings = cacheForKey(60 * 1000, (key) => loadOldMatchRatings(getDatabase().db, Number(key)))

/** The ratings of an old match, read once a minute for each match, like `oldMatchCrowd`. */
export const oldMatchRatings = (matchId: number) => getOldMatchRatings(String(matchId))
