import type { Database } from '@fansite/db/client'

import { fantasyPicks, matches, matchReports, supporters } from '@fansite/db/schema'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'

import { cacheForKey } from '#src/cache'
import { getDatabase } from '#src/database'

import { cachedResults, closingOrder, pointsOfFour, type ResultsReader, savedFoursOf } from './fjouwer-points'
import { fourOf, usesBefore } from './fjouwer-rules'

// The ranking of the game Fjouwer per season (issue 1473). Like the points (issue 1471) it is
// never stored: it is worked out from the fours and the finished reports each time it is read,
// so a corrected report corrects the ranking within the five minutes it is kept.

/** The name shown for an account that was closed: the figures stay, the name is gone. */
export const formerSupporter = 'Voormalige fan'

/**
 * A ranking of a season. `rows` are the supporters who have a row, in order. `hidden` are the
 * supporters who left their name out: they are not in `rows`, but know their own place.
 * `matchCount` is the number of matches with a finished report.
 */
export type FourRanking = {
  hidden: ReadonlyMap<number, RankedFour>
  matchCount: number
  rows: readonly RankedFour[]
}

/** One row of the ranking. */
export type RankedFour = {
  /** The number of matches that count for this supporter. */
  matches: number
  /** The place: equal points share one, and the next place is skipped. */
  place: number
  screenName: string
  /** The number of the supporter; `null` for an account that was closed. */
  supporterId: null | number
  total: number
}

/** How many rows the table of the page shows before the row of the supporter. */
export const shownRows = 50

/** How many rows the card on the page of the game shows. */
export const topRows = 5

const fiveMinutes = 5 * 60 * 1000

type Entry = { matches: number; name: string; supporterId: null | number; total: number }

/** The place of an entry among points: one more than the number of entries with more. */
const placeOf = (totals: readonly number[], points: number) => totals.filter((other) => other > points).length + 1

/** The seasons that have a match with a finished report and a four, the newest first. */
export async function loadRankedSeasons(db: Database): Promise<string[]> {
  const rows = await db
    .selectDistinct({ season: matches.season })
    .from(fantasyPicks)
    .innerJoin(matches, eq(matches.id, fantasyPicks.matchId))
    .innerJoin(matchReports, eq(matchReports.matchId, matches.id))
    .where(eq(matchReports.status, 'klaar'))
    .orderBy(desc(matches.season))

  return rows.map((row) => row.season)
}

/**
 * The ranking of a season, read without the cache: for every match with a finished report, the
 * points of the four each supporter had (saved or inherited), added up. A blocked account is
 * not in it. A closed account keeps its saved fours without a name: each of them is a row of
 * "Voormalige fan", because the fours of one closed account can't be told apart.
 */
export async function loadSeasonRanking(
  db: Database,
  season: string,
  read: ResultsReader = cachedResults,
): Promise<FourRanking> {
  const finished = await db
    .select({ id: matches.id })
    .from(matches)
    .innerJoin(matchReports, eq(matchReports.matchId, matches.id))
    .where(and(eq(matches.season, season), eq(matchReports.status, 'klaar')))
  const resultsBy = new Map(
    (await Promise.all(finished.map(async (match) => [match.id, await read(match.id)] as const))).filter(
      (pair) => pair[1] !== undefined,
    ),
  )
  const ordered = await closingOrder(db, season)
  const ids = ordered.map((match) => match.id)
  const rows = await db
    .select({
      disabledAt: supporters.disabledAt,
      inRankings: supporters.inRankings,
      screenName: supporters.screenName,
      supporterId: fantasyPicks.supporterId,
    })
    .from(fantasyPicks)
    .innerJoin(supporters, eq(supporters.id, fantasyPicks.supporterId))
    .where(inArray(fantasyPicks.matchId, ids.length === 0 ? [0] : ids))
  const who = new Map(rows.flatMap((row) => (row.supporterId === null ? [] : [[row.supporterId, row] as const])))
  const saved = await savedFoursOf(db, [...who.keys()], ids)
  const entries: (Entry & { visible: boolean })[] = []

  for (const [supporterId, found] of saved) {
    const account = who.get(supporterId)

    if (account === undefined || account.disabledAt !== null) {
      continue
    }

    let total = 0
    let counted = 0

    for (const [matchId, results] of resultsBy) {
      const have = fourOf(ids, found, matchId)
      const worked = have === undefined ? undefined : pointsOfFour(have.four, usesBefore(ids, found, matchId), results)

      if (worked !== undefined) {
        total += worked.total
        counted += 1
      }
    }

    if (counted > 0) {
      entries.push({
        matches: counted,
        name: account.screenName,
        supporterId,
        total,
        visible: account.inRankings,
      })
    }
  }

  const closed = await db
    .select()
    .from(fantasyPicks)
    .where(and(isNull(fantasyPicks.supporterId), inArray(fantasyPicks.matchId, [...resultsBy.keys(), 0])))

  for (const pick of closed) {
    const worked = pointsOfFour(
      [pick.player1Id, pick.player2Id, pick.player3Id, pick.player4Id],
      new Map(),
      resultsBy.get(pick.matchId),
    )

    if (worked !== undefined) {
      entries.push({ matches: 1, name: formerSupporter, supporterId: null, total: worked.total, visible: true })
    }
  }

  return rankingOf(entries, resultsBy.size)
}

/** Builds a ranking from the entries of everybody who counts. */
export function rankingOf(entries: readonly (Entry & { visible: boolean })[], matchCount: number): FourRanking {
  const shown = entries
    .filter((entry) => entry.visible)
    .toSorted(
      (a, b) => b.total - a.total || a.name.localeCompare(b.name, 'nl') || (a.supporterId ?? 0) - (b.supporterId ?? 0),
    )
  const totals = shown.map((entry) => entry.total)
  const toRow = (entry: Entry): RankedFour => ({
    matches: entry.matches,
    place: placeOf(totals, entry.total),
    screenName: entry.name,
    supporterId: entry.supporterId,
    total: entry.total,
  })

  return {
    hidden: new Map(
      entries.flatMap((entry) =>
        !entry.visible && entry.supporterId !== null ? [[entry.supporterId, toRow(entry)] as const] : [],
      ),
    ),
    matchCount,
    rows: shown.map(toRow),
  }
}

const getRanking = cacheForKey(fiveMinutes, (season) => loadSeasonRanking(getDatabase().db, season))
const getSeasons = cacheForKey(fiveMinutes, () => loadRankedSeasons(getDatabase().db))

/** The ranking of a season, kept five minutes; ask for a season of `rankedSeasons`. */
export const seasonRanking = (season: string) => getRanking(season)

/** The seasons that have a ranking, kept five minutes. */
export const rankedSeasons = () => getSeasons('')

/**
 * The row of a supporter: in the ranking, or the row of a supporter who left their name out,
 * with the place they would have. `undefined` for someone without a four that counts.
 */
export const rowOf = (ranking: FourRanking, supporterId: number | undefined) =>
  supporterId === undefined
    ? undefined
    : (ranking.rows.find((row) => row.supporterId === supporterId) ?? ranking.hidden.get(supporterId))

/** A ranking without a row, for a season without points. */
export const emptyRanking: FourRanking = { hidden: new Map(), matchCount: 0, rows: [] }
