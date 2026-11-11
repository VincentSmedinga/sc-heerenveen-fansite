import { and, asc, count, eq, inArray, notInArray, or } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { PersonName } from './persons.ts'

import { type AuditEntry, recordAction } from './audit-log.ts'
import { isOfEditors } from './player-field-differences.ts'
import {
  matchAppearances,
  matchGoals,
  type Person,
  personNationalities,
  personPages,
  personPositions,
  persons,
  personSlugs,
  type Player,
  players,
  playerSeasonStats,
  playerSources,
  playerStatDifferences,
} from './schema.ts'

/** A row of `players` as a plan of a merge names it. */
export type MergedRow = Pick<Player, 'id' | 'name' | 'season'>

/**
 * What a merge of two persons does, worked out before it happens (`planPersonMerge`): the
 * confirmation page of the admin shows it and the row of the log is written from it.
 */
export type PersonMergePlan = {
  /** How many appearances in our reports are on the rows of the person that goes. */
  appearances: number
  /** The seasons in which both have a row: `gone` goes into `stays` (`mergePlayerInto`). */
  doubles: { gone: MergedRow; season: string; stays: MergedRow }[]
  /**
   * How many values the editors set go along: the fields they set on the rows of the person
   * that goes, and his name, line and country when those are theirs.
   */
  editorsValues: number
  /** How many goals point at the person that goes, or at one of his rows. */
  goals: number
  /** The person that stays, as he is before the merge. */
  kept: Person
  /** The seasons of the rows of the person that stays, from the first. */
  keptSeasons: string[]
  /** The person that goes. */
  other: Person
  /** The titles that lead to the person that goes, his own among them. */
  pages: string[]
  /** What the person that stays has after the merge (`mergedPersonValues`). */
  result: ReturnType<typeof mergedPersonValues>
  /** The rows of `players` of the person that goes, by season. */
  rows: MergedRow[]
}

/** The title that stays and the other titles that are the same person. */
export type PersonTitleAlias = {
  /** The other titles. After a run they are never the title of a person of their own. */
  aliases: readonly string[]
  /** The title that stays: the article of the person, or the title of a person without one. */
  title: string
}

/** What the writes of a merge go through: the connection, or the transaction of a step. */
type MergeDatabase = Pick<Database, 'delete' | 'insert' | 'select' | 'update'>

/**
 * Gives the row that stays what it lacks and the row that went had: the country, the line, the
 * shirt number, the page and the person. A field the editors set on the row that stays is
 * theirs, also when it is empty, and is not filled. `stays` is changed too.
 */
export async function fillPlayerFrom(db: Pick<Database, 'update'>, stays: Player, gone: Player): Promise<void> {
  const held = new Set(stays.editorsFields)
  // The previous number and its day belong to the number they came with (issue 1076).
  const takesNumber = !held.has('shirt_number') && stays.shirtNumber === null && gone.shirtNumber !== null
  const filled = {
    country: stays.country ?? gone.country,
    personId: stays.personId ?? gone.personId,
    position: held.has('position') ? stays.position : (stays.position ?? gone.position),
    previousShirtNumber: takesNumber ? gone.previousShirtNumber : stays.previousShirtNumber,
    shirtNumber: held.has('shirt_number') ? stays.shirtNumber : (stays.shirtNumber ?? gone.shirtNumber),
    shirtNumberFrom: takesNumber ? gone.shirtNumberFrom : stays.shirtNumberFrom,
    wikipediaPage: held.has('wikipedia_page') ? stays.wikipediaPage : (stays.wikipediaPage ?? gone.wikipediaPage),
  }

  await db.update(players).set(filled).where(eq(players.id, stays.id))
  Object.assign(stays, filled)
}

/**
 * Merges two persons the editors chose in the admin (issue 977): everything of `otherId` goes
 * to `keptId` with `mergePersonInto`, the function the importer merges with, and one row of the
 * log (`person.merge`, with the person that stays in `item_id`) says what moved. The plan, the
 * merge and the row are one transaction, so the row describes what the merge found. `describe`
 * writes the `detail` of the row from the plan. Returns the plan, or `same` for one person
 * twice and `missing` when either is gone: nothing is written then.
 *
 * A later import leaves the merge alone: the title of the person that goes stays in
 * `person_pages` and leads to the one that stays, and every row of `players` points at him.
 */
