// The form of a person in the admin (issue 1164): the name and the Wikipedia page, the birth
// date and the year of death, the country and the line. A person has no season: a name the
// editors change goes to the person and to his player in every season, as the decision of 10
// November 2026 says (_Het formulier van een speler zoekt eerst een persoon_). The checks are
// those of the form of a player (`person-checks.ts`). A change and its row in the log are one
// transaction.
import type { Database } from '@fansite/db/client'

import { recordAction } from '@fansite/db/audit-log'
import { givePersonPage, joinNameParts, setEditorsName, setEditorsPersonFacts } from '@fansite/db/persons'
import { hiddenReasonMaxLength, personPages, persons, type PlayerPosition, players } from '@fansite/db/schema'
import { and, asc, eq, isNull, ne, or } from 'drizzle-orm'

import { parseReason } from './items'
import {
  birthDateText,
  checkBirthDate,
  checkCountry,
  checkDeathYear,
  checkLine,
  checkName,
  checkPage,
  type EditorsBirthDate,
} from './person-checks'
import { type PersonErrors, personFieldNames, type PersonPart, type PersonValues } from './person-fields'
import { personLabels } from './person-labels'
import { type MergeOffer, nameValuesOf, refreshPlayerAddresses, searchTermOf } from './players'

/** The person an editor opens, with his player in each season, the oldest season first. */
export type AdminPerson = {
  person: typeof persons.$inferSelect
  seasons: { id: number; season: string }[]
}

/** What saving did. `unchanged` writes nothing. */
export type EditPersonOutcome =
  { errors: PersonErrors; merge?: MergeOffer; status: 'refused' } | { status: 'changed' | 'missing' | 'unchanged' }

/**
 * What the editor changes, by part: a part that is not on the page is left out, and so is a
 * birth date whose field still shows what was there.
 */
export type PersonEntry = {
  birthDate?: EditorsBirthDate | null
  country?: null | string
  deathYear?: null | number
  line?: null | PlayerPosition
  name?: Parameters<typeof joinNameParts>[0]
  page?: null | string
  reason: string
}

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/** The errors of a save that is refused, thrown to roll back the transaction. */
class Refusal extends Error {
  errors: PersonErrors
  merge: MergeOffer | undefined

  constructor(errors: PersonErrors, merge?: MergeOffer) {
    super('The person is refused')
    this.errors = errors
    this.merge = merge
  }
}

/**
 * Changes a person (see `storePersonEdit`) and gives the players the addresses of their pages
 * again, as a new name or birth year changes them.
 */
export async function editPerson(
  db: Database,
  userId: number,
  id: number,
  entry: PersonEntry,
  now = new Date(),
): Promise<EditPersonOutcome> {
  const outcome = await storePersonEdit(db, userId, id, entry, now)

  if (outcome.status === 'changed') {
    await refreshPlayerAddresses(db)
  }

  return outcome
}

/** The person with this number and the seasons he played in, or undefined. */
export async function findAdminPerson(db: Pick<Database, 'select'>, id: number): Promise<AdminPerson | undefined> {
  const [person] = await db.select().from(persons).where(eq(persons.id, id))

  if (person === undefined) {
    return undefined
  }

  const seasons = await db
    .select({ id: players.id, season: players.season })
    .from(players)
    .where(eq(players.personId, id))
    .orderBy(asc(players.season))

  return { person, seasons }
}

/** The name of a person as the page and the log show it. */
export function personNameOf(person: Pick<AdminPerson['person'], 'id' | 'name' | 'wikipediaPage'>): string {
  return person.name ?? person.wikipediaPage ?? `Persoon ${person.id}`
}

/**
 * The values the form opens with. A person without a name in parts gets his name split as well
 * as it can be, as on the form of a player: the editor reads it before saving.
 */
export function personValuesOf({ person }: Pick<AdminPerson, 'person'>): PersonValues {
  return {
    ...nameValuesOf({ name: personNameOf(person).replace(/\s*\([^)]*\)$/u, '') }, person),
    geboren: birthDateText(person.birthDate, person.birthDatePrecision),
    land: person.country ?? '',
    linie: person.line ?? '',
    overleden: person.deathDate === null ? '' : person.deathDate.slice(0, 4),
    reden: '',
    wikipedia: person.wikipediaPage ?? '',
  }
}

/** What the request holds, as text. */
export function readPersonValues(formData: FormData): PersonValues {
  return Object.fromEntries(
    personFieldNames.map((name) => {
      const value = formData.get(name)

      return [name, typeof value === 'string' ? value.trim().replaceAll(/\s+/gu, ' ') : '']
    }),
  ) as PersonValues
}

/**
 * Checks the fields of one part, or of every part for the whole form, and the reason. A birth
 * date whose field shows what was there (`storedBirthDate`) is left as it is, so a month that
 * only Wikidata gives stays a month.
 */
