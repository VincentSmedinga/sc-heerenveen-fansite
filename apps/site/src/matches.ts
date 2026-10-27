import {
  listSeasonMatches,
  listSeasonStandings,
  listWikipediaPages,
  type PublicMatch,
  type PublicStandingsRow,
  type PublicWikipediaPage,
} from '@fansite/db/queries'
import { seasonOf } from '@fansite/db/season'

import { cacheFor } from './cache'
import { getDatabase } from './database'
import { firstCleanSheets, moreCleanSheets } from './items-per-card'
import { type NameParts, splitPlayerName, surnameOnly } from './player-name'

/** The name of our own club in the table. */
const ourClub = 'sc Heerenveen'

export type MatchData = {
  matches: PublicMatch[]
  pages: PublicWikipediaPage[]
  season: string
  standings: PublicStandingsRow[]
}

/**
 * The matches of the current season split the way the pages show them. `programme` is every
 * match that is still to come, in the order they are played, and a match that is called off
 * with no new date stays in it until the importer finds one. `results` is every match that is
 * played, the newest first. `next` is the first match in the programme that has a date, so not
 * one that is called off, and `latest` the newest results.
 */
export type MatchOverview = {
  next: PublicMatch | undefined
  previous: PublicMatch | undefined
  programme: PublicMatch[]
  results: PublicMatch[]
}

/**
 * The matches, the league table and the Wikipedia pages of the current season. Only that season
 * is asked for: the pages show no earlier one, although the database keeps them. The data is
 * cached for five minutes, so a visit doesn't cost three queries and a new result shows within
 * five minutes of the import, which runs every hour.
 */
export const getMatchData = cacheFor(5 * 60 * 1000, async (): Promise<MatchData> => {
  const { db } = getDatabase()
  const season = seasonOf(new Date())
  const [matches, standings, pages] = await Promise.all([
    listSeasonMatches(db, season),
    listSeasonStandings(db, season),
    listWikipediaPages(db, season),
  ])

  return { matches, pages, season, standings }
})

/** The played matches in which sc Heerenveen kept a clean sheet, and how many were played. */
export type CleanSheets = {
  /** The matches with no goal against, the newest first. */
  matches: PublicMatch[]
  /** How many matches were played, with a result. */
  played: number
}

/**
 * A player in the list of goal scorers: the goals this season and the place, from 1. `player`
 * is the full name from the table `players` for a goal that is linked to a player, and the name
 * as the page shows it for a goal without one. `givenName` and `surname` are its parts for
 * `PlayerName`: a linked player is split with his search term (see `splitPlayerName`), and a
 * goal without a player is a surname only. `id` tells the rows apart: the id of the player, or
 * the name for a goal without a player.
 */
export type TopScorer = NameParts & {
  goals: number
  id: number | string
  player: string
  position: number
}

/**
 * The matches of the season in which sc Heerenveen conceded no goal, in the league and the cup,
 * the newest first, and how many matches were played. A match counts on the result of the
 * match, so after extra time on the score after it; a shoot-out is kept apart and never
 * decides this. A match that isn't played, or has no result, counts for neither.
 */
export function cleanSheetsOf(matches: PublicMatch[]): CleanSheets {
  const played = overviewOf(matches).results.filter((match) => match.goalsFor !== null && match.goalsAgainst !== null)

  return { matches: played.filter((match) => match.goalsAgainst === 0), played: played.length }
}

/**
 * The quarters of an hour of a match, as the card of the matches page and its table write them.
 * The dash is an en dash.
 */
export const quarterLabels = ['1–15', '16–30', '31–45', '46–60', '61–75', '76–90'] as const

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

/** A goal as the line of the scorers of a match shows it. */
export type ScorerGoal = PublicMatch['goals'][number]

/**
 * The goals of sc Heerenveen and of its opponents per quarter of an hour, in the played matches
 * of the season whose goals are known, in the league and the cup. A goal in stoppage time
 * counts in the quarter before it: 45+1 is minute 45 and 90+3 is minute 90. A goal after minute
 * 90 is in extra time and is left out, and so is a minute that can't be played (0). A goal
 * counts for the club that profits, as `ours` says, so an own goal is a goal of the other club.
 * A match counts when it has at least one goal, or when it ended 0-0: a match with a score and
 * no goals is one where the page named no scorers, or where they did not fit the result, and it
 * is left out. A match that is not played, or has no score, is left out too.
 */
export function goalsPerQuarter(matches: PublicMatch[]): GoalsPerQuarter {
  const played = matches.filter((match) => match.status === 'played')
  const known = played.filter(
    (match) =>
      match.goalsFor !== null &&
      match.goalsAgainst !== null &&
      (match.goals.length > 0 || match.goalsFor + match.goalsAgainst === 0),
  )
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
 * Splits the matches of a season, in the order the query gives them, into the programme, the
 * results, and the previous and the next match the homepage shows.
 */
export function overviewOf(matches: PublicMatch[]): MatchOverview {
  const programme = matches.filter((match) => match.status !== 'played')
  const results = matches.filter((match) => match.status === 'played').reverse()

  return {
    next: programme.find((match) => match.status === 'scheduled'),
    previous: results[0],
    programme,
    results,
  }
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
export function scorersCoverage(matches: PublicMatch[]): { known: number; played: number } {
  const played = matches.filter((match) => match.status === 'played')
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
 * The goals of sc Heerenveen per player in the matches of a season, for everybody who scored,
 * from the most goals down and from A to Z on the surname when level. Level players share a
 * place (1, 2, 2, 4). A penalty counts. An own goal does not: with `ours` it is the goal of an
 * opponent who scored for us by mistake, and without `ours` it is a player of ours who scored
 * for the opponent, so neither is a goal of the player. A goal of the opponent is not counted
 * either, even for a player with the same name.
 *
 * A goal that is linked to a player counts for that player, by his `id`, so two players with
 * the same surname are two rows, and a player who has left the squad still has his goals.
 * A goal with no player in the table counts for its name as the page shows it, as a row of its
 * own, so no goal is lost: it can be a second row for a player whose other goals are linked.
 */
export function topScorersOf(matches: PublicMatch[]): TopScorer[] {
  const scorers = new Map<string, Omit<TopScorer, 'position'>>()

  for (const goal of matches.flatMap((match) => match.goals)) {
    if (!goal.ours || goal.ownGoal) {
      continue
    }

    const before = scorers.get(keyOf(goal))

    scorers.set(keyOf(goal), {
      goals: (before?.goals ?? 0) + 1,
      id: goal.playerId ?? goal.player,
      player: goal.playerName ?? goal.player,
      ...(goal.playerName === null
        ? surnameOnly(goal.player)
        : splitPlayerName(goal.playerName, goal.playerSearchTerm ?? '')),
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

/** What a goal counts for: the player it is linked to, or else the name the page shows. */
function keyOf(goal: PublicMatch['goals'][number]): string {
  return goal.playerId === null ? `name:${goal.player}` : `id:${goal.playerId}`
}

/** What a list of scorers is put in order by: the surname, or the whole name without one. */
function sortName(scorer: NameParts): string {
  return scorer.surname === '' ? (scorer.givenName ?? '') : scorer.surname
}
