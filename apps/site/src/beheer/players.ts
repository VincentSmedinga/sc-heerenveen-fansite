// The players of a season in the admin (issue 1020): the list of a season, the player an
// editor opens, and the three changes: adding a player, changing one and taking one out of the
// squad. A player has a person under him, found or made by the functions of the database
// package (`persons.ts`), so the same person in another season stays one person. The checks
// repeat what the database enforces, so an editor gets a sentence at the field. A change and
// its row in the log are one transaction.
import type { Database } from '@fansite/db/client'

import { recordAction } from '@fansite/db/audit-log'
import {
  type EditorsName,
  findOrAddEditorsPerson,
  givePersonPage,
  joinNameParts,
  setEditorsName,
  setEditorsPersonFacts,
} from '@fansite/db/persons'
import { listMatchSeasons } from '@fansite/db/queries'
import {
  matchAppearances,
  matchGoals,
  type Person,
  personNameLimits,
  personPages,
  persons,
  type Player,
  type PlayerField,
  playerNameMaxLength,
  type PlayerPosition,
  playerPositions,
  players,
  playerSeasonStats,
  wikipediaPageMaxLength,
} from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { storeCompleteness } from '@fansite/db/store-completeness'
import { isCountryCode } from '@fansite/shared/countries'
import { and, asc, count, eq, gt, inArray, isNull, max, min, ne, or, sql } from 'drizzle-orm'

import { splitPersonName } from '../player-name'
import { personLabels } from './person-labels'
import {
  emptyPlayerValues,
  newPersonChoice,
  type PlayerErrors,
  type PlayerFieldName,
  type PlayerValues,
} from './player-fields'

/** What adding did: the player is there, or the form is refused with the errors. */
export type AddPlayerOutcome = { errors: PlayerErrors; status: 'refused' } | { id: number; status: 'added' }

/** The player an editor opens: the row, his person, and what holds him in the squad. */
export type AdminPlayer = {
  /** How many appearances in our reports and rows of the squad table with a match or a goal. */
  appearances: number
  /** How many goals in the matches point at him. */
  goals: number
  person:
    | Pick<
        Person,
        'country' | 'familyName' | 'familyNamePrefix' | 'givenName' | 'id' | 'line' | 'name' | 'wikipediaPage'
      >
    | undefined
  player: Player
}

/** A player as the list of a season shows him. */
export type AdminPlayerRow = Pick<Player, 'id' | 'inSquad' | 'name' | 'position' | 'shirtNumber' | 'source'>

/**
 * What changing did. `unchanged` is a save that changes nothing, which writes no row. A save
 * that is refused because the page belongs to another person names the two (`merge`), so the
 * form can lead to the page that merges them (issue 977).
 */
export type EditPlayerOutcome =
  { errors: PlayerErrors; merge?: MergeOffer; status: 'refused' } | { status: 'changed' | 'missing' | 'unchanged' }

/** The two persons a refused save says may be one: that of the player and that of the page. */
export type MergeOffer = { label: string; personId: number; withId: number }

/** A person to choose from, with what tells two persons of one name apart. */
export type PersonChoice = { id: number; label: string }

/** What an editor entered, understood and in the shape of the tables. */
export type PlayerEntry = {
  /**
   * The country of the person, as a code of two letters. Null for none: the form that changes a
   * player then takes the country away, and the form that adds one leaves the person as he is.
   */
  country: null | string
  /** The line of the person. Null as for `country`. */
  line: null | PlayerPosition
  /** The name in parts. Null when the editor chose a person we know, who has his own. */
  name: EditorsName | null
  /** The title of the article. Null for none. */
  page: null | string
  /** The person the editor chose from the list. Null for a new one, and in the edit form. */
  personId: null | number
  position: null | PlayerPosition
  shirtNumber: null | number
}

/**
 * What taking a player out of the squad did. `in-use` is a player with goals or appearances,
 * who belongs to the season; `unchanged` is one who was out already.
 */
export type RemovePlayerOutcome = 'done' | 'in-use' | 'missing' | 'unchanged'

