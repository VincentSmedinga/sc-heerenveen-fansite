import type { Match, MatchGoal } from '@fansite/db/schema'

import { hiddenReasonMaxLength, matchGoalPlayerMaxLength, matchLimits } from '@fansite/db/schema'
import { amsterdamToUtc, utcToAmsterdam } from '@fansite/db/season'

import { parseReason } from './items'
import {
  emptyFields,
  emptyGoal,
  goalFieldId,
  goalFieldNames,
  type GoalValues,
  type MatchErrors,
  type MatchFieldName,
  matchFieldNames,
  type MatchValues,
  otherPlayer,
} from './match-fields'

// Reading and checking the form of a match. The checks repeat what the database enforces
// (`matches_*` and `match_goals_*`), so an editor gets a sentence at the field instead of a
// failed save, and add what it can't: the goals must add up to the result.

/** The most minutes of a goal, with extra time, and of added time. */
export const mostMinutes = 150
export const mostStoppageMinutes = 30

/** The most goals a team scores in a match we accept. */
const mostGoals = 99

/** The competitions in which a match can go to extra time. */
const knockoutCompetitions: readonly Match['competition'][] = ['KNVB Beker', 'Play-offs Conference League']

/** A goal as entered: a row of `match_goals` without its numbers. */
export type EntryGoal = Omit<MatchGoal, 'id' | 'matchId'>

/** What the checks need to know about the match and the season. */
export type MatchContext = {
  competition: Match['competition']
  opponent: string
  squad: SquadPlayer[]
}

/** What an editor entered, understood and in the shape of the tables. */
export type MatchEntry = {
  goals: EntryGoal[]
  kickoff: Pick<Match, 'dateText' | 'kickoffAt' | 'matchDate'>
  result: Pick<
    Match,
    | 'afterNinetyAgainst'
    | 'afterNinetyFor'
    | 'extraTime'
    | 'goalsAgainst'
    | 'goalsFor'
    | 'penaltiesAgainst'
    | 'penaltiesFor'
    | 'status'
  >
}

/** A player of ours, as the form needs him. */
export type SquadPlayer = { id: number; name: string; wikipediaPage: null | string }

/** The statuses as the form words them, and as the database has them. */
export const statusChoices = [
  { label: 'Gepland', value: 'scheduled' },
  { label: 'Gespeeld', value: 'played' },
  { label: 'Uitgesteld', value: 'postponed' },
] as const

/** The kinds of goal as the form words them. */
export const goalKinds = [
  { label: 'Gewoon', value: 'gewoon' },
  { label: 'Strafschop', value: 'strafschop' },
  { label: 'Eigen doelpunt', value: 'eigen' },
] as const

/**
 * What the buttons of the form ask for, from the name and the value of the one that was pressed
 * (`knop`): save, add a goal, or remove goal number so-and-so.
 */
export type Button = { kind: 'add' } | { kind: 'remove'; number: number } | { kind: 'save' }

/** A new goal for the form: the choice of the kind is the usual one, the rest empty. */
export function newGoal(): GoalValues {
  return { ...emptyGoal }
}

export function readButton(formData: FormData): Button {
  const knop = formData.get('knop')

  if (knop === 'doelpunt-toevoegen') {
    return { kind: 'add' }
  }

  const removed = typeof knop === 'string' ? /^doelpunt-weghalen-(\d{1,3})$/u.exec(knop) : null

  return removed === null ? { kind: 'save' } : { kind: 'remove', number: Number(removed[1]) }
}

/**
 * What the request holds, as text. The goals are the numbers that the request has fields for,
 * in order, so a goal that is removed leaves no gap.
 */
export function readValues(formData: FormData): MatchValues {
  const numbers = new Set<number>()

  for (const name of formData.keys()) {
    const found = /^doelpunt-(\d{1,3})-/u.exec(name)

    if (found !== null) {
      numbers.add(Number(found[1]))
    }
  }

  return {
    doelpunten: [...numbers]
      .toSorted((a, b) => a - b)
      .map((number) =>
        Object.fromEntries(goalFieldNames.map((field) => [field, text(formData, goalFieldId(number, field))])),
      ) as GoalValues[],
    reden: text(formData, 'reden'),
    velden: Object.fromEntries(matchFieldNames.map((name) => [name, text(formData, name)])) as Record<
      MatchFieldName,
      string
    >,
  }
}

