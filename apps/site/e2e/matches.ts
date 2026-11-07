import { connect } from '@fansite/db/client'
import { clubs, matches, matchReports } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { and, asc, eq } from 'drizzle-orm'

import { databaseEnv, loopback } from './articles'

/**
 * The number of a made-up match of the current season that has not been played, so it has no
 * result and no goals: the checks fill it in. The pages of the admin have it in their address.
 * Like `articleIdOf`, it only reads a database on this computer.
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
      .where(and(eq(matches.season, seasonOf(new Date())), eq(matches.status, 'scheduled')))
      .orderBy(asc(matches.id))
      .limit(1)

    if (row === undefined) {
      throw new Error('There is no made-up match to come in the database. Did the global setup run?')
    }

    return row.id
  } finally {
    await close()
  }
}

/**
 * The address of the page of the made-up match that has a report that is klaar, such as
 * `/wedstrijden/2026-27/2026-10-24-testdorp-fc`: the seed puts the report at the first round of
 * the Eredivisie. Like `matchId`, it only reads a database on this computer.
 */
export async function reportPath() {
  const { DATABASE_URL } = databaseEnv()

  if (!loopback.has(new URL(DATABASE_URL).hostname)) {
    throw new Error('The checks of the matches only read a database on this computer.')
  }

  const { close, db } = connect(DATABASE_URL)

  try {
    const season = seasonOf(new Date())
    const [row] = await db
      .select({ matchDate: matches.matchDate, slug: clubs.slug })
      .from(matches)
      .innerJoin(matchReports, eq(matchReports.matchId, matches.id))
      .innerJoin(clubs, eq(clubs.id, matches.clubId))
      .where(and(eq(matches.season, season), eq(matchReports.status, 'klaar')))
      .orderBy(asc(matches.id))
      .limit(1)

    if (row === undefined) {
      throw new Error('There is no made-up match with a report in the database. Did the global setup run?')
    }

    return `/wedstrijden/${season.replace('/', '-')}/${row.matchDate}-${row.slug}`
  } finally {
    await close()
  }
}
