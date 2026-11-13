import type { Database } from '@fansite/db/client'

import { persons, players, type PlayerSide, playerSides } from '@fansite/db/schema'
import { asc, inArray } from 'drizzle-orm'

import { editPerson } from './person-form'
import { positionChoices } from './player-fields'
import { readLineUpsInCountedFormation, slotText, usualSlots, usualSlotsPath } from './usual-slots'

// The quiz for the side of a player (issue 1194): the players of the list of usual slots
// (issue 1193) who have no side yet, one at a time, the players who always stood in the same
// slot first. The editor says Links, Midden or Rechts, or skips him. The answer is the side
// of the person, as the form of the person has it, with the same line in the log.

/** The address of the quiz. */
export const sideQuizPath = `${usualSlotsPath}/vragen`

/** The most skipped players the address keeps, so it does not grow without end. */
const mostSkipped = 200

/** One player to ask about. */
export type SideQuestion = {
  /** The line of the person as a word, or an empty string. */
  line: string
  matches: number
  name: string
  percentage: number
  personId: number
  /** The usual slot the old line-ups give him, such as `middenvelder, 3 van 3`. */
  slot: string
  /** His years in the squad: `2004–2007`. */
  years: string
}

/** Gives a person the side the editor chose. Returns whether it was saved. */
export async function answerSide(db: Database, userId: number, personId: number, side: PlayerSide, now = new Date()) {
  const outcome = await editPerson(db, userId, personId, { reason: undefined, side }, now)

  return outcome.status === 'changed' || outcome.status === 'unchanged'
}

/** Whether a word from the form is a side. */
export function isSide(value: unknown): value is PlayerSide {
  return (playerSides as readonly unknown[]).includes(value)
}

/** The players who were skipped, from the address: numbers separated by commas. */
export function parseSkipped(value: string | undefined): number[] {
  return (value ?? '')
    .split(',')
    .map(Number)
    .filter((number) => Number.isInteger(number) && number > 0)
    .slice(-mostSkipped)
}

/**
 * The next player without a side who is not in `skipped`, and how many are left, or `undefined`
 * when everybody has one. A person who has two names in the line-ups comes once.
 */
export async function readNextQuestion(
  db: Database,
  skipped: readonly number[],
): Promise<undefined | { left: number; question: SideQuestion }> {
  const slots = usualSlots(await readLineUpsInCountedFormation(db))
  const playerIds = slots.flatMap((slot) => (slot.playerId === null ? [] : [slot.playerId]))

  if (playerIds.length === 0) {
    return undefined
  }

  const rows = await db
    .select({ id: players.id, personId: players.personId, season: players.season })
    .from(players)
    .where(inArray(players.id, playerIds))
    .orderBy(asc(players.season))
  const personIds = [...new Set(rows.flatMap((row) => (row.personId === null ? [] : [row.personId])))]
  const found = personIds.length === 0 ? [] : await db.select().from(persons).where(inArray(persons.id, personIds))
  const person = new Map(found.map((row) => [row.id, row]))
  const personOfPlayer = new Map(rows.map((row) => [row.id, row.personId]))
  const seasons = new Map<number, string[]>()

  for (const row of await db
    .select({ personId: players.personId, season: players.season })
    .from(players)
    .where(inArray(players.personId, personIds.length === 0 ? [0] : personIds))
    .orderBy(asc(players.season))) {
    if (row.personId !== null) {
      seasons.set(row.personId, [...(seasons.get(row.personId) ?? []), row.season])
    }
  }

  const asked = new Set<number>()
  const open: SideQuestion[] = []

  for (const slot of slots) {
    const personId = slot.playerId === null ? null : (personOfPlayer.get(slot.playerId) ?? null)
    const one = personId === null ? undefined : person.get(personId)

    if (personId === null || one === undefined || asked.has(personId) || one.side !== null) {
      continue
    }

    asked.add(personId)

    open.push({
      line: positionChoices.find((choice) => choice.value === one.line)?.label.toLowerCase() ?? '',
      matches: slot.matches,
      name: one.name ?? slot.name,
      percentage: slot.percentage,
      personId,
      slot: slotText(slot),
      years: yearsOf(seasons.get(personId) ?? []),
    })
  }

  const waiting = open.toSorted((a, b) => b.percentage - a.percentage || b.matches - a.matches)
  const remaining = waiting.filter((question) => !skipped.includes(question.personId))
  const [question] = remaining

  return question === undefined ? undefined : { left: remaining.length, question }
}

/** The address of the quiz with the players that were skipped, and the one just answered. */
export function sideQuizAddress(skipped: readonly number[], answered?: number) {
  const query = new URLSearchParams()

  if (skipped.length > 0) {
    query.set('over', skipped.join(','))
  }
  if (answered !== undefined) {
    query.set('gedaan', String(answered))
  }

  const text = query.toString()

  return text === '' ? sideQuizPath : `${sideQuizPath}?${text}`
}

/** The years of the seasons of a person, such as `2004–2007`, or the one season. */
function yearsOf(seasons: readonly string[]) {
  const first = seasons[0]
  const last = seasons.at(-1)

  return first === undefined || last === undefined || first === last
    ? (first ?? '')
    : `${first.slice(0, 4)}–${Number(last.slice(0, 4)) + 1}`
}
