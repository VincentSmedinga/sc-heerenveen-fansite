// Reading and checking the form of the home grounds of a club: the lines an editor filled in
// and the button that was pressed. The start follows the rules of the names of a club.
import type { HomeGroundRow } from '@fansite/db/stadiums'

import { clubStadiumLimits } from '@fansite/db/schema'

import type { HomeGroundRowValues } from './home-ground-fields'
import type { StadiumErrors } from './stadium-fields'

import { emptyHomeGroundRow, homeGroundFieldId, homeGroundFieldNames, mostHomeGroundRows } from './home-ground-fields'
import { checkStart, hasOddCharacters } from './stadium-form'

/** What a button of the form does. */
export type HomeGroundButton = { kind: 'add' } | { kind: 'remove'; number: number } | { kind: 'save' }

/** The values of a line as the table holds them. */
export function homeGroundRowOf(row: {
  note: null | string
  stadiumId: number
  startDay: null | string
  startSeason: null | string
}): HomeGroundRowValues {
  return {
    dag: row.startDay ?? '',
    seizoen: row.startSeason ?? '',
    stadion: String(row.stadiumId),
    toelichting: row.note ?? '',
  }
}

/** A line nobody filled in: the form made it. */
export function isUntouchedHomeGroundRow(row: HomeGroundRowValues) {
  return homeGroundFieldNames.every((field) => row[field] === emptyHomeGroundRow[field])
}

export function readHomeGroundButton(formData: FormData): HomeGroundButton {
  const knop = formData.get('knop')

  if (knop === 'thuis-toevoegen') {
    return { kind: 'add' }
  }

  const removed = typeof knop === 'string' ? /^thuis-weghalen-(\d{1,3})$/u.exec(knop) : null

  return removed === null ? { kind: 'save' } : { kind: 'remove', number: Number(removed[1]) }
}

/** The lines the request has fields for, in order; a removed line leaves no gap. */
export function readHomeGroundRows(formData: FormData): HomeGroundRowValues[] {
  const numbers = new Set<number>()

  for (const name of formData.keys()) {
    const found = /^thuis-(\d{1,3})-/u.exec(name)

    if (found !== null) {
      numbers.add(Number(found[1]))
    }
  }

  return [...numbers]
    .toSorted((a, b) => a - b)
    .map(
      (number) =>
        Object.fromEntries(
          homeGroundFieldNames.map((field) => {
            const value = formData.get(homeGroundFieldId(number, field))

            return [field, typeof value === 'string' ? value.trim() : '']
          }),
        ) as HomeGroundRowValues,
    )
}

/**
 * Checks what an editor filled in. `known` are the numbers of the stadiums that exist: the
 * choice is input from outside all the same. The rules are those of the names of a club: a
 * start is a season or a day, going up, and only the first line may have none; a note is at
 * most 200 characters of plain text. A club may have no home grounds, so no line is fine.
 */
export function validateHomeGroundRows(
  rows: readonly HomeGroundRowValues[],
  known: ReadonlySet<number>,
): { errors: StadiumErrors; lines?: undefined } | { errors?: undefined; lines: HomeGroundRow[] } {
  const errors: StadiumErrors = {}

  if (rows.length > mostHomeGroundRows) {
    errors['thuisvelden'] = `Een lijst heeft hoogstens ${mostHomeGroundRows} regels.`
  }

  let before: string | undefined

  const lines = rows.map((row, index): HomeGroundRow => {
    const id = (field: (typeof homeGroundFieldNames)[number]) => homeGroundFieldId(index + 1, field)
    const stadiumId = /^\d{1,10}$/u.test(row.stadion) ? Number(row.stadion) : 0
    const note = row.toelichting.replaceAll(/\s+/gu, ' ').trim()

    if (!known.has(stadiumId)) {
      errors[id('stadion')] = 'Kies een stadion uit de lijst.'
    }
    if ([...note].length > clubStadiumLimits.note) {
      errors[id('toelichting')] = `Schrijf hoogstens ${clubStadiumLimits.note} tekens.`
    } else if (hasOddCharacters(note)) {
      errors[id('toelichting')] = 'Gebruik alleen gewone tekens.'
    }

    const found = checkStart(row, index, before, 'het eerste thuisveld')

    if (found.error !== undefined) {
      errors[id(found.error.field)] = found.error.message
    }

    before = found.before

    return {
      note: note === '' ? null : note,
      stadiumId,
      startDay: row.dag === '' ? null : row.dag,
      startSeason: row.seizoen === '' ? null : row.seizoen,
    }
  })

  return Object.keys(errors).length > 0 ? { errors } : { lines }
}
