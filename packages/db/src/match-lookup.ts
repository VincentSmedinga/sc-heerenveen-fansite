import { and, asc, eq, sql } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { Competition, Match } from './schema.ts'

import { matches } from './schema.ts'

/** What a source says about a match, in the columns of `matches`. */
export type MatchClaim = Partial<Omit<Match, 'clubId' | 'id' | 'opponent' | 'round' | 'season'>>

/** A field that differs between a stored match and what a source says. */
export type MatchDifference = { field: string; stored: string; theirs: string }

/** What `findMatchByDate` found. */
export type MatchLookup =
  /** Two or more matches against the club within a day (a replay): none of them is chosen. */
  { kind: 'ambiguous'; matches: Match[] } | { kind: 'found'; match: Match } | { kind: 'none' }

/** The days around a date that still count as the same match (a match that moved by a day). */
const slackInDays = 1

/** The nullable columns an import fills when they are empty. The result and the status stay. */
const fillable = [
  'afterNinetyAgainst',
  'afterNinetyFor',
  'attendance',
  'dateText',
  'kickoffAt',
  'note',
  'penaltiesAgainst',
  'penaltiesFor',
  'referee',
  'stadium',
] as const

/** The columns that are only compared: a difference is for the editors to settle (#974). */
const compared = ['extraTime', 'goalsAgainst', 'goalsFor', 'home', 'matchDate', 'status'] as const

const show = (value: unknown) => (value instanceof Date ? value.toISOString() : String(value))

/**
 * Compares a stored match with what another source says. `fill` holds the empty columns the
 * other source can fill, and `differences` the columns that both have and that differ. The
 * columns in `locked` are the editors' (see `lockedFields` in `match-edits.ts`): they are left
 * out, as the rest of the import leaves them alone.
 */
export function compareClaim(
  stored: Match,
  claim: MatchClaim,
  locked: readonly string[] = [],
): { differences: MatchDifference[]; fill: Partial<Match> } {
  const fill: Record<string, unknown> = {}
  const differences: MatchDifference[] = []
  const same = (a: unknown, b: unknown) =>
    a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b

  for (const field of fillable) {
    const theirs = claim[field]

    if (locked.includes(field) || theirs === undefined || theirs === null) {
      continue
    }
    if (stored[field] === null) {
      fill[field] = theirs
    } else if (!same(stored[field], theirs)) {
      differences.push({ field, stored: show(stored[field]), theirs: show(theirs) })
    }
  }
  for (const field of compared) {
    const theirs = claim[field]

    if (!locked.includes(field) && theirs !== undefined && !same(stored[field], theirs)) {
      differences.push({ field, stored: show(stored[field]), theirs: show(theirs) })
    }
  }

  return { differences, fill: fill as Partial<Match> }
}

/**
 * The match of a season and competition against a club on a date, with a day of slack, whatever
 * its source and round. The round is only a property: another source names it differently.
 * When two matches fit (a replay within a day) none is returned and the matches come back as
 * `ambiguous`, so the import can report it and keep both.
 */
export async function findMatchByDate(
  db: Pick<Database, 'select'>,
  query: { clubId: number; competition: Competition; date: string; season: string },
): Promise<MatchLookup> {
  const rows = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.season, query.season),
        eq(matches.competition, query.competition),
        eq(matches.clubId, query.clubId),
        sql`abs(datediff(${matches.matchDate}, ${query.date})) <= ${slackInDays}`,
      ),
    )

  if (rows.length > 1) {
    return { kind: 'ambiguous', matches: rows }
  }

  return rows[0] === undefined ? { kind: 'none' } : { kind: 'found', match: rows[0] }
}

/**
 * The matches of a season and competition against a club, whatever their source, round and
 * date, the earliest first. For a source that has no dates, such as a cross table (#976): a
 * league has one match at home and one away against a club, so the caller chooses on `home`.
 */
export async function findMatchesByClub(
  db: Pick<Database, 'select'>,
  query: { clubId: number; competition: Competition; season: string },
): Promise<Match[]> {
  return db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.season, query.season),
        eq(matches.competition, query.competition),
        eq(matches.clubId, query.clubId),
      ),
    )
    .orderBy(asc(matches.matchDate), asc(matches.id))
}
