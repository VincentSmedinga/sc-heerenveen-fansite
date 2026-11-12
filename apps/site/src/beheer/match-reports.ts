import type { Database } from '@fansite/db/client'
import type { StoredMatchReport } from '@fansite/db/match-reports'
import type { Match, MatchGoal } from '@fansite/db/schema'

import { recordAction } from '@fansite/db/audit-log'
import {
  clearParts,
  describeEntryResult,
  encodeGoals,
  encodeMatch,
  type GoalSnapshot,
  insertGoals,
  markedParts,
  refreshSnapshot,
} from '@fansite/db/match-edits'
import { mayHaveReport, readMatchReport } from '@fansite/db/match-reports'
import { compareReportGoals } from '@fansite/db/player-stat-differences'
import {
  matchAppearances,
  matchCards,
  matchChanges,
  matchEdits,
  matches,
  matchGoals,
  matchIncidents,
  matchReports,
  matchShootoutKicks,
  matchSubstitutions,
  players,
} from '@fansite/db/schema'
import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm'
import { createHash } from 'node:crypto'

import type { ReportContext, ReportPlan } from './report-form'

import {
  dayInWords,
  emptyRow,
  emptySide,
  formationValueOf,
  otherPlayer,
  playerOf,
  type ReportSquadPlayer,
  type ReportValues,
  type Row,
  type Side,
} from './report-fields'
import { checkReportForm } from './report-form'

// Reading and writing the match report in the admin: the screen of one match, the report as
// the form fills it, saving it and taking it away. A report and its row in the log of the
// admin are one transaction. The goals of the report are the goals of the match
// (`match_goals`), and saving marks them as the editors' in `match_edits`, so the import
// leaves them alone.

/** Why a report marks the goals as the editors', in `match_edits` and in the log. */
export const reportReason = 'Verslag van de wedstrijd'

/** Why the button "Wedstrijd afgelopen" marks the result as the editors', in the log. */
export const finishReason = 'Wedstrijd afgelopen'

/**
 * What the button "Wedstrijd afgelopen" did: the match has its result, or it was not being
 * played any more (`not-live`: the import or an editor was first), or there is no such match.
 */
export type FinishMatchOutcome = 'done' | 'missing' | 'not-live'

/** What taking the report away did: it is gone, there was none, or there is no such match. */
export type RemoveReportOutcome = 'done' | 'missing' | 'none'

/** The match with a report to fill in, with the report and the squad of its season. */
export type ReportScreen = NonNullable<Awaited<ReturnType<typeof findReportScreen>>>

/** What saving a report did. */
export type SaveReportOutcome =
  { status: 'missing' } | { status: 'not-played' } | { status: 'saved' } | { status: 'stale' } | { status: 'unchanged' }

/** A player of the squad of the season, with what the report needs of him. */
type SquadRow = ReportSquadPlayer & { personId: null | number; wikipediaPage: null | string }

/**
 * Where the players of a stored report are in the form: the side and the number of the row
 * (`wij-3`), by the id of the row in `match_appearances`.
 */
export function appearancePlaces(stored: Pick<StoredMatchReport, 'appearances'>): Map<number, string> {
  const counts = { wij: 0, zij: 0 }

  return new Map(
    stored.appearances.map((appearance) => {
      const side = appearance.ours ? 'wij' : 'zij'

      counts[side] += 1

      return [appearance.id, `${side}-${counts[side]}`]
    }),
  )
}

/** The context the checks need for a screen. */
export function contextOf(screen: Pick<ReportScreen, 'match' | 'squad'>): ReportContext {
  return { match: screen.match, squad: screen.squad }
}

/**
 * The reports the editors saved as `klaar` that are no longer right, in all seasons: how many,
 * and the seasons they are in, the newest first. The start page tells the number and links to
 * a season in the list, so a report that lost something is seen without opening the list
 * (issue 1077). A report the import of the old fansite made and nobody saved is not counted:
 * there are hundreds, and each check reads the whole report.
 */
export async function countReportsToCheck(db: Pick<Database, 'select'>): Promise<{ seasons: string[]; total: number }> {
  const saved = await db
    .select({ id: matchReports.matchId, reportStatus: matchReports.status, season: matches.season })
    .from(matchReports)
    .innerJoin(matches, eq(matchReports.matchId, matches.id))
    .where(and(eq(matchReports.status, 'klaar'), isNotNull(matchReports.savedBy)))
  const wrong = await listReportsToCheck(db, saved)
  const seasons = new Set(saved.filter((row) => wrong.has(row.id)).map((row) => row.season))

  return { seasons: [...seasons].sort().reverse(), total: wrong.size }
}

