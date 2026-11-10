import { describe, expect, it } from 'vitest'

import {
  applyReportButton,
  clearTakenPlayers,
  emptyRow,
  emptySide,
  formationId,
  formationOwnId,
  formationValueOf,
  isEmptyLineUp,
  isUntouchedRow,
  noFormation,
  otherFormation,
  playerChoices,
  playersOnPitch,
  previousLineUpButtonValue,
  readReportButton,
  readReportValues,
  type ReportValues,
  roleChoicesForRow,
  type Row,
  squadChoicesForRow,
} from './report-fields'

const squad = [
  { id: 4, name: 'Luca Oyen', shirtNumber: 9 },
  { id: 5, name: 'Pelle van Amersfoort', shirtNumber: null },
]

const values = (overrides: Partial<ReportValues> = {}): ReportValues => ({
  bron: '',
  formatie: { wij: noFormation(), zij: noFormation() },
  status: 'bezig',
  tegenstander: 'nee',
  wij: emptySide(),
  zij: emptySide(),
  ...overrides,
})

function form(fields: Record<string, string>) {
  const formData = new FormData()

  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value)
  }

  return formData
}

describe('readReportValues', () => {
  it('reads the rows that the request has fields for, in order, so a removed row leaves no gap', () => {
    const read = readReportValues(
      form({
        'speler-wij-1-keuze': '4',
        'speler-wij-1-rol': 'basis',
        'speler-wij-3-keuze': '5',
        'speler-wij-3-rol': 'bank',
        'wissel-zij-2-eruit': '1',
      }),
    )

    expect(read.wij.speler.map((row) => row.keuze)).toEqual(['4', '5'])
    expect(read.wij.speler[1]?.rol).toBe('bank')
    expect(read.zij.wissel).toHaveLength(1)
    expect(read.zij.wissel[0]?.eruit).toBe('1')
  })

  it('trims the text and leaves out what is missing', () => {
    const read = readReportValues(form({ bron: '  wedstrijdformulier ', 'speler-zij-1-naam': ' Sibbing ' }))

    expect(read.bron).toBe('wedstrijdformulier')
    expect(read.zij.speler[0]).toMatchObject({ naam: 'Sibbing', rugnummer: '' })
  })

  it('wipes the name of a player of ours who is chosen from the squad, as the field is hidden', () => {
    const read = readReportValues(
      form({
        'speler-wij-1-keuze': '4',
        'speler-wij-1-naam': 'Oud',
        'speler-wij-2-keuze': 'andere',
        'speler-wij-2-naam': 'Nieuw',
      }),
    )

    expect(read.wij.speler.map((row) => row.naam)).toEqual(['', 'Nieuw'])
  })
})

describe('the kicks of the shoot-out in the form', () => {
  it('reads the rows of the list of each team from the request, with the player and the outcome', () => {
    const read = readReportValues(
      form({
        'serie-wij-1-speler': '3',
        'serie-wij-1-uitkomst': 'raak',
        'serie-wij-2-speler': '',
        'serie-wij-2-uitkomst': 'naast',
        'serie-zij-1-speler': '',
        'serie-zij-1-uitkomst': 'gestopt',
      }),
    )

    expect(read.wij.serie).toEqual([
      { speler: '3', uitkomst: 'raak' },
      { speler: '', uitkomst: 'naast' },
    ])
    expect(read.zij.serie).toEqual([{ speler: '', uitkomst: 'gestopt' }])
  })

  it('has a new row with nothing chosen, so an untouched row is left out of the report', () => {
    expect(emptyRow('serie')).toEqual({ speler: '', uitkomst: '' })
    expect(isUntouchedRow('serie', emptyRow('serie'))).toBe(true)
    expect(isUntouchedRow('serie', { speler: '', uitkomst: 'raak' })).toBe(false)
    expect(applyReportButton(values(), { kind: 'add', row: 'serie', side: 'zij' })).toMatchObject({
      focus: 'serie-zij-1-speler',
      values: { zij: { serie: [{ speler: '', uitkomst: '' }] } },
    })
  })
})

