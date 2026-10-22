import { listRecentItems } from '@fansite/db/queries'

import { cacheFor } from './cache'
import { getDatabase } from './database'
import { windowStart } from './news'

/**
 * The headlines of the week, newest first, from the sources that are switched on: today and the six days before it. The
 * list is cached for five minutes, so a visit doesn't cost a query and a new item shows within five minutes. Each load
 * works out the start of the week again, so the week moves on with the days.
 */
export const getHeadlines = cacheFor(5 * 60 * 1000, () => listRecentItems(getDatabase().db, windowStart(new Date())))
