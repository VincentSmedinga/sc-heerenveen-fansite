import type { PublicClubMatch } from '@fansite/db/queries'

import { keyOf, scorerLine, scorerSortName } from './matches'
import { meetingsOf } from './opponents'

// The card "Onze schutters" of the Voorbeschouwing (#1319): who of ours scored in the played
// matches against the opponent on the side where the next match is played (#1315). They take
// plain matches, so a test needs no database.

/** How many scorers "Het vaakst" lists. */
export const mostOftenShown = 5

/** A scorer of ours on that side: the name as a row shows it, the goals and the last year. */
export type PreviewScorer = {
  givenName?: string | undefined
  goals: number
  href?: string | undefined
  /** The year of the newest goal. */
  last: number
  /** The name as text, which is the key of the row of a table. */
  name: string
  /** The person, when the goal has one: only a person can be in the squad. */
  personId: null | number
  sortName: string
  surname: string
}

/** What the card shows: the scorers who are in the squad, and the five who scored most. */
export type PreviewScorers = {
  mostOften: PreviewScorer[]
  squad: PreviewScorer[]
}

/** More goals first, then the newest last goal, then the name from A to Z. */
const byRank = (a: PreviewScorer, b: PreviewScorer) =>
  b.goals - a.goals || b.last - a.last || a.sortName.localeCompare(b.sortName, 'nl')

/**
 * The scorers of ours in the played matches against the club on one side: `home` is whether the
 * match to come is at home. A goal counts for the person when it has one and otherwise for the
 * name as the source writes it. An own goal never counts, on either side. `squad` holds the
 * people of `squadPersonIds` among them, `mostOften` the first five of all of them. `matches`
 * is the list of the page of the club. Without a goal of ours on that side the result is
 * undefined, and the card falls away.
 */
export function scorersOf(
  matches: readonly PublicClubMatch[],
  home: boolean,
  squadPersonIds: ReadonlySet<number>,
): PreviewScorers | undefined {
  const scorers = new Map<string, PreviewScorer>()

  for (const meeting of meetingsOf(matches, 'all').filter((match) => match.home === home)) {
    const year = Number(meeting.matchDate.slice(0, 4))

    for (const goal of meeting.goals) {
      if (!goal.ours || goal.ownGoal) {
        continue
      }

      const key = keyOf(goal)
      const known = scorers.get(key)

      if (known !== undefined) {
        known.goals += 1
        known.last = Math.max(known.last, year)
        continue
      }

      const { givenName, href, player, surname } = scorerLine(goal)

      scorers.set(key, {
        givenName,
        goals: 1,
        href,
        last: year,
        name: player,
        personId: goal.personId,
        sortName: scorerSortName(goal),
        surname,
      })
    }
  }

  if (scorers.size === 0) {
    return undefined
  }

  const ranked = [...scorers.values()].toSorted(byRank)

  return {
    mostOften: ranked.slice(0, mostOftenShown),
    squad: ranked.filter(({ personId }) => personId !== null && squadPersonIds.has(personId)),
  }
}