describe('readReportButton', () => {
  it('reads the buttons that add and remove a row of a list of a side', () => {
    expect(readReportButton(form({ knop: 'wissel-zij-toevoegen' }))).toEqual({
      kind: 'add',
      row: 'wissel',
      side: 'zij',
    })
    expect(readReportButton(form({ knop: 'doelpunt-wij-weghalen-12' }))).toEqual({
      kind: 'remove',
      number: 12,
      row: 'doelpunt',
      side: 'wij',
    })
  })

  it('reads the buttons of the list of the kicks of the shoot-out too', () => {
    expect(readReportButton(form({ knop: 'serie-zij-toevoegen' }))).toEqual({ kind: 'add', row: 'serie', side: 'zij' })
    expect(readReportButton(form({ knop: 'serie-wij-weghalen-4' }))).toEqual({
      kind: 'remove',
      number: 4,
      row: 'serie',
      side: 'wij',
    })
  })

  it('takes anything else for a save', () => {
    expect(readReportButton(form({ knop: 'opslaan' }))).toEqual({ kind: 'save' })
    expect(readReportButton(form({ knop: 'wissel-zij-weghalen-x' }))).toEqual({ kind: 'save' })
    expect(readReportButton(new FormData())).toEqual({ kind: 'save' })
  })
})

describe('applyReportButton', () => {
  it('adds an empty row and puts the focus on its first field', () => {
    const next = applyReportButton(values(), { kind: 'add', row: 'kaart', side: 'wij' })

    expect(next.values.wij.kaart).toEqual([emptyRow('kaart')])
    expect(next.focus).toBe('kaart-wij-1-minuut')
  })

  it('removes a row and puts the focus on the row that took its place, or else on the list', () => {
    const rows = [{ minuut: '1' }, { minuut: '2' }, { minuut: '3' }]
    const start = values({ wij: { ...emptySide(), wissel: rows } })

    expect(applyReportButton(start, { kind: 'remove', number: 2, row: 'wissel', side: 'wij' })).toMatchObject({
      focus: 'wissel-wij-2-minuut',
      values: { wij: { wissel: [{ minuut: '1' }, { minuut: '3' }] } },
    })
    expect(applyReportButton(start, { kind: 'remove', number: 3, row: 'wissel', side: 'wij' }).focus).toBe('wissel-wij')
  })

  it('clears what pointed to a removed player and moves the numbers behind him', () => {
    const player = (naam: string): Row => ({ ...emptyRow('speler'), keuze: 'andere', naam, rugnummer: '1' })
    const start = values({
      wij: {
        ...emptySide(),
        doelpunt: [{ ...emptyRow('doelpunt'), assist: 'wij-3', speler: 'wij-2' }],
        kaart: [
          { ...emptyRow('kaart'), speler: '1' },
          { ...emptyRow('kaart'), speler: '2' },
          { ...emptyRow('kaart'), speler: '3' },
        ],
        serie: [
          { ...emptyRow('serie'), speler: '1', uitkomst: 'raak' },
          { ...emptyRow('serie'), speler: '2', uitkomst: 'naast' },
          { ...emptyRow('serie'), speler: '3', uitkomst: 'gestopt' },
        ],
        speler: [player('A'), player('B'), player('C')],
        wissel: [{ ...emptyRow('wissel'), erin: '3', eruit: '2' }],
      },
      zij: { ...emptySide(), doelpunt: [{ ...emptyRow('doelpunt'), assist: 'zij-2', speler: 'wij-3' }] },
    })
    const next = applyReportButton(start, { kind: 'remove', number: 2, row: 'speler', side: 'wij' }).values

    expect(next.wij.speler.map((row) => row.naam)).toEqual(['A', 'C'])
    expect(next.wij.kaart.map((row) => row.speler)).toEqual(['1', '', '2'])
    expect(next.wij.serie.map((row) => row.speler)).toEqual(['1', '', '2'])
    expect(next.wij.wissel[0]).toMatchObject({ erin: '2', eruit: '' })
    expect(next.wij.doelpunt[0]).toMatchObject({ assist: 'wij-2', speler: '' })
    // A player of the other side keeps his number, and a goal of the other side is moved too.
    expect(next.zij.doelpunt[0]).toMatchObject({ assist: 'zij-2', speler: 'wij-2' })
  })
})

