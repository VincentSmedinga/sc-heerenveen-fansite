// The stadiums of the clubs in the admin: the list of the clubs and the club an editor opens
// with its home grounds and its Wikidata number. A change and its row in the log are one
// transaction (see `stadium-admin.ts` in the database package). The checks of what an editor
// fills in are in `stadium-form.ts`.
import type { Database } from '@fansite/db/client'

import { findClubBySlug, listClubRecords } from '@fansite/db/queries'
import { clubHomeGrounds, clubs } from '@fansite/db/schema'
import { type AdminStadiumRow, listClubHomeGrounds } from '@fansite/db/stadium-admin'
import { eq } from 'drizzle-orm'

import type { HomeGroundRowValues } from './home-ground-fields'

import { homeGroundRowOf } from './home-ground-form'

/** One club in the list: its name and address part, and whether it has home grounds. */
export type AdminClubRow = { grounds: boolean; id: number; name: string; slug: string }

/** What the list shows: every club, or those with home grounds. */
export type StadiumShow = 'alles' | 'thuisvelden'

/** The clubs sc Heerenveen has a match against, A to Z, with whether each has home grounds. */
export async function listAdminClubs(db: Database): Promise<AdminClubRow[]> {
  const [records, withGrounds] = await Promise.all([
    listClubRecords(db),
    db.selectDistinct({ clubId: clubHomeGrounds.clubId }).from(clubHomeGrounds),
  ])
  const have = new Set(withGrounds.map((row) => row.clubId))

  return records.map(({ id, name, slug }) => ({ grounds: have.has(id), id, name, slug }))
}

/**
 * The clubs of a list that fit the search, which is a part of the name: capitals and accents
 * make no difference, and the words may be anywhere in the name. An empty search fits all.
 */
export function searchClubs<T extends { name: string }>(clubs: readonly T[], search: string): T[] {
  const words = plain(search).split(' ').filter(Boolean)

  return clubs.filter((club) => words.every((word) => plain(club.name).includes(word)))
}

/**
 * The stadiums as choices for a list: the name now and the place. Two stadiums with the same
 * label get their number, so a screen reader and the eye can tell them apart.
 */
export function stadiumChoices(rows: readonly AdminStadiumRow[]): { id: number; label: string }[] {
  const labels = rows.map((row) => (row.place === null ? row.name : `${row.name} (${row.place})`))

  return rows.map((row, index) => ({
    id: row.id,
    label:
      labels.filter((label) => label === labels[index]).length > 1
        ? `${labels[index]}, nummer ${row.id}`
        : labels[index]!,
  }))
}

const plain = (text: string) =>
  text
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll(/[\s‐-―-]+/gu, ' ')
    .trim()

/** The club an editor opens: it, its home grounds and its Wikidata number. */
export type AdminClub = {
  club: { id: number; name: string; slug: string; wikidataId: null | string }
  /** The home grounds of the club as lines of the form, and who set them. */
  homeGrounds: { rows: HomeGroundRowValues[]; source: 'manual' | 'wikidata' | null }
}

/** The club with this address part, or undefined for one no club has. */
export async function findAdminClub(db: Database, slug: string): Promise<AdminClub | undefined> {
  const club = await findClubBySlug(db, slug)

  if (club === undefined) {
    return undefined
  }

  const [grounds, [extra]] = await Promise.all([
    listClubHomeGrounds(db, club.id),
    db
      .select({ source: clubs.homeGroundsSource, wikidataId: clubs.wikidataId })
      .from(clubs)
      .where(eq(clubs.id, club.id)),
  ])

  return {
    club: { id: club.id, name: club.name, slug: club.slug, wikidataId: extra?.wikidataId ?? null },
    homeGrounds: { rows: grounds.map(homeGroundRowOf), source: extra?.source ?? null },
  }
}
