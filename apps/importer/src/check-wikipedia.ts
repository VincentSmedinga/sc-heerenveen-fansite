// The checks every read of Wikipedia must pass before anything reaches the database. Wikipedia
// is written by volunteers, so a slip or a vandal can change a score, a number in the table or
// the shape of a page. Without a second source, these checks are what stands in the way.
//
// Each check holds at any moment, also in the middle of a round: the clubs have then played a
// different number of matches, so the number of matches played is never compared between clubs.
import { playerPositions } from '@fansite/db/schema'

import type { ReadPlayer } from './read-squad.ts'
import type { ReadMatch, ReadStandingsRow } from './read-wikipedia.ts'

import { nameKey } from './read-squad.ts'

/** The Eredivisie has 18 clubs, who play each other twice. */
export const clubsInLeague = 18

/** sc Heerenveen plays 34 league matches, 17 at home and 17 away. */
export const leagueMatches = 34

/** A squad has this many players at least and at most. */
export const squadSize = { max: 45, min: 18 }

/** A squad has at least this many goalkeepers. */
export const squadGoalkeepers = 2

/** The name Wikipedia gives our club in the table. */
const ourClub = 'sc Heerenveen'

/**
 * Checks the scorers of a played match against its result: the goals of a club are as many as
 * the club has in the score (an own goal counts for the club that benefits). Returns what is
 * wrong, or nothing. A match with no scorers on the page has nothing to check.
 */
export function checkGoals(match: ReadMatch): string | undefined {
  if (match.goalsProblem !== null) {
    return match.goalsProblem
  }
  if (match.goals === null) {
    return undefined
  }

  const ours = match.goals.filter((goal) => goal.ours).length
  const theirs = match.goals.length - ours

  return ours === match.goalsFor && theirs === match.goalsAgainst
    ? undefined
    : `${match.round} (${match.competition}): the scorers are ${ours}-${theirs}, the result is ${match.goalsFor}-${match.goalsAgainst}`
}

/**
 * Checks the matches of sc Heerenveen: 34 in the league, one in each round, 17 at home and 17
 * away; and a cup round at most once. Returns what is wrong, or nothing.
 */
export function checkMatches(matches: ReadMatch[]): string[] {
  const problems: string[] = []
  const league = matches.filter((match) => match.competition === 'Eredivisie')
  const rounds = new Set(league.map((match) => match.round))
  const home = league.filter((match) => match.home).length

  if (league.length !== leagueMatches) {
    problems.push(`the league has ${league.length} matches for ${ourClub}, not ${leagueMatches}`)
  } else if (home !== leagueMatches / 2) {
    problems.push(`the league has ${home} home matches and ${league.length - home} away, not 17 and 17`)
  }
  if (rounds.size !== league.length) {
    problems.push('two league matches are in the same round')
  }
  if (new Set(matches.map((match) => `${match.competition}|${match.round}`)).size !== matches.length) {
    problems.push('two matches are in the same round of the same competition')
  }

  return problems
}

/**
 * Checks the squad: 18 to 45 players, at least two goalkeepers, a player in every position and
 * no name twice (the database keeps names apart as `nameKey` does). Returns what is wrong, or
 * nothing.
 */
export function checkSquad(players: ReadPlayer[]): string[] {
  const problems: string[] = []

  if (players.length < squadSize.min || players.length > squadSize.max) {
    problems.push(`the squad has ${players.length} players, not ${squadSize.min} to ${squadSize.max}`)
  }

  for (const position of playerPositions) {
    const count = players.filter((player) => player.position === position).length

    if (count === 0) {
      problems.push(`the squad has no ${position}`)
    } else if (position === 'doelman' && count < squadGoalkeepers) {
      problems.push(`the squad has ${count} goalkeeper, not at least ${squadGoalkeepers}`)
    }
  }

  const seen = new Set<string>()

  for (const player of players) {
    const key = nameKey(player.name)

    if (seen.has(key)) {
      problems.push(`the name ${player.name} is in the squad twice`)
    }
    seen.add(key)
  }

  return problems
}

/**
 * Checks the league table: 18 clubs, and for each that played = won + drawn + lost, points = 3
 * x won + drawn and goal difference = goals for - goals against. Over the whole table the
 * goals for equal the goals against and the wins equal the losses. The row of sc Heerenveen
 * must agree with the league matches we have of our own: matches played, goals and points.
 */
export function checkStandings(rows: ReadStandingsRow[], matches: ReadMatch[]): string[] {
  const problems: string[] = []

  if (rows.length !== clubsInLeague) {
    problems.push(`the table has ${rows.length} clubs, not ${clubsInLeague}`)
  }

  for (const row of rows) {
    if (row.played !== row.won + row.drawn + row.lost) {
      problems.push(`${row.club}: played is not won + drawn + lost`)
    }
    if (row.points !== 3 * row.won + row.drawn) {
      problems.push(`${row.club}: points are not 3 x won + drawn`)
    }
    if (row.goalDifference !== row.goalsFor - row.goalsAgainst) {
      problems.push(`${row.club}: goal difference is not goals for - goals against`)
    }
  }

  if (sum(rows, (row) => row.goalsFor) !== sum(rows, (row) => row.goalsAgainst)) {
    problems.push('over the table the goals for are not the goals against')
  }
  if (sum(rows, (row) => row.won) !== sum(rows, (row) => row.lost)) {
    problems.push('over the table the wins are not the losses')
  }

  const ours = rows.filter((row) => row.club.toLowerCase() === ourClub.toLowerCase())
  const [row] = ours

  if (row === undefined || ours.length > 1) {
    problems.push(`the table has ${ours.length} rows for ${ourClub}, not 1`)

    return problems
  }

  const played = matches.filter((match) => match.competition === 'Eredivisie' && match.status === 'played')
  const goalsFor = sum(played, (match) => match.goalsFor ?? 0)
  const goalsAgainst = sum(played, (match) => match.goalsAgainst ?? 0)
  const points = sum(played, (match) => pointsOf(match))

  if (
    row.played !== played.length ||
    row.goalsFor !== goalsFor ||
    row.goalsAgainst !== goalsAgainst ||
    row.points !== points
  ) {
    problems.push(
      `the row of ${ourClub} (${row.played} played, ${row.goalsFor}-${row.goalsAgainst}, ${row.points} points) ` +
        `is not what the matches say (${played.length} played, ${goalsFor}-${goalsAgainst}, ${points} points)`,
    )
  }

  return problems
}

/** Three points for a win, one for a draw. */
function pointsOf(match: ReadMatch): number {
  const difference = (match.goalsFor ?? 0) - (match.goalsAgainst ?? 0)

  return difference > 0 ? 3 : difference === 0 ? 1 : 0
}

function sum<T>(list: T[], value: (item: T) => number): number {
  return list.reduce((total, item) => total + value(item), 0)
}
