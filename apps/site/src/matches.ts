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
