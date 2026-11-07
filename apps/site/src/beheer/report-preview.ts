import type { MatchHeaderFact } from '@fansite/design-system'

import { formationChoices, formationProblem } from '@fansite/shared/match-report'

import type {
  MatchPageCard,
  MatchPageData,
  MatchPageGoal,
  MatchPageIncident,
  MatchPageKick,
  MatchPagePlayer,
  MatchPageSubstitution,
} from '#src/match-page'

import { nameOfPlayer } from '#src/report-view'

import {
  cardKindChoices,
  goalKindChoices,
  incidentKindChoices,
  isUntouchedRow,
  otherFormation,
  type ReportSquadPlayer,
  type ReportValues,
  roleChoices,
  type Row,
  type RowKind,
  shootoutOutcomeChoices,
  type Side,
  sides,
} from './report-fields'

// The preview next to the form of a report: the page of the match, built again at every change
// from what the form holds. The form is a client component and so is this file, so it imports
// nothing the browser should not load. It reads the values of the form leniently: a row that is
// not finished, such as a goal without a minute, is left out of the preview and not an error,
// since the form says what is wrong and the preview only shows what is right. The rules of the
// report (report-form.ts) are for saving.

/** The last minute and the longest added time a report holds (see `matchReportLimits`). */
const lastMinute = 120
const longestStoppage = 15

/** The row of an event the editor just changed: its list, its side and its number from 1. */
export type ChangedRow = { kind: Exclude<RowKind, 'speler'>; number: number; side: Side }

/**
 * What the preview needs of the match, as plain text and numbers that a server component can
 * hand to the form: the facts are written out, since a `Time` is not for the browser to build.
 */
export type ReportPreviewMatch = {
  /** The score after 90 minutes of a match with extra time. */
  afterNinety: null | { against: number; for: number }
  extraTime: boolean
  /** The facts under the result, in the order they are shown. */
  facts: { label: string; value: string }[]
  home: boolean
  opponent: string
  /** The score of the shoot-out. */
  penalties: null | { against: number; for: number }
}

/** The row a field belongs to, from the name of the field, when it is the row of an event. */
export function changedRowOf(name: string): ChangedRow | undefined {
  const found = /^(wissel|kaart|doelpunt|strafschop)-(wij|zij)-(\d{1,3})-/u.exec(name)

  return found === null
    ? undefined
    : {
        kind: found[1] as ChangedRow['kind'],
        number: Number(found[3]),
        side: found[2] as Side,
      }
}

/** The number of a player in the data: ours from 1, the opponent's from 1001. */
const idOf = (side: Side, number: number) => (side === 'wij' ? number : 1000 + number)

/**
 * The data of the page of a match from what the form holds now. Players come in the order of
 * the form. `changed` is the row the editor just changed: the line of its event gets a frame.
 * The result is counted from the goals that are in the preview, so the score follows them.
 */
