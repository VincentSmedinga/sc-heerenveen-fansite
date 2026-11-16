import type { Database } from '@fansite/db/client'

import { players } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'

import { seasonSlug } from '../seasons'

// The addresses of the quality pages of the admin, and whether a season has a player to choose
// for a goal. The table of the matches is in quality-table.ts.

/**
 * The start of the quality of the matches (#1304): the table of the gaps for each season, with
 * the table of one season and the unusual formations under it. It is under Wedstrijden, so the
 * bar marks that screen. The name Kwaliteit stays out of the address of every other screen.
 */
export const matchQualityPath = '/beheer/wedstrijden/kwaliteit'

/**
 * The start of the lists that have not moved yet: the persons, the names, the usual places, the
 * clubs without a country and the differences in the numbers and data of players. #1305 and
 * #1306 move them to their own subject, and this address goes with the last of them.
 */
export const qualityPath = '/beheer/kwaliteit'

/**
 * The address of the page with the players of a season of whom the import read another value
 * than the editors set: `/beheer/kwaliteit/2026-27/spelersgegevens`.
 */
export function fieldDifferencesPath(season: string) {
  return `${qualityPath}/${seasonSlug(season)}/spelersgegevens`
}

/**
 * Whether a season has a player at all. Without one, an editor has nobody to choose for a goal
 * and adds the players first.
 */
export async function seasonHasPlayers(db: Pick<Database, 'select'>, season: string) {
  const [found] = await db.select({ id: players.id }).from(players).where(eq(players.season, season)).limit(1)

  return found !== undefined
}

/**
 * The address of the page with the players of a season whose numbers differ between the squad
 * table and the matches or the reports: `/beheer/kwaliteit/2026-27/spelerscijfers`.
 */
export function statDifferencesPath(season: string) {
  return `${qualityPath}/${seasonSlug(season)}/spelerscijfers`
}