/**
 * The line-up of ours in the previous match, for the button that takes it over: the most recent
 * match before this one, by the date of the kick-off and in any season and competition, that
 * has a report with players of ours. On the same day it only counts when its kick-off is
 * earlier. `undefined` when there is none. `label` says which match it was, as the notice does:
 * `Opponent, 3 november 2025`. The squad is the one of this match's season, so a player not
 * in it comes back as Andere speler with his name.
 */
export async function findPreviousLineUp(
  db: Pick<Database, 'select'>,
  match: Pick<Match, 'id' | 'kickoffAt' | 'matchDate'>,
  squad: readonly ReportSquadPlayer[],
): Promise<undefined | { formatie: ReportValues['formatie']['wij']; label: string; speler: Row[] }> {
  const earlier = or(
    lt(matches.matchDate, match.matchDate),
    match.kickoffAt === null
      ? undefined
      : and(
          eq(matches.matchDate, match.matchDate),
          isNotNull(matches.kickoffAt),
          lt(matches.kickoffAt, match.kickoffAt),
        ),
  )
  const [previous] = await db
    .select({ id: matches.id, matchDate: matches.matchDate, opponent: matches.opponent })
    .from(matches)
    .innerJoin(matchReports, eq(matchReports.matchId, matches.id))
    .where(
      and(
        earlier,
        inArray(
          matches.id,
          db.select({ id: matchAppearances.matchId }).from(matchAppearances).where(eq(matchAppearances.ours, true)),
        ),
      ),
    )
    .orderBy(desc(matches.matchDate), desc(matches.kickoffAt), desc(matches.id))
    .limit(1)

  const stored = previous === undefined ? undefined : await readMatchReport(db, previous.id)

  if (previous === undefined || stored === undefined) {
    return undefined
  }

  // The form's own reading of a stored report: our rows and formation, nothing else.
  const values = valuesOfReport(stored, [], squad)
  const date = dayInWords(previous.matchDate)

  // The numbers are those of the day of this match, from the squad (`readSquad`,
  // `shirtNumberOn`), not the ones the previous match had: a player whose number changed in
  // between gets the number he wears on this day. A player of the squad without a number, and
  // one who is not in the squad, keep what the previous match had.
  const speler = values.wij.speler.map((row) => {
    const own = squad.find((player) => String(player.id) === row.keuze)

    return own === undefined || own.shirtNumber === null ? row : { ...row, rugnummer: String(own.shirtNumber) }
  })

  return { formatie: values.formatie.wij, label: `${previous.opponent}, ${date}`, speler }
}

/**
 * The match with this number for the report screen: a match that was played has one, and so
 * does a match that is still `scheduled` from the day it is played (`mayHaveReport`). Any other
 * gives `undefined`, as a match that does not exist. `report` is empty for a match without a
 * report.
 */
export async function findReportScreen(db: Pick<Database, 'select'>, id: number, now = new Date()) {
  const [match] = await db.select().from(matches).where(eq(matches.id, id))

  if (match === undefined || !mayHaveReport(match, now)) {
    return undefined
  }

  return {
    goals: await db.select().from(matchGoals).where(eq(matchGoals.matchId, id)).orderBy(asc(matchGoals.id)),
    match,
    report: await readMatchReport(db, id),
    squad: await readSquad(db, match.season, match.matchDate),
  }
}

/**
 * Ends a match that is still being played: the match gets the result the editor confirmed, as
 * an entry of the editors (`match_edits`, like a result they enter in the form of the match),
 * and the log gets `match.edit` with the reason. The match becomes `played`, so the page stops
 * saying "Live" and the usual rules of a report apply. The report itself stays as it is: it is
 * still `bezig` and the editor finishes it. A change of Wikipedia that waited for this match is
 * stale, since the entry is a newer word. If the match is not `scheduled` any more, such as
 * when the import was first, nothing is written.
 */
