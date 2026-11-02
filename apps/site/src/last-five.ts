import type { PublicLeagueResult, PublicMatch, PublicStandingsRow } from '@fansite/db/queries'

/** The name of our own club in the table and in the results. */
const ourClub = 'sc Heerenveen'

/** How many of the latest matches of a club the table counts. */
const matchesCounted = 5

/** A row of the table over the latest matches, with the figures the order is decided on. */
export type LastFiveRow = {
  club: string
  goalDifference: number
  goalsFor: number
  /** The matches counted: five, or fewer when the club has played fewer. */
  played: number
  points: number
  /** The place, from 1, with no shared places. */
  position: number
}

/** The number at the end of a round as the matches have it, such as 12 for `Speelronde 12`. */
const roundNumberOf = (round: string) => Number(/(\d+)\s*$/u.exec(round)?.[1] ?? 0)

/** The table over the latest five matches, and the day of the last result it is based on. */
export type LastFive = { lastResultOn: string; rows: LastFiveRow[] }

type Tally = { goalsAgainst: number; goalsFor: number; points: number }

/**
 * Whether the results are complete enough to count the latest matches of every club: the table
 * has clubs and a played match, there are results, every club has the results the table says it
 * played or one fewer, and no result is of a club the table does not have. The pages of
 * Wikipedia are edited apart from each other, so the results can be a day or a round behind the
 * table; more than one behind, a result more than the table has and a season that was not
 * imported again all fail this.
 */
export function hasEnoughLeagueResults(standings: PublicStandingsRow[], results: PublicLeagueResult[]) {
  if (results.length === 0 || !standings.some((row) => row.played > 0)) {
    return false
  }

  const counts = new Map<string, number>()

  for (const { awayClub, homeClub } of results) {
    counts.set(homeClub, (counts.get(homeClub) ?? 0) + 1)
    counts.set(awayClub, (counts.get(awayClub) ?? 0) + 1)
  }

  const clubs = new Set(standings.map((row) => row.club))

  return (
    [...counts.keys()].every((club) => clubs.has(club)) &&
    standings.every((row) => {
      const behind = row.played - (counts.get(row.club) ?? 0)

      return behind === 0 || behind === 1
    })
  )
}

/**
 * The table over the latest five matches of the season with the day of the last result, or
 * undefined when the results of the clubs are not complete enough (see
 * `hasEnoughLeagueResults`). The clubs are those of the table of the season, and the matches of
 * sc Heerenveen are the ones the editors may have entered.
 */
export function lastFiveOf(
  matches: PublicMatch[],
  results: PublicLeagueResult[],
  standings: PublicStandingsRow[],
): LastFive | undefined {
  if (!hasEnoughLeagueResults(standings, results)) {
    return undefined
  }

  const all = leagueResultsOfAllClubs(matches, results)

  if (all.length === 0) {
    return undefined
  }

  const lastResultOn = all.map((result) => result.playedOn).reduce((a, b) => (b > a ? b : a))

  return {
    lastResultOn,
    rows: lastFiveStandings(
      standings.map((row) => row.club),
      all,
    ),
  }
}

/**
 * The table over the latest five matches of the league of each club in `clubs`: the five that
 * were played last, by day and for the same day by round. A club that played fewer counts what
 * it has, and a club with no match has no points and no goals. Three points for a win, one for
 * a draw. The order is points, goal difference, goals for, then the name from A to Z, and the
 * places run from 1 with none shared.
 */
export function lastFiveStandings(clubs: string[], results: PublicLeagueResult[]): LastFiveRow[] {
  const ordered = [...results].sort((a, b) => a.playedOn.localeCompare(b.playedOn) || a.round - b.round)
  const rows = clubs.map((club) => {
    const latest = ordered
      .filter((result) => result.homeClub === club || result.awayClub === club)
      .slice(-matchesCounted)
    const tally = latest.reduce<Tally>(
      (sum, result) => {
        const home = result.homeClub === club
        const goalsFor = home ? result.homeGoals : result.awayGoals
        const goalsAgainst = home ? result.awayGoals : result.homeGoals

        return {
          goalsAgainst: sum.goalsAgainst + goalsAgainst,
          goalsFor: sum.goalsFor + goalsFor,
          points: sum.points + (goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0),
        }
      },
      { goalsAgainst: 0, goalsFor: 0, points: 0 },
    )

    return {
      club,
      goalDifference: tally.goalsFor - tally.goalsAgainst,
      goalsFor: tally.goalsFor,
      played: latest.length,
      points: tally.points,
    }
  })

  return rows
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.club.localeCompare(b.club, 'nl'),
    )
    .map((row, index) => ({ ...row, position: index + 1 }))
}

/**
 * The results of the league for every club, with the matches of sc Heerenveen from `matches`
 * and not from the results of the import: what the editors entered counts. The results of the
 * other clubs are the import's. The opponent is written as the table writes it, which is how
 * the results have it: a match is the same match as the result of its round that has sc
 * Heerenveen in it (a club plays once a round, and a postponed match keeps its round), so
 * `Excelsior` in the match is `Excelsior Rotterdam` here. A match with no result for its round
 * keeps the name the match has.
 */
export function leagueResultsOfAllClubs(matches: PublicMatch[], results: PublicLeagueResult[]): PublicLeagueResult[] {
  const involvesUs = (result: PublicLeagueResult) => result.homeClub === ourClub || result.awayClub === ourClub
  const ofRound = new Map(results.filter(involvesUs).map((result) => [result.round, result]))
  const ours = matches.flatMap((match): PublicLeagueResult[] => {
    if (
      match.competition !== 'Eredivisie' ||
      match.status !== 'played' ||
      match.goalsFor === null ||
      match.goalsAgainst === null
    ) {
      return []
    }

    const round = roundNumberOf(match.round)
    const found = ofRound.get(round)
    const opponent = found === undefined ? match.opponent : found.homeClub === ourClub ? found.awayClub : found.homeClub
    const [homeClub, awayClub] = match.home ? [ourClub, opponent] : [opponent, ourClub]
    const [homeGoals, awayGoals] = match.home
      ? [match.goalsFor, match.goalsAgainst]
      : [match.goalsAgainst, match.goalsFor]

    return [{ awayClub, awayGoals, homeClub, homeGoals, playedOn: match.matchDate, round }]
  })

  return [...results.filter((result) => !involvesUs(result)), ...ours]
}
