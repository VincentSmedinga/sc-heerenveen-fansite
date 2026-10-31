import type { FormResult } from '@fansite/design-system'

import {
  listMatchSeasons,
  listSeasonMatches,
  listSeasonStandings,
  listStaffInSeason,
  listWikipediaPages,
  type PublicMatch,
  type PublicStaff,
  type PublicStandingsRow,
  type PublicWikipediaPage,
} from '@fansite/db/queries'
import { seasonOf } from '@fansite/db/season'

import { cacheFor, cacheForKey } from './cache'
import { type CompetitionChoice } from './competition'
import { getDatabase } from './database'
import { firstCleanSheets, moreCleanSheets } from './items-per-card'
import { lastDayOf } from './match-format'
import { type NameParts, pageTitleName, splitPageName, splitPlayerName, surnameOnly } from './player-name'

/** The name of our own club in the table. */
const ourClub = 'sc Heerenveen'

/** Whether a match counts for the choice: the league alone, or the league and the cup. */
const countsFor = (match: PublicMatch, choice: CompetitionChoice) =>
  choice === 'all' || match.competition === 'Eredivisie'

/** Whether a match is a cup tie that was played and has a score, so one the choice can add. */
const isPlayedCupMatch = (match: PublicMatch) =>
  match.competition !== 'Eredivisie' &&
  match.status === 'played' &&
  match.goalsFor !== null &&
  match.goalsAgainst !== null

/**
 * Whether the season has a cup tie that was played, so whether there is anything to choose:
 * without one, the two choices count the same matches and the page has no switch.
 */
export const hasPlayedCupMatch = (matches: PublicMatch[]) => matches.some(isPlayedCupMatch)

/**
 * The competitions a card counts, as the captions of the cards name them: the cup is in only
 * when the choice is `all` and a cup tie was played, because then it is in the numbers.
 */
export const competitionNames = (matches: PublicMatch[], choice: CompetitionChoice) =>
  choice === 'all' && hasPlayedCupMatch(matches) ? 'de Eredivisie en de KNVB Beker' : 'de Eredivisie'

export type MatchData = {
  /** The head coaches of the season, in the order their periods began. */
  coaches: PublicStaff[]
  matches: PublicMatch[]
  pages: PublicWikipediaPage[]
  season: string
  standings: PublicStandingsRow[]
}

/**
 * The matches of the current season split the way the pages show them, by the moment a match
 * begins and not by its status. `results` is every match that has begun, the newest first, also
 * one whose result isn't known yet. `programme` is every match that has not begun, in the order
 * they are played, and a match that is called off with no new date stays in it until the
 * importer finds one. `previous` is the first of the results and `next` the first match in the
 * programme that has a date, so not one that is called off. The homepage and the matches page
 * both take them from here, so they never disagree on what the next match is.
 */
export type MatchOverview = {
  next: PublicMatch | undefined
  previous: PublicMatch | undefined
  programme: PublicMatch[]
  results: PublicMatch[]
}

/** How long the data of the current season is kept: a new result shows within five minutes. */
const currentSeasonPeriod = 5 * 60 * 1000

/** A season that is over doesn't change, so it is kept for an hour. */
const pastSeasonPeriod = 60 * 60 * 1000

async function loadSeason(season: string): Promise<MatchData> {
  const { db } = getDatabase()
  const [matches, standings, pages, coaches] = await Promise.all([
    listSeasonMatches(db, season),
    listSeasonStandings(db, season),
    listWikipediaPages(db, season),
    listStaffInSeason(db, 'coach', season),
  ])

  return { coaches, matches, pages, season, standings }
}

const currentSeasonData = cacheForKey(currentSeasonPeriod, loadSeason)
const pastSeasonData = cacheForKey(pastSeasonPeriod, loadSeason)

/**
 * The matches, the league table, the Wikipedia pages and the head coaches of one season, the
 * current one when no season is given. Each is asked for that season alone. The cache keeps an
 * entry for every season it is asked for, so the caller asks for a season of `getMatchSeasons`
 * only: a visitor can make up any address. The data of the current season is kept for five
 * minutes, so a visit doesn't cost four queries and a new result shows within five minutes of
 * the import, which runs every hour. A season that is over is kept for an hour.
 */
export function getMatchData(season = seasonOf(new Date())): Promise<MatchData> {
  return season === seasonOf(new Date()) ? currentSeasonData(season) : pastSeasonData(season)
}

const matchSeasons = cacheFor(currentSeasonPeriod, async () => listMatchSeasons(getDatabase().db))

/** The played matches in which sc Heerenveen kept a clean sheet, and how many were played. */
export type CleanSheets = {
  /** The matches with no goal against, the newest first. */
  matches: PublicMatch[]
  /** How many matches were played, with a result. */
  played: number
}

/** A played match of the Eredivisie with a score, so with both numbers of goals. */
export type LeagueMatch = PublicMatch & { goalsAgainst: number; goalsFor: number }

/** One streak: matches in a row that all meet a condition, as it stands now and the longest. */
export type Streak = {
  /** The matches in a row up to the latest match; 0 when the latest match does not meet it. */
  current: number
  /** The name of the streak as the card shows it, such as `Ongeslagen`. */
  label: string
  /** The most matches in a row anywhere in the season. */
  longest: number
}

/** The streaks of sc Heerenveen in the Eredivisie, and the latest matches. */
export type Streaks = {
  /** The latest five matches (fewer when fewer are played), the oldest first. */
  last: { match: LeagueMatch; result: FormResult }[]
  /** How many matches were played, with a score. */
  played: number
  /** The six streaks, in the order the card shows them. */
  streaks: Streak[]
}