export async function mergeChosenPersons(
  db: Pick<Database, 'transaction'>,
  {
    describe,
    keptId,
    otherId,
    userId,
  }: { describe: (plan: PersonMergePlan) => string; keptId: number; otherId: number; userId: AuditEntry['userId'] },
  now = new Date(),
): Promise<'missing' | 'same' | PersonMergePlan> {
  if (otherId === keptId) {
    return 'same'
  }

  return db.transaction(async (tx) => {
    // Both rows are locked, lowest number first, so two merges at once wait for each other.
    await tx
      .select({ id: persons.id })
      .from(persons)
      .where(inArray(persons.id, [otherId, keptId]))
      .orderBy(asc(persons.id))
      .for('update')

    const plan = await planPersonMerge(tx, otherId, keptId)

    if (plan === 'missing' || plan === 'same') {
      return plan
    }

    await mergePersonInto(tx, plan.other, plan.kept)
    await recordAction(tx, { action: 'person.merge', detail: describe(plan), itemId: keptId, userId }, now)

    return plan
  })
}

/**
 * What the person that stays has after a merge. This is the one rule, for the importer and the
 * admin alike:
 *
 * - What Wikidata said, the article and its title are those of the person that stays, and what
 *   he lacks comes from the other.
 * - The line and the country too, but one the editors set (`manual`) goes before one from
 *   another source (#1051).
 * - The name is that of the person that stays, but a name the editors gave the other person
 *   (`redactie`) stays when the first has none of theirs.
 */
export function mergedPersonValues(other: Person, kept: Person) {
  const editorsOnly = (mine: null | string, theirs: null | string) => theirs === 'manual' && mine !== 'manual'
  const lineFrom = kept.line === null || editorsOnly(kept.lineSource, other.lineSource) ? other : kept
  const countryFrom = kept.country === null || editorsOnly(kept.countrySource, other.countrySource) ? other : kept
  const nameFrom = other.nameSource === 'redactie' && kept.nameSource !== 'redactie' ? other : kept
  // The importer always keeps the person with the title; the editors can keep one without.
  const pageFrom = kept.wikipediaPage === null ? other : kept

  return {
    birthDate: kept.birthDate ?? other.birthDate,
    birthDatePrecision: kept.birthDate === null ? other.birthDatePrecision : kept.birthDatePrecision,
    birthPlaceId: kept.birthPlaceId ?? other.birthPlaceId,
    country: countryFrom.country,
    countrySource: countryFrom.countrySource,
    englishTitle: pageFrom.englishTitle,
    familyName: nameFrom.familyName,
    familyNamePrefix: nameFrom.familyNamePrefix,
    givenName: nameFrom.givenName,
    line: lineFrom.line,
    lineSource: lineFrom.lineSource,
    name: nameFrom.name,
    nameSource: nameFrom.nameSource,
    wikidataId: kept.wikidataId ?? other.wikidataId,
    wikidataReadAt: kept.wikidataReadAt ?? other.wikidataReadAt,
    wikipediaPage: pageFrom.wikipediaPage,
    wikipediaPageId: kept.wikipediaPageId ?? other.wikipediaPageId,
  }
}

/**
 * Makes the person the editors made without an article (`fromId`) and the person of the article
 * the import found for his player (`intoId`) one person: the second stays, with the name the
 * editors gave, and Wikidata can fill in the rest (issue 1022). Does nothing when the first
 * has an article of his own, or when either is gone. Returns whether they were merged. Use the
 * transaction of the step.
 */
export async function mergeEditorsPersonInto(db: MergeDatabase, fromId: number, intoId: number): Promise<boolean> {
  const [other] = await db.select().from(persons).where(eq(persons.id, fromId))
  const [kept] = await db.select().from(persons).where(eq(persons.id, intoId))

  if (other === undefined || kept === undefined || other.id === kept.id || other.wikipediaPage !== null) {
    return false
  }

  await mergePersonInto(db, other, kept)

  return true
}

/**
 * Moves everything of `other` to `kept` and removes `other`: whatever points to the other
 * person points to the one that stays, his title is remembered in `person_pages`, his slugs go
 * to the person that stays in `person_slugs`, the person
 * that stays gets `mergedPersonValues`, and two rows of one season become one. Returns the
 * warnings. Use the transaction of the step.
 */
