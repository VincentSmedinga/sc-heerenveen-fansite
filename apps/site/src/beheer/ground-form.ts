// Reading and checking the form of a stadium: the place, the coordinates, the address and the
// lines of names. The names follow the rules of the names of a club (`stadium-form.ts`).
import type { StadiumInput } from '@fansite/db/stadium-admin'

import { stadiumLimits } from '@fansite/db/schema'

import type { GroundFieldName, GroundValues } from './ground-fields'
import type { StadiumErrors } from './stadium-fields'

import { hasOddCharacters, readStadiumRows, validateStadiumRows } from './stadium-form'

/**
 * The coordinates as numbers, when both are a valid pair: a decimal with a point or a comma,
 * latitude from −90 to 90 and longitude from −180 to 180. Otherwise undefined.
 */
export function readCoordinates(values: Pick<GroundValues, 'breedtegraad' | 'lengtegraad'>) {
  const latitude = decimal(values.breedtegraad, 90)
  const longitude = decimal(values.lengtegraad, 180)

  return latitude === undefined || longitude === undefined ? undefined : { latitude, longitude }
}

/** What the request holds for the fields of a stadium and its lines, as text. */
export function readGroundValues(formData: FormData): GroundValues {
  const text = (name: GroundFieldName) => {
    const value = formData.get(name)

    return typeof value === 'string' ? value.trim() : ''
  }

  return {
    breedtegraad: text('breedtegraad'),
    lengtegraad: text('lengtegraad'),
    plaats: text('plaats'),
    postcode: text('postcode'),
    rows: readStadiumRows(formData),
    straat: text('straat'),
  }
}

/**
 * Checks what an editor filled in. Returns the errors by `id`, or, when there are none, the
 * stadium as the table holds it: empty fields are null, the coordinates have six decimals, and
 * the names are checked as those of a club, with at least one.
 */
export function validateGround(
  values: GroundValues,
): { errors: StadiumErrors; input?: undefined } | { errors?: undefined; input: StadiumInput } {
  const errors: StadiumErrors = {}
  const plain = (field: 'plaats' | 'postcode' | 'straat', most: number) => {
    const text = values[field].replaceAll(/\s+/gu, ' ').trim()

    if ([...text].length > most) {
      errors[field] = `Schrijf hoogstens ${most} tekens.`
    } else if (hasOddCharacters(text)) {
      errors[field] = 'Gebruik alleen gewone tekens.'
    }

    return text === '' ? null : text
  }
  const place = plain('plaats', stadiumLimits.place)
  const street = plain('straat', stadiumLimits.street)
  const postcode = plain('postcode', stadiumLimits.postcode)
  const given = { latitude: values.breedtegraad !== '', longitude: values.lengtegraad !== '' }
  let latitude: null | string = null
  let longitude: null | string = null

  if (given.latitude && !given.longitude) {
    errors['lengtegraad'] = 'Vul ook de lengtegraad in, of laat de breedtegraad leeg.'
  } else if (given.longitude && !given.latitude) {
    errors['breedtegraad'] = 'Vul ook de breedtegraad in, of laat de lengtegraad leeg.'
  } else if (given.latitude && given.longitude) {
    const found = readCoordinates(values)

    if (decimal(values.breedtegraad, 90) === undefined) {
      errors['breedtegraad'] = 'Schrijf de breedtegraad als een getal van −90 tot 90, zoals 52,9605.'
    }
    if (decimal(values.lengtegraad, 180) === undefined) {
      errors['lengtegraad'] = 'Schrijf de lengtegraad als een getal van −180 tot 180, zoals 5,9396.'
    }
    if (found !== undefined) {
      latitude = found.latitude.toFixed(6)
      longitude = found.longitude.toFixed(6)
    }
  }

  const names = validateStadiumRows(values.rows, 'Een stadion heeft minstens één naam.')

  Object.assign(errors, names.errors)

  return Object.keys(errors).length > 0 || names.lines === undefined
    ? { errors }
    : { input: { latitude, longitude, names: names.lines, place, postcode, street } }
}

function decimal(text: string, most: number): number | undefined {
  if (!/^-?\d{1,3}(?:[.,]\d{1,8})?$/u.test(text)) {
    return undefined
  }

  const value = Number(text.replace(',', '.'))

  return Math.abs(value) <= most ? value : undefined
}
