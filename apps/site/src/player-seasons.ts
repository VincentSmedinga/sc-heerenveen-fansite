import type { Competition } from '@fansite/db/schema'

import {
  matchAppearances,
  matchCards,
  matches,
  matchGoals,
  matchReports,
  matchSubstitutions,
  players,
  playerSeasonStats,
} from '@fansite/db/schema'
import { and, count, countDistinct, eq, inArray, or } from 'drizzle-orm'
import { cache } from 'react'

import { getDatabase } from './database'

/** A goal he scored for us: the match, and the minute when we know it. */
export type CareerGoal = {
  match: CareerMatch
  minute: number | undefined
  /** The minutes of added time after `minute`, when we know them. */
  stoppage: number | undefined
}

/** A played match as the career names it: enough to find its page and to say what happened. */
export type CareerMatch = {
  competition: Competition
  goalsAgainst: number
  goalsFor: number
  /** Whether we played at home. */
  home: boolean
  id: number
  /** The day of the match, such as `2004-04-10`. */
  matchDate: string
  opponent: string
  round: string
  season: string
}

/**
 * What the site knows of one season of a player. A figure we do not have is `undefined` and
 * never 0: a block shows it as a dash. Every block of the page of a player reads these (the
 * table Per seizoen, the core figures, the career, the charts and the sidebar), so a number is
 * worked out in this module only.
 */
export type PlayerSeason = {
  /** The assists he gave. */
  assists: number | undefined
  /** The matches in which the goalkeeper kept a clean sheet, played from start to end. */
  cleanSheets: number | undefined
  /** The goals he conceded in the matches in which he played from start to end. */
  conceded: number | undefined
  /** His goals for us in the season, the first first, with the match and the minute. */
  goalMoments: readonly CareerGoal[]
  /** The goals he scored for us, without own goals: `undefined` when we know nothing of it. */
  goals: number | undefined
  /** The goals he scored for us in each competition, the competitions without one left out. */
  goalsByCompetition: Partial<Record<Competition, number>>
  /** The matches in which he was in a line-up or on the bench, the first first. */
  lineupMatches: readonly CareerMatch[]
  /** The matches played in the season, all competitions, as the line-ups are compared with. */
  matchesInSeason: number
  /** The matches in which he was, also as a substitute. */
  played: number | undefined
  /** The red cards, and the yellow-red cards. */
  red: number | undefined
  /** The matches of the season that have a report with a line-up. */
  reportedMatches: number
  /** The season, such as `2004/05`. */
  season: string
  /** His shirt number in that season, or `undefined` for a season without one. */
  shirtNumber: number | undefined
  /** The source of the figures that are not the goals (see `SeasonSource`). */
  source: SeasonSource
  /** The matches in which he was in the line-up. */
  started: number | undefined
  /** The yellow cards, and the yellow-red cards. */
  yellow: number | undefined
}

/** What is read from the database for one person (see `readPlayerSeasonFacts`). */
export type PlayerSeasonFacts = {
  appearances: readonly SeasonAppearance[]
  /** The goals he gave an assist for, in the reports (`assist_appearance_id`), by season. */
  assists: readonly { season: string }[]
  /** His goals for us, without own goals: each goal once, whichever way it belongs to him. */
  goals: readonly {
    competition: Competition
    match: CareerMatch
    minute: null | number
    season: string
    stoppage: null | number
  }[]
  /** The played matches of the seasons he has a row in, and how many have a report. */
  matchCounts: readonly { played: number; reported: number; season: string }[]
  /** His rows in `players`: the season and the shirt number. */
  players: readonly { season: string; shirtNumber: null | number }[]
  /** The table of the Dutch Wikipedia: the matches and assists, over its competitions. */
  tables: readonly { appearances: number; assists: number; season: string }[]
}

/** One appearance of the player in a played match with a report that is `klaar`. */
export type SeasonAppearance = {
  /** The goals the opponent scored in the match (the final score, with extra time). */
  goalsAgainst: number
  /** The match. */
  match: CareerMatch
  /** Whether he got a red card or a yellow-red card. */
  red: boolean
  season: string
  /** Whether he was in the line-up. */
  starter: boolean
  /** Whether he was substituted. */
  substituted: boolean
  /** Whether he got a yellow card or a yellow-red card. */
  yellow: boolean
}

/**
 * Where the figures of a season come from, for the figures that only a report or a table has
 * (matches, line-ups, assists, cards and, for a goalkeeper, the clean sheets):
 *
 * - `lineups`: every match played in the season has a report with a line-up;
 * - `wikipedia`: the table of the Dutch Wikipedia (`player_season_stats`), which counts only
 *   the competitions of that table;
 * - `some-lineups`: only some matches have a line-up, so the figures count those;
 * - `none`: nothing of the sort.
 *
 * The rule is in #785: the line-ups first, then the table, then the line-ups that there are.
 */
export type SeasonSource = 'lineups' | 'none' | 'some-lineups' | 'wikipedia'

