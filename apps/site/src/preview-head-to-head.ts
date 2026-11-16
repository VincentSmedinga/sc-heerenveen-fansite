import type { PublicClubMatch } from '@fansite/db/queries'

import { resultOf } from './match-result'
import { type Meeting, meetingsOf, type Tally, tallyOf } from './opponents'

// The card "Onderling" of the Voorbeschouwing (#1318): the played matches against the opponent
// on the side where the next match is played, so only away matches for an away match and only
// home matches for a home match (#1315). They take plain matches, so a test needs no database.

/** How many matches the card lists, the newest first. */
export const lastMeetings = 5

/** What the card shows about the matches against a club on one side. */
export type HeadToHead = {
  /** The win with the most goals ahead, then the most goals of ours, then the newest. */
  biggestWin: Meeting | undefined
  /** The newest matches on that side, at most `lastMeetings`, newest first. */
  last: Meeting[]
  /** The newest win on that side. */
  lastWin: Meeting | undefined
  /** The first season of those matches, such as `1990/91`. */
  since: string
  /** Won, drawn and lost, and the goals. */
  tally: Tally
}

const difference = (meeting: Meeting) => meeting.goalsFor - meeting.goalsAgainst

/** Whether `a` is a better "biggest win" than `b`: see `HeadToHead.biggestWin`. */
const isBigger = (a: Meeting, b: Meeting) =>
  difference(a) - difference(b) || a.goalsFor - b.goalsFor || a.matchDate.localeCompare(b.matchDate)

/**
 * The record against the club on one side: `home` is whether the match to come is at home, and
 * so which matches count. Every played match with a score counts, in whatever competition; a
 * match that is not played, called off or without a score does not. `matches` is the list of
 * the page of the club, the newest first. Without a match on that side the result is undefined,
 * and the card falls away.
 */
export function headToHeadOf(matches: readonly PublicClubMatch[], home: boolean): HeadToHead | undefined {
  const meetings = meetingsOf(matches, 'all').filter((meeting) => meeting.home === home)
  const oldest = meetings.at(-1)

  if (oldest === undefined) {
    return undefined
  }

  const wins = meetings.filter((meeting) => resultOf(meeting) === 'win')
  const lead = wins.filter((meeting) => difference(meeting) > 0)

  return {
    biggestWin: lead.reduce<Meeting | undefined>(
      (top, meeting) => (top === undefined || isBigger(meeting, top) > 0 ? meeting : top),
      undefined,
    ),
    last: meetings.slice(0, lastMeetings),
    lastWin: wins[0],
    since: oldest.season,
    tally: tallyOf(meetings),
  }
}
