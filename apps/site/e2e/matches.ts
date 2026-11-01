import { connect } from '@fansite/db/client'
import { matches } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { asc, eq } from 'drizzle-orm'

import { databaseEnv, loopback } from './articles'

/**
 * The number of a made-up match of the current season, which the pages of the admin have in
 * their address: the first one the seed made. Like `articleIdOf`, it only reads a database on
 * this computer.
 */
export async function matchId() {
  const { DATABASE_URL } = databaseEnv()

  if (!loopback.has(new URL(DATABASE_URL).hostname)) {
    throw new Error('The checks of the matches only read a database on this computer.')
  }

  const { close, db } = connect(DATABASE_URL)

  try {
    const [row] = await db
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.season, seasonOf(new Date())))
      .orderBy(asc(matches.id))
      .limit(1)

    if (row === undefined) {
      throw new Error('There is no made-up match of this season in the database. Did the global setup run?')
    }

    return row.id
  } finally {
    await close()
  }
}
