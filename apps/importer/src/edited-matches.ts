// What the import does with a match the editors filled in (`match_edits`, see issue 272). The
// entry is in `matches` and `match_goals`, and the import judges each part of it on its own,
// the kick-off, the result and the goals, because Wikipedia usually has the result long
// before the goals:
//
// - Wikipedia has nothing for the part yet: the entry stays, and nothing is said.
// - Wikipedia has the same: the marker of the part is cleared and the log says that Wikipedia
//   caught up. The part follows Wikipedia from then on.
// - Wikipedia has something else: the entry stays, and the difference goes in the log and in
//   the warning of the import, once, with both values. A person decides (issue 577); until then
//   it stays until an administrator removes the entry.
//
// The parts without a marker follow Wikipedia as for any match, without the judgement of
// `classify-change.ts`.
import type { Database } from '@fansite/db/client'
import type { Match, MatchEdit, MatchGoal } from '@fansite/db/schema'

import { recordAction } from '@fansite/db/audit-log'
import {
  clearParts,
  describeEntryGoals,
  describeEntryKickoff,
  describeEntryResult,
  type GoalFields,
  type KickoffFields,
  markedParts,
  type MatchPart,
  type ResultFields,
} from '@fansite/db/match-edits'
import { matchEdits, matches } from '@fansite/db/schema'
import { eq, inArray } from 'drizzle-orm'

import type { LinkedGoal } from './match-changes.ts'
import type { ReadMatch } from './read-wikipedia.ts'

/** What Wikipedia says about a part, compared with the entry of the editors. */
export type Verdict = 'different' | 'nothing' | 'same'

const partNames: Record<MatchPart, { dutch: string; english: string }> = {
  goals: { dutch: 'doelpunten', english: 'goals' },
  kickoff: { dutch: 'aftrap', english: 'kick-off' },
  result: { dutch: 'uitslag', english: 'result' },
}

/**
 * Handles one match with an entry: judges its three parts, writes what the log and the warning
 * need and clears the markers of the parts Wikipedia caught up with. The caller makes the match
 * the entry where a marker stays and Wikipedia where there is none (`mergeEntry`). It returns
 * the parts that stay the entry's, and the warnings for the import.
 */
export async function importEditedMatch(
  db: Pick<Database, 'delete' | 'insert' | 'select' | 'update'>,
  {
    before,
    edit,
    storedGoals,
    wikipedia,
    wikipediaGoals,
  }: {
    before: Match
    edit: MatchEdit
    storedGoals: MatchGoal[]
    wikipedia: ReadMatch
    wikipediaGoals: LinkedGoal[]
  },
  now: Date,
): Promise<{ keep: MatchPart[]; warnings: string[] }> {
  const warnings: string[] = []
  const goalsOfWikipedia: GoalFields[] = wikipediaGoals.map((goal) => ({ ...goal }))
  const judged: Partial<Record<MatchPart, { entry: string; verdict: Verdict; wikipedia: string }>> = {}

  if (edit.kickoffEdited) {
    judged.kickoff = {
      entry: describeEntryKickoff(before),
      verdict: judgeKickoff(before, wikipedia),
      wikipedia: describeEntryKickoff(wikipedia),
    }
  }
  if (edit.resultEdited) {
    judged.result = {
      entry: describeEntryResult(before),
      verdict: judgeResult(before, wikipedia),
      wikipedia: describeEntryResult({ ...wikipedia, opponent: before.opponent }),
    }
  }
  if (edit.goalsEdited) {
    judged.goals = {
      entry: describeEntryGoals(storedGoals),
      verdict: judgeGoals(storedGoals, goalsOfWikipedia),
      wikipedia: describeEntryGoals(goalsOfWikipedia),
    }
  }

  const caughtUp: MatchPart[] = []
  const reported: Partial<Record<MatchPart, null | string>> = {}

  for (const part of ['kickoff', 'result', 'goals'] as const) {
    const found = judged[part]

    if (found === undefined) {
      continue
    }

    const previous =
      part === 'kickoff' ? edit.reportedKickoff : part === 'result' ? edit.reportedResult : edit.reportedGoals

    if (found.verdict === 'same') {
      caughtUp.push(part)
      await recordAction(
        db,
        {
          action: 'match.caught-up',
          detail: clean(
            `${capital(partNames[part].dutch)}: Wikipedia heeft nu hetzelfde als de invoer: ${found.wikipedia}`,
          ),
          itemId: before.id,
          reason: `Wikipedia heeft de ${partNames[part].dutch} van de wedstrijd overgenomen`,
          userId: null,
        },
        now,
      )
    } else if (found.verdict === 'different') {
      if (previous !== found.wikipedia) {
        reported[part] = found.wikipedia
        await recordAction(
          db,
          {
            action: 'match.differs',
            detail: clean(
              `${capital(partNames[part].dutch)}: onze invoer: ${found.entry}; Wikipedia: ${found.wikipedia}`,
            ),
            itemId: before.id,
            reason: `Wikipedia wijkt af van de invoer van de redactie (${partNames[part].dutch})`,
            userId: null,
          },
          now,
        )
        warnings.push(
          `held, ${before.round} (${before.competition}): Wikipedia differs from the entry of the editors in the ${partNames[part].english}: ours ${found.entry}, Wikipedia ${found.wikipedia}`,
        )
      }
    } else if (previous !== null) {
      // Wikipedia took its different value back, so the next difference is news again.
      reported[part] = null
    }
  }

  // The reported values are written before the markers go, because clearing the last marker
  // removes the row.
  if (Object.keys(reported).length > 0) {
    await db
      .update(matchEdits)
      .set({
        ...('goals' in reported ? { reportedGoals: reported.goals } : {}),
        ...('kickoff' in reported ? { reportedKickoff: reported.kickoff } : {}),
        ...('result' in reported ? { reportedResult: reported.result } : {}),
      })
      .where(eq(matchEdits.matchId, edit.matchId))
  }
  if (caughtUp.length > 0) {
    await clearParts(db, edit, caughtUp)
  }

  return { keep: markedParts(edit).filter((part) => !caughtUp.includes(part)), warnings }
}

