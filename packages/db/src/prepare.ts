import { migrate } from 'drizzle-orm/mysql2/migrator'

import { connect } from './client.ts'
import { lockNameFor, withLock } from './lock.ts'
import { removeTestSources, seedMatches, seedRealSources, seedSquad } from './seed.ts'

export type PrepareOptions = {
  /** How many seconds to wait for a process that is preparing the same database. */
  lockSeconds?: number
  /** The folder with the migrations: the SQL files and `meta/_journal.json`. */
  migrationsFolder: string
  /**
   * What to put in the database after the migrations. `acceptance` and `production` put the
   * real sources in the register, and `acceptance` also takes out the test sources it had and
   * puts made-up matches in. `local` and `false` put nothing in: locally `pnpm db:seed` does
   * that.
   */
  seed: 'acceptance' | 'local' | 'production' | false
  /** The `DATABASE_URL`. */
  url: string
}

/**
 * Brings the database up to date: runs the migrations it hasn't had yet and, when asked, puts
 * the real sources in the register (see `PrepareOptions`). The test sources are for local
 * development and the tests only; acceptance removes the ones it had. The site calls this
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

      if (seed === 'acceptance' || seed === 'production') {
        await seedRealSources(db)
      }

      if (seed === 'acceptance') {
        await removeTestSources(db)
        await seedMatches(db)
        await seedSquad(db)
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
