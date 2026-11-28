import type { Competition } from '@fansite/db/schema'
import type { MatchReport } from '@fansite/shared/match-report'

import {
  clubs,
  matchAppearances,
  matchCards,
  matches,
  matchGoals,
  matchReports,
  matchSubstitutions,
  persons,
  players,
  playerSeasonStats,
} from '@fansite/db/schema'
import { nameInFront, shownAppearanceName } from '@fansite/db/shown-name'
import { minutesPlayed } from '@fansite/shared/match-report'
import { and, count, countDistinct, eq, inArray, or } from 'drizzle-orm'
import { cache } from 'react'

import { type CompetitionChoice, countsFor, optionsOf } from './competition'
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
  /** The slug of the club of the opponent: its page is `/tegenstanders/<slug>`. */
  clubSlug?: string
  competition: Competition
  goalsAgainst: number
  goalsFor: number
  /** Whether we played at home. */
  home: boolean
  id: number
  /** The day of the match, such as `2004-04-10`. */
  matchDate: string
  opponent: string
  /** The penalty series, when the match had one: it decides the result (see `resultOf`). */
  penaltiesAgainst?: number
  penaltiesFor?: number
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
  /** The matches in which he was on the pitch: in the line-up or came on, the first first. */
  lineupMatches: readonly CareerMatch[]
  /** The matches played in the season, all competitions, as the line-ups are compared with. */
  matchesInSeason: number
  /**
   * The minutes he played, from the reports with our line-up, finished or not (#1674). Only
   * for a season in which every played match has one: a lower number would look like little
   * playing time.
   */
  minutes: number | undefined
  /** The matches in which he was on the pitch: in the line-up or came on as a substitute. */
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
  /** Goals he scored against us, for a club of his own or after leaving: the match is ours. */
  againstUs?: readonly {
    match: CareerMatch
    minute: null | number
    stoppage: null | number
  }[]
  appearances: readonly SeasonAppearance[]
  /**
   * Who gave him an assist: one row for each goal of his with a known assist, with the name in
   * the report and the slug of the page of the player when he has one (`persons.slug`).
   */
  assistGivers?: readonly { name: string; slug: null | string }[]
  /** The goals he gave an assist for, in the reports (`assist_appearance_id`), by season. */
  assists: readonly { competition?: Competition; season: string }[]
  /** His goals for us, without own goals: each goal once, whichever way it belongs to him. */
  goals: readonly {
    competition: Competition
    match: CareerMatch
    minute: null | number
    season: string
    stoppage: null | number
  }[]
  /**
   * The played matches of the seasons he has a row in, how many have a report that is
   * `klaar`, and how many a report with our line-up of eleven, finished or not.
   */
  matchCounts: readonly { lineups: number; played: number; reported: number; season: string }[]
  /** His minutes in each appearance in a report, finished or not (see `minutesPlayed`). */
  minutes: readonly { competition: Competition; minutes: number; season: string }[]
  /** His rows in `players`: the season and the shirt number. */
  players: readonly { season: string; shirtNumber: null | number }[]
  /** The table of the Dutch Wikipedia: the matches and assists, over its competitions. */
  tables: readonly { appearances: number; assists: number; season: string }[]
}

