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
 * The start of the quality of the players and persons (#1305): the table of the persons with
 * its letters and the quick list, the names, the usual places with the quiz, and the
 * differences in the numbers and data of a season. It is under Spelers, so the bar marks that
 * screen. The season comes after the name of the list, so a season never meets a fixed name
 * on one level, as a letter of a person and `snel` do.
 */
export const playerQualityPath = '/beheer/spelers/kwaliteit'

/**
 * The list of what the stadiums and the clubs still miss (#1307): a card for each kind. It is
 * under Stadions, so the bar marks that screen. `kwaliteit` stands beside `clubs` and
 * `stadion`, the other fixed names of that level, and no club has that address part.
 */
export const stadiumQualityPath = '/beheer/stadions/kwaliteit'

/**
 * The start of the lists that have not moved yet: the persons, the names, the usual places, the
 * clubs without a country. #1306 moves them to Clubs, and this address goes with them.
 */
export const qualityPath = '/beheer/kwaliteit'

/**
 * The address of the page with the players of a season of whom the import read another value
 * than the editors set: `/beheer/spelers/kwaliteit/spelersgegevens/2026-27`.
 */
export function fieldDifferencesPath(season: string) {
  return `${playerQualityPath}/spelersgegevens/${seasonSlug(season)}`
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
 * table and the matches or the reports: `/beheer/spelers/kwaliteit/spelerscijfers/2026-27`.
 */
export function statDifferencesPath(season: string) {
  return `${playerQualityPath}/spelerscijfers/${seasonSlug(season)}`
}
