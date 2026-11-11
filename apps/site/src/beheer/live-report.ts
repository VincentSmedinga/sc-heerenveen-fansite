import type { Database } from '@fansite/db/client'
import type { StoredMatchReport } from '@fansite/db/match-reports'
import type { Match, MatchGoal } from '@fansite/db/schema'

import { recordAction } from '@fansite/db/audit-log'
import { mayHaveReport, readMatchReport } from '@fansite/db/match-reports'
import { matchCards, matches, matchGoals, matchReports, matchSubstitutions } from '@fansite/db/schema'
import { asc, eq } from 'drizzle-orm'

import type { FieldName, ReportErrors, Row, Side } from './report-fields'

import { appearancePlaces, contextOf, markGoalsEdited, readSquad, rejectPending, valuesOfReport } from './match-reports'
import { cardKindChoices, goalKindChoices, rowFieldId } from './report-fields'
import { checkReportForm } from './report-form'
import { retryOnDeadlock } from './retry-deadlock'

// Keeping a report up to date during the match, from a phone (#907). One event is added to the
// report that is stored, or taken away from it, in one transaction that holds the lock on the
// match, like every other save of a report. Two editors who add an event at the same time wait
// for each other, so both events stay. Nothing of the rest of the report is written again.

/** The kinds of event the live screen adds. */
export const liveKinds = ['doelpunt', 'kaart', 'wissel'] as const

/** What adding an event did. `refused` has an error for each field that was wrong. */
export type AddLiveEventOutcome =
  | { errors: ReportErrors; status: 'refused' }
  | { saved: string; status: 'saved' }
  | { status: 'missing' }
  | { status: 'no-report' }
  | { status: 'not-played' }

/**
 * What an editor typed for one event, as text. `kant` is `wij` or `zij`; players are the id of
 * their row in the report (`match_appearances`).
 */
export type LiveEventInput = {
  assist?: string
  erin?: string
  eruit?: string
  extra: string
  kant: string
  minuut: string
  naam?: string
  soort?: string
  speler?: string
}

export type LiveKind = (typeof liveKinds)[number]

/** What taking an event away did. `gone` means the event was not there any more. */
export type RemoveLiveEventOutcome = { removed: string; status: 'removed' } | { status: 'gone' | 'missing' }

/** The fields of an event that an error can belong to, by the names of the live form. */
const fieldsOfKind: Record<LiveKind, readonly string[]> = {
  doelpunt: ['minuut', 'extra', 'speler', 'naam', 'assist', 'soort'],
  kaart: ['minuut', 'extra', 'speler', 'soort'],
  wissel: ['minuut', 'extra', 'eruit', 'erin'],
}

/**
 * Adds one event to the report of a match, as the live screen asks. The event is put in the
 * values of the report that is stored and checked with the rules of the full form
 * (`checkReportForm`): what makes the report impossible to store is refused with an error at
 * the field; what only a rule objects to is stored, and the screen shows it as "Controleer". A
 * report that was `klaar` and no longer is right becomes `bezig`, as when the form saves it.
 */
