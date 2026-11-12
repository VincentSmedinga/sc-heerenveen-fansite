import { and, asc, count, eq, inArray, ne } from 'drizzle-orm'

// What the editors set of a player stays when the import says something else (issue 1022).
// `players.editors_fields` lists the fields the editors set. The importer asks
// `holdEditorsFields` what it may write, and keeps every other value it read as a row of
// `player_field_differences` (`keepPlayerFieldDifferences`), once, until an editor decides
// (`decidePlayerFieldDifference`) or the difference is gone.
import type { Database } from './client.ts'
import type { Player, PlayerField, PlayerFieldDifference, PlayerPosition } from './schema.ts'

import { recordAction } from './audit-log.ts'
import { givePersonPage } from './persons.ts'
import { personPages, persons, playerFieldDifferences, playerPositions, players } from './schema.ts'

/**
 * What a decision came to: `done`; `not-waiting` when the difference was decided already or
 * does not exist; `taken` when another player of the season has the name, the page or the
 * person of the page already, so the value of the import cannot be written.
 */
export type FieldDecisionOutcome = 'done' | 'not-waiting' | 'taken'

/** A difference as a run of the import found it. */
export type FoundFieldDifference = {
  /** What the player has. Null for a field the editors left empty. */
  editorsValue: null | string
  field: PlayerField
  /** What the import read. */
  importValue: string
  playerId: number
}

/** What the import read of a player. Null is a field the list does not give. */
export type ImportedPlayerFields = {
  name: null | string
  position: null | PlayerPosition
  shirtNumber: null | number
  wikipediaPage: null | string
}

/** A difference that waits, with the name of the player. */
export type WaitingFieldDifference = PlayerFieldDifference & { name: string }

type Reader = Pick<Database, 'select'>

type Writer = Pick<Database, 'insert' | 'select' | 'update'>

/** The fields in the words of the admin and the log. */
export const playerFieldLabels: Record<PlayerField, string> = {
  name: 'naam',
  position: 'positie',
  shirt_number: 'rugnummer',
  wikipedia_page: 'Wikipedia-pagina',
}

const columns = {
  name: 'name',
  position: 'position',
  shirt_number: 'shirtNumber',
  wikipedia_page: 'wikipediaPage',
} as const satisfies Record<PlayerField, keyof ImportedPlayerFields>

/** How many differences wait for a decision, in each season that has any. */
export async function countWaitingFieldDifferences(db: Reader): Promise<Map<string, number>> {
  const found = await db
    .select({ season: playerFieldDifferences.season, total: count() })
    .from(playerFieldDifferences)
    .where(eq(playerFieldDifferences.status, 'pending'))
    .groupBy(playerFieldDifferences.season)

  return new Map(found.map((row) => [row.season, row.total]))
}

/**
 * Decides a difference that waits, in the transaction the caller opened. `take-over` gives the
 * player the value of the import, and the field is no longer the editors', so the importer
 * writes it again; `keep` leaves the player as he is. Either way the difference is decided,
 * with a line in the log of the admin for the player.
 *
 * A name that is taken over is the name of the row, with the surname the search page looks
 * for. A name of the editors on his person goes too: the person gets the name of the import
 * without parts and without a source, so the importer can give him the name of his article. A
 * page that is taken over brings its person when we know one; a person of the editors without
 * a page gets the page; and otherwise the player is without a person until the next import
 * finds the person of the page.
 */
export async function decidePlayerFieldDifference(
  db: Writer,
  id: number,
  decision: { kind: 'keep' | 'take-over'; reason?: string | undefined; userId: number },
  now: Date,
): Promise<FieldDecisionOutcome> {
  const [difference] = await db
    .select()
    .from(playerFieldDifferences)
    .where(eq(playerFieldDifferences.id, id))
    .for('update')

  if (difference === undefined || difference.status !== 'pending') {
    return 'not-waiting'
  }

  if (decision.kind === 'take-over') {
    const [player] = await db.select().from(players).where(eq(players.id, difference.playerId)).for('update')

    if (player === undefined) {
      return 'not-waiting'
    }
    if (!(await takeOver(db, player, difference))) {
      return 'taken'
    }
  }

  await db
    .update(playerFieldDifferences)
    .set({ decidedAt: now, resolution: 'person', status: decision.kind === 'take-over' ? 'accepted' : 'rejected' })
    .where(eq(playerFieldDifferences.id, difference.id))
  await recordAction(
    db,
    {
      action: decision.kind === 'take-over' ? 'player.field-take-over' : 'player.field-keep',
      detail: describeFieldDifference(difference),
      itemId: difference.playerId,
      reason: decision.reason,
      userId: decision.userId,
    },
    now,
  )

  return 'done'
}

