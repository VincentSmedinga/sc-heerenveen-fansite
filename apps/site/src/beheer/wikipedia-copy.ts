import type { Match, MatchGoal } from '@fansite/db/schema'

import { decodePartProposal, oldSiteGoalsReason, secondSourceOf } from '@fansite/db/match-conflicts'

import type { Difference } from './match-entries'

// What the editors copy to improve Wikipedia themselves (issue 1026): our value of the goals
// or of the attendance, in the notation of the match box on the page of the season. Nothing is
// sent anywhere and nothing is stored: the text only goes to the clipboard of the editor.

/** What one difference lets the editors copy. */
export type WikipediaCopy = {
  /** The text in the notation of Wikipedia. */
  text: string
  /** What the text is, in words: "de doelpunten" or "het aantal toeschouwers". */
  what: string
}

/**
 * What the editors can copy for a difference, or undefined. Only the goals and the attendance
 * give a text, and only when Wikipedia is the other side of the difference: the goals of the
 * old fansite that do not add up are no difference with Wikipedia. Our goals must exist, and
 * the attendance must be a number that Wikipedia has not.
 */
export function copyForWikipedia(
  difference: Pick<Difference, 'part' | 'proposal' | 'reason'>,
  match: Pick<Match, 'attendance' | 'home' | 'status'>,
  goals: MatchGoal[],
): undefined | WikipediaCopy {
  const second = secondSourceOf(difference.reason)

  if (difference.reason === oldSiteGoalsReason || (second !== undefined && second !== 'wikipedia')) {
    return undefined
  }

  if (difference.part === 'goals') {
    return goals.length === 0 ? undefined : { text: wikipediaGoals(goals, match.home), what: 'de doelpunten' }
  }

  if (difference.part !== 'facts' || match.attendance === null) {
    return undefined
  }

  const proposal = decodePartProposal(difference.proposal)

  return proposal?.part === 'facts' && proposal.attendance !== match.attendance
    ? { text: wikipediaAttendance(match.attendance), what: 'het aantal toeschouwers' }
    : undefined
}

/** The number of spectators in the line of the match box, without a separator. */
export function wikipediaAttendance(attendance: number): string {
  return `|attendance=${attendance}`
}

/**
 * The goals of the match in the lines of the match box: `goals1` is the home side, `goals2` the
 * away side. An own goal stands under the club that benefits from it, as on Wikipedia.
 */
export function wikipediaGoals(goals: MatchGoal[], home: boolean): string {
  const side = (ours: boolean, homeSide: boolean) =>
    goals
      .filter((goal) => goal.ours === ours)
      .map((goal) => writeGoal(goal, homeSide))
      .join('<br />')

  return [`|goals1=${side(home, true)}`, `|goals2=${side(!home, false)}`].join('\n')
}

/**
 * The goal as the match box writes it: the player with the link and the template of the
 * minute, with the name first on the home side and the minute first on the away side.
 */
function writeGoal(
  goal: Pick<MatchGoal, 'minute' | 'ownGoal' | 'penalty' | 'sourceName' | 'stoppageMinutes' | 'wikipediaPage'>,
  homeSide: boolean,
) {
  const name =
    goal.wikipediaPage === null || goal.wikipediaPage === goal.sourceName
      ? `[[${goal.sourceName}]]`
      : `[[${goal.wikipediaPage}|${goal.sourceName}]]`

  if (goal.minute === null) {
    return name
  }

  const minute = `${goal.minute}${goal.stoppageMinutes === null ? '' : `+${goal.stoppageMinutes}`}`
  const kind = goal.ownGoal ? '|e.d.' : goal.penalty ? '|pen.' : ''
  const template = `{{goal|${minute}${kind}}}`

  return homeSide ? `${name} ${template}` : `${template} ${name}`
}