/**
 * A player in the list of goal scorers: the goals this season and the place, from 1. `player`
 * is the full name from the table `players` for a goal that is linked to a player, the title of
 * the Wikipedia page without its addition for a goal that has only a page, and the name as the
 * match page shows it for a goal with neither. `givenName` and `surname` are its parts for
 * `PlayerName`: a name is split with the search term (see `splitPlayerName` and
 * `splitPageName`), and a name without a page is a surname only. `id` tells the rows apart: the
 * id of the player, else the title of the page, else the name.
 */
export type TopScorer = NameParts & {
  goals: number
  id: number | string
  player: string
  position: number
}

/**
 * The matches of the season in which sc Heerenveen conceded no goal, the newest first, and how
 * many matches were played. `choice` says whether the cup counts (`all`, the default) or the
 * league alone. A match counts on the result of the match, so after extra time on the score
 * after it; a shoot-out is kept apart and never decides this. A match that isn't played, or has
 * no result, counts for neither.
 */
export function cleanSheetsOf(matches: PublicMatch[], choice: CompetitionChoice = 'all'): CleanSheets {
  const played = matches
    .filter(
      (match) =>
        countsFor(match, choice) && match.status === 'played' && match.goalsFor !== null && match.goalsAgainst !== null,
    )
    .reverse()

  return { matches: played.filter((match) => match.goalsAgainst === 0), played: played.length }
}

/**
 * The seasons the matches and statistics pages can show, the newest first: the seasons that
 * have matches, up to and including the current one. The current season is always in it, also
 * before its first match is in the database, because the page of that season is the base
 * address of the page itself. A season after the current one is left out, because it has no
 * page.
 */
export async function getMatchSeasons(): Promise<string[]> {
  const current = seasonOf(new Date())
  const known = (await matchSeasons()).filter((season) => season < current)

  return [current, ...known].sort().reverse()
}

/**
 * The results of the played matches of the Eredivisie, for the chart of the season: `W` for a
 * win, `G` for a draw and `V` for a loss, in the order the matches were played (the query gives
 * the matches by date, then by kick-off). A cup tie, a match that isn't played and a match with
 * no score count for nothing. A match that was postponed has no result until it is played, and
 * then it stands where it was played, so the place in the list is the order of the matches and
 * not always the round. The Eredivisie has no extra time or shoot-out, so the score decides.
 */
export function leagueResultsOf(matches: PublicMatch[]): FormResult[] {
  return playedMatchesOf(matches, 'league').map(resultOf)
}

/**
 * The matches that are played and have a score, in the order given: those of the Eredivisie
 * for the choice `league`, and those of the cup as well for `all`. The score is the one after
 * extra time, and a shoot-out is not in it, so a cup tie that a shoot-out decided is a draw.
 */
function playedMatchesOf(matches: PublicMatch[], choice: CompetitionChoice): LeagueMatch[] {
  return matches.filter(
    (match): match is LeagueMatch =>
      countsFor(match, choice) && match.status === 'played' && match.goalsFor !== null && match.goalsAgainst !== null,
  )
}

/** The result of a match from the side of sc Heerenveen: `W` won, `G` drawn and `V` lost. */
function resultOf(match: LeagueMatch): FormResult {
  return match.goalsFor > match.goalsAgainst ? 'W' : match.goalsFor === match.goalsAgainst ? 'G' : 'V'
}

/** How many of the latest matches the card shows. */
const lastCount = 5

const streakConditions: { counts: (match: LeagueMatch) => boolean; label: string }[] = [
  { counts: (match) => match.goalsFor >= match.goalsAgainst, label: 'Ongeslagen' },
  { counts: (match) => match.goalsFor > match.goalsAgainst, label: 'Gewonnen' },
  { counts: (match) => match.goalsFor <= match.goalsAgainst, label: 'Zonder winst' },
  { counts: (match) => match.goalsFor < match.goalsAgainst, label: 'Verloren' },
  { counts: (match) => match.goalsFor > 0, label: 'Gescoord' },
  { counts: (match) => match.goalsAgainst === 0, label: 'Zonder tegendoelpunt' },
]

/**
 * The streaks of sc Heerenveen in the Eredivisie, and in the cup for the choice `all`: six
 * conditions (unbeaten, won, without a win, lost, scored, no goal against), each with the
 * number of matches in a row as it stands now and the longest of the season, and the latest
 * five matches. They come from the score, so from every played match, also the ones whose
 * scorers are not known. With the choice `league` (the default here) a cup tie counts for
 * nothing. A match without a score and a match that isn't played count for nothing. A match
 * that was postponed stands where it was played (see `leagueResultsOf`).
 */
export function streaksOf(matches: PublicMatch[], choice: CompetitionChoice = 'league'): Streaks {
  const played = playedMatchesOf(matches, choice)

  return {
    last: played.slice(-lastCount).map((match) => ({ match, result: resultOf(match) })),
    played: played.length,
    streaks: streakConditions.map(({ counts, label }) => {
      let current = 0
      let longest = 0

      for (const match of played) {
        current = counts(match) ? current + 1 : 0
        longest = Math.max(longest, current)
      }

      return { current, label, longest }
    }),
  }
}

/**
 * The quarters of an hour of a match, as the cards of the statistics page and their tables
 * write them. The dash is an en dash.
 */
export const quarterLabels = ['1–15', '16–30', '31–45', '46–60', '61–75', '76–90'] as const

