// The own list of names of a club, which the editors keep in the admin (`club_name_periods`).
// It is for display: the page of a club says "Eerder" from it, and the lists of matches show
// the name of the season (`withSeasonNames`). The importer still decides the name in the
// heading and the slug, and finds a renamed club through `club_names`, which gets every name
// of a list when it is saved. Saving a list or taking it away is one transaction with its row
// in the log.
import { asc, eq, inArray, ne } from 'drizzle-orm'

import type { Database } from './client.ts'

import { recordAction } from './audit-log.ts'
import { normaliseClubName } from './clubs.ts'
import { clubNamePeriods, clubNames, clubs } from './schema.ts'

/**
 * A name of a list that another club has: the line (counting from 0), the name and the club it
 * belongs to. The importer would find that other club with the name, so the list is refused.
 */
export type NameConflict = { club: string; index: number; name: string }

/**
 * One name in the list of a club, as it is kept. The start is a season (`2012/13`), a day
 * (`2012-06-05`) or neither, and never both; only the first name of a list has neither.
 */
export type NamePeriodLine = {
  name: string
  note: null | string
  startDay: null | string
  startSeason: null | string
}

/** What taking a list away did: it is gone, the club had none, or there is no such club. */
export type RemoveNamePeriodsOutcome = 'done' | 'missing' | 'none'

/** What saving a list did: it is saved, the club is gone, or a name belongs to another club. */
export type SaveNamePeriodsOutcome = 'missing' | 'saved' | { conflicts: NameConflict[] }

/** The own list of a club in its order, or an empty list for a club without one. */
export async function listClubNamePeriods(db: Pick<Database, 'select'>, clubId: number): Promise<NamePeriodLine[]> {
  return db
    .select({
      name: clubNamePeriods.name,
      note: clubNamePeriods.note,
      startDay: clubNamePeriods.startDay,
      startSeason: clubNamePeriods.startSeason,
    })
    .from(clubNamePeriods)
    .where(eq(clubNamePeriods.clubId, clubId))
    .orderBy(asc(clubNamePeriods.position))
}

/** The numbers of the clubs that have an own list. */
export async function listClubsWithNamePeriods(db: Pick<Database, 'selectDistinct'>): Promise<Set<number>> {
  const rows = await db.selectDistinct({ clubId: clubNamePeriods.clubId }).from(clubNamePeriods)

  return new Set(rows.map((row) => row.clubId))
}

/**
 * The name a club had on a day: the last line of its list that has started by then. A season
 * starts on 1 July of its first year, and a day starts on that day. The first line may have no
 * start, so it holds for everything before the second one. `undefined` means the list has no
 * name for that day (the first line has a start, and the day is before it): whoever asks then
 * shows what Wikipedia wrote.
 */
export function nameOnDay(lines: readonly NamePeriodLine[], day: string): string | undefined {
  let found: string | undefined

  for (const line of lines) {
    const start = startOf(line)

    if (start !== undefined && start > day) {
      break
    }

    found = line.name
  }

  return found
}

/**
 * Takes the whole list of a club away and writes `club-name.reset` in the log in the same
 * transaction. The names that the list put in `club_names` stay there, so the importer still
 * finds the club. A club without a list changes nothing and leaves no row in the log.
 */
export async function removeClubNamePeriods(
  db: Database,
  userId: number,
  clubId: number,
  now = new Date(),
): Promise<RemoveNamePeriodsOutcome> {
  return db.transaction(async (transaction) => {
    const [club] = await transaction.select({ id: clubs.id }).from(clubs).where(eq(clubs.id, clubId)).for('update')

    if (club === undefined) {
      return 'missing'
    }

    const [result] = await transaction.delete(clubNamePeriods).where(eq(clubNamePeriods.clubId, clubId))

    if (result.affectedRows === 0) {
      return 'none'
    }

    await recordAction(
      transaction,
      { action: 'club-name.reset', detail: `${result.affectedRows} regels weggehaald`, itemId: clubId, userId },
      now,
    )

    return 'done'
  })
}

/**
 * Replaces the list of a club by these lines, in this order, puts every name of it that the
 * importer does not know yet in `club_names`, and writes `club-name.save` in the log, all in
 * one transaction. The row of the club is locked, so two editors who save at the same time do
 * not mix their lines. A name that belongs to another club (the name in its heading, or one of
 * its other names, with no difference in capitals, accents or punctuation, as the importer
 * looks for it) refuses the whole list, and nothing is saved. The caller has checked the lines
 * (the rules are in the site: the length of a name, the form of a start and their order); the
 * table keeps the rest. The log has the number of lines, how many have a note and how many
 * names went to `club_names`, and never the text of a note.
 */