export async function mergePersonInto(tx: MergeDatabase, other: Person, kept: Person): Promise<string[]> {
  const warnings = differences(other, kept)
  const values = mergedPersonValues(other, kept)

  await tx.update(players).set({ personId: kept.id }).where(eq(players.personId, other.id))
  await tx.update(matchGoals).set({ personId: kept.id }).where(eq(matchGoals.personId, other.id))
  await tx.update(personPages).set({ personId: kept.id }).where(eq(personPages.personId, other.id))
  // The addresses of the page of the other person lead to the one that stays (#1079).
  await tx.update(personSlugs).set({ personId: kept.id }).where(eq(personSlugs.personId, other.id))
  await rememberPage(tx, other.wikipediaPage, kept.id)

  for (const table of [personNationalities, personPositions]) {
    const has = await tx.select().from(table).where(eq(table.personId, kept.id)).orderBy(asc(table.position))
    const extra = (await tx.select().from(table).where(eq(table.personId, other.id)).orderBy(asc(table.position)))
      .map((row) => row.itemId)
      .filter((itemId) => !has.some((row) => row.itemId === itemId))
    const next = has.reduce((most, row) => Math.max(most, row.position + 1), 0)

    if (extra.length > 0) {
      await tx
        .insert(table)
        .values(extra.map((itemId, index) => ({ itemId, personId: kept.id, position: next + index })))
    }
  }

  // The other person goes first: the Q-number and the title are unique, so two persons cannot
  // have them at once.
  await tx.delete(persons).where(eq(persons.id, other.id))
  // A person that stays without a page of his own takes the address of the other, so it keeps
  // working until `updatePlayerAddresses` gives him the slug of his name.
  await tx
    .update(persons)
    .set({ ...values, slug: kept.slug ?? other.slug })
    .where(eq(persons.id, kept.id))

  const rows = await tx.select().from(players).where(eq(players.personId, kept.id)).orderBy(asc(players.id))

  for (const { doubles, season, stays } of doubleRows(rows, values.wikipediaPage)) {
    for (const double of doubles) {
      const dropped = await mergePlayerInto(tx, double.id, stays.id)

      // What the row that stays lacks comes from the other, so the squad loses nothing.
      await fillPlayerFrom(tx, stays, double)

      if (dropped.length > 0) {
        warnings.push(
          `Persons: '${double.name}' and '${stays.name}' (${season}) are one player now and had different numbers in ${dropped.join(', ')}; those of '${stays.name}' stay, check which are right`,
        )
      }
    }
  }

  return warnings
}

/**
 * Makes one person of the titles the owner said are one person (`personTitleAliases` in the
 * importer), for every other title that is still a person of its own:
 *
 * - The person of the title that stays is there too: whatever points to the other person
 *   (`players`, `match_goals`, the titles in `person_pages`, the nationalities and the
 *   positions) is pointed to the one that stays, and the other is removed. Two rows of the
 *   person in `players` of one season become one row (`mergePlayerInto`): a row of the
 *   editors first (issue 1022), then the row with the title that stays as its page, then the
 *   one of the better source, then the older one. A name the editors gave the other person
 *   stays, on the person that stays.
 * - What Wikidata said (the Q-number, the number of the article, the date and place of birth,
 *   the line) is that of the person that stays, and what he lacks comes from the other. Where
 *   both have a Q-number, an article or a date of birth and they differ, the first stays and a
 *   warning names both titles.
 * - The person of the title that stays is not there: the other person gets that title, and
 *   the name of `names` (by the title that stays), or none when it has no name for him. A name
 *   from the list (`manual`) stays.
 *
 * The other title stays in `person_pages`, so a later import finds the person by it and makes
 * no second one. A title that is no person of its own costs one query and changes nothing, so
 * a second run does and says nothing. Each pair is one transaction. `merged` has a line for
 * each person merged or renamed and `warnings` the lines for the editors, both in English.
 */