describe('playerChoices', () => {
  it('lists the players with a name as number and name, with the number of the squad as default', () => {
    const rows: Row[] = [
      { ...emptyRow('speler'), keuze: '4' },
      { ...emptyRow('speler') },
      { ...emptyRow('speler'), keuze: '5', rugnummer: '21' },
      { ...emptyRow('speler'), keuze: 'andere', naam: 'Invaller' },
    ]
    const list = playerChoices(values({ wij: { ...emptySide(), speler: rows } }), 'wij', squad)

    expect(list).toEqual([
      { label: '9 Luca Oyen', value: '1' },
      { label: '21 Pelle van Amersfoort', value: '3' },
      { label: 'Invaller', value: '4' },
    ])
  })

  it('puts the side in front of the number when asked, for a goal', () => {
    const rows: Row[] = [{ ...emptyRow('speler'), naam: 'Sibbing', rugnummer: '7' }]

    expect(playerChoices(values({ zij: { ...emptySide(), speler: rows } }), 'zij', squad, true)).toEqual([
      { label: '7 Sibbing', value: 'zij-1' },
    ])
  })
})

describe('isUntouchedRow', () => {
  it('knows a row that is as a new one has it', () => {
    expect(isUntouchedRow('speler', emptyRow('speler'))).toBe(true)
    expect(isUntouchedRow('doelpunt', emptyRow('doelpunt'))).toBe(true)
    expect(isUntouchedRow('doelpunt', { ...emptyRow('doelpunt'), soort: 'eigen' })).toBe(false)
    expect(isUntouchedRow('speler', { ...emptyRow('speler'), rol: 'bank' })).toBe(false)
  })
})

describe('squadChoicesForRow', () => {
  const players = Array.from({ length: 5 }, (_nothing, index) => ({
    id: index + 1,
    name: `Speler ${index + 1}`,
    shirtNumber: index + 1,
  }))
  const row = (keuze: string, rol = 'basis'): Row => ({ ...emptyRow('speler'), keuze, rol })
  // Two in the line-up (1 and 2), one on the bench (3), and an empty place of each.
  const base = values({
    wij: { ...emptySide(), speler: [row('1'), row('2'), row('3', 'bank'), row(''), row('', 'bank')] },
  })
  const ids = (index: number) => squadChoicesForRow(base, index, players).map((player) => player.id)

  it('gives a place on the bench the players who are not in the line-up and not on the bench', () => {
    expect(ids(4)).toEqual([4, 5])
  })

  it('keeps the player of a place in his own list, also when he is on the bench or in the line-up', () => {
    expect(ids(2)).toEqual([3, 4, 5])
    expect(ids(0)).toEqual([1, 3, 4, 5])
  })

  it('gives a place in the line-up the players who are not in the line-up already, a player of the bench among them', () => {
    expect(ids(3)).toEqual([3, 4, 5])
  })

  it('lets a name that is not in the squad stay out of the way: it takes nobody from the list', () => {
    const other = values({
      wij: { ...emptySide(), speler: [{ ...emptyRow('speler'), keuze: 'andere', naam: 'Nieuw' }, row('')] },
    })

    expect(squadChoicesForRow(other, 1, players)).toHaveLength(5)
  })
})

