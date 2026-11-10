// The changes of a match that wait (`match_changes`): writing a match and its goals, keeping a
// change that is judged suspicious, and deciding one, by the importer after seven days or by a
// person. `classify-change.ts` judges; this file holds what the database needs for it.
import type { Database } from '@fansite/db/client'
import type { Proposal } from '@fansite/db/match-changes'
import type { Match, MatchChange, NewMatchChange } from '@fansite/db/schema'

import { decideChange, encodeProposal } from '@fansite/db/match-changes'
import { decideConflict, takenOverAt } from '@fansite/db/match-conflicts'
import { matchChanges } from '@fansite/db/schema'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'

import type { Judgement, MatchHistory } from './classify-change.ts'

import { reliability } from './classify-change.ts'

/** What a person's decision came to. */
export type Decision = { change: MatchChange; message: string; ok: boolean }

export type { LinkedGoal, Proposal } from '@fansite/db/match-changes'
export { decodeProposal, encodeProposal, storeGoals, updateMatch } from '@fansite/db/match-changes'

/**
 * What the changes of the season say that the judgement needs: for each match the values it had
 * before the changes of the last week, and the values that were rejected, and the change a
 * person rejected last, which the import leaves alone while the page still shows it.
 */
export type SeasonChanges = {
  history: (key: string) => MatchHistory
  /** The changes that wait, by the key of the match. */
  pending: Map<string, MatchChange>
  /** The value a person rejected last for the match, or undefined. `null` is a removal. */
  rejectedByPerson: (key: string) => null | string | undefined
}

type Writer = Pick<Database, 'delete' | 'insert' | 'select' | 'update'>

/**
 * Accepts the waiting changes with these numbers, or all of them: the match and its goals
 * become what the change proposes, and a removal deletes the match. A change that is not
 * waiting any more, or whose match is gone, is left alone and says so.
 */
export async function acceptChanges(db: Database, ids: 'all' | number[], now: Date): Promise<Decision[]> {
  const decisions: Decision[] = []

  for (const change of await changesToDecide(db, ids)) {
    // A change is taken over whole or not at all: the match, its goals and the decision.
    decisions.push(await db.transaction((transaction) => acceptChange(transaction, change, now)))
  }

  return decisions
}

/** The change of a match, as the key of its round: unique in a season. */
export function changeKey(change: Pick<MatchChange, 'competition' | 'round'>): string {
  return `${change.competition}|${change.round}`
}

/** Decides a waiting change. */
export async function decide(
  db: Pick<Database, 'update'>,
  change: Pick<MatchChange, 'id'>,
  status: 'accepted' | 'rejected',
  resolution: 'person' | 'replaced' | 'reverted' | 'stood',
  now: Date,
) {
  await db.update(matchChanges).set({ decidedAt: now, resolution, status }).where(eq(matchChanges.id, change.id))
}

/**
 * Whether a waiting change has stood long enough to be taken over: seven days, and only in the
 * season that is on. A change of a season that is over waits until a person decides (issue
 * 1025), also for the weekly read of the season that has just ended and for `import:season`.
 */
export function hasStood(change: MatchChange, now: Date): boolean {
  const at = takenOverAt(change, now)

  return at !== undefined && now.getTime() >= at.getTime()
}

/** Notes that the import saw the waiting change again, with the same value. */
export async function noteSeen(db: Pick<Database, 'update'>, change: MatchChange, now: Date) {
  await db
    .update(matchChanges)
    .set({ lastSeenAt: now, timesSeen: change.timesSeen + 1 })
    .where(eq(matchChanges.id, change.id))
}