/** How many persons the list to choose from holds at most. */
export const mostPersonChoices = 25

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/** The errors of a player that is refused, thrown to roll back the transaction. */
class Refusal extends Error {
  errors: PlayerErrors
  merge: MergeOffer | undefined

  constructor(errors: PlayerErrors, merge?: MergeOffer) {
    super('The player is refused')
    this.errors = errors
    this.merge = merge
  }
}

/** The player with this number, with his person and what holds him in the squad. */
export async function findAdminPlayer(db: Pick<Database, 'select'>, id: number): Promise<AdminPlayer | undefined> {
  const [player] = await db.select().from(players).where(eq(players.id, id))

  if (player === undefined) {
    return undefined
  }

  const [person, usage] = await Promise.all([
    player.personId === null ? undefined : findPerson(db, player.personId),
    usageOf(db, id),
  ])

  return { ...usage, person, player }
}

/** The players of a season, in the order of the page Spelers: the number, then the name. */
export async function listAdminPlayers(db: Pick<Database, 'select'>, season: string): Promise<AdminPlayerRow[]> {
  return db
    .select({
      id: players.id,
      inSquad: players.inSquad,
      name: players.name,
      position: players.position,
      shirtNumber: players.shirtNumber,
      source: players.source,
    })
    .from(players)
    .where(eq(players.season, season))
    .orderBy(
      asc(sql`${players.shirtNumber} is null`),
      asc(players.shirtNumber),
      asc(players.searchTerm),
      asc(players.name),
    )
}

/**
 * The seasons a player can be added to, the newest first: the current one, and every earlier
 * season with a match. A season exists as soon as it has a match.
 */
export async function listPlayerSeasons(db: Database, now = new Date()): Promise<string[]> {
  const current = seasonOf(now)

  return [current, ...(await listMatchSeasons(db)).filter((known) => known < current)].sort().reverse()
}

/**
 * The values the form of a player opens with. The name in parts is the name of his person, and
 * for a player without one, or whose person has no name yet, the name of the row split as well
 * as it can be: the editor reads it before saving.
 */
export function playerValuesOf({ person, player }: Pick<AdminPlayer, 'person' | 'player'>): PlayerValues {
  return {
    ...emptyPlayerValues,
    ...nameValuesOf(player, person),
    land: person?.country ?? '',
    linie: person?.line ?? '',
    positie: player.position ?? '',
    rugnummer: player.shirtNumber === null ? '' : String(player.shirtNumber),
    wikipedia: player.wikipediaPage ?? '',
  }
}

/** What the request holds, as text. */
export function readPlayerValues(formData: FormData): PlayerValues {
  return Object.fromEntries(
    Object.keys(emptyPlayerValues).map((name) => {
      const value = formData.get(name)

      // A form without the list of persons, such as the one that changes a player, has no
      // choice.
      return [
        name,
        typeof value === 'string' ? value.trim().replaceAll(/\s+/gu, ' ') : emptyPlayerValues[name as PlayerFieldName],
      ]
    }),
  ) as PlayerValues
}

/**
 * The persons that fit the search, which is a part of the name or of the title of the article:
 * capitals and accents make no difference, and the words may be anywhere. At most
 * `mostPersonChoices`, by name. Each says in which seasons the person is a player and, when it
 * differs from the name, the title of the article, so two persons of one name can be told
 * apart. An empty search finds nobody.
 */
