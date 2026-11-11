import { describe, expect, it } from 'vitest'

import type { ReportSquadPlayer } from './report-fields'

import { pasteMaxLines, readPastedReport } from './report-paste'

const squad: ReportSquadPlayer[] = [
  { id: 1, name: 'Tjerk Brandsma', searchTerm: 'Brandsma', shirtNumber: 1 },
  { id: 4, name: 'Joost van Aken', searchTerm: 'van Aken', shirtNumber: 4 },
  { id: 9, name: 'Luca Oyen', searchTerm: 'Oyen', shirtNumber: 9 },
  { id: 10, name: 'Joris Testvoort', searchTerm: 'Testvoort', shirtNumber: 10 },
  { id: 11, name: 'Bas Testvoort', searchTerm: 'Testvoort', shirtNumber: 11 },
  { id: 12, name: 'Gerrit Nepper', searchTerm: 'Nepper', shirtNumber: 12 },
  { id: 20, name: 'Sander Vos', searchTerm: 'Vos', shirtNumber: null },
]

const read = (text: string) => readPastedReport(text, squad)

describe('the headings', () => {
  it('reads every heading of our side, without caring for capitals, a colon or the order', () => {
    const result = read(
      [
        'strafschoppen:',
        '55 gemist 9',
        'KAARTEN',
        '34 geel 4',
        'Doelpunten',
        '12 9',
        'Wissels',
        '60 12 voor 4',
        'bank',
        '12',
        'OPSTELLING',
        '4',
        '9',
      ].join('\n'),
    )

    expect(result.unread).toEqual([])
    expect(result.values.wij.speler.map((row) => [row.rugnummer, row.rol])).toEqual([
      ['12', 'bank'],
      ['4', 'basis'],
      ['9', 'basis'],
    ])
    expect(result.values.wij.strafschop).toHaveLength(1)
    expect(result.values.wij.kaart).toHaveLength(1)
    expect(result.values.wij.doelpunt).toHaveLength(1)
    expect(result.values.wij.wissel).toHaveLength(1)
  })

  it('has the same headings for the opponent under the heading Tegenstander', () => {
    const result = read(
      ['Opstelling', '4', 'Tegenstander', 'Opstelling', '1 Ruud Oefenman', 'Kaarten', '30 rood 1'].join('\n'),
    )

    expect(result.values.wij.speler).toHaveLength(1)
    expect(result.values.zij.speler).toMatchObject([{ naam: 'Ruud Oefenman', rugnummer: '1' }])
    expect(result.values.zij.kaart).toMatchObject([{ minuut: '30', soort: 'rood', speler: '1' }])
    expect(result.values.wij.kaart).toEqual([])
  })

  it('treats a heading that is missing as empty, and gives a side without players the empty rows of a new report', () => {
    const result = read('Tegenstander\nOpstelling\n1 Ruud Oefenman')

    expect(result.values.wij.speler).toHaveLength(11)
    expect(result.values.wij.speler.every((row) => row.keuze === '' && row.naam === '')).toBe(true)
    expect(result.values.wij.wissel).toEqual([])
  })

  it('leaves a line above the first heading unread, with its number and why', () => {
    const result = read('Verslag van de wedstrijd\nOpstelling\n4')

    expect(result.unread).toEqual([
      { line: 1, reason: 'Deze regel staat niet onder een kopje.', text: 'Verslag van de wedstrijd' },
    ])
  })

  it('skips empty lines and comments, and reads both kinds of line ending', () => {
    const result = read('# een opmerking\r\n\r\nOpstelling\r\n# nog een\r\n4\r9')

    expect(result.unread).toEqual([])
    expect(result.values.wij.speler.map((row) => row.rugnummer)).toEqual(['4', '9'])
  })
})

