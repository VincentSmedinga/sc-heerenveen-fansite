import type { Match, MatchAppearance, MatchCard, MatchGoal, MatchReport, MatchSubstitution } from '@fansite/db/schema'

import {
  matchAppearances,
  matchCards,
  matchEdits,
  matches,
  matchGoals,
  matchReports,
  matchSubstitutions,
  oldSiteReportSource,
} from '@fansite/db/schema'
import { asc, eq, inArray } from 'drizzle-orm'

import type { OldSiteMatch, OldSitePlayer } from './old-site-file.ts'
import type {
  DerivedOldSiteReport,
  OldSiteGoalWithEvent,
  OldSiteReportVerdict,
  OldSiteStoredGoal,
} from './old-site-report.ts'
import type { OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

import { deriveOldSiteGoals, orderedOldSiteGoalEvents } from './old-site-goals.ts'
import { deriveOldSiteMatches, matchKey, oldSiteSource } from './old-site-matches.ts'
import { oldSitePlayerIds } from './old-site-players.ts'
import { deriveOldSiteReport, judgeOldSiteReport, looseNameKey } from './old-site-report.ts'

/** The key of an appearance within a match, the same as the derived report uses. */
const appearanceKey = (ours: boolean, name: string) => `${ours ? 'ours' : 'theirs'}|${looseNameKey(name)}`

/** What is stored of the report of a match. */
type StoredReport = {
  appearances: MatchAppearance[]
  cards: MatchCard[]
  report: MatchReport
  substitutions: MatchSubstitution[]
}

/**
 * The step `opstellingen`: makes the report of every match with the source `oude-fansite` that
 * has a line-up in the files (566 of 671): a row in `match_reports` with the source 'Oude
 * fansite', the players of both teams in `match_appearances`, the substitutions, the cards, and
 * the links from the goals and the assists to the players, and the formation of our team when
 * the order of the starters and their lines agree (#899). Needs the matches, the players and
 * the goals of the steps before it. The status is `klaar` when the rules of
 * `@fansite/shared/match-report` find no error and nothing in the line-up is left out or
 * doubtful, else `bezig`; a match without a line-up gets no report. A match whose report the
 * editors saved (`match_reports.saved_by`) or whose goals they filled in (`goals_edited`) is
 * left as it is, and so is a match from another source. A second run changes nothing.
 */
export async function importOldSiteLineups(
  db: Pick<OldSiteDatabase, 'delete' | 'insert' | 'select' | 'update'>,
  oldMatches: readonly OldSiteMatch[],
  oldPlayers: readonly OldSitePlayer[],
): Promise<OldSiteStepReport> {
  const report: OldSiteStepReport = { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
  const byCode = new Map(oldPlayers.map((player) => [player.code, player]))
  const derived = deriveOldSiteMatches(oldMatches)
  const seasons = [...new Set(derived.flatMap((one) => (one.values === null ? [] : [one.values.season])))]
  const playerIds = await oldSitePlayerIds(db, seasons)
  const stored = new Map<string, Match>()
  const editors = new Set<number>()
  const reports = new Map<number, MatchReport>()
  const goalsOf = new Map<number, MatchGoal[]>()

  for (const row of await db.select().from(matches).where(eq(matches.dataSource, oldSiteSource))) {
    stored.set(matchKey(row), row)
  }

  const ids = [...stored.values()].map((row) => row.id)

  if (ids.length > 0) {
    for (const row of await db.select().from(matchEdits).where(eq(matchEdits.goalsEdited, true))) {
      editors.add(row.matchId)
    }
    for (const row of await db.select().from(matchReports).where(inArray(matchReports.matchId, ids))) {
      reports.set(row.matchId, row)

      if (row.savedBy !== null) {
        editors.add(row.matchId)
      }
    }
    for (const row of await db.select().from(matchGoals).orderBy(asc(matchGoals.id))) {
      goalsOf.set(row.matchId, [...(goalsOf.get(row.matchId) ?? []), row])
    }
  }

  const counts = { bezig: 0, klaar: 0 }

  for (const one of derived) {
    const { match, values } = one

    if (values === null || match.lineup.length === 0) {
      continue
    }

    const label = `${values.season} ${match.code}`
    const before = stored.get(matchKey(values))

    if (before === undefined) {
      report.skipped += 1
      report.lines.push(`skipped the report of ${label}: it is not in the database as a match of the old fansite`)
      continue
    }
    if (editors.has(before.id)) {
      report.skipped += 1
      report.lines.push(
        `skipped the report of ${label}: the editors saved a report or filled in the goals, so it stays`,
      )
      continue
    }

    const storedGoals = goalsOf.get(before.id) ?? []
    const { aligned, verdict, wanted } = judgeStoredOldSiteMatch(
      match,
      values.season,
      before,
      storedGoals,
      byCode,
      playerIds,
    )

    counts[verdict.status] += 1

    for (const note of wanted.notes) {
      report.lines.push(`${label}: ${note.text}`)
    }
    if (verdict.status === 'bezig') {
      const reasons = [
        ...wanted.anomalies.map((anomaly) => anomaly.text),
        ...[...new Set(verdict.check.errors.map((issue) => issue.code))].map((code) => `rule ${code}`),
      ]

      report.lines.push(`${label}: the report is bezig: ${reasons.join('; ')}`)
    }

    const result = await storeReport(db, before.id, wanted, verdict.status, playerIds, reports.get(before.id), {
      aligned,
      storedGoals,
    })

    report[result] += 1
  }

  report.lines.unshift(`${counts.klaar + counts.bezig} reports: ${counts.klaar} klaar, ${counts.bezig} bezig`)

  return report
}

/**
 * The report of a match of the files and what the rules make of it, given the match and its
 * goals as the database has them and the players of the season. The step `opstellingen` stores
 * the result, and the check report (#880) reads the same result, so they can't drift apart.
 * `aligned` says whether the stored goals are the goals of the files, the only case in which
 * the report links to them.
 */
export function judgeStoredOldSiteMatch(
  match: OldSiteMatch,
  season: string,
  stored: Pick<Match, 'extraTime' | 'goalsAgainst' | 'goalsFor' | 'penaltiesAgainst' | 'penaltiesFor' | 'status'>,
  storedGoals: readonly OldSiteStoredGoal[],
  byCode: ReadonlyMap<string, OldSitePlayer>,
  playerIds: ReadonlyMap<string, number>,
): { aligned: boolean; verdict: OldSiteReportVerdict; wanted: DerivedOldSiteReport } {
  const { goals, state } = deriveOldSiteGoals(
    match,
    { against: stored.goalsAgainst ?? 0, for: stored.goalsFor ?? 0 },
    byCode,
  )
  const events = orderedOldSiteGoalEvents(match)
  // The stored goals are the goals of the step before this one: they link to the report only
  // when they are the goals of the files.
  const aligned = state === 'adds-up' && storedGoals.length === goals.length && events.length === goals.length
  const pairs: OldSiteGoalWithEvent[] = aligned
    ? goals.flatMap((goal, index) => (events[index] === undefined ? [] : [{ event: events[index], goal }]))
    : []
  const wanted = deriveOldSiteReport(match, {
    extraTime: stored.extraTime,
    goals: pairs,
    hasPlayerRow: (key) => playerIds.has(key),
    oldPlayers: byCode,
    season,
  })
  const verdict = judgeOldSiteReport(
    wanted,
    {
      extraTime: stored.extraTime,
      goalsAgainst: stored.goalsAgainst,
      goalsFor: stored.goalsFor,
      penaltiesAgainst: stored.penaltiesAgainst,
      penaltiesFor: stored.penaltiesFor,
      status: stored.status,
    },
    storedGoals,
    aligned ? wanted.goalLinks : [],
  )

  return { aligned, verdict, wanted }
}

/** The players, substitutions and cards stored for a match. */
async function readStored(db: Pick<OldSiteDatabase, 'select'>, matchId: number): Promise<Omit<StoredReport, 'report'>> {
  return {
    appearances: await db.select().from(matchAppearances).where(eq(matchAppearances.matchId, matchId)),
    cards: await db.select().from(matchCards).where(eq(matchCards.matchId, matchId)),
    substitutions: await db.select().from(matchSubstitutions).where(eq(matchSubstitutions.matchId, matchId)),
  }
}

/**
 * Makes the stored report of a match as the derived one, changing only what differs. Returns
 * what happened to the report: `created`, `changed` or `unchanged`.
 */
async function storeReport(
  db: Pick<OldSiteDatabase, 'delete' | 'insert' | 'select' | 'update'>,
  matchId: number,
  wanted: DerivedOldSiteReport,
  status: 'bezig' | 'klaar',
  playerIds: ReadonlyMap<string, number>,
  existing: MatchReport | undefined,
  { aligned, storedGoals }: { aligned: boolean; storedGoals: readonly MatchGoal[] },
): Promise<'changed' | 'created' | 'unchanged'> {
  let touched = false

  if (existing === undefined) {
    await db.insert(matchReports).values({
      formationOurs: wanted.formationOurs,
      matchId,
      opponentComplete: wanted.opponentComplete,
      source: oldSiteReportSource,
      status,
    })
    touched = true
  } else if (
    existing.status !== status ||
    existing.opponentComplete !== wanted.opponentComplete ||
    existing.source !== oldSiteReportSource ||
    existing.formationOurs !== wanted.formationOurs ||
    existing.formationOpponent !== null
  ) {
    await db
      .update(matchReports)
      .set({
        formationOpponent: null,
        formationOurs: wanted.formationOurs,
        opponentComplete: wanted.opponentComplete,
        source: oldSiteReportSource,
        status,
      })
      .where(eq(matchReports.matchId, matchId))
    touched = true
  }

  const current = await readStored(db, matchId)

  // The players: matched by team and name, changed in place.
  const wantedRows = wanted.appearances.map((one) => ({
    key: appearanceKey(one.ours, one.name),
    row: {
      captain: false,
      matchId,
      name: one.name,
      ours: one.ours,
      playerId: one.playerKey === null ? null : (playerIds.get(one.playerKey) ?? null),
      shirtNumber: null,
      starter: one.starter,
    },
  }))
  const ids = new Map<string, number>()
  const have = new Map(current.appearances.map((row) => [appearanceKey(row.ours, row.name), row]))
  const fresh: (typeof matchAppearances.$inferInsert)[] = []

  for (const { key, row } of wantedRows) {
    const was = have.get(key)

    if (was === undefined) {
      fresh.push(row)
      continue
    }

    ids.set(key, was.id)
    have.delete(key)

    if (
      was.name !== row.name ||
      was.playerId !== row.playerId ||
      was.starter !== row.starter ||
      was.captain ||
      was.shirtNumber !== null
    ) {
      await db
        .update(matchAppearances)
        .set({ captain: false, name: row.name, playerId: row.playerId, shirtNumber: null, starter: row.starter })
        .where(eq(matchAppearances.id, was.id))
      touched = true
    }
  }

  const gone = [...have.values()].map((row) => row.id)

  if (gone.length > 0) {
    await db.delete(matchAppearances).where(inArray(matchAppearances.id, gone))
    touched = true
  }
  if (fresh.length > 0) {
    await db.insert(matchAppearances).values(fresh)
    touched = true

    for (const row of await db.select().from(matchAppearances).where(eq(matchAppearances.matchId, matchId))) {
      ids.set(appearanceKey(row.ours, row.name), row.id)
    }
  }

  const idOf = (place: number) => {
    const one = wanted.appearances[place]

    return one === undefined ? undefined : ids.get(appearanceKey(one.ours, one.name))
  }

  // The substitutions and the cards have nothing that points to them, so a difference replaces
  // them as a whole. A deleted player took his own with him, so they are read again.
  const reread = gone.length > 0 || fresh.length > 0 ? await readStored(db, matchId) : current
  const substitutions = wanted.substitutions.flatMap((sub) => {
    const out = idOf(sub.out)
    const into = idOf(sub.in)

    return out === undefined || into === undefined
      ? []
      : [
          {
            appearanceInId: into,
            appearanceOutId: out,
            matchId,
            minute: sub.minute,
            ours: sub.ours,
            stoppageMinutes: null,
          },
        ]
  })
  const cards = wanted.cards.flatMap((card) => {
    const appearanceId = idOf(card.appearance)
    const one = wanted.appearances[card.appearance]

    return appearanceId === undefined || one === undefined
      ? []
      : [{ appearanceId, kind: card.kind, matchId, minute: card.minute, ours: one.ours, stoppageMinutes: null }]
  })
  const subSignature = (row: { appearanceInId: number; appearanceOutId: number; minute: number }) =>
    `${row.appearanceOutId}>${row.appearanceInId}@${row.minute}`
  const cardSignature = (row: { appearanceId: number; kind: string; minute: null | number }) =>
    `${row.appearanceId}:${row.kind}@${row.minute ?? ''}`

  if (reread.substitutions.map(subSignature).toSorted().join() !== substitutions.map(subSignature).toSorted().join()) {
    await db.delete(matchSubstitutions).where(eq(matchSubstitutions.matchId, matchId))

    if (substitutions.length > 0) {
      await db.insert(matchSubstitutions).values(substitutions)
    }
    touched = true
  }
  if (reread.cards.map(cardSignature).toSorted().join() !== cards.map(cardSignature).toSorted().join()) {
    await db.delete(matchCards).where(eq(matchCards.matchId, matchId))

    if (cards.length > 0) {
      await db.insert(matchCards).values(cards)
    }
    touched = true
  }

  // The goals and the assists point to the players.
  for (const [index, goal] of storedGoals.entries()) {
    const link = aligned ? wanted.goalLinks[index] : undefined
    const appearanceId =
      link?.appearance === undefined || link.appearance === null ? null : (idOf(link.appearance) ?? null)
    const assistAppearanceId = link?.assist === undefined || link.assist === null ? null : (idOf(link.assist) ?? null)

    if (goal.appearanceId !== appearanceId || goal.assistAppearanceId !== assistAppearanceId) {
      await db.update(matchGoals).set({ appearanceId, assistAppearanceId }).where(eq(matchGoals.id, goal.id))
      touched = true
    }
  }

  if (existing === undefined) {
    return 'created'
  }

  return touched ? 'changed' : 'unchanged'
}
