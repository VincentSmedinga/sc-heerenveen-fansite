import { findSquadPage, listSquad, type PublicPlayer, type PublicSearchHit, searchPublic } from '@fansite/db/queries'
import { seasonOf } from '@fansite/db/season'

import { cacheFor } from './cache'
import { getDatabase } from './database'
import { firstResults, moreResults } from './items-per-card'

/** The most characters of a search, counted as a visitor counts them. */
export const maxQueryLength = 60

/** The most words of a search. */
export const maxWords = 5

/** The fewest characters of a word. A word of two letters is a search too (LC, VI, AZ). */
export const minWordLength = 2

/** The most results /zoeken shows, however often the button is pressed. */
export const maxResults = 100

/**
 * What the address asks for with `?q=`. `none` is no search at all, such as the first visit.
 * `invalid` is a search that doesn't meet the limits: the page says what is wrong and asks
 * nothing of the database. `valid` has the words, which the database looks for, and the text
 * that is shown back to the visitor.
 */
export type Search =
  | { kind: 'invalid'; message: string; text: string }
  | { kind: 'none' }
  | { kind: 'valid'; text: string; words: string[] }

/** What the list of players on /zoeken needs, for the current season. */
export type Squad = {
  /** The Wikipedia page the squad was read from, or undefined when none was read. */
  page: Awaited<ReturnType<typeof findSquadPage>>
  players: PublicPlayer[]
  season: string
}

/** The squad as the page shows it: the players under the position they play. */
export type SquadGroup = { label: string; players: PublicPlayer[] }

const positionLabels: Record<PublicPlayer['position'], string> = {
  aanvaller: 'Aanvallers',
  doelman: 'Doelmannen',
  middenvelder: 'Middenvelders',
  verdediger: 'Verdedigers',
}

/** The positions in the order of the list, from the goal to the front. */
const positionOrder = ['doelman', 'verdediger', 'middenvelder', 'aanvaller'] as const

/**
 * The squad of the current season, with the page it was read from. It is cached for five
 * minutes like the matches, so a visit doesn't cost two queries and a new squad shows within
 * five minutes of the import.
 */
export const getSquad = cacheFor(5 * 60 * 1000, async (): Promise<Squad> => {
  const { db } = getDatabase()
  const season = seasonOf(new Date())
  const [players, page] = await Promise.all([listSquad(db, season), findSquadPage(db, season)])

  return { page, players, season }
})

/**
 * The number of results that the address asks for with `?aantal=`: a whole number from
 * `firstResults`, in steps of `moreResults`, and no more than `maxResults`. Anything else, such
 * as no number, a number twice, `5`, `12`, `0`, `-5`, `1e1`, `010`, `105` or `abc`, gives the
 * first results.
 */
export function parseResultCount(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,2}$/u.test(value)) {
    return firstResults
  }

  const count = Number(value)

  return count >= firstResults && (count - firstResults) % moreResults === 0 && count <= maxResults
    ? count
    : firstResults
}

/**
 * The search the address asks for with `?q=`, checked against the limits. Control characters
 * and runs of spaces count as one space and the ends are trimmed. A search has at most
 * `maxQueryLength` characters and `maxWords` words of at least `minWordLength` characters,
 * counted in characters and not in UTF-16 units. A parameter that is given twice counts as its
 * first value. No `q` is no search (`none`); an empty `q` is a search that asks for a word.
 */
export function parseSearch(value: string | string[] | undefined): Search {
  if (value === undefined) {
    return { kind: 'none' }
  }

  const text = (Array.isArray(value) ? (value[0] ?? '') : value).replaceAll(/[\p{Cc}\s]+/gu, ' ').trim()
  const words = text === '' ? [] : text.split(' ')
  // What is shown back never exceeds the limit, so a made-up address can't fill the field.
  const shown = [...text].slice(0, maxQueryLength).join('')

  if (words.length === 0) {
    return { kind: 'invalid', message: 'Schrijf een woord om te zoeken.', text: shown }
  }
  if ([...text].length > maxQueryLength) {
    return { kind: 'invalid', message: `Schrijf hoogstens ${maxQueryLength} tekens.`, text: shown }
  }
  if (words.length > maxWords) {
    return { kind: 'invalid', message: `Zoek op hoogstens ${maxWords} woorden.`, text: shown }
  }
  if (words.some((word) => [...word].length < minWordLength)) {
    return { kind: 'invalid', message: `Schrijf woorden van minstens ${minWordLength} tekens.`, text: shown }
  }

  return { kind: 'valid', text, words }
}

/** The address of the search for a text, such as the surname of a player. */
export function searchHref(text: string) {
  return `/zoeken?${new URLSearchParams({ q: text }).toString()}`
}

/**
 * The newest `count` results for the words, and how many there are in all. Not cached: a search
 * is the visitor's own, and a cache with an entry for every search would fill the memory of
 * the server. The words must have passed `parseSearch`, which is what protects the database.
 */
export function searchSite(words: string[], count: number): Promise<{ hits: PublicSearchHit[]; total: number }> {
  return searchPublic(getDatabase().db, { limit: count, until: new Date(), words })
}

/**
 * The players under their position, from the goal to the front, in the order the query gives
 * them. A position without players is left out.
 */
export function squadGroups(players: PublicPlayer[]): SquadGroup[] {
  return positionOrder.flatMap((position) => {
    const inPosition = players.filter((player) => player.position === position)

    return inPosition.length === 0 ? [] : [{ label: positionLabels[position], players: inPosition }]
  })
}