export async function searchPersons(db: Pick<Database, 'select'>, search: string): Promise<PersonChoice[]> {
  const words = plain(search).split(' ').filter(Boolean)

  if (words.length === 0) {
    return []
  }

  const all = await db.select({ id: persons.id, name: persons.name, page: persons.wikipediaPage }).from(persons)
  const found = all
    .map((person) => ({ ...person, shown: person.name ?? person.page ?? '' }))
    .filter((person) => words.every((word) => plain(`${person.name ?? ''} ${person.page ?? ''}`).includes(word)))
    .sort((a, b) => a.shown.localeCompare(b.shown, 'nl') || a.id - b.id)
    .slice(0, mostPersonChoices)

  if (found.length === 0) {
    return []
  }

  const seasons = await db
    .select({ first: min(players.season), last: max(players.season), personId: players.personId })
    .from(players)
    .where(
      inArray(
        players.personId,
        found.map((person) => person.id),
      ),
    )
    .groupBy(players.personId)
  const seasonsOf = new Map(seasons.map((row) => [row.personId, row]))

  return found.map((person) => {
    const played = seasonsOf.get(person.id)
    const details = [
      played === undefined || played.first === null
        ? 'nog in geen seizoen'
        : played.first === played.last
          ? played.first
          : `${played.first} tot en met ${played.last}`,
      person.page === null
        ? 'geen Wikipedia-pagina'
        : person.page === person.shown
          ? undefined
          : `Wikipedia: ${person.page}`,
    ].filter((detail) => detail !== undefined)

    return { id: person.id, label: `${person.shown} (${details.join(', ')})` }
  })
}

/**
 * Checks what an editor filled in. Returns the errors by `id`, or, when there are none, the
 * entry as the tables hold it. `mode` is the form: the one that adds has the list of persons,
 * and with a person chosen from it the fields of a new person stay empty.
 */
