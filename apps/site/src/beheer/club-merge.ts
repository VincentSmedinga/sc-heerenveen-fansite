// Two clubs of one club become one in the admin (#1345). A club that was in the database
// twice, such as `VVV` next to `VVV-Venlo`, or under an earlier name, is merged by the editors
// on a page of its own: they read what the merge does and confirm. The merge itself is in the
// database package (`mergeChosenClubs`), in one transaction. This file adds what the admin
// needs around it: which club stays by default, the check of the season, the words of the log,
// and the list of clubs to choose from.
import type { Database } from '@fansite/db/client'

import { type ClubMergePlan, defaultKeptClub, mergeChosenClubs, planClubMerge } from '@fansite/db/club-merge'
import { clubs } from '@fansite/db/schema'
import { asc, ne } from 'drizzle-orm'

import { regionName } from './countries'

/** What `findClubMerge` found: the plan, or why there is none. */
export type ClubMergeView = 'both-wikidata' | 'missing' | 'same' | ClubMergePlan

/** What is in a field without a value. */
export const none = 'geen'

const seasonForm = /^(\d{4})\/(\d{2})$/

/** A club to choose from on the form of a club. */
export type ClubChoice = { id: number; label: string }

/** The facts of a club the confirmation page puts next to those of the other, in words. */
export function clubFacts(club: ClubMergePlan['kept'], matches: number): { label: string; value: string }[] {
  return [
    { label: 'Naam', value: club.name },
    { label: 'Adres', value: club.slug },
    { label: 'Wikidata', value: club.wikidataId ?? none },
    { label: 'Wikipedia-artikel', value: club.wikipediaPage ?? none },
    { label: 'Land', value: club.country === null ? none : countryName(club.country) },
    { label: 'Wedstrijden', value: String(matches) },
  ]
}

/**
 * The row of the log of a merge: both clubs with their number, name, address part, Wikidata
 * number and article, what moved in numbers, the names and titles, and the season the name that
 * stays begins in. With it a merge can be undone by hand.
 */
export function describeClubMerge(plan: ClubMergePlan): string {
  const { groundsLeft, groundsMoved, itemClubs, kept, leagueResults, matches, names, other, pages, since, standings } =
    plan
  const club = ({ id, name, slug, wikidataId, wikipediaPage }: ClubMergePlan['kept']) =>
    `club ${id} (${name}, adres ${slug}, Wikidata: ${wikidataId ?? none}, Wikipedia: ${wikipediaPage ?? none})`
  const list = (items: string[]) => (items.length === 0 ? none : items.join(', '))

  return [
    `Samengevoegd: ${club(other)} in ${club(kept)}.`,
    `Verhuisd: ${matches} wedstrijden, ${groundsMoved} thuisstadions, ${plan.periodsMoved} regels van de namenlijst, ${itemClubs} koppen, ${standings} regels van de stand, ${leagueResults} uitslagen, namen: ${list(names)}, titels: ${list(pages)}.`,
    ...(groundsLeft.length === 0 ? [] : [`Niet verhuisd: thuisstadions ${groundsLeft.join(', ')}.`]),
    ...(plan.periodsLeft ? ['De namenlijst van de club die verdween is niet overgenomen.'] : []),
    ...(since === undefined ? [] : [`De blijvende naam begint in ${since}.`]),
  ].join(' ')
}

/**
 * What a merge of the two clubs does, with `keptId` as the club that stays: one of the two, or
 * the default (`defaultKeptClub`) for anything else.
 */
export async function findClubMerge(
  db: Pick<Database, 'select'>,
  clubId: number,
  withId: number,
  keptId?: number,
): Promise<ClubMergeView> {
  const plan = await planClubMerge(db, clubId, withId)

  if (typeof plan === 'string') {
    return plan
  }

  const stays = keptId === clubId || keptId === withId ? keptId : await defaultKeptClub(db, plan.other, plan.kept)

  return stays === withId ? plan : planClubMerge(db, withId, clubId)
}

/** The other clubs, A to Z, each with its Wikidata number so two with one name differ. */
export async function listMergeChoices(db: Pick<Database, 'select'>, clubId: number): Promise<ClubChoice[]> {
  const rows = await db
    .select({ id: clubs.id, name: clubs.name, wikidataId: clubs.wikidataId })
    .from(clubs)
    .where(ne(clubs.id, clubId))
    .orderBy(asc(clubs.name), asc(clubs.id))

  return rows.map((row) => ({
    id: row.id,
    label: `${row.name}${row.wikidataId === null ? '' : ` (${row.wikidataId})`}`,
  }))
}

/**
 * Merges two clubs for an editor: see `mergeChosenClubs`, which writes `club.merge` in the same
 * transaction.
 */
export async function mergeClubs(
  db: Database,
  userId: number,
  { keptId, otherId, since }: { keptId: number; otherId: number; since?: string | undefined },
  now = new Date(),
): Promise<ClubMergeView> {
  return mergeChosenClubs(db, { describe: describeClubMerge, keptId, otherId, since, userId }, now)
}

/**
 * Checks the season an editor filled in: empty is no season, `2002/03` is one, and the second
 * part must be the year after the first (`2002/04` is a typing error). Returns the season, or
 * `undefined` for an empty field, or an error in words.
 */
export function parseSince(value: unknown): { error: string } | { since: string | undefined } {
  if (typeof value !== 'string' || value.trim() === '') {
    return { since: undefined }
  }

  const text = value.trim()
  const parts = seasonForm.exec(text)

  if (parts === null || (Number(parts[1]) + 1) % 100 !== Number(parts[2])) {
    return { error: 'Vul een seizoen in zoals 2002/03, of laat het veld leeg.' }
  }

  return { since: text }
}

function countryName(code: string) {
  try {
    return `${regionName(code)} (${code})`
  } catch {
    return code
  }
}
