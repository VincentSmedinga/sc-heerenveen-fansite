import { listSeasonPlayerStats, type PublicPlayerStats } from '@fansite/db/queries'

import { cacheForKey } from './cache'
import { getDatabase } from './database'

/** How long the figures of a season are kept; the import reads the squad once an hour. */
const keptFor = 5 * 60 * 1000

/**
 * The appearances, goals and assists of the players of a season, one row per player and
 * competition (the squad table of the Dutch Wikipedia), for the column D/W of the card
 * Doelpuntenmakers. A season without figures gives no rows.
 */
export const getSeasonPlayerStats: (season: string) => Promise<PublicPlayerStats[]> = cacheForKey(
  keptFor,
  (season: string) => listSeasonPlayerStats(getDatabase().db, season),
)
