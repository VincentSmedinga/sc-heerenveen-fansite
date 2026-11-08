import type { Match } from '@fansite/db/schema'
import type {
  CardKind,
  IncidentKind,
  MatchReport as ReportForRules,
  ReportIssue,
  ShootoutOutcome,
} from '@fansite/shared/match-report'

import { matchForRules } from '@fansite/db/match-reports'
import { matchReportLimits, playerNameMaxLength, shootoutLimits } from '@fansite/db/schema'
import { checkMatchReport, formationChoices, formationProblem } from '@fansite/shared/match-report'

import {
  cardKindChoices,
  type FieldName,
  formationId,
  formationOwnId,
  goalKindChoices,
  incidentKindChoices,
  isUntouchedRow,
  listId,
  otherFormation,
  otherPlayer,
  type ReportErrors,
  type ReportSquadPlayer,
  type ReportValues,
  roleChoices,
  type Row,
  rowFieldId,
  rowFields,
  type RowKind,
  rowKinds,
  rowNames,
  shootoutOutcomeChoices,
  type Side,
  sides,
  statusChoices,
} from './report-fields'

// Checking the form of a match report. The checks repeat what the database enforces, so an
// editor gets a sentence at the field instead of a failed save, and add the rules of
// `@fansite/shared/match-report` (#828), which say whether a report is right. What the
// database cannot store is a reason to refuse a save, whatever the status; what only the
// rules object to is shown, and a report that is `bezig` may have it (see `blocksSaving`).

/** The answer of the checks. `plan` is empty when the report can not be stored. */
export type CheckedReport = {
  /** Every error, by the `id` of the field or the list, in the words of the field. */
  errors: ReportErrors
  plan: ReportPlan | undefined
  /** What is not usual but allowed, by the `id` of the list. */
  warnings: Record<string, string[]>
}

/** A player of the report as it will be stored. `squadId` is empty for an opponent. */
export type PlannedPlayer = {
  captain: boolean
  name: string
  ours: boolean
  /** Empty for a player without a shirt number. */
  shirtNumber: null | number
  /** The player in `players` of the season, or `null` for an opponent or a player to add. */
  squadId: null | number
  starter: boolean
}

/** What the checks need to know about the match and its season. */
export type ReportContext = {
  match: ReportMatch
  squad: readonly ReportSquadPlayer[]
}

/** The match, as far as the checks need it. */
export type ReportMatch = Pick<
  Match,
  'extraTime' | 'goalsAgainst' | 'goalsFor' | 'opponent' | 'penaltiesAgainst' | 'penaltiesFor' | 'status'
>

/**
 * A report as it will be stored. The events point to a player by his place in `appearances`
 * (counted from 0), and are in the order of the clock.
 */
export type ReportPlan = {
  appearances: PlannedPlayer[]
  cards: (Moment & { appearance: number; kind: CardKind; ours: boolean })[]
  /** The formation of each team, or none. */
  formations: { opponent: null | string; ours: null | string }
  goals: (Moment & {
    appearance: null | number
    assist: null | number
    name: string
    ours: boolean
    ownGoal: boolean
    penalty: boolean
  })[]
  incidents: (Moment & { appearance: number; kind: IncidentKind; ours: boolean })[]
  opponentComplete: boolean
  /**
   * The kicks of the shoot-out. A kick points to its player like an event, and is empty for an
   * opponent whose side is not complete. The round counts from 1 for each team.
   */
  shootout: { appearance: null | number; ours: boolean; outcome: ShootoutOutcome; round: number }[]
  source: null | string
  /** What the editor asked for. The report is stored `bezig` when it can not be `klaar` yet. */
  status: 'bezig' | 'klaar'
  substitutions: (Moment & { in: number; ours: boolean; out: number })[]
}

/** A moment in the match. */
type Moment = { minute: number; stoppageMinutes: null | number }

/**
 * The errors of the rules that the database can not store: a report with one of them has no
 * place in the tables, whatever its status. The structural ones come with them (`structural`),
 * since an event that points to nobody can not be read back.
 */
const unstorable = new Set([
  'second-yellow-is-yellow-red',
  'shirt-number-twice',
  'substitution-in-twice',
  'substitution-out-twice',
])

