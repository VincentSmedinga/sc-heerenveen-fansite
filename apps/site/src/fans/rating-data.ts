import type { Database } from '@fansite/db/client'

import { coachRatings, matchAppearances, matches, playerRatings, staff } from '@fansite/db/schema'
import { shownAppearanceName } from '@fansite/db/shown-name'
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
 * The grades of a supporter, one row for each player and for the head coach of a match (issue
 * 1478, as "Naam (trainer)", after the players): the match, the name and the grade, the newest
 * match first. The summary says how many grades in how many matches: "15 cijfers voor 1
 * wedstrijd". `undefined` for a supporter who gave none.
 */
export async function ratingData(db: Database, supporterId: number): Promise<GameData | undefined> {
  const found = await db
    .select({
      grade: playerRatings.grade,
      home: matches.home,
      matchDate: matches.matchDate,
      matchId: matches.id,
      name: shownAppearanceName(),
      opponent: matches.opponent,
    })
    .from(playerRatings)
    .innerJoin(matchAppearances, eq(matchAppearances.id, playerRatings.appearanceId))
    .innerJoin(matches, eq(matches.id, matchAppearances.matchId))
    .where(eq(playerRatings.supporterId, supporterId))
    .orderBy(desc(matches.matchDate), desc(matches.id), shownAppearanceName())

  const coaches = await db
    .select({
      grade: coachRatings.grade,
      home: matches.home,
      matchDate: matches.matchDate,
      matchId: matches.id,
      name: staff.name,
      opponent: matches.opponent,
    })
    .from(coachRatings)
    .innerJoin(matches, eq(matches.id, coachRatings.matchId))
    .innerJoin(staff, eq(staff.id, coachRatings.staffId))
    .where(eq(coachRatings.supporterId, supporterId))

  if (found.length === 0 && coaches.length === 0) {
    return undefined
  }

  const rows = [
    ...found.map((row) => ({ ...row, trainer: false })),
    ...coaches.map((row) => ({ ...row, name: `${row.name} (trainer)`, trainer: true })),
  ].toSorted(
    (a, b) =>
      b.matchDate.localeCompare(a.matchDate) ||
      b.matchId - a.matchId ||
      Number(a.trainer) - Number(b.trainer) ||
      a.name.localeCompare(b.name, 'nl'),
  )
  const matchCount = new Set(rows.map((row) => row.matchId)).size

  return {
    columns: ['Wedstrijd', 'Speler', 'Cijfer'],
    rows: rows.map((row) => {
      const sides = clubsOf(row)

      return {
        cells: [row.name, String(row.grade)],
        header: `${sides.home} – ${sides.away}, ${dateFormat.format(new Date(`${row.matchDate}T12:00:00Z`))}`,
      }
    }),
    summary: `${rows.length === 1 ? '1 cijfer' : `${rows.length} cijfers`} voor ${matchCount === 1 ? '1 wedstrijd' : `${matchCount} wedstrijden`}`,
  }
}
