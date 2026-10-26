import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { seedSources } from '@fansite/db/seed'
import path from 'node:path'

const loopback = new Set(['127.0.0.1', '::1', '[::1]', 'localhost'])

/**
 * Puts the made-up test sources in the register next to the real ones. The checks need them
 * for their made-up headlines, discussions and episodes, but the site no longer has them on
 * acceptance, where it removes them when it starts. So they come in after the site has started
 * and before the first test, in the way local development does it. It only works on a database
 * on this computer: it refuses any other host, so it can never put made-up sources in the
 * register of acceptance or production, whatever `DATABASE_URL` says by mistake.
 */
export async function addTestSources() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  const { DATABASE_URL } = readDatabaseEnv()
  const { hostname } = new URL(DATABASE_URL)

  if (!loopback.has(hostname)) {
    throw new Error(
      `The checks only put test sources in a database on this computer, and DATABASE_URL names ${hostname}. ` +
        'Made-up sources must never reach acceptance or production.',
    )
  }

  const { close, db } = connect(DATABASE_URL)

  try {
    await seedSources(db)
  } finally {
    await close()
  }
}
