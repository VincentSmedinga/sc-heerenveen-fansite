// Reading and checking the form of the stadiums of a club: the lines an editor filled in, the
// button that was pressed, and the lines as the table holds them. The values are text; the
// checks are the same as the table's (see `club_stadiums`), with a sentence at each field.
import type { StadiumLine } from '@fansite/db/club-stadiums'

import { clubStadiumLimits } from '@fansite/db/schema'

import type { StadiumErrors, StadiumFieldName, StadiumRowValues } from './stadium-fields'

import { emptyRow, mostStadiumRows, stadiumFieldId, stadiumFieldNames } from './stadium-fields'

/**
 * What a button of the form does: save, add a line, remove a line, take Wikipedia over, or
 * (the form of a stadium) look up the address of the coordinates.
 */
export type StadiumButton =
  { kind: 'add' } | { kind: 'address' } | { kind: 'remove'; number: number } | { kind: 'save' } | { kind: 'take-over' }

/**
 * Checks the start of a line: a season or a day, never both, in order after `before` (the
 * start of the line above), and only the first line may have none. Returns the start to compare
 * the next line with, and the error with the field it belongs to.
 */
export function checkStart(
  { dag: day, seizoen: season }: Pick<StadiumRowValues, 'dag' | 'seizoen'>,
  index: number,
  before: string | undefined,
  first = 'de eerste naam',
): { before: string | undefined; error?: { field: 'dag' | 'seizoen'; message: string } } {
  const start = startOf(season, day)

  if (season !== '' && day !== '') {
    return { before, error: { field: 'seizoen', message: 'Vul een seizoen of een dag in, niet allebei.' } }
  }
  if (season !== '' && !isSeason(season)) {
    return { before, error: { field: 'seizoen', message: 'Schrijf het seizoen zoals 2019/20.' } }
  }
  if (day !== '' && !isDay(day)) {
    return { before, error: { field: 'dag', message: 'Kies een geldige dag.' } }
  }
  if (start === undefined) {
    return index > 0
      ? {
          before,
          error: { field: 'seizoen', message: `Vul een seizoen of een dag in. Alleen ${first} mag zonder start.` },
        }
      : { before }
  }
  if (before !== undefined && start <= before) {
    return {
      before: start,
      error: {
        field: season === '' ? 'dag' : 'seizoen',
        message: 'De start moet na de start van de regel erboven liggen.',
      },
    }
  }

  return { before: start }
}

/** Control and format characters: not a character that belongs in a name or a note. */
export function hasOddCharacters(text: string) {
  return /\p{C}/u.test(text)
}

/** A line nobody filled in: the form made it, and it is not a name. */
export function isUntouchedRow(row: StadiumRowValues) {
  return stadiumFieldNames.every((field) => row[field] === emptyRow[field])
}

export function readStadiumButton(formData: FormData): StadiumButton {
  const knop = formData.get('knop')

  if (knop === 'regel-toevoegen') {
    return { kind: 'add' }
  }
  if (knop === 'overnemen') {
    return { kind: 'take-over' }
  }
  if (knop === 'adres-invullen') {
    return { kind: 'address' }
  }

  const removed = typeof knop === 'string' ? /^regel-weghalen-(\d{1,3})$/u.exec(knop) : null

  return removed === null ? { kind: 'save' } : { kind: 'remove', number: Number(removed[1]) }
}

/**
 * What the request holds, as text: the lines are the numbers that the request has fields for,
 * in order, so a line that is removed leaves no gap. A request with more lines than a list may
 * have keeps them, so the check can say so.
 */
export function readStadiumRows(formData: FormData): StadiumRowValues[] {
  const numbers = new Set<number>()

  for (const name of formData.keys()) {
    const found = /^regel-(\d{1,3})-/u.exec(name)

    if (found !== null) {
      numbers.add(Number(found[1]))
    }
  }

  return [...numbers]
    .toSorted((a, b) => a - b)
    .map(
      (number) =>
        Object.fromEntries(
          stadiumFieldNames.map((field) => {
            const value = formData.get(stadiumFieldId(number, field))

            return [field, typeof value === 'string' ? value.trim() : '']
          }),
        ) as StadiumRowValues,
    )
}

