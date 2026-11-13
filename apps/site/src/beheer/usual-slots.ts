import type { Database } from '@fansite/db/client'

import { matchAppearances, matchReports } from '@fansite/db/schema'
import { and, asc, eq } from 'drizzle-orm'

import { qualityPath } from './quality'

// The usual slot of a player in a 4-3-3 (issue 1193): a list to read on the page Kwaliteit. The
// place of a player in his row comes from the order of the line-up, and it is only worth
// something for a player who stood in the same slot most of the time.

/** The address of the page with the usual slots. */
export const usualSlotsPath = `${qualityPath}/plaatsen`

/** The formation whose slots are counted, and the fewest matches a player needs in it. */
export const countedFormation = '4-3-3'
export const fewestMatches = 10

/** The rows of the counted formation: the keeper, then the defence, midfield and attack. */
const rows = [1, 4, 3, 3] as const
const lines = ['keeper', 'verdediger', 'middenvelder', 'aanvaller'] as const

export type SlotCount = { count: number; place: number; row: number }

export type UsualSlot = {
  /** The line of the slot, as a word: `middenvelder`. */
  line: (typeof lines)[number]
  /** The number of matches of the player in the counted formation. */
  matches: number
  name: string
  /** The share of his matches in which he stood in this slot, 0 to 100. */
  percentage: number
  /** The place in the row from the left, from 1, and the size of the row. */
  place: number
  /** The player's most recent row of the table `players`, for the link to his form. */
  playerId: null | number
  size: number
}

/** The line-ups of ours in a 4-3-3: for each match the starters, in saved order. */
export async function readLineUpsInCountedFormation(db: Pick<Database, 'select'>) {
  const found = await db
    .select({
      matchId: matchAppearances.matchId,
      name: matchAppearances.name,
      playerId: matchAppearances.playerId,
    })
    .from(matchAppearances)
    .innerJoin(matchReports, eq(matchReports.matchId, matchAppearances.matchId))
    .where(
      and(
        eq(matchReports.formationOurs, countedFormation),
        eq(matchAppearances.ours, true),
        eq(matchAppearances.starter, true),
      ),
    )
    .orderBy(asc(matchAppearances.matchId), asc(matchAppearances.id))
  const byMatch = new Map<number, { name: string; playerId: null | number }[]>()

  for (const { matchId, ...starter } of found) {
    byMatch.set(matchId, [...(byMatch.get(matchId) ?? []), starter])
  }

  return [...byMatch.values()]
}

/**
 * The slot of each of the eleven starters of a line-up, from the keeper on, in the order of the
 * line-up: the row (0 for the keeper) and the place in the row, both from 0. Not eleven
 * starters have no slots.
 */
export function slotsOfLineUp(count: number): { place: number; row: number }[] {
  if (count !== rows.reduce((sum, size) => sum + size, 0)) {
    return []
  }

  return rows.flatMap((size, row) => Array.from({ length: size }, (_nothing, place) => ({ place, row })))
}

/** What the page shows for a slot, such as `middenvelder, 3 van 3`: the keeper has no place. */
export function slotText(slot: Pick<UsualSlot, 'line' | 'place' | 'size'>) {
  return slot.line === 'keeper' ? 'keeper' : `${slot.line}, ${slot.place} van ${slot.size}`
}

/**
 * The most usual slot of each player who started at least `fewest` matches in a 4-3-3, the
 * players who started most often first. A player who stood in two slots equally often has the
 * slot that comes first in the line-up.
 */
export function usualSlots(
  lineUps: readonly { name: string; playerId: null | number }[][],
  fewest = fewestMatches,
): UsualSlot[] {
  const players = new Map<string, { counts: Map<string, SlotCount>; matches: number; playerId: null | number }>()

  for (const lineUp of lineUps) {
    slotsOfLineUp(lineUp.length).forEach(({ place, row }, index) => {
      const starter = lineUp[index]!
      const player = players.get(starter.name) ?? { counts: new Map(), matches: 0, playerId: null }
      const key = `${row}-${place}`
      const slot = player.counts.get(key) ?? { count: 0, place, row }

      slot.count += 1
      player.counts.set(key, slot)
      player.matches += 1
      player.playerId = starter.playerId ?? player.playerId
      players.set(starter.name, player)
    })
  }

  return [...players.entries()]
    .filter(([, player]) => player.matches >= fewest)
    .map(([name, player]) => {
      const [best] = [...player.counts.values()].toSorted(
        (a, b) => b.count - a.count || a.row - b.row || a.place - b.place,
      ) as [SlotCount]

      return {
        line: lines[best.row]!,
        matches: player.matches,
        name,
        percentage: Math.round((best.count / player.matches) * 100),
        place: best.place + 1,
        playerId: player.playerId,
        size: rows[best.row]!,
      }
    })
    .toSorted((a, b) => b.matches - a.matches || a.name.localeCompare(b.name, 'nl'))
}