describe('a player of ours', () => {
  it('is found by the number in the squad of the season', () => {
    const result = read('Opstelling\n4')

    expect(result.values.wij.speler[0]).toMatchObject({ keuze: '4', naam: '', rol: 'basis', rugnummer: '4' })
    expect(result.choices).toEqual([])
  })

  it('is found by the whole name when there is no number in the squad, and the number of the text stays', () => {
    const result = read('Opstelling\n30 Sander Vos')

    expect(result.values.wij.speler[0]).toMatchObject({ keuze: '20', rugnummer: '30' })
    expect(result.choices).toEqual([])
  })

  it('is found by the surname, with a prefix and without capitals or accents', () => {
    const result = read('Opstelling\n30 van aken\n31 Bränd')
    const [first, second] = result.values.wij.speler

    expect(first).toMatchObject({ keuze: '4' })
    expect(second).toMatchObject({ keuze: '', naam: 'Bränd' })
  })

  it('takes the number first, and the name only when there is no number in the squad', () => {
    const result = read('Opstelling\n9 Oyen\n4')

    expect(result.values.wij.speler.map((row) => row.keuze)).toEqual(['9', '4'])
  })

  it('is a choice, not a guess, when two players have the same surname', () => {
    const result = read('Opstelling\n40 Testvoort')

    expect(result.values.wij.speler[0]).toMatchObject({ keuze: '', naam: 'Testvoort', rugnummer: '40' })
    expect(result.choices).toEqual([
      {
        line: 2,
        message: 'Regel 2: 40 Testvoort. Kies de speler in het formulier.',
        names: ['Joris Testvoort', 'Bas Testvoort'],
        text: '40 Testvoort',
      },
    ])
  })

  it('is a choice when the number is a player of the squad but the name is nobody of it, and not a pick of the number', () => {
    const result = read('Opstelling\n4 Nieuwe Jongen')

    expect(result.values.wij.speler[0]).toMatchObject({ keuze: '', naam: 'Nieuwe Jongen', rugnummer: '4' })
    expect(result.choices[0]?.names).toEqual(['Joost van Aken'])
  })

  it('takes the number when the name is a part of the name of that player, such as a typing error of the first name', () => {
    expect(read('Opstelling\n4 Aken').values.wij.speler[0]?.keuze).toBe('4')
    expect(read('Opstelling\n4 Joost').values.wij.speler[0]?.keuze).toBe('4')
  })

  it('takes whole words of the name only: a typed name that merely contains the surname is a choice', () => {
    const vos = [{ id: 1, name: 'Sander Vos', searchTerm: 'Vos', shirtNumber: 77 }]

    expect(readPastedReport('Opstelling\n77 Voskuilen', vos).values.wij.speler[0]).toMatchObject({ keuze: '' })
    expect(readPastedReport('Opstelling\n77 Sander', vos).values.wij.speler[0]).toMatchObject({ keuze: '1' })
    expect(readPastedReport('Opstelling\n77 Os', vos).values.wij.speler[0]).toMatchObject({ keuze: '' })
  })

  it('is a choice when the number and the name are two players', () => {
    const result = read('Opstelling\n4 Luca Oyen')

    expect(result.values.wij.speler[0]?.keuze).toBe('')
    expect(result.choices[0]?.names).toEqual(['Joost van Aken', 'Luca Oyen'])
  })

  it('is a choice with no names when the number is not in the squad and no name is given', () => {
    const result = read('Opstelling\n77')

    expect(result.values.wij.speler[0]).toMatchObject({ keuze: '', naam: '', rugnummer: '77' })
    expect(result.choices).toMatchObject([
      {
        line: 2,
        message: 'Regel 2: rugnummer 77 staat niet in de selectie. Kies een speler of Andere speler.',
        names: [],
      },
    ])
  })

  it('keeps the name of a player that is not in the squad, as a choice, and never adds him to it', () => {
    const result = read('Opstelling\n44 Nieuwe Jongen')

    expect(result.values.wij.speler[0]).toMatchObject({ keuze: '', naam: 'Nieuwe Jongen', rugnummer: '44' })
    expect(result.choices[0]?.message).toBe(
      'Regel 2: Nieuwe Jongen staat niet in de selectie. Kies een speler of Andere speler.',
    )
  })

  it('is the captain with (a) behind the name or the number, in the line-up only', () => {
    const result = read('Opstelling\n4 Van Aken (a)\n9 (a)\nBank\n12 (a)')

    expect(result.values.wij.speler.map((row) => row.rol)).toEqual(['aanvoerder', 'aanvoerder'])
    expect(result.unread).toMatchObject([
      { line: 5, reason: 'Een speler op de bank kan in het formulier geen aanvoerder zijn.' },
    ])
  })
})

