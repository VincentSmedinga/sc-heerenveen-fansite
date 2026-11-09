import type { FormResult } from '@fansite/design-system'

import { findPreviousMeeting, type PreviousMeeting, type PublicLeagueResult } from '@fansite/db/queries'

import { cacheForKey } from './cache'
import { getDatabase } from './database'
import { leagueResultsOfAllClubs } from './last-five'
import { getLeagueResults, type MatchData, overviewOf } from './matches'

/** How many of the latest league results the form of the next opponent shows. */
const formLength = 5

/** What the card Wedstrijden on the homepage adds under the clubs of the next match. */
export type UpcomingDetails = {
  /** The last five league results of the opponent, the oldest first; fewer if it has fewer. */
  opponentForm: FormResult[]
  /** The last played match against the opponent at the same ground, if there was one. */
  previousMeeting: PreviousMeeting | undefined
}

/**
 * The last league results of `club`, the oldest first, from the results of every club in the
 * season (see `leagueResultsOfAllClubs`): at most five, as many as it has played, and none for
 * a club with no league result, such as a cup opponent from a lower division. There is no
 * fallback to the season before: the form says how the club does now.
 */
export function opponentFormOf(results: readonly PublicLeagueResult[], club: string): FormResult[] {
  return results
    .filter((result) => result.homeClub === club || result.awayClub === club)
    .toSorted((a, b) => a.playedOn.localeCompare(b.playedOn) || a.round - b.round)
    .slice(-formLength)
    .map((result): FormResult => {
      const [own, other] =
        result.homeClub === club ? [result.homeGoals, result.awayGoals] : [result.awayGoals, result.homeGoals]

      return own > other ? 'W' : own === other ? 'G' : 'V'
    })
}

/**
 * The outcome of a meeting for sc Heerenveen, which is not the home club's: the colour of the
 * result follows it.
 */
export const meetingOutcomeOf = ({ goalsAgainst, goalsFor }: Pick<PreviousMeeting, 'goalsAgainst' | 'goalsFor'>) =>
  goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw'

/**
 * The two goals of a meeting in the order of the clubs on the line, the home club first, so
 * that "2–1" reads the way the clubs are named. `home` is whether sc Heerenveen was at home.
 */
export const meetingScoreOf = (meeting: Pick<PreviousMeeting, 'goalsAgainst' | 'goalsFor'>, home: boolean) =>
  home ? ([meeting.goalsFor, meeting.goalsAgainst] as const) : ([meeting.goalsAgainst, meeting.goalsFor] as const)

const loadMeeting = cacheForKey(60 * 60 * 1000, (key) => {
  const [home, ...opponent] = key.split('|')

  return findPreviousMeeting(getDatabase().db, { home: home === 'home', opponent: opponent.join('|') })
})

/**
 * The details under the next match of the homepage: the form of its opponent and the last
 * meeting at the same ground. Without a next match there are none. The meeting is kept for an
 * hour per opponent and ground, which come from the programme and not from a visitor.
 */
export async function getUpcomingDetails(data: MatchData, now: Date): Promise<UpcomingDetails> {
  const { next } = overviewOf(data.matches, now)

  if (next === undefined) {
    return { opponentForm: [], previousMeeting: undefined }
  }

  const [results, previousMeeting] = await Promise.all([
    getLeagueResults(data.season),
    loadMeeting(`${next.home ? 'home' : 'away'}|${next.opponent}`),
  ])

  return {
    opponentForm: opponentFormOf(leagueResultsOfAllClubs(data.matches, results), next.opponent),
    previousMeeting,
  }
}