/** A goal of sc Heerenveen and the match it was scored in. */
export type ExtremeGoal = { goal: ScorerGoal; match: PublicMatch }

/** The matches and the goals people remember of a season, and what they are based on. */
export type Extremes = {
  /** The match with the biggest loss, or undefined without a loss. */
  biggestLoss: PublicMatch | undefined
  /** The match with the biggest win, or undefined without a win. */
  biggestWin: PublicMatch | undefined
  /** Our earliest goal, with the stoppage time added to the minute. */
  earliestGoal: ExtremeGoal | undefined
  /** The played matches whose goals are known, so the ones the two goals come from. */
  known: number
  /** Our last goal, up to and with the stoppage time of minute 90. */
  latestGoal: ExtremeGoal | undefined
  /** The match with the most goals of both clubs together. */
  mostGoals: PublicMatch | undefined
  /** The played matches with a score that the choice counts. */
  played: number
}

/** The results of the matches in a row of a table, such as "we score first". */
export type FlowRow = {
  drawn: number
  lost: number
  /** The matches in the row. */
  matches: number
  /** Three for a win and one for a draw. */
  points: number
  won: number
}

/** The goals of a season per quarter of an hour, and the matches the count is based on. */
export type GoalsPerQuarter = {
  /** The goals against, in the order of `quarterLabels`. */
  conceded: number[]
  /** Whether one of the matches in the count went to extra time, whose goals are left out. */
  extraTime: boolean
  /** The played matches whose goals are known, so the ones in the count. */
  known: number
  /** The played matches, with or without known goals. */
  played: number
  /** The goals of sc Heerenveen, in the order of `quarterLabels`. */
  scored: number[]
}

export type HomeAway = {
  away: HomeAwayTally
  home: HomeAwayTally
  /**
   * Whether every counted match is a match of the Eredivisie. Only then are the points the
   * points of the table: a cup tie gives none.
   */
  leagueOnly: boolean
  /** The home and away matches together, which is what the card of the season counts. */
  total: HomeAwayTally
}

/** What sc Heerenveen did at home, away or in both, in the played matches that are counted. */
export type HomeAwayTally = {
  /** The matches with no goal against. */
  cleanSheets: number
  drawn: number
  goalsAgainst: number
  goalsFor: number
  /** The goals scored per match, or undefined when there is no match. */
  goalsPerMatch: number | undefined
  lost: number
  played: number
  /** The points: 3 for a win and 1 for a draw. */
  points: number
  /** The points per match, or undefined when there is no match. */
  pointsPerMatch: number | undefined
  won: number
}

/** The five things the card of our place in the league ranks sc Heerenveen on. */
export type LeagueMeasure = 'goalDifference' | 'goalsAgainst' | 'goalsFor' | 'pointsPerMatch' | 'won'

/** The place of sc Heerenveen on one measure. */
export type LeagueMeasurePlace = {
  measure: LeagueMeasure
  /** The place, from 1. Clubs with the same value share it. */
  place: number
  /** Whether another club has the same value, so the place is shared. */
  shared: boolean
  /** The value of sc Heerenveen: the points per match, or the number of matches or goals. */
  value: number
}

/** A club of the table next to sc Heerenveen: the leader or the last. */
export type LeagueNeighbour = {
  club: string
  /** The points sc Heerenveen is behind the leader, or ahead of the last: 0 when level. */
  points: number
}

/** Our place in the league on five measures, and the points to the leader and the last. */
export type LeaguePlace = {
  /** The last, or undefined when sc Heerenveen is the last or the only club that played. */
  last: LeagueNeighbour | undefined
  /** The leader, or undefined when sc Heerenveen is the leader or the only club that played. */
  leader: LeagueNeighbour | undefined
  /** In the order of the card. */
  measures: LeagueMeasurePlace[]
  /** The matches sc Heerenveen played, which the card says it is based on. */
  played: number
}

/** How the matches of the league went: after the first goal and at half-time. */
export type MatchFlow = {
  /** The matches by the state at half-time, with goals up to 45 and its stoppage time. */
  atHalfTime: { ahead: FlowRow; behind: FlowRow; level: FlowRow }
  /** The matches by who scored first. A 0-0, or a first goal that is unknown, is in neither. */
  firstGoal: { opponent: FlowRow; ours: FlowRow }
  /** The played league matches whose goals are known, so the ones in the count. */
  known: number
  /** The matches that sc Heerenveen did not win after it led at some moment. */
  notWonAfterLead: number
  /** The played league matches, with or without known goals. */
  played: number
  /** The matches in the count whose first goal is unknown: both clubs scored in one minute. */
  unknownFirstGoal: number
  /** The matches that sc Heerenveen won after it trailed at some moment. */
  wonAfterTrailing: number
}

/** A goal as the line of the scorers of a match shows it. */
export type ScorerGoal = PublicMatch['goals'][number]

/** A played match whose score and goals are known, so one that the cards can count. */
type MatchWithGoals = PublicMatch & { goalsAgainst: number; goalsFor: number }

/**
 * The extremes of the Eredivisie this season, from the played matches with a score: the biggest
 * win (the biggest difference in our favour), the biggest loss, and the match with the most
 * goals. They come from the score and so count every played match. Our earliest and our last
 * goal come from the goals, so they count only the matches whose goals are known, as
 * `goalsPerQuarter` does, and leave out a goal in extra time and one without a minute (0). An
 * own goal of an opponent is a goal of ours, because `ours` says who profits. When two matches
 * are level, the one played last wins, as the matches are in the order they were played; of two
 * goals at the same minute, the later one in the list. A win needs a difference in our favour,
 * and a loss one against us, so a season of draws has neither. The cup is left out, unless the
 * choice is `all`: then a cup tie counts on its score after extra time.
 */
