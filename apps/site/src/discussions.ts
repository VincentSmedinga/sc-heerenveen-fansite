import { listNewestDiscussions } from '@fansite/db/queries'

import { cacheFor } from './cache'
import { getDatabase } from './database'
import { itemsPerCard } from './items-per-card'

/**
 * The newest discussions of our forum, from the forums that are switched on, the one with the
 * latest post first. The importer keeps the five that the homepage shows. The list is cached
 * for five minutes, so a visit doesn't cost a query and a new discussion shows within five
 * minutes of the import.
 */
export const getDiscussions = cacheFor(5 * 60 * 1000, () => listNewestDiscussions(getDatabase().db, itemsPerCard))