describe('a player of the opponent', () => {
  it('has a number and a name, with the name as typed', () => {
    const result = read('Tegenstander\nOpstelling\n5 Joop van Voorbeeld (a)\n6')

    expect(result.values.zij.speler).toMatchObject([
      { keuze: '', naam: 'Joop van Voorbeeld', rol: 'aanvoerder', rugnummer: '5' },
    ])
    expect(result.unread).toMatchObject([{ line: 4, reason: 'Een speler van de tegenstander heeft een naam nodig.' }])
  })

  it('makes the opponent complete only with eleven players in the line-up', () => {
    const eleven = Array.from({ length: 11 }, (_, index) => `${index + 1} Speler ${index + 1}`).join('\n')

    expect(read(`Tegenstander\nOpstelling\n${eleven}\nBank\n12 Wissel`).values.tegenstander).toBe('ja')
    expect(read('Tegenstander\nOpstelling\n1 Speler 1').values.tegenstander).toBe('nee')
    expect(read('Opstelling\n4').values.tegenstander).toBe('nee')
  })
})

describe('a line that is not a player', () => {
  it('is not read when it starts with a figure that is no number, a number of 0, or a name that is too long', () => {
    const result = read(`Opstelling\n4x Van Aken\n0 Nul\n5 ${'x'.repeat(101)}`)

    expect(result.unread.map((line) => [line.line, line.reason])).toEqual([
      [2, 'Begin met het rugnummer, zoals "4 Van Aken" of "4 Van Aken (a)", of schrijf alleen de naam.'],
      [3, 'Een rugnummer is een getal van 1 tot en met 99.'],
      [4, 'Een naam heeft hoogstens 100 tekens.'],
    ])
    expect(result.values.wij.speler).toHaveLength(11)
  })

  it('reads a name without a shirt number as a player without one, for both teams', () => {
    const result = read(
      'Opstelling\nVan Aken (a)\nSander Vos\nOnbekend Persoon\nTegenstander\nOpstelling\nRuud Oefenman\nPiet Proef',
    )

    expect(result.unread).toEqual([])
    expect(result.choices).toMatchObject([{ message: expect.stringContaining('Onbekend Persoon') }])
    expect(result.values.wij.speler.map((row) => [row.keuze, row.naam, row.rugnummer, row.rol])).toEqual([
      ['4', '', '', 'aanvoerder'],
      ['20', '', '', 'basis'],
      ['', 'Onbekend Persoon', '', 'basis'],
    ])
    expect(result.values.zij.speler.map((row) => [row.naam, row.rugnummer])).toEqual([
      ['Ruud Oefenman', ''],
      ['Piet Proef', ''],
    ])
  })

  it('points to a player without a shirt number by his name in the other lines', () => {
    const result = read('Tegenstander\nOpstelling\nRuud Oefenman\n7 Piet Proef\nKaarten\n30 rood Ruud Oefenman')

    expect(result.unread).toEqual([])
    expect(result.values.zij.kaart).toMatchObject([{ minuut: '30', soort: 'rood', speler: '1' }])
  })

  it('stops after the most lines, and says so', () => {
    // Every line is another player, since a player is in the report once.
    const lines = ['Opstelling', ...Array.from({ length: pasteMaxLines + 5 }, (_line, index) => `4 Naam ${index}`)]
    const result = read(lines.join('\n'))

    expect(result.values.wij.speler).toHaveLength(pasteMaxLines - 1)
    expect(result.unread).toHaveLength(1)
    expect(result.unread[0]?.reason).toBe(`Er worden hoogstens ${pasteMaxLines} regels gelezen.`)
  })
})

