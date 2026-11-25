import { getDatabase } from '#src/database'
import { reasonOf } from '#src/errors'
import { latestResult, loadRunningRatings, resultLine, supportersIn } from '#src/fans/match-ratings'
import {
  closingText,
  findOwnCoachRating,
  findOwnRatings,
  findRatingWindow,
  type RatingMatch,
  ratingPath,
  type RatingWindow,
} from '#src/fans/rating'
import { matchMoment } from '#src/match-format'
import { gradeText, supportersText } from '#src/MatchRatingsCard'

import {
  type CardSupporter,
  closedTag,
  countLines,
  type GameCardData,
  openTag,
  playerOf,
  todoTag,
} from './game-card-data'

// The card of the game Uitblinker on the page Fans (issues 1470 and 1646): how the game stands,
// the match and the number of fans who gave grades while the window is open, the Uitblinker of
// the last match with a result (issue 1472), and for a supporter who takes part the button that
// goes to the form.

/** What the window and the supporter make of the card, without the figures. */
export type UitblinkerState = Pick<GameCardData, 'action' | 'lines' | 'tag'>

/**
 * Reads what the card needs: the window, and how many grades the supporter gave. A failure is
 * logged and leaves the card out, so the page of Fans goes on.
 */
export async function readUitblinkerCard(
  supporter: CardSupporter | undefined,
  now = new Date(),
): Promise<GameCardData | undefined> {
  try {
    const { db } = getDatabase()
    const player = playerOf(supporter)
    const window = await findRatingWindow(db, now)
    const grades =
      player === undefined || window.state !== 'open'
        ? 0
        : (await findOwnRatings(db, player.id, window.match.id)).size +
          (window.coach !== null && (await findOwnCoachRating(db, player.id, window.match.id)) !== undefined ? 1 : 0)
    const state = uitblinkerCardState(
      window,
      player === undefined ? undefined : { createdAt: player.createdAt, grades },
      now,
    )
    const running = window.state === 'open' ? supportersIn(await loadRunningRatings(db, window.match.id)) : 0
    const latest = await latestResult()
    const match = window.state === 'open' ? ratedMatch(window.match, now) : undefined

    return {
      ...state,
      game: 'uitblinker',
      lines: [...state.lines, ...countLines(running, 'gaf al cijfers', 'gaven al cijfers')],
      ...(match === undefined ? {} : { match }),
      heading: 'Uitblinker',
      ...(latest === undefined
        ? {}
        : {
            winner: {
              count: `${supportersText(latest.ratings.supporters)}.`,
              ...(latest.ratings.winner === undefined
                ? {}
                : {
                    star: {
                      average: gradeText(latest.ratings.winner.average),
                      line: resultLine(latest.match),
                      name: latest.ratings.winner.name,
                    },
                  }),
            },
          }),
    }
  } catch (error) {
    console.error(`Could not read the game Uitblinker for the page Fans: ${reasonOf(error)}`)

    return undefined
  }
}

/**
 * Works out what the card says from the window and from what the supporter did. `supporter`
 * is empty for a visitor who is not logged in, and for a blocked account. An account that was
 * made after the match began does not take part in it, so it gets no button and no "Nog te
 * doen".
 */
export function uitblinkerCardState(
  window: RatingWindow,
  supporter?: { createdAt: Date; grades: number },
  now = new Date(),
): UitblinkerState {
  const link = (label: string) => ({ href: ratingPath, label, type: 'link' }) as const

  if (window.state === 'none' || window.state === 'closed') {
    return {
      action: link('Naar de Uitblinker'),
      lines: [
        'Geef de spelers en de trainer na elke wedstrijd een cijfer. Het venster van de laatste wedstrijd is dicht.',
      ],
      tag: closedTag,
    }
  }

  if (window.state === 'waiting') {
    return {
      action: link('Naar de Uitblinker'),
      lines: [
        'Het verslag van de laatste wedstrijd is nog niet af. Zodra de redactie weet wie hoe lang speelde, kun je cijfers geven.',
      ],
      tag: { text: 'Nog niet open', tone: 'neutral' },
    }
  }

  // The head coach counts as one more to rate, whenever the match has one.
  const players = window.players.length
  const toRate = players + (window.coach === null ? 0 : 1)
  const takesPart = supporter !== undefined && supporter.createdAt.getTime() < window.startsAt.getTime()

  if (!takesPart) {
    return {
      action: link('Naar de Uitblinker'),
      lines: [`Geef de spelers${window.coach === null ? '' : ' en de trainer'} van de laatste wedstrijd een cijfer.`],
      tag: openTag(window.closesAt, now),
    }
  }

  return {
    action: { href: ratingPath, label: 'Cijfers geven', type: 'button' },
    lines: [
      `Geef ${players} spelers${window.coach === null ? '' : ' en de trainer'} een cijfer. Kan tot ${closingText(window.closesAt)}.`,
    ],
    tag: supporter.grades >= toRate ? openTag(window.closesAt, now) : todoTag,
  }
}

/** The match that can be rated, with its result, as the design system shows it. */
function ratedMatch(match: RatingMatch, now: Date): GameCardData['match'] {
  if (match.goalsFor === null || match.goalsAgainst === null) {
    return undefined
  }

  return {
    competition: match.competition,
    ...matchMoment(match, now),
    extraTime: match.extraTime,
    goalsAgainst: match.goalsAgainst,
    goalsFor: match.goalsFor,
    home: match.home,
    opponent: match.opponent,
    round: match.round,
    status: 'played',
  }
}
