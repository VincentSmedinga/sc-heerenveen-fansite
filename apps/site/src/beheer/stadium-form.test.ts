import { describe, expect, it } from 'vitest'

import type { StadiumRowValues } from './stadium-fields'

import { isUntouchedRow, readStadiumButton, readStadiumRows, rowOf, validateStadiumRows } from './stadium-form'

const row = (more: Partial<StadiumRowValues> = {}): StadiumRowValues => ({
  dag: '',
  naam: 'Stadion Test',
  seizoen: '',
  toelichting: '',
  ...more,
})

describe('readStadiumButton', () => {
  const press = (value?: string) => {
    const formData = new FormData()

    if (value !== undefined) {
      formData.set('knop', value)
    }

    return readStadiumButton(formData)
  }

  it('knows the buttons by their value, and saves for any other request', () => {
    expect(press('regel-toevoegen')).toEqual({ kind: 'add' })
    expect(press('overnemen')).toEqual({ kind: 'take-over' })
    expect(press('regel-weghalen-3')).toEqual({ kind: 'remove', number: 3 })
    expect(press('opslaan')).toEqual({ kind: 'save' })
    expect(press()).toEqual({ kind: 'save' })
    expect(press('regel-weghalen-x')).toEqual({ kind: 'save' })
  })
})

describe('readStadiumRows', () => {
  it('reads the lines in order of their number, without a gap for a line that was removed, and trims', () => {
    const formData = new FormData()

    formData.set('regel-4-naam', ' Derde ')
    formData.set('regel-1-naam', 'Eerste')
    formData.set('regel-1-toelichting', 'Een toelichting')
    formData.set('regel-4-seizoen', '2020/21')
    formData.set('reden', 'telt niet mee')

    expect(readStadiumRows(formData)).toEqual([
      { dag: '', naam: 'Eerste', seizoen: '', toelichting: 'Een toelichting' },
      { dag: '', naam: 'Derde', seizoen: '2020/21', toelichting: '' },
    ])
  })

  it('reads a request without lines as no lines, and ignores a field that is no text', () => {
    const formData = new FormData()

    formData.set('regel-1-naam', new File(['x'], 'x.txt'))

    expect(readStadiumRows(new FormData())).toEqual([])
    expect(readStadiumRows(formData)).toEqual([row({ naam: '' })])
  })
})

describe('isUntouchedRow and rowOf', () => {
  it('knows a line nobody filled in, and fills the values from a line of the table', () => {
    expect(isUntouchedRow(row({ naam: '' }))).toBe(true)
    expect(isUntouchedRow(row())).toBe(false)
    expect(rowOf({ name: 'Naam', note: 'Tekst', startDay: '2021-02-14', startSeason: null })).toEqual({
      dag: '2021-02-14',
      naam: 'Naam',
      seizoen: '',
      toelichting: 'Tekst',
    })
  })
})

