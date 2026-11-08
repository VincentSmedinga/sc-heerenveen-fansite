import { describe, expect, it } from 'vitest'

import { emptyRow, type ReportValues, type Row } from './report-fields'
import { report as baseReport, goal, squadOf, substitution } from './report-fixtures'
import { checkReportForm, errorOrder, type ReportMatch } from './report-form'

const squad = squadOf(100)
const match: ReportMatch = {
  extraTime: false,
  goalsAgainst: 1,
  goalsFor: 2,
  opponent: 'N.E.C.',
  penaltiesAgainst: null,
  penaltiesFor: null,
  status: 'played',
}
const context = { match, squad }
const report = (overrides: Parameters<typeof baseReport>[1] = {}) => baseReport(squad, overrides)

const sub = substitution

describe('checkReportForm', () => {
  it('stores a report that is right as it is typed, with the events in the order of the clock', () => {
    const checked = checkReportForm(
      report({
        wij: {
          kaart: [
            { ...emptyRow('kaart'), minuut: '70', speler: '3' },
            { ...emptyRow('kaart'), minuut: '20', speler: '4' },
          ],
          wissel: [
            sub({ erin: '12', eruit: '11', minuut: '60' }),
            sub({ erin: '13', eruit: '8', extra: '2', minuut: '45' }),
          ],
        },
      }),
      context,
    )

    expect(checked.errors).toEqual({})
    expect(checked.plan?.status).toBe('klaar')
    expect(checked.plan?.appearances).toHaveLength(14)
    expect(checked.plan?.appearances[0]).toMatchObject({
      captain: true,
      ours: true,
      shirtNumber: 1,
      squadId: 100,
      starter: true,
    })
    expect(checked.plan?.appearances[11]).toMatchObject({ starter: false })
    expect(checked.plan?.cards.map((card) => card.minute)).toEqual([20, 70])
    expect(checked.plan?.substitutions.map((substitution) => substitution.minute)).toEqual([45, 60])
    expect(checked.plan?.goals.map((goalOf) => [goalOf.ours, goalOf.name, goalOf.appearance, goalOf.assist])).toEqual([
      [true, 'Speler 9', 8, null],
      [false, 'Sibbing', null, null],
      [true, 'Speler 10', 9, 8],
    ])
  })

  it('leaves out the rows that nobody touched, and keeps the numbers of the rows for the errors', () => {
    const rows = [...report().wij.speler, emptyRow('speler'), { ...emptyRow('speler'), rugnummer: '77' }]
    const checked = checkReportForm(report({ wij: { speler: rows } }), context)

    expect(checked.plan).toBeUndefined()
    expect(checked.errors['speler-wij-16-keuze']).toBe(
      'Speler 16 van sc Heerenveen: kies een speler uit de selectie of Andere speler.',
    )
    expect(checked.errors['speler-wij-15-keuze']).toBeUndefined()
  })

  describe('what the form can not make sense of', () => {
    const fails = (values: ReportValues, id: string, message: RegExp) => {
      const checked = checkReportForm(values, context)

      expect(checked.plan).toBeUndefined()
      expect(checked.errors[id]).toMatch(message)
    }

    it('asks for a name of a player who is not in the squad, and for a number only when it is wrong', () => {
      const rows = [...report().wij.speler]

      rows[13] = { ...emptyRow('speler'), keuze: 'andere', rol: 'bank' }
      fails(report({ wij: { speler: rows } }), 'speler-wij-14-naam', /schrijf de naam/u)

      rows[13] = { ...emptyRow('speler'), keuze: 'andere', naam: 'Nieuw', rol: 'bank', rugnummer: 'x' }
      fails(
        report({ wij: { speler: rows } }),
        'speler-wij-14-rugnummer',
        /leeg, of schrijf een heel getal van 1 tot 99/u,
      )

      rows[13] = { ...emptyRow('speler'), keuze: 'andere', naam: 'Nieuw', rol: 'bank', rugnummer: '0' }
      fails(report({ wij: { speler: rows } }), 'speler-wij-14-rugnummer', /1 tot 99/u)
    })

    it('stores a player without a shirt number as empty, also several in a team', () => {
      const rows = [...report().wij.speler]

      rows[13] = { ...emptyRow('speler'), keuze: 'andere', naam: 'Zonder Een', rol: 'bank' }
      rows[14] = { ...emptyRow('speler'), keuze: 'andere', naam: 'Zonder Twee', rol: 'bank' }

      const opponent = [
        { ...emptyRow('speler'), naam: 'Tegen Een', rol: 'basis' },
        { ...emptyRow('speler'), naam: 'Tegen Twee', rol: 'bank' },
      ]
      const checked = checkReportForm(report({ wij: { speler: rows }, zij: { speler: opponent } }), context)

      expect(checked.errors).toEqual({})
      expect(
        checked.plan?.appearances.filter((player) => player.shirtNumber === null).map((player) => player.name),
      ).toEqual(['Zonder Een', 'Zonder Twee', 'Tegen Een', 'Tegen Twee'])
    })

    it('still finds a number twice in a team that also has players without one', () => {
      const rows = [...report().wij.speler]

      rows[13] = { ...emptyRow('speler'), keuze: 'andere', naam: 'Zonder Een', rol: 'bank' }
      rows[14] = { ...emptyRow('speler'), keuze: 'andere', naam: 'Dubbel', rol: 'bank', rugnummer: '1' }
      const checked = checkReportForm(report({ wij: { speler: rows } }), context)

      expect(checked.plan).toBeUndefined()
      expect(checked.errors['speler-wij-15-rugnummer']).toMatch(/Rugnummer 1 staat twee keer/u)
    })

    it('does not take the same player of ours twice, not even by his name', () => {
      const rows = [...report().wij.speler]

      rows[13] = { ...emptyRow('speler'), keuze: 'andere', naam: 'speler 3', rol: 'bank', rugnummer: '40' }
      fails(report({ wij: { speler: rows } }), 'speler-wij-14-naam', /staat al in het verslag, bij Speler 3/u)
    })

    it('does not take a player of ours in the line-up and on the bench, or twice on the bench', () => {
      const rows = [...report().wij.speler]

      // Number 3 is in the line-up; a place on the bench takes him again.
      rows[13] = { ...rows[2]!, rol: 'bank' }
      fails(report({ wij: { speler: rows } }), 'speler-wij-14-keuze', /Speler 3 staat al in het verslag, bij Speler 3/u)

      // Number 12 is on the bench; a second place on the bench takes him again.
      rows[13] = { ...rows[11]! }
      fails(
        report({ wij: { speler: rows } }),
        'speler-wij-14-keuze',
        /Speler 12 staat al in het verslag, bij Speler 12/u,
      )
    })

    it('does not take a player of the opponent in the line-up and on the bench, also by a name in other capitals', () => {
      const opponent = (naam: string, rugnummer: string, rol: string): Row => ({
        ...emptyRow('speler'),
        naam,
        rol,
        rugnummer,
      })

      fails(
        report({ zij: { speler: [opponent('Sibbing', '7', 'basis'), opponent('SIBBING', '8', 'bank')] } }),
        'speler-zij-2-naam',
        /SIBBING staat al in het verslag, bij Speler 1/u,
      )
    })

    it('asks for a name of a player of the opponent', () => {
      fails(
        report({ zij: { speler: [{ ...emptyRow('speler'), rugnummer: '4' }] } }),
        'speler-zij-1-naam',
        /schrijf de naam/u,
      )
    })

    it('wants a minute from 1 to 120 and added time only after the end of a half', () => {
      fails(
        report({ wij: { wissel: [sub({ erin: '12', eruit: '11', minuut: '0' })] } }),
        'wissel-wij-1-minuut',
        /minuut in, van 1 tot 120/u,
      )
      fails(
        report({ wij: { wissel: [sub({ erin: '12', eruit: '11', minuut: '121' })] } }),
        'wissel-wij-1-minuut',
        /1 tot 120/u,
      )
      fails(
        report({ wij: { wissel: [sub({ erin: '12', eruit: '11', extra: '2', minuut: '60' })] } }),
        'wissel-wij-1-extra',
        /einde van een helft/u,
      )
      fails(
        report({ wij: { wissel: [sub({ erin: '12', eruit: '11', extra: '16', minuut: '45' })] } }),
        'wissel-wij-1-extra',
        /1 tot 15 minuten/u,
      )
    })

    it('stores a goal and a yellow card without a minute as empty, after the events with a minute', () => {
      const checked = checkReportForm(
        report({
          wij: {
            doelpunt: [
              goal({ minuut: '', speler: 'wij-9' }),
              goal({ assist: 'wij-9', minuut: '77', speler: 'wij-10' }),
            ],
            kaart: [
              { ...emptyRow('kaart'), minuut: '', speler: '3' },
              { ...emptyRow('kaart'), minuut: '20', speler: '4' },
            ],
          },
        }),
        context,
      )

      expect(checked.errors).toEqual({})
      expect(checked.plan?.goals.map((one) => [one.ours, one.minute, one.stoppageMinutes])).toEqual([
        [false, 40, null],
        [true, 77, null],
        [true, null, null],
      ])
      expect(checked.plan?.cards.map((card) => [card.appearance, card.minute])).toEqual([
        [3, 20],
        [2, null],
      ])
    })

    it('wants a minute for a red card and a yellow-red card, and says so at the minute', () => {
      const red = report({ wij: { kaart: [{ ...emptyRow('kaart'), minuut: '', soort: 'rood', speler: '3' }] } })
      const yellowRed = report({
        wij: {
          kaart: [
            { ...emptyRow('kaart'), minuut: '', soort: 'geel', speler: '3' },
            { ...emptyRow('kaart'), minuut: '', soort: 'geel-rood', speler: '3' },
          ],
        },
      })

      fails(red, 'kaart-wij-1-minuut', /rode kaart heeft een minuut nodig/u)
      fails(yellowRed, 'kaart-wij-2-minuut', /geel-rode kaart heeft een minuut nodig/u)
    })

    it('wants a minute for a substitution and a missed penalty', () => {
      fails(
        report({ wij: { wissel: [sub({ erin: '12', eruit: '11', minuut: '' })] } }),
        'wissel-wij-1-minuut',
        /minuut in, van 1 tot 120/u,
      )
      fails(
        report({ wij: { strafschop: [{ ...emptyRow('strafschop'), minuut: '', speler: '9' }] } }),
        'strafschop-wij-1-minuut',
        /minuut in, van 1 tot 120/u,
      )
    })

    it('wants a minute for added time of a goal', () => {
      fails(
        report({ wij: { doelpunt: [goal({ extra: '2', minuut: '', speler: 'wij-9' })] } }),
        'doelpunt-wij-1-extra',
        /Blessuretijd hoort bij een minuut/u,
      )
    })

    it('wants players for a substitution, a card and a penalty, who are in the report', () => {
      fails(
        report({ wij: { wissel: [sub({ erin: '12', minuut: '60' })] } }),
        'wissel-wij-1-eruit',
        /kies een speler uit de lijst/u,
      )
      fails(
        report({ wij: { wissel: [sub({ erin: '12', eruit: '30', minuut: '60' })] } }),
        'wissel-wij-1-eruit',
        /in de opstelling of op de bank/u,
      )
      fails(
        report({ wij: { kaart: [{ ...emptyRow('kaart'), minuut: '20' }] } }),
        'kaart-wij-1-speler',
        /kies een speler uit de lijst/u,
      )
      fails(
        report({ wij: { strafschop: [{ ...emptyRow('strafschop'), minuut: '20' }] } }),
        'strafschop-wij-1-speler',
        /kies een speler uit de lijst/u,
      )
    })

    it('does not give a player the same card twice, since a player has each kind once', () => {
      const cards = [
        { ...emptyRow('kaart'), minuut: '20', speler: '3' },
        { ...emptyRow('kaart'), minuut: '30', speler: '3' },
      ]

      fails(report({ wij: { kaart: cards } }), 'kaart-wij-2-soort', /heeft deze kaart al/u)
    })

    it('asks for the scorer of a goal, as a player or as a name', () => {
      fails(
        report({ zij: { doelpunt: [goal({ minuut: '40' })] } }),
        'doelpunt-zij-1-speler',
        /schrijf zijn naam bij Andere naam/u,
      )
      fails(
        report({ wij: { doelpunt: [goal({ minuut: '12', speler: 'wij-30' })] } }),
        'doelpunt-wij-1-speler',
        /in de opstelling of op de bank/u,
      )
    })

    it('puts the errors of the form of a report in the order of the form', () => {
      const values = report({ wij: { wissel: [sub({ minuut: '0' })] } })

      expect(errorOrder(values).slice(0, 4)).toEqual(['verslag', 'bron', 'status', 'tegenstander'])
      expect(errorOrder(values).indexOf('wissel-wij-1-eruit')).toBeGreaterThan(
        errorOrder(values).indexOf('speler-wij-14-rol'),
      )
    })

    it('checks the status, the opponent and the source', () => {
      const checked = checkReportForm({ ...report(), bron: 'x'.repeat(101), status: 'af', tegenstander: '' }, context)

      expect(Object.keys(checked.errors)).toEqual(['status', 'tegenstander', 'bron'])
    })
  })

  describe('what the rules of the report say', () => {
    const says = (values: ReportValues, id: string, message: RegExp) => {
      const checked = checkReportForm(values, context)

      expect(checked.errors[id]).toMatch(message)

      return checked
    }

    it('tells a line-up that is not eleven, at the list', () => {
      const checked = says(
        report({ wij: { speler: report().wij.speler.slice(0, 10) } }),
        'speler-wij',
        /De opstelling van sc Heerenveen heeft 10 spelers/u,
      )

      // Only the structure of the report must be right to store it, so a report that is
      // `bezig` can be saved like this.
      expect(checked.plan).toBeDefined()
    })

    it('tells a captain who is there twice, at the role of the second', () => {
      const rows = report().wij.speler.map((row, index) => (index === 1 ? { ...row, rol: 'aanvoerder' } : row))
      const checked = says(report({ wij: { speler: rows } }), 'speler-wij-2-rol', /2 aanvoerders/u)

      expect(checked.plan).toBeDefined()
    })

    it('does not store two players of a team with the same shirt number, since the database has it once', () => {
      const rows = report().wij.speler.map((row, index) => (index === 1 ? { ...row, rugnummer: '1' } : row))
      const checked = says(report({ wij: { speler: rows } }), 'speler-wij-2-rugnummer', /Rugnummer 1 staat twee keer/u)

      expect(checked.plan).toBeUndefined()
    })

    it('tells a substitution of a player who is not on the pitch, at the field of that player', () => {
      says(
        report({ wij: { wissel: [sub({ erin: '13', eruit: '12', minuut: '60' })] } }),
        'wissel-wij-1-eruit',
        /Wissel 1 van sc Heerenveen: Speler 12 gaat eruit in minuut 60, maar staat dan niet op het veld/u,
      )
      says(
        report({ wij: { wissel: [sub({ erin: '2', eruit: '11', minuut: '60' })] } }),
        'wissel-wij-1-erin',
        /Speler 2 komt binnen in minuut 60, maar zat niet op de bank/u,
      )
    })

    it('does not store a player who goes off or comes on twice', () => {
      const twice = [sub({ erin: '12', eruit: '11', minuut: '60' }), sub({ erin: '13', eruit: '11', minuut: '70' })]
      const checked = says(report({ wij: { wissel: twice } }), 'wissel-wij-2-eruit', /gaat twee keer eruit/u)

      expect(checked.plan).toBeUndefined()
    })

    it('tells a card for a player who has left, and a yellow-red card without a yellow one', () => {
      const left = [sub({ erin: '12', eruit: '11', minuut: '60' })]

      says(
        report({ wij: { kaart: [{ ...emptyRow('kaart'), minuut: '70', speler: '11' }], wissel: left } }),
        'kaart-wij-1-speler',
        /krijgt een kaart in minuut 70, maar is dan al van het veld/u,
      )

      says(
        report({ wij: { kaart: [{ ...emptyRow('kaart'), minuut: '30', soort: 'geel-rood', speler: '3' }] } }),
        'kaart-wij-1-soort',
        /geel-rood zonder precies één gele kaart eerder/u,
      )
    })

    it('tells a penalty of a player who is not on the pitch', () => {
      says(
        report({ wij: { strafschop: [{ ...emptyRow('strafschop'), minuut: '20', speler: '12' }] } }),
        'strafschop-wij-1-speler',
        /neemt een strafschop in minuut 20, maar staat dan niet op het veld/u,
      )
    })

    it('tells a goal of ours without a player, and a scorer of the wrong team', () => {
      says(
        report({
          wij: { doelpunt: [goal({ minuut: '12', naam: 'Iemand' }), goal({ minuut: '77', speler: 'wij-10' })] },
        }),
        'doelpunt-wij-1-speler',
        /Het doelpunt in minuut 12 heeft geen speler die scoorde/u,
      )
      says(
        report({
          zij: { doelpunt: [goal({ minuut: '40', speler: 'wij-9' })] },
        }),
        'doelpunt-zij-1-speler',
        /Speler 9 is van sc Heerenveen, maar het doelpunt is van de tegenstander/u,
      )
    })

    it('tells an assist that goes wrong, at the field of the assist', () => {
      says(
        report({
          wij: {
            doelpunt: [
              goal({ assist: 'wij-9', minuut: '12', speler: 'wij-9' }),
              goal({ minuut: '77', speler: 'wij-10' }),
            ],
          },
        }),
        'doelpunt-wij-1-assist',
        /geeft de assist op zijn eigen doelpunt/u,
      )
      says(
        report({
          wij: {
            doelpunt: [
              goal({ assist: 'wij-9', minuut: '12', soort: 'strafschop', speler: 'wij-10' }),
              goal({ minuut: '77', speler: 'wij-10' }),
            ],
          },
        }),
        'doelpunt-wij-1-assist',
        /Een strafschop heeft geen assist/u,
      )
    })

    it('tells an own goal of a player of the team that gets the goal, at the field of the scorer', () => {
      says(
        report({
          wij: {
            doelpunt: [
              goal({ minuut: '12', soort: 'eigen', speler: 'wij-9' }),
              goal({ minuut: '77', speler: 'wij-10' }),
            ],
          },
        }),
        'doelpunt-wij-1-speler',
        /Speler 9 maakt een eigen doelpunt, maar is van sc Heerenveen, het team dat het doelpunt krijgt/u,
      )
    })

    it('tells an assist from the other team, and an assist from a player who is not on the pitch', () => {
      const opponents = Array.from({ length: 2 }, (_nothing, index) => ({
        ...emptyRow('speler'),
        naam: `Tegenstander ${index + 1}`,
        rugnummer: String(index + 1),
      }))

      says(
        report({
          wij: {
            doelpunt: [
              goal({ assist: 'zij-1', minuut: '12', speler: 'wij-9' }),
              goal({ minuut: '77', speler: 'wij-10' }),
            ],
          },
          zij: { doelpunt: [goal({ minuut: '40', naam: 'Sibbing' })], speler: opponents },
        }),
        'doelpunt-wij-1-assist',
        /Tegenstander 1 geeft een assist aan Speler 9, maar is van het andere team/u,
      )
      says(
        report({
          wij: {
            doelpunt: [
              goal({ assist: 'wij-12', minuut: '12', speler: 'wij-9' }),
              goal({ minuut: '77', speler: 'wij-10' }),
            ],
          },
        }),
        'doelpunt-wij-1-assist',
        /Speler 12 geeft een assist in minuut 12, maar staat dan niet op het veld/u,
      )
    })

    it('does not store a player who comes on twice', () => {
      const twice = [sub({ erin: '12', eruit: '10', minuut: '60' }), sub({ erin: '12', eruit: '11', minuut: '70' })]
      const checked = says(report({ wij: { wissel: twice } }), 'wissel-wij-2-erin', /komt twee keer binnen/u)

      expect(checked.plan).toBeUndefined()
    })

    it('tells goals that do not add up to the score, at the list of goals of sc Heerenveen', () => {
      says(
        report({ wij: { doelpunt: [goal({ minuut: '12', speler: 'wij-9' })] } }),
        'doelpunt-wij',
        /De doelpunten geven 1–1 en de uitslag is 2–1/u,
      )
    })

    it('tells a match that was not played', () => {
      const checked = checkReportForm(report(), { match: { ...match, status: 'postponed' }, squad })

      expect(checked.errors.verslag).toBe('Alleen een gespeelde wedstrijd heeft een verslag.')
    })

    it('tells a report of a match that is still being played to stay bezig until the match is over', () => {
      const live = { ...match, goalsAgainst: null, goalsFor: null, status: 'scheduled' as const }
      const klaar = checkReportForm(report(), { match: live, squad })
      const bezig = checkReportForm({ ...report(), status: 'bezig' }, { match: live, squad })

      expect(klaar.errors.verslag).toContain('De wedstrijd is nog niet afgelopen')
      expect(bezig.errors).toEqual({})
      expect(bezig.plan?.status).toBe('bezig')
    })

    it('tells a side of the opponent that is complete but not right, with a line-up of its own', () => {
      const eleven = Array.from({ length: 10 }, (_nothing, index) => ({
        ...emptyRow('speler'),
        naam: `Tegenstander ${index + 1}`,
        rugnummer: String(index + 1),
      }))
      const checked = checkReportForm({ ...report({ zij: { speler: eleven } }), tegenstander: 'ja' }, context)

      expect(checked.errors['speler-zij']).toMatch(/De opstelling van de tegenstander heeft 10 spelers/u)
      expect(checked.errors['doelpunt-zij-1-speler']).toMatch(/geen speler die scoorde/u)
    })

    it('puts the warnings at the list, and they do not stop a report from being klaar', () => {
      const short = checkReportForm(report({ wij: { speler: report().wij.speler.slice(0, 13) } }), context)

      expect(short.errors).toEqual({})
      expect(short.warnings['speler-wij']).toEqual([
        expect.stringContaining('De bank van sc Heerenveen heeft 2 spelers'),
      ])
    })

    it('warns about more than five substitutions in regular time', () => {
      const many = Array.from({ length: 6 }, (_nothing, index) =>
        sub({ erin: String(index + 7), eruit: String(index + 6), minuut: String(50 + index) }),
      )
      const checked = checkReportForm(report({ wij: { wissel: many } }), context)

      expect(checked.warnings['wissel-wij']).toEqual([expect.stringContaining('wisselt 6 keer')])
    })
  })
})

