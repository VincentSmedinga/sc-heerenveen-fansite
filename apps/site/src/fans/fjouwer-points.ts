import type { Database } from '@fansite/db/client'

import { readMatchReport, reportForRules } from '@fansite/db/match-reports'
import {
  clubs,
  fantasyPicks,
  fantasyPlayerLines,
  matches,
  matchReports,
  persons,
  players,
  supporters,
} from '@fansite/db/schema'
import {
  type FantasyFacts,
  fantasyFacts,
  type FantasyLine,
  fantasyPoints,
  type FantasyPoints,
  fantasySummary,
} from '@fansite/shared/fantasy-points'
import { reportFinished } from '@fansite/shared/match-report'
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'

import { cacheForKey } from '#src/cache'
import { getDatabase } from '#src/database'

import { personNameParts, splitPersonName } from '../player-name'
import { closesAt, type Four, fourOf, usesBefore, usesLeft } from './fjouwer-rules'

// The points of the game Fjouwer (issue 1471): what each of our players scored in a match with
// a finished report, what the four of a supporter came to, and the place of a supporter among
// all who had a four. The points are never kept in a table. They are worked out from the
// report each time they are read, by `fantasyPoints` of `@fansite/shared`, so a corrected
// report corrects everybody's points at once; the pages read them through a cache of a minute
// (`cachedResults`), so a busy page works them out once.

/** The result of every player of ours who is in the report of a match, by id of the player. */
export type MatchResults = ReadonlyMap<number, PlayerResult>

/** What one of our players scored in one match. */
export type PlayerResult = {
  facts: FantasyFacts
  /** The points with the reason per part. */
  points: FantasyPoints
  /** What happened, in a few plain words ("90 min, 2 goals, geel"). */
  summary: string
}

/**
 * Reads the results of a match. It is `undefined` while the match has no report, or its report
 * is not finished: the points come when it is. The pages pass the cached reader, and a test
 * passes `matchResults`.
 */
export type ResultsReader = (matchId: number) => Promise<MatchResults | undefined>

const minute = 60 * 1000

/**
 * The results of a match, from its report: one entry for each player of ours who is in the
 * report, whether he played or not, since a player who stayed on the bench scores 0. It is
 * `undefined` for a match without a finished report.
 */
export async function matchResults(db: Database, matchId: number): Promise<MatchResults | undefined> {
  const stored = await readMatchReport(db, matchId)
  const [match] = await db
    .select({ extraTime: matches.extraTime, goalsAgainst: matches.goalsAgainst })
    .from(matches)
    .where(eq(matches.id, matchId))

  if (stored === undefined || match === undefined) {
    return undefined
  }

  const report = reportForRules(stored)

  if (!reportFinished(report)) {
    return undefined
  }

  const ours = stored.appearances.flatMap((appearance) =>
    appearance.ours && appearance.playerId !== null ? [{ id: appearance.id, playerId: appearance.playerId }] : [],
  )
  const lines = await linesOf(
    db,
    ours.map((appearance) => appearance.playerId),
  )
  const results = new Map<number, PlayerResult>()

  for (const appearance of ours) {
    const line = lines.get(appearance.playerId)

    if (line === undefined) {
      continue
    }

    const facts = fantasyFacts(report, match, appearance.id, line)
    const points = fantasyPoints(facts)

    if (points !== undefined) {
      results.set(appearance.playerId, { facts, points, summary: fantasySummary(facts) })
    }
  }

  return results
}

/**
 * The line a player is counted in: the line kept for the game at his first use, or else his
 * position (`players`, then `persons`). A player without either is not counted: he could not
 * have been chosen.
 */
