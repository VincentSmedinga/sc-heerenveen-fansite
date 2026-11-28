import type { Database } from '@fansite/db/client'

import { fantasyPicks, matches, players, supporters } from '@fansite/db/schema'
import { nameInFront, shownPlayerName } from '@fansite/db/shown-name'
import { and, eq, inArray } from 'drizzle-orm'

import { cacheForKey } from '#src/cache'
import { getDatabase } from '#src/database'

import { closesAt, type Four, fourOf, playersNotCounting, usesBefore } from './fjouwer-rules'
import { countsInPrognose, crowdMinimum } from './prediction-results'

// Which players supporters had in their four for one match, as figures for a group and never
// for a person (issue 1475): the card Fjouwer on the page of a match. The figures come only
// from the kick-off, so before it nothing is read, and what was chosen is not in the memory of
// the server either.

/** How many players the card lists, and more when the fifth place is shared. */
export const listedPlayers = 5

/** A player of the card with the share of the supporters who had him in their four. */
export type ChosenPlayer = { name: string; percentage: number }

/** The figures of one match for the card. */
export type FjouwerCrowd = {
  /** How many supporters had a four at the kick-off. Blocked accounts are not counted. */
  count: number
  /** The most chosen players, the most chosen first; from `crowdMinimum` supporters. */
  players?: ChosenPlayer[]
}

const oneMinute = 60 * 1000

/**
 * The figures of one match at its kick-off: for each supporter the four of the match, or else
 * the four of the latest earlier match of the season that has one, as the game itself works it
 * out (`fourOf`). A player of an inherited four who has his ten does not count, as in the
 * points. A closed account has no supporter any more and counts for the match it chose for. A
 * match without a four has no figures (`undefined`).
 */
export async function loadFjouwerCrowd(db: Database, matchId: number): Promise<FjouwerCrowd | undefined> {
  const [match] = await db
    .select({ kickoffAt: matches.kickoffAt, matchDate: matches.matchDate, season: matches.season })
    .from(matches)
    .where(eq(matches.id, matchId))

  if (match === undefined) {
    return undefined
  }

  const season = await db
    .select({ id: matches.id, kickoffAt: matches.kickoffAt, matchDate: matches.matchDate })
    .from(matches)
    .where(and(eq(matches.season, match.season), inArray(matches.status, ['scheduled', 'played'])))
  const ids = season
    .toSorted((a, b) => closesAt(a).getTime() - closesAt(b).getTime() || a.id - b.id)
    .map((found) => found.id)
  const rows = await db
    .select({
      disabledAt: supporters.disabledAt,
      known: supporters.id,
      matchId: fantasyPicks.matchId,
      player1Id: fantasyPicks.player1Id,
      player2Id: fantasyPicks.player2Id,
      player3Id: fantasyPicks.player3Id,
      player4Id: fantasyPicks.player4Id,
      supporterId: fantasyPicks.supporterId,
    })
    .from(fantasyPicks)
    .leftJoin(supporters, eq(supporters.id, fantasyPicks.supporterId))
    .where(inArray(fantasyPicks.matchId, ids.slice(0, ids.indexOf(matchId) + 1)))
  const fours = new Map<number, Map<number, Four>>()
  let anonymous = 0

  for (const row of rows) {
    if (!countsInPrognose(row.known === null ? null : { disabledAt: row.disabledAt })) {
      continue
    }

    // A pick without a supporter can't be tied to a later match, so each one stands alone.
    const owner = row.supporterId ?? (anonymous -= 1)
    const saved = fours.get(owner) ?? new Map<number, Four>()

    saved.set(row.matchId, [row.player1Id, row.player2Id, row.player3Id, row.player4Id])
    fours.set(owner, saved)
  }

  const tally = new Map<number, number>()
  let count = 0

  for (const saved of fours.values()) {
    const have = fourOf(ids, saved, matchId)

    if (have === undefined) {
      continue
    }

    count += 1

    const notCounting = have.inherited ? playersNotCounting(have.four, usesBefore(ids, saved, matchId)) : []

    for (const player of have.four) {
      if (!notCounting.includes(player)) {
        tally.set(player, (tally.get(player) ?? 0) + 1)
      }
    }
  }

  if (count === 0) {
    return undefined
  }
  if (count < crowdMinimum) {
    return { count }
  }

  return { count, players: await chosenPlayers(db, tally, count) }
}

/**
 * The players of the card from their numbers of choices: the most chosen first, then by name,
 * five of them and more when the fifth place is shared.
 */
async function chosenPlayers(db: Database, tally: ReadonlyMap<number, number>, count: number): Promise<ChosenPlayer[]> {
  const sorted = [...tally].toSorted((a, b) => b[1] - a[1])
  const limit = sorted[listedPlayers - 1]?.[1] ?? 0
  const top = sorted.filter(([, times]) => times >= limit && times > 0)
  const rows = await db
    .select({ id: players.id, name: nameInFront(shownPlayerName()) })
    .from(players)
    .where(
      inArray(
        players.id,
        top.map(([id]) => id),
      ),
    )
  const names = new Map(rows.map((row) => [row.id, row.name]))

  return top
    .map(([id, times]) => ({
      name: names.get(id) ?? '',
      percentage: Math.round((times / count) * 100),
      times,
    }))
    .filter((player) => player.name !== '')
    .toSorted((a, b) => b.times - a.times || a.name.localeCompare(b.name, 'nl'))
    .map(({ name, percentage }) => ({ name, percentage }))
}

const getFjouwerCrowd = cacheForKey(oneMinute, (key) => loadFjouwerCrowd(getDatabase().db, Number(key)))

/**
 * The figures of one match, read once a minute for each match, so the page of a match is the
 * same for every visitor and asks the database little. The caller asks only for matches that
 * have a page and whose kick-off has been, so the keys are matches that exist.
 */
export const fjouwerCrowd = (matchId: number) => getFjouwerCrowd(String(matchId))
