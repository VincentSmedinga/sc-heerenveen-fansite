import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import { createPersonBook, opponentPersonExceptions } from './persons.ts'
import {
  clubs,
  clubSquadPlayers,
  matchAppearances,
  matches,
  matchGoals,
  opponentNameSearches,
  personPages,
  persons,
} from './schema.ts'

/** A name to look for, with each club and season of the rows that no rule can link. */
export type OpponentName = {
  name: string
  pairs: { clubId: number; clubWikidataId: string; rowIds: number[]; season: string }[]
}

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

/** What came of one row: the person it gets and the rule that found him, or why none. */
type Judged = { outcome: keyof OpponentPersonCounts; personId: null | number; row: OpponentRow }

/** A row of the opponent without a person, with what the rules and the search need. */
type OpponentRow = {
  club: string
  clubId: number
  clubWikidataId: null | string
  id: number
  name: string
  season: string
}

/**
 * Finds the person of an article that fits a player of an opponent (#1678), or makes them: the
 * person with the Q-number, else the person of the article, else a new person with both.
 * `asked` are the titles that led to the article, which `person_pages` remembers for the
 * person. `aliases` are the titles the owner said are one person. A person with a title of the
 * English Wikipedia is not the person of a Dutch article of that title, so that gives null.
 */
export async function findOrAddOpponentPerson(
  db: Pick<Database, 'insert' | 'select' | 'update'>,
  {
    aliases = new Map(),
    article,
    asked,
    wikidataId,
    wikipediaPageId,
  }: {
    aliases?: ReadonlyMap<string, string>
    article: string
    asked: readonly string[]
    wikidataId: string
    wikipediaPageId: number
  },
): Promise<null | { created: boolean; id: number }> {
  const [byItem] = await db.select({ id: persons.id }).from(persons).where(eq(persons.wikidataId, wikidataId))
  const listed = aliases.get(article) ?? article
  let id = byItem?.id
  let created = false

  if (id === undefined) {
    const [holder] = await db
      .select({ english: persons.englishTitle })
      .from(persons)
      .where(eq(persons.wikipediaPage, listed))

    if (holder?.english === true) {
      return null
    }

    const book = await createPersonBook(db, { aliases, redirects: new Map([[listed, listed]]) })
    const resolved = await book.resolve(article)

    if (resolved === null) {
      return null
    }

    id = resolved
    created = book.counts.people > 0

    if (created) {
      await db.update(persons).set({ wikidataId, wikipediaPageId }).where(eq(persons.id, id))
    }
  }

  for (const page of new Set([...asked, article])) {
    // A title that belongs to a person already stays theirs.
    await db
      .insert(personPages)
      .values({ page, personId: id })
      .onDuplicateKeyUpdate({ set: { page: sql`${personPages.page}` } })
  }

  return { created, id }
}

/** Gives this person to the rows of the opponent that have none; other rows keep theirs. */
export async function giveRowsPerson(db: Pick<Database, 'update'>, rowIds: number[], personId: number) {
  let given = 0

  for (const part of chunks(rowIds)) {
    // `person_id is null` again: a row that got a person meanwhile keeps it.
    const [result] = await db
      .update(matchAppearances)
      .set({ personId })
      .where(
        and(inArray(matchAppearances.id, part), isNull(matchAppearances.personId), eq(matchAppearances.ours, false)),
      )

    given += result.affectedRows
  }

  return given
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
  const found = new Map<number, number[]>()

  for (const { outcome, personId, row } of await judgeRows(db, exceptions, matchId)) {
    counts[outcome] += 1

    if (personId !== null) {
      found.set(personId, [...(found.get(personId) ?? []), row.id])
    }
  }

  for (const [personId, ids] of found) {
    await giveRowsPerson(db, ids, personId)
  }

  return counts
}

/**
 * The names the importer looks for on Wikipedia (#1678): those of rows of the opponent that no
 * rule of `linkOpponentPersons` can link (the name fits nobody, or more than one person),
 * without the pairs on the list of namesakes, and only for clubs with a Q-number. A name is
 * due when one of its pairs of club and season was never searched, or last searched at or
 * before `searchedBefore`; it then comes with all its pairs. The names with the most rows go
 * first, at most `limit`. `notSearched` counts all names with a pair never searched.
 */
