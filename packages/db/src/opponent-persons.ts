import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'

import type { Database } from './client.ts'

import { opponentPersonExceptions } from './persons.ts'
import { clubs, clubSquadPlayers, matchAppearances, matches, matchGoals, persons } from './schema.ts'

/**
 * How the opponents' players of a run got a person, or did not: through a goal of the same
 * match, through the squad of the club (#1542), through the name, `nobody` when the name fits
 * no person, `several` when it fits two or more, and `excepted` when the list of namesakes
 * stopped it.
 */
export type OpponentPersonCounts = {
  excepted: number
  goal: number
  name: number
  nobody: number
  several: number
  squad: number
}

/**
 * Gives the players of the opponent in the match reports their person (#1544), and never
 * changes a row that has one. `matchId` limits the run to one match: the save of a report
 * does that, the import runs without it. A row gets its person in this order:
 *
 * 0. the name is exactly the name of a player with a person in the squad of the club (#1541),
 *    capitals and accents aside: that person, also when more persons carry the name, since
 *    the squad says which one the club has. A name that fits two such players of the squad
 *    with different persons goes on to the rules below;
 * 1. a goal of the same match points to the row (`appearance_id`) and has a `person_id`: that
 *    person, since the page of the goal says who he is;
 * 2. the name of the row is exactly the `name` of one person, capitals and accents aside;
 * 3. otherwise the row stays empty: the name fits nobody, or two or more persons, or the pair
 *    of name and club is in `opponentPersonExceptions`.
 *
 * A row of ours is never touched: he has his person through `player_id`. `exceptions` is for
 * the tests; the import uses the list.
 */
export async function linkOpponentPersons(
  db: Pick<Database, 'select' | 'update'>,
  {
    exceptions = opponentPersonExceptions,
    matchId,
  }: { exceptions?: readonly { club: string; name: string }[]; matchId?: number } = {},
): Promise<OpponentPersonCounts> {
  const counts: OpponentPersonCounts = { excepted: 0, goal: 0, name: 0, nobody: 0, several: 0, squad: 0 }
  const rows = await db
    .select({
      club: clubs.name,
      clubId: clubs.id,
      id: matchAppearances.id,
      name: matchAppearances.name,
    })
    .from(matchAppearances)
    .innerJoin(matches, eq(matches.id, matchAppearances.matchId))
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(
      and(
        eq(matchAppearances.ours, false),
        isNull(matchAppearances.personId),
        matchId === undefined ? undefined : eq(matchAppearances.matchId, matchId),
      ),
    )

  if (rows.length === 0) {
    return counts
  }

  const byGoal = new Map<number, number>()

  for (const ids of chunks(rows.map((row) => row.id))) {
    const goals = await db
      .select({ appearanceId: matchGoals.appearanceId, personId: matchGoals.personId })
      .from(matchGoals)
      .where(and(inArray(matchGoals.appearanceId, ids), isNotNull(matchGoals.personId)))

    for (const goal of goals) {
      // Two goals of one player name the same person, or the page of the first one wins.
      if (goal.appearanceId !== null && goal.personId !== null && !byGoal.has(goal.appearanceId)) {
        byGoal.set(goal.appearanceId, goal.personId)
      }
    }
  }

  const byName = new Map<string, number[]>()

  for (const person of await db
    .select({ id: persons.id, name: persons.name })
    .from(persons)
    .where(isNotNull(persons.name))) {
    const key = nameKey(person.name ?? '')

    byName.set(key, [...(byName.get(key) ?? []), person.id])
  }

  // The squads of the clubs in the rows: the key of a name gives its person, or `null` when the
  // squad has two players of that name with different persons.
  const bySquad = new Map<number, Map<string, null | number>>()

  for (const part of chunks([...new Set(rows.map((row) => row.clubId))])) {
    for (const player of await db
      .select({ clubId: clubSquadPlayers.clubId, name: clubSquadPlayers.name, personId: clubSquadPlayers.personId })
      .from(clubSquadPlayers)
      .where(and(inArray(clubSquadPlayers.clubId, part), isNotNull(clubSquadPlayers.personId)))) {
      const names = bySquad.get(player.clubId) ?? new Map<string, null | number>()
      const key = nameKey(player.name)
      const before = names.get(key)

      names.set(key, before === undefined || before === player.personId ? player.personId : null)
      bySquad.set(player.clubId, names)
    }
  }

  const excepted = new Set(exceptions.map((one) => `${nameKey(one.club)}|${nameKey(one.name)}`))
  const found = new Map<number, number[]>()

  for (const row of rows) {
    const viaGoal = byGoal.get(row.id)
    const viaSquad = bySquad.get(row.clubId)?.get(nameKey(row.name)) ?? null
    let personId: null | number = null

    if (viaSquad !== null) {
      personId = viaSquad
      counts.squad += 1
    } else if (viaGoal !== undefined) {
      personId = viaGoal
      counts.goal += 1
    } else if (excepted.has(`${nameKey(row.club)}|${nameKey(row.name)}`)) {
      counts.excepted += 1
    } else {
      const candidates = byName.get(nameKey(row.name)) ?? []

      if (candidates.length === 1) {
        personId = candidates[0] ?? null
        counts.name += 1
      } else if (candidates.length === 0) {
        counts.nobody += 1
      } else {
        counts.several += 1
      }
    }

    if (personId !== null) {
      found.set(personId, [...(found.get(personId) ?? []), row.id])
    }
  }

  for (const [personId, ids] of found) {
    for (const part of chunks(ids)) {
      // `person_id is null` again: a row that got a person meanwhile keeps it.
      await db
        .update(matchAppearances)
        .set({ personId })
        .where(
          and(inArray(matchAppearances.id, part), isNull(matchAppearances.personId), eq(matchAppearances.ours, false)),
        )
    }
  }

  return counts
}

function chunks<T>(items: T[], size = 1000): T[][] {
  const parts: T[][] = []

  for (let start = 0; start < items.length; start += size) {
    parts.push(items.slice(start, start + size))
  }

  return parts
}

/** A name without capitals, accents and extra spaces: `Éric  van Dijk` is `eric van dijk`. */
function nameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('nl')
    .replace(/\s+/g, ' ')
    .trim()
}
