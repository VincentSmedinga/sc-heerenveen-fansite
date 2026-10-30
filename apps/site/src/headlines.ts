import { listRecentItems } from '@fansite/db/queries'

import { cacheFor } from './cache'
import { getDatabase } from './database'
import { firstHeadlines } from './items-per-card'

/**
 * The newest headlines from the sources that are switched on, newest first, and none published
 * after now, however old they are: `firstHeadlines` of them, or fewer when the sources have
 * fewer. Older news is for the archive at /nieuws. The list is cached for five minutes, so a
 * visit doesn't cost a query and a new item shows within five minutes.
 */
export const getHeadlines = cacheFor(5 * 60 * 1000, () =>
  listRecentItems(getDatabase().db, { limit: firstHeadlines, until: new Date() }),
)