export async function addLiveEvent(
  db: Database,
  userId: number,
  matchId: number,
  kind: LiveKind,
  input: LiveEventInput,
  now = new Date(),
): Promise<AddLiveEventOutcome> {
  return retryOnDeadlock(() =>
    db.transaction(async (transaction): Promise<AddLiveEventOutcome> => {
      const [match] = await transaction.select().from(matches).where(eq(matches.id, matchId)).for('update')

      if (match === undefined) {
        return { status: 'missing' }
      }
      if (!mayHaveReport(match, now)) {
        return { status: 'not-played' }
      }

      const stored = await readMatchReport(transaction, matchId)

      if (stored === undefined) {
        return { status: 'no-report' }
      }

      const goals = await readGoals(transaction, matchId)
      const squad = await readSquad(transaction, match.season, match.matchDate)
      const values = valuesOfReport(stored, goals, squad)
      const places = appearancePlaces(stored)
      const errors: ReportErrors = {}
      const side = input.kant === 'wij' || input.kant === 'zij' ? input.kant : undefined

      if (side === undefined) {
        errors[liveFieldId(kind, 'kant')] = 'Kies de kant: sc Heerenveen of de tegenstander.'

        return { errors, status: 'refused' }
      }

      const rows = values[side][kind]
      const number = rows.length + 1
      const named = (id: string | undefined) => (id === undefined || id === '' ? undefined : places.get(Number(id)))
      // A player as the form has him: for a card or a substitution the number of his row, and
      // for a goal also the side, since an own goal is scored by a player of the other team.
      const refer = (id: string | undefined, field: string, label: string, sameSide: boolean) => {
        const place = named(id)

        if (id === undefined || id === '') {
          return ''
        }
        if (place === undefined) {
          errors[liveFieldId(kind, field)] = `${label}: kies een speler uit het verslag.`

          return ''
        }

        const [where, row = ''] = place.split('-')

        if (sameSide && where !== side) {
          errors[liveFieldId(kind, field)] =
            `${label}: kies een speler van ${side === 'wij' ? 'sc Heerenveen' : match.opponent}.`

          return ''
        }

        return sameSide ? row : place
      }

      const moment = { extra: input.extra.trim(), minuut: input.minuut.trim() }

      if (moment.minuut === '') {
        errors[liveFieldId(kind, 'minuut')] = 'Vul de minuut in, zoals 23.'
      }

      let row: Row
      const asked = input.soort ?? ''

      if (kind === 'doelpunt') {
        const scorer = refer(input.speler, 'speler', 'De speler die scoorde', false)

        row = {
          ...moment,
          assist: refer(input.assist, 'assist', 'De assist', false),
          naam: scorer === '' ? (input.naam ?? '').trim() : '',
          soort: goalKindChoices.find((choice) => choice.value === asked)?.value ?? 'gewoon',
          speler: scorer,
        }
      } else if (kind === 'kaart') {
        const player = refer(input.speler, 'speler', 'De speler', true)

        if (player === '' && errors[liveFieldId(kind, 'speler')] === undefined) {
          errors[liveFieldId(kind, 'speler')] = 'Kies de speler die de kaart kreeg.'
        }
        // The screen offers yellow and red. A second yellow for a player who has one
        // is a yellow-red card, as the rules of the full form want it.
        const secondYellow =
          asked === 'geel' &&
          player !== '' &&
          rows.filter((card) => card.speler === player && card.soort === 'geel').length === 1

        if (asked !== 'geel' && asked !== 'rood') {
          errors[liveFieldId(kind, 'soort')] = 'Kies geel of rood.'
        }

        row = { ...moment, soort: secondYellow ? 'geel-rood' : asked, speler: player }
      } else {
        const out = refer(input.eruit, 'eruit', 'De speler die eruit gaat', true)
        const into = refer(input.erin, 'erin', 'De speler die erin komt', true)

        if (out === '' && errors[liveFieldId(kind, 'eruit')] === undefined) {
          errors[liveFieldId(kind, 'eruit')] = 'Kies de speler die eruit gaat.'
        }
        if (into === '' && errors[liveFieldId(kind, 'erin')] === undefined) {
          errors[liveFieldId(kind, 'erin')] = 'Kies de speler die erin komt.'
        }

        row = { ...moment, erin: into, eruit: out }
      }

      if (Object.keys(errors).length > 0) {
        return { errors, status: 'refused' }
      }

      const next = structuredClone(values)

      next[side][kind].push(row)

      const checked = checkReportForm(next, contextOf({ match, squad }))

      if (checked.plan === undefined) {
        return { errors: liveErrorsOf(checked.errors, kind, side, number), status: 'refused' }
      }

      const clock = {
        minute: moment.minuut === '' ? null : Number(moment.minuut),
        stoppageMinutes: moment.extra === '' ? null : Number(moment.extra),
      }
      const ours = side === 'wij'
      const idOf = (id: string | undefined) => stored.appearances.find((candidate) => String(candidate.id) === id)
      let described: string
      let who: string

      if (kind === 'doelpunt') {
        const scorer = idOf(input.speler)
        const assist = idOf(input.assist)
        const squadRow =
          scorer?.playerId === null || scorer === undefined
            ? undefined
            : squad.find((player) => player.id === scorer.playerId)

        await transaction.insert(matchGoals).values({
          appearanceId: scorer?.id ?? null,
          assistAppearanceId: assist?.id ?? null,
          matchId,
          minute: clock.minute,
          ours,
          ownGoal: row.soort === 'eigen',
          penalty: row.soort === 'strafschop',
          personId: squadRow?.personId ?? null,
          player: scorer?.name ?? row.naam ?? '',
          // Only a player of ours has a row in `players`.
          playerId: scorer?.ours === true ? scorer.playerId : null,
          stoppageMinutes: clock.stoppageMinutes,
          wikipediaPage: squadRow?.wikipediaPage ?? null,
        })
        who = scorer?.name ?? row.naam ?? ''
        described = describeEvent('doelpunt', clock, who, row.soort === 'eigen' ? 'eigen doelpunt' : undefined)
      } else if (kind === 'kaart') {
        const player = idOf(input.speler)

        await transaction.insert(matchCards).values({
          appearanceId: player?.id ?? 0,
          kind: cardKindChoices.find((choice) => choice.value === row.soort)?.value ?? 'geel',
          matchId,
          minute: clock.minute ?? 0,
          ours,
          stoppageMinutes: clock.stoppageMinutes,
        })
        who = player?.name ?? ''
        described = describeEvent(cardNames[row.soort ?? ''] ?? 'Kaart', clock, who)
      } else {
        const out = idOf(input.eruit)
        const into = idOf(input.erin)

        await transaction.insert(matchSubstitutions).values({
          appearanceInId: into?.id ?? 0,
          appearanceOutId: out?.id ?? 0,
          matchId,
          minute: clock.minute ?? 0,
          ours,
          stoppageMinutes: clock.stoppageMinutes,
        })
        who = `${out?.name ?? ''} eruit, ${into?.name ?? ''} erin`
        described = describeEvent('Wissel', clock, who)
      }

      await settle(transaction, userId, match, stored, goals, kind, checked.errors, described, now)

      return {
        saved: announce(kind === 'kaart' && row.soort === 'geel-rood' ? 'Geel-rode kaart' : kind, clock, who),
        status: 'saved',
      }
    }),
  )
}

