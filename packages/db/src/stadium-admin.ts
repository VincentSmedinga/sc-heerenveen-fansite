// The stadiums in the admin (#1299): the list, one stadium with its names, and the changes the
// editors make. A change and its row in the log of the admin are one transaction. The checks
// of what an editor fills in (the length of a name, the form of a start, the coordinates) are
// in the site; the tables keep the rest. The importer (#1298) leaves a place, coordinates and
// home grounds alone that an editor set (`manual`).
import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { HomeGroundRow, StadiumLine } from './stadiums.ts'

import { recordAction } from './audit-log.ts'
import { clubHomeGrounds, clubs, stadiumNames, stadiums } from './schema.ts'
import { writeHomeGrounds } from './stadiums.ts'

/** One stadium as the editors see it, with its names in order and the clubs that play there. */
export type AdminStadium = {
  clubs: { name: string; slug: string }[]
  names: StadiumLine[]
  stadium: {
    id: number
    latitude: null | string
    longitude: null | string
    place: null | string
    placeSource: 'manual' | 'wikidata' | null
    postcode: null | string
    street: null | string
    wikidataId: null | string
  }
}

/** A stadium in the list: its name now, its place and what we know of where it is. */
export type AdminStadiumRow = {
  hasAddress: boolean
  hasCoordinates: boolean
  id: number
  /** The last name in the order of its names, which is the name it has now. */
  name: string
  place: null | string
}

/** What setting the Wikidata number of a club did. */
export type ClubWikidataOutcome =
  { club: string; status: 'taken' } | { name: string; status: 'done' | 'unchanged' } | { status: 'missing' }

/** What going back to Wikidata did. `clubs` is how many clubs the importer will read again. */
export type ResetPlaceOutcome =
  { clubs: number; status: 'done' } | { status: 'manual-source-only' | 'missing' | 'no-item' | 'unchanged' }

/** What saving the home grounds of a club did. */
export type SaveHomeGroundsOutcome = 'missing' | 'saved' | 'unknown-stadium'

/** What saving a stadium did: it is saved (`created` when it is new), or it is gone. */
export type SaveStadiumOutcome = { created: boolean; id: number; status: 'saved' } | { status: 'missing' }

/** What an editor fills in for a stadium. The coordinates are decimal text, both or none. */
export type StadiumInput = {
  latitude: null | string
  longitude: null | string
  names: readonly StadiumLine[]
  place: null | string
  postcode: null | string
  street: null | string
}

/** The stadium with this number, or undefined. */
export async function findAdminStadium(
  db: Pick<Database, 'select' | 'selectDistinct'>,
  id: number,
): Promise<AdminStadium | undefined> {
  const [stadium] = await db.select().from(stadiums).where(eq(stadiums.id, id))

  if (stadium === undefined) {
    return undefined
  }

  const [names, playing] = await Promise.all([
    db
      .select({
        name: stadiumNames.name,
        note: stadiumNames.note,
        startDay: stadiumNames.startDay,
        startSeason: stadiumNames.startSeason,
      })
      .from(stadiumNames)
      .where(eq(stadiumNames.stadiumId, id))
      .orderBy(asc(stadiumNames.position)),
    db
      .selectDistinct({ name: clubs.name, slug: clubs.slug })
      .from(clubHomeGrounds)
      .innerJoin(clubs, eq(clubs.id, clubHomeGrounds.clubId))
      .where(eq(clubHomeGrounds.stadiumId, id))
      .orderBy(asc(clubs.name)),
  ])

  return {
    clubs: playing,
    names,
    stadium: {
      id: stadium.id,
      latitude: stadium.latitude,
      longitude: stadium.longitude,
      place: stadium.place,
      placeSource: stadium.placeSource,
      postcode: stadium.postcode,
      street: stadium.street,
      wikidataId: stadium.wikidataId,
    },
  }
}

/** The stadiums A to Z by their name now. */
export async function listAdminStadiums(db: Pick<Database, 'select'>): Promise<AdminStadiumRow[]> {
  const [rows, names] = await Promise.all([
    db
      .select({
        id: stadiums.id,
        latitude: stadiums.latitude,
        place: stadiums.place,
        postcode: stadiums.postcode,
        street: stadiums.street,
      })
      .from(stadiums),
    db
      .select({ name: stadiumNames.name, position: stadiumNames.position, stadiumId: stadiumNames.stadiumId })
      .from(stadiumNames)
      .orderBy(asc(stadiumNames.position)),
  ])
  const current = new Map<number, string>()

  for (const name of names) {
    current.set(name.stadiumId, name.name)
  }

  return rows
    .map((row) => ({
      hasAddress: row.street !== null && row.postcode !== null,
      hasCoordinates: row.latitude !== null,
      id: row.id,
      name: current.get(row.id) ?? `Stadion ${row.id}`,
      place: row.place,
    }))
    .toSorted((a, b) => a.name.localeCompare(b.name, 'nl') || a.id - b.id)
}

