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
 * The sentence of the card De nul gehouden, in two parts so the page can bold the number:
 * `count` ("3 keer") and what follows it, "de nul gehouden in 39 wedstrijden. De laatste keer:
 * 2–0 thuis tegen NEC, zo 18 okt." The last time is the score, the side, the opponent and the
 * day. Without a clean sheet there is no `count` and the sentence says so (`when` is "dit
 * seizoen" or "in 2025/26"). `last` is the newest clean sheet, a played match with both scores.
 */
export function cleanSheetsSentence(
  { last, played, sheets }: { last: PublicMatch | undefined; played: number; sheets: number },
  now: Date,
  when: string,
): { count?: string; rest: string } {
  if (sheets === 0 || last === undefined) {
    return { rest: `Nog niet de nul gehouden ${when}.` }
  }

  const { time } = matchMoment(last, now)
  const score = `${last.goalsFor ?? 0}\u2013${last.goalsAgainst ?? 0}`
  const side = last.home ? 'thuis tegen' : 'uit bij'

  return {
    count: `${sheets} keer`,
    rest: `de nul gehouden in ${played} ${played === 1 ? 'wedstrijd' : 'wedstrijden'}. De laatste keer: ${score} ${side} ${last.opponent}, ${time}.`,
  }
}