/** The `id` of a field of the live form, which an error and its link in the list point to. */
export function liveFieldId(kind: LiveKind, field: string) {
  return `live-${kind}-${field}`
}

/**
 * Takes one event away from the report. The event is named by its kind and the id of its row,
 * and must belong to this match. The log gets a line, and the goals stay the editors' as they
 * were. An event that is gone already, because another editor was first, is not an error.
 */
export async function removeLiveEvent(
  db: Database,
  userId: number,
  matchId: number,
  kind: LiveKind,
  eventId: number,
  now = new Date(),
): Promise<RemoveLiveEventOutcome> {
  return retryOnDeadlock(() =>
    db.transaction(async (transaction): Promise<RemoveLiveEventOutcome> => {
      const [match] = await transaction.select().from(matches).where(eq(matches.id, matchId)).for('update')

      if (match === undefined) {
        return { status: 'missing' }
      }

      const stored = await readMatchReport(transaction, matchId)

      if (stored === undefined) {
        return { status: 'gone' }
      }

      const goals = await readGoals(transaction, matchId)
      const name = (id: null | number) => stored.appearances.find((appearance) => appearance.id === id)?.name ?? ''
      let described: string

      if (kind === 'doelpunt') {
        const goal = goals.find((candidate) => candidate.id === eventId)

        if (goal === undefined) {
          return { status: 'gone' }
        }

        await transaction.delete(matchGoals).where(eq(matchGoals.id, eventId))
        described = describeEvent('doelpunt', clockOf(goal), goal.player, goal.ownGoal ? 'eigen doelpunt' : undefined)
      } else if (kind === 'kaart') {
        const card = stored.cards.find((candidate) => candidate.id === eventId)

        if (card === undefined) {
          return { status: 'gone' }
        }

        await transaction.delete(matchCards).where(eq(matchCards.id, eventId))
        described = describeEvent(cardNames[card.kind] ?? 'Kaart', clockOf(card), name(card.appearanceId))
      } else {
        const substitution = stored.substitutions.find((candidate) => candidate.id === eventId)

        if (substitution === undefined) {
          return { status: 'gone' }
        }

        await transaction.delete(matchSubstitutions).where(eq(matchSubstitutions.id, eventId))
        described = describeEvent(
          'Wissel',
          clockOf(substitution),
          `${name(substitution.appearanceOutId)} eruit, ${name(substitution.appearanceInId)} erin`,
        )
      }

      const squad = await readSquad(transaction, match.season, match.matchDate)
      const after = await readMatchReport(transaction, matchId)
      const goalsAfter = await readGoals(transaction, matchId)
      const errors = checkReportForm(valuesOfReport(after, goalsAfter, squad), contextOf({ match, squad })).errors

      await settle(transaction, userId, match, stored, goals, kind, errors, `${described} weggehaald`, now)

      return { removed: `${described} weggehaald`, status: 'removed' }
    }),
  )
}