export async function finishMatch(
  db: Database,
  userId: number,
  id: number,
  result: { goalsAgainst: number; goalsFor: number },
  now = new Date(),
): Promise<FinishMatchOutcome> {
  return db.transaction(async (transaction) => {
    const [match] = await transaction.select().from(matches).where(eq(matches.id, id)).for('update')

    if (match === undefined) {
      return 'missing'
    }

    const [report] = await transaction.select().from(matchReports).where(eq(matchReports.matchId, id)).for('update')

    if (match.status !== 'scheduled' || report === undefined) {
      return 'not-live'
    }

    const goals = await transaction
      .select()
      .from(matchGoals)
      .where(eq(matchGoals.matchId, id))
      .orderBy(asc(matchGoals.id))
    const [edit] = await transaction.select().from(matchEdits).where(eq(matchEdits.matchId, id)).for('update')

    await transaction
      .update(matches)
      .set({ goalsAgainst: result.goalsAgainst, goalsFor: result.goalsFor, resultSetAt: now, status: 'played' })
      .where(eq(matches.id, id))

    if (edit === undefined) {
      await transaction.insert(matchEdits).values({
        beforeGoals: encodeGoals(goals),
        beforeMatch: encodeMatch(match),
        editedAt: now,
        editedBy: userId,
        matchId: id,
        reason: finishReason,
        resultEdited: true,
      })
    } else {
      await transaction
        .update(matchEdits)
        .set({
          editedAt: now,
          editedBy: userId,
          reason: finishReason,
          reportedResult: null,
          resultEdited: true,
          // A part that comes back after Wikipedia took it over is kept as Wikipedia has it.
          ...(markedParts(edit).includes('result') ? {} : refreshSnapshot(edit, match, goals, ['result'])),
        })
        .where(eq(matchEdits.matchId, id))
    }

    await rejectPending(transaction, id, now, ['result'])
    await recordAction(
      transaction,
      {
        action: 'match.edit',
        detail: `Uitslag: ${describeEntryResult({ ...match, ...result, status: 'played' })}`,
        itemId: id,
        reason: finishReason,
        userId,
      },
      now,
    )

    return 'done'
  })
}

/**
 * The pasted values with the kicks of the shoot-out that the report holds: the paste does not
 * read a series (#852), so what is stored stays. A kick points to its player by team and shirt
 * number (or by name for a player without one), since the pasted line-up has other rows; a
 * player who is not in it any more leaves the kick without a player, which the rules say.
 */
export function keepShootout(
  pasted: ReportValues,
  stored: StoredMatchReport | undefined,
  squad: readonly ReportSquadPlayer[],
): ReportValues {
  if (stored === undefined || stored.shootout.length === 0) {
    return pasted
  }

  const held = valuesOfReport(stored, [], squad)
  const identityOf = (row: Row | undefined, side: Side) => {
    const player = row === undefined ? undefined : playerOf(row, side, squad)

    return player === undefined
      ? undefined
      : player.shirtNumber === null
        ? `naam:${player.name}`
        : `nummer:${player.shirtNumber}`
  }
  const shirtOf = (values: ReportValues, side: Side, place: string | undefined) =>
    identityOf(place === undefined || place === '' ? undefined : values[side].speler[Number(place) - 1], side)
  const kept = (side: Side): Row[] =>
    held[side].serie.map((kick) => {
      const shirt = shirtOf(held, side, kick.speler)
      const index = shirt === undefined ? -1 : pasted[side].speler.findIndex((row) => identityOf(row, side) === shirt)

      return { ...kick, speler: index === -1 ? '' : String(index + 1) }
    })

  return { ...pasted, wij: { ...pasted.wij, serie: kept('wij') }, zij: { ...pasted.zij, serie: kept('zij') } }
}

/**
 * The matches of a season with a report that is `klaar` but no longer right, such as after
 * Wikipedia changed the result: the list shows them as "Controleer".
 */
export async function listReportsToCheck(
  db: Pick<Database, 'select'>,
  rows: readonly { id: number; reportStatus: null | string }[],
): Promise<Set<number>> {
  const finished = rows.filter((row) => row.reportStatus === 'klaar')

  if (finished.length === 0) {
    return new Set()
  }

  const found = await Promise.all(
    finished.map(async (row) => {
      const screen = await findReportScreen(db, row.id)

      // A report of a match that is no longer played can not be right.
      if (screen === undefined) {
        return row.id
      }

      return reportErrors(screen.match, screen.report, screen.goals, screen.squad) ? row.id : undefined
    }),
  )

  return new Set(found.filter((id) => id !== undefined))
}

/**
 * Marks the goals of a match as the editors' (`match_edits`), so the import leaves them alone.
 * The first time it keeps what the goals were before, so taking the report away can put them
 * back. Call it inside the transaction that holds the lock on the match.
 */