export function extremesOf(matches: PublicMatch[], choice: CompetitionChoice = 'league'): Extremes {
  const played = playedMatchesOf(matches, choice)
  const known = played.filter(hasKnownGoals)
  const difference = (match: PublicMatch) => (match.goalsFor ?? 0) - (match.goalsAgainst ?? 0)
  const total = (match: PublicMatch) => (match.goalsFor ?? 0) + (match.goalsAgainst ?? 0)
  const goals = known.flatMap((match) =>
    match.goals
      .filter((goal) => goal.ours && goal.minute >= 1 && goal.minute <= 90)
      .map((goal): ExtremeGoal => ({ goal, match })),
  )
  const minuteOf = ({ goal }: ExtremeGoal) => goal.minute + (goal.stoppageMinutes ?? 0)
  const biggestWin = best(played, difference)
  const biggestLoss = best(played, (match) => -difference(match))

  return {
    biggestLoss: biggestLoss !== undefined && difference(biggestLoss) < 0 ? biggestLoss : undefined,
    biggestWin: biggestWin !== undefined && difference(biggestWin) > 0 ? biggestWin : undefined,
    earliestGoal: best(goals, (item) => -minuteOf(item)),
    known: known.length,
    latestGoal: best(goals, minuteOf),
    mostGoals: best(played, total),
    played: played.length,
  }
}

/**
 * The goals of sc Heerenveen and of its opponents per quarter of an hour, in the played matches
 * of the season whose goals are known, in the league and, for the choice `all`, the cup. A goal
 * in stoppage time counts in the quarter before it: 45+1 is minute 45 and 90+3 is minute 90. A
 * goal after minute 90 is in extra time and is left out, and so is a minute that can't be
 * played (0). A goal counts for the club that profits, as `ours` says, so an own goal is a goal
 * of the other club. A match counts when it has at least one goal, or when it ended 0-0: a
 * match with a score and no goals is one where the page named no scorers, or where they did not
 * fit the result, and it is left out. A match that is not played, or has no score, is left out
 * too.
 */
export function goalsPerQuarter(matches: PublicMatch[], choice: CompetitionChoice = 'all'): GoalsPerQuarter {
  const played = matches.filter((match) => countsFor(match, choice) && match.status === 'played')
  const known = played.filter(hasKnownGoals)
  const scored = quarterLabels.map(() => 0)
  const conceded = quarterLabels.map(() => 0)

  for (const goal of known.flatMap((match) => match.goals)) {
    if (goal.minute < 1 || goal.minute > 90) {
      continue
    }

    const counts = goal.ours ? scored : conceded
    const quarter = Math.ceil(goal.minute / 15) - 1

    counts[quarter] = (counts[quarter] ?? 0) + 1
  }

  return {
    conceded,
    extraTime: known.some((match) => match.extraTime),
    known: known.length,
    played: played.length,
    scored,
  }
}

/**
 * Whether a played match has its goals: it has at least one goal, or it ended 0-0. A match with
 * a score and no goals is one where the page named no scorers, or where they did not fit the
 * result, and it has no minutes to count. A match without a score has none either.
 */
function hasKnownGoals(match: PublicMatch): match is MatchWithGoals {
  return (
    match.goalsFor !== null &&
    match.goalsAgainst !== null &&
    (match.goals.length > 0 || match.goalsFor + match.goalsAgainst === 0)
  )
}

const emptyRow = (): FlowRow => ({ drawn: 0, lost: 0, matches: 0, points: 0, won: 0 })

/**
 * The goals of one match for the line of the scorers, which shows the name as the page writes
 * it, mostly a surname. When two different players in the line have the same name, each gets
 * the first letter of his given name before it, as in `J. Trenskow`, so nobody sees one name
 * twice without a difference. When their initials are the same too, they get the whole given
 * name (`Jakob Trenskow` and `Jan Trenskow`). Two goals of one player never change, and a goal
 * without a player in the table is left alone: there is nothing to tell it from.
 */
export function goalsWithInitials(goals: ScorerGoal[]): ScorerGoal[] {
  const players = new Map<string, Map<number, NameParts>>()

  for (const goal of goals) {
    if (goal.playerId !== null && goal.playerName !== null) {
      const same = players.get(goal.player) ?? new Map<number, NameParts>()

      players.set(goal.player, same.set(goal.playerId, splitPlayerName(goal.playerName, goal.playerSearchTerm ?? '')))
    }
  }

  return goals.map((goal) => {
    const same = players.get(goal.player)
    const parts = goal.playerId === null ? undefined : same?.get(goal.playerId)
    const given = parts?.givenName?.trim() ?? ''

    if (same === undefined || same.size < 2 || parts === undefined || parts.surname === '' || given === '') {
      return goal
    }

    const initial = given.charAt(0).toUpperCase()
    const sharesInitial = [...same.values()]
      .filter((other) => other !== parts)
      .some((other) => (other.givenName?.trim().charAt(0).toUpperCase() ?? '') === initial)

    return { ...goal, player: sharesInitial ? `${given} ${goal.player}` : `${initial}. ${goal.player}` }
  })
}