/**
 * The seasons of a person, the newest first, from what was read. The source of each season
 * follows #785. A clean sheet and a goal conceded count only the matches in which he was in
 * the line-up and was not substituted; a red card ends a match too, so such a match does not
 * count either. A season with no figure at all (no line-up, no table, no goal) has dashes
 * only: with no source the goals are unknown, not nil.
 */
export function playerSeasonsOf(facts: PlayerSeasonFacts): PlayerSeason[] {
  const seasons = [...new Set(facts.players.map((row) => row.season))].sort().reverse()

  return seasons.map((season) => {
    const counts = facts.matchCounts.find((row) => row.season === season)
    const matchesInSeason = counts?.played ?? 0
    const reportedMatches = counts?.reported ?? 0
    const table = facts.tables.find((row) => row.season === season)
    const lineups = facts.appearances.filter((appearance) => appearance.season === season)
    const goals = facts.goals.filter((goal) => goal.season === season)
    const shirtNumber = facts.players.find((row) => row.season === season && row.shirtNumber !== null)?.shirtNumber

    const source: SeasonSource =
      reportedMatches > 0 && reportedMatches >= matchesInSeason
        ? 'lineups'
        : table !== undefined
          ? 'wikipedia'
          : reportedMatches > 0
            ? 'some-lineups'
            : 'none'
    const fromLineups = source === 'lineups' || source === 'some-lineups'
    const wholeMatches = lineups.filter(
      (appearance) => appearance.starter && !appearance.substituted && !appearance.red,
    )
    const sum = (rows: readonly SeasonAppearance[], pick: (row: SeasonAppearance) => boolean) =>
      rows.filter(pick).length
    const goalsByCompetition: Partial<Record<Competition, number>> = {}
    const byDay = (first: { id: number; matchDate: string }, second: { id: number; matchDate: string }) =>
      first.matchDate.localeCompare(second.matchDate) || first.id - second.id

    for (const { competition } of goals) {
      goalsByCompetition[competition] = (goalsByCompetition[competition] ?? 0) + 1
    }

    return {
      assists:
        source === 'wikipedia'
          ? table?.assists
          : fromLineups
            ? facts.assists.filter((assist) => assist.season === season).length
            : undefined,
      cleanSheets: fromLineups ? sum(wholeMatches, (appearance) => appearance.goalsAgainst === 0) : undefined,
      conceded: fromLineups
        ? wholeMatches.reduce((total, appearance) => total + appearance.goalsAgainst, 0)
        : undefined,
      goalMoments: goals
        .map((goal) => ({ match: goal.match, minute: goal.minute ?? undefined, stoppage: goal.stoppage ?? undefined }))
        .sort((first, second) => byDay(first.match, second.match) || (first.minute ?? 0) - (second.minute ?? 0)),
      goals: source === 'none' && goals.length === 0 ? undefined : goals.length,
      goalsByCompetition,
      lineupMatches: lineups.map(({ match }) => match).sort(byDay),
      matchesInSeason,
      played: fromLineups ? lineups.length : table?.appearances,
      red: fromLineups ? sum(lineups, (appearance) => appearance.red) : undefined,
      reportedMatches,
      season,
      shirtNumber: shirtNumber ?? undefined,
      source,
      started: fromLineups ? sum(lineups, (appearance) => appearance.starter) : undefined,
      yellow: fromLineups ? sum(lineups, (appearance) => appearance.yellow) : undefined,
    }
  })
}

/**
 * Reads what the seasons of a person need, in a few queries: his rows in `players`, the played
 * matches of those seasons, the appearances in the reports that are `klaar` with their cards
 * and substitutions, the goals, and the table of Wikipedia. The goals belong to him by
 * `person_id`, by `player_id` or by `appearance_id`; one query with `or` returns a goal once,
 * whichever of the three ways it matches, and an own goal or a goal against us never matches.
 */
