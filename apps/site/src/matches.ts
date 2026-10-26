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

/** A player in the list of top scorers: the goals this season and the place, from 1. */
export type TopScorer = {
  goals: number
  player: string
  position: number
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

/** The most rows the list of top scorers has, even when more are level with the fifth. */
const topScorersMaximum = 8

/** The players the list has at least, and everybody level with the last one joins. */
const topScorersMinimum = 5

/**
 * How many played matches have their scorers, for the line under the list of top scorers. A
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
 * The goals of sc Heerenveen per player in the matches of a season, from the most goals down
 * and from A to Z when level. Level players share a place (1, 2, 2, 4). A penalty counts.
 * An own goal does not: with `ours` it is the goal of an opponent who scored for us by mistake,
 * and without `ours` it is a player of ours who scored for the opponent, so neither is a goal
 * of the player. A goal of the opponent is not counted either, even for a player with the same
 * name. The player is the name as `match_goals` keeps it, so two players with the same name
 * count as one.
 */
export function topScorersOf(matches: PublicMatch[]): TopScorer[] {
  const goals = new Map<string, number>()

  for (const goal of matches.flatMap((match) => match.goals)) {
    if (goal.ours && !goal.ownGoal) {
      goals.set(goal.player, (goals.get(goal.player) ?? 0) + 1)
    }
  }

  const sorted = [...goals]
    .map(([player, count]) => ({ goals: count, player }))
    .sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player, 'nl'))

  return sorted.map((scorer) => ({
    ...scorer,
    position: sorted.findIndex((other) => other.goals === scorer.goals) + 1,
  }))
}

/**
 * The best five scorers, and everybody level with the fifth, up to eight rows. With fewer than
 * five players all of them.
 */
export function topScorersShown(scorers: TopScorer[]): TopScorer[] {
  const fifth = scorers[topScorersMinimum - 1]

  return (fifth === undefined ? scorers : scorers.filter((scorer) => scorer.goals >= fifth.goals)).slice(
    0,
    topScorersMaximum,
  )
}
