import { and, asc, eq, inArray, or } from 'drizzle-orm'

import type { Database } from './client.ts'

import { searchPlayers } from './person-slugs.ts'
import { clubs, matches, matchGoals, players } from './schema.ts'

/**
 * A played match as the search of matches (#1150) needs it: the match with the club of the
 * opponent, so a visitor can choose the club by its address name. The score is the one after
 * extra time, the shoot-out not included. `opponent` is the name as Wikipedia wrote it in this
 * match.
 */
export type SearchableMatch = Awaited<ReturnType<typeof listSearchableMatches>>[number]

/** The most players a search for a goalscorer takes into account. */
const maxScorers = 500

/**
 * The ids of the matches in which a player of ours scored whose name has each of the words
 * (the rules of `searchPlayers`, so an old name counts too). An own goal is not a goal for the
 * player. The words must have passed the checks of the search.
 */
export async function listScorerMatchIds(
  db: Pick<Database, 'select' | 'selectDistinct'>,
  words: string[],
): Promise<number[]> {
  const { players: found } = await searchPlayers(db, { limit: maxScorers, words })

  if (found.length === 0) {
    return []
  }

  const ids = found.map((player) => player.id)
  const rows = await db
    .selectDistinct({ matchId: matchGoals.matchId })
    .from(matchGoals)
    .leftJoin(players, eq(players.id, matchGoals.playerId))
    .where(
      and(
        eq(matchGoals.ours, true),
        eq(matchGoals.ownGoal, false),
        or(inArray(matchGoals.personId, ids), inArray(players.personId, ids)),
      ),
    )

  return rows.map((row) => row.matchId)
}

/**
 * Every played match, from the oldest to the newest. There are about fourteen hundred, so the
 * page filters and counts them in memory instead of asking the database for each count.
 */
export async function listSearchableMatches(db: Pick<Database, 'select'>) {
  const rows = await db
    .select({
      afterNinetyAgainst: matches.afterNinetyAgainst,
      afterNinetyFor: matches.afterNinetyFor,
      clubId: matches.clubId,
      clubName: clubs.name,
      clubSlug: clubs.slug,
      competition: matches.competition,
      dataSource: matches.dataSource,
      dateText: matches.dateText,
      extraTime: matches.extraTime,
      goalsAgainst: matches.goalsAgainst,
      goalsFor: matches.goalsFor,
      home: matches.home,
      id: matches.id,
      kickoffAt: matches.kickoffAt,
      matchDate: matches.matchDate,
      note: matches.note,
      opponent: matches.opponent,
      penaltiesAgainst: matches.penaltiesAgainst,
      penaltiesFor: matches.penaltiesFor,
      round: matches.round,
      season: matches.season,
      stadium: matches.stadium,
    })
    .from(matches)
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(eq(matches.status, 'played'))
    .orderBy(asc(matches.season), asc(matches.matchDate), asc(matches.kickoffAt), asc(matches.id))

  return rows.flatMap(({ goalsAgainst, goalsFor, ...row }) =>
    goalsAgainst === null || goalsFor === null ? [] : [{ ...row, goalsAgainst, goalsFor, status: 'played' as const }],
  )
}
