import { describe, expect, it } from 'vitest'

import {
  applyReportButton,
  clearTakenPlayers,
  emptyRow,
  emptySide,
  isUntouchedRow,
  playerChoices,
  readReportButton,
  readReportValues,
  type ReportValues,
  type Row,
  squadChoicesForRow,
} from './report-fields'

const squad = [
  { id: 4, name: 'Luca Oyen', shirtNumber: 9 },
  { id: 5, name: 'Pelle van Amersfoort', shirtNumber: null },
]

const values = (overrides: Partial<ReportValues> = {}): ReportValues => ({
  bron: '',
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
        speler: [player('A'), player('B'), player('C')],
        wissel: [{ ...emptyRow('wissel'), erin: '3', eruit: '2' }],
      },
      zij: { ...emptySide(), doelpunt: [{ ...emptyRow('doelpunt'), assist: 'zij-2', speler: 'wij-3' }] },
    })
    const next = applyReportButton(start, { kind: 'remove', number: 2, row: 'speler', side: 'wij' }).values

    expect(next.wij.speler.map((row) => row.naam)).toEqual(['A', 'C'])
    expect(next.wij.kaart.map((row) => row.speler)).toEqual(['1', '', '2'])
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
