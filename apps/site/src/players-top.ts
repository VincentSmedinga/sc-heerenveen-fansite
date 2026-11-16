import type { PublicMatch } from '@fansite/db/queries'
import type { TopScorersTableRow } from '@fansite/design-system'

import { matchMoment } from './match-format'

/** How many places a small card of the page Spelers shows. */
export const topPlaces = 3

/** From this many players on one place the line says how many, and names nobody. */
const namelessFrom = 3

/** The first three places of a list of places; a place with several players is one place. */
export const firstPlaces = (rows: readonly TopScorersTableRow[]) => rows.slice(0, topPlaces)

/** Whether a place has too many players to name them: the line then reads "4 spelers". */
export const isCrowded = (row: Pick<TopScorersTableRow, 'players'>) => row.players.length >= namelessFrom

/** The words of a crowded place: "4 spelers". */
export const crowdedLabel = (row: Pick<TopScorersTableRow, 'players'>) => `${row.players.length} spelers`

/**
 * The text of the line under the number of clean sheets: how many matches were played, and the
 * last time we kept a clean sheet as the score, the side, the opponent and the day, such as
 * "In 39 wedstrijden. De laatste keer: 2–0 thuis tegen NEC, zo 18 okt." Without a clean
 * sheet it says so (`when` is "dit seizoen" or "in 2025/26") and has no line about the last
 * time. `last` is the newest clean sheet, which is a played match with both scores.
 */
export function cleanSheetsLine(
  { last, played, sheets }: { last: PublicMatch | undefined; played: number; sheets: number },
  now: Date,
  when: string,
): string {
  if (sheets === 0 || last === undefined) {
    return `Nog niet de nul gehouden ${when}.`
  }

  const { time } = matchMoment(last, now)
  const score = `${last.goalsFor ?? 0}–${last.goalsAgainst ?? 0}`
  const side = last.home ? 'thuis tegen' : 'uit bij'

  return `In ${played} ${played === 1 ? 'wedstrijd' : 'wedstrijden'}. De laatste keer: ${score} ${side} ${last.opponent}, ${time}.`
}
