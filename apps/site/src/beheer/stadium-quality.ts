import type { Database } from '@fansite/db/client'

import { clubHomeGrounds, clubs, matches, stadiumNames, stadiums } from '@fansite/db/schema'
import { startDate } from '@fansite/db/stadiums'
import { asc, eq, min } from 'drizzle-orm'

import { clubPath, groundPath } from '#src/app/beheer/stadions/paths'

// What the editors still have to fill in about the stadiums (#1307): a list of four kinds, each
// with the stadiums or clubs that miss it. The matches that miss a stadium are a column in the
// table of the quality of the matches (`quality-table.ts`), not here.

/** A stadium or a club in one of the lists: its name and the address of its screen. */
export type StadiumGap = { href: string; name: string }

/** The four lists, each sorted A to Z, and how many entries they hold together. */
export type StadiumGaps = {
  /** Clubs that were at home against us and have no home ground for that time. */
  clubsWithoutGround: StadiumGap[]
  total: number
  withoutAddress: StadiumGap[]
  withoutCoordinates: StadiumGap[]
  withoutWikidata: StadiumGap[]
}

const byName = (a: StadiumGap, b: StadiumGap) => a.name.localeCompare(b.name, 'nl')

/**
 * What the stadiums and clubs still miss. A stadium misses a Wikidata number, coordinates (the
 * table keeps them as a pair) or an address (street and postcode). A club misses a home ground
 * when it was at home in a match of ours and has no ground at all, or its first ground began
 * after its first home match. sc Heerenveen itself is no club here: its grounds have no club.
 */
export async function readStadiumGaps(db: Pick<Database, 'select'>): Promise<StadiumGaps> {
  const [rows, names, homeMatches, grounds, allClubs] = await Promise.all([
    db
      .select({
        id: stadiums.id,
        latitude: stadiums.latitude,
        postcode: stadiums.postcode,
        street: stadiums.street,
        wikidataId: stadiums.wikidataId,
      })
      .from(stadiums),
    db
      .select({ name: stadiumNames.name, stadiumId: stadiumNames.stadiumId })
      .from(stadiumNames)
      .orderBy(asc(stadiumNames.position)),
    db
      .select({ clubId: matches.clubId, first: min(matches.matchDate) })
      .from(matches)
      .where(eq(matches.home, false))
      .groupBy(matches.clubId),
    db
      .select({
        clubId: clubHomeGrounds.clubId,
        startDay: clubHomeGrounds.startDay,
        startSeason: clubHomeGrounds.startSeason,
      })
      .from(clubHomeGrounds),
    db.select({ id: clubs.id, name: clubs.name, slug: clubs.slug }).from(clubs),
  ])
  const current = new Map<number, string>()

  for (const name of names) {
    current.set(name.stadiumId, name.name)
  }

  // The day the first ground of each club begins; empty is "always".
  const firstGround = new Map<number, string>()

  for (const ground of grounds) {
    if (ground.clubId === null) {
      continue
    }

    const start = startDate(ground) ?? ''
    const known = firstGround.get(ground.clubId)

    if (known === undefined || start < known) {
      firstGround.set(ground.clubId, start)
    }
  }

  const stadiumGap = (row: { id: number }): StadiumGap => ({
    href: groundPath(row.id),
    name: current.get(row.id) ?? `Stadion ${row.id}`,
  })
  const withoutWikidata = rows.filter((row) => row.wikidataId === null).map(stadiumGap)
  const withoutCoordinates = rows.filter((row) => row.latitude === null).map(stadiumGap)
  const withoutAddress = rows.filter((row) => row.street === null || row.postcode === null).map(stadiumGap)
  const clubsById = new Map(allClubs.map((club) => [club.id, club]))
  const clubsWithoutGround = homeMatches.flatMap(({ clubId, first }) => {
    const club = clubsById.get(clubId)
    const start = firstGround.get(clubId)

    return club === undefined || (start !== undefined && (first === null || start <= first))
      ? []
      : [{ href: clubPath(club.slug), name: club.name }]
  })

  for (const list of [withoutWikidata, withoutCoordinates, withoutAddress, clubsWithoutGround]) {
    list.sort(byName)
  }

  return {
    clubsWithoutGround,
    total: withoutWikidata.length + withoutCoordinates.length + withoutAddress.length + clubsWithoutGround.length,
    withoutAddress,
    withoutCoordinates,
    withoutWikidata,
  }
}
