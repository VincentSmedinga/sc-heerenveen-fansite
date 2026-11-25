import { amsterdamToUtc } from '@fansite/db/season'
import { type FansPart, isFansPartOn } from '@fansite/shared/fans-env'

import { getDatabase } from '#src/database'
import { reasonOf } from '#src/errors'

import { currentMonth, loadMonthQuiz } from './fantest-entry'
import { fjouwerMatch } from './fjouwer'
import { closesAt } from './fjouwer-rules'
import { isOpen, type PredictionMatch, predictionMatches } from './prediction'
import { findRatingWindow } from './rating'

// Which games of Fans are open now (issue 1645). This is the one place that answers it, for the
// cards on the home page, the links on Wedstrijden and the page Fans. It reads nothing
// personal, so what follows from it is the same for every visitor.

/** The games, in the order the site shows them. */
export const openGameNames = ['prognose', 'uitblinker', 'fjouwer', 'fantest'] as const

/** A game that is open, with the moment it closes. */
export type OpenGame =
  | { closesAt: Date; game: 'fantest'; month: number }
  | { closesAt: Date; game: Exclude<OpenGameName, 'fantest'>; match: OpenMatch }

export type OpenGameName = (typeof openGameNames)[number]

/** What the site says of the match a game is open for. */
export type OpenMatch = Pick<PredictionMatch, 'competition' | 'home' | 'opponent' | 'round' | 'season'>

const partOf = {
  fantest: 'fantest',
  fjouwer: 'vier',
  prognose: 'prognose',
  uitblinker: 'uitblinker',
} as const satisfies Record<OpenGameName, FansPart>

type Database = ReturnType<typeof getDatabase>['db']

const readers: Record<OpenGameName, (db: Database, now: Date) => Promise<OpenGame | undefined>> = {
  // A quiz runs to the last day of its month, so it closes as the next month begins.
  async fantest(db, now) {
    if ((await loadMonthQuiz(db, now)) === undefined) {
      return undefined
    }

    const { month, year } = currentMonth(now)
    const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`

    return { closesAt: amsterdamToUtc(next, '00:00'), game: 'fantest', month }
  },
  async fjouwer(db, now) {
    const match = await fjouwerMatch(db, now)

    return match === undefined ? undefined : { closesAt: closesAt(match), game: 'fjouwer', match }
  },
  async prognose(db, now) {
    const { next } = await predictionMatches(db, now)

    return next === undefined || next.kickoffAt === null || !isOpen(next, now)
      ? undefined
      : { closesAt: next.kickoffAt, game: 'prognose', match: next }
  },
  async uitblinker(db, now) {
    const window = await findRatingWindow(db, now)

    return window.state === 'open' ? { closesAt: window.closesAt, game: 'uitblinker', match: window.match } : undefined
  },
}

/**
 * The games of `wanted` that are switched on and open at `now`, in the order of
 * `openGameNames`. A game that can't be read is left out and logged, so the others stay.
 */
export async function loadOpenGames(
  now = new Date(),
  wanted: readonly OpenGameName[] = openGameNames,
): Promise<OpenGame[]> {
  const found = await Promise.all(
    openGameNames
      .filter((game) => wanted.includes(game))
      .map(async (game) => {
        try {
          return isFansPartOn(partOf[game]) ? await readers[game](getDatabase().db, now) : undefined
        } catch (error) {
          console.error(`Could not read whether the game ${game} is open: ${reasonOf(error)}`)

          return undefined
        }
      }),
  )

  return found.filter((game) => game !== undefined)
}
