import type { MatchInSequence } from '@fansite/db/queries'
import type { MatchNeighbour } from '@fansite/design-system'

import { phaseOf } from '@fansite/db/match-reports'
import { listMatchSequence } from '@fansite/db/queries'

import { cacheFor } from './cache'
import { getDatabase } from './database'
import { matchMoment } from './match-format'
import { getMatchSeasons } from './matches'
import { getPublicReports, reportAddress } from './report-data'

// The links at the bottom of the page of a match: the match before it and the match after it in
// the order of play over all competitions and seasons (see `listMatchSequence`). A match with a
// page links to it; any other stands as text.

/** The order of play changes when a match is added, so it is kept for five minutes. */
const getSequence = cacheFor(5 * 60 * 1000, () => listMatchSequence(getDatabase().db))

/**
 * The card at the bottom of the page of the match with `id`: the match before and the match
 * after it, each linked when it has a page.
 */
export async function getMatchNeighbours(id: number, now: Date) {
  const { next, previous } = neighboursOf(await getSequence(), id)
  const seasons = new Set(await getMatchSeasons())
  const links = new Map<number, string>()

  for (const season of new Set([next?.season, previous?.season])) {
    if (season !== undefined && seasons.has(season)) {
      for (const reported of await getPublicReports(season)) {
        links.set(reported.match.id, reportAddress(season, reported.match.matchDate, reported.clubSlug))
      }
    }
  }

  return {
    next: next === undefined ? undefined : neighbourOf(next, links.get(next.id), now),
    previous: previous === undefined ? undefined : neighbourOf(previous, links.get(previous.id), now),
  }
}

/**
 * The properties of one side of the card. A match with a result has its stand from our side
 * (and the shoot-out when there was one). Any other match has no stand and no colour: "Live"
 * while it is being played, "Uitgesteld" or "Geannuleerd", and otherwise its day in the short
 * form of the lists, without the time.
 */
export function neighbourOf(match: MatchInSequence, href: string | undefined, now: Date): MatchNeighbour {
  const base = { club: match.opponent, home: match.home, ...(href === undefined ? {} : { href }) }

  if (match.status === 'played' && match.goalsFor !== null && match.goalsAgainst !== null) {
    const shootOut = match.penaltiesFor !== null && match.penaltiesAgainst !== null

    return {
      ...base,
      goalsAgainst: match.goalsAgainst,
      goalsFor: match.goalsFor,
      ...(shootOut ? { penaltiesAgainst: match.penaltiesAgainst, penaltiesFor: match.penaltiesFor } : {}),
    } as MatchNeighbour
  }

  if (match.status === 'postponed') {
    return { ...base, state: 'Uitgesteld' }
  }

  if (match.status === 'cancelled') {
    return { ...base, state: 'Geannuleerd' }
  }

  if (phaseOf(match, now) === 'live') {
    return { ...base, state: 'Live' }
  }

  const day = matchMoment({ ...match, status: 'played' }, now)

  return { ...base, state: day.time, stateDateTime: day.dateTime }
}

/** The match before and the match after the one with `id`. The first has no `previous`. */
export function neighboursOf(
  sequence: readonly MatchInSequence[],
  id: number,
): { next?: MatchInSequence; previous?: MatchInSequence } {
  const index = sequence.findIndex((match) => match.id === id)

  if (index === -1) {
    return {}
  }

  const previous = sequence[index - 1]
  const next = sequence[index + 1]

  return { ...(previous === undefined ? {} : { previous }), ...(next === undefined ? {} : { next }) }
}
