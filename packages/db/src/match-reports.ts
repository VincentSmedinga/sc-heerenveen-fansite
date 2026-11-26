import type { MatchReport as ReportForRules, ReportMatch } from '@fansite/shared/match-report'

import { minutesPlayed, playedMatch } from '@fansite/shared/match-report'
import { and, asc, eq, getTableColumns, inArray, isNull, or } from 'drizzle-orm'

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
  MatchShootoutKick,
  MatchSubstitution,
  StatsCompetition,
} from './schema.ts'

import { clubColourOf } from './club-colours.ts'
import { withSeasonNames } from './club-name-periods.ts'
import {
  clubs,
  matchAppearances,
  matchCards,
  matches,
  matchGoals,
  matchIncidents,
  matchReports,
  matchShootoutKicks,
  matchSubstitutions,
  persons,
  players,
  playerSeasonStats,
  statsCompetitions,
} from './schema.ts'
import { utcToAmsterdam } from './season.ts'
import { shownAppearanceName, shownGoalName, shownPlayerName, shownSearchTerm } from './shown-name.ts'

// What the pages read of the match reports (see `match_reports` in schema.ts). Writing a report
// is the work of the admin, and the rules that say whether a report is right are in
// `@fansite/shared/match-report`.

/**
 * What a player did in the matches with a report that is `klaar`. `matches` is the number of
 * matches he played (in the line-up or from the bench), `starts` the line-ups, `substitutions`
 * the times he came on, `substitutedOff` the times he went off for another player (not a red
 * card), `minutes` the minutes from `minutesPlayed`, and `goals` the goals he
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
  /** The address name of the person (`persons.slug`): null while he has no page. */
  personSlug: null | string
  playerId: number
  redCards: number
  starts: number
  substitutedOff: number
  /** The goals he scored without own goals after coming on from the bench. */
  substituteGoals: number
  substitutions: number
  yellowCards: number
  yellowRedCards: number
}

/** A line of a lineup or a bench, with the name we show for it (`shownAppearanceName`). */
export type ReportAppearance = MatchAppearance & { name: string }

/**
 * A match with a report that is `klaar` or `bezig`, for the page of the match and the links to
 * it. The match was played, or it is still being played (see `mayHaveReport`):
 * the match with the name its opponent had that day, the `slug` of the opponent, the report,
 * the names of our players by the id of their row in the report, and those of the persons of
 * the opponent's players in the same way. Whether the report is right is for the caller to
 * check with `checkMatchReport`.
 */
export type ReportedMatch = {
  clubSlug: string
  match: Match
  names: Map<number, ReportedPlayerName>
  /** The colour of the opponent as `#rrggbb` (`clubColourOf`), or null for none. */
  opponentColour: null | string
  /** The persons the opponent's players are linked to (#1544), whose names may be empty. */
  opponentPersons: Map<number, ReportedPersonName>
  stored: StoredMatchReport
}

/** Another person of ours with the same surname as a reported player. */
export type ReportedNamesake = { givenName: null | string; seasons: string[] }

/** The parts of the name of a person, as the importer kept them. */
export type ReportedPersonName = {
  familyName: null | string
  familyNamePrefix: null | string
  givenName: null | string
}

/**
 * The name of one of our players as the importer kept it, for the players of a report: the
 * parts of the name of his person, and the search term of his row in `players` (the surname the
 * search page looks for) when the person has no name yet. Both are null for a player of the
 * opponent, and for one who is no longer in `players`.
 */
export type ReportedPlayerName = {
  familyName: null | string
  familyNamePrefix: null | string
  givenName: null | string
  /**
   * The other persons of ours with the same surname (the prefix counts), each with the given
   * name and the seasons they have in `players`, and the seasons of this person. The page tells
   * two of them apart by an initial when their seasons are at most one apart. Empty for a
   * player without a person or a surname.
   */
  namesakes: ReportedNamesake[]
  searchTerm: null | string
  /** The seasons this person has in `players`, such as `2004/05`. */
  seasons: string[]
  /** The address name of the person (`persons.slug`): null while he has no page. */
  slug: null | string
}

/** A goal of a match, with the name we show for it (`shownGoalName`). */
export type ReportGoal = MatchGoal & { name: string }

/** A player whose goals in a competition differ between the reports and the squad table. */
export type ReportGoalDifference = {
  competition: StatsCompetition
  fromReports: number
  fromWikipedia: number
  name: string
  playerId: number
}

/**
 * Where a match with a report stands: `live` while it is being played (it is still `scheduled`
 * and the kick-off is past), `upcoming` for a match that has a report before its kick-off, and
 * nothing for a match that was played. See `phaseOf`.
 */