export async function readPlayerSeasonFacts(personId: number): Promise<PlayerSeasonFacts> {
  const { db } = getDatabase()
  const rows = await db
    .select({ id: players.id, season: players.season, shirtNumber: players.shirtNumber })
    .from(players)
    .where(eq(players.personId, personId))

  if (rows.length === 0) {
    return { appearances: [], assists: [], goals: [], matchCounts: [], players: [], tables: [] }
  }

  const playerIds = rows.map((row) => row.id)
  const seasons = [...new Set(rows.map((row) => row.season))]
  const played = and(eq(matches.status, 'played'), inArray(matches.season, seasons))
  const matchColumns = {
    competition: matches.competition,
    goalsAgainst: matches.goalsAgainst,
    goalsFor: matches.goalsFor,
    home: matches.home,
    matchDate: matches.matchDate,
    matchId: matches.id,
    opponent: matches.opponent,
    round: matches.round,
    season: matches.season,
  }
  const [appearances, cards, substitutions, goals, assists, playedCounts, reportedCounts, tables] = await Promise.all([
    db
      .select({ ...matchColumns, id: matchAppearances.id, starter: matchAppearances.starter })
      .from(matchAppearances)
      .innerJoin(matches, eq(matches.id, matchAppearances.matchId))
      .innerJoin(matchReports, eq(matchReports.matchId, matchAppearances.matchId))
      .where(and(played, eq(matchReports.status, 'klaar'), inArray(matchAppearances.playerId, playerIds))),
    db
      .select({ appearanceId: matchCards.appearanceId, kind: matchCards.kind })
      .from(matchCards)
      .innerJoin(matchAppearances, eq(matchAppearances.id, matchCards.appearanceId))
      .where(inArray(matchAppearances.playerId, playerIds)),
    db
      .select({ appearanceId: matchSubstitutions.appearanceOutId })
      .from(matchSubstitutions)
      .innerJoin(matchAppearances, eq(matchAppearances.id, matchSubstitutions.appearanceOutId))
      .where(inArray(matchAppearances.playerId, playerIds)),
    db
      .select({ ...matchColumns, minute: matchGoals.minute, stoppage: matchGoals.stoppageMinutes })
      .from(matchGoals)
      .innerJoin(matches, eq(matches.id, matchGoals.matchId))
      .where(
        and(
          inArray(matches.season, seasons),
          eq(matchGoals.ours, true),
          eq(matchGoals.ownGoal, false),
          or(
            eq(matchGoals.personId, personId),
            inArray(matchGoals.playerId, playerIds),
            inArray(
              matchGoals.appearanceId,
              db
                .select({ id: matchAppearances.id })
                .from(matchAppearances)
                .where(inArray(matchAppearances.playerId, playerIds)),
            ),
          ),
        ),
      ),
    db
      .select({ season: matches.season })
      .from(matchGoals)
      .innerJoin(matches, eq(matches.id, matchGoals.matchId))
      .where(
        and(
          inArray(matches.season, seasons),
          eq(matchGoals.ownGoal, false),
          inArray(
            matchGoals.assistAppearanceId,
            db
              .select({ id: matchAppearances.id })
              .from(matchAppearances)
              .where(inArray(matchAppearances.playerId, playerIds)),
          ),
        ),
      ),
    db.select({ played: count(), season: matches.season }).from(matches).where(played).groupBy(matches.season),
    db
      .select({ reported: countDistinct(matches.id), season: matches.season })
      .from(matches)
      .innerJoin(matchReports, eq(matchReports.matchId, matches.id))
      .where(and(played, eq(matchReports.status, 'klaar')))
      .groupBy(matches.season),
    db
      .select({
        appearances: playerSeasonStats.appearances,
        assists: playerSeasonStats.assists,
        season: playerSeasonStats.season,
      })
      .from(playerSeasonStats)
      .where(inArray(playerSeasonStats.playerId, playerIds)),
  ])
  const cardsOf = (id: number) => cards.filter((card) => card.appearanceId === id).map((card) => card.kind)
  const wentOff = new Set(substitutions.map((row) => row.appearanceId))
  const tableSeasons = new Map<string, { appearances: number; assists: number; season: string }>()

  // A player can have a row for each competition, and a person two rows in one season.
  for (const row of tables) {
    const found = tableSeasons.get(row.season)

    tableSeasons.set(row.season, {
      appearances: (found?.appearances ?? 0) + row.appearances,
      assists: (found?.assists ?? 0) + row.assists,
      season: row.season,
    })
  }

  const matchOf = (row: {
    competition: Competition
    goalsAgainst: null | number
    goalsFor: null | number
    home: boolean
    matchDate: string
    matchId: number
    opponent: string
    round: string
    season: string
  }): CareerMatch => ({
    competition: row.competition,
    goalsAgainst: row.goalsAgainst ?? 0,
    goalsFor: row.goalsFor ?? 0,
    home: row.home,
    id: row.matchId,
    matchDate: row.matchDate,
    opponent: row.opponent,
    round: row.round,
    season: row.season,
  })

  return {
    appearances: appearances.map((appearance) => {
      const kinds = cardsOf(appearance.id)

      return {
        goalsAgainst: appearance.goalsAgainst ?? 0,
        match: matchOf(appearance),
        red: kinds.includes('rood') || kinds.includes('geel-rood'),
        season: appearance.season,
        starter: appearance.starter,
        substituted: wentOff.has(appearance.id),
        yellow: kinds.includes('geel') || kinds.includes('geel-rood'),
      }
    }),
    assists,
    goals: goals.map((goal) => ({
      competition: goal.competition,
      match: matchOf(goal),
      minute: goal.minute,
      season: goal.season,
      stoppage: goal.stoppage,
    })),
    matchCounts: playedCounts.map(({ played: total, season }) => ({
      played: total,
      reported: reportedCounts.find((row) => row.season === season)?.reported ?? 0,
      season,
    })),
    players: rows.map(({ season, shirtNumber }) => ({ season, shirtNumber })),
    tables: [...tableSeasons.values()],
  }
}

/**
 * The seasons of a person, the newest first (see `playerSeasonsOf`). `cache` lets the blocks of
 * one page share a single reading per request. It throws when the database fails, and the
 * block that asks logs it and leaves itself out.
 */
export const loadPlayerSeasons = cache(async (personId: number): Promise<PlayerSeason[]> => {
  return playerSeasonsOf(await readPlayerSeasonFacts(personId))
})
