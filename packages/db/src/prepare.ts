import type { RowDataPacket } from 'mysql2/promise'

import { migrate } from 'drizzle-orm/mysql2/migrator'

import { connect } from './client.ts'
import { seedSources } from './seed.ts'

export type PrepareOptions = {
  /** How many seconds to wait for a process that is preparing the same database. */
  lockSeconds?: number
  /** The folder with the migrations: the SQL files and `meta/_journal.json`. */
  migrationsFolder: string
  /** Whether to put the test sources in the register after the migrations. */
  seed: boolean
  /** The `DATABASE_URL`. */
  url: string
}

/**
 * The name of the lock. A MariaDB server shares its lock names between all its databases, so the name has the database in
 * it, and databases on one server don't wait for each other. MariaDB allows 64 characters.
 */
export function lockNameFor(url: string) {
  return `fansite_migrate_${new URL(url).pathname.slice(1)}`.slice(0, 64)
}

/**
 * Brings the database up to date: runs the migrations it hasn't had yet and, when asked, puts the test sources in the
 * register. The site calls this when it starts. A lock in the database (`GET_LOCK`) makes two processes that start at the
 * same moment take turns, so the second one finds nothing left to do.
 *
 * It throws when the database can't be reached, when the lock stays taken, or when a migration or the seed fails. The
 * caller decides what that means. A migration that fails halfway can leave the schema half changed: MariaDB can't undo
 * `CREATE TABLE` or `ALTER TABLE` in a transaction.
 *
 * It takes the folder with the migrations from the caller. A bundled build can't tell where the files are, so the site
 * says where it put them.
 */
export async function prepareDatabase({ lockSeconds = 30, migrationsFolder, seed, url }: PrepareOptions) {
  const { close, db, pool } = connect(url)
  const lockName = lockNameFor(url)

  try {
    // A lock belongs to the connection that takes it, so that connection stays out of the pool until it lets go.
    const connection = await pool.getConnection()

    try {
      const [rows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, ?) AS locked', [lockName, lockSeconds])

      if (rows[0]?.['locked'] !== 1) {
        throw new Error(
          `Could not get the lock '${lockName}' within ${lockSeconds} seconds. Another process may be migrating this database.`,
        )
      }

      try {
        await migrate(db, { migrationsFolder })

        if (seed) {
          await seedSources(db)
        }
      } finally {
        // MariaDB lets go of the lock when the connection ends, so a failure here changes nothing.
        await connection.query('DO RELEASE_LOCK(?)', [lockName]).catch(() => undefined)
      }
    } finally {
      connection.release()
    }
  } finally {
    await close()
  }
}
