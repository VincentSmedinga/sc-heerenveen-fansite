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
  StatsCompetition,
} from './schema.ts'

import { recordAction } from './audit-log.ts'
import {
  matchAppearances,
  matchCards,
  matches,
  matchGoals,
  matchIncidents,
  matchReports,
  matchSubstitutions,
  persons,
  players,
  playerSeasonStats,
  statsCompetitions,
} from './schema.ts'

// What the pages read of the match reports (see `match_reports` in schema.ts). Writing a report
// is the work of the admin, and the rules that say whether a report is right are in
// `@fansite/shared/match-report`.

/**
 * What a player did in the matches with a report that is `klaar`. `matches` is the number of
 * matches he played (in the line-up or from the bench), `starts` the line-ups, `substitutions`
 * the times he came on, `minutes` the minutes from `minutesPlayed`, and `goals` the goals he
 * scored without own goals. `assists` are the goals he gave. A match that is `bezig` counts for
 * nobody. A player of ours who was on the bench and did not come on has an entry with zeros, so
 * he does not disappear from a list of all the players of the reports.
 */
export type PlayerReportStats = {
  assists: number
  goals: number
  matches: number
  minutes: number
  name: string
  /** The name of the person as the importer kept it, in parts (see `persons`). */
  personFamilyName: null | string
  personFamilyNamePrefix: null | string
  personGivenName: null | string
  playerId: number
  redCards: number
  starts: number
  substitutions: number
  yellowCards: number
  yellowRedCards: number
}

/** A player whose goals in a competition differ between the reports and the squad table. */
export type ReportGoalDifference = {
  competition: StatsCompetition
  fromReports: number
  fromWikipedia: number
  name: string
  playerId: number
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
 * The players whose goals in a competition of the season, counted from the match reports,
 * differ from those in the squad table of Wikipedia (`player_season_stats`). It compares a
 * competition only when it can be compared: every played match of it has a report that is
 * `klaar`, and the squad table has numbers for it. With a report missing, the reports have
 * fewer goals by themselves, which is no news. A player the table does not have counts as 0
 * goals there.
 */
export async function findReportGoalDifferences(db: ReportDatabase, season: string): Promise<ReportGoalDifference[]> {
  const differences: ReportGoalDifference[] = []

  for (const competition of statsCompetitions) {
    const played = await db
      .select({ reportStatus: matchReports.status })
      .from(matches)
      .leftJoin(matchReports, eq(matchReports.matchId, matches.id))
      .where(and(eq(matches.season, season), eq(matches.competition, competition), eq(matches.status, 'played')))

    if (played.length === 0 || played.some((match) => match.reportStatus !== 'klaar')) {
      continue
    }

    const table = await db
      .select({ goals: playerSeasonStats.goals, name: players.name, playerId: playerSeasonStats.playerId })
      .from(playerSeasonStats)
      .innerJoin(players, eq(playerSeasonStats.playerId, players.id))
      .where(and(eq(playerSeasonStats.season, season), eq(playerSeasonStats.competition, competition)))

    if (table.length === 0) {
      continue
    }

    const fromReports = new Map(
      (await readPlayerReportStats(db, season, competition)).map((stats) => [stats.playerId, stats]),
    )
    const tabled = new Set(table.map((row) => row.playerId))
    const rows = [
      ...table.map((row) => ({ fromWikipedia: row.goals, name: row.name, playerId: row.playerId })),
      ...[...fromReports.values()]
        .filter((stats) => !tabled.has(stats.playerId))
        .map((stats) => ({ fromWikipedia: 0, name: stats.name, playerId: stats.playerId })),
    ]

    for (const row of rows) {
      const goals = fromReports.get(row.playerId)?.goals ?? 0

      if (goals !== row.fromWikipedia) {
        differences.push({ ...row, competition, fromReports: goals })
      }
    }
  }

  return differences.toSorted(
    (a, b) => a.name.localeCompare(b.name, 'nl') || a.competition.localeCompare(b.competition),
  )
}

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

/**
 * Writes each difference of `findReportGoalDifferences` in the log of the admin as
 * `player.stats-differ`, for the player, and returns how many lines it wrote. The log is only
 * added to and never read by code, so the function can't see what it said before: whoever
 * calls it does so when something changed that can cause a difference, which is a report that
 * is saved as `klaar` (the editor's account) and a squad table that has new numbers (`userId`
 * is `null`: the importer). Nothing is shown to visitors: the cards of Spelers read the
 * reports only.
 */
export async function logReportGoalDifferences(
  db: Pick<Database, 'insert' | 'select'>,
  season: string,
  userId: null | number,
  now = new Date(),
): Promise<number> {
  const differences = await findReportGoalDifferences(db, season)

  for (const difference of differences) {
    await recordAction(
      db,
      {
        action: 'player.stats-differ',
        detail: `Doelpunten ${difference.competition} ${season}: verslagen ${difference.fromReports}, Wikipedia ${difference.fromWikipedia}`,
        itemId: difference.playerId,
        userId,
      },
      now,
    )
  }

  return differences.length
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
          personFamilyName: null,
          personFamilyNamePrefix: null,
          personGivenName: null,
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

      // Somebody who stayed on the bench has his entry and no match.
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

  // The name of the person behind each player, in parts.
  const people =
    stats.size === 0
      ? []
      : await db
          .select({
            familyName: persons.familyName,
            familyNamePrefix: persons.familyNamePrefix,
            givenName: persons.givenName,
            id: players.id,
          })
          .from(players)
          .innerJoin(persons, eq(players.personId, persons.id))
          .where(inArray(players.id, [...stats.keys()]))

  for (const person of people) {
    const found = stats.get(person.id)

    if (found !== undefined) {
      found.personFamilyName = person.familyName
      found.personFamilyNamePrefix = person.familyNamePrefix
      found.personGivenName = person.givenName
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