describe('clearTakenPlayers', () => {
  const row = (keuze: string, rol = 'basis'): Row => ({ ...emptyRow('speler'), keuze, rol })

  it('gives the other places of a player who was chosen, so the bench place of a starter is emptied', () => {
    const found = values({ wij: { ...emptySide(), speler: [row('3'), row('1'), row('3', 'bank')] } })

    expect(clearTakenPlayers(found, 1)).toEqual([3])
    expect(clearTakenPlayers(found, 3)).toEqual([1])
  })

  it('gives nothing for an empty choice or a name that is not in the squad, and for a player who is once there', () => {
    const found = values({ wij: { ...emptySide(), speler: [row(''), row('andere'), row('4'), row('5')] } })

    expect([1, 2, 3, 4].map((chosen) => clearTakenPlayers(found, chosen))).toEqual([[], [], [], []])
    expect(clearTakenPlayers(found, 9)).toEqual([])
  })
})

describe('playerChoices of the bench', () => {
  it('lists only the players with the role Bank, as the choices of a substitute', () => {
    const rows: Row[] = [
      { ...emptyRow('speler'), keuze: 'andere', naam: 'Basis', rol: 'basis' },
      { ...emptyRow('speler'), keuze: 'andere', naam: 'Aanvoerder', rol: 'aanvoerder' },
      { ...emptyRow('speler'), keuze: 'andere', naam: 'Invaller', rol: 'bank' },
    ]
    const list = playerChoices(values({ wij: { ...emptySide(), speler: rows } }), 'wij', [], false, true)

    expect(list).toEqual([{ label: 'Invaller', value: '3' }])
  })
})

describe('the formation in the form', () => {
  it('reads the choice and the text of each team from the request, and trims them', () => {
    const read = readReportValues(
      form({
        'formatie-wij': '4-3-3',
        'formatie-wij-eigen': ' ',
        'formatie-zij': 'anders',
        'formatie-zij-eigen': ' 4-1-2-1-2 ',
      }),
    )

    expect(read.formatie).toEqual({
      wij: { eigen: '', keuze: '4-3-3' },
      zij: { eigen: '4-1-2-1-2', keuze: 'anders' },
    })
  })

  it('has no formation for a request that does not send the fields', () => {
    expect(readReportValues(form({})).formatie).toEqual({
      wij: { eigen: '', keuze: '' },
      zij: { eigen: '', keuze: '' },
    })
  })

  it('shows a stored formation of the list as its choice, and any other as Anders with its text', () => {
    expect(formationValueOf('4-3-3')).toEqual({ eigen: '', keuze: '4-3-3' })
    expect(formationValueOf('4-1-2-1-2')).toEqual({ eigen: '4-1-2-1-2', keuze: otherFormation })
    expect(formationValueOf(null)).toEqual(noFormation())
    expect(formationValueOf('')).toEqual(noFormation())
  })

  it('has the ids of the fields of a side', () => {
    expect([formationId('wij'), formationOwnId('wij'), formationId('zij'), formationOwnId('zij')]).toEqual([
      'formatie-wij',
      'formatie-wij-eigen',
      'formatie-zij',
      'formatie-zij-eigen',
    ])
  })
})

describe('the order of the lists of players', () => {
  const named = (naam: string, rugnummer = ''): Row => ({ ...emptyRow('speler'), keuze: 'andere', naam, rugnummer })

  it('puts the shirt numbers first, then the names, and the players without a number last by name', () => {
    const rows = [named('Zoon', '9'), named('Berg'), named('Aap', '9'), named('Dal', '2'), named('Aal')]
    const list = playerChoices(values({ wij: { ...emptySide(), speler: rows } }), 'wij', [])

    expect(list.map((player) => player.label)).toEqual(['2 Dal', '9 Aap', '9 Zoon', 'Aal', 'Berg'])
  })

  it('keeps the value of a choice the number of its row, with and without the side', () => {
    const rows = [named('Zoon', '9'), named('Dal', '2')]
    const start = values({ wij: { ...emptySide(), speler: rows } })

    expect(playerChoices(start, 'wij', []).map((player) => player.value)).toEqual(['2', '1'])
    expect(playerChoices(start, 'wij', [], true).map((player) => player.value)).toEqual(['wij-2', 'wij-1'])
  })
})