describe('the substitutions', () => {
  const base = 'Opstelling\n4\n9\nBank\n12\n20 Sander Vos\n'

  it('reads the minute, the player who comes on and the player who goes off, by number or by name', () => {
    const result = read(`${base}Wissels\n61 12 voor 4\n90+2 Oyen voor Nepper`)

    expect(result.values.wij.wissel).toMatchObject([
      { erin: '3', eruit: '1', extra: '', minuut: '61' },
      { erin: '2', eruit: '3', extra: '2', minuut: '90' },
    ])
  })

  it('points to the other player by name even when his line only has a number', () => {
    const result = read(`${base}Wissels\n61 Vos voor Van Aken`)

    expect(result.values.wij.wissel).toMatchObject([{ erin: '4', eruit: '1' }])
  })

  it('does not read a substitution of a player who is not in the line-up or on the bench', () => {
    const result = read(`${base}Wissels\n61 99 voor 4\n62 12 voor Onbekend\n63 12`)

    expect(result.unread.map((line) => line.line)).toEqual([8, 9, 10])
    expect(result.values.wij.wissel).toEqual([])
  })

  it('is a choice when a name is two players of the report', () => {
    const result = read('Opstelling\n10\n11\nBank\n12\nWissels\n61 12 voor Testvoort')

    expect(result.values.wij.wissel).toMatchObject([{ erin: '3', eruit: '' }])
    expect(result.choices).toMatchObject([{ names: ['Joris Testvoort', 'Bas Testvoort'] }])
  })

  it('has its own substitutions for the opponent', () => {
    const result = read('Tegenstander\nOpstelling\n5 Een\nBank\n12 Twee\nWissels\n70 12 voor 5')

    expect(result.values.zij.wissel).toMatchObject([{ erin: '2', eruit: '1', minuut: '70' }])
    expect(result.values.wij.wissel).toEqual([])
  })
})

describe('the cards and the penalties', () => {
  const base = 'Opstelling\n4\n9\n'

  it('reads yellow, yellow-red and red, in any case', () => {
    const result = read(`${base}Kaarten\n34 geel 4\n70 Geel-Rood Oyen\n88+3 ROOD 9`)

    expect(result.values.wij.kaart).toMatchObject([
      { extra: '', minuut: '34', soort: 'geel', speler: '1' },
      { minuut: '70', soort: 'geel-rood', speler: '2' },
      { extra: '3', minuut: '88', soort: 'rood', speler: '2' },
    ])
  })

  it('reads a penalty that was missed or stopped', () => {
    const result = read(`${base}Strafschoppen\n55 gemist Oyen\n60 gestopt 4`)

    expect(result.values.wij.strafschop).toMatchObject([
      { minuut: '55', soort: 'strafschop-gemist', speler: '2' },
      { minuut: '60', soort: 'strafschop-gestopt', speler: '1' },
    ])
  })

  it('does not read a card of another colour, or without a player, or of a player who is not there', () => {
    const result = read(`${base}Kaarten\n34 blauw 4\n35 geel\n36 geel Onbekend\nStrafschoppen\n55 raak Oyen`)

    expect(result.unread.map((line) => line.line)).toEqual([5, 6, 7, 9])
  })
})