/** The line for the log: the field and the season with both values. */
export function describeFieldDifference(
  difference: Pick<PlayerFieldDifference, 'editorsValue' | 'field' | 'importValue' | 'season'>,
): string {
  return `${playerFieldLabels[difference.field]} ${difference.season}: redactie ${difference.editorsValue ?? 'leeg'}, import ${difference.importValue}`
}

/**
 * What the import may write of a player it knows, and what it read that differs from a field
 * the editors set. `allowed` is `read` with the value the player has for every field of the
 * editors, so the import writes that field as it is. `differences` has a row for each field of
 * the editors where the import read another value. A field the list does not give (null) says
 * nothing, so it is no difference.
 */
export function holdEditorsFields(
  player: Pick<Player, 'editorsFields' | 'id' | 'name' | 'position' | 'shirtNumber' | 'wikipediaPage'>,
  read: ImportedPlayerFields,
): { allowed: ImportedPlayerFields; differences: FoundFieldDifference[] } {
  const allowed: Record<string, null | number | string> = { ...read }
  const differences: FoundFieldDifference[] = []

  for (const field of player.editorsFields) {
    const column = columns[field]
    const has = player[column]
    const wanted = read[column]

    allowed[column] = has

    if (wanted !== null && wanted !== has) {
      differences.push({
        editorsValue: has === null ? null : String(has),
        field,
        importValue: String(wanted),
        playerId: player.id,
      })
    }
  }

  return { allowed: allowed as ImportedPlayerFields, differences }
}

/** Whether the editors added the player or set a field of his. */
export function isOfEditors(player: Pick<Player, 'editorsFields' | 'source'>): boolean {
  return player.source === 'redactie' || player.editorsFields.length > 0
}

/**
 * Keeps the differences a run of the import found in a season, and returns how many are new.
 * `found` is all of them: the run compared every player of the season it read.
 *
 * - The same difference (the same player, field and two values) is kept once: one that waits
 *   is seen again, and one a person rejected does not come back while both values stay the
 *   same.
 * - A difference whose values changed replaces the one that waits (`replaced`).
 * - A difference that waits and was not found any more closes itself (`reverted`).
 */
export async function keepPlayerFieldDifferences(
  db: Writer,
  season: string,
  found: readonly FoundFieldDifference[],
  now: Date,
): Promise<number> {
  const rows = await db
    .select()
    .from(playerFieldDifferences)
    .where(eq(playerFieldDifferences.season, season))
    .orderBy(asc(playerFieldDifferences.id))
  const waiting = new Set(rows.filter((row) => row.status === 'pending'))
  let added = 0
  const close = async (closed: PlayerFieldDifference[], resolution: 'replaced' | 'reverted') => {
    if (closed.length > 0) {
      await db
        .update(playerFieldDifferences)
        .set({ decidedAt: now, resolution, status: 'rejected' })
        .where(
          inArray(
            playerFieldDifferences.id,
            closed.map((row) => row.id),
          ),
        )
    }
  }

  for (const difference of found) {
    const ofField = rows.filter((row) => row.playerId === difference.playerId && row.field === difference.field)
    const isSame = (row: PlayerFieldDifference) =>
      row.editorsValue === difference.editorsValue && row.importValue === difference.importValue
    const seen = ofField.find((row) => waiting.has(row) && isSame(row))
    const replaced = ofField.filter((row) => waiting.has(row) && row !== seen)

    await close(replaced, 'replaced')
    for (const row of [...replaced, ...(seen === undefined ? [] : [seen])]) {
      waiting.delete(row)
    }

    if (seen !== undefined) {
      await db.update(playerFieldDifferences).set({ lastSeenAt: now }).where(eq(playerFieldDifferences.id, seen.id))
      continue
    }
    // Only a person who kept the value of the editors counts: a difference that lapsed by
    // itself may come back.
    if (ofField.some((row) => row.resolution === 'person' && row.status === 'rejected' && isSame(row))) {
      continue
    }

    const [{ insertId }] = await db.insert(playerFieldDifferences).values({
      editorsValue: difference.editorsValue,
      field: difference.field,
      firstSeenAt: now,
      importValue: difference.importValue,
      lastSeenAt: now,
      playerId: difference.playerId,
      season,
      status: 'pending',
    })

    // A second row of the same player and field in one run finds this one.
    rows.push({
      ...difference,
      decidedAt: null,
      firstSeenAt: now,
      id: insertId,
      lastSeenAt: now,
      resolution: null,
      season,
      status: 'pending',
    })
    added++
  }

  await close([...waiting], 'reverted')

  return added
}

