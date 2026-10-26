import { prepareDatabase } from '@fansite/db/prepare'
import path from 'node:path'

import { readEnv } from './env'
import { reasonOf } from './errors'

/**
 * Checks the environment variables when the server starts, and returns them. When this throws,
 * Next.js logs the error but keeps the server running, and then every request fails. We stop
 * the process instead, so the host reports a site that can't start.
 */
export function checkEnv() {
  try {
    return readEnv()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

/**
 * Where the migrations are. Next.js runs the server from `apps/site`, in the repository and in
 * the folder that `assemble` makes, and both hold the migrations in `packages/db/drizzle`.
 */
export function migrationsFolder() {
  return path.resolve(process.cwd(), '../../packages/db/drizzle')
}

/**
 * Brings the database up to date when the server starts: it runs the migrations the database
 * hasn't had yet. On acceptance and production it puts the real sources from the seed in the
 * register, and on acceptance it also takes out the made-up test sources that were there
 * before. Local gets nothing: `pnpm db:seed` puts the test sources there.
 *
 * It never throws. A database that isn't there, or a migration that fails, is no reason to
 * stop: the homepage doesn't need the database, and a visitor to a page that does gets the
 * error page. The log says what went wrong, so the owner can see it in the log of the app on
 * the host.
 */
export async function prepareDatabaseOnStart({ DATABASE_URL, SITE_ENV }: ReturnType<typeof readEnv>) {
  const seeded = SITE_ENV !== 'local'

  try {
    await prepareDatabase({ migrationsFolder: migrationsFolder(), seed: SITE_ENV, url: DATABASE_URL })
    console.log(`The database is up to date${seeded ? ', with the real sources from the seed' : ''}.`)
  } catch (error) {
    console.error(
      `Could not bring the database up to date, so the site keeps running without it: ${reasonOf(error)}. ` +
        'Pages that need the database will show the error page until this is fixed. See docs/acceptatieomgeving.md.',
    )
  }
}
