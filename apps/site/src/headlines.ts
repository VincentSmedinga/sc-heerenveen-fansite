import { listRecentItems } from '@fansite/db/queries'

import { cacheFor } from './cache'
import { getDatabase } from './database'
import { windowStart } from './news'

/**
 * The headlines of the two weeks, newest first, from the sources that are switched on: today and the thirteen days before
 * it, and none published after now. The list is cached for five minutes, so a visit doesn't cost a query and a new item
 * shows within five minutes. Each load works out the start again, so the two weeks move on with the days.
 */
export const getHeadlines = cacheFor(5 * 60 * 1000, () => {
  const now = new Date()

  return listRecentItems(getDatabase().db, windowStart(now), now)
})