/**
 * Checks what an editor filled in against the match and its season. Returns the errors by
 * `id`, or, when there are none, the entry as the tables hold it: the same checks as the
 * database, a sentence at each field, and the goals that add up to the result. A result
 * without goals is fine.
 */
export function validate(
  values: MatchValues,
  context: MatchContext,
):
  | { entry: MatchEntry; errors?: undefined; reason: string }
  | { entry?: undefined; errors: MatchErrors; reason?: undefined } {
  const errors: MatchErrors = {}
  const { velden: fields } = values
  const knockout = knockoutCompetitions.includes(context.competition)

  // The kick-off: a day and a time, or a day and a text when the time is not known.
  const day = fields['aftrap-datum']
  const time = fields['aftrap-tijd']
  const dateText = fields['aftrap-tekst']

  if (!isDay(day)) {
    errors['aftrap-datum'] = 'Vul een datum in, zoals 2026-11-14.'
  }
  if (time !== '' && !isTime(time)) {
    errors['aftrap-tijd'] = 'Vul de tijd in als uren en minuten, zoals 20:00.'
  }
  if (time === '' && dateText === '') {
    errors['aftrap-tekst'] =
      'Vul de tijd in. Is de tijd nog niet bekend, schrijf dan wanneer de wedstrijd is, zoals 12-14 februari 2027.'
  } else if (time !== '' && dateText !== '') {
    errors['aftrap-tekst'] = 'Laat dit leeg als je de tijd invult.'
  } else if (dateText.length > matchLimits.dateText) {
    errors['aftrap-tekst'] = `Schrijf hoogstens ${matchLimits.dateText} tekens.`
  }

  // The status and the result.
  const status = statusChoices.find((choice) => choice.value === fields.status)?.value
  const played = status === 'played'
  const resultFields = [
    'uitslag-wij',
    'uitslag-zij',
    'na90-wij',
    'na90-zij',
    'strafschoppen-wij',
    'strafschoppen-zij',
  ] as const

  if (status === undefined) {
    errors.status = 'Kies of de wedstrijd gepland, gespeeld of uitgesteld is.'
  }

  const score = {
    against: wholeNumber(fields['uitslag-zij'], mostGoals),
    for: wholeNumber(fields['uitslag-wij'], mostGoals),
  }

  if (played) {
    for (const name of ['uitslag-wij', 'uitslag-zij'] as const) {
      if (wholeNumber(fields[name], mostGoals) === undefined) {
        errors[name] = `Vul een aantal doelpunten in, een heel getal van 0 tot ${mostGoals}.`
      }
    }
  } else if (status !== undefined) {
    for (const name of resultFields) {
      if (fields[name] !== '') {
        errors[name] = 'Een uitslag hoort bij een gespeelde wedstrijd. Maak dit veld leeg of kies Gespeeld.'
      }
    }
  }

  const extraTime = fields.verlenging === 'ja'

  if (fields.verlenging !== '' && fields.verlenging !== 'ja' && fields.verlenging !== 'nee') {
    errors.verlenging = 'Kies ja of nee.'
  } else if (extraTime && !(played && knockout)) {
    errors.verlenging = played
      ? 'Alleen bij de beker en de play-offs kan een wedstrijd verlengd worden.'
      : 'Verlenging hoort bij een gespeelde wedstrijd.'
  }

  // The score after 90 minutes, and the penalties: both numbers or neither.
  const pair = (first: MatchFieldName, second: MatchFieldName, what: string) => {
    const a = wholeNumber(fields[first], mostGoals)
    const b = wholeNumber(fields[second], mostGoals)

    for (const name of [first, second]) {
      if (fields[name] !== '' && wholeNumber(fields[name], mostGoals) === undefined) {
        errors[name] = `Vul een heel getal in van 0 tot ${mostGoals}.`
      }
    }
    if (
      (fields[first] === '') !== (fields[second] === '') &&
      errors[first] === undefined &&
      errors[second] === undefined
    ) {
      errors[fields[first] === '' ? first : second] = `Vul ${what} voor allebei de teams in, of voor geen van beide.`
    }

    return a === undefined || b === undefined ? undefined : ([a, b] as const)
  }
  const afterNinety = pair('na90-wij', 'na90-zij', 'de stand na 90 minuten')
  const penalties = pair('strafschoppen-wij', 'strafschoppen-zij', 'de strafschoppen')

  if (afterNinety !== undefined && errors['na90-wij'] === undefined && errors['na90-zij'] === undefined) {
    if (!extraTime) {
      errors['na90-wij'] = 'De stand na 90 minuten hoort bij een wedstrijd met verlenging.'
    } else if (
      score.for !== undefined &&
      score.against !== undefined &&
      (afterNinety[0] > score.for || afterNinety[1] > score.against)
    ) {
      errors['na90-wij'] = 'De stand na 90 minuten kan niet hoger zijn dan de uitslag.'
    }
  }
  if (
    penalties !== undefined &&
    errors['strafschoppen-wij'] === undefined &&
    errors['strafschoppen-zij'] === undefined
  ) {
    if (!extraTime || score.for !== score.against) {
      errors['strafschoppen-wij'] = 'Strafschoppen horen bij een verlengde wedstrijd die gelijk eindigde.'
    }
  }

  // The goals.
  const goals: MatchEntry['goals'] = []
  const squad = new Map(context.squad.map((player) => [String(player.id), player]))

  if (values.doelpunten.length > 0 && !played && status !== undefined) {
    errors.doelpunten = 'Doelpunten horen bij een gespeelde wedstrijd. Haal ze weg of kies Gespeeld.'
  }

  values.doelpunten.forEach((goal, index) => {
    const number = index + 1
    const id = (field: (typeof goalFieldNames)[number]) => goalFieldId(number, field)
    const ours = goal.kant === 'wij'
    const kind = goalKinds.find((choice) => choice.value === goal.soort)?.value
    const minute = wholeNumber(goal.minuut, mostMinutes)
    const stoppage = goal.extra === '' ? null : wholeNumber(goal.extra, mostStoppageMinutes)

    if (goal.kant !== 'wij' && goal.kant !== 'zij') {
      errors[id('kant')] = `Kies bij doelpunt ${number} voor welk team het was.`
    }
    if (minute === undefined || minute < 1) {
      errors[id('minuut')] = `Vul bij doelpunt ${number} de minuut in, van 1 tot ${mostMinutes}.`
    }
    if (stoppage === undefined || stoppage === 0) {
      errors[id('extra')] =
        `Vul bij doelpunt ${number} de blessuretijd in, van 1 tot ${mostStoppageMinutes}, of laat het leeg.`
    }
    if (kind === undefined) {
      errors[id('soort')] = `Kies bij doelpunt ${number} wat voor doelpunt het was.`
    }

    // The scorer is one of our players for a goal of ours and for an own goal of the opponent
    // that benefits them (listed under the opponent): then the player is chosen from the squad.
    const scorerIsOurs = (goal.kant === 'wij') !== (kind === 'eigen')
    const chosen = squad.get(goal.speler)
    let player: null | SquadPlayer = null
    let name = ''

    if (goal.kant !== 'wij' && goal.kant !== 'zij') {
      // The side is not known, so who scored can't be checked.
    } else if (scorerIsOurs) {
      if (chosen === undefined) {
        errors[id('speler')] = `Kies bij doelpunt ${number} de speler uit de selectie.`
      } else if (goal.naam !== '') {
        errors[id('naam')] = `Laat de naam bij doelpunt ${number} leeg: de speler is een speler van sc Heerenveen.`
      } else {
        player = chosen
        name = chosen.name
      }
    } else if (goal.speler !== '' && goal.speler !== otherPlayer) {
      errors[id('speler')] =
        `Bij doelpunt ${number} scoorde een speler van de tegenstander. Kies hier ‘Andere speler’ en schrijf de naam.`
    } else if (goal.naam === '') {
      errors[id('naam')] = `Schrijf bij doelpunt ${number} de naam van de speler.`
    } else if (goal.naam.length > matchGoalPlayerMaxLength) {
      errors[id('naam')] = `Schrijf hoogstens ${matchGoalPlayerMaxLength} tekens.`
    } else {
      name = goal.naam
    }

    if (minute !== undefined && stoppage !== undefined && name !== '' && kind !== undefined) {
      goals.push({
        minute,
        ours,
        ownGoal: kind === 'eigen',
        penalty: kind === 'strafschop',
        player: name,
        playerId: player?.id ?? null,
        stoppageMinutes: stoppage,
        wikipediaPage: player?.wikipediaPage ?? null,
      })
    }
  })

  if (
    played &&
    values.doelpunten.length > 0 &&
    errors.doelpunten === undefined &&
    score.for !== undefined &&
    score.against !== undefined &&
    values.doelpunten.every((goal) => goal.kant === 'wij' || goal.kant === 'zij')
  ) {
    const ours = values.doelpunten.filter((goal) => goal.kant === 'wij').length
    const theirs = values.doelpunten.length - ours

    if (ours !== score.for || theirs !== score.against) {
      errors.doelpunten = `De doelpunten geven ${ours}-${theirs} en de uitslag is ${score.for}-${score.against}. Pas de doelpunten of de uitslag aan.`
    }
  }

  const reason = parseReason(values.reden)

  if ('error' in reason) {
    errors.reden =
      reason.error === 'leeg'
        ? 'Schrijf waarom je dit invult of aanpast.'
        : `Schrijf hoogstens ${hiddenReasonMaxLength} tekens.`
  }

  if (Object.keys(errors).length > 0 || status === undefined || 'error' in reason) {
    return { errors }
  }

  return {
    entry: {
      // The goals are kept in the order of the clock, as the importer keeps them.
      goals: goals.toSorted((a, b) => a.minute - b.minute || (a.stoppageMinutes ?? 0) - (b.stoppageMinutes ?? 0)),
      kickoff:
        time === ''
          ? { dateText, kickoffAt: null, matchDate: day }
          : { dateText: null, kickoffAt: amsterdamToUtc(day, time), matchDate: day },
      result: {
        afterNinetyAgainst: afterNinety?.[1] ?? null,
        afterNinetyFor: afterNinety?.[0] ?? null,
        extraTime,
        goalsAgainst: played ? (score.against ?? null) : null,
        goalsFor: played ? (score.for ?? null) : null,
        penaltiesAgainst: penalties?.[1] ?? null,
        penaltiesFor: penalties?.[0] ?? null,
        status,
      },
    },
    reason: reason.reason,
  }
}