describe('checkReportForm for the formations', () => {
  const withFormations = (wij: { eigen?: string; keuze: string }, zij = { eigen: '', keuze: '' }) => ({
    ...report(),
    formatie: { wij: { eigen: '', ...wij }, zij },
  })

  it('has no formation when none is chosen, which a report may do', () => {
    const checked = checkReportForm(report(), context)

    expect(checked.errors).toEqual({})
    expect(checked.plan?.formations).toEqual({ opponent: null, ours: null })
  })

  it('stores a formation from the list for each team', () => {
    const checked = checkReportForm(withFormations({ keuze: '4-3-3' }, { eigen: '', keuze: '5-3-2' }), context)

    expect(checked.errors).toEqual({})
    expect(checked.plan?.formations).toEqual({ opponent: '5-3-2', ours: '4-3-3' })
  })

  it('stores a formation of his own that the rule accepts, from the text with the choice Anders', () => {
    const checked = checkReportForm(withFormations({ eigen: '4-1-2-1-2', keuze: 'anders' }), context)

    expect(checked.errors).toEqual({})
    expect(checked.plan?.formations.ours).toBe('4-1-2-1-2')
  })

  it.each([
    ['4-3-4', 'tellen op tot 11'],
    ['4--3-3', 'één koppelteken'],
    ['4-3-3-', 'één koppelteken'],
    ['4 3 3', 'zonder spaties'],
    ['vier', 'getallen met een koppelteken'],
  ])('refuses the formation of his own %s, at the text field, with the team in the sentence', (eigen, words) => {
    const checked = checkReportForm(withFormations({ keuze: '4-3-3' }, { eigen, keuze: 'anders' }), context)

    expect(checked.plan).toBeUndefined()
    expect(checked.errors['formatie-zij-eigen']).toContain('Formatie van de tegenstander: ')
    expect(checked.errors['formatie-zij-eigen']).toContain(words)
  })

  it('asks for the formation when Anders is chosen and the text is empty', () => {
    const checked = checkReportForm(withFormations({ eigen: '', keuze: 'anders' }), context)

    expect(checked.errors['formatie-wij-eigen']).toBe('Formatie van sc Heerenveen: Schrijf de formatie, zoals 4-3-3.')
    expect(checked.plan).toBeUndefined()
  })

  it('only counts the text with the choice Anders: with a formation from the list or none it is left alone', () => {
    const listed = checkReportForm(withFormations({ eigen: '9-9-9', keuze: '4-3-3' }), context)
    const none = checkReportForm(withFormations({ eigen: '9-9-9', keuze: '' }), context)

    expect(listed.errors).toEqual({})
    expect(listed.plan?.formations.ours).toBe('4-3-3')
    expect(none.errors).toEqual({})
    expect(none.plan?.formations.ours).toBeNull()
  })

  it('refuses a choice that is not in the list', () => {
    const checked = checkReportForm(withFormations({ keuze: '4-3-4' }), context)

    expect(checked.errors['formatie-wij']).toBe(
      'Formatie van sc Heerenveen: Kies een formatie uit de lijst, Anders, of niets.',
    )
  })

  it('does not let a report that is bezig have a formation that can not be stored', () => {
    const checked = checkReportForm(
      { ...withFormations({ eigen: '4-3-4', keuze: 'anders' }), status: 'bezig' },
      context,
    )

    expect(checked.plan).toBeUndefined()
  })

  it('puts the formation fields in the order of the page, before the lists of their team', () => {
    const order = errorOrder(report())

    expect(order.indexOf('formatie-wij')).toBeLessThan(order.indexOf('formatie-wij-eigen'))
    expect(order.indexOf('formatie-wij-eigen')).toBeLessThan(order.indexOf('speler-wij'))
    expect(order.indexOf('formatie-zij')).toBeGreaterThan(order.indexOf('kaart-wij'))
  })
})

