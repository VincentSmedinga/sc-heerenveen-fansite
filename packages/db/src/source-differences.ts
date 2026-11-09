import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm'

// A difference between two sources about a field of a match (issue 974). The match keeps the
// value of the source it comes from, and the difference waits in `match_changes` as a change
// with a part, the same rows as a difference with an entry of the editors
// (`match-conflicts.ts`), so the admin and the command `import:changes` decide it with the same
// code. Only a person decides it: no mail goes out and the importer never takes it over by
// itself.
import type { Database } from './client.ts'
import type { SecondSource } from './match-conflicts.ts'
import type { FactsFields, KickoffFields, ResultFields } from './match-edits.ts'
import type { MatchClaim, MatchDifference } from './match-lookup.ts'
import type { Match, MatchPart } from './schema.ts'

import { decodePartProposal, encodePartProposal, partLabels, sourceDifferenceReasons } from './match-conflicts.ts'
import { describeEntryFacts, describeEntryKickoff, describeEntryResult, partOfField } from './match-edits.ts'
import { matchChanges } from './schema.ts'

/** A part of a match that two sources can differ in. The goals are compared elsewhere. */
export type SourcePart = Exclude<MatchPart, 'goals'>

const sourceParts = ['kickoff', 'result', 'facts'] as const

/** A part of a match as a line, as the differences with an entry describe it. */
export function describePart(part: SourcePart, match: FactsFields & KickoffFields & ResultFields): string {
  return part === 'kickoff'
    ? describeEntryKickoff(match)
    : part === 'result'
      ? describeEntryResult(match)
      : describeEntryFacts(match)
}

/** The columns the line of the kick-off does not always show, in the words of the admin. */
const hiddenLabels: Record<string, string> = { dateText: 'tekst bij de datum', matchDate: 'speeldag' }

/**
 * Keeps the differences between a stored match and what a second source says about it (what
 * `compareClaim` returned) as changes that wait, one for each part of the match that differs,
 * and returns the parts that got a new change. The match itself is not touched.
 *
 * - The same difference (the same two values of the part) is kept once: a change that waits is
 *   seen again, and one a person rejected does not come back while both values stay the same.
 * - A difference whose values changed replaces the change that waits (`replaced`).
 * - A part without a difference closes the change that waits for it (`reverted`): the sources
 *   agree now, or the editors hold the part.
 *
 * Every column `compareClaim` compares is in a part: `home` goes with the result. Where the
 * line of a part reads the same for both sources, such as another day with the same kick-off,
 * the columns that differ are named behind it, so the editors always see what differs.
 */
export async function keepSourceDifferences(
  db: Pick<Database, 'insert' | 'select' | 'update'>,
  stored: Match,
  claim: MatchClaim,
  { differences, fill }: { differences: readonly MatchDifference[]; fill: Partial<Match> },
  source: SecondSource,
  now: Date,
): Promise<SourcePart[]> {
  const reason = sourceDifferenceReasons[source]
  const rows = await db
    .select()
    .from(matchChanges)
    .where(and(eq(matchChanges.matchId, stored.id), eq(matchChanges.reason, reason), isNotNull(matchChanges.part)))
    .orderBy(asc(matchChanges.id))
  // The match as it is after this run: the caller fills its empty fields from the second
  // source, so a later run describes the same match.
  const match: Match = { ...stored, ...fill }
  const kept: SourcePart[] = []
  const close = (ids: number[], resolution: 'replaced' | 'reverted') =>
    ids.length === 0
      ? undefined
      : db
          .update(matchChanges)
          .set({ decidedAt: now, resolution, status: 'rejected' })
          .where(inArray(matchChanges.id, ids))

  for (const part of sourceParts) {
    const fields = differences.filter((difference) => partOfField(difference.field) === part)
    const ofPart = rows.filter((row) => row.part === part)
    const waiting = ofPart.filter((row) => row.status === 'pending')

    if (fields.length === 0) {
      await close(
        waiting.map((row) => row.id),
        'reverted',
      )
      continue
    }

    // The part as the second source has it: the match with the fields that differ.
    const proposed: Match = { ...match }

    for (const { field } of fields) {
      Object.assign(proposed, { [field]: claim[field as keyof MatchClaim] })
    }

    // The line of a part does not show every column: name the ones it leaves out.
    const hidden = (side: 'stored' | 'theirs') =>
      describePart(part, match) === describePart(part, proposed)
        ? ` (${fields.map((field) => `${hiddenLabels[field.field] ?? field.field} ${field[side]}`).join(', ')})`
        : ''
    const oldValue = `${describePart(part, match)}${hidden('stored')}`
    const newValue = `${describePart(part, proposed)}${hidden('theirs')}`
    const isSame = (row: (typeof rows)[number]) => row.oldValue === oldValue && row.newValue === newValue
    const seen = waiting.find(isSame)

    await close(
      waiting.filter((row) => row !== seen).map((row) => row.id),
      'replaced',
    )

    // The result as the second source has it, with who played at home when that differs.
    const encoded = decodePartProposal(encodePartProposal(part, { goals: [], match: proposed }))
    const proposal = JSON.stringify(
      encoded?.part === 'result' && fields.some((field) => field.field === 'home')
        ? { ...encoded, home: proposed.home }
        : encoded,
    )

    if (seen !== undefined) {
      await db
        .update(matchChanges)
        .set({ lastSeenAt: now, proposal, timesSeen: seen.timesSeen + 1 })
        .where(eq(matchChanges.id, seen.id))
      continue
    }
    // Only a person who kept the match counts: a change that lapsed by itself may come back,
    // and so may one that was taken over when the match has its old value again.
    if (ofPart.some((row) => row.resolution === 'person' && row.status === 'rejected' && isSame(row))) {
      continue
    }

    await db.insert(matchChanges).values({
      changed: partLabels[part],
      class: 'suspicious',
      competition: stored.competition,
      firstSeenAt: now,
      lastSeenAt: now,
      matchId: stored.id,
      newValue,
      oldValue,
      part,
      proposal,
      reason,
      round: stored.round,
      season: stored.season,
      status: 'pending',
    })
    kept.push(part)
  }

  return kept
}

/**
 * The parts of these matches that the editors took over from a second source, by match. The
 * import of the source the match comes from leaves such a part alone, as it leaves an entry of
 * the editors alone, or it would undo the decision at its next run. The last decision of a
 * person about a part counts, so a part that was kept later is not in it.
 */
export async function readTakenOverParts(
  db: Pick<Database, 'select'>,
  matchIds: readonly number[],
): Promise<Map<number, Set<SourcePart>>> {
  const found = new Map<number, Set<SourcePart>>()

  if (matchIds.length === 0) {
    return found
  }

  const rows = await db
    .select()
    .from(matchChanges)
    .where(
      and(
        inArray(matchChanges.matchId, [...matchIds]),
        inArray(matchChanges.reason, Object.values(sourceDifferenceReasons)),
        eq(matchChanges.resolution, 'person'),
      ),
    )
    .orderBy(asc(matchChanges.decidedAt), asc(matchChanges.id))

  for (const row of rows) {
    if (row.matchId === null || row.part === null || row.part === 'goals') {
      continue
    }

    const parts = found.get(row.matchId) ?? new Set<SourcePart>()

    if (row.status === 'accepted') {
      parts.add(row.part)
    } else {
      parts.delete(row.part)
    }
    found.set(row.matchId, parts)
  }

  return found
}
