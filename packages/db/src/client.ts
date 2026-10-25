import { drizzle } from 'drizzle-orm/mysql2'
import { createPool } from 'mysql2/promise'

import * as schema from './schema.ts'

export type Database = ReturnType<typeof connect>['db']

/**
 * Connects to MariaDB with the URL from `DATABASE_URL`. Call `close()` when you're done, or the
 * process doesn't exit.
 *
 * Drizzle reads and writes `datetime` columns as UTC. `timezone: 'Z'` makes the driver do the
 * same for a date that you pass to a query yourself.
 */
export function connect(url: string) {
  const pool = createPool({ charset: 'UTF8MB4_UNICODE_CI', timezone: 'Z', uri: url })

  return { close: () => pool.end(), db: drizzle({ client: pool, mode: 'default', schema }), pool }
}