export async function markGoalsEdited(
  db: Pick<Database, 'insert' | 'select' | 'update'>,
  match: Match,
  oldGoals: MatchGoal[],
  userId: number,
  now: Date,
) {
  const [edit] = await db.select().from(matchEdits).where(eq(matchEdits.matchId, match.id)).for('update')

  if (edit === undefined) {
    await db.insert(matchEdits).values({
      beforeGoals: encodeGoals(oldGoals),
      beforeMatch: encodeMatch(match),
      editedAt: now,
      editedBy: userId,
      goalsEdited: true,
      matchId: match.id,
      reason: reportReason,
    })
  } else {
    await db
      .update(matchEdits)
      .set({
        editedAt: now,
        editedBy: userId,
        goalsEdited: true,
        reason: reportReason,
        reportedGoals: null,
        // A part that comes back after Wikipedia took it over is kept as Wikipedia has it.
        ...(edit.goalsEdited ? {} : refreshSnapshot(edit, match, oldGoals, ['goals'])),
      })
      .where(eq(matchEdits.matchId, match.id))
  }
}

/**
 * The squad of a season, as the report needs it: the numbers and the pages of the players.
 * With the day of the match, a player whose number changed in the season
 * (`previous_shirt_number` and `shirt_number_from`, issue 1076) has the number he wore that
 * day: the previous one before the day from which the new one counts, the current one on and
 * after it. The list is in the order of those numbers, players without one last.
 */
export async function readSquad(db: Pick<Database, 'select'>, season: string, matchDate?: string): Promise<SquadRow[]> {
  const rows = await db
    .select({
      id: players.id,
      inSquad: players.inSquad,
      name: players.name,
      personId: players.personId,
      previousShirtNumber: players.previousShirtNumber,
      searchTerm: players.searchTerm,
      shirtNumber: players.shirtNumber,
      shirtNumberFrom: players.shirtNumberFrom,
      wikipediaPage: players.wikipediaPage,
    })
    .from(players)
    .where(eq(players.season, season))

  return rows
    .map(({ previousShirtNumber, shirtNumberFrom, ...row }) => ({
      ...row,
      shirtNumber: shirtNumberOn(matchDate, { previousShirtNumber, shirtNumber: row.shirtNumber, shirtNumberFrom }),
    }))
    .sort(
      (a, b) =>
        (a.shirtNumber ?? Number.POSITIVE_INFINITY) - (b.shirtNumber ?? Number.POSITIVE_INFINITY) ||
        a.name.localeCompare(b.name, 'nl'),
    )
}

/**
 * Lets a change of Wikipedia go that waited for these parts of the match or for the match as a
 * whole: the report is a newer word than that change.
 */
export async function rejectPending(
  db: Pick<Database, 'update'>,
  matchId: number,
  now: Date,
  parts: ('goals' | 'kickoff' | 'result')[],
) {
  await db
    .update(matchChanges)
    .set({ decidedAt: now, resolution: 'replaced', status: 'rejected' })
    .where(
      and(
        eq(matchChanges.matchId, matchId),
        eq(matchChanges.status, 'pending'),
        or(isNull(matchChanges.part), inArray(matchChanges.part, parts)),
      ),
    )
}

/**
 * Takes the report away: the rows of the report go, and the goals go back to what they were
 * before the first entry of the goals, so the import follows Wikipedia for them again. It
 * writes `match.undo` with the reason in the log. A player who was added for the report stays
 * in the squad of the season.
 */
export async function removeReport(
  db: Database,
  userId: number,
  id: number,
  reason: string | undefined,
  now = new Date(),
): Promise<RemoveReportOutcome> {
  return db.transaction(async (transaction) => {
    const [match] = await transaction.select({ id: matches.id }).from(matches).where(eq(matches.id, id)).for('update')

    if (match === undefined) {
      return 'missing'
    }

    const [report] = await transaction.select().from(matchReports).where(eq(matchReports.matchId, id)).for('update')

    if (report === undefined) {
      return 'none'
    }

    // The players, their events and the links of the goals go with the report.
    await transaction.delete(matchReports).where(eq(matchReports.matchId, id))

    const [edit] = await transaction.select().from(matchEdits).where(eq(matchEdits.matchId, id)).for('update')
    let restored = false

    if (edit?.goalsEdited === true) {
      await transaction.delete(matchGoals).where(eq(matchGoals.matchId, id))
      await insertGoals(transaction, id, JSON.parse(edit.beforeGoals) as GoalSnapshot[])
      await clearParts(transaction, edit, ['goals'])
      restored = true
    }

    await rejectPending(transaction, id, now, ['goals'])
    await recordAction(
      transaction,
      {
        action: 'match.undo',
        detail: `Verslag weggehaald${restored ? '; doelpunten teruggezet' : ''}`,
        itemId: id,
        reason,
        userId,
      },
      now,
    )

    return 'done'
  })
}