/**
 * The played matches with a score, counted for home, away and both: those of the Eredivisie
 * for the choice `league` (the default here), and those of the cup as well for `all`. Every
 * number comes from the score, not from the goals per player, so each played match counts. A
 * match that isn't played and a match with no score count for nothing. The points are those of
 * the card of the season: 3 for a win, 1 for a draw. The cup gives no points, so `leagueOnly`
 * says whether they are the points of the table.
 */
export function homeAwayOf(matches: PublicMatch[], choice: CompetitionChoice = 'league'): HomeAway {
  const played = playedMatchesOf(matches, choice)
  const tally = (selection: PublicMatch[]): HomeAwayTally => {
    const won = selection.filter((match) => (match.goalsFor ?? 0) > (match.goalsAgainst ?? 0)).length
    const drawn = selection.filter((match) => match.goalsFor === match.goalsAgainst).length
    const goalsFor = selection.reduce((sum, match) => sum + (match.goalsFor ?? 0), 0)
    const points = won * 3 + drawn

    return {
      cleanSheets: selection.filter((match) => match.goalsAgainst === 0).length,
      drawn,
      goalsAgainst: selection.reduce((sum, match) => sum + (match.goalsAgainst ?? 0), 0),
      goalsFor,
      goalsPerMatch: selection.length === 0 ? undefined : goalsFor / selection.length,
      lost: selection.length - won - drawn,
      played: selection.length,
      points,
      pointsPerMatch: selection.length === 0 ? undefined : points / selection.length,
      won,
    }
  }

  return {
    away: tally(played.filter((match) => !match.home)),
    home: tally(played.filter((match) => match.home)),
    leagueOnly: played.every((match) => match.competition === 'Eredivisie'),
    total: tally(played),
  }
}

/**
 * Where sc Heerenveen stands among the clubs of the table on points per match, matches won,
 * goals for (the best attack), goals against (the best defence, so fewer is better) and goal
 * difference. Clubs have not all played the same number of matches, so the points are compared
 * per match, and exactly: two clubs are level when their points and matches are in the same
 * ratio. Clubs with the same value share the place and the next place is skipped (1, 2, 2, 4).
 * A club that has played nothing counts for nothing, so it is neither a club to be ahead of nor
 * the last. The leader and the last are the clubs with the most and the fewest points, and the
 * place in the table decides between clubs with the same points, so the gap is never negative.
 * Without sc Heerenveen in the table, or when it has played nothing, there is no place.
 */
export function leaguePlaceOf(rows: PublicStandingsRow[]): LeaguePlace | undefined {
  const clubs = rows.filter((row) => row.played > 0)
  const ours = clubs.find((row) => row.club === ourClub)

  if (ours === undefined) {
    return undefined
  }

  // Better is higher, except for the goals against. The points per match are compared as
  // fractions (points × matches of the other), so there is no rounding to make clubs level.
  const compare: Record<LeagueMeasure, (a: PublicStandingsRow, b: PublicStandingsRow) => number> = {
    goalDifference: (a, b) => a.goalDifference - b.goalDifference,
    goalsAgainst: (a, b) => b.goalsAgainst - a.goalsAgainst,
    goalsFor: (a, b) => a.goalsFor - b.goalsFor,
    pointsPerMatch: (a, b) => a.points * b.played - b.points * a.played,
    won: (a, b) => a.won - b.won,
  }
  const values: Record<LeagueMeasure, number> = {
    goalDifference: ours.goalDifference,
    goalsAgainst: ours.goalsAgainst,
    goalsFor: ours.goalsFor,
    pointsPerMatch: ours.points / ours.played,
    won: ours.won,
  }
  const measures = (['pointsPerMatch', 'won', 'goalsFor', 'goalsAgainst', 'goalDifference'] as const).map(
    (measure): LeagueMeasurePlace => {
      const others = clubs.filter((row) => row !== ours)

      return {
        measure,
        place: 1 + others.filter((row) => compare[measure](row, ours) > 0).length,
        shared: others.some((row) => compare[measure](row, ours) === 0),
        value: values[measure],
      }
    },
  )
  const byPoints = [...clubs].sort((a, b) => b.points - a.points || a.position - b.position)
  const leader = byPoints[0]
  const last = byPoints.at(-1)

  return {
    last: last === undefined || last === ours ? undefined : { club: last.club, points: ours.points - last.points },
    leader:
      leader === undefined || leader === ours ? undefined : { club: leader.club, points: leader.points - ours.points },
    measures,
    played: ours.played,
  }
}

/**
 * How the played matches of the Eredivisie went whose goals are known (the rule of
 * `goalsPerQuarter`), by who scored first and by the state at half-time. The result is the
 * score of the match, as the Eredivisie has no extra time. The cup does not count.
 *
 * Who scored first comes from the minutes. If the first goals fall in one minute and both clubs
 * scored in it, the order is unknown, and the match is left out of the first goal (it still
 * counts for half-time). Two goals of one club in the first minute are no problem. A match that
 * ended 0-0 has no first goal. At half-time a goal in minute 45 or in its stoppage time counts,
 * and a goal from minute 46 does not.
 *
 * A match counts as won after trailing, or as not won after leading, only when the goals say
 * the club trailed or led at a moment that does not depend on the order in a minute. Looking at
 * the score after each minute is enough for that: the other order within a minute can only make
 * the score pass through other values in between, never take away one after the whole minute.
 */