export function validatePlayer(
  values: PlayerValues,
  mode: 'add' | 'edit',
): { entry: PlayerEntry; errors?: undefined } | { entry?: undefined; errors: PlayerErrors } {
  const errors: PlayerErrors = {}
  const chosen = mode === 'add' && values.persoon !== newPersonChoice && values.persoon !== ''
  const personId = chosen && /^[1-9]\d{0,9}$/u.test(values.persoon) ? Number(values.persoon) : null
  let page: null | string = null

  if (chosen) {
    if (personId === null) {
      errors.persoon = 'Kies een persoon uit de lijst, of een nieuwe persoon.'
    }

    for (const field of ['voornaam', 'tussenvoegsel', 'achternaam', 'wikipedia'] as const) {
      if (values[field] !== '') {
        errors[field] = 'Je koos een persoon die we al kennen. Laat dit veld leeg, of kies een nieuwe persoon.'
      }
    }
  } else {
    const tooLong = (field: 'achternaam' | 'tussenvoegsel' | 'voornaam', most: number) => {
      if ([...values[field]].length > most) {
        errors[field] = `Schrijf hoogstens ${most} tekens.`
      }
    }

    if (values.achternaam === '') {
      errors.achternaam = 'Vul de achternaam in. Heeft de speler één naam, zoals Dinho? Vul die dan hier in.'
    }

    tooLong('voornaam', personNameLimits.givenName)
    tooLong('tussenvoegsel', personNameLimits.familyNamePrefix)
    tooLong('achternaam', personNameLimits.familyName)

    const whole = [values.voornaam, values.tussenvoegsel, values.achternaam].filter(Boolean).join(' ')

    if (errors.achternaam === undefined && [...whole].length > playerNameMaxLength) {
      errors.achternaam = `De hele naam is langer dan ${playerNameMaxLength} tekens. Kort hem in.`
    }

    const title = values.wikipedia.replaceAll('_', ' ').replaceAll(/\s+/gu, ' ').trim()

    if (/:\/\/|^www\./iu.test(title)) {
      errors.wikipedia = 'Vul de titel van het artikel in, niet het adres. Zoals Pelle van Amersfoort.'
    } else if (/[#<>[\]{}|]/u.test(title)) {
      errors.wikipedia = 'Een titel heeft geen #, <, >, [, ], {, } of |. Vul de titel van het artikel in.'
    } else if ([...title].length > wikipediaPageMaxLength) {
      errors.wikipedia = `Schrijf hoogstens ${wikipediaPageMaxLength} tekens.`
    } else if (title !== '') {
      page = title
    }
  }

  let shirtNumber: null | number = null

  if (values.rugnummer !== '') {
    if (/^[1-9]\d?$/u.test(values.rugnummer)) {
      shirtNumber = Number(values.rugnummer)
    } else {
      errors.rugnummer = 'Vul een getal van 1 tot en met 99 in, of laat het veld leeg.'
    }
  }

  const position = playerPositions.find((choice) => choice === values.positie) ?? null

  if (values.positie !== '' && position === null) {
    errors.positie = 'Kies een positie uit de lijst.'
  }

  // The line and the country of the person, for a person we know and for a new one alike.
  const line = playerPositions.find((choice) => choice === values.linie) ?? null
  const country = isCountryCode(values.land) ? values.land : null

  if (values.linie !== '' && line === null) {
    errors.linie = 'Kies een linie uit de lijst, of kies Onbekend.'
  }
  if (values.land !== '' && country === null) {
    errors.land = 'Kies een land uit de lijst, of kies Onbekend.'
  }
  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  return {
    entry: {
      country,
      line,
      name: chosen
        ? null
        : {
            familyName: values.achternaam,
            familyNamePrefix: values.tussenvoegsel === '' ? null : values.tussenvoegsel,
            givenName: values.voornaam === '' ? null : values.voornaam,
          },
      page,
      personId,
      position,
      shirtNumber,
    },
  }
}

/** The sentence for a person, a name or a title that the season already has. */
function alreadyThere(
  same: Pick<Player, 'name' | 'personId' | 'wikipediaPage'>,
  wanted: { name: string; page: null | string; personId: null | number },
  season: string,
) {
  if (same.personId !== null && same.personId === wanted.personId) {
    return `Deze persoon staat al in het seizoen ${season}, als ${same.name}. Pas die speler aan.`
  }
  if (same.wikipediaPage !== null && same.wikipediaPage === wanted.page) {
    return `Het seizoen ${season} heeft al een speler met deze Wikipedia-pagina: ${same.name}. Pas die speler aan.`
  }

  return `Het seizoen ${season} heeft al een speler met de naam ${same.name}. Pas die speler aan, of geef deze een andere naam.`
}

async function findPerson(db: Pick<Database, 'select'>, id: number) {
  const [person] = await db
    .select({
      country: persons.country,
      familyName: persons.familyName,
      familyNamePrefix: persons.familyNamePrefix,
      givenName: persons.givenName,
      id: persons.id,
      line: persons.line,
      name: persons.name,
      wikipediaPage: persons.wikipediaPage,
    })
    .from(persons)
    .where(eq(persons.id, id))

  return person
}

/**
 * The name in the three fields of the form: that of the person, or the name of the row split.
 * The words of the surname that start with a small letter (`van der`) are the prefix.
 */
function nameValuesOf(
  player: Pick<Player, 'name'>,
  person: Pick<Person, 'familyName' | 'familyNamePrefix' | 'givenName'> | undefined,
): Pick<PlayerValues, 'achternaam' | 'tussenvoegsel' | 'voornaam'> {
  if (person !== undefined && person.familyName !== null) {
    return {
      achternaam: person.familyName,
      tussenvoegsel: person.familyNamePrefix ?? '',
      voornaam: person.givenName ?? '',
    }
  }

  const { givenName = '', surname } = splitPersonName(player.name)
  const words = (surname === '' ? player.name : surname).split(' ')
  const prefix = words.slice(0, -1).findIndex((word) => !/^['’]?\p{Ll}/u.test(word))
  const prefixWords = prefix === -1 ? words.length - 1 : prefix

  return {
    achternaam: words.slice(prefixWords).join(' '),
    tussenvoegsel: words.slice(0, prefixWords).join(' '),
    voornaam: surname === '' ? '' : givenName,
  }
}

/**
 * The person a player has after the editor gave him a title he did not have. A title that
 * belongs to his person, or to nobody while his person has none, is fine; a player without a
 * person gets the person of the title.
 */
async function personOfNewPage(
  transaction: Transaction,
  { entry, person }: { entry: PlayerEntry & { name: EditorsName; page: string }; person: AdminPlayer['person'] },
): Promise<number> {
  if (person === undefined) {
    return (await findOrAddEditorsPerson(transaction, { name: entry.name, page: entry.page })).id
  }

  const [remembered] = await transaction
    .select({ personId: personPages.personId })
    .from(personPages)
    .where(eq(personPages.page, entry.page))
  const [titled] = await transaction
    .select({ personId: persons.id })
    .from(persons)
    .where(eq(persons.wikipediaPage, entry.page))
  const owner = remembered?.personId ?? titled?.personId

  if (owner === person.id) {
    return person.id
  }
  if (owner !== undefined) {
    const other = await findPerson(transaction, owner)
    const [own, theirs] = personLabels(person, other ?? { id: owner, name: null, wikipediaPage: null })

    throw new Refusal(
      {
        wikipedia: `Deze pagina hoort bij een andere persoon: ${theirs}. Is dat dezelfde persoon? Voeg de twee dan samen met de link onder dit veld.`,
      },
      { label: `Voeg ${own} samen met ${theirs}`, personId: person.id, withId: owner },
    )
  }
  if (person.wikipediaPage !== null) {
    throw new Refusal({
      wikipedia: `Deze persoon heeft al een Wikipedia-pagina: ${person.wikipediaPage}. Een andere pagina geven kan hier niet.`,
    })
  }

  await givePersonPage(transaction, person.id, entry.page)

  return person.id
}

/**
 * Adds a player to the squad of a season, with the source `redactie`. The person is the one
 * the editor chose, or the person of the title, or a new one (`findOrAddEditorsPerson`). A
 * person, a name or a title the season already has is refused. Writes `player.add`, so there is
 * no player without a row and no row without a player. The name and every field the editor
 * filled in are the editors' from then on (`players.editors_fields`, issue 1022): the importer
 * leaves them alone and fills in the rest. A line or a country the editor chose goes to the
 * person, with the source `manual` (#1051); an empty one leaves the person as he is, because
 * the form does not show what a person we know has.
 */
async function storePlayer(
  db: Database,
  userId: number,
  season: string,
  entry: PlayerEntry,
  now = new Date(),
): Promise<AddPlayerOutcome> {
  try {
    return await db.transaction(async (transaction) => {
      // Where an error about the person goes: the list, or the field that named him.
      const personField = entry.personId === null ? (entry.page === null ? 'achternaam' : 'wikipedia') : 'persoon'
      let personId = entry.personId
      let created = false

      if (personId === null) {
        if (entry.name === null) {
          throw new Refusal({ achternaam: 'Vul de achternaam in.' })
        }

        ;({ created, id: personId } = await findOrAddEditorsPerson(transaction, { name: entry.name, page: entry.page }))
      }

      const [person] = await transaction.select().from(persons).where(eq(persons.id, personId))

      if (person === undefined) {
        throw new Refusal({ persoon: 'Deze persoon bestaat niet meer. Zoek hem opnieuw, of maak een nieuwe persoon.' })
      }

      const name = playerNameOf(person)

      if (name === '' || [...name].length > playerNameMaxLength) {
        throw new Refusal({
          [personField]: `De naam van deze persoon past niet: hoogstens ${playerNameMaxLength} tekens.`,
        })
      }

      const page = person.wikipediaPage
      const [same] = await transaction
        .select({ name: players.name, personId: players.personId, wikipediaPage: players.wikipediaPage })
        .from(players)
        .where(
          and(
            eq(players.season, season),
            or(
              eq(players.personId, personId),
              eq(players.name, name),
              page === null ? undefined : eq(players.wikipediaPage, page),
            ),
          ),
        )

      if (same !== undefined) {
        throw new Refusal({
          [same.personId === personId || entry.personId !== null
            ? personField
            : same.wikipediaPage !== null && same.wikipediaPage === page
              ? 'wikipedia'
              : 'achternaam']: alreadyThere(same, { name, page, personId }, season),
        })
      }

      const [{ insertId }] = await transaction.insert(players).values({
        editorsFields: [
          'name',
          ...(entry.shirtNumber === null ? [] : (['shirt_number'] as const)),
          ...(entry.position === null ? [] : (['position'] as const)),
          ...(page === null ? [] : (['wikipedia_page'] as const)),
        ],
        name,
        personId,
        position: entry.position,
        searchTerm: searchTermOf(person, name),
        season,
        shirtNumber: entry.shirtNumber,
        source: 'redactie',
        wikipediaPage: page,
      })

      const facts = {
        ...(entry.country === null || entry.country === person.country ? {} : { country: entry.country }),
        ...(entry.line === null || entry.line === person.line ? {} : { line: entry.line }),
      }

      await setEditorsPersonFacts(transaction, personId, facts)

      const personChanges = [
        facts.line === undefined ? undefined : `linie van de persoon: ${person.line ?? 'geen'} → ${facts.line}`,
        facts.country === undefined ? undefined : `land van de persoon: ${person.country ?? 'geen'} → ${facts.country}`,
      ]
        .filter((change) => change !== undefined)
        .map((change) => `, ${change}`)
        .join('')

      await recordAction(
        transaction,
        {
          action: 'player.add',
          detail: `Toegevoegd: ${name}, ${season}, rugnummer: ${entry.shirtNumber ?? 'geen'}, positie: ${entry.position ?? 'onbekend'}, Wikipedia: ${page ?? 'geen'}, persoon ${personId}${created ? ' (nieuw)' : ''}${personChanges}`,
          itemId: insertId,
          userId,
        },
        now,
      )

      return { id: insertId, status: 'added' } as const
    })
  } catch (error) {
    // A refused player rolls the transaction back, so a person made on the way is not kept.
    if (error instanceof Refusal) {
      return { errors: error.errors, status: 'refused' }
    }

    throw error
  }
}

/**
 * Changes a player: the name, the shirt number, the line and the title. A name the editor
 * changed goes to the person too, with the source `redactie`, so it changes in every season. A
 * new title gives a person without one his title, and gives a player without a person the
 * person of the title; a title that belongs to another person is refused, and the outcome names
 * the two persons, because joining them is done on a page of its own (issue 977). The goals of
 * a player who gets a person get it too. Writes `player.edit` with what changed, and nothing
 * for a save that changes nothing. Each field that changed is the editors' from then on
 * (`players.editors_fields`, issue 1022), so the importer leaves it alone. A line or a country
 * that differs from what his person has goes to the person (#1051): a value with the source
 * `manual`, and an empty one takes it away, so the importer fills it in again. That is so only
 * for the person the form showed: a player without a person, or one who gets another person in
 * this save, keeps what that person has.
 */
async function storePlayerEdit(
  db: Database,
  userId: number,
  id: number,
  entry: PlayerEntry,
  now = new Date(),
): Promise<EditPlayerOutcome> {
  try {
    return await db.transaction(async (transaction) => {
      const [player] = await transaction.select().from(players).where(eq(players.id, id)).for('update')

      if (player === undefined) {
        return { status: 'missing' } as const
      }
      if (entry.name === null) {
        throw new Refusal({ achternaam: 'Vul de achternaam in.' })
      }

      const person = player.personId === null ? undefined : await findPerson(transaction, player.personId)
      const name = joinNameParts(entry.name)
      const before = nameValuesOf(player, person)
      const renamed =
        (entry.name.givenName ?? '') !== before.voornaam ||
        (entry.name.familyNamePrefix ?? '') !== before.tussenvoegsel ||
        entry.name.familyName !== before.achternaam
      let personId = player.personId

      if (entry.page !== null && entry.page !== player.wikipediaPage) {
        personId = await personOfNewPage(transaction, {
          entry: { ...entry, name: entry.name, page: entry.page },
          person,
        })
      }

      const [same] = await transaction
        .select({ name: players.name, personId: players.personId, wikipediaPage: players.wikipediaPage })
        .from(players)
        .where(
          and(
            eq(players.season, player.season),
            ne(players.id, id),
            or(
              eq(players.name, name),
              entry.page === null ? undefined : eq(players.wikipediaPage, entry.page),
              personId === null || personId === player.personId ? undefined : eq(players.personId, personId),
            ),
          ),
        )

      if (same !== undefined) {
        throw new Refusal({
          [same.name.toLowerCase() === name.toLowerCase() ? 'achternaam' : 'wikipedia']: alreadyThere(
            same,
            { name, page: entry.page, personId },
            player.season,
          ),
        })
      }

      // The line and the country of the person the form showed, where they differ.
      const shown = person !== undefined && personId === person.id ? person : undefined
      const facts =
        shown === undefined
          ? {}
          : {
              ...(entry.country === shown.country ? {} : { country: entry.country }),
              ...(entry.line === shown.line ? {} : { line: entry.line }),
            }

      const edited: PlayerField[] = [
        ...(renamed || name !== player.name ? (['name'] as const) : []),
        ...(entry.shirtNumber === player.shirtNumber ? [] : (['shirt_number'] as const)),
        ...(entry.position === player.position ? [] : (['position'] as const)),
        ...(entry.page === player.wikipediaPage ? [] : (['wikipedia_page'] as const)),
      ]
      const changes = [
        name === player.name ? undefined : `naam: ${player.name} → ${name}`,
        entry.shirtNumber === player.shirtNumber
          ? undefined
          : `rugnummer: ${player.shirtNumber ?? 'geen'} → ${entry.shirtNumber ?? 'geen'}`,
        entry.position === player.position
          ? undefined
          : `positie: ${player.position ?? 'onbekend'} → ${entry.position ?? 'onbekend'}`,
        entry.page === player.wikipediaPage
          ? undefined
          : `Wikipedia: ${player.wikipediaPage ?? 'geen'} → ${entry.page ?? 'geen'}`,
        personId === player.personId ? undefined : `persoon: ${player.personId ?? 'geen'} → ${personId ?? 'geen'}`,
        // The parts can change while the whole name stays, such as a prefix that moves.
        renamed && person !== undefined && name === player.name ? 'naam in delen van de persoon' : undefined,
        facts.line === undefined
          ? undefined
          : `linie van de persoon: ${shown?.line ?? 'geen'} → ${facts.line ?? 'geen'}`,
        facts.country === undefined
          ? undefined
          : `land van de persoon: ${shown?.country ?? 'geen'} → ${facts.country ?? 'geen'}`,
      ].filter((change) => change !== undefined)

      if (changes.length === 0) {
        return { status: 'unchanged' } as const
      }
      if (renamed && person !== undefined) {
        await setEditorsName(transaction, person.id, entry.name)
      }
      if (shown !== undefined) {
        await setEditorsPersonFacts(transaction, shown.id, facts)
      }

      await transaction
        .update(players)
        .set({
          editorsFields: [...new Set([...player.editorsFields, ...edited])],
          name,
          personId,
          position: entry.position,
          searchTerm: renamed ? searchTermOf(entry.name, name) : player.searchTerm,
          shirtNumber: entry.shirtNumber,
          wikipediaPage: entry.page,
        })
        .where(eq(players.id, id))

      if (personId !== null && player.personId === null) {
        await transaction
          .update(matchGoals)
          .set({ personId })
          .where(and(eq(matchGoals.playerId, id), isNull(matchGoals.personId)))
      }

      await recordAction(
        transaction,
        {
          action: 'player.edit',
          detail: `Aangepast: ${player.name}, ${player.season}. ${changes.join('; ')}`,
          itemId: id,
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

/**
 * Takes a player out of the squad of his season: `in_squad` goes off, with the moment. The row
 * stays, as it does when the importer finds a player gone. A player with a goal or an
 * appearance belongs to the season and stays in. Writes `player.remove`.
 */
async function storePlayerRemoval(
  db: Database,
  userId: number,
  id: number,
  now = new Date(),
): Promise<RemovePlayerOutcome> {
  return db.transaction(async (transaction) => {
    const [player] = await transaction.select().from(players).where(eq(players.id, id)).for('update')

    if (player === undefined) {
      return 'missing'
    }
    if (!player.inSquad) {
      return 'unchanged'
    }

    const { appearances, goals } = await usageOf(transaction, id)

    if (appearances > 0 || goals > 0) {
      return 'in-use'
    }

    await transaction.update(players).set({ inSquad: false, leftSquadAt: now }).where(eq(players.id, id))
    await recordAction(
      transaction,
      {
        action: 'player.remove',
        detail: `Uit de selectie gehaald: ${player.name}, ${player.season}`,
        itemId: id,
        userId,
      },
      now,
    )

    return 'done'
  })
}

const plain = (text: string) =>
  text
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll(/[\s‐-―-]+/gu, ' ')
    .trim()

/** Adds a player (see `storePlayer`) and works out the completeness of the season again. */
export async function addPlayer(
  db: Database,
  userId: number,
  season: string,
  entry: PlayerEntry,
  now = new Date(),
): Promise<AddPlayerOutcome> {
  const outcome = await storePlayer(db, userId, season, entry, now)

  if (outcome.status === 'added') {
    await refreshCompleteness(db, season, now)
  }

  return outcome
}

/** Changes a player (see `storePlayerEdit`) and rates the season again. */
export async function editPlayer(
  db: Database,
  userId: number,
  id: number,
  entry: PlayerEntry,
  now = new Date(),
): Promise<EditPlayerOutcome> {
  const outcome = await storePlayerEdit(db, userId, id, entry, now)

  if (outcome.status === 'changed') {
    const [player] = await db.select({ season: players.season }).from(players).where(eq(players.id, id))

    if (player !== undefined) {
      await refreshCompleteness(db, player.season, now)
    }
  }

  return outcome
}

/**
 * Works out the chance that the list of a season is the whole squad again, after its players
 * changed (#1040), also when two rows of a season became one (issue 977). The change of the
 * player stays when this fails: it logs a warning, and the
 * next import of that season works the row out again.
 */
export async function refreshCompleteness(db: Database, season: string, now: Date): Promise<void> {
  try {
    await storeCompleteness(db, season, undefined, now)
  } catch (error) {
    console.warn(`Could not work out the completeness of ${season} after a change of a player`, error)
  }
}

/** Takes a player out of the squad (see `storePlayerRemoval`) and rates the season again. */
export async function removePlayer(
  db: Database,
  userId: number,
  id: number,
  now = new Date(),
): Promise<RemovePlayerOutcome> {
  const outcome = await storePlayerRemoval(db, userId, id, now)

  if (outcome === 'done') {
    const [player] = await db.select({ season: players.season }).from(players).where(eq(players.id, id))

    if (player !== undefined) {
      await refreshCompleteness(db, player.season, now)
    }
  }

  return outcome
}

/**
 * The name of the row of a player of this person: the name of the person, or, while the
 * importer has not read his article, its title without the addition between brackets.
 */
function playerNameOf(person: Pick<Person, 'name' | 'wikipediaPage'>) {
  return person.name ?? (person.wikipediaPage ?? '').replace(/\s*\([^)]*\)$/u, '')
}

/**
 * The surname the search page looks for (`van Aken`): the prefix and the family name, or for a
 * person without a name in parts the name without its first word, as the importer works it
 * out.
 */
function searchTermOf(name: Pick<Person, 'familyName' | 'familyNamePrefix'>, whole: string) {
  if (name.familyName !== null) {
    return [name.familyNamePrefix, name.familyName].filter(Boolean).join(' ')
  }

  const words = whole.split(' ').filter(Boolean)

  return words.length < 2 ? words.join(' ') : words.slice(1).join(' ')
}

/** What holds a player in the squad: his goals, and where he played. */
async function usageOf(db: Pick<Database, 'select'>, id: number) {
  const [[goals], [played], [counted]] = await Promise.all([
    db.select({ n: count() }).from(matchGoals).where(eq(matchGoals.playerId, id)),
    db.select({ n: count() }).from(matchAppearances).where(eq(matchAppearances.playerId, id)),
    db
      .select({ n: count() })
      .from(playerSeasonStats)
      .where(
        and(
          eq(playerSeasonStats.playerId, id),
          or(gt(playerSeasonStats.appearances, 0), gt(playerSeasonStats.goals, 0)),
        ),
      ),
  ])

  return { appearances: (played?.n ?? 0) + (counted?.n ?? 0), goals: goals?.n ?? 0 }
}
