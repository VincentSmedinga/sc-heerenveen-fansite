import { migrate } from 'drizzle-orm/mysql2/migrator'
import { fileURLToPath } from 'node:url'

import type { Database } from './client.ts'

import { migrateArticleBodies } from './article-body-migration.ts'
import { connect } from './client.ts'
import { readDatabaseEnv } from './env.ts'

/**
 * Runs the migrations in `drizzle/` that the database hasn't had yet, and then puts the text of
 * the articles that still have the old format into JSON (see `migrateArticleBodies`). It uses
 * the migrator from drizzle-orm and not drizzle-kit, so the host can run `pnpm db:migrate`
 * without development tools.
 */
export async function migrateDatabase(db: Database) {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) })
  await migrateArticleBodies(db)
}

if (import.meta.main) {
  const { close, db } = connect(readDatabaseEnv().DATABASE_URL)

  try {
    await migrateDatabase(db)
    console.log('The migrations have run.')
  } finally {
    await close()
  }
}