describe('checkReportForm for the shoot-out', () => {
  const cup: ReportMatch = {
    ...match,
    extraTime: true,
    goalsAgainst: 2,
    goalsFor: 2,
    penaltiesAgainst: 3,
    penaltiesFor: 4,
  }
  const kick = (fields: Row): Row => ({ ...emptyRow('serie'), ...fields })

  /** The squad has the ids from 100, so the rows of the line-up are 1 to 14. */
  const series = (): ReportValues => {
    const values = report({
      zij: { doelpunt: [goal({ minuut: '40', naam: 'Sibbing' }), goal({ minuut: '100', naam: 'Sibbing' })] },
    })

    values.wij.serie = [
      kick({ speler: '9', uitkomst: 'raak' }),
      kick({ speler: '10', uitkomst: 'raak' }),
      kick({ speler: '8', uitkomst: 'naast' }),
      kick({ speler: '7', uitkomst: 'raak' }),
      kick({ speler: '6', uitkomst: 'raak' }),
    ]
    values.zij.serie = ['raak', 'raak', 'naast', 'gestopt', 'raak'].map((uitkomst) => kick({ uitkomst }))

    return values
  }
  const check = (values: ReportValues, of: ReportMatch = cup) => checkReportForm(values, { match: of, squad })
  const says = (values: ReportValues, id: string, message: RegExp, of: ReportMatch = cup) => {
    const checked = check(values, of)

    expect(checked.errors[id], id).toMatch(message)

    return checked
  }

  it('stores the kicks with their round, which follows the order of the rows of a team', () => {
    const checked = check(series())

    expect(checked.errors).toEqual({})
    expect(
      checked.plan?.shootout.filter((item) => item.ours).map((item) => [item.round, item.appearance, item.outcome]),
    ).toEqual([
      [1, 8, 'raak'],
      [2, 9, 'raak'],
      [3, 7, 'naast'],
      [4, 6, 'raak'],
      [5, 5, 'raak'],
    ])
    expect(checked.plan?.shootout.filter((item) => !item.ours).map((item) => [item.round, item.appearance])).toEqual([
      [1, null],
      [2, null],
      [3, null],
      [4, null],
      [5, null],
    ])
  })

  it('leaves out the rows nobody touched, so the rounds do not skip, and a match without kicks is right', () => {
    const values = series()

    values.wij.serie = [kick({}), ...values.wij.serie.slice(0, 1), kick({}), ...values.wij.serie.slice(1)]
    values.zij.serie = values.zij.serie.map((row) => row)

    const checked = check(values)

    expect(checked.errors).toEqual({})
    expect(checked.plan?.shootout.filter((item) => item.ours).map((item) => item.round)).toEqual([1, 2, 3, 4, 5])
    expect(
      check({ ...series(), wij: { ...series().wij, serie: [] }, zij: { ...series().zij, serie: [] } }).errors,
    ).toEqual({})
  })

  it('says a series needs the result of the shoot-out of the match, at the list of sc Heerenveen', () => {
    const checked = says(series(), 'serie-wij', /geen uitslag van de serie/u, {
      ...cup,
      penaltiesAgainst: null,
      penaltiesFor: null,
    })

    expect(checked.plan).toBeDefined()
  })

  it('says the kicks that went in must add up to the result, at the list of the team they are wrong for', () => {
    says(series(), 'serie-wij', /sc Heerenveen geven 4 raak en de uitslag van de serie is 5–3/u, {
      ...cup,
      penaltiesFor: 5,
    })

    const checked = says(series(), 'serie-zij', /De schoten van N\.E\.C\.|de tegenstander geven 3 raak/u, {
      ...cup,
      penaltiesAgainst: 2,
    })

    expect(checked.errors['serie-wij']).toBeUndefined()
  })

  it('says the teams may differ by one kick and not more', () => {
    const one = series()

    one.zij.serie.pop()
    expect(check(one, { ...cup, penaltiesAgainst: 2 }).errors).toEqual({})

    const two = series()

    two.zij.serie.splice(3, 2)
    says(two, 'serie-wij', /sc Heerenveen heeft 5 schoten en de tegenstander 3/u, { ...cup, penaltiesAgainst: 2 })
  })

  it('says a player kicks once, at his own kick', () => {
    const values = series()

    values.wij.serie[4] = kick({ speler: '9', uitkomst: 'raak' })

    const checked = says(values, 'serie-wij-5-speler', /Schot 5 van sc Heerenveen: Speler 9 schiet twee keer/u)

    expect(checked.plan).toBeDefined()
  })

  it('says a kick of sc Heerenveen needs a player, and one of the opponent when his side is complete', () => {
    const ours = series()

    ours.wij.serie[1] = kick({ uitkomst: 'raak' })
    says(ours, 'serie-wij-2-speler', /geen speler die schoot/u)

    // A side that is not complete may leave the player out; one that is complete may not.
    expect(check(series()).errors).toEqual({})
    says({ ...series(), tegenstander: 'ja' }, 'serie-zij-1-speler', /geen speler die schoot/u)
  })

  it('says to choose a player of the report, and an outcome', () => {
    const unknown = series()

    unknown.wij.serie[0] = kick({ speler: '30', uitkomst: 'raak' })

    const checked = says(unknown, 'serie-wij-1-speler', /in de opstelling of op de bank/u)

    expect(checked.plan).toBeUndefined()

    const open = series()

    open.zij.serie[2] = kick({ speler: '', uitkomst: '' })
    open.zij.serie[1] = kick({ uitkomst: 'later' })
    says(open, 'serie-zij-2-uitkomst', /kies raak, naast of gestopt/u)
  })

  it('warns about a kicker who was not on the pitch at the end, and still stores the report', () => {
    const values = series()

    values.wij.wissel = [sub({ erin: '12', eruit: '9', minuut: '80' })]

    const checked = check(values)

    expect(checked.errors).toEqual({})
    expect(checked.plan).toBeDefined()
    expect(checked.warnings['serie-wij']).toEqual([
      'Schot 1 van sc Heerenveen: Speler 9 schiet in de strafschoppenserie, maar stond aan het einde van de wedstrijd niet op het veld.',
    ])
  })

  it('refuses more kicks than the database holds for a team', () => {
    const values = series()

    values.zij.serie = Array.from({ length: 51 }, () => kick({ uitkomst: 'naast' }))
    says(values, 'serie-zij-51-speler', /hoogstens 50 schoten per team/u)
  })

  it('puts the lists of the kicks after the missed penalties of their team in the order of the page', () => {
    const order = errorOrder(series())

    expect(order.indexOf('serie-wij')).toBeGreaterThan(order.indexOf('strafschop-wij'))
    expect(order.indexOf('serie-wij-1-uitkomst')).toBeGreaterThan(order.indexOf('serie-wij-1-speler'))
    expect(order.indexOf('serie-wij')).toBeLessThan(order.indexOf('speler-zij'))
  })
})
