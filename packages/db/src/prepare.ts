import { migrate } from 'drizzle-orm/mysql2/migrator'

import { connect } from './client.ts'
import { lockNameFor, withLock } from './lock.ts'
import { seedMatches, seedSources } from './seed.ts'

export type PrepareOptions = {
  /** How many seconds to wait for a process that is preparing the same database. */
  lockSeconds?: number
  /** The folder with the migrations: the SQL files and `meta/_journal.json`. */
  migrationsFolder: string
  /** Whether to put the test sources and made-up matches in after the migrations. */
  seed: boolean
  /** The `DATABASE_URL`. */
  url: string
}

/**
 * Brings the database up to date: runs the migrations it hasn't had yet and, when asked, puts
 * the test sources in the register and made-up matches in the database. The site calls this
 * when it starts. A lock in the database (`GET_LOCK`) makes two processes that start at the
 * same moment take turns, so the second one finds nothing left to do.
 *
 * It throws when the database can't be reached, when the lock stays taken, or when a migration
 * or the seed fails. The caller decides what that means. A migration that fails halfway can
 * leave the schema half changed: MariaDB can't undo `CREATE TABLE` or `ALTER TABLE` in a
 * transaction.
 *
 * It takes the folder with the migrations from the caller. A bundled build can't tell where the
 * files are, so the site says where it put them.
 */
export async function prepareDatabase({ lockSeconds = 30, migrationsFolder, seed, url }: PrepareOptions) {
  const { close, db, pool } = connect(url)
  const lockName = lockNameFor(url, 'migrate')

  try {
    const { ran } = await withLock(pool, lockName, lockSeconds, async () => {
      await migrate(db, { migrationsFolder })

      if (seed) {
        await seedSources(db)
        await seedMatches(db)
      }
    })

    if (!ran) {
      throw new Error(
        `Could not get the lock '${lockName}' within ${lockSeconds} seconds. Another process may be migrating this database.`,
      )
    }
  } finally {
    await close()
  }
}