/** The values of the form for a match as it is stored, for the first view of the page. */
export function valuesOf(match: Match, goals: MatchGoal[]): MatchValues {
  const local = match.kickoffAt === null ? undefined : utcToAmsterdam(match.kickoffAt)
  const number = (value: null | number) => (value === null ? '' : String(value))
  const played = match.status === 'played'

  return {
    doelpunten: goals.map((goal) => ({
      extra: number(goal.stoppageMinutes),
      kant: goal.ours ? 'wij' : 'zij',
      minuut: String(goal.minute),
      naam: goal.playerId === null ? goal.player : '',
      soort: goal.ownGoal ? 'eigen' : goal.penalty ? 'strafschop' : 'gewoon',
      speler: goal.playerId === null ? otherPlayer : String(goal.playerId),
    })),
    reden: '',
    velden: {
      ...emptyFields,
      'aftrap-datum': local?.day ?? match.matchDate,
      'aftrap-tekst': match.dateText ?? '',
      'aftrap-tijd': local?.time ?? '',
      'na90-wij': number(match.afterNinetyFor),
      'na90-zij': number(match.afterNinetyAgainst),
      status: match.status,
      'strafschoppen-wij': number(match.penaltiesFor),
      'strafschoppen-zij': number(match.penaltiesAgainst),
      'uitslag-wij': played ? number(match.goalsFor) : '',
      'uitslag-zij': played ? number(match.goalsAgainst) : '',
      verlenging: match.extraTime ? 'ja' : 'nee',
    },
  }
}

/** Whether the text is a real day, `2026-11-14`. */
function isDay(value: string): boolean {
  const found = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)

  if (found === null) {
    return false
  }

  const date = new Date(Date.UTC(Number(found[1]), Number(found[2]) - 1, Number(found[3])))

  return date.toISOString().slice(0, 10) === value
}

/** Whether the text is a time on the clock, `20:00`. */
function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/u.test(value)
}

/** The text of a field, or an empty string when the request has none or a file. */
function text(formData: FormData, name: string) {
  const value = formData.get(name)

  return typeof value === 'string' ? value.trim() : ''
}

/** A whole number from 0 to `most`, or undefined for anything else. */
function wholeNumber(value: string, most: number): number | undefined {
  return /^\d{1,3}$/u.test(value) && Number(value) <= most ? Number(value) : undefined
}
