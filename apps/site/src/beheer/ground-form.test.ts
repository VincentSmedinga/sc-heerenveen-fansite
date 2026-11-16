import { describe, expect, it } from 'vitest'

import type { GroundValues } from './ground-fields'

import { readCoordinates, readGroundValues, validateGround } from './ground-form'
import { emptyRow } from './stadium-fields'

const values = (more: Partial<GroundValues> = {}): GroundValues => ({
  breedtegraad: '',
  lengtegraad: '',
  plaats: '',
  postcode: '',
  rows: [{ ...emptyRow, naam: 'Oefenpark' }],
  straat: '',
  ...more,
})

describe('validateGround', () => {
  it('turns what an editor filled in into what the table holds: empty is null and the coordinates have six decimals', () => {
    expect(
      validateGround(
        values({ breedtegraad: '52,9605', lengtegraad: '5.9396', plaats: ' Oefenstad ', postcode: '1234 AB' }),
      ),
    ).toEqual({
      input: {
        latitude: '52.960500',
        longitude: '5.939600',
        names: [{ name: 'Oefenpark', note: null, startDay: null, startSeason: null }],
        place: 'Oefenstad',
        postcode: '1234 AB',
        street: null,
      },
    })
  })

  it('wants both coordinates or none, and says at the field which one is missing', () => {
    expect(validateGround(values({ breedtegraad: '52,9' })).errors).toEqual({
      lengtegraad: 'Vul ook de lengtegraad in, of laat de breedtegraad leeg.',
    })
    expect(validateGround(values({ lengtegraad: '5,9' })).errors).toEqual({
      breedtegraad: 'Vul ook de breedtegraad in, of laat de lengtegraad leeg.',
    })
  })

  it.each([
    ['breedtegraad', '91', '5'],
    ['breedtegraad', 'noord', '5'],
    ['lengtegraad', '52', '181'],
    ['lengtegraad', '52', '5,1234567891'],
  ])('refuses %s %s that is not a coordinate', (field, breedtegraad, lengtegraad) => {
    expect(Object.keys(validateGround(values({ breedtegraad, lengtegraad })).errors ?? {})).toEqual([field])
  })

  it('wants a name, and keeps the rules of the names of a club for the starts and the notes', () => {
    expect(validateGround(values({ rows: [] })).errors).toEqual({ regels: 'Een stadion heeft minstens één naam.' })
    expect(
      validateGround(
        values({
          rows: [
            { ...emptyRow, naam: 'Een' },
            { ...emptyRow, naam: 'Twee' },
          ],
        }),
      ).errors,
    ).toEqual({ 'regel-2-seizoen': 'Vul een seizoen of een dag in. Alleen de eerste naam mag zonder start.' })
  })

  it('limits the place, the street and the postcode, and refuses control characters', () => {
    expect(
      validateGround(values({ plaats: 'x'.repeat(101), postcode: '1'.repeat(13), straat: 'x'.repeat(151) })).errors,
    ).toEqual({
      plaats: 'Schrijf hoogstens 100 tekens.',
      postcode: 'Schrijf hoogstens 12 tekens.',
      straat: 'Schrijf hoogstens 150 tekens.',
    })
    expect(validateGround(values({ straat: 'Weg\u0007' })).errors).toEqual({ straat: 'Gebruik alleen gewone tekens.' })
  })
})

describe('readCoordinates and readGroundValues', () => {
  it('reads a point with a comma or a point, and nothing for half a point', () => {
    expect(readCoordinates({ breedtegraad: '52,5', lengtegraad: '-5.25' })).toEqual({
      latitude: 52.5,
      longitude: -5.25,
    })
    expect(readCoordinates({ breedtegraad: '52,5', lengtegraad: '' })).toBeUndefined()
  })

  it('reads the fields and the lines of a request, trimmed, and ignores the rest', () => {
    const formData = new FormData()

    formData.set('plaats', '  Oefenstad ')
    formData.set('regel-1-naam', ' Park ')
    formData.set('onzin', 'x')

    expect(readGroundValues(formData)).toMatchObject({
      plaats: 'Oefenstad',
      rows: [{ naam: 'Park' }],
      straat: '',
    })
  })
})