export async function mergePersons(
  db: Pick<Database, 'select' | 'transaction'>,
  list: readonly PersonTitleAlias[],
  names: ReadonlyMap<string, PersonName> = new Map(),
): Promise<{ merged: string[]; warnings: string[] }> {
  const merged: string[] = []
  const warnings: string[] = []
  const aliases = list.flatMap((entry) => entry.aliases)

  if (aliases.length === 0) {
    return { merged, warnings }
  }

  // `wikipedia_page` compares byte by byte (utf8mb4_bin), so `Ugur` never finds `Uğur`.
  const own = new Set(
    (
      await db.select({ title: persons.wikipediaPage }).from(persons).where(inArray(persons.wikipediaPage, aliases))
    ).map((row) => row.title),
  )

  for (const { aliases: others, title } of list) {
    for (const alias of others.filter((one) => own.has(one) && one !== title)) {
      await db.transaction(async (tx) => {
        const [other] = await tx.select().from(persons).where(eq(persons.wikipediaPage, alias))

        if (other === undefined) {
          return
        }

        const [page] = await tx.select().from(personPages).where(eq(personPages.page, title))
        const [kept] =
          page === undefined
            ? await tx.select().from(persons).where(eq(persons.wikipediaPage, title))
            : await tx.select().from(persons).where(eq(persons.id, page.personId))

        if (kept === undefined || kept.id === other.id) {
          await renamePerson(tx, other, title, names.get(title))
          merged.push(`'${alias}' is now '${title}'`)

          return
        }

        warnings.push(...(await mergePersonInto(tx, other, kept)))
        merged.push(`'${alias}' is merged into '${kept.wikipediaPage}'`)
      })
    }
  }

  return { merged, warnings }
}

/**
 * Points whatever points to the player `fromId` to the player `intoId`, a row of the same
 * season, and removes the first: the goals, the appearances, the numbers of the season and the
 * differences in those numbers. A match or a competition the player that stays has already
 * keeps its own row: the other appearance stays in the report without a player, and the other
 * numbers go with the row. Returns the competitions whose numbers went and were not the same,
 * so the run can say so. Use the transaction of the step.
 */
export async function mergePlayerInto(db: MergeDatabase, fromId: number, intoId: number): Promise<string[]> {
  await db.update(matchGoals).set({ playerId: intoId }).where(eq(matchGoals.playerId, fromId))

  const played = (await db.select().from(matchAppearances).where(eq(matchAppearances.playerId, intoId))).map(
    (row) => row.matchId,
  )

  await db
    .update(matchAppearances)
    .set({ playerId: intoId })
    .where(
      and(
        eq(matchAppearances.playerId, fromId),
        played.length === 0 ? undefined : notInArray(matchAppearances.matchId, played),
      ),
    )

  const counted = await db.select().from(playerSeasonStats).where(eq(playerSeasonStats.playerId, intoId))
  const dropped = (await db.select().from(playerSeasonStats).where(eq(playerSeasonStats.playerId, fromId))).filter(
    (row) => {
      const kept = counted.find((one) => one.season === row.season && one.competition === row.competition)

      return (
        kept !== undefined &&
        (kept.appearances !== row.appearances || kept.goals !== row.goals || kept.assists !== row.assists)
      )
    },
  )

  await db
    .update(playerSeasonStats)
    .set({ playerId: intoId })
    .where(
      and(
        eq(playerSeasonStats.playerId, fromId),
        counted.length === 0
          ? undefined
          : notInArray(
              playerSeasonStats.competition,
              counted.map((row) => row.competition),
            ),
      ),
    )
  await db.update(playerStatDifferences).set({ playerId: intoId }).where(eq(playerStatDifferences.playerId, fromId))
  await db.delete(players).where(eq(players.id, fromId))

  return dropped.map((row) => row.competition)
}

/**
 * Works out what a merge of the person `otherId` into the person `keptId` does, and changes
 * nothing. `same` for one person twice, `missing` when either is not there.
 */
export async function planPersonMerge(
  db: Pick<Database, 'select'>,
  otherId: number,
  keptId: number,
): Promise<'missing' | 'same' | PersonMergePlan> {
  if (otherId === keptId) {
    return 'same'
  }

  const found = await db
    .select()
    .from(persons)
    .where(inArray(persons.id, [otherId, keptId]))
  const other = found.find((person) => person.id === otherId)
  const kept = found.find((person) => person.id === keptId)

  if (other === undefined || kept === undefined) {
    return 'missing'
  }

  const all = await db
    .select()
    .from(players)
    .where(inArray(players.personId, [otherId, keptId]))
    .orderBy(asc(players.season), asc(players.id))
  const rows = all.filter((row) => row.personId === otherId)
  const rowIds = rows.map((row) => row.id)
  const [[goals], [appearances], pages] = await Promise.all([
    db
      .select({ n: count() })
      .from(matchGoals)
      .where(
        or(eq(matchGoals.personId, otherId), rowIds.length === 0 ? undefined : inArray(matchGoals.playerId, rowIds)),
      ),
    rowIds.length === 0
      ? [{ n: 0 }]
      : db.select({ n: count() }).from(matchAppearances).where(inArray(matchAppearances.playerId, rowIds)),
    db.select({ page: personPages.page }).from(personPages).where(eq(personPages.personId, otherId)),
  ])
  const result = mergedPersonValues(other, kept)
  const named = ({ id, name, season }: Player): MergedRow => ({ id, name, season })

  return {
    appearances: appearances?.n ?? 0,
    doubles: doubleRows(all, result.wikipediaPage).flatMap(({ doubles, season, stays }) =>
      doubles.map((gone) => ({ gone: named(gone), season, stays: named(stays) })),
    ),
    editorsValues:
      rows.reduce((sum, row) => sum + row.editorsFields.length, 0) +
      [other.nameSource === 'redactie', other.lineSource === 'manual', other.countrySource === 'manual'].filter(Boolean)
        .length,
    goals: goals?.n ?? 0,
    kept,
    keptSeasons: all.filter((row) => row.personId === keptId).map((row) => row.season),
    other,
    pages: [
      ...new Set([...pages.map((row) => row.page), ...(other.wikipediaPage === null ? [] : [other.wikipediaPage])]),
    ].sort(),
    result,
    rows: rows.map(named),
  }
}

