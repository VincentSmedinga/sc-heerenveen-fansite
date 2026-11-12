import { listScorerMatchIds, listSearchableMatches, type SearchableMatch } from '@fansite/db/match-search'

import { cacheFor } from './cache'
import { getDatabase } from './database'
import { clubsOf, seasonsOf } from './match-search'

/** How long the matches are kept: a new result shows within five minutes of the import. */
const period = 5 * 60 * 1000

/** Every played match, with the seasons and the clubs the search needs to know. */
export const getSearchWorld = cacheFor(period, async () => {
  const matches: SearchableMatch[] = await listSearchableMatches(getDatabase().db)

  return { clubs: clubsOf(matches), matches, seasons: seasonsOf(matches) }
})

/**
 * The matches in which a goalscorer of the words scored. Not cached: a search is the visitor's
 * own, and the words have passed `parseSearch`, which is what protects the database.
 */
export const findScorerMatches = async (words: string[]): Promise<ReadonlySet<number>> =>
  new Set(await listScorerMatchIds(getDatabase().db, words))
