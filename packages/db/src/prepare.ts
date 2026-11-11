import { migrate } from 'drizzle-orm/mysql2/migrator'

import { migrateArticleBodies } from './article-body-migration.ts'
import { connect } from './client.ts'
import { lockNameFor, withLock } from './lock.ts'
import { updatePlayerAddresses } from './person-slugs.ts'
import { removeTestSources, seedMatches, seedRealSources, seedSquad } from './seed.ts'
import { seedStaff } from './staff-seed.ts'

export type PrepareOptions = {
  /**
   * Whether to give the players the addresses of their pages after the migrations
   * (`updatePlayerAddresses`, #1079). The site does; a test of an older migration can't, as its
   * schema has no slugs yet.
   */
  addresses?: boolean
  /** How many seconds to wait for a process that is preparing the same database. */
  lockSeconds?: number
  /** The folder with the migrations: the SQL files and `meta/_journal.json`. */
  migrationsFolder: string
  /**
   * What to put in the database after the migrations. `acceptance` and `production` put the
   * real sources in the register and the head coaches in `staff`, and `acceptance` also takes
   * out the test sources it had and puts made-up matches in. `local` and `false` put nothing
   * in: locally `pnpm db:seed` does that.
   */
  seed: 'acceptance' | 'local' | 'production' | false
  /** The `DATABASE_URL`. */
  url: string
}

/**
 * Brings the database up to date: runs the migrations it hasn't had yet, puts the text of the
 * articles that still have the old format into JSON, gives the players the addresses of their
 * pages when asked (`addresses`) and, when asked, puts the real sources in
 * the register and the head coaches in `staff` (see `PrepareOptions`). The test sources are
 * for local development and the tests only; acceptance removes the ones it had. The site calls
 * this when it starts. A lock in the database (`GET_LOCK`) makes two
 * processes that start at the same moment take turns, so the second one finds nothing left to
 * do.
 *
 * It throws when the database can't be reached, when the lock stays taken, or when a migration
 * or the seed fails. The caller decides what that means. A migration that fails halfway can
 * leave the schema half changed: MariaDB can't undo `CREATE TABLE` or `ALTER TABLE` in a
 * transaction.
 *
 * It takes the folder with the migrations from the caller. A bundled build can't tell where the
 * files are, so the site says where it put them.
 */
export async function prepareDatabase({
  addresses = false,
  lockSeconds = 30,
  migrationsFolder,
  seed,
  url,
}: PrepareOptions) {
  const { close, db, pool } = connect(url)
  const lockName = lockNameFor(url, 'migrate')

  try {
    const { ran } = await withLock(pool, lockName, lockSeconds, async () => {
      await migrate(db, { migrationsFolder })
      await migrateArticleBodies(db)

      if (addresses) {
        await updatePlayerAddresses(db)
      }

      if (seed === 'acceptance' || seed === 'production') {
        await seedRealSources(db)
        await seedStaff(db)
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