export async function opponentNamesToSearch(
  db: Pick<Database, 'select'>,
  {
    exceptions = opponentPersonExceptions,
    limit,
    searchedBefore,
  }: { exceptions?: readonly { club: string; name: string }[]; limit: number; searchedBefore: Date },
): Promise<{ names: OpponentName[]; notSearched: number }> {
  const searched = new Map<string, Date>()

  for (const search of await db.select().from(opponentNameSearches)) {
    searched.set(searchKey(search.name, search.clubId, search.season), search.searchedAt)
  }

  const byName = new Map<string, Map<string, OpponentName['pairs'][number]>>()

  for (const { outcome, row } of await judgeRows(db, exceptions)) {
    const name = row.name.replace(/\s+/g, ' ').trim()

    if ((outcome !== 'nobody' && outcome !== 'several') || row.clubWikidataId === null || name === '') {
      continue
    }

    const pairs = byName.get(name) ?? new Map<string, OpponentName['pairs'][number]>()
    const key = searchKey(name, row.clubId, row.season)
    const pair = pairs.get(key) ?? {
      clubId: row.clubId,
      clubWikidataId: row.clubWikidataId,
      rowIds: [],
      season: row.season,
    }

    pair.rowIds.push(row.id)
    pairs.set(key, pair)
    byName.set(name, pairs)
  }

  const due: (OpponentName & { rows: number })[] = []
  let notSearched = 0

  for (const [name, pairs] of byName) {
    const dates = [...pairs.keys()].map((key) => searched.get(key))

    if (dates.includes(undefined)) {
      notSearched += 1
    }

    if (dates.some((date) => date === undefined || date <= searchedBefore)) {
      const list = [...pairs.values()]

      due.push({ name, pairs: list, rows: list.reduce((sum, pair) => sum + pair.rowIds.length, 0) })
    }
  }

  return {
    names: due
      .sort((a, b) => b.rows - a.rows || a.name.localeCompare(b.name, 'nl'))
      .slice(0, limit)
      .map(({ name, pairs }) => ({ name, pairs })),
    notSearched,
  }
}

/** Remembers that these clubs and seasons of a name were searched at `searchedAt` (#1678). */
export async function rememberOpponentSearch(
  db: Pick<Database, 'insert'>,
  name: string,
  pairs: readonly { clubId: number; season: string }[],
  searchedAt: Date,
): Promise<void> {
  await db
    .insert(opponentNameSearches)
    .values(pairs.map(({ clubId, season }) => ({ clubId, name, searchedAt, season })))
    .onDuplicateKeyUpdate({ set: { searchedAt } })
}

function chunks<T>(items: T[], size = 1000): T[][] {
  const parts: T[][] = []

  for (let start = 0; start < items.length; start += size) {
    parts.push(items.slice(start, start + size))
  }

  return parts
}

/** What the rules of `linkOpponentPersons` make of each row without a person. */
async function judgeRows(
  db: Pick<Database, 'select'>,
  exceptions: readonly { club: string; name: string }[],
  matchId?: number,
): Promise<Judged[]> {
  const rows = await db
    .select({
      club: clubs.name,
      clubId: clubs.id,
      clubWikidataId: clubs.wikidataId,
      id: matchAppearances.id,
      name: matchAppearances.name,
      season: matches.season,
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
    return []
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

  return rows.map((row) => {
    const viaGoal = byGoal.get(row.id)
    const viaSquad = bySquad.get(row.clubId)?.get(nameKey(row.name)) ?? null

    if (viaSquad !== null) {
      return { outcome: 'squad', personId: viaSquad, row }
    }
    if (viaGoal !== undefined) {
      return { outcome: 'goal', personId: viaGoal, row }
    }
    if (excepted.has(`${nameKey(row.club)}|${nameKey(row.name)}`)) {
      return { outcome: 'excepted', personId: null, row }
    }

    const candidates = byName.get(nameKey(row.name)) ?? []
    const [only] = candidates

    return candidates.length === 1 && only !== undefined
      ? { outcome: 'name', personId: only, row }
      : { outcome: candidates.length === 0 ? 'nobody' : 'several', personId: null, row }
  })
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

/** The key of a name, club and season in `opponent_name_searches`. */
function searchKey(name: string, clubId: number, season: string): string {
  return `${clubId}|${season}|${name}`
}
