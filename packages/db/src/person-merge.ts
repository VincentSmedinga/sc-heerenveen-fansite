import { and, asc, eq, inArray, notInArray } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { PersonName } from './persons.ts'

import { isOfEditors } from './player-field-differences.ts'
import {
  matchAppearances,
  matchGoals,
  type Person,
  personNationalities,
  personPages,
  personPositions,
  persons,
  type Player,
  players,
  playerSeasonStats,
  playerSources,
  playerStatDifferences,
} from './schema.ts'

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
  const filled = {
    country: stays.country ?? gone.country,
    personId: stays.personId ?? gone.personId,
    position: held.has('position') ? stays.position : (stays.position ?? gone.position),
    shirtNumber: held.has('shirt_number') ? stays.shirtNumber : (stays.shirtNumber ?? gone.shirtNumber),
    wikipediaPage: held.has('wikipedia_page') ? stays.wikipediaPage : (stays.wikipediaPage ?? gone.wikipediaPage),
  }

  await db.update(players).set(filled).where(eq(players.id, stays.id))
  Object.assign(stays, filled)
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
 * Moves everything of `other` to `kept` and removes `other`. Returns the warnings.
 */
async function mergePersonInto(tx: MergeDatabase, other: Person, kept: Person): Promise<string[]> {
  const warnings = differences(other, kept)

  await tx.update(players).set({ personId: kept.id }).where(eq(players.personId, other.id))
  await tx.update(matchGoals).set({ personId: kept.id }).where(eq(matchGoals.personId, other.id))
  await tx.update(personPages).set({ personId: kept.id }).where(eq(personPages.personId, other.id))
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

  // The other person goes first: the Q-number is unique, so two persons cannot have it at once.
  await tx.delete(persons).where(eq(persons.id, other.id))
  await tx
    .update(persons)
    .set({
      birthDate: kept.birthDate ?? other.birthDate,
      birthDatePrecision: kept.birthDate === null ? other.birthDatePrecision : kept.birthDatePrecision,
      birthPlaceId: kept.birthPlaceId ?? other.birthPlaceId,
      line: kept.line ?? other.line,
      lineSource: kept.line === null ? other.lineSource : kept.lineSource,
      wikidataId: kept.wikidataId ?? other.wikidataId,
      wikidataReadAt: kept.wikidataReadAt ?? other.wikidataReadAt,
      wikipediaPageId: kept.wikipediaPageId ?? other.wikipediaPageId,
      // A name of the editors stays, also when it was on the person that goes.
      ...(other.nameSource === 'redactie' && kept.nameSource !== 'redactie'
        ? {
            familyName: other.familyName,
            familyNamePrefix: other.familyNamePrefix,
            givenName: other.givenName,
            name: other.name,
            nameSource: other.nameSource,
          }
        : {}),
    })
    .where(eq(persons.id, kept.id))

  const rows = await tx.select().from(players).where(eq(players.personId, kept.id)).orderBy(asc(players.id))

  for (const season of new Set(rows.map((row) => row.season))) {
    const [stays, ...doubles] = rows
      .filter((row) => row.season === season)
      .toSorted((a, b) => rank(a, kept.wikipediaPage) - rank(b, kept.wikipediaPage) || a.id - b.id)

    for (const double of doubles) {
      const dropped = await mergePlayerInto(tx, double.id, stays!.id)

      // What the row that stays lacks comes from the other, so the squad loses nothing.
      await fillPlayerFrom(tx, stays!, double)

      if (dropped.length > 0) {
        warnings.push(
          `Persons: '${double.name}' and '${stays!.name}' (${season}) are one player now and had different numbers in ${dropped.join(', ')}; those of '${stays!.name}' stay, check which are right`,
        )
      }
    }
  }

  return warnings
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