/** The field of a row that an error of the rules belongs to. The first field is the default. */
const fieldOfCode: Record<string, FieldName> = {
  'assist-by-other-team': 'assist',
  'assist-by-scorer': 'assist',
  'assist-not-on-pitch': 'assist',
  'assist-with-penalty-or-own-goal': 'assist',
  'captain-twice': 'rol',
  'card-after-leaving': 'speler',
  'goal-by-other-team': 'speler',
  'goal-without-player': 'speler',
  'incident-not-on-pitch': 'speler',
  'minute-out-of-range': 'minuut',
  'own-goal-by-own-team': 'speler',
  'scorer-not-on-pitch': 'speler',
  'second-yellow-is-yellow-red': 'soort',
  'shirt-number-out-of-range': 'rugnummer',
  'shirt-number-twice': 'rugnummer',
  'shootout-kick-without-player': 'speler',
  'shootout-player-not-on-pitch': 'speler',
  'shootout-player-other-team': 'speler',
  'shootout-player-twice': 'speler',
  'stoppage-in-the-middle-of-a-half': 'extra',
  'stoppage-out-of-range': 'extra',
  'substitution-in-not-on-bench': 'erin',
  'substitution-in-twice': 'erin',
  'substitution-out-not-on-pitch': 'eruit',
  'substitution-out-twice': 'eruit',
  'substitution-same-player': 'erin',
  'substitution-two-teams': 'erin',
  'yellow-red-needs-one-yellow': 'soort',
}

/** The list of rows that a part of the rules is about. */
const kindOfPart = {
  appearances: 'speler',
  cards: 'kaart',
  goals: 'doelpunt',
  incidents: 'strafschop',
  shootout: 'serie',
  substitutions: 'wissel',
} as const satisfies Record<string, RowKind>

/**
 * Checks what an editor filled in against the match, its squad and the rules. Returns every
 * error and warning, and the report as it will be stored when nothing stops it. Rows that
 * nobody touched are not part of the report: the form makes a line-up of empty rows to fill.
 */
