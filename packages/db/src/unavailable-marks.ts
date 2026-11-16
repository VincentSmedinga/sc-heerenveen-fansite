import { and, eq, inArray } from 'drizzle-orm'

import type { Database } from './client.ts'

import { recordAction } from './audit-log.ts'
import { persons, type UnavailableField, unavailableMarks } from './schema.ts'

// The marks of a gap as not available (#1308): see `unavailableMarks` in the schema. Every
// change takes a transaction (`Pick<Database, ...>` of one), so a mark and its row in the log
// are written together.

type Writer = Pick<Database, 'delete' | 'insert' | 'select' | 'update'>

/** The day of a moment as `2026-11-16`, in UTC. */
export function dayOf(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/** The marks of a person, by field: the day of the last check. */
export async function readPersonMarks(
  db: Pick<Database, 'select'>,
  personId: number,
): Promise<Partial<Record<UnavailableField, string>>> {
  const rows = await db
    .select({ checkedOn: unavailableMarks.checkedOn, field: unavailableMarks.field })
    .from(unavailableMarks)
    .where(and(eq(unavailableMarks.subject, 'person'), eq(unavailableMarks.subjectId, personId)))

  return Object.fromEntries(rows.map((row) => [row.field, row.checkedOn]))
}

/** What the log says about a field. */
const fieldNames: Record<UnavailableField, string> = { geboren: 'geboortedatum', wikipedia: 'Wikipedia-pagina' }

/**
 * Takes away the marks of a person whose field has a value now, and logs each as `gap.unmark`.
 * `userId` is the editor who filled the field, or null for the import. Returns the fields it
 * took the mark from, so the import can say so in its log.
 */
export async function clearFilledMarks(
  db: Writer,
  personId: number,
  userId: null | number,
  now = new Date(),
): Promise<UnavailableField[]> {
  const marks = await readPersonMarks(db, personId)
  const fields = Object.keys(marks) as UnavailableField[]

  if (fields.length === 0) {
    return []
  }

  const [person] = await db
    .select({ birthDate: persons.birthDate, wikipediaPage: persons.wikipediaPage })
    .from(persons)
    .where(eq(persons.id, personId))
  const filled = fields.filter((field) =>
    field === 'wikipedia'
      ? person?.wikipediaPage !== null && person?.wikipediaPage !== undefined
      : person?.birthDate !== null && person?.birthDate !== undefined,
  )

  if (filled.length === 0) {
    return []
  }

  await db
    .delete(unavailableMarks)
    .where(
      and(
        eq(unavailableMarks.subject, 'person'),
        eq(unavailableMarks.subjectId, personId),
        inArray(unavailableMarks.field, filled),
      ),
    )

  for (const field of filled) {
    await recordAction(
      db,
      {
        action: 'gap.unmark',
        detail: `${fieldNames[field]}: markering weggehaald, want het feit is er nu.`,
        itemId: personId,
        userId,
      },
      now,
    )
  }

  return filled
}

/**
 * Every mark of persons, newest check last, with the person's name as the admin shows it, for
 * the card Niet beschikbaar. A mark on a field that has a value is left out.
 */
export async function listPersonMarks(db: Pick<Database, 'select'>) {
  const rows = await db
    .select({
      birthDate: persons.birthDate,
      checkedOn: unavailableMarks.checkedOn,
      field: unavailableMarks.field,
      id: persons.id,
      name: persons.name,
      wikipediaPage: persons.wikipediaPage,
    })
    .from(unavailableMarks)
    .innerJoin(persons, eq(persons.id, unavailableMarks.subjectId))
    .where(eq(unavailableMarks.subject, 'person'))

  return rows
    .filter((row) => (row.field === 'wikipedia' ? row.wikipediaPage === null : row.birthDate === null))
    .map((row) => ({
      checkedOn: row.checkedOn,
      field: row.field,
      name: row.name ?? row.wikipediaPage ?? `Persoon ${row.id}`,
      personId: row.id,
    }))
    .sort((a, b) =>
      a.checkedOn === b.checkedOn ? a.name.localeCompare(b.name, 'nl') : a.checkedOn < b.checkedOn ? -1 : 1,
    )
}

/**
 * Marks a field of a person as not available, with today as the day of the last check. A person
 * who has the mark already keeps it, with the day unchanged: use `renewMark` for that. Returns
 * whether it wrote a row.
 */
export async function markUnavailable(
  db: Writer,
  userId: number,
  personId: number,
  field: UnavailableField,
  now = new Date(),
): Promise<boolean> {
  const [existing] = await db
    .select({ id: unavailableMarks.id })
    .from(unavailableMarks)
    .where(
      and(
        eq(unavailableMarks.subject, 'person'),
        eq(unavailableMarks.subjectId, personId),
        eq(unavailableMarks.field, field),
      ),
    )

  if (existing !== undefined) {
    return false
  }

  await db
    .insert(unavailableMarks)
    .values({ checkedOn: dayOf(now), field, subject: 'person', subjectId: personId, userId })
  await recordAction(
    db,
    { action: 'gap.mark', detail: `${fieldNames[field]} niet beschikbaar.`, itemId: personId, userId },
    now,
  )

  return true
}

/** Sets the day of the last check of a mark to today. Returns whether there was a mark. */
export async function renewMark(
  db: Writer,
  userId: number,
  personId: number,
  field: UnavailableField,
  now = new Date(),
): Promise<boolean> {
  const [result] = await db
    .update(unavailableMarks)
    .set({ checkedOn: dayOf(now), userId })
    .where(
      and(
        eq(unavailableMarks.subject, 'person'),
        eq(unavailableMarks.subjectId, personId),
        eq(unavailableMarks.field, field),
      ),
    )

  if (result.affectedRows === 0) {
    return false
  }

  await recordAction(
    db,
    { action: 'gap.renew', detail: `${fieldNames[field]} nog steeds niet beschikbaar.`, itemId: personId, userId },
    now,
  )

  return true
}

/** Takes a mark away. Returns whether the person had it. */
export async function unmark(
  db: Writer,
  userId: number,
  personId: number,
  field: UnavailableField,
  now = new Date(),
): Promise<boolean> {
  const [result] = await db
    .delete(unavailableMarks)
    .where(
      and(
        eq(unavailableMarks.subject, 'person'),
        eq(unavailableMarks.subjectId, personId),
        eq(unavailableMarks.field, field),
      ),
    )

  if (result.affectedRows === 0) {
    return false
  }

  await recordAction(
    db,
    { action: 'gap.unmark', detail: `${fieldNames[field]}: markering weggehaald.`, itemId: personId, userId },
    now,
  )

  return true
}
