import type { PlayerReportStats } from '@fansite/db/match-reports'
import type { PlayerFiguresRow, TopScorersTableRow } from '@fansite/design-system'

import { playerHref } from './player-address'
import { personNameParts, personSortName } from './player-name'

// What the cards of the page Spelers work out from the match reports (#832): the lists of the
// assists and the minutes, and the table of all the players. The numbers come from
// `readPlayerReportStats`, which counts the reports that are `klaar`; this file only puts them
// in order and in the shape the components show.

/** How many places the lists of the assists and the minutes have, as the goal scorers do. */
export const reportPlaces = 5

/** A figure the lists are for. */
export type RankedFigure = 'assists' | 'minutes'

/** The figures of the players of a season and a competition choice, and what they rest on. */
export type ReportFigures = {
  /** The played matches of the choice that have a report that is `klaar`. */
  known: number
  /** The played matches of the choice. */
  played: number
  players: PlayerReportStats[]
  /** Whether any match of the season has a report that is `klaar`, whatever the choice is. */
  seasonHasReports: boolean
}

/** What the figures rest on, in a sentence under the card: "Op basis van 12 van de 14 …". */
export function basedOnSentence({ known, played }: Pick<ReportFigures, 'known' | 'played'>): string {
  if (known === played) {
    return played === 1
      ? 'Op basis van de enige gespeelde wedstrijd.'
      : `Op basis van alle ${played} gespeelde wedstrijden.`
  }

  return `Op basis van ${known} van de ${played} gespeelde wedstrijden.`
}

/**
 * The rows of the table of all the players: everybody who stood in a report, the most minutes
 * first and then by name, so a player of the bench who did not come on is at the end with
 * zeros.
 */
export function figureRows(players: readonly PlayerReportStats[]): PlayerFiguresRow[] {
  return players
    .toSorted((a, b) => b.minutes - a.minutes || byName(a, b))
    .map((stats) => ({
      assists: stats.assists,
      goals: stats.goals,
      id: stats.playerId,
      minutes: stats.minutes,
      played: stats.matches,
      red: stats.redCards + stats.yellowRedCards,
      started: stats.starts,
      substituted: stats.substitutions,
      yellow: stats.yellowCards + stats.yellowRedCards,
      ...nameOf(stats),
      ...hrefOf(stats),
    }))
}

/**
 * The places of a list of assists or minutes: the players with more than nothing, from the most
 * down, equal figures sharing a place (the first of them is the place, so two players on the
 * second place are followed by the fourth). The list is cut to the first five places when `top`
 * is set, and a tie that reaches over the edge keeps all its players, as the goal scorers do.
 * Each place is a row, with every player who shares it.
 */
export function rankedPlaces(
  players: readonly PlayerReportStats[],
  figure: RankedFigure,
  top: boolean,
): { rows: TopScorersTableRow[]; total: number } {
  const counted = players.filter((stats) => stats[figure] > 0).toSorted((a, b) => b[figure] - a[figure] || byName(a, b))
  const rows: TopScorersTableRow[] = []

  for (const stats of counted) {
    const position = counted.findIndex((other) => other[figure] === stats[figure]) + 1
    const player = { id: stats.playerId, ...nameOf(stats), ...hrefOf(stats) }
    const last = rows.at(-1)

    if (top && position > reportPlaces) {
      continue
    }
    if (last?.position === position) {
      last.players.push(player)
    } else {
      rows.push({ goals: stats[figure], players: [player], position })
    }
  }

  return { rows, total: counted.length }
}

/** Players by name: the family name without its prefix, then the whole name. */
function byName(a: PlayerReportStats, b: PlayerReportStats) {
  return sortNameOf(a).localeCompare(sortNameOf(b), 'nl') || a.name.localeCompare(b.name, 'nl')
}

/** The page of a player of the reports, when his person has one. */
function hrefOf(stats: PlayerReportStats) {
  const href = playerHref(stats.personSlug)

  return href === undefined ? {} : { href }
}

/** A player's name in the two parts `PlayerName` shows: his person's, else the whole name. */
function nameOf(stats: PlayerReportStats) {
  return personNameParts(stats) ?? { givenName: stats.name, surname: '' }
}

/** What puts players with the same figure in order: the family name, then the whole name. */
function sortNameOf(stats: PlayerReportStats) {
  return personSortName(stats) || stats.name
}