/** The home grounds of a club in order, for its form. */
export async function listClubHomeGrounds(
  db: Pick<Database, 'select'>,
  clubId: number,
): Promise<(Pick<StadiumLine, 'note' | 'startDay' | 'startSeason'> & { stadiumId: number })[]> {
  return db
    .select({
      note: clubHomeGrounds.note,
      stadiumId: clubHomeGrounds.stadiumId,
      startDay: clubHomeGrounds.startDay,
      startSeason: clubHomeGrounds.startSeason,
    })
    .from(clubHomeGrounds)
    .where(eq(clubHomeGrounds.clubId, clubId))
    .orderBy(asc(clubHomeGrounds.position))
}

/**
 * Puts the place and the coordinates of a stadium back to what Wikidata says: it empties them
 * and their source, and clears the moment the clubs that play there were read, so the importer
 * reads them again. The importer leaves a club alone whose home grounds an editor set, so a
 * stadium that only such clubs use gets nothing back; the outcome says so. Only a stadium with
 * an item of Wikidata and a place from an editor changes; it writes `ground.edit`.
 */
export async function resetStadiumToWikidata(
  db: Database,
  userId: number,
  id: number,
  now = new Date(),
): Promise<ResetPlaceOutcome> {
  return db.transaction(async (transaction) => {
    const [found] = await transaction.select().from(stadiums).where(eq(stadiums.id, id)).for('update')

    if (found === undefined) {
      return { status: 'missing' }
    }
    if (found.wikidataId === null) {
      return { status: 'no-item' }
    }
    if (found.placeSource !== 'manual') {
      return { status: 'unchanged' }
    }

    const readable = await transaction
      .select({ id: clubs.id })
      .from(clubHomeGrounds)
      .innerJoin(clubs, eq(clubs.id, clubHomeGrounds.clubId))
      .where(
        and(
          eq(clubHomeGrounds.stadiumId, id),
          or(isNull(clubs.homeGroundsSource), eq(clubs.homeGroundsSource, 'wikidata')),
        ),
      )

    await transaction
      .update(stadiums)
      .set({ latitude: null, longitude: null, place: null, placeSource: null })
      .where(eq(stadiums.id, id))

    if (readable.length > 0) {
      await transaction
        .update(clubs)
        .set({ stadiumsReadAt: null })
        .where(
          inArray(
            clubs.id,
            readable.map((club) => club.id),
          ),
        )
    }

    await recordAction(
      transaction,
      { action: 'ground.edit', detail: 'plaats en coördinaten terug naar Wikidata', itemId: id, userId },
      now,
    )

    return readable.length === 0 ? { status: 'manual-source-only' } : { clubs: readable.length, status: 'done' }
  })
}

/**
 * Saves the home grounds of a club, in this order, and sets `home_grounds_source` to `manual`,
 * so the importer does not replace them. It writes `home-ground.save` in the log, in the same
 * transaction, with the number of grounds and how many have a note. The row of the club is
 * locked. A stadium that does not exist stops it before anything is written.
 */
export async function saveClubHomeGrounds(
  db: Database,
  userId: number,
  clubId: number,
  rows: readonly HomeGroundRow[],
  now = new Date(),
): Promise<SaveHomeGroundsOutcome> {
  return db.transaction(async (transaction) => {
    const [club] = await transaction.select({ id: clubs.id }).from(clubs).where(eq(clubs.id, clubId)).for('update')

    if (club === undefined) {
      return 'missing'
    }

    const wanted = [...new Set(rows.map((row) => row.stadiumId))]

    if (wanted.length > 0) {
      const [{ total = 0 } = {}] = await transaction
        .select({ total: sql<number>`count(*)` })
        .from(stadiums)
        .where(inArray(stadiums.id, wanted))

      if (Number(total) !== wanted.length) {
        return 'unknown-stadium'
      }
    }

    await writeHomeGrounds(transaction, clubId, rows)
    await transaction.update(clubs).set({ homeGroundsSource: 'manual' }).where(eq(clubs.id, clubId))
    await recordAction(
      transaction,
      {
        action: 'home-ground.save',
        detail: `${rows.length} thuisvelden, ${rows.filter((row) => (row.note ?? null) !== null).length} met toelichting`,
        itemId: clubId,
        userId,
      },
      now,
    )

    return 'saved'
  })
}

/**
 * Makes a stadium (`id` is null) or saves one, with its names in this order, and writes
 * `ground.create` or `ground.edit` and `ground-name.save` in the log in the same transaction.
 * The row of the stadium is locked, so two editors who save at the same time do not mix their
 * names. A changed place or changed coordinates make the source `manual`, which the importer
 * leaves alone; a stadium without place and coordinates has no source. The log says which
 * parts changed and how many names have a note, never the text of a name or a note.
 */
