import type { PlayerPosition } from '@fansite/db/schema'

import { amsterdamToUtc } from '@fansite/db/season'

// The rules of the game Fjouwer (issue 1469) as pure functions: the page and the action only
// call these, with what they read from the database. Nothing here reads or writes anything.

/** How many players a supporter chooses for a match. */
export const picksPerMatch = 4

/** How many of the four may come from the same line. */
export const maxPerLine = 2

/** In how many matches of a season a supporter may use the same player. */
export const maxUsesPerSeason = 10

/** The lines of the game, in the order of the form: from the goal to the front. */
export const fjouwerLines = ['doelman', 'verdediger', 'middenvelder', 'aanvaller'] as const

export type FjouwerLine = PlayerPosition

/** The words of a line: the legend of its group, and the plural in an error. */
export const lineWords: Record<FjouwerLine, { legend: string; plural: string; singular: string }> = {
  aanvaller: { legend: 'Aanvallers', plural: 'aanvallers', singular: 'aanvaller' },
  doelman: { legend: 'Keepers', plural: 'keepers', singular: 'keeper' },
  middenvelder: { legend: 'Middenvelders', plural: 'middenvelders', singular: 'middenvelder' },
  verdediger: { legend: 'Verdedigers', plural: 'verdedigers', singular: 'verdediger' },
}

/** The moment a choice closes: the kick-off, or 00.00 on the day of a match without a time. */
export function closesAt(match: { kickoffAt: Date | null; matchDate: string }): Date {
  return match.kickoffAt ?? amsterdamToUtc(match.matchDate, '00:00')
}

/** Whether the choice for the match is still open at `now`. */
export const isChoiceOpen = (match: { kickoffAt: Date | null; matchDate: string }, now = new Date()) =>
  closesAt(match).getTime() > now.getTime()

/** The four of a match as ids of players, or `undefined` for a supporter who never chose. */
export type Four = readonly number[]

/**
 * What a supporter has for a match: the row of the match, or else the four of the latest
 * earlier match that has a row (`inherited`). `matchIds` are the matches of the season in the
 * order they close, and `rows` the saved fours by match. A supporter who never chose before
 * this match has no four.
 */
export function fourOf(
  matchIds: readonly number[],
  rows: ReadonlyMap<number, Four>,
  matchId: number,
): undefined | { four: Four; inherited: boolean } {
  const own = rows.get(matchId)

  if (own !== undefined) {
    return { four: own, inherited: false }
  }

  const before = matchIds.slice(0, Math.max(matchIds.indexOf(matchId), 0))

  for (const id of before.toReversed()) {
    const earlier = rows.get(id)

    if (earlier !== undefined) {
      return { four: earlier, inherited: true }
    }
  }

  return undefined
}

/**
 * How many matches each player has been used in, over the matches before `matchId`. A player
 * counts when he is in the four of the supporter at the kick-off, also when the four was
 * inherited; a player who already has his ten does not count again, so no one goes above the
 * limit.
 */
export function usesBefore(
  matchIds: readonly number[],
  rows: ReadonlyMap<number, Four>,
  matchId: number,
  limit = maxUsesPerSeason,
): Map<number, number> {
  const uses = new Map<number, number>()
  const before = matchIds.slice(0, Math.max(matchIds.indexOf(matchId), 0))

  for (const id of before) {
    for (const player of fourOf(matchIds, rows, id)?.four ?? []) {
      const used = uses.get(player) ?? 0

      if (used < limit) {
        uses.set(player, used + 1)
      }
    }
  }

  return uses
}

/** How many times a player can still be used: 10 minus the matches he was used in. */
export const usesLeft = (uses: ReadonlyMap<number, number>, playerId: number, limit = maxUsesPerSeason) =>
  Math.max(limit - (uses.get(playerId) ?? 0), 0)

/** The players of an inherited four who have their ten already and so do not count. */
export const playersNotCounting = (four: Four, uses: ReadonlyMap<number, number>) =>
  four.filter((player) => usesLeft(uses, player) === 0)

export type PickCheck = { errors: PickErrors; ok: false } | { ids: number[]; ok: true }

/** What the check of a choice finds wrong: a message per line, and the rest in `general`. */
export type PickErrors = {
  general: string[]
  lines: Partial<Record<FjouwerLine, string[]>>
}

/** A player of the squad as the check needs him. */
export type SquadMember = { id: number; line: FjouwerLine; name: string }

/** The words "Kies 4 spelers. Je hebt er nu 5." */
export const countMessage = (count: number) => `Kies ${picksPerMatch} spelers. Je hebt er nu ${count}.`

/** The words "Kies hoogstens 2 middenvelders." */
export const lineMessage = (line: FjouwerLine) => `Kies hoogstens ${maxPerLine} ${lineWords[line].plural}.`

/** The words for a player who has his ten: "Dirk Proper is al 10 keer gekozen." */
export const limitMessage = (name: string) => `${name} is al ${maxUsesPerSeason} keer gekozen.`

/**
 * Checks what a form sent: the ids of the players. The same player twice, a player who is not
 * in the squad, a player who has his ten, more than two of a line and anything but four are
 * each an error. A message goes with its line when it has one. The server calls this before it
 * writes; the form only shows the answer.
 */
export function checkPicks({
  ids,
  squad,
  uses,
}: {
  ids: readonly number[]
  squad: ReadonlyMap<number, SquadMember>
  uses: ReadonlyMap<number, number>
}): PickCheck {
  const errors: PickErrors = { general: [], lines: {} }
  const addLine = (line: FjouwerLine, message: string) => {
    errors.lines[line] = [...(errors.lines[line] ?? []), message]
  }
  const unique = [...new Set(ids)]

  if (unique.length < ids.length) {
    errors.general.push('Een speler kun je maar één keer kiezen.')
  }

  const known = unique.flatMap((id) => {
    const member = squad.get(id)

    return member === undefined ? [] : [member]
  })

  if (known.length < unique.length) {
    errors.general.push('Een van de gekozen spelers is niet te kiezen voor deze wedstrijd.')
  }

  for (const member of known) {
    if (usesLeft(uses, member.id) === 0) {
      addLine(member.line, limitMessage(member.name))
    }
  }

  for (const line of fjouwerLines) {
    if (known.filter((member) => member.line === line).length > maxPerLine) {
      addLine(line, lineMessage(line))
    }
  }

  // A double or an unknown player already says why the count is off.
  if (errors.general.length === 0 && ids.length !== picksPerMatch) {
    errors.general.push(countMessage(ids.length))
  }

  const failed = errors.general.length > 0 || Object.keys(errors.lines).length > 0

  return failed ? { errors, ok: false } : { ids: known.map((member) => member.id), ok: true }
}