/**
 * A short text that says what a stored report holds, which the form carries to the save. A
 * save whose text differs from the stored report's text was opened before someone else saved,
 * and is refused (see `saveReport`). A match without a report has `leeg`.
 */
export function reportBasis(stored: StoredMatchReport | undefined): string {
  return stored === undefined ? 'leeg' : createHash('sha256').update(storedSignature(stored)).digest('hex').slice(0, 24)
}

/**
 * Saves a report that passed the checks (`checkReportForm`): the report, its players, events
 * and goals in one transaction, the goals marked as the editors', and a line in the log. A
 * player of ours who is not in the squad of the season gets a row in `players` with the source
 * `verslag`, or the row with the same name that is there. A save that changes nothing stores
 * and logs nothing. A change of Wikipedia that waited for the goals is stale: the report
 * replaces it. With `basis`, the text of `reportBasis` of the report the form was opened on, a
 * report that changed since is not overwritten: the outcome is `stale`.
 */
export async function saveReport(
  db: Database,
  userId: number,
  id: number,
  plan: ReportPlan,
  now = new Date(),
  basis?: string,
): Promise<SaveReportOutcome> {
  return db.transaction(async (transaction) => {
    const [match] = await transaction.select().from(matches).where(eq(matches.id, id)).for('update')

    if (match === undefined) {
      return { status: 'missing' } as const
    }
    if (!mayHaveReport(match, now)) {
      return { status: 'not-played' } as const
    }

    const squad = await readSquad(transaction, match.season, match.matchDate)
    const known = plan.appearances.map((player) =>
      player.ours
        ? squad.find((row) =>
            player.squadId === null
              ? row.name.toLocaleLowerCase('nl') === player.name.toLocaleLowerCase('nl')
              : row.id === player.squadId,
          )
        : undefined,
    )
    const stored = await readMatchReport(transaction, id)

    // The form was opened on an older report: someone else saved since. Saving it would
    // replace what they wrote, without anyone noticing.
    if (basis !== undefined && basis !== reportBasis(stored)) {
      return { status: 'stale' } as const
    }
    if (stored !== undefined && planSignature(plan, known) === storedSignature(stored)) {
      return { status: 'unchanged' } as const
    }

    const oldGoals = await transaction
      .select()
      .from(matchGoals)
      .where(eq(matchGoals.matchId, id))
      .orderBy(asc(matchGoals.id))
    const row = {
      formationOpponent: plan.formations.opponent,
      formationOurs: plan.formations.ours,
      opponentComplete: plan.opponentComplete,
      savedAt: now,
      savedBy: userId,
      source: plan.source,
      status: plan.status,
    }

    if (stored === undefined) {
      await transaction.insert(matchReports).values({ ...row, matchId: id })
    } else {
      await transaction.update(matchReports).set(row).where(eq(matchReports.matchId, id))
      // The players of the old report go, with their events. The kicks go too, since a kick
      // without a player would stay behind; the form holds the kicks that stay.
      await transaction.delete(matchShootoutKicks).where(eq(matchShootoutKicks.matchId, id))
      await transaction.delete(matchAppearances).where(eq(matchAppearances.matchId, id))
    }

    const playerIds: (null | number)[] = []
    const appearanceIds: number[] = []

    for (const [index, player] of plan.appearances.entries()) {
      let playerId = known[index]?.id ?? null

      if (player.ours && playerId === null) {
        const [added] = await transaction
          .insert(players)
          .values({
            name: player.name,
            searchTerm: searchTermOf(player.name),
            season: match.season,
            shirtNumber: player.shirtNumber,
            source: 'verslag',
          })
          .$returningId()

        playerId = added?.id ?? null
      }

      const [appearance] = await transaction
        .insert(matchAppearances)
        .values({
          captain: player.captain,
          matchId: id,
          name: player.name,
          ours: player.ours,
          playerId,
          shirtNumber: player.shirtNumber,
          starter: player.starter,
        })
        .$returningId()

      playerIds.push(playerId)
      appearanceIds.push(appearance?.id ?? 0)
    }

    const appearance = (index: number) => appearanceIds[index] ?? 0

    if (plan.substitutions.length > 0) {
      await transaction.insert(matchSubstitutions).values(
        plan.substitutions.map((substitution) => ({
          appearanceInId: appearance(substitution.in),
          appearanceOutId: appearance(substitution.out),
          matchId: id,
          minute: substitution.minute,
          ours: substitution.ours,
          stoppageMinutes: substitution.stoppageMinutes,
        })),
      )
    }
    if (plan.cards.length > 0) {
      await transaction.insert(matchCards).values(
        plan.cards.map((card) => ({
          appearanceId: appearance(card.appearance),
          kind: card.kind,
          matchId: id,
          minute: card.minute,
          ours: card.ours,
          stoppageMinutes: card.stoppageMinutes,
        })),
      )
    }
    if (plan.incidents.length > 0) {
      await transaction.insert(matchIncidents).values(
        plan.incidents.map((incident) => ({
          appearanceId: appearance(incident.appearance),
          kind: incident.kind,
          matchId: id,
          minute: incident.minute,
          ours: incident.ours,
          stoppageMinutes: incident.stoppageMinutes,
        })),
      )
    }

    if (plan.shootout.length > 0) {
      await transaction.insert(matchShootoutKicks).values(
        plan.shootout.map((kick) => ({
          appearanceId: kick.appearance === null ? null : appearance(kick.appearance),
          matchId: id,
          ours: kick.ours,
          outcome: kick.outcome,
          round: kick.round,
        })),
      )
    }

    // The goals of the match are the goals of the report. A goal that was there keeps the page
    // of its scorer, which the report can not give.
    await transaction.delete(matchGoals).where(eq(matchGoals.matchId, id))

    if (plan.goals.length > 0) {
      await transaction.insert(matchGoals).values(
        plan.goals.map((goal) => {
          const scorer = goal.appearance === null ? undefined : plan.appearances[goal.appearance]
          const squadRow = goal.appearance === null ? undefined : known[goal.appearance]
          const before = oldGoals.find(
            (old) =>
              old.ours === goal.ours &&
              old.minute === goal.minute &&
              old.stoppageMinutes === goal.stoppageMinutes &&
              old.ownGoal === goal.ownGoal &&
              old.penalty === goal.penalty &&
              old.player.toLocaleLowerCase('nl') === goal.name.toLocaleLowerCase('nl'),
          )

          return {
            appearanceId: goal.appearance === null ? null : appearance(goal.appearance),
            assistAppearanceId: goal.assist === null ? null : appearance(goal.assist),
            matchId: id,
            minute: goal.minute,
            ours: goal.ours,
            ownGoal: goal.ownGoal,
            penalty: goal.penalty,
            personId: squadRow?.personId ?? before?.personId ?? null,
            player: goal.name,
            // Only a player of ours has a row in `players`.
            playerId: scorer?.ours === true && goal.appearance !== null ? (playerIds[goal.appearance] ?? null) : null,
            stoppageMinutes: goal.stoppageMinutes,
            wikipediaPage: squadRow?.wikipediaPage ?? before?.wikipediaPage ?? null,
          }
        }),
      )
    }

    await markGoalsEdited(transaction, match, oldGoals, userId, now)
    await rejectPending(transaction, id, now, ['goals'])
    await recordAction(
      transaction,
      { action: 'match.edit', detail: describeReport(plan), itemId: id, reason: reportReason, userId },
      now,
    )

    // A report that is klaar can show that the goals differ from the squad table of Wikipedia:
    // each difference is kept for the editors, once, until they decide or it is gone (#974).
    if (plan.status === 'klaar') {
      await compareReportGoals(transaction, match.season, now)
    }

    return { status: 'saved' } as const
  })
}