describe('the role of a new row of the players', () => {
  it('is Basis up to row 11 and Bank from row 12, for each team', () => {
    expect(emptyRow('speler', 10).rol).toBe('basis')
    expect(emptyRow('speler', 11).rol).toBe('bank')

    for (const side of ['wij', 'zij'] as const) {
      const eleven = Array.from({ length: 11 }, () => emptyRow('speler'))
      const start = values({ [side]: { ...emptySide(), speler: eleven } })
      const next = applyReportButton(start, { kind: 'add', row: 'speler', side })

      expect(next.values[side].speler[11]?.rol).toBe('bank')
    }
  })

  it('leaves the role of a row that is chosen or stored as it is', () => {
    const rows = [...Array.from({ length: 11 }, () => emptyRow('speler')), { ...emptyRow('speler', 11), rol: 'basis' }]
    const next = applyReportButton(values({ wij: { ...emptySide(), speler: rows } }), {
      kind: 'add',
      row: 'speler',
      side: 'wij',
    })

    expect(next.values.wij.speler[11]?.rol).toBe('basis')
    expect(next.values.wij.speler[12]?.rol).toBe('bank')
  })

  it('counts an empty row of the bench as untouched, and gives it the role of its new place after a removal', () => {
    expect(isUntouchedRow('speler', emptyRow('speler', 11), 11)).toBe(true)
    expect(isUntouchedRow('speler', emptyRow('speler', 11), 3)).toBe(false)

    const rows = Array.from({ length: 12 }, (_row, index) => emptyRow('speler', index))
    const next = applyReportButton(values({ wij: { ...emptySide(), speler: rows } }), {
      kind: 'remove',
      number: 3,
      row: 'speler',
      side: 'wij',
    })

    expect(next.values.wij.speler.map((row) => row.rol)).toEqual(Array(11).fill('basis'))
  })
})

describe('the roles of a row', () => {
  const rows = (...roles: string[]): ReportValues =>
    values({ wij: { ...emptySide(), speler: roles.map((rol) => ({ ...emptyRow('speler'), rol })) } })

  it('leaves out the captain when another player of the team has him', () => {
    const start = rows('basis', 'aanvoerder', 'bank')

    expect(roleChoicesForRow(start, 'wij', 0).map((role) => role.value)).toEqual(['basis', 'bank'])
    expect(roleChoicesForRow(start, 'wij', 2).map((role) => role.value)).toEqual(['basis', 'bank'])
  })

  it('keeps the captain for the player who has him, and gives it back when he gives it up', () => {
    expect(roleChoicesForRow(rows('basis', 'aanvoerder'), 'wij', 1).map((role) => role.value)).toEqual([
      'basis',
      'aanvoerder',
      'bank',
    ])
    expect(roleChoicesForRow(rows('basis', 'basis'), 'wij', 0)).toHaveLength(3)
  })

  it('looks at one team only', () => {
    const start = { ...rows('basis'), zij: { ...emptySide(), speler: [{ ...emptyRow('speler'), rol: 'aanvoerder' }] } }

    expect(roleChoicesForRow(start, 'wij', 0)).toHaveLength(3)
  })
})