/** One appearance of the player in a played match with a report that is `klaar`. */
export type SeasonAppearance = {
  /** Whether he came on as a substitute (he is the player coming in of a substitution). */
  cameOn: boolean
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
 * The choices of the switch on his page (#1103, #1209): `all` first, then the league, the cup
 * and Europe, each only when he played or scored in it, and none when there is nothing to
 * choose. The line-ups and the goals tell, whatever the source of a season.
 */
export function playerCompetitionOptions(facts: PlayerSeasonFacts): CompetitionChoice[] {
  const played = [
    ...facts.appearances.filter(({ cameOn, starter }) => starter || cameOn).map(({ match }) => match.competition),
    ...facts.goals.map(({ competition }) => competition),
  ]

  return optionsOf(
    (['league', 'playoffs', 'cup', 'europe'] as const).filter((choice) =>
      played.some((competition) => countsFor(competition, choice)),
    ),
  )
}

/**
 * The seasons of a person, the newest first, from what was read. The source of each season
 * follows #785. A clean sheet and a goal conceded count only the matches in which he was in
 * the line-up and was not substituted; a red card ends a match too, so such a match does not
 * count either. A season with no figure at all (no line-up, no table, no goal) has dashes
 * only: with no source the goals are unknown, not nil.
 */
export function playerSeasonsOf(allFacts: PlayerSeasonFacts, only?: readonly Competition[]): PlayerSeason[] {
  const facts = only === undefined ? allFacts : inCompetition(allFacts, only)
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
    // Played: in the line-up or came on. A substitute who stayed on the bench did not play.
    const onPitch = lineups.filter((appearance) => appearance.starter || appearance.cameOn)
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
          ? only === undefined
            ? table?.assists
            : undefined
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
      lineupMatches: onPitch.map(({ match }) => match).sort(byDay),
      matchesInSeason,
      minutes:
        matchesInSeason > 0 && (counts?.lineups ?? 0) >= matchesInSeason
          ? facts.minutes
              .filter((appearance) => appearance.season === season)
              .reduce((total, appearance) => total + appearance.minutes, 0)
          : undefined,
      played: fromLineups ? onPitch.length : only === undefined ? table?.appearances : undefined,
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
 * matches of those seasons, his appearances in every report with their cards and substitutions
 * (the figures other than the minutes keep those of a report that is `klaar`), the goals, and
 * the table of Wikipedia. The goals belong to him by `person_id`, by `player_id` or by
 * `appearance_id`; one query with `or` returns a goal once, whichever of the three ways it
 * matches, and an own goal or a goal against us never matches.
 */
export async function readPlayerSeasonFacts(personId: number): Promise<PlayerSeasonFacts> {
  const { db } = getDatabase()
  const rows = await db
    .select({ id: players.id, season: players.season, shirtNumber: players.shirtNumber })
    .from(players)
    .where(eq(players.personId, personId))

  if (rows.length === 0) {
    return { appearances: [], assists: [], goals: [], matchCounts: [], minutes: [], players: [], tables: [] }
  }

  const playerIds = rows.map((row) => row.id)
  const seasons = [...new Set(rows.map((row) => row.season))]
  const played = and(eq(matches.status, 'played'), inArray(matches.season, seasons))
  const matchColumns = {
    clubSlug: clubs.slug,
    competition: matches.competition,
    goalsAgainst: matches.goalsAgainst,
    goalsFor: matches.goalsFor,
    home: matches.home,
    matchDate: matches.matchDate,
    matchId: matches.id,
    opponent: matches.opponent,
    penaltiesAgainst: matches.penaltiesAgainst,
    penaltiesFor: matches.penaltiesFor,
    round: matches.round,
    season: matches.season,
  }
  // The goals belong to him by `person_id`, by `player_id` or by `appearance_id`.
  const hisGoal = or(
    eq(matchGoals.personId, personId),
    inArray(matchGoals.playerId, playerIds),
    inArray(
      matchGoals.appearanceId,
      db
        .select({ id: matchAppearances.id })
        .from(matchAppearances)
        .where(inArray(matchAppearances.playerId, playerIds)),
    ),
  )
  const [
    appearances,
    cards,
    substitutions,
    cameOn,
    goals,
    assists,
    playedCounts,
    reportedCounts,
    fullLineups,
    tables,
    assistGivers,
    againstUs,
  ] = await Promise.all([
    // Every report, finished or not: the minutes count both, the other figures only `klaar`.
    db
      .select({
        ...matchColumns,
        extraTime: matches.extraTime,
        id: matchAppearances.id,
        starter: matchAppearances.starter,
        status: matchReports.status,
      })
      .from(matchAppearances)
      .innerJoin(matches, eq(matches.id, matchAppearances.matchId))
      .innerJoin(clubs, eq(clubs.id, matches.clubId))
      .innerJoin(matchReports, eq(matchReports.matchId, matchAppearances.matchId))
      .where(and(played, inArray(matchAppearances.playerId, playerIds))),
    db
      .select({
        appearanceId: matchCards.appearanceId,
        kind: matchCards.kind,
        minute: matchCards.minute,
        stoppageMinutes: matchCards.stoppageMinutes,
      })
      .from(matchCards)
      .innerJoin(matchAppearances, eq(matchAppearances.id, matchCards.appearanceId))
      .where(inArray(matchAppearances.playerId, playerIds)),
    db
      .select({
        inId: matchSubstitutions.appearanceInId,
        minute: matchSubstitutions.minute,
        outId: matchSubstitutions.appearanceOutId,
        stoppageMinutes: matchSubstitutions.stoppageMinutes,
      })
      .from(matchSubstitutions)
      .innerJoin(matchAppearances, eq(matchAppearances.id, matchSubstitutions.appearanceOutId))
      .where(inArray(matchAppearances.playerId, playerIds)),
    db
      .select({
        inId: matchSubstitutions.appearanceInId,
        minute: matchSubstitutions.minute,
        outId: matchSubstitutions.appearanceOutId,
        stoppageMinutes: matchSubstitutions.stoppageMinutes,
      })
      .from(matchSubstitutions)
      .innerJoin(matchAppearances, eq(matchAppearances.id, matchSubstitutions.appearanceInId))
      .where(inArray(matchAppearances.playerId, playerIds)),
    db
      .select({ ...matchColumns, minute: matchGoals.minute, stoppage: matchGoals.stoppageMinutes })
      .from(matchGoals)
      .innerJoin(matches, eq(matches.id, matchGoals.matchId))
      .innerJoin(clubs, eq(clubs.id, matches.clubId))
      .where(and(inArray(matches.season, seasons), eq(matchGoals.ours, true), eq(matchGoals.ownGoal, false), hisGoal)),
    db
      .select({ competition: matches.competition, season: matches.season })
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
    // One row for each match in which our line-up has its eleven players, in one query.
    db
      .select({ season: matches.season })
      .from(matches)
      .innerJoin(matchAppearances, eq(matchAppearances.matchId, matches.id))
      .innerJoin(matchReports, eq(matchReports.matchId, matches.id))
      .where(and(played, eq(matchAppearances.ours, true), eq(matchAppearances.starter, true)))
      .groupBy(matches.id, matches.season)
      .having(eq(count(), 11)),
    db
      .select({
        appearances: playerSeasonStats.appearances,
        assists: playerSeasonStats.assists,
        season: playerSeasonStats.season,
      })
      .from(playerSeasonStats)
      .where(inArray(playerSeasonStats.playerId, playerIds)),
    db
      .select({ name: nameInFront(shownAppearanceName()), slug: persons.slug })
      .from(matchGoals)
      .innerJoin(matchAppearances, eq(matchAppearances.id, matchGoals.assistAppearanceId))
      .leftJoin(players, eq(players.id, matchAppearances.playerId))
      .leftJoin(persons, eq(persons.id, players.personId))
      .where(and(eq(matchGoals.ours, true), eq(matchGoals.ownGoal, false), hisGoal)),
    // A goal against us is a goal of his that is not ours; the match is ours, so its score is.
    db
      .select({ ...matchColumns, minute: matchGoals.minute, stoppage: matchGoals.stoppageMinutes })
      .from(matchGoals)
      .innerJoin(matches, eq(matches.id, matchGoals.matchId))
      .innerJoin(clubs, eq(clubs.id, matches.clubId))
      .where(
        and(
          eq(matches.status, 'played'),
          eq(matchGoals.ours, false),
          eq(matchGoals.ownGoal, false),
          eq(matchGoals.personId, personId),
        ),
      ),
  ])
  const cardsOf = (id: number) => cards.filter((card) => card.appearanceId === id).map((card) => card.kind)
  const wentOff = new Set(substitutions.map((row) => row.outId))
  const cameOnIds = new Set(cameOn.map((row) => row.inId))
  const finished = appearances.filter((appearance) => appearance.status === 'klaar')
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
    clubSlug: string
    competition: Competition
    goalsAgainst: null | number
    goalsFor: null | number
    home: boolean
    matchDate: string
    matchId: number
    opponent: string
    penaltiesAgainst: null | number
    penaltiesFor: null | number
    round: string
    season: string
  }): CareerMatch => ({
    clubSlug: row.clubSlug,
    competition: row.competition,
    goalsAgainst: row.goalsAgainst ?? 0,
    goalsFor: row.goalsFor ?? 0,
    home: row.home,
    id: row.matchId,
    matchDate: row.matchDate,
    opponent: row.opponent,
    ...(row.penaltiesFor === null || row.penaltiesAgainst === null
      ? {}
      : { penaltiesAgainst: row.penaltiesAgainst, penaltiesFor: row.penaltiesFor }),
    round: row.round,
    season: row.season,
  })

  return {
    againstUs: againstUs.map((goal) => ({
      match: matchOf(goal),
      minute: goal.minute,
      stoppage: goal.stoppage,
    })),
    appearances: finished.map((appearance) => {
      const kinds = cardsOf(appearance.id)

      return {
        cameOn: cameOnIds.has(appearance.id),
        goalsAgainst: appearance.goalsAgainst ?? 0,
        match: matchOf(appearance),
        red: kinds.includes('rood') || kinds.includes('geel-rood'),
        season: appearance.season,
        starter: appearance.starter,
        substituted: wentOff.has(appearance.id),
        yellow: kinds.includes('geel') || kinds.includes('geel-rood'),
      }
    }),
    assistGivers,
    assists,
    goals: goals.map((goal) => ({
      competition: goal.competition,
      match: matchOf(goal),
      minute: goal.minute,
      season: goal.season,
      stoppage: goal.stoppage,
    })),
    matchCounts: playedCounts.map(({ played: total, season }) => ({
      lineups: fullLineups.filter((row) => row.season === season).length,
      played: total,
      reported: reportedCounts.find((row) => row.season === season)?.reported ?? 0,
      season,
    })),
    minutes: appearances.map((appearance) => ({
      competition: appearance.competition,
      minutes: minutesOf(appearance, [...substitutions, ...cameOn], cards),
      season: appearance.season,
    })),
    players: rows.map(({ season, shirtNumber }) => ({ season, shirtNumber })),
    tables: [...tableSeasons.values()],
  }
}

/**
 * What was read, kept to the matches of one competition (#1103). The table of Wikipedia has no
 * split by competition: `playerSeasonsOf` leaves what it fills out for a season that has it.
 */
function inCompetition(facts: PlayerSeasonFacts, only: readonly Competition[]): PlayerSeasonFacts {
  return {
    ...facts,
    appearances: facts.appearances.filter(({ match }) => only.includes(match.competition)),
    assists: facts.assists.filter((assist) => assist.competition !== undefined && only.includes(assist.competition)),
    goals: facts.goals.filter((goal) => goal.competition !== undefined && only.includes(goal.competition)),
    minutes: facts.minutes.filter(({ competition }) => only.includes(competition)),
  }
}

/**
 * The minutes of one appearance, by `minutesPlayed`, the calculation of Spelers › Cijfers. The
 * rules of a report need only his own part of it: his place in the line-up, the substitutions
 * that take him off or bring him on, with the other player of each, and his cards.
 */
function minutesOf(
  appearance: { extraTime: boolean; id: number; starter: boolean },
  substitutions: readonly MatchReport['substitutions'][number][],
  cards: readonly MatchReport['cards'][number][],
) {
  const own = substitutions.filter(({ inId, outId }) => inId === appearance.id || outId === appearance.id)
  const others = new Set(own.flatMap(({ inId, outId }) => [inId, outId]).filter((id) => id !== appearance.id))
  const entry = (id: number, starter: boolean) => ({
    captain: false,
    id,
    name: '',
    ours: true,
    shirtNumber: null,
    starter,
  })

  return minutesPlayed(
    {
      appearances: [entry(appearance.id, appearance.starter), ...[...others].map((id) => entry(id, false))],
      cards: cards.filter((card) => card.appearanceId === appearance.id),
      goals: [],
      incidents: [],
      opponentComplete: false,
      status: 'bezig',
      substitutions: own,
    },
    appearance,
    appearance.id,
  )
}

/**
 * The seasons of a person, the newest first (see `playerSeasonsOf`). `cache` lets the blocks of
 * one page share a single reading per request. It throws when the database fails, and the
 * block that asks logs it and leaves itself out.
 */
export const loadPlayerSeasons = cache(async (personId: number): Promise<PlayerSeason[]> => {
  return playerSeasonsOf(await loadPlayerSeasonFacts(personId))
})

/**
 * What was read for a person, once per request: the seasons and the side column of his page
 * (#1086) are worked out from the same reading.
 */
export const loadPlayerSeasonFacts = cache((personId: number): Promise<PlayerSeasonFacts> => {
  return readPlayerSeasonFacts(personId)
})