/**
 * Whether the goals of the entry are the goals Wikipedia names, or Wikipedia names none yet.
 * The order of two goals in the same minute does not matter. A goal of one of our players is
 * the same when it has the same player, every other goal when it has the same name in any case.
 */
export function judgeGoals(entry: GoalFields[], wikipedia: GoalFields[]): Verdict {
  const keyOf = (goal: GoalFields) =>
    [
      goal.ours ? 1 : 0,
      goal.minute,
      goal.stoppageMinutes ?? '',
      goal.ownGoal ? 1 : 0,
      goal.penalty ? 1 : 0,
      goal.playerId === null ? `n:${goal.player.toLocaleLowerCase('nl')}` : `p:${goal.playerId}`,
    ].join('|')
  const sorted = (goals: GoalFields[]) => goals.map(keyOf).toSorted()

  if (JSON.stringify(sorted(entry)) === JSON.stringify(sorted(wikipedia))) {
    return 'same'
  }

  return wikipedia.length === 0 ? 'nothing' : 'different'
}

/** Whether the kick-off of the entry is what Wikipedia says, or Wikipedia has no time yet. */
export function judgeKickoff(entry: KickoffFields, wikipedia: KickoffFields): Verdict {
  if (
    entry.kickoffAt?.getTime() === wikipedia.kickoffAt?.getTime() &&
    entry.dateText === wikipedia.dateText &&
    entry.matchDate === wikipedia.matchDate
  ) {
    return 'same'
  }

  return wikipedia.kickoffAt === null && entry.kickoffAt !== null ? 'nothing' : 'different'
}

/** Whether the result of the entry is what Wikipedia says, or Wikipedia has no result yet. */
export function judgeResult(entry: ResultFields, wikipedia: ResultFields): Verdict {
  if (
    entry.status === wikipedia.status &&
    entry.goalsFor === wikipedia.goalsFor &&
    entry.goalsAgainst === wikipedia.goalsAgainst &&
    entry.extraTime === wikipedia.extraTime &&
    entry.penaltiesFor === wikipedia.penaltiesFor &&
    entry.penaltiesAgainst === wikipedia.penaltiesAgainst &&
    entry.afterNinetyFor === wikipedia.afterNinetyFor &&
    entry.afterNinetyAgainst === wikipedia.afterNinetyAgainst
  ) {
    return 'same'
  }

  return wikipedia.status === 'scheduled' ? 'nothing' : 'different'
}

/** Keeps a part of the match as the entry has it, on top of what Wikipedia says. */
export function mergeEntry(before: Match, wikipedia: ReadMatch, keep: MatchPart[]): ReadMatch {
  const merged: ReadMatch = {
    ...wikipedia,
    ...(keep.includes('kickoff')
      ? { dateText: before.dateText, kickoffAt: before.kickoffAt, matchDate: before.matchDate }
      : {}),
    ...(keep.includes('result')
      ? {
          afterNinetyAgainst: before.afterNinetyAgainst,
          afterNinetyFor: before.afterNinetyFor,
          extraTime: before.extraTime,
          goalsAgainst: before.goalsAgainst,
          goalsFor: before.goalsFor,
          penaltiesAgainst: before.penaltiesAgainst,
          penaltiesFor: before.penaltiesFor,
          status: before.status,
        }
      : {}),
  }

  // Only a played match has a number of spectators, whatever the entry says about the status.
  return merged.status === 'played' ? merged : { ...merged, attendance: null }
}

/** The rows of `match_edits` of the matches of this season, by the number of the match. */
export async function readEdits(db: Pick<Database, 'select'>, season: string): Promise<Map<number, MatchEdit>> {
  const ids = (await db.select({ id: matches.id }).from(matches).where(eq(matches.season, season))).map((row) => row.id)

  if (ids.length === 0) {
    return new Map()
  }

  return new Map(
    (await db.select().from(matchEdits).where(inArray(matchEdits.matchId, ids))).map((edit) => [edit.matchId, edit]),
  )
}

function capital(text: string): string {
  return `${text.slice(0, 1).toLocaleUpperCase('nl')}${text.slice(1)}`
}

/** A text for the log: no control characters, one line. */
function clean(text: string): string {
  return text.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim()
}