export function previewDataOf(
  values: ReportValues,
  match: ReportPreviewMatch,
  squad: readonly ReportSquadPlayer[],
  changed?: ChangedRow,
): MatchPageData {
  const players: MatchPagePlayer[] = []
  const placeOf = new Map<string, number>()

  for (const side of sides) {
    const shirts = new Set<number>()

    values[side].speler.forEach((row, index) => {
      if (isUntouchedRow('speler', row)) {
        return
      }

      const chosen = side === 'wij' ? squad.find((candidate) => String(candidate.id) === row.keuze) : undefined
      const name = chosen === undefined ? (row.naam ?? '') : chosen.name
      const typed = /^\d{1,2}$/u.test(row.rugnummer ?? '') ? Number(row.rugnummer) : undefined
      const shirtNumber = typed ?? (row.rugnummer === '' ? (chosen?.shirtNumber ?? undefined) : undefined)
      const role = roleChoices.find((choice) => choice.value === row.rol)?.value

      if (name === '' || shirtNumber === undefined || shirtNumber < 1 || shirtNumber > 99 || role === undefined) {
        return
      }

      // The pitch needs the shirt number of a player to be his alone in his team.
      if (shirts.has(shirtNumber)) {
        return
      }

      shirts.add(shirtNumber)

      const id = idOf(side, index + 1)

      placeOf.set(`${side}-${index + 1}`, id)
      players.push({
        captain: role === 'aanvoerder',
        id,
        name: nameOfPlayer(
          name,
          chosen === undefined
            ? undefined
            : { familyName: null, familyNamePrefix: null, givenName: null, searchTerm: chosen.searchTerm ?? null },
        ),
        ours: side === 'wij',
        shirtNumber,
        starter: role !== 'bank',
      })
    })
  }

  const isChanged = (kind: ChangedRow['kind'], side: Side, number: number) =>
    changed?.kind === kind && changed.side === side && changed.number === number
  const frame = (framed: boolean) => (framed ? { highlighted: true as const } : {})
  const substitutions: MatchPageSubstitution[] = []
  const cards: MatchPageCard[] = []
  const incidents: MatchPageIncident[] = []
  const goals: MatchPageGoal[] = []
  const kicks: MatchPageKick[] = []
  let guests = 0

  for (const side of sides) {
    values[side].wissel.forEach((row, index) => {
      const out = placeOf.get(`${side}-${row.eruit ?? ''}`)
      const into = placeOf.get(`${side}-${row.erin ?? ''}`)
      const time = momentOf(row)

      if (out !== undefined && into !== undefined && time !== undefined) {
        substitutions.push({ ...frame(isChanged('wissel', side, index + 1)), inId: into, outId: out, ...time })
      }
    })

    values[side].kaart.forEach((row, index) => {
      const kind = cardKindChoices.find((choice) => choice.value === row.soort)?.value
      const player = placeOf.get(`${side}-${row.speler ?? ''}`)
      const time = momentOf(row)

      if (kind !== undefined && player !== undefined && time !== undefined) {
        cards.push({ ...frame(isChanged('kaart', side, index + 1)), kind, playerId: player, ...time })
      }
    })

    values[side].strafschop.forEach((row, index) => {
      const kind = incidentKindChoices.find((choice) => choice.value === row.soort)?.value
      const player = placeOf.get(`${side}-${row.speler ?? ''}`)
      const time = momentOf(row)

      if (kind !== undefined && player !== undefined && time !== undefined) {
        incidents.push({ ...frame(isChanged('strafschop', side, index + 1)), kind, playerId: player, ...time })
      }
    })

    // The rounds follow the order of the rows of a team, as they do when the form is saved.
    let round = 0

    for (const row of values[side].serie) {
      if (isUntouchedRow('serie', row)) {
        continue
      }

      round += 1

      const result = shootoutOutcomeChoices.find((choice) => choice.value === row.uitkomst)?.value

      if (result !== undefined) {
        kicks.push({
          ours: side === 'wij',
          playerId: placeOf.get(`${side}-${row.speler ?? ''}`) ?? null,
          result,
          round,
        })
      }
    }

    values[side].doelpunt.forEach((row, index) => {
      const kind = goalKindChoices.find((choice) => choice.value === row.soort)?.value
      const time = momentOf(row)
      const pointed = (value: string | undefined) => {
        const [of, number] = (value ?? '').split('-')

        return of === 'wij' || of === 'zij' ? placeOf.get(`${of}-${number ?? ''}`) : undefined
      }
      let scorer = pointed(row.speler)

      // A scorer who is not in the line-up or on the bench, written by name: he is only in the
      // course of the match and the list of scorers, not on the pitch.
      if (scorer === undefined && (row.speler ?? '') === '' && (row.naam ?? '') !== '' && kind !== undefined) {
        guests += 1
        scorer = 5000 + guests
        players.push({
          captain: false,
          id: scorer,
          name: { givenName: row.naam ?? '', surname: '' },
          ours: (side === 'wij') !== (kind === 'eigen'),
          shirtNumber: 0,
          starter: false,
        })
      }

      if (kind !== undefined && scorer !== undefined && time !== undefined) {
        goals.push({
          ...frame(isChanged('doelpunt', side, index + 1)),
          assistId: pointed(row.assist) ?? null,
          ours: side === 'wij',
          ownGoal: kind === 'eigen',
          penalty: kind === 'strafschop',
          playerId: scorer,
          ...time,
        })
      }
    })
  }

  const facts: MatchHeaderFact[] = match.facts

  return {
    afterNinety: match.afterNinety,
    cards,
    extraTime: match.extraTime,
    facts,
    formations: { opponent: formationOf(values, 'zij'), ours: formationOf(values, 'wij') },
    goals,
    goalsAgainst: goals.filter((goal) => !goal.ours).length,
    goalsFor: goals.filter((goal) => goal.ours).length,
    home: match.home,
    incidents,
    kicks,
    opponent: match.opponent,
    opponentComplete: values.tegenstander === 'ja',
    penalties: match.penalties,
    players,
    substitutions,
  }
}

/** The formation of a team as the page shows it: one of the list, or his own if it is right. */
function formationOf(values: ReportValues, side: Side): null | string {
  const { eigen, keuze } = values.formatie[side]

  if (keuze === otherFormation) {
    return eigen !== '' && formationProblem(eigen) === undefined ? eigen : null
  }

  return (formationChoices as readonly string[]).includes(keuze) ? keuze : null
}

/** A minute and the added time of a row, or `undefined` when the row has no good moment yet. */
function momentOf(row: Row): undefined | { minute: number; stoppageMinutes: null | number } {
  const minute = /^\d{1,3}$/u.test(row.minuut ?? '') ? Number(row.minuut) : undefined
  const stoppage = row.extra === '' ? null : /^\d{1,2}$/u.test(row.extra ?? '') ? Number(row.extra) : undefined

  if (minute === undefined || minute < 1 || minute > lastMinute) {
    return undefined
  }

  if (stoppage === undefined || stoppage === 0 || (stoppage !== null && stoppage > longestStoppage)) {
    return undefined
  }

  return { minute, stoppageMinutes: stoppage }
}
