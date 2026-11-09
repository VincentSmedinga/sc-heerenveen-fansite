import type { RowDataPacket } from 'mysql2/promise'

import journal from '../drizzle/meta/_journal.json' with { type: 'json' }
import { connect } from './client.ts'

/** What the check found: the migrations the database lacks, and the ones this version lacks. */
export type MigrationCheck = {
  /** The tags of the migrations of this version that the database hasn't had. */
  missing: string[]
  /** How many migrations the database has had that this version doesn't have. */
  unknown: number
}

/**
 * Compares the migrations in the database with the ones that belong to this version, from the
 * same `meta/_journal.json` that `prepareDatabase` migrates with. The journal is imported, so
 * a bundled command carries it along. Drizzle's migrator keeps the `when` of each migration it
 * ran in `__drizzle_migrations.created_at`, so that is what we compare. A database without
 * that table has had none. It only reads.
 */
export async function checkMigrations(url: string): Promise<MigrationCheck> {
  const { close, pool } = connect(url)

  try {
    const ran = new Set<number>()

    try {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT created_at FROM __drizzle_migrations')

      for (const row of rows) {
        ran.add(Number(row['created_at']))
      }
    } catch (error) {
      // ER_NO_SUCH_TABLE: nothing has been migrated yet.
      if (!(error instanceof Error && 'code' in error && error.code === 'ER_NO_SUCH_TABLE')) {
        throw error
      }
    }

    const known = new Set(journal.entries.map((entry) => entry.when))
    // Drizzle runs every migration that is newer than the newest one it ran, so one that is
    // older than that and not in the table is no longer coming.
    const newest = Math.max(0, ...ran)

    return {
      missing: journal.entries.filter((entry) => entry.when > newest).map((entry) => entry.tag),
      unknown: [...ran].filter((when) => !known.has(when)).length,
    }
  } finally {
    await close()
  }
}

/**
 * The lines to print when the check found something; empty when the database is up to date. A
 * missing migration is an error (the deploy hasn't migrated yet); a newer database is only a
 * warning.
 */
export function describeMigrationCheck({ missing, unknown }: MigrationCheck): { error?: string; warning?: string } {
  const [first] = missing

  return {
    ...(first === undefined
      ? {}
      : {
          error: `The database lacks the migration ${first}${missing.length > 1 ? ` and ${missing.length - 1} more` : ''}. Wait until the deploy has finished, which migrates it, and run the import again.`,
        }),
    ...(unknown > 0 && first === undefined
      ? {
          warning: `The database has ${unknown} migration${unknown === 1 ? '' : 's'} this version of the import doesn't know: it is newer. Carrying on.`,
        }
      : {}),
  }
}
