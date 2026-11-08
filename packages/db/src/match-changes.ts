// The changes of a match on Wikipedia that the importer holds back (`match_changes` without a
// `part`, issue 460): what a change proposes, writing it into a match and its goals, and the
// decision about it. The importer takes a held change over after seven days, a person decides
// in the admin (issue 752), and the command `import:changes` decides too. All of them call
// `decideChange`, so the same decision has the same outcome wherever it is made.
import { and, eq } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { ConflictOutcome } from './match-conflicts.ts'
import type { Competition, Match, MatchChange, MatchStatus, NewMatchGoal } from './schema.ts'

import { recordAction } from './audit-log.ts'
import { matchChanges, matches, matchGoals } from './schema.ts'

/**
 * A decision about a held change. `take-over` makes the match what the change proposes (or
 * deletes it, when Wikipedia does not name it any more), `keep` leaves the match as it is.
 * `userId` is the account that decided, or `null` for the command. A held change is only ever
 * decided by a person here, so the `resolution` is `person`.
 */
export type ChangeDecision = { kind: 'keep' | 'take-over'; reason: string; userId: null | number }

/** A goal as it is kept: what the page says, and the player of ours it is linked to or null. */
export type LinkedGoal = Omit<ReadGoal, 'minute'> & {
  /** Wikipedia always has a minute; a stored goal of the old fansite may not. */
  minute: null | number
  personId: null | number
  playerId: null | number
}

/** The new state of a match: what the page says, its club and its goals. */
export type Proposal = { clubId: number; goals: LinkedGoal[]; match: ReadMatch }

/** One goal of a played match, as the page names it. */
export type ReadGoal = {
  /** The minute on the clock: 45 for "45+1". */
  minute: number
  /** True for a goal of sc Heerenveen, false for a goal of the opponent. */
  ours: boolean
  /** An own goal, which is listed under the club that benefits from it. */
  ownGoal: boolean
  penalty: boolean
  /** The name as the page shows it, such as `Van Bergen`. */
  player: string
  /** The page of the link: `Luca Oyen` for `[[Luca Oyen|Oyen]]`, or null (`linkedPage`). */
  playerPage: null | string
  /** The minutes of added time: 1 for "45+1". Null in regular time. */
  stoppageMinutes: null | number
}

/** What the import keeps of one match of sc Heerenveen. */
export type ReadMatch = {
  /**
   * The score after 90 minutes of a match with extra time, from our side, when the page
   * gives it. Both or neither. It may equal the result, and is never above it.
   */
  afterNinetyAgainst: null | number
  afterNinetyFor: null | number
  /**
   * The number of spectators of a played match: 0 for a match without an audience, null when
   * the page has no number or none we can read (see `factsProblem`).
   */
  attendance: null | number
  competition: Competition
  /** The date as Wikipedia writes it, only when the time is unknown. */
  dateText: null | string
  /** Whether a played match went to extra time. Only the cup and the play-offs have it. */
  extraTime: boolean
  /**
   * Why the attendance or the referee could not be read, or null. Then the field in question
   * is null and the match is imported all the same: it is a side issue.
   */
  factsProblem: null | string
  /**
   * The goals in the order of the clock, both clubs together. Null when the page names no
   * scorers (yet), and for a match that is not played. They are not checked against the score
   * yet: see `checkGoals`.
   */
  goals: null | ReadGoal[]
  /** Empty unless the match is played. */
  goalsAgainst: null | number
  goalsFor: null | number
  /** Why the scorers of a played match could not be read, or null. Then `goals` is null. */
  goalsProblem: null | string
  home: boolean
  /** Empty while the time is unknown. UTC. */
  kickoffAt: Date | null
  /** The local day, or the first day when only a weekend is known: `2026-10-24`. */
  matchDate: string
  /**
   * A line about the match as the page tells it, now only for a match that was stopped and
   * finished later: the minute it stopped and the day and the stadium of the rest. Null for
   * every other match.
   */
  note: null | string
  opponent: string
  /**
   * The article of the opponent as the match links it: `Telstar (voetbalclub)` for
   * `[[Telstar (voetbalclub)|Telstar]]`, or null when the name has no link (`linkedPage`).
   */
  opponentPage: null | string
  /** The shoot-out of a match level after extra time, from our side. Both or neither. */
  penaltiesAgainst: null | number
  penaltiesFor: null | number
  /**
   * The full name of the referee, from the link target when the name is linked, else the text
   * (`Sander van der Eijk` for `[[Sander van der Eijk|Van der Eijk]]`). Null when the page has
   * none or none we can read: see `factsProblem`.
   */
  referee: null | string
  /** As Wikipedia has it: `Speelronde 12`, `Eerste ronde`. */
  round: string
  stadium: null | string
  status: MatchStatus
}

type Writer = Pick<Database, 'delete' | 'insert' | 'select' | 'update'>

