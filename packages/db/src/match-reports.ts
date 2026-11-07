import type { MatchReport as ReportForRules, ReportMatch } from '@fansite/shared/match-report'

import { minutesPlayed, playedMatch } from '@fansite/shared/match-report'
import { and, asc, eq, inArray } from 'drizzle-orm'

import type { Database } from './client.ts'
import type {
  Competition,
  Match,
  MatchAppearance,
  MatchCard,
  MatchGoal,
  MatchIncident,
  MatchReport,
  MatchReportStatus,
  MatchSubstitution,
} from './schema.ts'

import {
  matchAppearances,
  matchCards,
  matches,
  matchGoals,
  matchIncidents,
  matchReports,
  matchSubstitutions,
} from './schema.ts'

// What the pages read of the match reports (see `match_reports` in schema.ts). Writing a report
// is the work of the admin, and the rules that say whether a report is right are in
// `@fansite/shared/match-report`.

/**
 * What a player did in the matches with a report that is `klaar`. `matches` is the number of
 * matches he played (in the line-up or from the bench), `starts` the line-ups, `substitutions`
 * the times he came on, `minutes` the minutes from `minutesPlayed`, and `goals` the goals he
 * scored without own goals. `assists` are the goals he gave. A match that is `bezig` counts for
 * nobody.
 */
export type PlayerReportStats = {
  assists: number
  goals: number
  matches: number
  minutes: number
  name: string
  playerId: number
  redCards: number
  starts: number
  substitutions: number
  yellowCards: number
  yellowRedCards: number
}

/** A match of a season with the status of its report: `null` for a match without a report. */
export type SeasonMatchReport = Pick<
  Match,
  | 'competition'
  | 'goalsAgainst'
  | 'goalsFor'
  | 'home'
  | 'id'
  | 'kickoffAt'
  | 'matchDate'
  | 'opponent'
  | 'round'
  | 'status'
> & { reportStatus: MatchReportStatus | null }

/**
 * A report as it is stored: the report itself, the players, and the events in the order of the
 * clock, and for the same minute the order of `id`. `goals` are the goals of the match, with
 * the
 * players of the report they point to. `rules` is the same report as the rules read it.
 */
export type StoredMatchReport = {
  appearances: MatchAppearance[]
  cards: MatchCard[]
  goals: MatchGoal[]
  incidents: MatchIncident[]
  report: MatchReport
  substitutions: MatchSubstitution[]
}

/** What the reading functions read through. */
type ReportDatabase = Pick<Database, 'select'>

/**
 * The matches of a season, from the first to the last, each with the status of its report:
 * `bezig`, `klaar`, or `null` when it has none. A match on the same day keeps the order of the
 * kick-off, and then of `id`.
 */
export async function listSeasonReports(db: ReportDatabase, season: string): Promise<SeasonMatchReport[]> {
  return db
    .select({
      competition: matches.competition,
      goalsAgainst: matches.goalsAgainst,
      goalsFor: matches.goalsFor,
      home: matches.home,
      id: matches.id,
      kickoffAt: matches.kickoffAt,
      matchDate: matches.matchDate,
      opponent: matches.opponent,
      reportStatus: matchReports.status,
      round: matches.round,
      status: matches.status,
    })
    .from(matches)
    .leftJoin(matchReports, eq(matchReports.matchId, matches.id))
    .where(eq(matches.season, season))
    .orderBy(asc(matches.matchDate), asc(matches.kickoffAt), asc(matches.id))
}

/** The match in the shape the rules read. */
export function matchForRules(match: Pick<Match, 'extraTime' | 'goalsAgainst' | 'goalsFor' | 'status'>): ReportMatch {
  return {
    extraTime: match.extraTime,
    goalsAgainst: match.goalsAgainst,
    goalsFor: match.goalsFor,
    status: match.status,
  }
}

/**
 * The report of a match, or `undefined` when it has none. Whatever its status: a page decides
 * for
 * itself whether it shows a report that is still `bezig`.
 */
export async function readMatchReport(db: ReportDatabase, matchId: number): Promise<StoredMatchReport | undefined> {
  const [report] = await db.select().from(matchReports).where(eq(matchReports.matchId, matchId))

  if (report === undefined) {
    return undefined
  }

  const [appearances, substitutions, cards, incidents, goals] = await Promise.all([
    db.select().from(matchAppearances).where(eq(matchAppearances.matchId, matchId)).orderBy(asc(matchAppearances.id)),
    db.select().from(matchSubstitutions).where(eq(matchSubstitutions.matchId, matchId)),
    db.select().from(matchCards).where(eq(matchCards.matchId, matchId)),
    db.select().from(matchIncidents).where(eq(matchIncidents.matchId, matchId)),
    db.select().from(matchGoals).where(eq(matchGoals.matchId, matchId)),
  ])

  return {
    appearances,
    cards: cards.toSorted(onTheClock),
    goals: goals.toSorted(onTheClock),
    incidents: incidents.toSorted(onTheClock),
    report,
    substitutions: substitutions.toSorted(onTheClock),
  }
}

/**
 * The numbers of the players of ours in the reports of a season, one entry for each player who
 * played, by name. With `competition` only the matches of that competition count. A player
 * who is no longer in `players` has no entry, since his rows no longer point to him.
 */
