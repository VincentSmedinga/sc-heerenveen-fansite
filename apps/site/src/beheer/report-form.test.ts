import { describe, expect, it } from 'vitest'

import { emptyRow, type ReportValues, type Row } from './report-fields'
import { report as baseReport, goal, squadOf, substitution } from './report-fixtures'
import { checkReportForm, errorOrder, type ReportMatch } from './report-form'

const squad = squadOf(100)
const match: ReportMatch = { extraTime: false, goalsAgainst: 1, goalsFor: 2, opponent: 'N.E.C.', status: 'played' }
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

    it('asks for a name of a player who is not in the squad, and for the number when the squad has none', () => {
      const rows = [...report().wij.speler]

      rows[13] = { ...emptyRow('speler'), keuze: 'andere', rol: 'bank' }
      fails(report({ wij: { speler: rows } }), 'speler-wij-14-naam', /schrijf de naam/u)

      rows[13] = { ...emptyRow('speler'), keuze: 'andere', naam: 'Nieuw', rol: 'bank' }
      fails(report({ wij: { speler: rows } }), 'speler-wij-14-rugnummer', /rugnummer in, een heel getal van 1 tot 99/u)

      rows[13] = { ...emptyRow('speler'), keuze: 'andere', naam: 'Nieuw', rol: 'bank', rugnummer: '0' }
      fails(report({ wij: { speler: rows } }), 'speler-wij-14-rugnummer', /1 tot 99/u)
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
      const checked = checkReportForm(report(), { match: { ...match, status: 'scheduled' }, squad })

      expect(checked.errors.verslag).toBe('Alleen een gespeelde wedstrijd heeft een verslag.')
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
