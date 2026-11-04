// The names of the clubs in the admin: the list of the clubs, the club an editor opens with
// its own list and the spellings Wikipedia has for it, and the two changes, saving a list and
// taking it away. A change and its row in the log are one transaction (see
// `club-name-periods.ts` in the database package). The checks of what an editor fills in are
// in `club-name-form.ts`.
import type { Database } from '@fansite/db/client'

import {
  listClubNamePeriods,
  listClubsWithNamePeriods,
  type NamePeriodLine,
  removeClubNamePeriods,
  replaceClubNamePeriods,
} from '@fansite/db/club-name-periods'
import { findClubBySlug, listClubRecords } from '@fansite/db/queries'

export { searchClubs } from './stadiums'

export { removeClubNamePeriods, replaceClubNamePeriods }

/** The club an editor opens: it, its own list and the spellings Wikipedia has for it. */
export type AdminClub = {
  club: { id: number; name: string; slug: string }
  own: NamePeriodLine[]
  /** The other spellings in the data of Wikipedia (`club_names`), A to Z. Read only. */
  spellings: string[]
}

/** One club in the list: its name and address part, and whether it has a list of its own. */
export type AdminClubRow = { id: number; name: string; own: boolean; slug: string }

/** What the list shows: every club, or those with a list of their own. */
export type NamesShow = 'alles' | 'eigen-lijst'

/** The club with this address part, or undefined for one no club has. */
export async function findAdminClub(db: Database, slug: string): Promise<AdminClub | undefined> {
  const club = await findClubBySlug(db, slug)

  if (club === undefined) {
    return undefined
  }

  return {
    club: { id: club.id, name: club.name, slug: club.slug },
    own: await listClubNamePeriods(db, club.id),
    spellings: club.otherNames,
  }
}

/**
 * What the heading of the club says, against the last name of its list: a sentence when they
 * are not the same name, so the editors see that the importer decides the heading. Capitals,
 * accents and punctuation make no difference, as for the importer. `undefined` when they fit or
 * when there is no list.
 */
export function headingNotice(heading: string, own: readonly NamePeriodLine[]): string | undefined {
  const last = own.at(-1)

  if (last === undefined || key(last.name) === key(heading)) {
    return undefined
  }

  return `De laatste naam van de lijst, ${last.name}, is niet de naam in de kop van de pagina, ${heading}. De kop komt van de import. Opslaan kan wel.`
}

/** The clubs sc Heerenveen has a match against, A to Z, with whether each has its own list. */
export async function listAdminClubs(db: Database): Promise<AdminClubRow[]> {
  const [records, own] = await Promise.all([listClubRecords(db), listClubsWithNamePeriods(db)])

  return records.map(({ id, name, slug }) => ({ id, name, own: own.has(id), slug }))
}

const key = (name: string) =>
  name
    .normalize('NFKD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]/gu, '')