/** The result of the shoot-out of a match, or `null` when it has none. */
export function seriesOf(match: Pick<Match, 'penaltiesAgainst' | 'penaltiesFor'>) {
  return match.penaltiesFor === null || match.penaltiesAgainst === null
    ? null
    : { against: match.penaltiesAgainst, for: match.penaltiesFor }
}

/**
 * The number a player wore on a day: his previous number before the day from which the current
 * one counts, and the current one on that day and after it, and always when the day is not
 * known or the player has no previous number.
 */
export function shirtNumberOn(
  day: string | undefined,
  player: { previousShirtNumber: null | number; shirtNumber: null | number; shirtNumberFrom: null | string },
): null | number {
  return day !== undefined &&
    player.previousShirtNumber !== null &&
    player.shirtNumberFrom !== null &&
    day < player.shirtNumberFrom
    ? player.previousShirtNumber
    : player.shirtNumber
}

/**
 * The values of the form for the report as it is stored, for the first view of the page. A
 * match without a report gets a line-up of eleven empty rows for us and the goals of the match
 * with the name of their scorers, so the editor only has to choose who played.
 */
export function valuesOfReport(
  stored: StoredMatchReport | undefined,
  goals: readonly MatchGoal[],
  squad: readonly ReportSquadPlayer[],
): ReportValues {
  const values: ReportValues = {
    bron: stored?.report.source ?? '',
    formatie: {
      wij: formationValueOf(stored?.report.formationOurs ?? null),
      zij: formationValueOf(stored?.report.formationOpponent ?? null),
    },
    status: stored?.report.status ?? 'bezig',
    tegenstander: stored?.report.opponentComplete === true ? 'ja' : 'nee',
    wij: emptySide(),
    zij: emptySide(),
  }
  const sideOf = (ours: boolean): Side => (ours ? 'wij' : 'zij')
  const number = (value: null | number) => (value === null ? '' : String(value))
  // Where a stored player is in the form: the side and the number of the row.
  const place = new Map<number, string>()

  if (stored === undefined) {
    values.wij.speler = Array.from({ length: 11 }, () => emptyRow('speler'))
  } else {
    for (const appearance of stored.appearances) {
      const side = sideOf(appearance.ours)
      const inSquad = side === 'wij' && squad.some((player) => player.id === appearance.playerId)

      values[side].speler.push({
        keuze: side === 'wij' ? (inSquad ? String(appearance.playerId) : otherPlayer) : '',
        naam: inSquad ? '' : appearance.name,
        rol: appearance.captain ? 'aanvoerder' : appearance.starter ? 'basis' : 'bank',
        rugnummer: appearance.shirtNumber === null ? '' : String(appearance.shirtNumber),
      })
      place.set(appearance.id, `${side}-${values[side].speler.length}`)
    }
  }

  const ref = (id: null | number) => (id === null ? '' : (place.get(id)?.split('-')[1] ?? ''))
  const refWithSide = (id: null | number) => (id === null ? '' : (place.get(id) ?? ''))
  const moment = (event: { minute: null | number; stoppageMinutes: null | number }): Row => ({
    extra: number(event.stoppageMinutes),
    minuut: event.minute === null ? '' : String(event.minute),
  })

  for (const substitution of stored?.substitutions ?? []) {
    values[sideOf(substitution.ours)].wissel.push({
      ...moment(substitution),
      erin: ref(substitution.appearanceInId),
      eruit: ref(substitution.appearanceOutId),
    })
  }
  for (const card of stored?.cards ?? []) {
    values[sideOf(card.ours)].kaart.push({ ...moment(card), soort: card.kind, speler: ref(card.appearanceId) })
  }
  for (const incident of stored?.incidents ?? []) {
    values[sideOf(incident.ours)].strafschop.push({
      ...moment(incident),
      soort: incident.kind,
      speler: ref(incident.appearanceId),
    })
  }
  // The rounds of each team, in the order they were kicked.
  for (const kick of stored?.shootout ?? []) {
    values[sideOf(kick.ours)].serie.push({ speler: ref(kick.appearanceId), uitkomst: kick.outcome })
  }
  for (const goal of goals) {
    values[sideOf(goal.ours)].doelpunt.push({
      ...moment(goal),
      assist: refWithSide(goal.assistAppearanceId),
      naam: goal.appearanceId === null ? goal.player : '',
      soort: goal.ownGoal ? 'eigen' : goal.penalty ? 'strafschop' : 'gewoon',
      speler: refWithSide(goal.appearanceId),
    })
  }

  return values
}

