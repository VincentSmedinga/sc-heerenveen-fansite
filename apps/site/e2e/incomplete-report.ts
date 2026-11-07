import { connect } from '@fansite/db/client'
import { clubs, matchAppearances, matches, matchReports } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { and, asc, eq, isNull } from 'drizzle-orm'

import { databaseEnv, loopback } from './articles'

// A made-up report that is still being filled in (`bezig`), for the checks of the page of a
// match with the notice "We vullen dit verslag nog in" (#857). The seed has only reports that
// are klaar, and a report that is bezig changes what other pages show (a link to the page), so
// the checks put one in before the first test and take it out after the last one. It sits at a
// played match of the current season that has no report, with three players of ours and nothing
// else: what the page shows when little is known.

const source = 'Verzonnen wedstrijdformulier, nog niet af'

/**
 * Puts the report that is bezig at a played match without a report, and returns the function
 * that takes it out again. It does nothing when every played match has a report already.
 */
export async function addIncompleteReport() {
  const { close, db } = connectToLocalDatabase()
  let matchId: number | undefined

  try {
    const row = await matchWithoutReport(db)

    if (row !== undefined) {
      matchId = row.id
      await db.insert(matchReports).values({ matchId, opponentComplete: false, source, status: 'bezig' })
      await db.insert(matchAppearances).values(
        [
          { name: 'Verzonnen Keeper', shirtNumber: 1 },
          { name: 'Verzonnen Verdediger', shirtNumber: 4 },
          { name: 'Verzonnen Spits', shirtNumber: 9 },
        ].map((player) => ({ ...player, captain: false, matchId: row.id, ours: true, starter: true })),
      )
    }
  } finally {
    await close()
  }

  return async () => {
    const connection = connectToLocalDatabase()

    try {
      if (matchId !== undefined) {
        // The players go with the report.
        await connection.db.delete(matchReports).where(eq(matchReports.matchId, matchId))
      }
    } finally {
      await connection.close()
    }
  }
}

/**
 * The address of the page of the match with the report that is bezig, such as
 * `/wedstrijden/2026-27/2026-09-15-oefenstad-fc`. Like `reportPath`, it only reads a database
 * on this computer.
 */
export async function incompleteReportPath() {
  const { close, db } = connectToLocalDatabase()

  try {
    const season = seasonOf(new Date())
    const [row] = await db
      .select({ matchDate: matches.matchDate, slug: clubs.slug })
      .from(matches)
      .innerJoin(matchReports, eq(matchReports.matchId, matches.id))
      .innerJoin(clubs, eq(clubs.id, matches.clubId))
      .where(and(eq(matches.season, season), eq(matchReports.status, 'bezig'), eq(matchReports.source, source)))
      .orderBy(asc(matches.id))
      .limit(1)

    if (row === undefined) {
      throw new Error('There is no made-up report that is bezig in the database. Did the global setup run?')
    }

    return `/wedstrijden/${season.replace('/', '-')}/${row.matchDate}-${row.slug}`
  } finally {
    await close()
  }
}

function connectToLocalDatabase() {
  const { DATABASE_URL } = databaseEnv()

  if (!loopback.has(new URL(DATABASE_URL).hostname)) {
    throw new Error('The checks of the matches only write to a database on this computer.')
  }

  return connect(DATABASE_URL)
}

/** The played match of the current season that has no report, the first one. */
async function matchWithoutReport(db: ReturnType<typeof connect>['db']) {
  const [row] = await db
    .select({ id: matches.id, matchDate: matches.matchDate, slug: clubs.slug })
    .from(matches)
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .leftJoin(matchReports, eq(matchReports.matchId, matches.id))
    .where(and(eq(matches.season, seasonOf(new Date())), eq(matches.status, 'played'), isNull(matchReports.matchId)))
    .orderBy(asc(matches.id))
    .limit(1)

  return row
}
