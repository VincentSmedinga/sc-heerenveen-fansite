import type { Database } from '@fansite/db/client'

import { players } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'

import { seasonSlug } from '../seasons'

// The addresses of the page Kwaliteit of the admin and of the pages of a season under it, and
// whether a season has a player to choose for a goal. The table itself is in quality-table.ts.

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