/** What the lines of the overview say about the kinds of card. */
const cardNames: Record<string, string> = { geel: 'Gele kaart', 'geel-rood': 'Geel-rode kaart', rood: 'Rode kaart' }

/** One event of the overview, with what "Haal weg" needs to find it again. */
export type LiveEventRow = { id: number; kind: LiveKind; text: string }

/** A player of the report as the live screen offers him in a list. */
export type LivePlayer = {
  /** On the bench and not on the pitch yet: the players a substitution brings on. */
  bench: boolean
  id: number
  label: string
  /** On the pitch: in the line-up or come on, and not gone off. */
  onPitch: boolean
  ours: boolean
}

/** What the live screen shows of a stored report: the players for the lists and the events. */
export type LiveView = {
  events: LiveEventRow[]
  players: LivePlayer[]
  /** The goals of each team, as the report has them. */
  score: { opponent: number; ours: number }
}

/** An event in words, for the log and the overview: `Doelpunt 23' Van Aken`. */
export function describeEvent(
  label: string,
  moment: { minute: null | number; stoppageMinutes: null | number },
  who: string,
  note?: string,
) {
  const first = label.charAt(0).toLocaleUpperCase('nl') + label.slice(1)

  return [first, describeMinute(moment), who, note === undefined ? '' : `(${note})`]
    .filter((part) => part !== '')
    .join(' ')
}

/** The text of the minute: `23'` or `45+2'`, and none for a goal without a minute. */
export function describeMinute(moment: { minute: null | number; stoppageMinutes: null | number }) {
  return moment.minute === null
    ? ''
    : moment.stoppageMinutes === null
      ? `${moment.minute}'`
      : `${moment.minute}+${moment.stoppageMinutes}'`
}

/**
 * The players for the lists and the events for the overview, the last event first. A goal
 * counts for the team that scored it, an own goal for the other one included.
 */
export function liveViewOf(stored: StoredMatchReport, goals: readonly MatchGoal[]): LiveView {
  const cameOn = new Set(stored.substitutions.map((substitution) => substitution.appearanceInId))
  const wentOff = new Set(stored.substitutions.map((substitution) => substitution.appearanceOutId))
  const nameOf = (id: null | number) => stored.appearances.find((appearance) => appearance.id === id)?.name ?? ''
  const rows: { at: number; row: LiveEventRow }[] = []
  const at = (moment: { minute: null | number; stoppageMinutes: null | number }, id: number) =>
    (moment.minute ?? 0) + (moment.stoppageMinutes ?? 0) / 100 + id / 1_000_000

  for (const goal of goals) {
    rows.push({
      at: at(goal, goal.id),
      row: {
        id: goal.id,
        kind: 'doelpunt',
        text: describeEvent('doelpunt', goal, goal.player, goal.ownGoal ? 'eigen doelpunt' : undefined),
      },
    })
  }
  for (const card of stored.cards) {
    rows.push({
      at: at(card, card.id),
      row: {
        id: card.id,
        kind: 'kaart',
        text: describeEvent(cardNames[card.kind] ?? 'Kaart', card, nameOf(card.appearanceId)),
      },
    })
  }
  for (const substitution of stored.substitutions) {
    rows.push({
      at: at(substitution, substitution.id),
      row: {
        id: substitution.id,
        kind: 'wissel',
        text: describeEvent(
          'Wissel',
          substitution,
          `${nameOf(substitution.appearanceOutId)} eruit, ${nameOf(substitution.appearanceInId)} erin`,
        ),
      },
    })
  }

  return {
    events: rows.toSorted((a, b) => b.at - a.at).map((entry) => entry.row),
    players: stored.appearances.map((appearance) => ({
      bench: !appearance.starter && !cameOn.has(appearance.id),
      id: appearance.id,
      label: appearance.shirtNumber === null ? appearance.name : `${appearance.shirtNumber} ${appearance.name}`,
      onPitch: (appearance.starter || cameOn.has(appearance.id)) && !wentOff.has(appearance.id),
      ours: appearance.ours,
    })),
    score: {
      // A goal counts for the team that is credited with it, as the page of the match has it.
      opponent: goals.filter((goal) => !goal.ours).length,
      ours: goals.filter((goal) => goal.ours).length,
    },
  }
}