export function validatePerson(
  values: PersonValues,
  part: PersonPart | undefined,
  storedBirthDate: string,
  now = new Date(),
): { entry: PersonEntry; errors?: undefined } | { entry?: undefined; errors: PersonErrors } {
  const errors: PersonErrors = {}
  const shows = (shown: PersonPart) => part === undefined || part === shown
  const reason = parseReason(values.reden)
  const entry: Omit<PersonEntry, 'reason'> = {}

  if (shows('naam')) {
    entry.name = checkName(values, errors)
    entry.page = checkPage(values.wikipedia, errors)
  }
  if (shows('leven')) {
    const birthDate = values.geboren === storedBirthDate ? undefined : checkBirthDate(values.geboren, errors, now)
    const deathYear = checkDeathYear(values.overleden, errors, now)
    const birthYear = values.geboren === '' ? undefined : /\d{4}/u.exec(values.geboren)?.[0]

    if (
      errors.geboren === undefined &&
      deathYear !== null &&
      birthYear !== undefined &&
      Number(birthYear) > deathYear
    ) {
      errors.geboren = 'De geboortedatum ligt na het jaar van overlijden. Pas een van de twee aan.'
    }
    if (birthDate !== undefined) {
      entry.birthDate = birthDate
    }

    entry.deathYear = deathYear
  }
  if (shows('land')) {
    entry.country = checkCountry(values.land, errors)
  }
  if (shows('linie')) {
    entry.line = checkLine(values.linie, errors)
  }
  if ('error' in reason) {
    errors.reden =
      reason.error === 'leeg'
        ? 'Schrijf waarom je dit invult of aanpast.'
        : `Schrijf hoogstens ${hiddenReasonMaxLength} tekens.`
  }

  return Object.keys(errors).length > 0 || 'error' in reason
    ? { errors }
    : { entry: { ...entry, reason: reason.reason } }
}

/**
 * Gives a person without a page the page, and his players in the seasons that have none. A
 * person who has a page keeps it, and a page of another person is refused with the two to
 * merge.
 */
async function givePage(transaction: Transaction, person: AdminPerson['person'], page: null | string) {
  if (person.wikipediaPage !== null) {
    throw new Refusal({
      wikipedia:
        page === null
          ? `Deze persoon heeft een Wikipedia-pagina: ${person.wikipediaPage}. Een pagina weghalen kan hier niet.`
          : `Deze persoon heeft al een Wikipedia-pagina: ${person.wikipediaPage}. Een andere pagina geven kan hier niet.`,
    })
  }
  if (page === null) {
    return
  }

  const [remembered] = await transaction
    .select({ personId: personPages.personId })
    .from(personPages)
    .where(eq(personPages.page, page))
  const [titled] = await transaction
    .select({ personId: persons.id })
    .from(persons)
    .where(eq(persons.wikipediaPage, page))
  const owner = remembered?.personId ?? titled?.personId

  if (owner !== undefined && owner !== person.id) {
    const [other] = await transaction
      .select({ id: persons.id, name: persons.name, wikipediaPage: persons.wikipediaPage })
      .from(persons)
      .where(eq(persons.id, owner))
    const [own, theirs] = personLabels(person, other ?? { id: owner, name: null, wikipediaPage: null })

    throw new Refusal(
      {
        wikipedia: `Deze pagina hoort bij een andere persoon: ${theirs}. Is dat dezelfde persoon? Voeg de twee dan samen met de link onder dit veld.`,
      },
      { label: `Voeg ${own} samen met ${theirs}`, personId: person.id, withId: owner },
    )
  }

  const [taken] = await transaction
    .select({ name: players.name, season: players.season })
    .from(players)
    .where(and(eq(players.wikipediaPage, page), or(isNull(players.personId), ne(players.personId, person.id))))

  if (taken !== undefined) {
    throw new Refusal({
      wikipedia: `Het seizoen ${taken.season} heeft al een speler met deze Wikipedia-pagina: ${taken.name}. Pas die speler aan.`,
    })
  }

  await givePersonPage(transaction, person.id, page)

  const rows = await transaction
    .select({ editorsFields: players.editorsFields, id: players.id })
    .from(players)
    .where(and(eq(players.personId, person.id), isNull(players.wikipediaPage)))

  for (const row of rows) {
    await transaction
      .update(players)
      .set({ editorsFields: [...new Set([...row.editorsFields, 'wikipedia_page' as const])], wikipediaPage: page })
      .where(eq(players.id, row.id))
  }
}

/**
 * Gives a person the name the editors filled in, and his player in every season too. A season
 * with another player of that name refuses it.
 */