/** The warnings for what both persons have and differs: the one that stays keeps his own. */
function differences(other: Person, kept: Person): string[] {
  // A date of birth is a personal datum, so the line says that the dates differ and not what
  // they are; a Q-number and the number of an article are public and help to find the pages.
  const both = (what: string, a: null | number | string, b: null | number | string, values = true) =>
    a !== null && b !== null && a !== b
      ? [
          `Persons: '${kept.wikipediaPage}' and '${other.wikipediaPage}' are merged and have a different ${what}${values ? ` (${a} and ${b})` : ''}; the first stays, check which is right`,
        ]
      : []

  return [
    ...both('item on Wikidata', kept.wikidataId, other.wikidataId),
    // Without a Q-number on both sides the number of the article is all that tells them apart.
    ...(kept.wikidataId !== null && other.wikidataId !== null
      ? []
      : both('article on Wikipedia', kept.wikipediaPageId, other.wikipediaPageId)),
    ...both('date of birth', kept.birthDate, other.birthDate, false),
  ]
}

/**
 * The seasons in which the rows of one person hold more than one row, with the row that stays
 * (the lowest `rank`, then the oldest) and the rows that go into it.
 */
function doubleRows(rows: readonly Player[], title: null | string) {
  return [...new Set(rows.map((row) => row.season))].flatMap((season) => {
    const [stays, ...doubles] = rows
      .filter((row) => row.season === season)
      .toSorted((a, b) => rank(a, title) - rank(b, title) || a.id - b.id)

    return stays === undefined || doubles.length === 0 ? [] : [{ doubles, season, stays }]
  })
}

/**
 * The order of the rows of one person in a season: the lowest is the row that stays. A row the
 * editors added or changed goes before every other, so what they set is kept.
 */
function rank(row: Player, title: null | string): number {
  return (
    (isOfEditors(row) ? 0 : 2 * playerSources.length) +
    (title !== null && row.wikipediaPage === title ? 0 : playerSources.length) +
    playerSources.indexOf(row.source)
  )
}

/**
 * Makes the title lead to the person. The old title of a merged person must be remembered, or
 * the next import asks Wikipedia about it and makes the person again. A person the editors
 * made without an article has no title to remember.
 */
async function rememberPage(tx: MergeDatabase, page: null | string, personId: number) {
  if (page === null) {
    return
  }

  await tx.insert(personPages).values({ page, personId }).onDuplicateKeyUpdate({ set: { personId } })
}

/** Gives a person the title that stays, remembers it, and gives him the name of that title. */
async function renamePerson(tx: MergeDatabase, person: Person, title: string, name: PersonName | undefined) {
  const named =
    // A name from the list or from the editors stays.
    person.nameSource === 'manual' || person.nameSource === 'redactie'
      ? {}
      : {
          familyName: name?.familyName ?? null,
          familyNamePrefix: name?.familyNamePrefix ?? null,
          givenName: name?.givenName ?? null,
          name: name?.name ?? null,
          nameSource: name?.source ?? null,
        }

  await tx
    .update(persons)
    .set({ ...named, wikipediaPage: title })
    .where(eq(persons.id, person.id))
  await rememberPage(tx, title, person.id)
  await rememberPage(tx, person.wikipediaPage, person.id)
}
