// The own list of stadium names of a club, which the editors keep in the admin
// (`club_stadiums`). The site reads it for the card on the page of a club and writes it from
// the admin: saving a list or taking it away is one transaction with its row in the log.
import { asc, eq } from 'drizzle-orm'

import type { Database } from './client.ts'

import { recordAction } from './audit-log.ts'
import { clubs, clubStadiums } from './schema.ts'

/** What taking a list away did: it is gone, the club had none, or there is no such club. */
export type RemoveStadiumsOutcome = 'done' | 'missing' | 'none'

/** What saving a list did: it is saved, or the club is gone. */
export type SaveStadiumsOutcome = 'missing' | 'saved'

/**
 * One name in the list of a club, as it is kept. The start is a season (`2019/20`), a day
 * (`2021-02-14`) or neither, and never both; only the first name of a list has neither.
 */
export type StadiumLine = {
  name: string
  note: null | string
  startDay: null | string
  startSeason: null | string
}

/** The own list of a club in its order, or an empty list for a club without one. */
export async function listClubStadiums(db: Pick<Database, 'select'>, clubId: number): Promise<StadiumLine[]> {
  return db
    .select({
      name: clubStadiums.name,
      note: clubStadiums.note,
      startDay: clubStadiums.startDay,
      startSeason: clubStadiums.startSeason,
    })
    .from(clubStadiums)
    .where(eq(clubStadiums.clubId, clubId))
    .orderBy(asc(clubStadiums.position))
}

/** The numbers of the clubs that have an own list. */
export async function listClubsWithStadiums(db: Pick<Database, 'selectDistinct'>): Promise<Set<number>> {
  const rows = await db.selectDistinct({ clubId: clubStadiums.clubId }).from(clubStadiums)

  return new Set(rows.map((row) => row.clubId))
}

/**
 * Takes the whole list of a club away, so its page shows what the matches say again, and writes
 * `stadium.reset` in the log in the same transaction. A club without a list changes nothing and
 * leaves no row in the log.
 */
export async function removeClubStadiums(
  db: Database,
  userId: number,
  clubId: number,
  now = new Date(),
): Promise<RemoveStadiumsOutcome> {
  return db.transaction(async (transaction) => {
    const [club] = await transaction.select({ id: clubs.id }).from(clubs).where(eq(clubs.id, clubId)).for('update')

    if (club === undefined) {
      return 'missing'
    }

    const [result] = await transaction.delete(clubStadiums).where(eq(clubStadiums.clubId, clubId))

    if (result.affectedRows === 0) {
      return 'none'
    }

    await recordAction(
      transaction,
      { action: 'stadium.reset', detail: `${result.affectedRows} regels weggehaald`, itemId: clubId, userId },
      now,
    )

    return 'done'
  })
}

/**
 * Replaces the list of a club by these lines, in this order, and writes `stadium.save` in the
 * log in the same transaction. The row of the club is locked, so two editors who save at the
 * same time do not mix their lines. The caller has checked the lines (the rules are in the
 * site: the length of a name, the form of a start and their order); the table keeps the rest.
 * The log has the number of lines and how many have a note, and never the text of a note.
 */
export async function replaceClubStadiums(
  db: Database,
  userId: number,
  clubId: number,
  lines: readonly StadiumLine[],
  now = new Date(),
): Promise<SaveStadiumsOutcome> {
  return db.transaction(async (transaction) => {
    const [club] = await transaction.select({ id: clubs.id }).from(clubs).where(eq(clubs.id, clubId)).for('update')

    if (club === undefined) {
      return 'missing'
    }

    await transaction.delete(clubStadiums).where(eq(clubStadiums.clubId, clubId))

    if (lines.length > 0) {
      await transaction.insert(clubStadiums).values(
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

    const withNote = lines.filter((line) => line.note !== null).length

    await recordAction(
      transaction,
      { action: 'stadium.save', detail: `${lines.length} regels, ${withNote} met toelichting`, itemId: clubId, userId },
      now,
    )

    return 'saved'
  })
}