export async function saveStadium(
  db: Database,
  userId: number,
  id: null | number,
  input: StadiumInput,
  now = new Date(),
): Promise<SaveStadiumOutcome> {
  return db.transaction(async (transaction) => {
    const values = {
      latitude: input.latitude,
      longitude: input.longitude,
      place: input.place,
      postcode: input.postcode,
      street: input.street,
    }
    let stadiumId: number
    let changed: string[]

    if (id === null) {
      const noPlace = input.place === null && input.latitude === null
      const [{ insertId }] = await transaction
        .insert(stadiums)
        .values({ ...values, placeSource: noPlace ? null : 'manual' })

      stadiumId = insertId
      changed = []
    } else {
      const [old] = await transaction.select().from(stadiums).where(eq(stadiums.id, id)).for('update')

      if (old === undefined) {
        return { status: 'missing' }
      }

      const placeChanged = old.place !== input.place
      const coordinatesChanged = old.latitude !== input.latitude || old.longitude !== input.longitude
      const addressChanged = old.street !== input.street || old.postcode !== input.postcode
      const noPlace = input.place === null && input.latitude === null

      changed = [
        ...(placeChanged ? ['plaats'] : []),
        ...(coordinatesChanged ? ['coördinaten'] : []),
        ...(addressChanged ? ['adres'] : []),
      ]
      stadiumId = id
      await transaction
        .update(stadiums)
        .set({
          ...values,
          placeSource: noPlace ? null : placeChanged || coordinatesChanged ? 'manual' : old.placeSource,
        })
        .where(eq(stadiums.id, id))
      await transaction.delete(stadiumNames).where(eq(stadiumNames.stadiumId, id))
    }

    if (input.names.length > 0) {
      await transaction.insert(stadiumNames).values(
        input.names.map((line, position) => ({
          name: line.name,
          note: line.note,
          position,
          stadiumId,
          startDay: line.startDay,
          startSeason: line.startSeason,
        })),
      )
    }

    await recordAction(
      transaction,
      {
        action: id === null ? 'ground.create' : 'ground.edit',
        detail:
          id === null
            ? 'nieuw stadion'
            : changed.length === 0
              ? 'niets gewijzigd aan plaats of adres'
              : changed.join(', '),
        itemId: stadiumId,
        userId,
      },
      now,
    )
    await recordAction(
      transaction,
      {
        action: 'ground-name.save',
        detail: `${input.names.length} namen, ${input.names.filter((line) => line.note !== null).length} met toelichting`,
        itemId: stadiumId,
        userId,
      },
      now,
    )

    return { created: id === null, id: stadiumId, status: 'saved' }
  })
}

/**
 * Gives a club a Wikidata number, or takes it away (`null`), and clears when the importer read
 * the club, so the next import reads its item and its home grounds. It writes `club.edit`. A
 * number that another club has stops it: `taken`, with the name of that club.
 */
export async function setClubWikidataId(
  db: Database,
  userId: number,
  clubId: number,
  wikidataId: null | string,
  now = new Date(),
): Promise<ClubWikidataOutcome> {
  return db.transaction(async (transaction) => {
    const [club] = await transaction
      .select({ name: clubs.name, searchedAt: clubs.wikidataSearchedAt, wikidataId: clubs.wikidataId })
      .from(clubs)
      .where(eq(clubs.id, clubId))
      .for('update')

    if (club === undefined) {
      return { status: 'missing' }
    }
    if (club.wikidataId === wikidataId) {
      return { name: club.name, status: 'unchanged' }
    }
    if (wikidataId !== null) {
      const [other] = await transaction
        .select({ id: clubs.id, name: clubs.name })
        .from(clubs)
        .where(eq(clubs.wikidataId, wikidataId))

      if (other !== undefined) {
        return { club: other.name, status: 'taken' }
      }
    }

    await transaction
      .update(clubs)
      .set({
        stadiumsReadAt: null,
        wikidataId,
        wikidataReadAt: null,
        // The editors' number is theirs, and a number they took away is not searched for again
        // (#1341).
        wikidataSearchedAt: wikidataId === null ? now : club.searchedAt,
        wikidataSource: wikidataId === null ? null : 'manual',
      })
      .where(eq(clubs.id, clubId))
    await recordAction(
      transaction,
      {
        action: 'club.edit',
        detail: `${club.name}, Wikidata-nummer van de club: ${club.wikidataId ?? 'geen'} → ${wikidataId ?? 'geen'}`,
        itemId: clubId,
        userId,
      },
      now,
    )

    return { name: club.name, status: 'done' }
  })
}
