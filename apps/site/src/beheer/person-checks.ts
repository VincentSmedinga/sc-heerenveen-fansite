// The checks of what an editor fills in about a person: the name, the Wikipedia page, the
// line, the country, the birth date and the year of death. The form of a player
// (`validatePlayer`) and the form of a person (issue 1164) both use them, so a field says the
// same in both forms. Each check puts its sentence in `errors`, under the `id` of its field,
// and returns the value as the tables hold it.
import type { EditorsName } from '@fansite/db/persons'

import {
  personNameLimits,
  playerNameMaxLength,
  type PlayerPosition,
  playerPositions,
  wikipediaPageMaxLength,
} from '@fansite/db/schema'
import { isCountryCode } from '@fansite/shared/countries'

/** A birth date the editors fill in: a whole year, or a day (issue 1164). */
export type EditorsBirthDate = { date: string; precision: 'day' | 'year' }

/** The errors of the fields of a person, by the `id` of the field. */
export type PersonCheckErrors = Partial<
  Record<'achternaam' | 'geboren' | 'land' | 'linie' | 'overleden' | 'tussenvoegsel' | 'voornaam' | 'wikipedia', string>
>

/** The oldest year a birth date or a year of death may have. */
const firstYear = 1850

/**
 * The birth date in the field: `1985` for a year, `14-3-1985` for a day, and `3-1985` for a
 * month, which only Wikidata gives. Empty for none.
 */
export function birthDateText(
  date: null | string | undefined,
  precision: 'day' | 'month' | 'year' | null | undefined,
): string {
  if (date === null || date === undefined) {
    return ''
  }

  const [year, month, day] = date.split('-').map(Number)

  return precision === 'year' ? String(year) : precision === 'month' ? `${month}-${year}` : `${day}-${month}-${year}`
}

/**
 * The birth date as a year (`1985`) or a day (`14-3-1985`, or `1985-03-14`), from 1850 to
 * today. Null for an empty field, or for one with an error.
 */
export function checkBirthDate(value: string, errors: PersonCheckErrors, now = new Date()): EditorsBirthDate | null {
  if (value === '') {
    return null
  }

  const today = now.toISOString().slice(0, 10)
  const year = /^\d{4}$/u.test(value) ? Number(value) : undefined
  const dutch = /^(\d{1,2})-(\d{1,2})-(\d{4})$/u.exec(value)
  const day =
    dutch !== null
      ? `${dutch[3]}-${(dutch[2] ?? '').padStart(2, '0')}-${(dutch[1] ?? '').padStart(2, '0')}`
      : /^\d{4}-\d{2}-\d{2}$/u.test(value)
        ? value
        : undefined
  const moment = day === undefined ? undefined : new Date(`${day}T00:00:00Z`)
  const exists = moment !== undefined && !Number.isNaN(moment.getTime()) && moment.toISOString().startsWith(day ?? '')
  const found =
    year !== undefined
      ? { date: `${year}-01-01`, precision: 'year' as const }
      : day !== undefined && exists
        ? { date: day, precision: 'day' as const }
        : undefined

  if (
    found === undefined ||
    Number(found.date.slice(0, 4)) < firstYear ||
    (found.precision === 'year' ? found.date.slice(0, 4) > today.slice(0, 4) : found.date > today)
  ) {
    errors.geboren = `Vul een jaar in, zoals 1985, of een datum, zoals 14-3-1985, van ${firstYear} tot vandaag. Of laat het veld leeg.`

    return null
  }

  return found
}

/** The country as a code of two letters, or null for Onbekend. */
export function checkCountry(value: string, errors: PersonCheckErrors): null | string {
  if (value !== '' && !isCountryCode(value)) {
    errors.land = 'Kies een land uit de lijst, of kies Onbekend.'
  }

  return isCountryCode(value) ? value : null
}

/** The year of death the editors know better than Wikidata (#1147): four digits, not ahead. */
export function checkDeathYear(value: string, errors: PersonCheckErrors, now = new Date()): null | number {
  const year = /^\d{4}$/u.test(value) ? Number(value) : null

  if (value !== '' && (year === null || year < firstYear || year > now.getFullYear())) {
    errors.overleden = `Vul een jaar van overlijden in met vier cijfers, van ${firstYear} tot en met ${now.getFullYear()}, of laat het veld leeg.`

    return null
  }

  return year
}

/** The line, or null for Onbekend. */
export function checkLine(value: string, errors: PersonCheckErrors): null | PlayerPosition {
  const line = playerPositions.find((choice) => choice === value) ?? null

  if (value !== '' && line === null) {
    errors.linie = 'Kies een linie uit de lijst, of kies Onbekend.'
  }

  return line
}

/**
 * The name in parts: the family name is required, each part has a most, and so has the whole
 * name.
 */
export function checkName(
  values: { achternaam: string; tussenvoegsel: string; voornaam: string },
  errors: PersonCheckErrors,
): EditorsName {
  const tooLong = (field: 'achternaam' | 'tussenvoegsel' | 'voornaam', most: number) => {
    if ([...values[field]].length > most) {
      errors[field] = `Schrijf hoogstens ${most} tekens.`
    }
  }

  if (values.achternaam === '') {
    errors.achternaam = 'Vul de achternaam in. Heeft de speler één naam, zoals Dinho? Vul die dan hier in.'
  }

  tooLong('voornaam', personNameLimits.givenName)
  tooLong('tussenvoegsel', personNameLimits.familyNamePrefix)
  tooLong('achternaam', personNameLimits.familyName)

  const whole = [values.voornaam, values.tussenvoegsel, values.achternaam].filter(Boolean).join(' ')

  if (errors.achternaam === undefined && [...whole].length > playerNameMaxLength) {
    errors.achternaam = `De hele naam is langer dan ${playerNameMaxLength} tekens. Kort hem in.`
  }

  return {
    familyName: values.achternaam,
    familyNamePrefix: values.tussenvoegsel === '' ? null : values.tussenvoegsel,
    givenName: values.voornaam === '' ? null : values.voornaam,
  }
}

/** The title of the article on the Dutch Wikipedia, not its address. Null for none. */
export function checkPage(value: string, errors: PersonCheckErrors): null | string {
  const title = value.replaceAll('_', ' ').replaceAll(/\s+/gu, ' ').trim()

  if (/:\/\/|^www\./iu.test(title)) {
    errors.wikipedia = 'Vul de titel van het artikel in, niet het adres. Zoals Pelle van Amersfoort.'
  } else if (/[#<>[\]{}|]/u.test(title)) {
    errors.wikipedia = 'Een titel heeft geen #, <, >, [, ], {, } of |. Vul de titel van het artikel in.'
  } else if ([...title].length > wikipediaPageMaxLength) {
    errors.wikipedia = `Schrijf hoogstens ${wikipediaPageMaxLength} tekens.`
  } else if (title !== '') {
    return title
  }

  return null
}
