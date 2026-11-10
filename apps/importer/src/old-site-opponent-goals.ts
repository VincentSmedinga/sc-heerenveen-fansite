// The step `doelpunten tegen ons` of `import:old-site` (#1054): links a goal of a player of
// the opponent in the old seasons to the person of ours with exactly that name. The goals of
// the old fansite are names only (`old-site-goals.ts`), so a man who played for us and scored
// against us has his goals for us on his person and his goals against us as a name. Only
// `person_id` is set: the link to Wikipedia stays empty, because an equal name can be a
// namesake.
import type { Database } from '@fansite/db/client'

import { opponentGoalNamesakes, personsWhoDiffer } from '@fansite/db/persons'
import { matchEdits, matches, matchGoals, matchReports, persons, players } from '@fansite/db/schema'
import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm'

import type { OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

import { oldSiteSource } from './old-site-matches.ts'

/** The names the step never links: the namesakes of the owner, and the persons who differ. */
export type OpponentGoalExclusions = {
  /** Groups of names of persons who look alike and are different people. */
  differ: readonly (readonly string[])[]
  /** Names that the owner said belong to a namesake. */
  namesakes: readonly string[]
}

/** What the step and the report read: the goals of the old seasons and the persons of ours. */
type Reader = Pick<Database, 'select'>

export const defaultExclusions: OpponentGoalExclusions = {
  differ: personsWhoDiffer,
  namesakes: opponentGoalNamesakes,
}

/** A linked name, with the seasons it scored against us and the seasons it played for us. */
export type LinkedOpponentName = { against: string[]; for: string[]; name: string }

/** Why a name is not linked: two persons have it, the owner said so, or no person has it. */
export type NameDecision =
  | { kind: 'ambiguous'; personIds: number[] }
  | { kind: 'excluded' }
  | { kind: 'linked'; personId: number }
  | { kind: 'none' }

/** One goal of an opponent in a match of the old fansite, and what it is linked to. */
export type OpponentGoal = { id: number; matchId: number; name: string; personId: null | number; season: string }

/** What `import:status` shows about the goals against us that got a person, by season. */
export type OpponentGoalReport = {
  names: LinkedOpponentName[]
  seasons: { ambiguous: number; linked: number; season: string }[]
}

/** What to do with the goals of one name. Pure. */
export function decideName(
  name: string,
  byName: ReadonlyMap<string, readonly number[]>,
  exclusions: OpponentGoalExclusions = defaultExclusions,
): NameDecision {
  const ids = byName.get(name) ?? []

  if (ids.length === 0) {
    return { kind: 'none' }
  }
  if (exclusions.namesakes.includes(name) || exclusions.differ.some((group) => group.includes(name))) {
    return { kind: 'excluded' }
  }

  return ids.length === 1 ? { kind: 'linked', personId: ids[0]! } : { kind: 'ambiguous', personIds: [...ids] }
}

/**
 * Links the goals of the opponents in the old seasons to the person with that name, and takes
 * a link away that no longer holds (a namesake was added to the list, a second person got the
 * name). A goal of a match the editors filled in or reported is skipped. A second run changes
 * nothing.
 */
export async function importOldSiteOpponentGoals(
  db: OldSiteDatabase,
  exclusions: OpponentGoalExclusions = defaultExclusions,
): Promise<OldSiteStepReport> {
  const report: OldSiteStepReport = { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
  const byName = personIdsByName(await db.select({ id: persons.id, name: persons.name }).from(persons))
  const goals = await readOpponentGoals(db)
  const decisions = new Map<string, NameDecision>()
  const toLink = new Map<number, number[]>()
  const toClear: number[] = []

  for (const goal of goals) {
    const decision = decisions.get(goal.name) ?? decideName(goal.name, byName, exclusions)

    decisions.set(goal.name, decision)

    const wanted = decision.kind === 'linked' ? decision.personId : null

    if (goal.personId === wanted) {
      report.unchanged += 1
    } else if (wanted === null) {
      toClear.push(goal.id)
    } else {
      toLink.set(wanted, [...(toLink.get(wanted) ?? []), goal.id])
    }
  }

  for (const [personId, ids] of toLink) {
    for (let start = 0; start < ids.length; start += 500) {
      await db
        .update(matchGoals)
        .set({ personId })
        .where(inArray(matchGoals.id, ids.slice(start, start + 500)))
    }
    report.created += ids.length
  }
  for (let start = 0; start < toClear.length; start += 500) {
    await db
      .update(matchGoals)
      .set({ personId: null })
      .where(inArray(matchGoals.id, toClear.slice(start, start + 500)))
  }
  report.changed += toClear.length

  const linked = [...decisions.values()].filter((one) => one.kind === 'linked').length
  const ambiguous = [...decisions.entries()].filter(([, one]) => one.kind === 'ambiguous').map(([name]) => name)

  report.lines.push(
    `${report.created} goals against us linked to a person (${linked} names), ${toClear.length} links taken away, ${report.unchanged} unchanged`,
  )
  if (ambiguous.length > 0) {
    report.lines.push(`${ambiguous.length} names fit more than one person and stay a name: ${ambiguous.join(', ')}`)
  }

  return report
}

/**
 * The goals of the opponents that have a person, by season, with the goals whose name fits more
 * than one person, and every linked name with its seasons against us and for us, so the
 * owner can
 * read the list at once. Only reads.
 */
export async function opponentGoalReport(
  db: Reader,
  exclusions: OpponentGoalExclusions = defaultExclusions,
): Promise<OpponentGoalReport> {
  const people = await db.select({ id: persons.id, name: persons.name }).from(persons)
  const byName = personIdsByName(people)
  const goals = await readOpponentGoals(db)
  const seasons = new Map<string, { ambiguous: number; linked: number }>()
  const against = new Map<string, Set<string>>()

  for (const goal of goals) {
    const decision = decideName(goal.name, byName, exclusions)
    const count = seasons.get(goal.season) ?? { ambiguous: 0, linked: 0 }

    if (goal.personId !== null) {
      count.linked += 1
      against.set(goal.name, (against.get(goal.name) ?? new Set()).add(goal.season))
    } else if (decision.kind === 'ambiguous') {
      count.ambiguous += 1
    }
    seasons.set(goal.season, count)
  }

  const ids = [...against.keys()].flatMap((name) => byName.get(name) ?? [])
  const nameOf = new Map(people.map((row) => [row.id, row.name]))
  const forUs = new Map<string, Set<string>>()

  if (ids.length > 0) {
    for (const row of await db
      .select({ personId: players.personId, season: players.season })
      .from(players)
      .where(inArray(players.personId, ids))) {
      const name = nameOf.get(row.personId ?? 0)

      if (name !== undefined && name !== null) {
        forUs.set(name, (forUs.get(name) ?? new Set()).add(row.season))
      }
    }
  }

  return {
    names: [...against.entries()]
      .map(([name, seasonSet]) => ({
        against: [...seasonSet].toSorted(),
        for: [...(forUs.get(name) ?? [])].toSorted(),
        name,
      }))
      .toSorted((a, b) => a.name.localeCompare(b.name, 'nl')),
    seasons: [...seasons.entries()]
      .map(([season, count]) => ({ ...count, season }))
      .toSorted((a, b) => a.season.localeCompare(b.season)),
  }
}

/** The person ids by exact name. A person without a name is not in it. */
export function personIdsByName(rows: readonly { id: number; name: null | string }[]): Map<string, number[]> {
  const byName = new Map<string, number[]>()

  for (const { id, name } of rows) {
    if (name !== null && name !== '') {
      byName.set(name, [...(byName.get(name) ?? []), id])
    }
  }

  return byName
}

/**
 * The goals of the opponents in the matches of the old fansite, minus the matches whose goals
 * the editors filled in or whose report they saved: those stay as they are. An own goal is the
 * goal of the player of ours who scored it, so it is not here.
 */
export async function readOpponentGoals(db: Reader): Promise<OpponentGoal[]> {
  const edited = new Set<number>()

  for (const row of await db.select().from(matchEdits).where(eq(matchEdits.goalsEdited, true))) {
    edited.add(row.matchId)
  }
  for (const row of await db.select().from(matchReports).where(isNotNull(matchReports.savedBy))) {
    edited.add(row.matchId)
  }

  const rows = await db
    .select({
      id: matchGoals.id,
      matchId: matchGoals.matchId,
      name: matchGoals.player,
      personId: matchGoals.personId,
      season: matches.season,
    })
    .from(matchGoals)
    .innerJoin(matches, eq(matches.id, matchGoals.matchId))
    .where(and(eq(matches.dataSource, oldSiteSource), eq(matchGoals.ours, false), eq(matchGoals.ownGoal, false)))
    .orderBy(asc(matchGoals.id))

  return rows.filter((row) => !edited.has(row.matchId))
}
