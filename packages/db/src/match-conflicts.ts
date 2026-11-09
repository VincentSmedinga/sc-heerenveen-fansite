import { eq } from 'drizzle-orm'

// A difference between Wikipedia and an entry of the editors (issue 577): what the importer
// keeps of it in `match_changes`, and the decision about it. The importer records a difference
// and takes Wikipedia over after seven days; an editor decides in the admin; and the command
// `import:changes` decides too. All of them call `decideConflict`, so the same decision has the
// same outcome wherever it is made.
import type { Database } from './client.ts'
import type { FactsFields, GoalSnapshot, KickoffFields, ResultFields } from './match-edits.ts'
import type { Match, MatchChange, MatchDataSource, MatchPart } from './schema.ts'

import { recordAction } from './audit-log.ts'
import { clearParts, insertGoals } from './match-edits.ts'
import { matchChanges, matchEdits, matches, matchGoals } from './schema.ts'

/**
 * A decision about a difference. `take-over` makes the part what Wikipedia says and lets the
 * entry go for that part, `keep` leaves the entry. `userId` is the account that decided, or
 * `null` for the importer and the command. `resolution` is how it came about: `person`, or
 * `stood` when nobody decided in seven days.
 */
export type ConflictDecision = {
  kind: 'keep' | 'take-over'
  reason: string
  resolution: 'person' | 'stood'
  userId: null | number
}

/**
 * What a decision came to: `done`; `not-waiting` when the difference was decided already or
 * does not exist; `gone` when its match is gone; `no-proposal` when the difference has nothing
 * to take over.
 */
export type ConflictOutcome = 'done' | 'gone' | 'no-proposal' | 'not-waiting'

/** What the importer proposes for a part: that part of the match as Wikipedia has it. */
export type PartProposal =
  | {
      afterNinetyAgainst: null | number
      afterNinetyFor: null | number
      extraTime: boolean
      goalsAgainst: null | number
      goalsFor: null | number
      part: 'result'
      penaltiesAgainst: null | number
      penaltiesFor: null | number
      status: Match['status']
    }
  | {
      attendance: null | number
      note: null | string
      part: 'facts'
      referee: null | string
      stadium: null | string
    }
  | { dateText: null | string; kickoffAt: null | string; matchDate: string; part: 'kickoff' }
  | {
      goals: GoalSnapshot[]
      part: 'goals'
      /** The goals the match had, only for the goals of the old fansite that are kept. */
      stored?: GoalSnapshot[]
    }

type Writer = Pick<Database, 'delete' | 'insert' | 'select' | 'update'>

/**
 * How long a difference stays before the importer takes Wikipedia over, when nobody decides:
 * seven days, the rule of the changes that wait (issue 460). The importer, the mails and the
 * admin all read it here.
 */
export const conflictStandsMs = 7 * 24 * 60 * 60 * 1000

/**
 * Why the goals of a match of the old fansite wait as a change: the list of the files does not
 * add up to the score of the match (issue 973). It is no difference with Wikipedia, so nobody
 * is mailed about it and the importer never takes it over by itself.
 */
export const oldSiteGoalsReason = 'de doelpunten van de oude fansite tellen niet op tot de uitslag'

/**
 * Why a field of a match waits as a change: a second source says something else than the
 * source the match comes from (issue 974), by the second source. The value of the match stays
 * until an editor decides: nobody is mailed about it and the importer never takes it over by
 * itself.
 */
export const sourceDifferenceReasons = {
  'oude-fansite': 'de oude fansite zegt iets anders dan de bron van de wedstrijd',
  wikipedia: 'Wikipedia zegt iets anders dan de bron van de wedstrijd',
} as const

/** A source that is compared with a match of another source. */
export type SecondSource = keyof typeof sourceDifferenceReasons

/** The sources of a match in the words of a sentence. */
export const sourceLabels: Record<MatchDataSource, string> = {
  'oude-fansite': 'de oude fansite',
  redactie: 'de redactie',
  wikipedia: 'Wikipedia',
}