/** The order of the kicks in a signature: the rounds, and in a round our kick first. */
function byKick(a: readonly [boolean, number, ...unknown[]], b: readonly [boolean, number, ...unknown[]]) {
  return a[1] - b[1] || Number(b[0]) - Number(a[0])
}

/** Describes what the report holds for the log: the numbers of each list. */
function describeReport(plan: ReportPlan) {
  const count = (number: number, one: string, many: string) => `${number} ${number === 1 ? one : many}`

  return [
    `Verslag (${plan.status})`,
    count(plan.appearances.length, 'speler', 'spelers'),
    count(plan.substitutions.length, 'wissel', 'wissels'),
    count(plan.goals.length, 'doelpunt', 'doelpunten'),
    count(plan.cards.length, 'kaart', 'kaarten'),
    count(plan.incidents.length, 'strafschop', 'strafschoppen'),
    ...(plan.shootout.length === 0 ? [] : [count(plan.shootout.length, 'schot in de serie', 'schoten in de serie')]),
  ].join(', ')
}

/** The plan as a text that two plans share when they store the same rows. */
function planSignature(plan: ReportPlan, known: readonly (undefined | { id: number })[]) {
  return JSON.stringify({
    appearances: plan.appearances.map((player, index) => [
      player.ours,
      player.ours ? (known[index]?.id ?? `nieuw:${player.name}`) : null,
      player.name,
      player.shirtNumber,
      player.starter,
      player.captain,
    ]),
    cards: plan.cards.map((card) => [card.ours, card.appearance, card.kind, card.minute, card.stoppageMinutes]),
    formations: [plan.formations.ours, plan.formations.opponent],
    goals: plan.goals.map((goal) => [
      goal.ours,
      goal.appearance,
      goal.assist,
      goal.minute,
      goal.stoppageMinutes,
      goal.name,
      goal.ownGoal,
      goal.penalty,
    ]),
    incidents: plan.incidents.map((incident) => [
      incident.ours,
      incident.appearance,
      incident.kind,
      incident.minute,
      incident.stoppageMinutes,
    ]),
    opponentComplete: plan.opponentComplete,
    shootout: plan.shootout
      .map((kick) => [kick.ours, kick.round, kick.appearance, kick.outcome] as const)
      .toSorted(byKick),
    source: plan.source,
    status: plan.status,
    substitutions: plan.substitutions.map((substitution) => [
      substitution.ours,
      substitution.out,
      substitution.in,
      substitution.minute,
      substitution.stoppageMinutes,
    ]),
  })
}

