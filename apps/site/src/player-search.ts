import type { FoundPlayer } from '@fansite/db/person-slugs'

import { maxFoundPlayers, searchPlayers } from '@fansite/db/person-slugs'

import { getDatabase } from './database'
import { personNameParts, splitPersonName } from './player-name'

/** The address of the search for a player (#1130). */
export const playerSearchPath = '/spelers/zoeken'

/** The most players the page shows. */
export const shownPlayers = maxFoundPlayers

/**
 * The players whose name has each of the words, ten at most, and how many there are in all.
 * Not cached: a search is the visitor's own. The words must have passed `parseSearch`.
 */
export function findPlayers(words: string[]): Promise<{ players: FoundPlayer[]; total: number }> {
  return searchPlayers(getDatabase().db, { limit: shownPlayers, words })
}

/**
 * The seasons of a player in one phrase: `2019/20 – 2023/24` from the first to the last, and
 * the season alone for one. Empty when we know none.
 */
export function seasonsOf(seasons: readonly string[]): string {
  const first = seasons.at(0)
  const last = seasons.at(-1)

  return first === undefined || last === undefined ? '' : first === last ? first : `${first} – ${last}`
}

/** The line as a word with a capital, such as `Doelman`. */
const lineWord = (line: null | string) => (line === null ? '' : `${line.charAt(0).toUpperCase()}${line.slice(1)}`)

/** What a result says under the name: the line and the seasons, left out when unknown. */
export const factsOf = (player: Pick<FoundPlayer, 'line' | 'seasons'>): string =>
  [lineWord(player.line), seasonsOf(player.seasons)].filter((part) => part !== '').join(' · ')

/**
 * The name of a result as `PlayerName` shows it: the given name and the surname with its
 * prefix, as the importer kept them, or the name as text split the way of the other pages.
 */
export function nameOf(player: FoundPlayer): { givenName?: string | undefined; surname: string } {
  return (
    personNameParts({
      personFamilyName: player.familyName,
      personFamilyNamePrefix: player.familyNamePrefix,
      personGivenName: player.givenName,
    }) ?? splitPersonName(player.name ?? player.slug)
  )
}