export function matchFlowOf(matches: PublicMatch[]): MatchFlow {
  const played = matches.filter((match) => match.competition === 'Eredivisie' && match.status === 'played')
  const known = played.filter(hasKnownGoals)
  const flow: MatchFlow = {
    atHalfTime: { ahead: emptyRow(), behind: emptyRow(), level: emptyRow() },
    firstGoal: { opponent: emptyRow(), ours: emptyRow() },
    known: known.length,
    notWonAfterLead: 0,
    played: played.length,
    unknownFirstGoal: 0,
    wonAfterTrailing: 0,
  }

  for (const match of known) {
    const { goalsAgainst, goalsFor } = match
    const groups = goalGroups(match.goals)
    const [first] = groups
    let lead = 0
    let led = false
    let trailed = false

    for (const group of groups) {
      lead += group.reduce((sum, goal) => sum + (goal.ours ? 1 : -1), 0)
      led ||= lead > 0
      trailed ||= lead < 0
    }

    if (first !== undefined) {
      const ours = first.filter((goal) => goal.ours).length

      if (ours === first.length) {
        addToRow(flow.firstGoal.ours, goalsFor, goalsAgainst)
      } else if (ours === 0) {
        addToRow(flow.firstGoal.opponent, goalsFor, goalsAgainst)
      } else {
        flow.unknownFirstGoal += 1
      }
    }

    const atHalfTime = match.goals
      .filter((goal) => goal.minute <= 45)
      .reduce((sum, goal) => sum + (goal.ours ? 1 : -1), 0)

    addToRow(
      atHalfTime > 0 ? flow.atHalfTime.ahead : atHalfTime < 0 ? flow.atHalfTime.behind : flow.atHalfTime.level,
      goalsFor,
      goalsAgainst,
    )

    if (trailed && goalsFor > goalsAgainst) {
      flow.wonAfterTrailing += 1
    }
    if (led && goalsFor <= goalsAgainst) {
      flow.notWonAfterLead += 1
    }
  }

  return flow
}

/**
 * Splits the matches of a season, in the order the query gives them, into the programme, the
 * results, and the previous and the next match the homepage shows (see `MatchOverview`). A
 * match has begun when its kick-off is past, or, without a kick-off, when its day in Dutch time
 * is over. A match that is called off with no new date has no place in time and stays in the
 * programme. `now` is the moment of the visit.
 */
export function overviewOf(matches: PublicMatch[], now: Date): MatchOverview {
  const programme = matches.filter((match) => !hasBegun(match, now))
  const results = matches.filter((match) => hasBegun(match, now)).reverse()

  return {
    next: programme.find((match) => match.status !== 'postponed'),
    previous: results[0],
    programme,
    results,
  }
}

/**
 * The results of a page in the order its card shows them. The current season has the newest
 * first, because the latest news matters most there. A season that is over is read from its
 * first match to its last, so the oldest comes first. The order follows the season, not the
 * page, and `results` come newest first, as `overviewOf` gives them. `now` is the moment of the
 * visit.
 */
export function resultsOfSeason(results: PublicMatch[], season: string, now: Date) {
  return season === seasonOf(now) ? results : [...results].reverse()
}

/** How long after the kick-off a result may take: later than this we say it isn't there yet. */
const waitForResult = 2 * 60 * 60 * 1000

const dutchDayFormat = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Amsterdam',
  year: 'numeric',
})

/**
 * Whether the page should say that the result isn't there yet: the match has no result, and
 * two hours have passed since its kick-off (without a kick-off, its day is over). Within the
 * two hours it is still being played, and the line only shows the time.
 */
export function lacksResult(match: PublicMatch, now: Date) {
  if (match.status === 'played' && match.goalsFor !== null && match.goalsAgainst !== null) {
    return false
  }
  if (match.status === 'postponed' || !hasBegun(match, now)) {
    return false
  }

  return match.kickoffAt === null || match.kickoffAt.getTime() + waitForResult <= now.getTime()
}

/**
 * The number of clean sheets that the address asks for with `?nul=`: a whole number from
 * `firstCleanSheets`, in steps of `moreCleanSheets`. Anything else, such as no number, a number
 * twice, `5`, `12`, `0`, `-5`, `1e1`, `010` or `abc`, gives the first ones. A number that is
 * more than there are shows them all, which costs nothing: the matches are already read.
 */
export function parseCleanSheetCount(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,2}$/u.test(value)) {
    return firstCleanSheets
  }

  const count = Number(value)

  return count >= firstCleanSheets && (count - firstCleanSheets) % moreCleanSheets === 0 ? count : firstCleanSheets
}

/**
 * How many played matches have their scorers, for the line under the list of goal scorers. A
 * match is missing when its result has a goal of ours but the page named no scorers (the import
 * leaves them out when they don't fit the result). A match we didn't score in has nothing to
 * miss, so it is complete.
 */
export function scorersCoverage(
  matches: PublicMatch[],
  choice: CompetitionChoice = 'all',
): { known: number; played: number } {
  const played = matches.filter((match) => countsFor(match, choice) && match.status === 'played')
  const missing = played.filter((match) => match.goalsFor !== 0 && match.goals.length === 0)

  return { known: played.length - missing.length, played: played.length }
}

/**
 * Three clubs of the table for the card on the homepage: sc Heerenveen in the middle, with the
 * club above it and the club below it, so the real positions show. At the top or the bottom of
 * the table sc Heerenveen can't be in the middle, so the three are the first or the last three
 * instead. Without sc Heerenveen in the table, or with a table of fewer than three, it is the
 * first three.
 */
export function standingsAround(rows: PublicStandingsRow[]): PublicStandingsRow[] {
  const index = rows.findIndex((row) => row.club === ourClub)
  const start = index === -1 ? 0 : Math.min(Math.max(index - 1, 0), Math.max(rows.length - 3, 0))

  return rows.slice(start, start + 3)
}