describe('playersOnPitch', () => {
  const lineUp = [
    ...Array.from({ length: 11 }, () => ({ ...emptyRow('speler'), keuze: 'andere', naam: 'A' })),
    { ...emptyRow('speler'), keuze: 'andere', naam: 'B', rol: 'bank' },
    { ...emptyRow('speler'), keuze: 'andere', naam: 'C', rol: 'bank' },
  ]
  const at = (minuut: string, extra = '', more: Partial<Row> = {}): Row => ({
    ...emptyRow('wissel'),
    extra,
    minuut,
    ...more,
  })
  const start = (wissel: Row[], kaart: Row[] = []) => values({ wij: { ...emptySide(), kaart, speler: lineUp, wissel } })

  it('is the line-up before any substitution, with the captain and without the bench', () => {
    const rows = lineUp.map((row, index) => (index === 0 ? { ...row, rol: 'aanvoerder' } : row))
    const pitch = playersOnPitch(values({ wij: { ...emptySide(), speler: rows, wissel: [at('60')] } }), 'wij', 0)

    expect([...pitch]).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
  })

  it('adds who came on and takes away who went off in an earlier substitution', () => {
    const pitch = playersOnPitch(start([at('30', '', { erin: '12', eruit: '11' }), at('60')]), 'wij', 1)

    expect(pitch.has('12')).toBe(true)
    expect(pitch.has('11')).toBe(false)
  })

  it('goes by the clock, not by the order of the rows', () => {
    const rows = [at('60'), at('30', '', { erin: '12', eruit: '11' })]

    expect(playersOnPitch(start(rows), 'wij', 0).has('12')).toBe(true)
    expect(playersOnPitch(start(rows), 'wij', 1).has('12')).toBe(false)
  })

  it('goes by the order of the rows at the same moment, and when the minute is still empty', () => {
    const same = [at('45', '1', { erin: '12', eruit: '10' }), at('45', '1')]

    expect(playersOnPitch(start(same), 'wij', 1).has('10')).toBe(false)
    expect(playersOnPitch(start(same), 'wij', 0).has('10')).toBe(true)

    const empty = [at('', '', { erin: '12', eruit: '10' }), at('')]

    expect(playersOnPitch(start(empty), 'wij', 1).has('10')).toBe(false)
    expect(playersOnPitch(start(empty), 'wij', 0).has('10')).toBe(true)
  })

  it('takes away a player with a red or a yellow-red card before the moment, and not one with a yellow card', () => {
    const card = (soort: string, minuut: string, speler: string): Row => ({
      ...emptyRow('kaart'),
      minuut,
      soort,
      speler,
    })
    const cards = [
      card('rood', '20', '3'),
      card('geel-rood', '20', '4'),
      card('geel', '20', '5'),
      card('rood', '70', '6'),
      card('rood', '', '7'),
    ]
    const pitch = playersOnPitch(start([at('60')], cards), 'wij', 0)

    expect(pitch.has('3')).toBe(false)
    expect(pitch.has('4')).toBe(false)
    expect(pitch.has('5')).toBe(true)
    expect(pitch.has('6')).toBe(true)
    expect(pitch.has('7')).toBe(true)
  })
})

describe('the button for the line-up of the previous match', () => {
  const eleven = Array.from({ length: 11 }, (_nothing, index) => emptyRow('speler', index))

  it('is read from the form, and is not a row button', () => {
    expect(previousLineUpButtonValue).toBe('opstelling-vorige')
    expect(readReportButton(form({ knop: 'opstelling-vorige' }))).toEqual({ kind: 'previous' })
  })

  it('sees the line-up as empty with untouched rows only, also on the bench from row 12, and without a formation', () => {
    expect(isEmptyLineUp(values())).toBe(true)
    expect(isEmptyLineUp(values({ wij: { ...emptySide(), speler: [...eleven, emptyRow('speler', 11)] } }))).toBe(true)
  })

  it('does not see it as empty with a row filled in, or a formation of either kind', () => {
    const filled = eleven.map((row, index) => (index === 3 ? { ...row, naam: 'Verzonnen' } : row))

    expect(isEmptyLineUp(values({ wij: { ...emptySide(), speler: filled } }))).toBe(false)
    expect(isEmptyLineUp(values({ formatie: { wij: { eigen: '', keuze: '4-3-3' }, zij: noFormation() } }))).toBe(false)
    expect(isEmptyLineUp(values({ formatie: { wij: { eigen: '4-4-2', keuze: '' }, zij: noFormation() } }))).toBe(false)
  })

  it('looks at our side only', () => {
    const theirs = [{ ...emptyRow('speler'), naam: 'Verzonnen' }]

    expect(isEmptyLineUp(values({ zij: { ...emptySide(), speler: theirs } }))).toBe(true)
  })
})
