import { connect } from '@fansite/db/client'
import { withClubs } from '@fansite/db/clubs'
import { matchAppearances, matches, matchReports } from '@fansite/db/schema'
import { and, eq, inArray } from 'drizzle-orm'

import { databaseEnv, loopback } from './articles'

// Two made-up matches against the same made-up club for the checks of the buttons that take
// over the line-up of the previous match (#1063) and of the opponent (#1543): an earlier one,
// with a report whose line-ups are made-up names, and a later one without a report. They are
// of 2001, long before the seasons of the seed, so no page of the seed shows them, and they
// are removed after the check, by their rounds.

const rounds = { later: 'Opstelling-controle later', previous: 'Opstelling-controle vorige' } as const

/** The made-up names of the line-up and the bench of the earlier match. */
export const lineUpNames = Array.from({ length: 13 }, (_nothing, index) => `Verzonnen speler ${index + 1}`)

/** The made-up names of the opponent in the earlier match: eleven starters and a substitute. */
export const opponentNames = Array.from({ length: 12 }, (_nothing, index) => `Verzonnen tegenstander ${index + 1}`)

/** What the notice says about the earlier match. */
export const previousLabel = 'Verzonnen Vorige, 1 maart 2001'

/**
 * Puts the two matches in, with the report of the earlier one, and returns the number of the
 * later match and the function that takes both out again.
 */
export async function addPreviousLineUp() {
  const { close, db } = connectToLocalDatabase()

  try {
    await removeBoth(db)

    const [previous, later] = await withClubs(db, [
      {
        competition: 'Eredivisie',
        goalsAgainst: 0,
        goalsFor: 1,
        home: true,
        kickoffAt: new Date('2001-03-01T15:00:00Z'),
        matchDate: '2001-03-01',
        opponent: 'Verzonnen Vorige',
        round: rounds.previous,
        season: '2000/01',
        status: 'played',
      },
      {
        competition: 'Eredivisie',
        goalsAgainst: 0,
        goalsFor: 0,
        home: true,
        kickoffAt: new Date('2001-03-08T15:00:00Z'),
        matchDate: '2001-03-08',
        opponent: 'Verzonnen Vorige',
        round: rounds.later,
        season: '2000/01',
        status: 'played',
      },
    ])
    const [previousRow] = await db.insert(matches).values(previous!).$returningId()
    const [laterRow] = await db.insert(matches).values(later!).$returningId()
    const previousId = previousRow?.id ?? 0

    await db.insert(matchReports).values({
      formationOpponent: '4-4-2',
      formationOurs: '4-3-3',
      matchId: previousId,
      opponentComplete: false,
      source: 'Verzonnen wedstrijdformulier',
      status: 'bezig',
    })
    await db.insert(matchAppearances).values([
      ...lineUpNames.map((name, index) => ({
        captain: index === 0,
        matchId: previousId,
        ours: true,
        shirtNumber: index + 1,
        sourceName: name,
        starter: index < 11,
      })),
      ...opponentNames.map((name, index) => ({
        captain: index === 0,
        matchId: previousId,
        ours: false,
        shirtNumber: index + 1,
        sourceName: name,
        starter: index < 11,
      })),
    ])

    return {
      later: laterRow?.id ?? 0,
      remove: async () => {
        const connection = connectToLocalDatabase()

        try {
          await removeBoth(connection.db)
        } finally {
          await connection.close()
        }
      },
    }
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

/** Takes the two matches away, with their reports, their players and their log. */
async function removeBoth(db: ReturnType<typeof connect>['db']) {
  await db
    .delete(matches)
    .where(and(eq(matches.competition, 'Eredivisie'), inArray(matches.round, [rounds.later, rounds.previous])))
}