export async function readPlayerReportStats(
  db: ReportDatabase,
  season: string,
  competition?: Competition,
): Promise<PlayerReportStats[]> {
  const finished = await db
    .select({ extraTime: matches.extraTime, id: matches.id })
    .from(matches)
    .innerJoin(matchReports, eq(matchReports.matchId, matches.id))
    .where(
      and(
        eq(matches.season, season),
        eq(matches.status, 'played'),
        eq(matchReports.status, 'klaar'),
        ...(competition === undefined ? [] : [eq(matches.competition, competition)]),
      ),
    )

  if (finished.length === 0) {
    return []
  }

  const ids = finished.map((match) => match.id)
  const [appearances, substitutions, cards, goals] = await Promise.all([
    db.select().from(matchAppearances).where(inArray(matchAppearances.matchId, ids)),
    db.select().from(matchSubstitutions).where(inArray(matchSubstitutions.matchId, ids)),
    db.select().from(matchCards).where(inArray(matchCards.matchId, ids)),
    db.select().from(matchGoals).where(inArray(matchGoals.matchId, ids)),
  ])
  const stats = new Map<number, PlayerReportStats>()

  for (const match of finished) {
    const ofMatch = <T extends { matchId: number }>(rows: T[]) => rows.filter((row) => row.matchId === match.id)
    const players = ofMatch(appearances)
    const report: ReportForRules = {
      appearances: players.map((player) => ({
        captain: player.captain,
        id: player.id,
        name: player.name,
        ours: player.ours,
        shirtNumber: player.shirtNumber,
        starter: player.starter,
      })),
      cards: ofMatch(cards).map((card) => ({
        appearanceId: card.appearanceId,
        kind: card.kind,
        minute: card.minute,
        stoppageMinutes: card.stoppageMinutes,
      })),
      goals: [],
      incidents: [],
      opponentComplete: false,
      status: 'klaar',
      substitutions: ofMatch(substitutions).map((substitution) => ({
        inId: substitution.appearanceInId,
        minute: substitution.minute,
        outId: substitution.appearanceOutId,
        stoppageMinutes: substitution.stoppageMinutes,
      })),
    }
    const entry = (appearance: MatchAppearance) => {
      if (appearance.playerId === null) {
        return undefined
      }

      let found = stats.get(appearance.playerId)

      if (found === undefined) {
        found = {
          assists: 0,
          goals: 0,
          matches: 0,
          minutes: 0,
          name: appearance.name,
          playerId: appearance.playerId,
          redCards: 0,
          starts: 0,
          substitutions: 0,
          yellowCards: 0,
          yellowRedCards: 0,
        }
        stats.set(appearance.playerId, found)
      }

      return found
    }
    const byAppearance = new Map(players.map((player) => [player.id, player]))

    for (const player of players) {
      const found = player.ours ? entry(player) : undefined

      if (found === undefined || !playedMatch(report, player.id)) {
        continue
      }

      found.matches++
      found.minutes += minutesPlayed(report, match, player.id)

      if (player.starter) {
        found.starts++
      } else {
        found.substitutions++
      }
    }

    for (const card of ofMatch(cards)) {
      const player = byAppearance.get(card.appearanceId)
      const found = player?.ours ? entry(player) : undefined

      if (found !== undefined) {
        found[card.kind === 'geel' ? 'yellowCards' : card.kind === 'rood' ? 'redCards' : 'yellowRedCards']++
      }
    }

    for (const goal of ofMatch(goals)) {
      const scorer = goal.appearanceId === null ? undefined : byAppearance.get(goal.appearanceId)
      const assist = goal.assistAppearanceId === null ? undefined : byAppearance.get(goal.assistAppearanceId)
      const scoring = scorer?.ours && !goal.ownGoal ? entry(scorer) : undefined
      const assisting = assist?.ours ? entry(assist) : undefined

      if (scoring !== undefined) {
        scoring.goals++
      }

      if (assisting !== undefined) {
        assisting.assists++
      }
    }
  }

  return [...stats.values()].toSorted((a, b) => a.name.localeCompare(b.name, 'nl'))
}

/** The report in the shape the rules of `@fansite/shared/match-report` read. */
export function reportForRules(stored: StoredMatchReport): ReportForRules {
  return {
    appearances: stored.appearances.map((player) => ({
      captain: player.captain,
      id: player.id,
      name: player.name,
      ours: player.ours,
      shirtNumber: player.shirtNumber,
      starter: player.starter,
    })),
    cards: stored.cards.map((card) => ({
      appearanceId: card.appearanceId,
      kind: card.kind,
      minute: card.minute,
      stoppageMinutes: card.stoppageMinutes,
    })),
    goals: stored.goals.map((goal) => ({
      appearanceId: goal.appearanceId,
      assistId: goal.assistAppearanceId,
      minute: goal.minute,
      ours: goal.ours,
      ownGoal: goal.ownGoal,
      penalty: goal.penalty,
      stoppageMinutes: goal.stoppageMinutes,
    })),
    incidents: stored.incidents.map((incident) => ({
      appearanceId: incident.appearanceId,
      kind: incident.kind,
      minute: incident.minute,
      stoppageMinutes: incident.stoppageMinutes,
    })),
    opponentComplete: stored.report.opponentComplete,
    status: stored.report.status,
    substitutions: stored.substitutions.map((substitution) => ({
      inId: substitution.appearanceInId,
      minute: substitution.minute,
      outId: substitution.appearanceOutId,
      stoppageMinutes: substitution.stoppageMinutes,
    })),
  }
}

/**
 * The order of the clock: the minute, then the added time, then `id` for two events at once.
 */
function onTheClock<T extends { id: number; minute: number; stoppageMinutes: null | number }>(a: T, b: T) {
  return a.minute - b.minute || (a.stoppageMinutes ?? 0) - (b.stoppageMinutes ?? 0) || a.id - b.id
}