describe('the goals', () => {
  it('has our goals under our heading, with the scorer and the assist of our side', () => {
    const result = read('Opstelling\n4 Van Aken\n9 Oyen\nDoelpunten\n23 Oyen assist Van Aken\n45+1 Van Aken penalty')

    expect(result.values.wij.doelpunt).toMatchObject([
      { assist: 'wij-1', extra: '', minuut: '23', soort: 'gewoon', speler: 'wij-2' },
      { assist: '', extra: '1', minuut: '45', soort: 'strafschop', speler: 'wij-1' },
    ])
  })

  it('reads strafschop, in any case, and penalty as a penalty', () => {
    for (const word of ['strafschop', 'Strafschop', 'STRAFSCHOP', 'penalty']) {
      const result = read(`Opstelling\n4 Van Aken\nDoelpunten\n45+1 Van Aken ${word}`)

      expect(result.values.wij.doelpunt).toMatchObject([{ minuut: '45', soort: 'strafschop', speler: 'wij-1' }])
      expect(result.unread).toEqual([])
    }
  })

  it('takes the scorer of an own goal from the other side', () => {
    const result = read('Opstelling\n4\nTegenstander\nOpstelling\n3 Verdediger\nDoelpunten\n70 4 eigen doelpunt')
    const own = read('Opstelling\n4\nDoelpunten\n70 Verdediger eigen doelpunt\nTegenstander\nOpstelling\n3 Verdediger')

    // Under the opponent's heading the goal is the opponent's: the scorer of his own goal is
    // ours.
    expect(result.values.zij.doelpunt).toMatchObject([{ soort: 'eigen', speler: 'wij-1' }])
    expect(own.values.wij.doelpunt).toMatchObject([{ soort: 'eigen', speler: 'zij-1' }])
  })

  it('gives a scorer of the opponent a name when the opponent has no line-up in the text', () => {
    const result = read('Opstelling\n4\nTegenstander\nDoelpunten\n10 Een Spits')

    expect(result.values.zij.doelpunt).toMatchObject([{ naam: 'Een Spits', speler: '' }])
    expect(result.unread).toEqual([])
  })

  it('does not read a goal of a player who is not in the line-up when the opponent is complete', () => {
    const eleven = Array.from({ length: 11 }, (_, index) => `${index + 1} Speler ${index + 1}`).join('\n')
    const result = read(`Opstelling\n4\nTegenstander\nOpstelling\n${eleven}\nDoelpunten\n10 Onbekend`)

    expect(result.unread).toMatchObject([
      { reason: 'De speler die scoorde staat niet in de opstelling of op de bank van zijn kant.' },
    ])
    expect(result.values.zij.doelpunt).toEqual([])
  })

  it('does not read a goal of ours without a scorer in the report, and does not read a line that says nothing', () => {
    const result = read('Opstelling\n4\nDoelpunten\n10 Onbekend\nonzin\n12')

    expect(result.unread.map((line) => line.line)).toEqual([4, 5, 6])
  })

  it('is a choice when the scorer or the assist is two players, or the assist is not in the report', () => {
    const result = read('Opstelling\n10\n11\n4\nDoelpunten\n10 4 assist Testvoort\n12 Testvoort\n14 4 assist Onbekend')

    expect(result.values.wij.doelpunt).toMatchObject([
      { assist: '', speler: 'wij-3' },
      { speler: '' },
      { assist: '', speler: 'wij-3' },
    ])
    expect(result.choices).toHaveLength(3)
    expect(result.choices[0]?.names).toEqual(['Joris Testvoort', 'Bas Testvoort'])
    expect(result.choices[2]?.message).toBe(
      'Regel 8: de assist Onbekend staat niet in de opstelling of op de bank. Kies de assist in het formulier.',
    )
  })

  it('reads the added time of a goal', () => {
    const result = read('Opstelling\n4\nDoelpunten\n45+3 4')

    expect(result.values.wij.doelpunt).toMatchObject([{ extra: '3', minuut: '45' }])
  })
})

describe('a minute that nobody knows, written as a question mark', () => {
  const base = 'Opstelling\n4\n9\n'

  it('is read for a goal and a yellow card as an empty minute, and said so', () => {
    const goal = read('Opstelling\n4\nDoelpunten\n? 4')
    const card = read(`${base}Kaarten\n? geel Oyen`)

    expect(goal.values.wij.doelpunt).toMatchObject([{ extra: '', minuut: '' }])
    expect(goal.read.map((line) => line.meaning)).toContain('Doelpunt voor sc Heerenveen zonder minuut: 4')
    expect(card.values.wij.kaart).toMatchObject([{ extra: '', minuut: '', soort: 'geel', speler: '2' }])
    expect(card.read.map((line) => line.meaning)).toContain('geel sc Heerenveen zonder minuut: Oyen')
    expect(goal.unread).toEqual([])
    expect(card.unread).toEqual([])
  })

  it('is left to the rules for a red card, which the form then refuses at its minute', () => {
    const result = read(`${base}Kaarten\n? rood Oyen`)

    expect(result.values.wij.kaart).toMatchObject([{ minuut: '', soort: 'rood' }])
  })

  it('is not read for a substitution or a penalty, which need a minute', () => {
    const result = read(`${base}Wissels\n? 9 voor 4\nStrafschoppen\n? gemist Oyen`)

    expect(result.values.wij.wissel).toEqual([])
    expect(result.values.wij.strafschop).toEqual([])
    expect(result.unread.map((line) => line.reason)).toEqual([
      'Een wissel heeft een minuut nodig.',
      'Een strafschop heeft een minuut nodig.',
    ])
  })

  it('says in the hint that a question mark is for an unknown minute', () => {
    const result = read(`${base}Kaarten\ngeel Oyen`)

    expect(result.unread[0]?.reason).toContain('vraagteken')
  })
})

