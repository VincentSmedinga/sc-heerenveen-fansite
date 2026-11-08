import { connect } from '@fansite/db/client'
import { withClubs } from '@fansite/db/clubs'
import { clubs, matchAppearances, matches, matchGoals, matchReports } from '@fansite/db/schema'
import { seasonOf, utcToAmsterdam } from '@fansite/db/season'
import { and, eq } from 'drizzle-orm'

import { databaseEnv, loopback } from './articles'

// A made-up match that is being played, for the checks of the page "Live" (#906): a match of
// the Beker that began an hour ago and has no result, with a report that is `bezig` and one
// goal of ours. The seed has no such match, and it changes what other pages show (a line with
// the link "Live" in Wedstrijden), so the checks put it in before the first test and take it
// out after the last one.

const madeUp = { competition: 'KNVB Beker', opponent: 'Testdorp FC', round: 'Live-controle' } as const

const source = 'Verzonnen wedstrijdformulier, wordt nog gespeeld'

/**
 * Puts the match and its report in the database, and returns the function that takes them out
 * again: the match with these values only, so never an imported one.
 */
export async function addLiveReport() {
  const { close, db } = connectToLocalDatabase()

  try {
    const kickoffAt = new Date(Math.floor(Date.now() / 1000) * 1000 - 60 * 60 * 1000)
    const [row] = await withClubs(db, [
      {
        ...madeUp,
        home: true,
        kickoffAt,
        matchDate: utcToAmsterdam(kickoffAt).day,
        season: seasonOf(kickoffAt),
        stadium: 'Stadion Proeflaan',
        status: 'scheduled',
      },
    ])
    const [inserted] = await db.insert(matches).values(row!).$returningId()
    const matchId = inserted?.id ?? 0

    await db.insert(matchReports).values({ matchId, opponentComplete: false, source, status: 'bezig' })

    const players = [
      { name: 'Verzonnen Keeper', shirtNumber: 1 },
      { name: 'Verzonnen Verdediger', shirtNumber: 4 },
      { name: 'Verzonnen Spits', shirtNumber: 9 },
    ]
    const ids = await Promise.all(
      players.map(async (player) => {
        const [added] = await db
          .insert(matchAppearances)
          .values({ ...player, captain: false, matchId, ours: true, starter: true })
          .$returningId()

        return added?.id ?? 0
      }),
    )

    await db
      .insert(matchGoals)
      .values({ appearanceId: ids[2] ?? 0, matchId, minute: 23, ours: true, player: 'Verzonnen Spits' })
  } finally {
    await close()
  }

  return async () => {
    const connection = connectToLocalDatabase()

    try {
      // The report, its players and the goals go with the match.
      await connection.db
        .delete(matches)
        .where(
          and(
            eq(matches.competition, madeUp.competition),
            eq(matches.opponent, madeUp.opponent),
            eq(matches.round, madeUp.round),
          ),
        )
    } finally {
      await connection.close()
    }
  }
}

/** The number of the made-up match, for its screens in the admin. */
export async function liveReportMatchId() {
  const { close, db } = connectToLocalDatabase()

  try {
    const [row] = await db
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.round, madeUp.round), eq(matches.competition, madeUp.competition)))

    if (row === undefined) {
      throw new Error('There is no made-up match that is being played in the database. Did the global setup run?')
    }

    return row.id
  } finally {
    await close()
  }
}

/** The address of the page of the made-up match. */
export async function liveReportPath() {
  const { close, db } = connectToLocalDatabase()

  try {
    const [row] = await db
      .select({ matchDate: matches.matchDate, season: matches.season, slug: clubs.slug })
      .from(matches)
      .innerJoin(clubs, eq(clubs.id, matches.clubId))
      .where(and(eq(matches.round, madeUp.round), eq(matches.competition, madeUp.competition)))

    if (row === undefined) {
      throw new Error('There is no made-up match that is being played in the database. Did the global setup run?')
    }

    return `/wedstrijden/${row.season.replace('/', '-')}/${row.matchDate}-${row.slug}`
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