export type ReportPhase = 'live' | 'upcoming'

/** A match that is still `scheduled` and has no report: the page of its Voorbeschouwing. */
export type ScheduledMatch = { clubSlug: string; match: Match }

/** A match of a season with the status of its report: `null` for a match without a report. */
export type SeasonMatchReport = Pick<
  Match,
  | 'competition'
  | 'extraTime'
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
 * the players of the report they point to. `shootout` holds the kicks of the penalty shoot-out
 * in the order of the rounds, our kick before the kick of the opponent in the same round; it is
 * empty for a match without kicks. A kick points to its player like a card does, and `names`
 * of a `ReportedMatch` has the name of our players.
 */
export type StoredMatchReport = {
  appearances: ReportAppearance[]
  cards: MatchCard[]
  goals: ReportGoal[]
  incidents: MatchIncident[]
  report: MatchReport
  shootout: MatchShootoutKick[]
  substitutions: MatchSubstitution[]
}

type FamilyMember = { familyName: string; familyNamePrefix: null | string; givenName: null | string; seasons: string[] }

/** What the reading functions read through. */
type ReportDatabase = Pick<Database, 'select'>

/** The lines of lineups and benches, each with the name we show. */
export const selectReportAppearances = (db: ReportDatabase) =>
  db.select({ ...getTableColumns(matchAppearances), name: shownAppearanceName() }).from(matchAppearances)

/** The goals, each with the name we show. */
export const selectReportGoals = (db: ReportDatabase) =>
  db.select({ ...getTableColumns(matchGoals), name: shownGoalName() }).from(matchGoals)

/**
 * The played match of a season on a day against a club (by its `slug`), when it has a report,
 * whatever its status: the match of the address `/wedstrijden/<seizoen>/<datum>-<club>`. A
 * match that is still being played (`scheduled`) has a page too. The status is in
 * `stored.report.status`, and the caller decides what a report that is `bezig` shows.
 */
export async function findReportedMatch(
  db: ReportDatabase,
  { clubSlug, matchDate, season }: { clubSlug: string; matchDate: string; season: string },
): Promise<ReportedMatch | undefined> {
  const [found] = await reportedMatchesOf(
    db,
    and(eq(matches.season, season), eq(matches.matchDate, matchDate), eq(clubs.slug, clubSlug)),
  )

  return found
}

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
      .select({ goals: playerSeasonStats.goals, name: shownPlayerName(), playerId: playerSeasonStats.playerId })
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
 * The played matches of a season with a report, from the first to the last, whatever the
 * status of the report: `bezig` or `klaar`. The caller checks the rules and decides what a
 * report that is not `klaar` shows. A match without a report is not in it.
 */
export function listReportedMatches(db: ReportDatabase, season: string): Promise<ReportedMatch[]> {
  return reportedMatchesOf(db, eq(matches.season, season))
}

/**
 * The matches of a season that are still `scheduled`, have no report and have a club, from the
 * first to the last. They have the page of the Voorbeschouwing until there is result data (a
 * report, or another status), whether or not they have begun. A match without a club has no
 * address, so it is not in it.
 */
