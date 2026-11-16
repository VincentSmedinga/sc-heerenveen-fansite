import type { PublicLeagueResult, PublicStandingsRow } from '@fansite/db/queries'
import type { FormResult } from '@fansite/design-system'

import { formOf } from './upcoming-match'

/** The name of our own club in the table and in the results. */
const ourClub = 'sc Heerenveen'

/** How many clubs may stand between the two before the stretch leaves them out. */
const clubsShownBetween = 3

/** A row of the stretch of the table: a club, or the row that says how many clubs are left. */
export type StandingSliceItem =
  { hidden: number; kind: 'gap' } | { kind: 'club'; marked: boolean; row: PublicStandingsRow }

/**
 * The stretch of the table from one club to the other, the first place first. With at most
 * three clubs between them the whole stretch is there. With more, each club has its neighbour
 * above and below and one row says how many clubs are left out; a club at the top or at the
 * bottom of the table has no neighbour on that side. Without both clubs in the table there is
 * no stretch.
 */
export function standingSliceOf(
  rows: readonly PublicStandingsRow[],
  opponent: string,
): StandingSliceItem[] | undefined {
  const sorted = rows.toSorted((a, b) => a.position - b.position)
  const ours = sorted.findIndex((row) => row.club === ourClub)
  const theirs = sorted.findIndex((row) => row.club === opponent)

  if (ours === -1 || theirs === -1 || ours === theirs) {
    return undefined
  }

  const first = Math.min(ours, theirs)
  const last = Math.max(ours, theirs)
  const club = (index: number): StandingSliceItem[] => {
    const row = sorted[index]

    return row === undefined ? [] : [{ kind: 'club', marked: index === first || index === last, row }]
  }
  const between = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, offset) => club(from + offset)).flat()

  if (last - first - 1 <= clubsShownBetween) {
    return between(first, last)
  }

  return [...between(first - 1, first + 1), { hidden: last - first - 3, kind: 'gap' }, ...between(last - 1, last + 1)]
}

const numberWords = [
  'nul',
  'één',
  'twee',
  'drie',
  'vier',
  'vijf',
  'zes',
  'zeven',
  'acht',
  'negen',
  'tien',
  'elf',
  'twaalf',
  'dertien',
  'veertien',
  'vijftien',
  'zestien',
  'zeventien',
  'achttien',
  'negentien',
  'twintig',
]

/** A number in words up to twenty, and in figures above that. */
const wordOf = (count: number) => numberWords[count] ?? String(count)

/**
 * The line under the table, from our side: "We staan drie plekken en zes punten boven FC
 * Groningen." Below the other club it says "onder", and with the same points it says so:
 * "We staan twee plekken boven FC Groningen, met evenveel punten."
 */
export function standingSentenceOf(rows: readonly PublicStandingsRow[], opponent: string): string | undefined {
  const ours = rows.find((row) => row.club === ourClub)
  const theirs = rows.find((row) => row.club === opponent)

  if (ours === undefined || theirs === undefined || ours.position === theirs.position) {
    return undefined
  }

  const places = Math.abs(ours.position - theirs.position)
  const points = Math.abs(ours.points - theirs.points)
  const side = ours.position < theirs.position ? 'boven' : 'onder'
  const placesText = `${wordOf(places)} ${places === 1 ? 'plek' : 'plekken'}`

  return points === 0
    ? `We staan ${placesText} ${side} ${opponent}, met evenveel punten.`
    : `We staan ${placesText} en ${wordOf(points)} ${points === 1 ? 'punt' : 'punten'} ${side} ${opponent}.`
}

/** The round the table holds for: the most matches any club has played. */
export const standingRoundOf = (rows: readonly PublicStandingsRow[]) => Math.max(0, ...rows.map((row) => row.played))

/** The form of one club: the marks, the oldest first, and what they add up to. */
export type ClubForm = { club: string; goalsAgainst: number; goalsFor: number; marks: FormResult[]; points: number }

/**
 * The form of the two clubs of a match, ours first: the last five league results of each. A
 * club without a result has no row, so the result can be shorter than two, or empty.
 */
export function formsOf(results: readonly PublicLeagueResult[], opponent: string): ClubForm[] {
  return [ourClub, opponent].flatMap((club) => {
    const form = formOf(results, club)

    return form.marks.length === 0 ? [] : [{ club, ...form }]
  })
}