/** The values of a line as the table holds them, for a form that is filled from the table. */
export function rowOf(line: StadiumLine): StadiumRowValues {
  return {
    dag: line.startDay ?? '',
    naam: line.name,
    seizoen: line.startSeason ?? '',
    toelichting: line.note ?? '',
  }
}

/**
 * Checks what an editor filled in. Returns the errors by `id`, or, when there are none, the
 * lines as the table holds them. The rules: a list has at least one line and at most
 * `mostStadiumRows`; a name is 1 to 100 characters and a note at most 200, both plain text; a
 * start is a season (`2019/20`) or a day, never both, and only the first line may have none;
 * the starts go up from line to line, a season counting as 1 July of its first year.
 */
export function validateStadiumRows(
  rows: readonly StadiumRowValues[],
  emptyMessage = 'Een lijst heeft minstens één regel. Wil je er geen eigen lijst meer? Kies "Terug naar Wikipedia".',
): { errors: StadiumErrors; lines?: undefined } | { errors?: undefined; lines: StadiumLine[] } {
  const errors: StadiumErrors = {}

  if (rows.length === 0) {
    errors['regels'] = emptyMessage
  } else if (rows.length > mostStadiumRows) {
    errors['regels'] = `Een lijst heeft hoogstens ${mostStadiumRows} regels.`
  }

  let before: string | undefined

  const lines = rows.map((row, index): StadiumLine => {
    const number = index + 1
    const id = (field: StadiumFieldName) => stadiumFieldId(number, field)
    const name = row.naam.replaceAll(/\s+/gu, ' ').trim()
    const note = row.toelichting.replaceAll(/\s+/gu, ' ').trim()

    if (name === '') {
      errors[id('naam')] = 'Vul de naam van het stadion in.'
    } else if ([...name].length > clubStadiumLimits.name) {
      errors[id('naam')] = `Schrijf hoogstens ${clubStadiumLimits.name} tekens.`
    } else if (hasOddCharacters(name)) {
      errors[id('naam')] = 'Gebruik alleen gewone tekens.'
    }

    if ([...note].length > clubStadiumLimits.note) {
      errors[id('toelichting')] = `Schrijf hoogstens ${clubStadiumLimits.note} tekens.`
    } else if (hasOddCharacters(note)) {
      errors[id('toelichting')] = 'Gebruik alleen gewone tekens.'
    }

    const found = checkStart(row, index, before)

    if (found.error !== undefined) {
      errors[id(found.error.field)] = found.error.message
    }

    before = found.before

    return {
      name,
      note: note === '' ? null : note,
      startDay: row.dag === '' ? null : row.dag,
      startSeason: row.seizoen === '' ? null : row.seizoen,
    }
  })

  return Object.keys(errors).length > 0 ? { errors } : { lines }
}

/** A calendar day as `2021-02-14`, one that exists. */
function isDay(text: string) {
  const found = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(text)

  if (found === null || Number(found[1]) < 1900) {
    return false
  }

  const moment = new Date(`${text}T00:00:00Z`)

  return !Number.isNaN(moment.getTime()) && moment.toISOString().startsWith(text)
}

/** `2019/20`: four digits, a slash and the last two digits of the next year. */
function isSeason(text: string) {
  const found = /^(\d{4})\/(\d{2})$/u.exec(text)

  return found !== null && Number(found[1]) >= 1900 && Number(found[2]) === (Number(found[1]) + 1) % 100
}

/** The day a start counts from: a season is the first of July of its first year. */
function startOf(season: string, day: string) {
  if (isSeason(season)) {
    return `${season.slice(0, 4)}-07-01`
  }

  return isDay(day) ? day : undefined
}