/**
 * The reasons of the changes with a part that are no difference between Wikipedia and an entry
 * of the editors: no mail goes out for them, and only a person decides them.
 */
export const quietReasons: readonly string[] = [oldSiteGoalsReason, ...Object.values(sourceDifferenceReasons)]

/** The second source of a difference between two sources, or undefined for any other change. */
export function secondSourceOf(reason: string): SecondSource | undefined {
  return (Object.keys(sourceDifferenceReasons) as SecondSource[]).find(
    (source) => sourceDifferenceReasons[source] === reason,
  )
}

/** The parts of a match in the words of the admin, the log and the mails. */
export const partLabels: Record<MatchPart, string> = {
  facts: 'gegevens',
  goals: 'doelpunten',
  kickoff: 'aftrap',
  result: 'uitslag',
}

/**
 * Decides a difference that waits, in the transaction the caller opened. Taking Wikipedia
 * over writes that part of the match, clears its marker in `match_edits` (the row goes when
 * no part is left) and writes `match.take-over`; keeping the entry writes `match.keep`. Either
 * way the change is decided. The decision is one transaction with its log line, so there is no
 * decision without a line and no line without a decision.
 */
export async function decideConflict(
  db: Writer,
  changeId: number,
  decision: ConflictDecision,
  now: Date,
): Promise<ConflictOutcome> {
  const [change] = await db.select().from(matchChanges).where(eq(matchChanges.id, changeId)).for('update')

  if (change === undefined || change.status !== 'pending' || change.part === null) {
    return 'not-waiting'
  }

  const part = change.part

  if (change.matchId === null) {
    return 'gone'
  }

  const [match] = await db.select({ id: matches.id }).from(matches).where(eq(matches.id, change.matchId)).for('update')

  if (match === undefined) {
    return 'gone'
  }

  if (decision.kind === 'take-over') {
    const proposal = decodePartProposal(change.proposal)

    if (proposal === undefined || proposal.part !== part) {
      return 'no-proposal'
    }

    await applyPart(db, match.id, proposal, now)

    const [edit] = await db.select().from(matchEdits).where(eq(matchEdits.matchId, match.id)).for('update')

    if (edit !== undefined) {
      await clearParts(db, edit, [part])
    }
  }

  await db
    .update(matchChanges)
    .set({
      decidedAt: now,
      resolution: decision.resolution,
      status: decision.kind === 'take-over' ? 'accepted' : 'rejected',
    })
    .where(eq(matchChanges.id, change.id))
  await recordAction(
    db,
    {
      action: decision.kind === 'take-over' ? 'match.take-over' : 'match.keep',
      detail: describeConflict(change),
      itemId: match.id,
      reason: decision.reason,
      userId: decision.userId,
    },
    now,
  )

  return 'done'
}

/** The proposal in JSON text, or undefined when the text is not one we wrote. */
export function decodePartProposal(text: null | string): PartProposal | undefined {
  if (text === null) {
    return undefined
  }

  try {
    const parsed = JSON.parse(text) as PartProposal

    return (parsed.part === 'goals' && Array.isArray(parsed.goals)) ||
      (parsed.part === 'kickoff' && typeof parsed.matchDate === 'string') ||
      (parsed.part === 'result' && typeof parsed.status === 'string') ||
      (parsed.part === 'facts' && 'attendance' in parsed && 'referee' in parsed)
      ? parsed
      : undefined
  } catch {
    return undefined
  }
}

/**
 * The line for the log: the part with the entry and Wikipedia, or, for the kept goals of the
 * old fansite, with the goals the match had and the list of the files, or, for a difference
 * between two sources, with what the match had and what the second source says.
 */