/**
 * The goals of sc Heerenveen per player in the matches of a season (the Eredivisie and the cup,
 * or the Eredivisie alone for the choice `league`), for everybody who scored,
 * from the most goals down and from A to Z on the surname when level. Level players share a
 * place (1, 2, 2, 4). A penalty counts. An own goal does not: with `ours` it is the goal of an
 * opponent who scored for us by mistake, and without `ours` it is a player of ours who scored
 * for the opponent, so neither is a goal of the player. A goal of the opponent is not counted
 * either, even for a player with the same name.
 *
 * A goal that is linked to a player counts for that player, by his `id`, so two players with
 * the same surname are two rows, and a player who has left the squad still has his goals.
 * A goal with no player in the table counts for the title of the player's Wikipedia page, which
 * is also his full name (see `splitPageName`), and for the player it is linked to in another
 * goal with the same page. Without a page it counts for its name as the match page shows it,
 * as a row of its own, so no goal is lost.
 */
export function topScorersOf(matches: PublicMatch[], choice: CompetitionChoice = 'all'): TopScorer[] {
  const scorers = new Map<string, Omit<TopScorer, 'position'>>()
  const goals = matches
    .filter((match) => countsFor(match, choice))
    .flatMap((match) => match.goals)
    .filter((goal) => goal.ours && !goal.ownGoal)
  const linked = new Map<string, ScorerGoal>()

  for (const goal of goals) {
    if (goal.playerId !== null && goal.playerPage !== null && !linked.has(goal.playerPage)) {
      linked.set(goal.playerPage, goal)
    }
  }

  for (const own of goals) {
    // A goal without a player counts for the linked player whose page it has, if there is one.
    const goal = (own.playerId === null && own.playerPage !== null ? linked.get(own.playerPage) : undefined) ?? own
    const before = scorers.get(keyOf(goal))

    scorers.set(keyOf(goal), {
      goals: (before?.goals ?? 0) + 1,
      id: goal.playerId ?? goal.playerPage ?? goal.player,
      player: goal.playerName ?? (goal.playerPage === null ? goal.player : pageTitleName(goal.playerPage)),
      ...scorerName(goal),
    })
  }

  const sorted = [...scorers.values()].sort(
    (a, b) =>
      b.goals - a.goals ||
      sortName(a).localeCompare(sortName(b), 'nl') ||
      (a.givenName ?? '').localeCompare(b.givenName ?? '', 'nl'),
  )

  return sorted.map((scorer) => ({
    ...scorer,
    position: sorted.findIndex((other) => other.goals === scorer.goals) + 1,
  }))
}

/** How many places the short list of the goal scorers has. */
export const topScorersPlaces = 5

/**
 * The first places of the list of scorers: everyone who stands in the first five places.
 * Players who share a place all show, so a tie for fifth place gives more than five names, and
 * a tie that starts before it (three players in fourth place) keeps all of them. The list is
 * in the order of `topScorersOf`, so these are its first rows.
 */
export const topFiveOf = (scorers: TopScorer[]): TopScorer[] =>
  scorers.filter((scorer) => scorer.position <= topScorersPlaces)

/** A player who scored three or more goals in a match, or two, and how often it happened. */
export type MultiGoalScorer = NameParts & {
  /** What tells the player from the others, as in `TopScorer`. */
  id: number | string
  player: string
  /** The number of matches in which the player did it. */
  times: number
}

/** The goals that stand out, for the card Bijzondere doelpunten. */
export type SpecialGoals = {
  /** The players with two goals in a match, and not three, the most often first. */
  doubles: MultiGoalScorer[]
  /** The goals of sc Heerenveen in the counted matches, own goals of opponents included. */
  goalsFor: number
  /** The players with three or more goals in a match, the most often first. */
  hattricks: MultiGoalScorer[]
  /** The counted matches: played, and with their goals known. */
  known: number
  /** The own goals of players of ours, which are goals for the opponent. */
  ownGoalsAgainst: number
  /** The own goals of players of the opponent, which are goals for us. */
  ownGoalsFor: number
  /** The goals of sc Heerenveen from a penalty. */
  penalties: number
  /** The played matches of the choice, counted or not. */
  played: number
}

/**
 * The goals that stand out in the played matches of the season whose goals are known (as for
 * `goalsPerQuarter`: a match with a score and no goals is left out), in the league and, for the
 * choice `all`, the cup. A match counts on its goals, so a goal in extra time counts, and a
 * shoot-out has no goals at all.
 *
 * A hattrick is three or more goals by one player in one match, a double (a "dubbelslag") is
 * exactly two. A player who scored a hattrick in a match is not also in the doubles of that
 * match, but another match can give him a double. A penalty counts as a goal of the player; an
 * own goal does not, for anybody. A goal without a minute (0) is still a goal. Players are told
 * apart as in `topScorersOf`: by id, else by Wikipedia page, else by name, and a goal that has
 * only a page counts for the linked player with the same page.
 *
 * The penalties are the goals of sc Heerenveen that came from a penalty, out of all the goals
 * of sc Heerenveen: the goals of the opponent are not counted, and neither are their penalties.
 * An own goal is counted on the side that profits, as `ours` says, so `ownGoalsFor` is the
 * number of times an opponent scored in his own goal and `ownGoalsAgainst` the number of times
 * a player of ours did.
 */
