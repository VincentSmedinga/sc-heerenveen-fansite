// The stadiums of the clubs in the admin: the list of the clubs, the club an editor opens with
// its own list and what the matches say, and the two changes, saving a list and going back to
// Wikipedia. A change and its row in the log are one transaction (see `club-stadiums.ts` in
// the database package). The checks of what an editor fills in are in `stadium-form.ts`.
import type { Database } from '@fansite/db/client'

import {
  listClubStadiums,
  listClubsWithStadiums,
  removeClubStadiums,
  replaceClubStadiums,
  type StadiumLine,
} from '@fansite/db/club-stadiums'
import { findClubBySlug, listClubMatches, listClubRecords } from '@fansite/db/queries'

import type { StadiumView } from '../opponents'
import type { StadiumRowValues } from './stadium-fields'

import { stadiumsOf, stadiumViewsOf } from '../opponents'

export { removeClubStadiums, replaceClubStadiums }

/** One club in the list: its name and address part, and whether it has a list of its own. */
export type AdminClubRow = { id: number; name: string; own: boolean; slug: string }

/** What the list shows: every club, or those with a list of their own. */
export type StadiumShow = 'alles' | 'eigen-lijst'

/** The clubs sc Heerenveen has a match against, A to Z, with whether each has its own list. */
export async function listAdminClubs(db: Database): Promise<AdminClubRow[]> {
  const [records, own] = await Promise.all([listClubRecords(db), listClubsWithStadiums(db)])

  return records.map(({ id, name, slug }) => ({ id, name, own: own.has(id), slug }))
}

/**
 * The clubs of a list that fit the search, which is a part of the name: capitals and accents
 * make no difference, and the words may be anywhere in the name. An empty search fits all.
 */
export function searchClubs<T extends { name: string }>(clubs: readonly T[], search: string): T[] {
  const words = plain(search).split(' ').filter(Boolean)

  return clubs.filter((club) => words.every((word) => plain(club.name).includes(word)))
}

const plain = (text: string) =>
  text
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll(/[\s‐-―-]+/gu, ' ')
    .trim()

/** The club an editor opens: it, its own list and what the matches say. */
export type AdminClub = {
  club: { id: number; name: string; slug: string }
  own: StadiumLine[]
  /** What the matches say, as the card of a club without a list shows it. */
  wikipedia: StadiumView[]
  /** The same names and seasons as lines of the form, for the button "Overnemen". */
  wikipediaRows: StadiumRowValues[]
}

/** The club with this address part, or undefined for one no club has. */
export async function findAdminClub(db: Database, slug: string): Promise<AdminClub | undefined> {
  const club = await findClubBySlug(db, slug)

  if (club === undefined) {
    return undefined
  }

  const [own, matches] = await Promise.all([listClubStadiums(db, club.id), listClubMatches(db, club.id)])

  return {
    club: { id: club.id, name: club.name, slug: club.slug },
    own,
    wikipedia: stadiumViewsOf([], matches),
    wikipediaRows: stadiumsOf(matches).map((stadium, index) => ({
      dag: '',
      naam: stadium.name,
      seizoen: index === 0 ? '' : stadium.firstSeason,
      toelichting: '',
    })),
  }
}
