import type { Match, MatchChange } from '@fansite/db/schema'

import { conflictStandsMs, partLabels, secondSourceOf, sourceLabels } from '@fansite/db/match-conflicts'

import { formatVersionTime } from '../news'

// What a beheerder reads of a difference that waits for a part of a match: whose values the
// two are, what happens when nobody decides, and what the two buttons do. A difference between
// Wikipedia and an entry of the editors is taken over by the import after seven days; a
// difference between two sources (issue 974) waits until a person decides.

/** The words of one difference on the page of its match. */
export type DifferenceWords = {
  heading: string
  /** The button that keeps the match as it is. */
  keep: string
  /** What happens until, and without, a decision. */
  note: string
  /** The name of the value the match has. */
  ours: string
  /** The button that takes the other value over. */
  takeOver: string
  /** The name of the other value. */
  theirs: string
  /** Whether it is a difference between two sources, for the notice after the decision. */
  twoSources: boolean
}

const capital = (text: string) => `${text.slice(0, 1).toLocaleUpperCase('nl')}${text.slice(1)}`

export function differenceWords(
  difference: Pick<MatchChange, 'firstSeenAt' | 'reason'> & { part: NonNullable<MatchChange['part']> },
  match: Pick<Match, 'dataSource'>,
): DifferenceWords {
  const second = secondSourceOf(difference.reason)

  if (second === undefined) {
    return {
      heading: `Wikipedia wijkt af: ${partLabels[difference.part]}`,
      keep: 'Houd onze invoer',
      note: `Onze invoer blijft staan tot je beslist. Beslist niemand, dan neemt de import Wikipedia over op ${formatVersionTime(new Date(difference.firstSeenAt.getTime() + conflictStandsMs))}, als Wikipedia dan nog hetzelfde zegt.`,
      ours: 'Onze invoer',
      takeOver: 'Neem Wikipedia over',
      theirs: 'Wikipedia',
      twoSources: false,
    }
  }

  // A match the editors added is theirs, and the page calls that "onze invoer" everywhere.
  const owner = match.dataSource === 'redactie' ? 'onze invoer' : sourceLabels[match.dataSource]

  return {
    heading: `${capital(sourceLabels[second])} wijkt af: ${partLabels[difference.part]}`,
    keep: `Houd ${owner}`,
    note: `De wedstrijd komt van ${sourceLabels[match.dataSource]}, en die waarde blijft staan tot je beslist. De import neemt hier niets vanzelf over.`,
    ours: capital(owner),
    takeOver: `Neem ${sourceLabels[second]} over`,
    theirs: capital(sourceLabels[second]),
    twoSources: true,
  }
}