export function checkReportForm(values: ReportValues, context: ReportContext): CheckedReport {
  const errors: ReportErrors = {}
  const opponent = 'de tegenstander'
  const where = (kind: RowKind, side: Side, number: number) =>
    `${rowNames[kind]} ${number} van ${side === 'wij' ? 'sc Heerenveen' : opponent}`
  const fail = (id: string, message: string) => {
    errors[id] = errors[id] === undefined ? message : `${errors[id]} ${message}`
  }
  const failRow = (kind: RowKind, side: Side, number: number, field: FieldName, message: string) =>
    fail(rowFieldId(kind, side, number, field), `${where(kind, side, number)}: ${message}`)
  let parseFailed = false
  const parseFail = (...args: Parameters<typeof failRow>) => {
    parseFailed = true
    failRow(...args)
  }

  const status = statusChoices.find((choice) => choice.value === values.status)?.value

  if (status === undefined) {
    parseFailed = true
    fail('status', 'Kies of het verslag bezig of klaar is.')
  }
  if (values.tegenstander !== 'ja' && values.tegenstander !== 'nee') {
    parseFailed = true
    fail('tegenstander', 'Kies of de tegenstander ook af is.')
  }
  if (values.bron.length > matchReportLimits.source) {
    parseFailed = true
    fail('bron', `Schrijf hoogstens ${matchReportLimits.source} tekens.`)
  }

  // The formation of each team: a choice from the list, or one of his own that the rule judges.
  const formations: ReportPlan['formations'] = { opponent: null, ours: null }

  for (const side of sides) {
    const { eigen, keuze } = values.formatie[side]
    const team = side === 'wij' ? 'sc Heerenveen' : opponent
    const own = side === 'wij' ? 'ours' : 'opponent'

    if (keuze === otherFormation) {
      const problem = eigen === '' ? 'Schrijf de formatie, zoals 4-3-3.' : formationProblem(eigen)

      if (problem === undefined) {
        formations[own] = eigen
      } else {
        parseFailed = true
        fail(formationOwnId(side), `Formatie van ${team}: ${problem}`)
      }
    } else if ((formationChoices as readonly string[]).includes(keuze)) {
      // The text of a formation of his own only counts with the choice Anders.
      formations[own] = keuze
    } else if (keuze !== '') {
      parseFailed = true
      fail(formationId(side), `Formatie van ${team}: Kies een formatie uit de lijst, Anders, of niets.`)
    }
  }

  // The players first: the events point to them by the number of the row.
  const players: PlannedPlayer[] = []
  const origins = { appearances: [] as [Side, number][] }
  const placeOf = new Map<string, number>()
  const squadIds = new Map<string, string>()

  for (const side of sides) {
    values[side].speler.forEach((row, index) => {
      const number = index + 1

      if (isUntouchedRow('speler', row)) {
        return
      }

      const chosen = side === 'wij' ? context.squad.find((player) => String(player.id) === row.keuze) : undefined
      let given = chosen?.name ?? ''
      let failed = false

      if (side === 'wij' && chosen === undefined && row.keuze !== otherPlayer) {
        parseFail('speler', side, number, 'keuze', 'kies een speler uit de selectie of Andere speler.')
        failed = true
      } else if (chosen === undefined) {
        given = row.naam ?? ''

        if (given === '') {
          parseFail('speler', side, number, 'naam', 'schrijf de naam van de speler.')
          failed = true
        }
      }
      if (given.length > playerNameMaxLength) {
        parseFail('speler', side, number, 'naam', `schrijf hoogstens ${playerNameMaxLength} tekens.`)
        failed = true
      }

      // A player of ours is one row in `players`: the squad's, or one with the same name.
      const sameName =
        side === 'wij' && chosen === undefined
          ? context.squad.find((player) => player.name.toLocaleLowerCase('nl') === given.toLocaleLowerCase('nl'))
          : undefined
      const known = chosen ?? sameName
      // The shirt number may stay empty: a player of the squad then has his own, and anybody
      // else has none.
      let shirtNumber: null | number = known?.shirtNumber ?? null
      const typedText = (row.rugnummer ?? '').trim()

      if (typedText !== '') {
        const typed = /^\d{1,2}$/u.test(typedText) ? Number(typedText) : undefined

        if (typed === undefined || typed < 1 || typed > 99) {
          parseFail(
            'speler',
            side,
            number,
            'rugnummer',
            'laat het rugnummer leeg, of schrijf een heel getal van 1 tot 99.',
          )
          failed = true
        } else {
          shirtNumber = typed
        }
      }

      const role = roleChoices.find((choice) => choice.value === row.rol)?.value

      if (role === undefined) {
        parseFail('speler', side, number, 'rol', 'kies basis, basis en aanvoerder of bank.')
        failed = true
      }

      if (failed || role === undefined) {
        return
      }

      // A player is in the report once, in the line-up or on the bench: one of ours by his row
      // in the squad or else by his name, one of the opponent by his name.
      const key =
        side === 'wij'
          ? known === undefined
            ? `naam:${given.toLocaleLowerCase('nl')}`
            : `id:${known.id}`
          : `zij:${given.toLocaleLowerCase('nl')}`

      const first = squadIds.get(key)

      if (first !== undefined) {
        parseFail(
          'speler',
          side,
          number,
          chosen === undefined ? 'naam' : 'keuze',
          `${given} staat al in het verslag, bij ${first}.`,
        )

        return
      }

      squadIds.set(key, `${rowNames.speler} ${number}`)

      placeOf.set(`${side}-${number}`, players.length)
      origins.appearances.push([side, number])
      players.push({
        captain: role === 'aanvoerder',
        name: given,
        ours: side === 'wij',
        shirtNumber,
        squadId: known?.id ?? null,
        starter: role !== 'bank',
      })
    })
  }

  const plan: ReportPlan = {
    appearances: players,
    cards: [],
    formations,
    goals: [],
    incidents: [],
    opponentComplete: values.tegenstander === 'ja',
    shootout: [],
    source: values.bron === '' ? null : values.bron,
    status: status ?? 'bezig',
    substitutions: [],
  }
  const origin = {
    cards: [] as [Side, number][],
    goals: [] as [Side, number][],
    incidents: [] as [Side, number][],
    shootout: [] as [Side, number][],
    substitutions: [] as [Side, number][],
  }

  /** The place of the player an event points to: `3`, or `wij-3` for a goal. */
  const point = (
    kind: RowKind,
    side: Side,
    number: number,
    field: FieldName,
    value: string,
    of: Side,
    required: boolean,
  ) => {
    if (value === '') {
      if (required) {
        parseFail(kind, side, number, field, 'kies een speler uit de lijst.')
      }

      return undefined
    }

    const place = placeOf.get(`${of}-${/^\d{1,3}$/u.test(value) ? value : value.replace(/^(?:wij|zij)-/u, '')}`)

    if (place === undefined) {
      parseFail(kind, side, number, field, 'kies een speler die in de opstelling of op de bank staat.')
    }

    return place
  }

  /** The minute and the added time of an event, as the database allows them. */
  const moment = (kind: RowKind, side: Side, number: number, row: Row): Moment | undefined => {
    const minute = /^\d{1,3}$/u.test(row.minuut ?? '') ? Number(row.minuut) : undefined
    const stoppage = row.extra === '' ? null : /^\d{1,2}$/u.test(row.extra ?? '') ? Number(row.extra) : undefined
    let valid = true

    if (minute === undefined || minute < 1 || minute > matchReportLimits.lastMinute) {
      parseFail(kind, side, number, 'minuut', `vul de minuut in, van 1 tot ${matchReportLimits.lastMinute}.`)
      valid = false
    }
    if (
      stoppage === undefined ||
      stoppage === 0 ||
      (stoppage !== null && stoppage > matchReportLimits.stoppageMinutes)
    ) {
      parseFail(
        kind,
        side,
        number,
        'extra',
        `vul de blessuretijd in, van 1 tot ${matchReportLimits.stoppageMinutes} minuten, of laat het leeg.`,
      )
      valid = false
    } else if (stoppage !== null && minute !== undefined && ![45, 90, 105, 120].includes(minute)) {
      parseFail(
        kind,
        side,
        number,
        'extra',
        'blessuretijd hoort bij het einde van een helft, na minuut 45, 90, 105 of 120.',
      )
      valid = false
    }

    return valid && minute !== undefined && stoppage !== undefined ? { minute, stoppageMinutes: stoppage } : undefined
  }

  for (const side of sides) {
    const ours = side === 'wij'

    values[side].wissel.forEach((row, index) => {
      const number = index + 1

      if (isUntouchedRow('wissel', row)) {
        return
      }

      const out = point('wissel', side, number, 'eruit', row.eruit ?? '', side, true)
      const into = point('wissel', side, number, 'erin', row.erin ?? '', side, true)
      const time = moment('wissel', side, number, row)

      if (out !== undefined && into !== undefined && time !== undefined) {
        origin.substitutions.push([side, number])
        plan.substitutions.push({ ...time, in: into, ours, out })
      }
    })

    values[side].kaart.forEach((row, index) => {
      const number = index + 1

      if (isUntouchedRow('kaart', row)) {
        return
      }

      const kind = cardKindChoices.find((choice) => choice.value === row.soort)?.value
      const player = point('kaart', side, number, 'speler', row.speler ?? '', side, true)
      const time = moment('kaart', side, number, row)

      if (kind === undefined) {
        parseFail('kaart', side, number, 'soort', 'kies geel, geel-rood of rood.')
      } else if (player !== undefined && plan.cards.some((card) => card.appearance === player && card.kind === kind)) {
        parseFail('kaart', side, number, 'soort', `${players[player]?.name ?? 'Deze speler'} heeft deze kaart al.`)
      } else if (player !== undefined && time !== undefined) {
        origin.cards.push([side, number])
        plan.cards.push({ ...time, appearance: player, kind, ours })
      }
    })

    values[side].strafschop.forEach((row, index) => {
      const number = index + 1

      if (isUntouchedRow('strafschop', row)) {
        return
      }

      const kind = incidentKindChoices.find((choice) => choice.value === row.soort)?.value
      const player = point('strafschop', side, number, 'speler', row.speler ?? '', side, true)
      const time = moment('strafschop', side, number, row)

      if (kind === undefined) {
        parseFail('strafschop', side, number, 'soort', 'kies gemist of gestopt.')
      } else if (player !== undefined && time !== undefined) {
        origin.incidents.push([side, number])
        plan.incidents.push({ ...time, appearance: player, kind, ours })
      }
    })

    // The round follows from the order of the rows of a team. A kicker may be left empty: the
    // rules say whether his side needs him.
    let round = 0

    values[side].serie.forEach((row, index) => {
      const number = index + 1

      if (isUntouchedRow('serie', row)) {
        return
      }

      const outcome = shootoutOutcomeChoices.find((choice) => choice.value === row.uitkomst)?.value
      const player = point('serie', side, number, 'speler', row.speler ?? '', side, false)

      round += 1

      if (outcome === undefined) {
        parseFail('serie', side, number, 'uitkomst', 'kies raak, naast of gestopt.')
      } else if (round > shootoutLimits.lastRound) {
        parseFail(
          'serie',
          side,
          number,
          'speler',
          `een serie heeft hoogstens ${shootoutLimits.lastRound} schoten per team.`,
        )
      } else if ((row.speler ?? '') === '' || player !== undefined) {
        origin.shootout.push([side, number])
        plan.shootout.push({ appearance: player ?? null, ours, outcome, round })
      }
    })

    values[side].doelpunt.forEach((row, index) => {
      const number = index + 1

      if (isUntouchedRow('doelpunt', row)) {
        return
      }

      const kind = goalKindChoices.find((choice) => choice.value === row.soort)?.value
      const scorerSide = (row.speler ?? '').startsWith('zij-') ? 'zij' : 'wij'
      const assistSide = (row.assist ?? '').startsWith('zij-') ? 'zij' : 'wij'
      const scorer = point('doelpunt', side, number, 'speler', row.speler ?? '', scorerSide, false)
      const assist = point('doelpunt', side, number, 'assist', row.assist ?? '', assistSide, false)
      const time = moment('doelpunt', side, number, row)
      const name = scorer === undefined ? (row.naam ?? '') : (players[scorer]?.name ?? '')

      if (kind === undefined) {
        parseFail('doelpunt', side, number, 'soort', 'kies gewoon, strafschop of eigen doelpunt.')
      }
      if (name === '' && (row.speler ?? '') === '') {
        parseFail(
          'doelpunt',
          side,
          number,
          'speler',
          'kies de speler die scoorde, of schrijf zijn naam bij Andere naam.',
        )
      } else if (name.length > playerNameMaxLength) {
        parseFail('doelpunt', side, number, 'naam', `schrijf hoogstens ${playerNameMaxLength} tekens.`)
      }
      if (kind !== undefined && time !== undefined && !parseFailed) {
        origin.goals.push([side, number])
        plan.goals.push({
          ...time,
          appearance: scorer ?? null,
          assist: assist ?? null,
          name,
          ours,
          ownGoal: kind === 'eigen',
          penalty: kind === 'strafschop',
        })
      }
    })
  }

  if (parseFailed) {
    return { errors, plan: undefined, warnings: {} }
  }

  // The events in the order of the clock, and for the same moment as they were typed. The
  // origins follow, since the rules name an event by its place in the list.
  const sorted = <T extends Moment>(events: T[], places: [Side, number][]) => {
    const order = events
      .map((_event, index) => index)
      .toSorted((a, b) => clock(events[a]!) - clock(events[b]!) || a - b)

    return { events: order.map((index) => events[index]!), places: order.map((index) => places[index]!) }
  }
  const subs = sorted(plan.substitutions, origin.substitutions)
  const cards = sorted(plan.cards, origin.cards)
  const incidents = sorted(plan.incidents, origin.incidents)
  const goals = sorted(plan.goals, origin.goals)

  plan.substitutions = subs.events
  plan.cards = cards.events
  plan.incidents = incidents.events
  plan.goals = goals.events

  const report: ReportForRules = {
    appearances: players.map((player, index) => ({
      captain: player.captain,
      id: index + 1,
      name: player.name,
      ours: player.ours,
      shirtNumber: player.shirtNumber,
      starter: player.starter,
    })),
    cards: plan.cards.map((card) => ({
      appearanceId: card.appearance + 1,
      kind: card.kind,
      minute: card.minute,
      stoppageMinutes: card.stoppageMinutes,
    })),
    goals: plan.goals.map((goal) => ({
      appearanceId: goal.appearance === null ? null : goal.appearance + 1,
      assistId: goal.assist === null ? null : goal.assist + 1,
      minute: goal.minute,
      ours: goal.ours,
      ownGoal: goal.ownGoal,
      penalty: goal.penalty,
      stoppageMinutes: goal.stoppageMinutes,
    })),
    incidents: plan.incidents.map((incident) => ({
      appearanceId: incident.appearance + 1,
      kind: incident.kind,
      minute: incident.minute,
      stoppageMinutes: incident.stoppageMinutes,
    })),
    opponentComplete: plan.opponentComplete,
    shootout: plan.shootout.map((kick) => ({
      appearanceId: kick.appearance === null ? null : kick.appearance + 1,
      ours: kick.ours,
      outcome: kick.outcome,
      round: kick.round,
    })),
    status: plan.status,
    substitutions: plan.substitutions.map((substitution) => ({
      inId: substitution.in + 1,
      minute: substitution.minute,
      outId: substitution.out + 1,
      stoppageMinutes: substitution.stoppageMinutes,
    })),
  }
  const checked = checkMatchReport(report, matchForRules(context.match))
  const placesOf = {
    appearances: origins.appearances,
    cards: cards.places,
    goals: goals.places,
    incidents: incidents.places,
    shootout: origin.shootout,
    substitutions: subs.places,
  }
  let blocked = false

  for (const issue of checked.errors) {
    if (issue.structural || unstorable.has(issue.code)) {
      blocked = true
    }

    const [id, message] = placeIssue(issue, placesOf, where)

    fail(id, message)
  }

  const warnings: Record<string, string[]> = {}

  for (const issue of checked.warnings) {
    const [id, message] = placeIssue(issue, placesOf, where, true)

    warnings[id] = [...(warnings[id] ?? []), message]
  }

  return { errors, plan: blocked ? undefined : plan, warnings }
}

