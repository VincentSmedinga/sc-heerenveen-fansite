import { connect } from '@fansite/db/client'

import { readEnv } from './env'

let database: ReturnType<typeof connect> | undefined

/** The connection to the database, shared by every page. The connection pool opens with the first call. */
export function getDatabase() {
  database ??= connect(readEnv().DATABASE_URL)

  return database
}