export async function replaceClubNamePeriods(
  db: Database,
  userId: number,
  clubId: number,
  lines: readonly NamePeriodLine[],
  now = new Date(),
): Promise<SaveNamePeriodsOutcome> {
  return db.transaction(async (transaction) => {
    const [club] = await transaction
      .select({ id: clubs.id, name: clubs.name })
      .from(clubs)
      .where(eq(clubs.id, clubId))
      .for('update')

    if (club === undefined) {
      return 'missing'
    }

    const owners = await ownersOfNames(transaction, clubId)
    const conflicts = lines.flatMap((line, index): NameConflict[] => {
      const owner = owners.get(normaliseClubName(line.name))

      return owner === undefined ? [] : [{ club: owner, index, name: line.name }]
    })

    if (conflicts.length > 0) {
      return { conflicts }
    }

    await transaction.delete(clubNamePeriods).where(eq(clubNamePeriods.clubId, clubId))

    if (lines.length > 0) {
      await transaction.insert(clubNamePeriods).values(
        lines.map((line, position) => ({
          clubId,
          name: line.name,
          note: line.note,
          position,
          startDay: line.startDay,
          startSeason: line.startSeason,
        })),
      )
    }

    const known = new Set([club.name, ...(await listClubSpellings(transaction, clubId))].map(normaliseClubName))
    const added: string[] = []

    for (const line of lines) {
      if (!known.has(normaliseClubName(line.name))) {
        known.add(normaliseClubName(line.name))
        added.push(line.name)
      }
    }
    if (added.length > 0) {
      await transaction.insert(clubNames).values(added.map((name) => ({ clubId, name })))
    }

    const withNote = lines.filter((line) => line.note !== null).length

    await recordAction(
      transaction,
      {
        action: 'club-name.save',
        detail: `${lines.length} regels, ${withNote} met toelichting, ${added.length} namen erbij voor de import`,
        itemId: clubId,
        userId,
      },
      now,
    )

    return 'saved'
  })
}

/**
 * Gives each row the name its club had on the day of the match, when the club has a list that
 * has a name for that day (see `nameOnDay`); otherwise the row keeps the spelling of Wikipedia
 * in `opponent`. One query reads the lists of all the clubs of the rows, and none is made when
 * there are no rows.
 */
export async function withSeasonNames<T extends { clubId: number; matchDate: string; opponent: string }>(
  db: Pick<Database, 'select'>,
  rows: readonly T[],
): Promise<T[]> {
  if (rows.length === 0) {
    return []
  }

  const found = await db
    .select({
      clubId: clubNamePeriods.clubId,
      name: clubNamePeriods.name,
      note: clubNamePeriods.note,
      startDay: clubNamePeriods.startDay,
      startSeason: clubNamePeriods.startSeason,
    })
    .from(clubNamePeriods)
    .where(inArray(clubNamePeriods.clubId, [...new Set(rows.map((row) => row.clubId))]))
    .orderBy(asc(clubNamePeriods.clubId), asc(clubNamePeriods.position))
  const lists = new Map<number, NamePeriodLine[]>()

  for (const line of found) {
    lists.set(line.clubId, [...(lists.get(line.clubId) ?? []), line])
  }

  return rows.map((row) => {
    const name = nameOnDay(lists.get(row.clubId) ?? [], row.matchDate)

    return name === undefined ? { ...row } : { ...row, opponent: name }
  })
}

/** The spellings Wikipedia uses for a club (`club_names`), A to Z. */
async function listClubSpellings(db: Pick<Database, 'select'>, clubId: number): Promise<string[]> {
  const rows = await db
    .select({ name: clubNames.name })
    .from(clubNames)
    .where(eq(clubNames.clubId, clubId))
    .orderBy(asc(clubNames.name))

  return rows.map((row) => row.name)
}

/**
 * Every name another club has, by its normalised form with the name of that club: the name in
 * its heading and its other names. The first club to take a name keeps it, as in the importer.
 */
async function ownersOfNames(db: Pick<Database, 'select'>, clubId: number) {
  const owners = new Map<string, string>()
  const others = await db.select({ id: clubs.id, name: clubs.name }).from(clubs).where(ne(clubs.id, clubId))
  const names = await db
    .select({ clubId: clubNames.clubId, name: clubNames.name })
    .from(clubNames)
    .where(ne(clubNames.clubId, clubId))
  const clubNameOf = new Map(others.map((other) => [other.id, other.name]))

  for (const other of others) {
    owners.set(normaliseClubName(other.name), other.name)
  }
  for (const name of names) {
    const owner = clubNameOf.get(name.clubId)

    if (owner !== undefined && !owners.has(normaliseClubName(name.name))) {
      owners.set(normaliseClubName(name.name), owner)
    }
  }

  return owners
}

/** The day a line starts: a season is the first of July of its first year. */
function startOf(line: Pick<NamePeriodLine, 'startDay' | 'startSeason'>): string | undefined {
  if (line.startSeason !== null) {
    return `${line.startSeason.slice(0, 4)}-07-01`
  }

  return line.startDay ?? undefined
}