describe('what was read', () => {
  it('says for every line what it was read as, and keeps the source of the form', () => {
    const result = readPastedReport('Opstelling\n4 Van Aken (a)\nKaarten\n34 geel 4', squad, {
      bron: 'wedstrijdformulier',
    })

    expect(result.read.map((line) => line.meaning)).toEqual([
      'Kopje: opstelling',
      'Opstelling sc Heerenveen: 4 Joost van Aken, aanvoerder',
      'Kopje: kaarten',
      'geel sc Heerenveen in minuut 34: 4',
    ])
    expect(result.values.bron).toBe('wedstrijdformulier')
    expect(result.values.status).toBe('bezig')
  })

  it('does not change what it was given and gives a text of nothing an empty form', () => {
    const result = read('')

    expect(result.read).toEqual([])
    expect(result.unread).toEqual([])
    expect(result.values.wij.speler).toHaveLength(11)
  })

  it('keeps a sentence about a line short, also with a very long name in it', () => {
    const long = 'x'.repeat(5000)
    const result = read(
      `Opstelling\n4\n9\nBank\n12\nDoelpunten\n10 4 assist ${long}\n11 ${long}\nWissels\n12 12 voor ${long}`,
    )

    for (const choice of result.choices) {
      expect(choice.message.length).toBeLessThanOrEqual(300)
    }

    for (const line of result.read) {
      expect(line.meaning.length).toBeLessThanOrEqual(300)
    }

    expect(result.choices.length + result.unread.length).toBeGreaterThan(0)
  })

  it('shows at most 120 characters of a line that was not read', () => {
    const result = read(`Opstelling\n${'x'.repeat(500)}`)

    expect(result.unread[0]?.text).toHaveLength(120)
  })
})

describe('a player who is in the text twice', () => {
  it('is read once, in the line-up or on the bench, and the second place is said not to be read', () => {
    const result = read('Opstelling\n9 Oyen\nBank\n9 Oyen\n12')

    expect(result.values.wij.speler.map((row) => [row.keuze, row.rol])).toEqual([
      ['9', 'basis'],
      ['12', 'bank'],
    ])
    expect(result.unread).toEqual([
      expect.objectContaining({
        line: 4,
        reason: '9 Luca Oyen staat al in de opstelling of op de bank van deze kant.',
      }),
    ])
  })

  it('does the same for a player of the opponent, by his name in any capitals', () => {
    const result = read('Tegenstander\nOpstelling\n7 Sibbing\nBank\n7 SIBBING')

    expect(result.values.zij.speler).toHaveLength(1)
    expect(result.unread).toHaveLength(1)
  })
})

