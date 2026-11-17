import type { PublicLeagueResult } from '@fansite/db/queries'
import type { FormResult } from '@fansite/design-system'

/** How many of the latest league results the form of a club shows. */
const formLength = 5

/**
 * The form of `club` from the results of every club in the season: its last league
 * results, the oldest first, at most five and as many as it has played, and none for a club
 * with no league result. It adds up what the marks come to: the points (three for a win, one
 * for a draw) and the goals for and against in those matches.
 */
export function formOf(results: readonly PublicLeagueResult[], club: string) {
  const form = { goalsAgainst: 0, goalsFor: 0, marks: [] as FormResult[], points: 0 }

  for (const result of results
    .filter((one) => one.homeClub === club || one.awayClub === club)
    .toSorted((a, b) => a.playedOn.localeCompare(b.playedOn) || a.round - b.round)
    .slice(-formLength)) {
    const [own, other] =
      result.homeClub === club ? [result.homeGoals, result.awayGoals] : [result.awayGoals, result.homeGoals]

    form.goalsFor += own
    form.goalsAgainst += other
    form.marks.push(own > other ? 'W' : own === other ? 'G' : 'V')
    form.points += own > other ? 3 : own === other ? 1 : 0
  }

  return form
}

/**
 * The two goals of a meeting in the order of the clubs on the line, the home club first, so
 * that "2–1" reads the way the clubs are named. `home` is whether sc Heerenveen was at home.
 */
export const meetingScoreOf = (meeting: { goalsAgainst: number; goalsFor: number }, home: boolean) =>
  home ? ([meeting.goalsFor, meeting.goalsAgainst] as const) : ([meeting.goalsAgainst, meeting.goalsFor] as const)