export async function listScheduledMatches(db: ReportDatabase, season: string): Promise<ScheduledMatch[]> {
  const rows = await db
    .select({ clubSlug: clubs.slug, match: matches })
    .from(matches)
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .leftJoin(matchReports, eq(matchReports.matchId, matches.id))
    .where(and(eq(matches.season, season), eq(matches.status, 'scheduled'), isNull(matchReports.matchId)))
    .orderBy(asc(matches.matchDate), asc(matches.kickoffAt), asc(matches.id))
  const named = await withSeasonNames(
    db,
    rows.map((row) => ({ ...row.match, clubSlug: row.clubSlug })),
  )

  return named.map(({ clubSlug, ...match }) => ({ clubSlug, match }))
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
      extraTime: matches.extraTime,
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
 * The matches of a season that were played but have no result (`result_unknown`, #1622) and
 * have a club, from the first to the last. They have a page of their own, without a report. A
 * match without a club has no address, so it is not in it.
 */
export async function listUnknownResultMatches(db: ReportDatabase, season: string): Promise<ScheduledMatch[]> {
  const rows = await db
    .select({ clubSlug: clubs.slug, match: matches })
    .from(matches)
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(and(eq(matches.season, season), eq(matches.status, 'result_unknown')))
    .orderBy(asc(matches.matchDate), asc(matches.kickoffAt), asc(matches.id))
  const named = await withSeasonNames(
    db,
    rows.map((row) => ({ ...row.match, clubSlug: row.clubSlug })),
  )

  return named.map(({ clubSlug, ...match }) => ({ clubSlug, match }))
}

/** The match in the shape the rules read. */
export function matchForRules(
  match: Pick<Match, 'extraTime' | 'goalsAgainst' | 'goalsFor' | 'penaltiesAgainst' | 'penaltiesFor' | 'status'>,
): ReportMatch {
  return {
    extraTime: match.extraTime,
    goalsAgainst: match.goalsAgainst,
    goalsFor: match.goalsFor,
    penaltiesAgainst: match.penaltiesAgainst,
    penaltiesFor: match.penaltiesFor,
    status: match.status,
  }
}

/**
 * Whether a match can have a report at `now`: it was played, or it is still `scheduled` and its
 * day (in Dutch time) has come, so it is being played or its kick-off is near. A match of a
 * later day, a postponed one and a cancelled one can not. While the match is `scheduled` its
 * report is `bezig` and gives the page its score (see `phaseOf`).
 */
export function mayHaveReport(match: Pick<Match, 'matchDate' | 'status'>, now: Date): boolean {
  return match.status === 'played' || (match.status === 'scheduled' && match.matchDate <= utcToAmsterdam(now).day)
}

/**
 * Where a match with a report stands at `now`. A match that was played has no phase. One that
 * is still `scheduled` is `live` from its kick-off, and without a known kick-off from its day
 * (in Dutch time); before that it is `upcoming`, and the page shows the kick-off and line-up.
 */
export function phaseOf(match: Pick<Match, 'kickoffAt' | 'matchDate' | 'status'>, now: Date): ReportPhase | undefined {
  if (match.status !== 'scheduled') {
    return undefined
  }

  const begun = match.kickoffAt === null ? match.matchDate <= utcToAmsterdam(now).day : match.kickoffAt <= now

  return begun ? 'live' : 'upcoming'
}

/**
 * The report of a match, or `undefined` when it has none. Whatever its status: a page decides
 * for itself whether it shows a report that is still `bezig`.
 */
export async function readMatchReport(db: ReportDatabase, matchId: number): Promise<StoredMatchReport | undefined> {
  const [report] = await db.select().from(matchReports).where(eq(matchReports.matchId, matchId))

  if (report === undefined) {
    return undefined
  }

  const [appearances, substitutions, cards, incidents, goals, shootout] = await Promise.all([
    selectReportAppearances(db).where(eq(matchAppearances.matchId, matchId)).orderBy(asc(matchAppearances.id)),
    db.select().from(matchSubstitutions).where(eq(matchSubstitutions.matchId, matchId)),
    db.select().from(matchCards).where(eq(matchCards.matchId, matchId)),
    db.select().from(matchIncidents).where(eq(matchIncidents.matchId, matchId)),
    selectReportGoals(db).where(eq(matchGoals.matchId, matchId)),
    db.select().from(matchShootoutKicks).where(eq(matchShootoutKicks.matchId, matchId)),
  ])

  return {
    appearances,
    cards: cards.toSorted(onTheClock),
    goals: goals.toSorted(onTheClock),
    incidents: incidents.toSorted(onTheClock),
    report,
    shootout: shootout.toSorted(byRound),
    substitutions: substitutions.toSorted(onTheClock),
  }
}

/**
 * The numbers of the players of ours in the reports of a season, one entry for each player who
 * played, by name. With `competition` (one, or a list) only the matches of those competitions
 * count. A player who is no longer in `players` has no entry, since his rows no longer point
 * to him.
 */
export async function readPlayerReportStats(
  db: ReportDatabase,
  season: string,
  competition?: Competition | readonly Competition[],
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
        ...(competition === undefined
          ? []
          : [
              inArray(
                matches.competition,
                Array.isArray(competition) ? [...competition] : [competition as Competition],
              ),
            ]),
      ),
    )

  if (finished.length === 0) {
    return []
  }

  const ids = finished.map((match) => match.id)
  const [appearances, substitutions, cards, goals] = await Promise.all([
    selectReportAppearances(db).where(inArray(matchAppearances.matchId, ids)),
    db.select().from(matchSubstitutions).where(inArray(matchSubstitutions.matchId, ids)),
    db.select().from(matchCards).where(inArray(matchCards.matchId, ids)),
    selectReportGoals(db).where(inArray(matchGoals.matchId, ids)),
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
    const entry = (appearance: ReportAppearance) => {
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
          personSlug: null,
          playerId: appearance.playerId,
          redCards: 0,
          starts: 0,
          substitutedOff: 0,
          substituteGoals: 0,
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

      if (report.substitutions.some((substitution) => substitution.outId === player.id)) {
        found.substitutedOff++
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

        if (scorer?.starter === false) {
          scoring.substituteGoals++
        }
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
            slug: persons.slug,
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
      found.personSlug = person.slug
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
    formations: { opponent: stored.report.formationOpponent, ours: stored.report.formationOurs },
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
    shootout: stored.shootout.map((kick) => ({
      appearanceId: kick.appearanceId,
      ours: kick.ours,
      outcome: kick.outcome,
      round: kick.round,
    })),
    status: stored.report.status,
    substitutions: stored.substitutions.map((substitution) => ({
      inId: substitution.appearanceInId,
      minute: substitution.minute,
      outId: substitution.appearanceOutId,
      stoppageMinutes: substitution.stoppageMinutes,
    })),
  }
}

/** The order of a shoot-out: the rounds, and in a round our kick before the opponent's. */
function byRound(a: MatchShootoutKick, b: MatchShootoutKick) {
  return a.round - b.round || Number(b.ours) - Number(a.ours) || a.id - b.id
}

/**
 * The order of the clock: the minute, then the added time, then `id` for two events at once. An
 * event without a minute comes after the ones with a minute, in the order of `id`.
 */
function onTheClock<T extends { id: number; minute: null | number; stoppageMinutes: null | number }>(a: T, b: T) {
  return (
    Number(a.minute === null) - Number(b.minute === null) ||
    (a.minute ?? 0) - (b.minute ?? 0) ||
    (a.stoppageMinutes ?? 0) - (b.stoppageMinutes ?? 0) ||
    a.id - b.id
  )
}

/** The names of our players in the reports, by the id of their row in a report. */
async function readReportedPlayerNames(db: ReportDatabase, reports: Iterable<StoredMatchReport>) {
  const ours = [...reports].flatMap((stored) => stored.appearances.filter((player) => player.playerId !== null))
  const names = new Map<number, ReportedPlayerName>()

  if (ours.length === 0) {
    return names
  }

  const found = await db
    .select({
      familyName: persons.familyName,
      familyNamePrefix: persons.familyNamePrefix,
      givenName: persons.givenName,
      id: players.id,
      personId: players.personId,
      searchTerm: shownSearchTerm(),
      slug: persons.slug,
    })
    .from(players)
    .leftJoin(persons, eq(persons.id, players.personId))
    .where(inArray(players.id, [...new Set(ours.map((player) => player.playerId!))]))
  const byPlayer = new Map(found.map((row) => [row.id, row]))
  const family = await readFamilies(
    db,
    found.flatMap((row) => (row.familyName === null || row.familyName === '' ? [] : [row.familyName])),
  )

  for (const player of ours) {
    const row = byPlayer.get(player.playerId!)

    if (row !== undefined) {
      names.set(player.id, {
        familyName: row.familyName,
        familyNamePrefix: row.familyNamePrefix,
        givenName: row.givenName,
        namesakes: row.personId === null ? [] : namesakesOf(family, row),
        searchTerm: row.searchTerm,
        seasons: row.personId === null ? [] : (family.byPerson.get(row.personId)?.seasons ?? []),
        slug: row.slug,
      })
    }
  }

  return names
}

const surnameKey = (prefix: null | string, familyName: string) => `${prefix ?? ''} ${familyName}`.trim().toLowerCase()

/** The other persons with the surname of this one, with a family name of their own. */
function namesakesOf(
  family: { byPerson: Map<number, FamilyMember> },
  row: { familyName: null | string; familyNamePrefix: null | string; personId: null | number },
): ReportedNamesake[] {
  if (row.familyName === null || row.familyName === '') {
    return []
  }

  const key = surnameKey(row.familyNamePrefix, row.familyName)

  return [...family.byPerson.entries()]
    .filter(([id, member]) => id !== row.personId && surnameKey(member.familyNamePrefix, member.familyName) === key)
    .map(([, member]) => ({ givenName: member.givenName, seasons: member.seasons }))
}

/** The persons with one of these family names, with the seasons they have in `players`. */
async function readFamilies(db: ReportDatabase, familyNames: string[]) {
  const byPerson = new Map<number, FamilyMember>()

  if (familyNames.length > 0) {
    const rows = await db
      .select({
        familyName: persons.familyName,
        familyNamePrefix: persons.familyNamePrefix,
        givenName: persons.givenName,
        personId: persons.id,
        season: players.season,
      })
      .from(persons)
      .innerJoin(players, eq(players.personId, persons.id))
      .where(inArray(persons.familyName, [...new Set(familyNames)]))

    for (const row of rows) {
      const member = byPerson.get(row.personId) ?? {
        familyName: row.familyName ?? '',
        familyNamePrefix: row.familyNamePrefix,
        givenName: row.givenName,
        seasons: [],
      }

      member.seasons.push(row.season)
      byPerson.set(row.personId, member)
    }
  }

  return { byPerson }
}

/** The names of the persons of the opponent's players, by the id of their row in a report. */
async function readOpponentPersons(db: ReportDatabase, reports: Iterable<StoredMatchReport>) {
  const linked = [...reports].flatMap((stored) =>
    stored.appearances.filter((player) => !player.ours && player.personId !== null),
  )
  const names = new Map<number, ReportedPersonName>()

  if (linked.length === 0) {
    return names
  }

  const found = await db
    .select({
      familyName: persons.familyName,
      familyNamePrefix: persons.familyNamePrefix,
      givenName: persons.givenName,
      id: persons.id,
    })
    .from(persons)
    .where(inArray(persons.id, [...new Set(linked.map((player) => player.personId!))]))
  const byPerson = new Map(found.map(({ id, ...name }) => [id, name]))

  for (const player of linked) {
    const name = byPerson.get(player.personId!)

    if (name !== undefined) {
      names.set(player.id, name)
    }
  }

  return names
}

/** The report, the players and the events of several matches, read with a few queries. */
async function readStoredReports(db: ReportDatabase, ids: number[]) {
  if (ids.length === 0) {
    return new Map<number, StoredMatchReport>()
  }

  const [reports, appearances, substitutions, cards, incidents, goals, shootout] = await Promise.all([
    db.select().from(matchReports).where(inArray(matchReports.matchId, ids)),
    selectReportAppearances(db).where(inArray(matchAppearances.matchId, ids)).orderBy(asc(matchAppearances.id)),
    db.select().from(matchSubstitutions).where(inArray(matchSubstitutions.matchId, ids)),
    db.select().from(matchCards).where(inArray(matchCards.matchId, ids)),
    db.select().from(matchIncidents).where(inArray(matchIncidents.matchId, ids)),
    selectReportGoals(db).where(inArray(matchGoals.matchId, ids)),
    db.select().from(matchShootoutKicks).where(inArray(matchShootoutKicks.matchId, ids)),
  ])
  const ofMatch = <T extends { matchId: number }>(rows: T[], id: number) => rows.filter((row) => row.matchId === id)

  return new Map(
    reports.map((report): [number, StoredMatchReport] => [
      report.matchId,
      {
        appearances: ofMatch(appearances, report.matchId),
        cards: ofMatch(cards, report.matchId).toSorted(onTheClock),
        goals: ofMatch(goals, report.matchId).toSorted(onTheClock),
        incidents: ofMatch(incidents, report.matchId).toSorted(onTheClock),
        report,
        shootout: ofMatch(shootout, report.matchId).toSorted(byRound),
        substitutions: ofMatch(substitutions, report.matchId).toSorted(onTheClock),
      },
    ]),
  )
}

async function reportedMatchesOf(db: ReportDatabase, where: ReturnType<typeof and>): Promise<ReportedMatch[]> {
  const rows = await reportedMatchRows(db, where)
  const stored = await readStoredReports(
    db,
    rows.map((row) => row.match.id),
  )
  const names = await readReportedPlayerNames(db, stored.values())
  const opponentPersons = await readOpponentPersons(db, stored.values())

  return rows.flatMap((row) => {
    const report = stored.get(row.match.id)

    return report === undefined ? [] : [{ ...row, names, opponentPersons, stored: report }]
  })
}

/** The matches that have a report, whichever its status, with the opponent's name and slug. */
async function reportedMatchRows(db: ReportDatabase, where: ReturnType<typeof and>) {
  const rows = await db
    .select({ clubSlug: clubs.slug, colourChoice: clubs.colourChoice, match: matches })
    .from(matches)
    .innerJoin(matchReports, eq(matchReports.matchId, matches.id))
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(and(or(eq(matches.status, 'played'), eq(matches.status, 'scheduled')), where))
    .orderBy(asc(matches.matchDate), asc(matches.kickoffAt), asc(matches.id))
  const named = await withSeasonNames(
    db,
    rows.map((row) => ({ ...row.match, clubSlug: row.clubSlug })),
  )

  const colours = new Map(rows.map((row) => [row.match.id, clubColourOf(row.clubSlug, row.colourChoice)]))

  return named.map(({ clubSlug, ...match }) => ({ clubSlug, match, opponentColour: colours.get(match.id) ?? null }))
}
