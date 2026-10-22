import { connect } from '@fansite/db/client'
import { listEnabledSources } from '@fansite/db/queries'

import { cacheFor } from './cache'
import { readEnv } from './env'

let database: ReturnType<typeof connect> | undefined

/**
 * The sources that are switched on, from the register. The list is cached for an hour, so a visit doesn't cost a
 * query, and a change in the register shows within the hour. The connection pool opens with the first call.
 */
export const getSources = cacheFor(60 * 60 * 1000, () => {
  database ??= connect(readEnv().DATABASE_URL)

  return listEnabledSources(database.db)
})