describe('validateStadiumRows', () => {
  it('gives the lines as the table holds them, with an empty note and start as null', () => {
    const checked = validateStadiumRows([
      row({ naam: 'AFAS  Stadion ' }),
      row({ dag: '2019-08-10', naam: 'Cars Jeans Stadion', toelichting: 'Tijdelijk in Den Haag.' }),
      row({ seizoen: '2020/21' }),
    ])

    expect(checked).toEqual({
      lines: [
        { name: 'AFAS Stadion', note: null, startDay: null, startSeason: null },
        { name: 'Cars Jeans Stadion', note: 'Tijdelijk in Den Haag.', startDay: '2019-08-10', startSeason: null },
        { name: 'Stadion Test', note: null, startDay: null, startSeason: '2020/21' },
      ],
    })
  })

  it('lets the first line have a start, and one line have no start', () => {
    expect(validateStadiumRows([row()]).errors).toBeUndefined()
    expect(validateStadiumRows([row({ seizoen: '2000/01' })]).errors).toBeUndefined()
    expect(validateStadiumRows([row({ dag: '2000-07-01' }), row({ seizoen: '2001/02' })]).errors).toBeUndefined()
  })

  it('asks for at least one line, and for at most twenty', () => {
    expect(validateStadiumRows([]).errors).toEqual({ regels: expect.stringContaining('minstens één regel') })
    expect(
      validateStadiumRows(
        Array.from({ length: 21 }, (_none, index) =>
          row({ seizoen: `${2000 + index}/${String(1 + index).padStart(2, '0')}` }),
        ),
      ).errors,
    ).toEqual({ regels: 'Een lijst heeft hoogstens 20 regels.' })
  })

  it('asks for a name of 1 to 100 characters of plain text', () => {
    expect(validateStadiumRows([row({ naam: '' })]).errors).toEqual({
      'regel-1-naam': 'Vul de naam van het stadion in.',
    })
    expect(validateStadiumRows([row({ naam: 'a'.repeat(100) })]).errors).toBeUndefined()
    expect(validateStadiumRows([row({ naam: 'a'.repeat(101) })]).errors).toEqual({
      'regel-1-naam': 'Schrijf hoogstens 100 tekens.',
    })
    expect(validateStadiumRows([row({ naam: 'Stadion\u0000' })]).errors).toEqual({
      'regel-1-naam': 'Gebruik alleen gewone tekens.',
    })
  })

  it('counts a character, not a code unit, for the limits', () => {
    expect(validateStadiumRows([row({ naam: '🏟'.repeat(100) })]).errors).toBeUndefined()
    expect(validateStadiumRows([row({ toelichting: 'é'.repeat(200) })]).errors).toBeUndefined()
  })

  it('asks for a note of at most 200 characters of plain text, and turns a line break into a space', () => {
    expect(validateStadiumRows([row({ toelichting: 'a'.repeat(201) })]).errors).toEqual({
      'regel-1-toelichting': 'Schrijf hoogstens 200 tekens.',
    })
    expect(validateStadiumRows([row({ toelichting: 'a‮b' })]).errors).toEqual({
      'regel-1-toelichting': 'Gebruik alleen gewone tekens.',
    })
    expect(validateStadiumRows([row({ toelichting: 'Eerste\nTweede' })]).lines?.[0]?.note).toBe('Eerste Tweede')
  })

  it('keeps a note as text: markup is not removed, it is shown as it is', () => {
    expect(validateStadiumRows([row({ toelichting: '<b>Vet</b>' })]).lines?.[0]?.note).toBe('<b>Vet</b>')
  })

  it('refuses a start that is both a season and a day', () => {
    expect(validateStadiumRows([row(), row({ dag: '2020-01-01', seizoen: '2020/21' })]).errors).toEqual({
      'regel-2-seizoen': 'Vul een seizoen of een dag in, niet allebei.',
    })
  })

  it('refuses a season that is not written as one, or that skips a year', () => {
    for (const seizoen of ['2019-20', '19/20', '2019/2020', '2019/21', '2019/19', '1850/51', 'twintig']) {
      expect(validateStadiumRows([row(), row({ seizoen })]).errors, seizoen).toEqual({
        'regel-2-seizoen': 'Schrijf het seizoen zoals 2019/20.',
      })
    }

    expect(validateStadiumRows([row(), row({ seizoen: '1999/00' })]).errors).toBeUndefined()
  })

  it('refuses a day that does not exist or is not written as one', () => {
    for (const dag of ['2021-02-30', '2021-13-01', '14-02-2021', '2021-2-3', '1850-01-01']) {
      expect(validateStadiumRows([row(), row({ dag })]).errors, dag).toEqual({ 'regel-2-dag': 'Kies een geldige dag.' })
    }

    expect(validateStadiumRows([row(), row({ dag: '2020-02-29' })]).errors).toBeUndefined()
  })

  it('refuses a start that is empty after the first line', () => {
    expect(validateStadiumRows([row(), row()]).errors).toEqual({
      'regel-2-seizoen': 'Vul een seizoen of een dag in. Alleen de eerste naam mag zonder start.',
    })
  })

  it('wants the starts to go up, a season counting as 1 July, also when they are equal', () => {
    const later = 'De start moet na de start van de regel erboven liggen.'

    expect(validateStadiumRows([row({ seizoen: '2019/20' }), row({ seizoen: '2018/19' })]).errors).toEqual({
      'regel-2-seizoen': later,
    })
    expect(validateStadiumRows([row({ seizoen: '2019/20' }), row({ seizoen: '2019/20' })]).errors).toEqual({
      'regel-2-seizoen': later,
    })
    expect(validateStadiumRows([row({ seizoen: '2019/20' }), row({ dag: '2019-07-01' })]).errors).toEqual({
      'regel-2-dag': later,
    })
    expect(validateStadiumRows([row({ seizoen: '2019/20' }), row({ dag: '2019-06-30' })]).errors).toEqual({
      'regel-2-dag': later,
    })
    expect(validateStadiumRows([row({ seizoen: '2019/20' }), row({ dag: '2019-07-02' })]).errors).toBeUndefined()
    expect(validateStadiumRows([row({ dag: '2019-08-10' }), row({ seizoen: '2019/20' })]).errors).toEqual({
      'regel-2-seizoen': later,
    })
    expect(
      validateStadiumRows([row({ dag: '2019-08-10' }), row({ dag: '2020-02-01' }), row({ seizoen: '2020/21' })]).errors,
    ).toBeUndefined()
  })

  it('gives every error, each at its own field', () => {
    expect(
      validateStadiumRows([row({ naam: '' }), row({ seizoen: 'x', toelichting: 'a'.repeat(201) })]).errors,
    ).toEqual({
      'regel-1-naam': 'Vul de naam van het stadion in.',
      'regel-2-seizoen': 'Schrijf het seizoen zoals 2019/20.',
      'regel-2-toelichting': 'Schrijf hoogstens 200 tekens.',
    })
  })
})