async function linesOf(db: Database, playerIds: readonly number[]): Promise<Map<number, FantasyLine>> {
  if (playerIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({
      id: players.id,
      line: sql<FantasyLine | null>`coalesce(${fantasyPlayerLines.line}, ${players.position}, ${persons.line})`,
    })
    .from(players)
    .leftJoin(persons, eq(players.personId, persons.id))
    .leftJoin(fantasyPlayerLines, eq(fantasyPlayerLines.playerId, players.id))
    .where(inArray(players.id, [...playerIds]))

  return new Map(rows.flatMap((row) => (row.line === null ? [] : [[row.id, row.line] as const])))
}

const readCached = cacheForKey(minute, (key) => matchResults(getDatabase().db, Number(key)))

/** The results of a match, kept a minute. The caller asks for a match of the database. */
export const cachedResults: ResultsReader = (matchId) => readCached(String(matchId))

/** The points of a player in a match: 0 for a player who is not in the report. */
export const pointsOf = (results: MatchResults, playerId: number) => results.get(playerId)?.points.total ?? 0

/**
 * What a supporter's four came to in one match that has closed. `names` are the surnames in the
 * order of the form; `rows` and `total` are there when the report is finished, and `ready` says
 * so.
 */
export type FourPoints = {
  match: PointsMatch
  names: readonly string[]
  ready: boolean
  rows: readonly FourRow[]
  total: number | undefined
}

/** One player of the four in a card of points. */
export type FourRow = {
  /** Whether he counts: a player who was chosen ten times before this match scores 0. */
  counted: boolean
  name: string
  /** The points, with the reason per part. */
  points: FantasyPoints
  /** What happened, or "Niet gespeeld", or why he did not count. */
  summary: string
  surname: string
}

/** The match of a card of points, with what the cards show of it. */
export type PointsMatch = {
  clubSlug: string
  competition: string
  dateText: null | string
  goalsAgainst: null | number
  goalsFor: null | number
  home: boolean
  id: number
  kickoffAt: Date | null
  matchDate: string
  opponent: string
  round: string
  season: string
  status: 'cancelled' | 'played' | 'postponed' | 'result_unknown' | 'scheduled'
}

/**
 * What each player of a season scored over all matches with a finished report, by id of the
 * player. It is the same for every supporter, and is what the form shows next to a name.
 */
export async function seasonPoints(
  db: Database,
  season: string,
  read: ResultsReader = cachedResults,
): Promise<Map<number, number>> {
  const finished = await db
    .select({ id: matches.id })
    .from(matches)
    .innerJoin(matchReports, eq(matchReports.matchId, matches.id))
    .where(and(eq(matches.season, season), eq(matchReports.status, 'klaar')))
  const all = await Promise.all(finished.map((match) => read(match.id)))
  const totals = new Map<number, number>()

  for (const results of all) {
    for (const [playerId, result] of results ?? []) {
      totals.set(playerId, (totals.get(playerId) ?? 0) + result.points.total)
    }
  }

  return totals
}

const matchColumns = {
  clubSlug: clubs.slug,
  competition: matches.competition,
  dateText: matches.dateText,
  goalsAgainst: matches.goalsAgainst,
  goalsFor: matches.goalsFor,
  home: matches.home,
  id: matches.id,
  kickoffAt: matches.kickoffAt,
  matchDate: matches.matchDate,
  opponent: matches.opponent,
  round: matches.round,
  season: matches.season,
  status: matches.status,
}

/** A supporter's place at a match: equal points share a place, and the next one is skipped. */
export type MatchStanding = {
  /** How many supporters had a four for the match and count. */
  counted: number
  /** The place of each supporter, by id, and the points that place is for. */
  places: ReadonlyMap<number, { place: number; points: number }>
}

/** The matches of a season that count for the game, in the order they close. */
export async function closingOrder(db: Database, season: string): Promise<PointsMatch[]> {
  const found = await db
    .select(matchColumns)
    .from(matches)
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(and(eq(matches.season, season), inArray(matches.status, ['scheduled', 'played'])))

  return found.toSorted((a, b) => closesAt(a).getTime() - closesAt(b).getTime() || a.id - b.id)
}

/**
 * The ranking of a match: everybody who had a four for it (saved or inherited) and whose
 * account is not blocked, ranked on the points of their four. A closed account has no
 * supporter any more and is not in it. Equal points share a place. `undefined` while the report
 * is not finished.
 */
export async function matchStanding(
  db: Database,
  matchId: number,
  read: ResultsReader = cachedResults,
): Promise<MatchStanding | undefined> {
  const results = await read(matchId)
  const [match] = await db.select({ season: matches.season }).from(matches).where(eq(matches.id, matchId))

  if (results === undefined || match === undefined) {
    return undefined
  }

  const ordered = await closingOrder(db, match.season)
  const ids = ordered.map((found) => found.id)
  const who = await db
    .selectDistinct({ id: supporters.id })
    .from(fantasyPicks)
    .innerJoin(supporters, eq(supporters.id, fantasyPicks.supporterId))
    .innerJoin(matches, eq(matches.id, fantasyPicks.matchId))
    .where(
      and(eq(matches.season, match.season), isNotNull(fantasyPicks.supporterId), sql`${supporters.disabledAt} is null`),
    )
  const saved = await savedFoursOf(
    db,
    who.map((row) => row.id),
    ids,
  )
  const totals = [...saved].flatMap(([supporterId, rows]) => {
    const have = fourOf(ids, rows, matchId)

    return have === undefined
      ? []
      : [{ points: pointsOfFour(have.four, usesBefore(ids, rows, matchId), results)?.total ?? 0, supporterId }]
  })
  const ranked = totals.toSorted((a, b) => b.points - a.points || a.supporterId - b.supporterId)

  return {
    counted: ranked.length,
    places: new Map(
      ranked.map((entry) => [
        entry.supporterId,
        { place: ranked.findIndex((other) => other.points === entry.points) + 1, points: entry.points },
      ]),
    ),
  }
}

/**
 * The points of a four in a match: the four players with their results, in the order of the
 * four. A player who was already chosen ten times before the match does not count and scores 0.
 * `results` is `undefined` while the report is not finished.
 */
export function pointsOfFour(
  four: Four,
  uses: ReadonlyMap<number, number>,
  results: MatchResults | undefined,
):
  | undefined
  | { rows: { counted: boolean; playerId: number; points: FantasyPoints; summary: string }[]; total: number } {
  if (results === undefined) {
    return undefined
  }

  const rows = four.map((playerId) => {
    const counted = usesLeft(uses, playerId) > 0
    const result = results.get(playerId)

    return {
      counted,
      playerId,
      points: counted ? (result?.points ?? { lines: [], total: 0 }) : { lines: [], total: 0 },
      summary: counted ? (result?.summary ?? 'Niet gespeeld') : 'Telde niet mee: al 10 keer gekozen',
    }
  })

  return { rows, total: rows.reduce((sum, row) => sum + row.points.total, 0) }
}

/** The fours a supporter saved in the matches of a season, by match. */
export async function savedFoursOf(db: Database, supporterIds: readonly number[], matchIds: readonly number[]) {
  const bySupporter = new Map<number, Map<number, Four>>()

  if (supporterIds.length === 0 || matchIds.length === 0) {
    return bySupporter
  }

  const rows = await db
    .select()
    .from(fantasyPicks)
    .where(and(inArray(fantasyPicks.supporterId, [...supporterIds]), inArray(fantasyPicks.matchId, [...matchIds])))

  for (const row of rows) {
    if (row.supporterId === null) {
      continue
    }

    const own = bySupporter.get(row.supporterId) ?? new Map<number, Four>()

    own.set(row.matchId, [row.player1Id, row.player2Id, row.player3Id, row.player4Id])
    bySupporter.set(row.supporterId, own)
  }

  return bySupporter
}

/**
 * What a supporter's fours came to: a row for each match that has closed and for which the
 * supporter had a four (saved or inherited), the newest first, in every season they chose in.
 * Matches in the future, or that have not begun, are not in it. The points are there for a
 * match with a finished report; for another the row has the names only.
 */
export async function supporterFours(
  db: Database,
  supporterId: number,
  now: Date,
  read: ResultsReader = cachedResults,
): Promise<FourPoints[]> {
  const seasons = await db
    .selectDistinct({ season: matches.season })
    .from(fantasyPicks)
    .innerJoin(matches, eq(matches.id, fantasyPicks.matchId))
    .where(eq(fantasyPicks.supporterId, supporterId))
  const found: { four: Four; match: PointsMatch; uses: ReadonlyMap<number, number> }[] = []

  for (const { season } of seasons) {
    const ordered = await closingOrder(db, season)
    const ids = ordered.map((match) => match.id)
    const saved = (await savedFoursOf(db, [supporterId], ids)).get(supporterId) ?? new Map<number, Four>()

    for (const match of ordered) {
      const have = closesAt(match).getTime() <= now.getTime() ? fourOf(ids, saved, match.id) : undefined

      if (have !== undefined) {
        found.push({ four: have.four, match, uses: usesBefore(ids, saved, match.id) })
      }
    }
  }

  const everyPlayer = [...new Set(found.flatMap((item) => item.four))]
  const names = await namesOf(db, everyPlayer)
  const newestFirst = found.toSorted(
    (a, b) => closesAt(b.match).getTime() - closesAt(a.match).getTime() || b.match.id - a.match.id,
  )

  return Promise.all(
    newestFirst.map(async ({ four, match, uses }): Promise<FourPoints> => {
      const worked = pointsOfFour(four, uses, await read(match.id))
      const nameOf = (playerId: number) => names.get(playerId) ?? { name: 'Onbekende speler', surname: 'Onbekend' }

      return {
        match,
        names: four.map((playerId) => nameOf(playerId).surname),
        ready: worked !== undefined,
        rows:
          worked?.rows.map((row) => ({
            counted: row.counted,
            name: nameOf(row.playerId).name,
            points: row.points,
            summary: row.summary,
            surname: nameOf(row.playerId).surname,
          })) ?? [],
        total: worked?.total,
      }
    }),
  )
}

/** The name and the surname of players, by id. */
async function namesOf(db: Database, playerIds: readonly number[]) {
  if (playerIds.length === 0) {
    return new Map<number, { name: string; surname: string }>()
  }

  const rows = await db
    .select({
      familyName: persons.familyName,
      familyNamePrefix: persons.familyNamePrefix,
      givenName: persons.givenName,
      id: players.id,
      name: players.name,
    })
    .from(players)
    .leftJoin(persons, eq(players.personId, persons.id))
    .where(inArray(players.id, [...playerIds]))

  return new Map(
    rows.map((row) => {
      const parts = personNameParts({
        personFamilyName: row.familyName,
        personFamilyNamePrefix: row.familyNamePrefix,
        personGivenName: row.givenName,
      })

      return [row.id, { name: row.name, surname: parts?.surname || splitPersonName(row.name).surname }] as const
    }),
  )
}

const readStanding = cacheForKey(minute, (key) => matchStanding(getDatabase().db, Number(key)))

/** The ranking of a match, kept a minute. The caller asks for a match of the database. */
export const cachedStanding = (matchId: number) => readStanding(String(matchId))
