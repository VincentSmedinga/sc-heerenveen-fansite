import type { SearchableMatch } from '@fansite/db/match-search'

import type { CompetitionChoice } from './competition'

import { type CompetitionValue, type Filters, findMatches, matchCount, searchHref } from './match-search'
import { nothing } from './match-search-start'

/**
 * The links of the pages Cijfers to the matches behind a figure, in the search of matches. One
 * helper builds every address and counts the matches with the search's own code
 * (`findMatches`), so the number in a link is the number the search shows for the same
 * filters. A link that would find no match is left out, and a figure the search has no filter
 * for gets no link.
 */

/** What a page counts: one season (every season when left out) and a competition choice. */
export type CijfersScope = { competition: CompetitionChoice; season?: string | undefined }

/** The links a card of Cijfers can have, for the scope of its page. */
export type CijfersSearch = {
  /** The matches that sc Heerenveen won, the biggest win first. */
  biggestWins: () => MatchLink | undefined
  /** The matches without a goal against. */
  cleanSheets: () => MatchLink | undefined
  /** The matches that ended with exactly this score, our goals first. */
  score: (ours: number, theirs: number) => MatchLink | undefined
  /** The matches at home or away. */
  venue: (venue: 'thuis' | 'uit') => MatchLink | undefined
}

/** A link to the search, with the number of matches it finds. */
export type MatchLink = { count: number; href: string }

/**
 * The competitions of the search for a choice of the page. The league is the Eredivisie and the
 * Eerste divisie, as `countsFor` has it, and `all` is no filter at all.
 */
const competitionsOf = (choice: CompetitionChoice): CompetitionValue[] =>
  choice === 'all'
    ? []
    : choice === 'league'
      ? ['eredivisie', 'eerste-divisie']
      : choice === 'playoffs'
        ? ['play-offs']
        : choice === 'cup'
          ? ['knvb-beker']
          : ['europa']

/** The filters of the scope of a page, with the choices of one figure added. */
export const filtersOf = ({ competition, season }: CijfersScope, choices: Partial<Filters> = {}): Filters => ({
  ...nothing,
  competitions: competitionsOf(competition),
  from: season,
  to: season,
  ...choices,
})

/** The links of the cards of a page, which counts `all` within `scope`. */
export function cijfersSearchOf(all: readonly SearchableMatch[], scope: CijfersScope): CijfersSearch {
  return {
    biggestWins: () => matchLink(all, scope, { order: 'doelsaldo', outcomes: ['gewonnen'] }),
    cleanSheets: () => matchLink(all, scope, { theirs: 0 }),
    score: (ours, theirs) => matchLink(all, scope, { ours, theirs }),
    venue: (venue) => matchLink(all, scope, { venues: [venue] }),
  }
}

/** The link for a figure, or nothing when the search would find no match. */
export function matchLink(
  all: readonly SearchableMatch[],
  scope: CijfersScope,
  choices: Partial<Filters>,
): MatchLink | undefined {
  const filters = filtersOf(scope, choices)
  const count = findMatches(all, filters, undefined).length

  return count === 0 ? undefined : { count, href: searchHref(filters) }
}

/** The words of a link: `Toon de 111 wedstrijden met 0–0`, or `Toon de wedstrijd …` for one. */
export const showWords = ({ count }: MatchLink, what: string) =>
  `Toon ${count === 1 ? 'de wedstrijd' : `de ${matchCount(count)}`} ${what}`