async function rename(transaction: Transaction, personId: number, name: NonNullable<PersonEntry['name']>) {
  const whole = joinNameParts(name)
  const rows = await transaction
    .select({ editorsFields: players.editorsFields, id: players.id, season: players.season })
    .from(players)
    .where(eq(players.personId, personId))
    .for('update')

  for (const row of rows) {
    const [same] = await transaction
      .select({ name: players.name })
      .from(players)
      .where(and(eq(players.season, row.season), eq(players.name, whole), ne(players.id, row.id)))

    if (same !== undefined) {
      throw new Refusal({
        achternaam: `Het seizoen ${row.season} heeft al een andere speler met de naam ${same.name}. Geef deze persoon een andere naam, of voeg de twee personen samen.`,
      })
    }
  }

  await setEditorsName(transaction, personId, name)

  for (const row of rows) {
    await transaction
      .update(players)
      .set({
        editorsFields: [...new Set([...row.editorsFields, 'name' as const])],
        name: whole,
        searchTerm: searchTermOf(name, whole),
      })
      .where(eq(players.id, row.id))
  }
}

/**
 * Changes what the editor filled in of a person. A new name goes to the person with the source
 * `redactie` and to his player in every season, where it is the editors' from then on
 * (`players.editors_fields`), so the importer leaves it alone; a season with another player of
 * that name refuses it. A page goes to a person without one, as on the form of a player; a page
 * of another person is refused with the two persons to merge, and a person who has a page keeps
 * it. The birth date, the year of death, the country and the line get the source `manual`, and
 * an empty one takes the value and its source away (`setEditorsPersonFacts`). Writes
 * `person.edit` with what changed and the reason, and nothing for a save that changes nothing.
 */
async function storePersonEdit(
  db: Database,
  userId: number,
  id: number,
  entry: PersonEntry,
  now: Date,
): Promise<EditPersonOutcome> {
  try {
    return await db.transaction(async (transaction) => {
      const [person] = await transaction.select().from(persons).where(eq(persons.id, id)).for('update')

      if (person === undefined) {
        return { status: 'missing' } as const
      }

      const shown = personNameOf(person)
      const changes: string[] = []

      if (entry.name !== undefined) {
        const before = personValuesOf({ person })
        const renamed =
          (entry.name.givenName ?? '') !== before.voornaam ||
          (entry.name.familyNamePrefix ?? '') !== before.tussenvoegsel ||
          entry.name.familyName !== before.achternaam

        if (renamed) {
          await rename(transaction, person.id, entry.name)
          changes.push(`naam: ${shown} → ${joinNameParts(entry.name)}`)
        }
      }
      if (entry.page !== undefined && entry.page !== person.wikipediaPage) {
        await givePage(transaction, person, entry.page)
        changes.push(`Wikipedia: geen → ${entry.page}`)
      }

      const yearOfDeath = person.deathDate === null ? null : Number(person.deathDate.slice(0, 4))
      const facts = {
        ...(entry.birthDate === undefined ||
        (entry.birthDate?.date === person.birthDate && entry.birthDate?.precision === person.birthDatePrecision)
          ? {}
          : { birthDate: entry.birthDate }),
        ...(entry.deathYear === undefined || entry.deathYear === yearOfDeath ? {} : { deathYear: entry.deathYear }),
        ...(entry.country === undefined || entry.country === person.country ? {} : { country: entry.country }),
        ...(entry.line === undefined || entry.line === person.line ? {} : { line: entry.line }),
      }

      if (facts.birthDate !== undefined) {
        const was = birthDateText(person.birthDate, person.birthDatePrecision)
        const is = birthDateText(facts.birthDate?.date, facts.birthDate?.precision)

        changes.push(`geboortedatum: ${was === '' ? 'geen' : was} → ${is === '' ? 'geen' : is}`)
      }
      if (facts.deathYear !== undefined) {
        changes.push(`jaar van overlijden: ${yearOfDeath ?? 'geen'} → ${facts.deathYear ?? 'geen'}`)
      }
      if (facts.country !== undefined) {
        changes.push(`land: ${person.country ?? 'geen'} → ${facts.country ?? 'geen'}`)
      }
      if (facts.line !== undefined) {
        changes.push(`linie: ${person.line ?? 'geen'} → ${facts.line ?? 'geen'}`)
      }
      if (changes.length === 0) {
        return { status: 'unchanged' } as const
      }

      await setEditorsPersonFacts(transaction, person.id, facts)
      await recordAction(
        transaction,
        {
          action: 'person.edit',
          detail: `Aangepast: ${shown}. ${changes.join('; ')}. Reden: ${entry.reason}`,
          itemId: person.id,
          userId,
        },
        now,
      )

      return { status: 'changed' } as const
    })
  } catch (error) {
    if (error instanceof Refusal) {
      return { errors: error.errors, status: 'refused', ...(error.merge === undefined ? {} : { merge: error.merge }) }
    }

    throw error
  }
}
