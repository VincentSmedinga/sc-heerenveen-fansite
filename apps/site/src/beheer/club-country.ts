import type { Database } from '@fansite/db/client'

import { clubs, europeanCompetitions, matches } from '@fansite/db/schema'
import { isCountryCode } from '@fansite/shared/countries'
import { asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'

import { recordAction } from './audit-log'
import { regionName } from './countries'

// The country of a club in the admin (#1265): the choice of an editor for one club, and the
// work list of the clubs without a country. A choice and its row in the log of the admin are
// one transaction. The importer fills in the other clubs (#1264) and never changes a country
// that has the source `manual`.

/** A club of the work list. */
export type ClubWithoutCountry = Awaited<ReturnType<typeof listClubsWithoutCountry>>[number]

/** How many clubs one part of the work list shows. */
export const clubListLength = 50

/**
 * The list of the clubs without a country. It is under Clubs, so the bar marks that screen, and
 * `kwaliteit` is a fixed name beside the part of a club (#1306).
 */
export const clubCountryListPath = '/beheer/clubs/kwaliteit'

/** Whether the club is the opponent in a match of a European competition. */
const inEurope = sql`EXISTS (SELECT 1 FROM ${matches} WHERE ${matches.clubId} = ${clubs.id} AND ${inArray(matches.competition, [...europeanCompetitions])})`

/**
 * What a choice did: `done` saved it, `unchanged` found that country already from an editor,
 * and `missing` found no such club. `country` is the code now, null for a club without one.
 */
export type ClubCountryOutcome =
  { country: null | string; name: string; status: 'done' | 'unchanged' } | { status: 'missing' }

/**
 * Gives a club a country with the source `manual`, which no import replaces, or takes its
 * country away (`null`): the club has no country and no source then, so the next import can
 * fill it in again. It writes `club.edit` in the log, as "land van de club: geen → Duitsland".
 * A club that has that country from an editor already changes nothing and writes nothing. A
 * country of Wikidata that an editor chooses too becomes theirs, so the import keeps it.
 */
export async function chooseClubCountry(
  db: Database,
  userId: number,
  clubId: number,
  country: null | string,
  now = new Date(),
): Promise<ClubCountryOutcome> {
  if (country !== null && !isCountryCode(country)) {
    throw new Error(`Not a country code: ${country}`)
  }

  return db.transaction(async (transaction) => {
    const [club] = await transaction
      .select({ country: clubs.country, name: clubs.name, source: clubs.countrySource })
      .from(clubs)
      .where(eq(clubs.id, clubId))
      .for('update')

    if (club === undefined) {
      return { status: 'missing' }
    }
    if (club.country === country && (country === null ? club.source === null : club.source === 'manual')) {
      return { country, name: club.name, status: 'unchanged' }
    }

    await transaction
      .update(clubs)
      .set({ country, countrySource: country === null ? null : 'manual' })
      .where(eq(clubs.id, clubId))
    await recordAction(
      transaction,
      {
        action: 'club.edit',
        detail: `${club.name}, land van de club: ${club.country === null ? 'geen' : countryName(club.country)} → ${country === null ? 'geen' : countryName(country)}`,
        itemId: clubId,
        userId,
      },
      now,
    )

    return { country, name: club.name, status: 'done' }
  })
}

/** How many clubs have no country, and how many of them played a match in Europe. */
export async function countClubsWithoutCountry(
  db: Pick<Database, 'select'>,
): Promise<{ europe: number; total: number }> {
  const [row] = await db
    .select({
      europe: sql<number>`CAST(COALESCE(SUM(${inEurope}), 0) AS UNSIGNED)`.mapWith(Number),
      total: sql<number>`CAST(COUNT(*) AS UNSIGNED)`.mapWith(Number),
    })
    .from(clubs)
    .where(isNull(clubs.country))

  return { europe: row?.europe ?? 0, total: row?.total ?? 0 }
}

/** The Dutch name of a country code, for the log and for what the pages say. */
export function countryName(code: string): string {
  return regionName(code)
}

/**
 * The clubs without a country, the clubs of matches in Europe first and then by name, for the
 * work list. `europe` says whether the club is in the first group.
 */
export async function listClubsWithoutCountry(
  db: Pick<Database, 'select'>,
  { limit = clubListLength, offset = 0 }: { limit?: number; offset?: number } = {},
) {
  const rows = await db
    .select({ europe: sql<number>`${inEurope}`.mapWith(Number), id: clubs.id, name: clubs.name, slug: clubs.slug })
    .from(clubs)
    .where(isNull(clubs.country))
    .orderBy(desc(inEurope), asc(clubs.name), asc(clubs.id))
    .limit(limit)
    .offset(offset)

  return rows.map(({ europe, ...club }) => ({ ...club, europe: europe > 0 }))
}
