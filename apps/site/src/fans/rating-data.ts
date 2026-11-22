import type { Database } from '@fansite/db/client'

import { matchAppearances, matches, playerRatings } from '@fansite/db/schema'
import { desc, eq } from 'drizzle-orm'

import type { GameData } from './my-data'

import { clubsOf } from './prediction'

// What the game Uitblinker keeps of a supporter (issue 1470), for the page "Alles wat we van je
// bewaren" and the card "Wat je speelde": the grades the supporter gave, with the match.

const dateFormat = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Amsterdam',
  year: 'numeric',
})

/**
 * The grades of a supporter, one row for each player: the match, the player and the grade, the
 * newest match first. The summary says how many grades in how many matches: "15 cijfers voor 1
 * wedstrijd". `undefined` for a supporter who gave none.
 */
export async function ratingData(db: Database, supporterId: number): Promise<GameData | undefined> {
  const found = await db
    .select({
      grade: playerRatings.grade,
      home: matches.home,
      matchDate: matches.matchDate,
      matchId: matches.id,
      name: matchAppearances.name,
      opponent: matches.opponent,
    })
    .from(playerRatings)
    .innerJoin(matchAppearances, eq(matchAppearances.id, playerRatings.appearanceId))
    .innerJoin(matches, eq(matches.id, matchAppearances.matchId))
    .where(eq(playerRatings.supporterId, supporterId))
    .orderBy(desc(matches.matchDate), desc(matches.id), matchAppearances.name)

  if (found.length === 0) {
    return undefined
  }

  const matchCount = new Set(found.map((row) => row.matchId)).size

  return {
    columns: ['Wedstrijd', 'Speler', 'Cijfer'],
    rows: found.map((row) => {
      const sides = clubsOf(row)

      return {
        cells: [row.name, String(row.grade)],
        header: `${sides.home} – ${sides.away}, ${dateFormat.format(new Date(`${row.matchDate}T12:00:00Z`))}`,
      }
    }),
    summary: `${found.length === 1 ? '1 cijfer' : `${found.length} cijfers`} voor ${matchCount === 1 ? '1 wedstrijd' : `${matchCount} wedstrijden`}`,
  }
}