/** The order of the fields and lists on the page, for the list of errors. */
export function errorOrder(values: ReportValues): string[] {
  return [
    'verslag',
    'bron',
    'status',
    'tegenstander',
    ...sides.flatMap((side) => [
      formationId(side),
      formationOwnId(side),
      ...rowKinds.flatMap((kind) => [
        listId(kind, side),
        ...values[side][kind].flatMap((_row, index) =>
          rowFields[kind].map((field) => rowFieldId(kind, side, index + 1, field)),
        ),
      ]),
    ]),
  ]
}

/** The clock of a moment, so added time comes before the next half: 45+2 is before 46. */
function clock(moment: Moment) {
  return moment.minute + (moment.stoppageMinutes ?? 0) / 100
}

/**
 * Where an issue of the rules belongs in the form, with its sentence: the field of the row it
 * is about, or else the list. A sentence about a row says which row.
 */
function placeIssue(
  issue: ReportIssue,
  places: Record<keyof typeof kindOfPart, [Side, number][]>,
  where: (kind: RowKind, side: Side, number: number) => string,
  asList = false,
): [string, string] {
  if (issue.place.part === 'report') {
    return ['verslag', issue.message]
  }

  const kind = kindOfPart[issue.place.part]
  const found = issue.place.index === undefined ? undefined : places[issue.place.part][issue.place.index]

  if (found === undefined) {
    // A sentence about the whole series is for the list of our team, unless it is about the
    // other team alone.
    const side =
      issue.message.includes('sc Heerenveen') || kind === 'doelpunt' || issue.code === 'shootout-without-score'
        ? 'wij'
        : 'zij'

    return [listId(kind, side), issue.message]
  }

  const [side, number] = found
  const field =
    kind === 'speler' && issue.code === 'player-twice'
      ? side === 'wij'
        ? 'keuze'
        : 'naam'
      : (fieldOfCode[issue.code] ?? rowFields[kind][0])

  // A warning has no field to stand at: the form shows it with the list.
  return [
    asList ? listId(kind, side) : rowFieldId(kind, side, number, field),
    `${where(kind, side, number)}: ${issue.message}`,
  ]
}
