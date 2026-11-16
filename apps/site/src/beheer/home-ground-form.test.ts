import { describe, expect, it } from 'vitest'

import { emptyHomeGroundRow, type HomeGroundRowValues } from './home-ground-fields'
import { readHomeGroundButton, readHomeGroundRows, validateHomeGroundRows } from './home-ground-form'

const row = (more: Partial<HomeGroundRowValues> = {}): HomeGroundRowValues => ({
  ...emptyHomeGroundRow,
  stadion: '1',
  ...more,
})
const known = new Set([1, 2])

describe('validateHomeGroundRows', () => {
  it('gives the lines as the table holds them, and accepts no line at all', () => {
    expect(validateHomeGroundRows([], known)).toEqual({ lines: [] })
    expect(
      validateHomeGroundRows([row(), row({ seizoen: '2005/06', stadion: '2', toelichting: ' Tijdelijk ' })], known),
    ).toEqual({
      lines: [
        { note: null, stadiumId: 1, startDay: null, startSeason: null },
        { note: 'Tijdelijk', stadiumId: 2, startDay: null, startSeason: '2005/06' },
      ],
    })
  })

  it('refuses a stadium that is not in the list, whatever the request says', () => {
    expect(
      validateHomeGroundRows(
        [
          row({ stadion: '' }),
          row({ seizoen: '2005/06', stadion: '9' }),
          row({ dag: '2007-01-01', stadion: '1; DROP' }),
        ],
        known,
      ).errors,
    ).toEqual({
      'thuis-1-stadion': 'Kies een stadion uit de lijst.',
      'thuis-2-stadion': 'Kies een stadion uit de lijst.',
      'thuis-3-stadion': 'Kies een stadion uit de lijst.',
    })
  })

  it('keeps the rules of the starts: ascending, one kind, only the first without', () => {
    expect(validateHomeGroundRows([row({ seizoen: '2010/11' }), row({ seizoen: '2005/06' })], known).errors).toEqual({
      'thuis-2-seizoen': 'De start moet na de start van de regel erboven liggen.',
    })
    expect(validateHomeGroundRows([row(), row()], known).errors).toEqual({
      'thuis-2-seizoen': 'Vul een seizoen of een dag in. Alleen het eerste thuisveld mag zonder start.',
    })
    expect(validateHomeGroundRows([row({ dag: '2010-02-30' })], known).errors).toEqual({
      'thuis-1-dag': 'Kies een geldige dag.',
    })
  })

  it('limits the note to 200 characters of plain text', () => {
    expect(validateHomeGroundRows([row({ toelichting: 'x'.repeat(201) })], known).errors).toEqual({
      'thuis-1-toelichting': 'Schrijf hoogstens 200 tekens.',
    })
  })
})

describe('reading the request', () => {
  it('reads the lines in order and the button, and a removed line leaves no gap', () => {
    const formData = new FormData()

    formData.set('thuis-3-stadion', '2')
    formData.set('thuis-1-stadion', '1')
    formData.set('knop', 'thuis-weghalen-2')

    expect(readHomeGroundRows(formData).map((line) => line.stadion)).toEqual(['1', '2'])
    expect(readHomeGroundButton(formData)).toEqual({ kind: 'remove', number: 2 })
    formData.set('knop', 'thuis-toevoegen')
    expect(readHomeGroundButton(formData)).toEqual({ kind: 'add' })
    formData.set('knop', 'iets anders')
    expect(readHomeGroundButton(formData)).toEqual({ kind: 'save' })
  })
})