export function specialGoalsOf(matches: PublicMatch[], choice: CompetitionChoice = 'all'): SpecialGoals {
  const counted = matches.filter((match) => countsFor(match, choice) && match.status === 'played')
  const known = counted.filter(hasKnownGoals)
  const goals = known.flatMap((match) => match.goals)
  const linked = new Map<string, ScorerGoal>()

  for (const goal of goals) {
    if (
      goal.ours &&
      !goal.ownGoal &&
      goal.playerId !== null &&
      goal.playerPage !== null &&
      !linked.has(goal.playerPage)
    ) {
      linked.set(goal.playerPage, goal)
    }
  }

  const hattricks = new Map<string, MultiGoalScorer>()
  const doubles = new Map<string, MultiGoalScorer>()

  for (const match of known) {
    const perPlayer = new Map<string, { goals: number; scorer: ScorerGoal }>()

    for (const own of match.goals.filter((goal) => goal.ours && !goal.ownGoal)) {
      const goal = (own.playerId === null && own.playerPage !== null ? linked.get(own.playerPage) : undefined) ?? own
      const before = perPlayer.get(keyOf(goal))

      perPlayer.set(keyOf(goal), { goals: (before?.goals ?? 0) + 1, scorer: goal })
    }

    for (const [key, { goals: count, scorer }] of perPlayer) {
      const target = count >= 3 ? hattricks : count === 2 ? doubles : undefined

      target?.set(key, {
        id: scorer.playerId ?? scorer.playerPage ?? scorer.player,
        player: scorer.playerName ?? (scorer.playerPage === null ? scorer.player : pageTitleName(scorer.playerPage)),
        times: (target.get(key)?.times ?? 0) + 1,
        ...scorerName(scorer),
      })
    }
  }

  const inOrder = (players: Map<string, MultiGoalScorer>) =>
    [...players.values()].sort(
      (a, b) =>
        b.times - a.times ||
        sortName(a).localeCompare(sortName(b), 'nl') ||
        (a.givenName ?? '').localeCompare(b.givenName ?? '', 'nl'),
    )

  return {
    doubles: inOrder(doubles),
    goalsFor: goals.filter((goal) => goal.ours).length,
    hattricks: inOrder(hattricks),
    known: known.length,
    ownGoalsAgainst: goals.filter((goal) => !goal.ours && goal.ownGoal).length,
    ownGoalsFor: goals.filter((goal) => goal.ours && goal.ownGoal).length,
    penalties: goals.filter((goal) => goal.ours && goal.penalty).length,
    played: counted.length,
  }
}

function addToRow(row: FlowRow, goalsFor: number, goalsAgainst: number) {
  row.matches += 1

  if (goalsFor > goalsAgainst) {
    row.won += 1
    row.points += 3
  } else if (goalsFor === goalsAgainst) {
    row.drawn += 1
    row.points += 1
  } else {
    row.lost += 1
  }
}

/** The item with the highest score, and the last of them when some are level. */
function best<T>(items: T[], score: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>(
    (top, item) => (top === undefined || score(item) >= score(top) ? item : top),
    undefined,
  )
}

/**
 * The goals of a match in the order of the clock, in groups of goals in the same minute. The
 * order of the goals in the data is the order of the Wikipedia page, with the goals of the home
 * club and the away club in separate fields, so it is not the order of the play. A goal in the
 * stoppage time of a half is after one in the minute itself (45 is before 45+1). Goals in one
 * group have no known order between them.
 */
function goalGroups(goals: ScorerGoal[]): ScorerGoal[][] {
  const clock = (goal: ScorerGoal) => [goal.minute, goal.stoppageMinutes ?? 0] as const
  const sorted = [...goals].sort((a, b) => clock(a)[0] - clock(b)[0] || clock(a)[1] - clock(b)[1])
  const groups: ScorerGoal[][] = []

  for (const goal of sorted) {
    const last = groups.at(-1)

    if (last?.[0] !== undefined && clock(last[0]).join() === clock(goal).join()) {
      last.push(goal)
    } else {
      groups.push([goal])
    }
  }

  return groups
}

/**
 * Whether a match has begun at `now`: its kick-off is past, or, without a kick-off, its day in
 * Dutch time is over (it counts as not begun until the end of that day, and a weekend until the
 * end of its last day). A match that is played
 * has begun whatever the clock says, and one that is called off with no new date never has.
 */
function hasBegun(match: PublicMatch, now: Date) {
  if (match.status === 'played') {
    return true
  }
  if (match.status === 'postponed') {
    return false
  }

  return match.kickoffAt === null
    ? dutchDayFormat.format(now) > lastDayOf(match.dateText, match.matchDate)
    : match.kickoffAt <= now
}

/**
 * What a goal counts for: the player it is linked to, else the Wikipedia page of its player, or
 * else the name the page shows.
 */
function keyOf(goal: ScorerGoal): string {
  if (goal.playerId !== null) {
    return `id:${goal.playerId}`
  }

  return goal.playerPage === null ? `name:${goal.player}` : `page:${goal.playerPage}`
}

/** The parts of the name of a scorer, from the best name the goal has. */
function scorerName(goal: ScorerGoal): NameParts {
  if (goal.playerName !== null) {
    return splitPlayerName(goal.playerName, goal.playerSearchTerm ?? '')
  }

  return goal.playerPage === null ? surnameOnly(goal.player) : splitPageName(goal.player, goal.playerPage)
}

/** What a list of scorers is put in order by: the surname, or the whole name without one. */
function sortName(scorer: NameParts): string {
  return scorer.surname === '' ? (scorer.givenName ?? '') : scorer.surname
}