/** What the screen tells after a save: `Doelpunt opgeslagen: 23e minuut, Van Aken`. */
function announce(
  kind: 'Geel-rode kaart' | LiveKind,
  moment: { minute: null | number; stoppageMinutes: null | number },
  who: string,
) {
  const label = { doelpunt: 'Doelpunt', 'Geel-rode kaart': kind, kaart: 'Kaart', wissel: 'Wissel' }[kind]
  const minute =
    moment.minute === null
      ? ''
      : moment.stoppageMinutes === null
        ? `${moment.minute}e minuut`
        : `${moment.minute}e minuut, ${moment.stoppageMinutes} minuten blessuretijd`

  return `${label} opgeslagen: ${[minute, who].filter((part) => part !== '').join(', ')}`
}

function clockOf(moment: { minute: null | number; stoppageMinutes: null | number }) {
  return { minute: moment.minute, stoppageMinutes: moment.stoppageMinutes }
}

/**
 * The errors of the checks that belong to the row that was just added, by the id of the field
 * of the live form. An error of another row, or of a list, is not the editor's to put right
 * here: it comes as one error for the whole report.
 */
function liveErrorsOf(errors: ReportErrors, kind: LiveKind, side: Side, number: number): ReportErrors {
  const found: ReportErrors = {}

  for (const field of fieldsOfKind[kind]) {
    const message = errors[rowFieldId(kind, side, number, field as FieldName)]

    if (message !== undefined) {
      found[liveFieldId(kind, field)] = message
    }
  }

  if (Object.keys(found).length === 0) {
    found[liveFieldId(kind, 'minuut')] =
      'De gebeurtenis kan niet worden opgeslagen. Kijk of de minuut en de spelers kloppen.'
  }

  return found
}

/** The goals of a match in the order of the table, as the report screen has them. */
async function readGoals(db: Pick<Database, 'select'>, matchId: number): Promise<MatchGoal[]> {
  return db.select().from(matchGoals).where(eq(matchGoals.matchId, matchId)).orderBy(asc(matchGoals.id))
}

/**
 * What every change of the live screen ends with: the report is saved now (who and when), a
 * report that was `klaar` and has an error becomes `bezig`, the goals are marked as the
 * editors' and a change of Wikipedia that waited for them is let go, and the log gets one line.
 */
async function settle(
  transaction: Pick<Database, 'insert' | 'select' | 'update'>,
  userId: number,
  match: Match,
  stored: StoredMatchReport,
  oldGoals: MatchGoal[],
  kind: LiveKind,
  errors: ReportErrors,
  detail: string,
  now: Date,
) {
  const demote = stored.report.status === 'klaar' && Object.keys(errors).length > 0

  await transaction
    .update(matchReports)
    .set({ savedAt: now, savedBy: userId, ...(demote ? { status: 'bezig' as const } : {}) })
    .where(eq(matchReports.matchId, match.id))

  if (kind === 'doelpunt') {
    await markGoalsEdited(transaction, match, oldGoals, userId, now)
    await rejectPending(transaction, match.id, now, ['goals'])
  }

  await recordAction(
    transaction,
    {
      action: 'match.edit',
      detail,
      itemId: match.id,
      reason: 'Verslag bijgehouden tijdens de wedstrijd',
      userId,
    },
    now,
  )
}