describe('the formation', () => {
  it('reads "Formatie: 4-3-3" for our side, above the first heading and under any heading of it', () => {
    expect(read('Formatie: 4-3-3\nOpstelling\n4').values.formatie.wij).toEqual({ eigen: '', keuze: '4-3-3' })
    expect(read('Opstelling\n4\nFormatie: 4-4-2').values.formatie.wij).toEqual({ eigen: '', keuze: '4-4-2' })
    expect(read('Opstelling\n4\nFormatie: 4-3-3').unread).toEqual([])
  })

  it('reads the formation of the opponent under the heading Tegenstander', () => {
    const result = read('Formatie: 4-3-3\nTegenstander\nFormatie: 5-3-2\nOpstelling\n1 Ruud Oefenman')

    expect(result.values.formatie).toEqual({
      wij: { eigen: '', keuze: '4-3-3' },
      zij: { eigen: '', keuze: '5-3-2' },
    })
  })

  it('takes a formation that is not in the list as Anders with its text, as the form shows it', () => {
    expect(read('Formatie: 4-1-2-1-2').values.formatie.wij).toEqual({ eigen: '4-1-2-1-2', keuze: 'anders' })
  })

  it('does not care for capitals, the colon with or without spaces, or the order', () => {
    expect(read('FORMATIE : 3-4-2-1').values.formatie.wij.keuze).toBe('3-4-2-1')
    expect(read('formatie:4-4-2').values.formatie.wij.keuze).toBe('4-4-2')
  })

  it('says what it read, with the team', () => {
    expect(read('Formatie: 4-3-3\nTegenstander\nFormatie: 4-4-2').read.map((line) => line.meaning)).toEqual([
      'Formatie sc Heerenveen: 4-3-3',
      'Kopje: de tegenstander',
      'Formatie de tegenstander: 4-4-2',
    ])
  })

  it('has a message at the line for a value the rule refuses, and leaves the formation as it was', () => {
    const result = read('Opstelling\n4\nFormatie: 4-3-4\nFormatie: 4 3 3\nFormatie: 4--3-3\nFormatie:')

    expect(result.unread.map((line) => [line.line, line.reason])).toEqual([
      [
        3,
        'Formatie van sc Heerenveen: De getallen van de formatie tellen op tot 11, en het moeten er 10 zijn: de veldspelers zonder de keeper.',
      ],
      [4, 'Formatie van sc Heerenveen: Schrijf de formatie zonder spaties, zoals 4-3-3.'],
      [
        5,
        'Formatie van sc Heerenveen: Zet één koppelteken tussen de getallen, en geen koppelteken aan het begin of einde, zoals 4-3-3.',
      ],
      [6, 'Formatie van sc Heerenveen: Schrijf de formatie erachter, zoals "Formatie: 4-3-3".'],
    ])
    expect(result.values.formatie.wij).toEqual({ eigen: '', keuze: '' })
    expect(result.choices).toEqual([])
  })

  it('has one formation for a side: a second line is not read', () => {
    const result = read('Formatie: 4-3-3\nFormatie: 4-4-2')

    expect(result.values.formatie.wij.keuze).toBe('4-3-3')
    expect(result.unread).toEqual([
      { line: 2, reason: 'sc Heerenveen heeft al een formatie: schrijf er één.', text: 'Formatie: 4-4-2' },
    ])
  })

  it('has no formation without the line', () => {
    expect(read('Opstelling\n4').values.formatie).toEqual({
      wij: { eigen: '', keuze: '' },
      zij: { eigen: '', keuze: '' },
    })
  })

  it('stays out of the lines of a list: a name that starts with Formatie is a player to be read as one', () => {
    const result = read('Opstelling\n4 Formatie Speler')

    expect(result.values.wij.speler[0]).toBeDefined()
    expect(result.values.formatie.wij.keuze).toBe('')
  })
})

describe('a number that two players of the season have (#1076)', () => {
  const twins: ReportSquadPlayer[] = [
    { id: 50, inSquad: false, name: 'Testspeler Vertrokken', searchTerm: 'Vertrokken', shirtNumber: 5 },
    { id: 51, inSquad: true, name: 'Testspeler Huidige', searchTerm: 'Huidige', shirtNumber: 5 },
  ]

  it('chooses the one who is in the squad, as for one hit', () => {
    const result = readPastedReport('Opstelling\n5', twins)

    expect(result.values.wij.speler[0]).toMatchObject({ keuze: '51', rugnummer: '5' })
    expect(result.choices).toEqual([])
  })

  it('chooses him for a name that fits him too, and lets the editor choose for a name that does not', () => {
    expect(readPastedReport('Opstelling\n5 Huidige', twins).values.wij.speler[0]).toMatchObject({ keuze: '51' })

    const other = readPastedReport('Opstelling\n5 Vertrokken', twins)

    expect(other.values.wij.speler[0]).toMatchObject({ keuze: '' })
    expect(other.choices).toHaveLength(1)
  })

  it('lets the editor choose when two players of the squad have the number, or none of them is in it', () => {
    const bothIn = twins.map((player) => ({ ...player, inSquad: true }))
    const bothOut = twins.map((player) => ({ ...player, inSquad: false }))

    for (const squadOfTwo of [bothIn, bothOut]) {
      const result = readPastedReport('Opstelling\n5', squadOfTwo)

      expect(result.values.wij.speler[0]).toMatchObject({ keuze: '' })
      expect(result.choices).toHaveLength(1)
    }
  })
})
