import { seasonOf } from '@fansite/db/season'
import { isFansPartOn } from '@fansite/shared/fans-env'

import { getDatabase } from '#src/database'
import { reasonOf } from '#src/errors'
import { gradeText, supportersText } from '#src/MatchRatingsCard'
import { yearWinnersSource } from '#src/SupporterRatingsCards'

import { latestResult, resultLine } from './match-ratings'
import { clubsOf } from './prediction'
import { findRatingWindow } from './rating'
import { isOldSeason, ratingFigures, ratingsLine, yearWinners } from './season-ratings'

// What the card Uitblinker on the page Spelers says of a season (issue 1647): a season that is
// over has its Uitblinker of the year, and the running season the Uitblinker of the last match
// with a result and the way to give grades while the window is open.

export type SeasonUitblinker =
  | {
      kind: 'last-match'
      /** The match that can be rated now, in words, or nothing while the window is closed. */
      openMatch?: string
      /** The star and how many fans gave grades, or nothing while there is no result. */
      result?: { star: UitblinkerStar; supporters: string }
    }
  | { kind: 'year'; source?: string; stars: UitblinkerStar[] }

/** One star of the card. */
export type UitblinkerStar = { average: string; label: string; line: string; name: string }

/**
 * The card of the season at `now`, or nothing: while the game is off, for a season without a
 * Uitblinker or an open window, and when the reading fails, which is logged.
 */
export async function readSeasonUitblinker(season: string, now = new Date()): Promise<SeasonUitblinker | undefined> {
  try {
    if (!isFansPartOn('uitblinker')) {
      return undefined
    }

    return season === seasonOf(now) ? await lastMatchOf(season, now) : await yearOf(season, now)
  } catch (error) {
    console.error(`Could not read the Uitblinker of ${season} for the page Spelers: ${reasonOf(error)}`)

    return undefined
  }
}

async function lastMatchOf(season: string, now: Date): Promise<SeasonUitblinker | undefined> {
  const [window, latest] = await Promise.all([findRatingWindow(getDatabase().db, now), latestResult()])
  const open = window.state === 'open' && window.match.season === season ? clubsOf(window.match) : undefined
  // The latest result may be of the season before, while this one has none yet.
  const winner = latest?.match.season === season ? latest.ratings.winner : undefined

  if (open === undefined && winner === undefined) {
    return undefined
  }

  return {
    kind: 'last-match',
    ...(open === undefined ? {} : { openMatch: `${open.home} – ${open.away}` }),
    ...(winner === undefined || latest === undefined
      ? {}
      : {
          result: {
            star: {
              average: gradeText(winner.average),
              label: 'Uitblinker vorige wedstrijd',
              line: resultLine(latest.match),
              name: winner.name,
            },
            supporters: `${supportersText(latest.ratings.supporters)}.`,
          },
        }),
  }
}

async function yearOf(season: string, now: Date): Promise<SeasonUitblinker | undefined> {
  const data = await ratingFigures()
  const winner = yearWinners(data, now).find((row) => row.season === season)
  const average = winner?.average

  if (winner === undefined || average === undefined) {
    return undefined
  }

  return {
    kind: 'year',
    stars: winner.players.map((player) => ({
      average: gradeText(average),
      label: 'Uitblinker van het jaar',
      line: ratingsLine(player.ratings),
      name: player.name,
    })),
    ...(isOldSeason(data, season) ? { source: yearWinnersSource } : {}),
  }
}
