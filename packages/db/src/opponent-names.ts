import { and, asc, eq } from 'drizzle-orm'

import type { Database } from './client.ts'

import { clubSquadPlayers, matchAppearances, matches } from './schema.ts'
import { shownAppearanceName, shownClubPlayerName } from './shown-name.ts'

/**
 * The names a form offers for a player of this club (#1542): first the squad of the club
 * (#1541), in the order of the shirt numbers and then by name, and after it the names of its
 * players in earlier reports, also when they have no person, each name once. A name that only
 * differs in capitals or spaces from one that is already in the list is left out. Without a
 * squad that was read, the list is the names from earlier reports.
 */
export async function readOpponentNames(db: Pick<Database, 'select'>, clubId: number): Promise<string[]> {
  const squad = await db
    .select({ name: shownClubPlayerName() })
    .from(clubSquadPlayers)
    .where(eq(clubSquadPlayers.clubId, clubId))
    .orderBy(asc(clubSquadPlayers.shirtNumber), asc(shownClubPlayerName()))
  const earlier = await db
    .select({ name: shownAppearanceName() })
    .from(matchAppearances)
    .innerJoin(matches, eq(matches.id, matchAppearances.matchId))
    .where(and(eq(matches.clubId, clubId), eq(matchAppearances.ours, false)))
    .orderBy(asc(shownAppearanceName()))
  const seen = new Set<string>()
  const names: string[] = []

  for (const { name } of [...squad, ...earlier]) {
    const trimmed = name.trim()
    const key = trimmed.toLocaleLowerCase('nl')

    if (trimmed !== '' && !seen.has(key)) {
      seen.add(key)
      names.push(trimmed)
    }
  }

  return names
}