/**
 * Decides a held change, in the transaction the caller opened. Taking Wikipedia over writes
 * the match and its goals as the change proposes, or deletes the match when `new_value` is
 * empty; keeping it leaves the match. Either way the change is decided, with the account and
 * the moment, and `match.take-over` or `match.keep` with the reason goes in the log, in the
 * same transaction. A change that is decided already, or whose match is gone, changes nothing.
 */
export async function decideChange(
  db: Writer,
  changeId: number,
  decision: ChangeDecision,
  now: Date,
): Promise<ConflictOutcome> {
  const [change] = await db.select().from(matchChanges).where(eq(matchChanges.id, changeId)).for('update')

  if (change === undefined || change.status !== 'pending' || change.part !== null) {
    return 'not-waiting'
  }

  const [match] = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.season, change.season),
        eq(matches.competition, change.competition),
        eq(matches.round, change.round),
      ),
    )
    .for('update')

  if (match === undefined) {
    return 'gone'
  }

  if (decision.kind === 'take-over') {
    if (change.newValue === null) {
      await db.delete(matches).where(eq(matches.id, match.id))
    } else {
      const proposal = decodeProposal(change.proposal)

      if (proposal === undefined) {
        return 'no-proposal'
      }

      await updateMatch(db, match, proposal, true, now)
    }
  }

  await db
    .update(matchChanges)
    .set({
      decidedAt: now,
      resolution: 'person',
      status: decision.kind === 'take-over' ? 'accepted' : 'rejected',
    })
    .where(eq(matchChanges.id, change.id))
  await recordAction(
    db,
    {
      action: decision.kind === 'take-over' ? 'match.take-over' : 'match.keep',
      detail: describeChange(change),
      itemId: match.id,
      reason: decision.reason,
      userId: decision.userId,
    },
    now,
  )

  return 'done'
}

/** The proposal in JSON text, or undefined when the text is not one we wrote. */
export function decodeProposal(text: null | string): Proposal | undefined {
  if (text === null) {
    return undefined
  }

  try {
    const parsed = JSON.parse(text, (name, value: unknown) =>
      name === 'kickoffAt' && typeof value === 'string' ? new Date(value) : value,
    ) as Proposal

    return Array.isArray(parsed.goals) && typeof parsed.clubId === 'number' && typeof parsed.match.round === 'string'
      ? parsed
      : undefined
  } catch {
    return undefined
  }
}

/** What `match_changes.changed` says, in the words of the admin and the log. */
const changedLabels: Record<string, string> = {
  attendance: 'toeschouwers',
  date: 'datum',
  everything: 'alles',
  goals: 'doelpunten',
  note: 'opmerking',
  opponent: 'tegenstander',
  referee: 'scheidsrechter',
  removed: 'wedstrijd weg',
  result: 'uitslag',
  stadium: 'stadion',
  unknown: 'onbekend',
}

/**
 * The line for the log: what changed, in Dutch, and whether Wikipedia drops the match. The
 * values themselves are one line of English for the machine, so they stay in `match_changes`.
 */
export function describeChange(change: Pick<MatchChange, 'changed' | 'newValue'>): string {
  const parts = change.changed.split(', ').map((part) => changedLabels[part] ?? part)

  return `Wijziging van Wikipedia: ${parts.join(', ')}${change.newValue === null ? ' (de wedstrijd staat niet meer op de pagina)' : ''}`
}

/** The proposal as JSON text, for `match_changes.proposal`. */
export function encodeProposal(proposal: Proposal): string {
  return JSON.stringify(proposal)
}

/** Writes the goals of a match in the order they are shown, so `id` keeps that order. */
export async function storeGoals(db: Pick<Database, 'insert'>, matchId: number, goals: LinkedGoal[]) {
  if (goals.length > 0) {
    await db.insert(matchGoals).values(
      goals.map(({ playerPage, ...goal }): NewMatchGoal => ({
        ...goal,
        matchId,
        wikipediaPage: playerPage,
      })),
    )
  }
}

/**
 * Makes a stored match what the page says. `result_set_at` moves only when the result does: it
 * is the moment the import first saw the result as it stands. The goals are written again when
 * `goalsChanged` says they differ.
 */
export async function updateMatch(
  db: Pick<Database, 'delete' | 'insert' | 'update'>,
  before: Pick<Match, 'goalsAgainst' | 'goalsFor' | 'id' | 'resultSetAt' | 'status'>,
  proposal: Proposal,
  goalsChanged: boolean,
  now: Date,
) {
  const { clubId, goals, match } = proposal
  const sameResult =
    before.status === match.status && before.goalsFor === match.goalsFor && before.goalsAgainst === match.goalsAgainst

  await db
    .update(matches)
    .set({
      ...match,
      clubId,
      resultSetAt: sameResult ? before.resultSetAt : match.status === 'played' ? now : null,
    })
    .where(eq(matches.id, before.id))

  if (goalsChanged) {
    await db.delete(matchGoals).where(eq(matchGoals.matchId, before.id))
    await storeGoals(db, before.id, goals)
  }
}