/** The differences of a season that wait, by the name of the player and the field. */
export async function listWaitingFieldDifferences(db: Reader, season: string): Promise<WaitingFieldDifference[]> {
  const found = await db
    .select({ difference: playerFieldDifferences, name: players.name })
    .from(playerFieldDifferences)
    .innerJoin(players, eq(playerFieldDifferences.playerId, players.id))
    .where(and(eq(playerFieldDifferences.season, season), eq(playerFieldDifferences.status, 'pending')))
    .orderBy(asc(playerFieldDifferences.id))

  return found
    .map((row) => ({ ...row.difference, name: row.name }))
    .toSorted((a, b) => a.name.localeCompare(b.name, 'nl') || a.field.localeCompare(b.field) || a.id - b.id)
}

/** The surname the search page looks for: the name without its first word. */
function searchTermOf(name: string): string {
  const words = name.split(' ').filter(Boolean)

  return words.length < 2 ? words.join(' ') : words.slice(1).join(' ')
}

/**
 * Gives the player the value of the import and takes the field off the list of the editors.
 * False when another player of the season has the name, the page or the person of the page.
 */
async function takeOver(db: Writer, player: Player, difference: PlayerFieldDifference): Promise<boolean> {
  const value = difference.importValue
  const editorsFields = player.editorsFields.filter((field) => field !== difference.field)
  const other = (column: typeof players.name | typeof players.wikipediaPage) =>
    db
      .select({ id: players.id })
      .from(players)
      .where(and(eq(players.season, player.season), ne(players.id, player.id), eq(column, value)))

  switch (difference.field) {
    case 'name': {
      if ((await other(players.name)).length > 0) {
        return false
      }

      await db
        .update(players)
        .set({ editorsFields, name: value, searchTerm: searchTermOf(value) })
        .where(eq(players.id, player.id))

      if (player.personId !== null) {
        await db
          .update(persons)
          .set({ familyName: null, familyNamePrefix: null, givenName: null, name: value, nameSource: null })
          .where(and(eq(persons.id, player.personId), eq(persons.nameSource, 'redactie')))
      }

      return true
    }
    case 'position': {
      const position = playerPositions.find((one) => one === value)

      await db
        .update(players)
        .set({ editorsFields, ...(position === undefined ? {} : { position }) })
        .where(eq(players.id, player.id))

      return true
    }
    case 'shirt_number':
      await db
        .update(players)
        .set({ editorsFields, shirtNumber: Number(value) })
        .where(eq(players.id, player.id))

      return true
    case 'wikipedia_page': {
      if ((await other(players.wikipediaPage)).length > 0) {
        return false
      }

      const [remembered] = await db
        .select({ personId: personPages.personId })
        .from(personPages)
        .where(eq(personPages.page, value))
      const [titled] = await db.select({ personId: persons.id }).from(persons).where(eq(persons.wikipediaPage, value))
      let personId = remembered?.personId ?? titled?.personId ?? null

      if (personId === null && player.personId !== null) {
        const [own] = await db
          .select({ page: persons.wikipediaPage })
          .from(persons)
          .where(eq(persons.id, player.personId))

        if (own?.page === null) {
          await givePersonPage(db, player.personId, value)
          personId = player.personId
        }
      }

      // The person of the page is a player of the season already, under another page or none.
      if (
        personId !== null &&
        personId !== player.personId &&
        (
          await db
            .select({ id: players.id })
            .from(players)
            .where(and(eq(players.season, player.season), ne(players.id, player.id), eq(players.personId, personId)))
        ).length > 0
      ) {
        return false
      }

      await db.update(players).set({ editorsFields, personId, wikipediaPage: value }).where(eq(players.id, player.id))

      return true
    }
  }
}
