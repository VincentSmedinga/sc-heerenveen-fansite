import { listEnabledSources } from '@fansite/db/queries'

import { cacheFor } from './cache'
import { getDatabase } from './database'

/**
 * The sources that are switched on, from the register. The list is cached for an hour, so a visit doesn't cost a
 * query, and a change in the register shows within the hour.
 */
export const getSources = cacheFor(60 * 60 * 1000, () => listEnabledSources(getDatabase().db))