/** Reads the changes of a season, with what the judgement needs of the last week. */
export async function readSeasonChanges(db: Writer, season: string, now: Date): Promise<SeasonChanges> {
  // A difference with an entry of the editors has its own judgement (`edited-matches.ts`).
  const rows = await db
    .select()
    .from(matchChanges)
    .where(and(eq(matchChanges.season, season), isNull(matchChanges.part)))
    .orderBy(asc(matchChanges.id))
  const since = now.getTime() - reliability.warLookback
  const pending = new Map<string, MatchChange>()
  const recent = new Map<string, MatchChange[]>()
  const last = new Map<string, MatchChange>()

  for (const row of rows) {
    const key = changeKey(row)

    if (row.status === 'pending') {
      pending.set(key, row)
    } else {
      last.set(key, row)
    }
    if (row.firstSeenAt.getTime() >= since) {
      recent.set(key, [...(recent.get(key) ?? []), row])
    }
  }

  return {
    history: (key) => ({
      rejected: (recent.get(key) ?? [])
        .filter((row) => row.status === 'rejected' && row.newValue !== null)
        .map((row) => row.newValue ?? ''),
      returnedTo: (recent.get(key) ?? []).map((row) => row.oldValue),
    }),
    pending,
    rejectedByPerson: (key) => {
      const row = last.get(key)

      return row?.status === 'rejected' && row.resolution === 'person' ? row.newValue : undefined
    },
  }
}

/** Keeps a change that waits, or a correction that was taken over, in `match_changes`. */
export async function recordChange(
  db: Pick<Database, 'insert'>,
  change: {
    competition: Match['competition']
    judgement: Judgement
    matchId: number
    newValue: null | string
    oldValue: string
    proposal: null | Proposal
    round: string
    season: string
  },
  now: Date,
  waits: boolean,
) {
  const values: NewMatchChange = {
    changed: change.judgement.changed.join(', '),
    class: waits ? 'suspicious' : 'improvement',
    competition: change.competition,
    decidedAt: waits ? null : now,
    firstSeenAt: now,
    lastSeenAt: now,
    matchId: change.matchId,
    newValue: change.newValue,
    oldValue: change.oldValue,
    proposal: change.proposal === null ? null : encodeProposal(change.proposal),
    reason: change.judgement.reason,
    resolution: waits ? null : 'applied',
    round: change.round,
    season: change.season,
    status: waits ? 'pending' : 'accepted',
  }

  await db.insert(matchChanges).values(values)
}

/** Rejects the waiting changes with these numbers, or all of them: the match stays as it is. */
export async function rejectChanges(db: Database, ids: 'all' | number[], now: Date): Promise<Decision[]> {
  const decisions: Decision[] = []

  for (const change of await changesToDecide(db, ids)) {
    decisions.push(await db.transaction((transaction) => decideWaiting(transaction, change, 'keep', now)))
  }

  return decisions
}

/** The changes that wait, oldest first, for any season. */
export async function waitingChanges(db: Pick<Database, 'select'>): Promise<MatchChange[]> {
  return db.select().from(matchChanges).where(eq(matchChanges.status, 'pending')).orderBy(asc(matchChanges.id))
}

/** Takes one waiting change over. */
function acceptChange(db: Writer, change: MatchChange, now: Date): Promise<Decision> {
  return decideWaiting(db, change, 'take-over', now)
}

/** The changes with these numbers that wait. A number that waits no more is left out. */
async function changesToDecide(db: Pick<Database, 'select'>, ids: 'all' | number[]): Promise<MatchChange[]> {
  if (ids !== 'all' && ids.length === 0) {
    return []
  }

  return db
    .select()
    .from(matchChanges)
    .where(
      ids === 'all'
        ? eq(matchChanges.status, 'pending')
        : and(eq(matchChanges.status, 'pending'), inArray(matchChanges.id, ids)),
    )
    .orderBy(asc(matchChanges.id))
}

/**
 * Decides a waiting change with the code the admin uses: a difference with an entry of the
 * editors (`decideConflict`) or a change that Wikipedia holds back (`decideChange`). The
 * command has no reason of its own, so it gives the same one for both.
 */
async function decideWaiting(
  db: Writer,
  change: MatchChange,
  kind: 'keep' | 'take-over',
  now: Date,
): Promise<Decision> {
  const decision = {
    kind,
    reason: 'Besloten met het commando import:changes',
    resolution: 'person' as const,
    userId: null,
  }
  const outcome =
    change.part === null
      ? await decideChange(db, change.id, decision, now)
      : await decideConflict(db, change.id, decision, now)

  switch (outcome) {
    case 'done':
      return { change, message: kind === 'keep' ? 'rejected' : 'accepted', ok: true }
    case 'gone':
      return { change, message: 'the match is not in the database any more', ok: false }
    case 'no-proposal':
      return { change, message: 'the change has no proposal to apply', ok: false }
    case 'not-waiting':
      return { change, message: 'the change does not wait any more', ok: false }
  }
}