export function describeConflict(change: Pick<MatchChange, 'newValue' | 'oldValue' | 'part' | 'reason'>): string {
  const name = change.part === null ? '' : partLabels[change.part]

  if (change.reason === oldSiteGoalsReason) {
    return `Doelpunten van de oude fansite: in de database: ${change.oldValue}; in de bestanden: ${change.newValue ?? 'niets'}`
  }

  const second = secondSourceOf(change.reason)

  if (second !== undefined) {
    return `${name.slice(0, 1).toLocaleUpperCase('nl')}${name.slice(1)}: in de database: ${change.oldValue}; ${sourceLabels[second]}: ${change.newValue ?? 'niets'}`
  }

  return `${name.slice(0, 1).toLocaleUpperCase('nl')}${name.slice(1)}: onze invoer: ${change.oldValue}; Wikipedia: ${change.newValue ?? 'niets'}`
}

/**
 * The text for `match_changes.proposal`: the part as Wikipedia has it. `goals` are the goals
 * as they are stored, in the order they are shown.
 */
export function encodePartProposal(
  part: MatchPart,
  wikipedia: {
    goals: GoalSnapshot[]
    match: FactsFields & KickoffFields & Omit<ResultFields, 'home' | 'opponent'>
  },
): string {
  const { goals, match } = wikipedia
  const proposal: PartProposal =
    part === 'goals'
      ? { goals, part }
      : part === 'facts'
        ? {
            attendance: match.attendance,
            note: match.note,
            part,
            referee: match.referee,
            stadium: match.stadium,
          }
        : part === 'kickoff'
          ? {
              dateText: match.dateText,
              kickoffAt: match.kickoffAt?.toISOString() ?? null,
              matchDate: match.matchDate,
              part,
            }
          : {
              afterNinetyAgainst: match.afterNinetyAgainst,
              afterNinetyFor: match.afterNinetyFor,
              extraTime: match.extraTime,
              goalsAgainst: match.goalsAgainst,
              goalsFor: match.goalsFor,
              part,
              penaltiesAgainst: match.penaltiesAgainst,
              penaltiesFor: match.penaltiesFor,
              status: match.status,
            }

  return JSON.stringify(proposal)
}

/** Writes the part of a match as the proposal has it. */
async function applyPart(db: Writer, matchId: number, proposal: PartProposal, now: Date) {
  if (proposal.part === 'goals') {
    await db.delete(matchGoals).where(eq(matchGoals.matchId, matchId))
    await insertGoals(db, matchId, proposal.goals)

    return
  }
  if (proposal.part === 'facts') {
    const [current] = await db.select({ status: matches.status }).from(matches).where(eq(matches.id, matchId))

    await db
      .update(matches)
      .set({
        // Only a played match has spectators (`matches_attendance_in_range_when_played`).
        attendance: current?.status === 'played' ? proposal.attendance : null,
        note: proposal.note,
        referee: proposal.referee,
        stadium: proposal.stadium,
      })
      .where(eq(matches.id, matchId))

    return
  }
  if (proposal.part === 'kickoff') {
    await db
      .update(matches)
      .set({
        dateText: proposal.dateText,
        kickoffAt: proposal.kickoffAt === null ? null : new Date(proposal.kickoffAt),
        matchDate: proposal.matchDate,
      })
      .where(eq(matches.id, matchId))

    return
  }

  await db
    .update(matches)
    .set({
      afterNinetyAgainst: proposal.afterNinetyAgainst,
      afterNinetyFor: proposal.afterNinetyFor,
      extraTime: proposal.extraTime,
      goalsAgainst: proposal.goalsAgainst,
      goalsFor: proposal.goalsFor,
      penaltiesAgainst: proposal.penaltiesAgainst,
      penaltiesFor: proposal.penaltiesFor,
      resultSetAt: proposal.status === 'played' ? now : null,
      status: proposal.status,
      // Only a played match has spectators (`matches_attendance_in_range_when_played`).
      ...(proposal.status === 'played' ? {} : { attendance: null }),
    })
    .where(eq(matches.id, matchId))
}
