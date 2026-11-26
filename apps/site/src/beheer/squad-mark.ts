// The mark of the editors that the squad of a season is complete (issue 1675): what the page
// Spelers of the admin shows of it, and the two changes, marking and taking the mark back. The
// mark, the new outcome of the completeness (`storeCompleteness`) and the row in the log are
// one transaction, so the site never has one without the others.
import type { Database } from '@fansite/db/client'

import { recordAction } from '@fansite/db/audit-log'
import { adminUsers, players, squadCompleteMarks } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { findMissingScorers, storeCompleteness } from '@fansite/db/store-completeness'
import { eq } from 'drizzle-orm'

import { accountName } from './account-name'
import { listPlayerSeasons } from './players'

/** What the page Spelers of the admin shows about the mark of a season. */
export type SquadMark = {
  /** Whether the editors may mark the season now: it is over and it has a player. */
  canMark: boolean
  /** The mark, or undefined for a season that has none. */
  mark:
    | undefined
    | {
        /** The first name or the address of the account, or null when the account is gone. */
        by: null | string
        markedAt: Date
        /** The scorers of ours who are not in the list: with one, the mark does not count. */
        missing: string[]
      }
}

/** What marking or taking the mark back did. `refused` is a season that can't be marked. */
export type SquadMarkOutcome = 'done' | 'refused' | 'unchanged'

/** The mark of a season and whether it can get one. The season is one the admin knows. */
export async function findSquadMark(db: Database, season: string, now = new Date()): Promise<SquadMark> {
  const [[mark], canMark] = await Promise.all([
    db
      .select({
        accountId: adminUsers.id,
        by: accountName(adminUsers),
        markedAt: squadCompleteMarks.markedAt,
      })
      .from(squadCompleteMarks)
      .leftJoin(adminUsers, eq(squadCompleteMarks.markedBy, adminUsers.id))
      .where(eq(squadCompleteMarks.season, season)),
    canBeMarked(db, season, now),
  ])

  if (mark === undefined) {
    return { canMark, mark: undefined }
  }

  return {
    canMark,
    mark: {
      by: mark.accountId === null ? null : mark.by,
      markedAt: mark.markedAt,
      missing: await findMissingScorers(db, season),
    },
  }
}

/**
 * Marks the squad of a season as complete. Only a season that is over (from 1 July after it)
 * and has a player can be marked. A season that has the mark keeps it as it is, with who set it
 * first. Writes `squad.mark-complete`.
 */
export async function markSquadComplete(
  db: Database,
  userId: number,
  season: string,
  now = new Date(),
): Promise<SquadMarkOutcome> {
  if (!(await listPlayerSeasons(db, now)).includes(season)) {
    return 'refused'
  }

  return db.transaction(async (transaction) => {
    if (!(await canBeMarked(transaction, season, now))) {
      return 'refused'
    }
    if (await hasMark(transaction, season)) {
      return 'unchanged'
    }

    await transaction.insert(squadCompleteMarks).values({ markedAt: now, markedBy: userId, season })
    await storeCompleteness(transaction, season, undefined, now)
    await recordAction(
      transaction,
      {
        action: 'squad.mark-complete',
        detail: `Selectie ${season} gemarkeerd als compleet`,
        itemId: startYear(season),
        userId,
      },
      now,
    )

    return 'done'
  })
}

/**
 * Takes the mark of a season back: the completeness is worked out as before it, from what the
 * database holds. Writes `squad.unmark-complete`.
 */
export async function unmarkSquadComplete(
  db: Database,
  userId: number,
  season: string,
  now = new Date(),
): Promise<SquadMarkOutcome> {
  if (!(await listPlayerSeasons(db, now)).includes(season)) {
    return 'refused'
  }

  return db.transaction(async (transaction) => {
    if (!(await hasMark(transaction, season))) {
      return 'unchanged'
    }

    await transaction.delete(squadCompleteMarks).where(eq(squadCompleteMarks.season, season))
    await storeCompleteness(transaction, season, undefined, now)
    await recordAction(
      transaction,
      {
        action: 'squad.unmark-complete',
        detail: `Markering van de selectie ${season} ingetrokken`,
        itemId: startYear(season),
        userId,
      },
      now,
    )

    return 'done'
  })
}

async function canBeMarked(db: Pick<Database, 'select'>, season: string, now: Date) {
  if (season >= seasonOf(now)) {
    return false
  }

  const [player] = await db.select({ id: players.id }).from(players).where(eq(players.season, season)).limit(1)

  return player !== undefined
}

/** Reads the mark with a lock, so two editors at once can't set or remove it twice. */
async function hasMark(db: Pick<Database, 'select'>, season: string) {
  const [mark] = await db
    .select({ season: squadCompleteMarks.season })
    .from(squadCompleteMarks)
    .where(eq(squadCompleteMarks.season, season))
    .for('update')

  return mark !== undefined
}

/** The number a season has in the log: the year it starts in. */
function startYear(season: string) {
  return Number(season.slice(0, 4))
}
