import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { clubs } from '@fansite/db/schema'
import { inArray } from 'drizzle-orm'
import path from 'node:path'

/**
 * The numbers of two of the made-up clubs, for the page that merges two clubs (#1345): neither
 * has a Wikidata number, so the page shows what the merge does. It only reads a database on
 * this computer.
 */
export async function clubPair() {
  const { DATABASE_URL } = databaseEnv()

  if (!loopback.has(new URL(DATABASE_URL).hostname)) {
    throw new Error('The checks of the clubs only read a database on this computer.')
  }

  const { close, db } = connect(DATABASE_URL)

  try {
    const rows = await db
      .select({ id: clubs.id, slug: clubs.slug })
      .from(clubs)
      .where(inArray(clubs.slug, ['sv-proefdorp', 'demo-boys']))
    const idOf = (slug: string) => {
      const row = rows.find((one) => one.slug === slug)

      if (row === undefined) {
        throw new Error(`There is no made-up club ${slug} in the database. Did the global setup run?`)
      }

      return row.id
    }

    return { club: idOf('sv-proefdorp'), other: idOf('demo-boys') }
  } finally {
    await close()
  }
}

const loopback = new Set(['127.0.0.1', '::1', '[::1]', 'localhost'])

/**
 * The DATABASE_URL of the environment or the .env in the root, like the server of the check
 * uses.
 */
function databaseEnv() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return readDatabaseEnv()
}