/** Whether a stored report has an error: it was `klaar`, and the rules no longer agree. */
function reportErrors(
  match: Match,
  report: StoredMatchReport | undefined,
  goals: readonly MatchGoal[],
  squad: readonly ReportSquadPlayer[],
) {
  const values = valuesOfReport(report, goals, squad)

  return Object.keys(checkReportForm(values, { match, squad }).errors).length > 0
}

/**
 * The search term of a name, the name without the first given name, as the importer works it
 * out for a player of the squad table (`Joost van Aken` gives `van Aken`).
 */
function searchTermOf(name: string) {
  const words = name.split(/\s+/u).filter((word) => word !== '')

  return words.length < 2 ? words.join(' ') : words.slice(1).join(' ')
}

/** The stored report as the same text, so a save that changes nothing can be seen. */
function storedSignature(stored: StoredMatchReport) {
  const place = new Map(stored.appearances.map((appearance, index) => [appearance.id, index]))
  const at = (id: null | number) => (id === null ? null : (place.get(id) ?? null))

  return JSON.stringify({
    appearances: stored.appearances.map((appearance) => [
      appearance.ours,
      appearance.ours ? appearance.playerId : null,
      appearance.name,
      appearance.shirtNumber,
      appearance.starter,
      appearance.captain,
    ]),
    cards: stored.cards.map((card) => [card.ours, at(card.appearanceId), card.kind, card.minute, card.stoppageMinutes]),
    formations: [stored.report.formationOurs, stored.report.formationOpponent],
    goals: stored.goals.map((goal) => [
      goal.ours,
      at(goal.appearanceId),
      at(goal.assistAppearanceId),
      goal.minute,
      goal.stoppageMinutes,
      goal.player,
      goal.ownGoal,
      goal.penalty,
    ]),
    incidents: stored.incidents.map((incident) => [
      incident.ours,
      at(incident.appearanceId),
      incident.kind,
      incident.minute,
      incident.stoppageMinutes,
    ]),
    opponentComplete: stored.report.opponentComplete,
    shootout: stored.shootout
      .map((kick) => [kick.ours, kick.round, at(kick.appearanceId), kick.outcome] as const)
      .toSorted(byKick),
    source: stored.report.source,
    status: stored.report.status,
    substitutions: stored.substitutions.map((substitution) => [
      substitution.ours,
      at(substitution.appearanceOutId),
      at(substitution.appearanceInId),
      substitution.minute,
      substitution.stoppageMinutes,
    ]),
  })
}
