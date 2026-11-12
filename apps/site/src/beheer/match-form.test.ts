import { describe, expect, it } from 'vitest'

import type { MatchValues } from './match-fields'

import { emptyFields, emptyGoal } from './match-fields'
import { readButton, readValues, statusChoices, validate, valuesOf } from './match-form'

const squad = [
  { id: 11, name: 'Luca Oyen', personId: 31, wikipediaPage: 'Luca Oyen' },
  // A player the editors added: a person, and no page to find him by.
  { id: 12, name: 'Bernt Klaverboer', personId: 32, wikipediaPage: null },
]
const league = { competition: 'Eredivisie', dataSource: 'wikipedia', opponent: 'N.E.C.', squad } as const
const cup = { ...league, competition: 'KNVB Beker' } as const

/** A played league match won 2-1, with a time, and the reason. */
function filled(overrides: Partial<MatchValues['velden']> = {}, goals: MatchValues['doelpunten'] = []): MatchValues {
  return {
    doelpunten: goals,
    reden: 'Wikipedia is achter',
    velden: {
      ...emptyFields,
      'aftrap-datum': '2026-10-31',
      'aftrap-tijd': '19:45',
      status: 'played',
      'uitslag-wij': '2',
      'uitslag-zij': '1',
      verlenging: 'nee',
      ...overrides,
    },
  }
}

const ours = { ...emptyGoal, kant: 'wij', minuut: '12', speler: '11' }
const theirs = { ...emptyGoal, kant: 'zij', minuut: '40', naam: 'Sibbing' }

describe('the facts', () => {
  it('takes the spectators, the referee, the stadium and the note, and reads empty as none', () => {
    const checked = validate(
      filled({
        opmerking: 'Begon later door file',
        scheidsrechter: 'Bas Nijhuis',
        stadion: 'Abe Lenstra Stadion',
        toeschouwers: '21022',
      }),
      league,
    )

    expect(checked.entry?.facts).toEqual({
      attendance: 21_022,
      note: 'Begon later door file',
      referee: 'Bas Nijhuis',
      stadium: 'Abe Lenstra Stadion',
    })
    expect(validate(filled({ toeschouwers: '0' }), league).entry?.facts.attendance).toBe(0)
  })

  it('has an error at each field that is too long, and at spectators that are not a number', () => {
    const checked = validate(
      filled({
        opmerking: 'x'.repeat(256),
        scheidsrechter: 'x'.repeat(101),
        stadion: 'x'.repeat(151),
        toeschouwers: '150001',
      }),
      league,
    )

    expect(checked.errors).toMatchObject({
      opmerking: 'Schrijf hoogstens 255 tekens.',
      scheidsrechter: 'Schrijf hoogstens 100 tekens.',
      stadion: 'Schrijf hoogstens 150 tekens.',
      toeschouwers: expect.stringContaining('0 tot 150000'),
    })
    expect(validate(filled({ toeschouwers: 'veel' }), league).errors?.toeschouwers).toBeDefined()
  })

  it('has spectators for a played match only, as the database has it', () => {
    const checked = validate(
      filled({ status: 'scheduled', toeschouwers: '500', 'uitslag-wij': '', 'uitslag-zij': '' }),
      league,
    )

    expect(checked.errors?.toeschouwers).toContain('gespeelde wedstrijd')
  })

  it('puts the stored facts in the form', () => {
    const values = valuesOf(
      {
        ...({} as Parameters<typeof valuesOf>[0]),
        attendance: 21_022,
        kickoffAt: null,
        matchDate: '2026-10-31',
        note: null,
        referee: 'Bas Nijhuis',
        stadium: null,
        status: 'played',
      } as Parameters<typeof valuesOf>[0],
      [],
    )

    expect(values.velden).toMatchObject({
      opmerking: '',
      scheidsrechter: 'Bas Nijhuis',
      stadion: '',
      toeschouwers: '21022',
    })
  })
})

describe('validate', () => {
  it('understands a played match: the kick-off in UTC, the result, and no goals', () => {
    const checked = validate(filled(), league)

    expect(checked.errors).toBeUndefined()
    expect(checked.entry).toEqual({
      facts: { attendance: null, note: null, referee: null, stadium: null },
      goals: [],
      kickoff: { dateText: null, kickoffAt: new Date('2026-10-31T18:45:00Z'), matchDate: '2026-10-31' },
      result: {
        afterNinetyAgainst: null,
        afterNinetyFor: null,
        extraTime: false,
        goalsAgainst: 1,
        goalsFor: 2,
        penaltiesAgainst: null,
        penaltiesFor: null,
        status: 'played',
      },
    })
    expect(checked.reason).toBe('Wikipedia is achter')
  })

  it('takes goals that add up to the result, in the order of the clock, and links a player of ours', () => {
    const checked = validate(
      filled({}, [{ ...ours, minuut: '77', speler: '12' }, theirs, { ...ours, extra: '1', minuut: '12' }]),
      league,
    )

    expect(checked.errors).toBeUndefined()
    expect(checked.entry?.goals).toEqual([
      {
        minute: 12,
        ours: true,
        ownGoal: false,
        penalty: false,
        personId: 31,
        player: 'Luca Oyen',
        playerId: 11,
        stoppageMinutes: 1,
        wikipediaPage: 'Luca Oyen',
      },
      {
        minute: 40,
        ours: false,
        ownGoal: false,
        penalty: false,
        personId: null,
        player: 'Sibbing',
        playerId: null,
        stoppageMinutes: null,
        wikipediaPage: null,
      },
      {
        minute: 77,
        ours: true,
        ownGoal: false,
        penalty: false,
        personId: 32,
        player: 'Bernt Klaverboer',
        playerId: 12,
        stoppageMinutes: null,
        wikipediaPage: null,
      },
    ])
  })

  it('accepts a result without goals, and a scheduled, postponed or cancelled match without a result', () => {
    expect(validate(filled({ 'uitslag-wij': '0', 'uitslag-zij': '0' }), league).errors).toBeUndefined()

    for (const status of ['scheduled', 'postponed', 'cancelled']) {
      const checked = validate(filled({ status, 'uitslag-wij': '', 'uitslag-zij': '' }), league)

      expect(checked.errors).toBeUndefined()
      expect(checked.entry?.result).toMatchObject({ goalsAgainst: null, goalsFor: null, status })
    }
  })

  it('offers Geannuleerd as a status, and asks for no goals with it', () => {
    expect(statusChoices).toContainEqual({ label: 'Geannuleerd', value: 'cancelled' })
    expect(
      validate(filled({ status: 'cancelled', 'uitslag-wij': '1', 'uitslag-zij': '0' }), league).errors,
    ).toHaveProperty('uitslag-wij')
  })

  it('asks for the day, a time or a text, and not both', () => {
    expect(validate(filled({ 'aftrap-datum': '' }), league).errors).toHaveProperty('aftrap-datum')
    expect(validate(filled({ 'aftrap-datum': '2026-02-30' }), league).errors).toHaveProperty('aftrap-datum')
    expect(validate(filled({ 'aftrap-tijd': '25:00' }), league).errors).toHaveProperty('aftrap-tijd')
    expect(validate(filled({ 'aftrap-tijd': '' }), league).errors).toHaveProperty('aftrap-tekst')
    expect(validate(filled({ 'aftrap-tekst': 'zaterdag' }), league).errors).toHaveProperty('aftrap-tekst')

    const weekend = validate(filled({ 'aftrap-tekst': '12-14 februari 2027', 'aftrap-tijd': '' }), league)

    expect(weekend.entry?.kickoff).toEqual({
      dateText: '12-14 februari 2027',
      kickoffAt: null,
      matchDate: '2026-10-31',
    })
  })

  it('lets a match of the old fansite have a day without a time, and keeps it so', () => {
    const old = { ...league, dataSource: 'oude-fansite' } as const
    const dayOnly = validate(filled({ 'aftrap-tekst': '', 'aftrap-tijd': '' }), old)

    expect(dayOnly.errors).toBeUndefined()
    expect(dayOnly.entry?.kickoff).toEqual({ dateText: null, kickoffAt: null, matchDate: '2026-10-31' })
    // A time and a text are still not both, and a match from Wikipedia still has one of them.
    expect(validate(filled({ 'aftrap-tekst': 'zaterdag' }), old).errors).toHaveProperty('aftrap-tekst')
    expect(validate(filled({ 'aftrap-tekst': '', 'aftrap-tijd': '' }), league).errors).toHaveProperty('aftrap-tekst')
  })

  it('opens a match without a time with empty fields for the time and the text', () => {
    const values = valuesOf(
      {
        dateText: null,
        goalsAgainst: 0,
        goalsFor: 1,
        kickoffAt: null,
        matchDate: '1995-08-27',
        status: 'played',
      } as never,
      [],
    )

    expect(values.velden['aftrap-tijd']).toBe('')
    expect(values.velden['aftrap-tekst']).toBe('')
  })

  it('refuses what the database refuses: a result of a match that was not played, extra time in the league', () => {
    expect(validate(filled({ status: 'scheduled' }), league).errors).toHaveProperty('uitslag-wij')
    expect(validate(filled({ status: 'bijna' }), league).errors).toHaveProperty('status')
    expect(validate(filled({ 'uitslag-zij': '' }), league).errors).toHaveProperty('uitslag-zij')
    expect(validate(filled({ 'uitslag-zij': '-1' }), league).errors).toHaveProperty('uitslag-zij')
    expect(validate(filled({ verlenging: 'ja' }), league).errors).toHaveProperty('verlenging')
    expect(validate(filled({ verlenging: 'ja' }), cup).errors).toBeUndefined()
    expect(
      validate(filled({ verlenging: 'ja' }), { ...cup, competition: 'Play-offs Europa League' }).errors,
    ).toBeUndefined()
    expect(validate(filled({ 'na90-wij': '1', 'na90-zij': '1' }), league).errors).toHaveProperty('na90-wij')
  })

  it('checks the score after 90 minutes and the penalties, each in a pair and only where they belong', () => {
    const level = { 'uitslag-wij': '1', 'uitslag-zij': '1', verlenging: 'ja' }

    expect(validate(filled({ ...level, 'na90-wij': '0', 'na90-zij': '0' }), cup).errors).toBeUndefined()
    expect(validate(filled({ ...level, 'na90-wij': '0' }), cup).errors).toHaveProperty('na90-zij')
    expect(validate(filled({ ...level, 'na90-wij': '2', 'na90-zij': '0' }), cup).errors).toHaveProperty('na90-wij')
    expect(
      validate(filled({ ...level, 'strafschoppen-wij': '4', 'strafschoppen-zij': '3' }), cup).entry?.result,
    ).toMatchObject({ penaltiesAgainst: 3, penaltiesFor: 4 })
    expect(validate(filled({ ...level, 'strafschoppen-wij': '4' }), cup).errors).toHaveProperty('strafschoppen-zij')
    expect(
      validate(
        filled({ 'strafschoppen-wij': '4', 'strafschoppen-zij': '3', 'uitslag-wij': '2', verlenging: 'ja' }),
        cup,
      ).errors,
    ).toHaveProperty('strafschoppen-wij')
    expect(
      validate(filled({ ...level, 'strafschoppen-wij': '4', 'strafschoppen-zij': '3', verlenging: 'nee' }), cup).errors,
    ).toHaveProperty('strafschoppen-wij')
  })

  it('wants goals that give the result, and says what they gave', () => {
    const checked = validate(filled({}, [ours]), league)

    expect(checked.errors?.doelpunten).toBe(
      'De doelpunten geven 1–0 en de uitslag is 2–1. Pas de doelpunten of de uitslag aan.',
    )
    expect(
      validate(filled({ status: 'scheduled', 'uitslag-wij': '', 'uitslag-zij': '' }, [ours]), league).errors,
    ).toHaveProperty('doelpunten')
  })

  it('names the goal at each field that is wrong', () => {
    const checked = validate(
      filled({ 'uitslag-wij': '3', 'uitslag-zij': '0' }, [
        { ...emptyGoal },
        { ...ours, minuut: '0' },
        { ...ours, extra: '31', minuut: '12', speler: '' },
        { ...theirs, naam: '' },
        { ...ours, extra: '2', minuut: '' },
      ]),
      league,
    )

    expect(checked.errors).toMatchObject({
      'doelpunt-1-kant': expect.stringContaining('doelpunt 1'),
      'doelpunt-2-minuut': expect.stringContaining('doelpunt 2'),
      'doelpunt-3-extra': expect.stringContaining('doelpunt 3'),
      'doelpunt-3-speler': expect.stringContaining('doelpunt 3'),
      'doelpunt-4-naam': expect.stringContaining('doelpunt 4'),
    })
  })

  it('lets the minute of a goal be empty and keeps it empty, after the goals with a minute', () => {
    const checked = validate(
      filled({ 'uitslag-wij': '2', 'uitslag-zij': '1' }, [
        { ...ours, minuut: '' },
        { ...theirs, minuut: '' },
        { ...ours, minuut: '33' },
      ]),
      league,
    )

    expect(checked.errors).toBeUndefined()
    expect(checked.entry?.goals.map((goal) => [goal.ours, goal.minute, goal.stoppageMinutes])).toEqual([
      [true, 33, null],
      [true, null, null],
      [false, null, null],
    ])
  })

  it('wants a minute for added time, and says so at the added time', () => {
    const checked = validate(filled({}, [{ ...ours, extra: '2', minuut: '' }]), league)

    expect(checked.errors).toMatchObject({ 'doelpunt-1-extra': expect.stringContaining('minuut') })
    expect(checked.errors).not.toHaveProperty('doelpunt-1-minuut')
  })

  it('links a scorer of ours to the squad and keeps a player of the opponent apart, own goals included', () => {
    const own = { ...emptyGoal, kant: 'wij', minuut: '30', naam: 'Sibbing', soort: 'eigen' }
    const ourOwn = { ...emptyGoal, kant: 'zij', minuut: '60', soort: 'eigen', speler: '12' }
    const checked = validate(filled({ 'uitslag-wij': '1', 'uitslag-zij': '1' }, [own, ourOwn]), league)

    expect(checked.errors).toBeUndefined()
    expect(checked.entry?.goals).toMatchObject([
      { ours: true, ownGoal: true, personId: null, player: 'Sibbing', playerId: null },
      // The goal gets the person of the chosen player, also of one without a page.
      { ours: false, ownGoal: true, personId: 32, player: 'Bernt Klaverboer', playerId: 12, wikipediaPage: null },
    ])
    // A scorer of ours must be in the squad, and one of the opponent must be named.
    expect(validate(filled({}, [{ ...ours, speler: '99' }]), league).errors).toHaveProperty('doelpunt-1-speler')
    expect(validate(filled({}, [{ ...ours, speler: '' }]), league).errors).toHaveProperty('doelpunt-1-speler')
    expect(validate(filled({}, [{ ...theirs, naam: '' }]), league).errors).toHaveProperty('doelpunt-1-naam')
  })

  it('does not look at the field that does not ask for the scorer', () => {
    // A form without JavaScript can send both. `readValues` wipes the one that does not fit.
    const checked = validate(
      filled({ 'uitslag-wij': '1', 'uitslag-zij': '1' }, [
        { ...ours, naam: 'Oyen' },
        { ...theirs, speler: '11' },
      ]),
      league,
    )

    expect(checked.errors).toBeUndefined()
    expect(checked.entry?.goals).toMatchObject([
      { player: 'Luca Oyen', playerId: 11 },
      { player: 'Sibbing', playerId: null },
    ])
  })

  it('takes a reason as one line, allows none, and refuses one that is too long', () => {
    expect(validate({ ...filled(), reden: '' }, league)).toMatchObject({ reason: undefined })
    expect(validate({ ...filled(), reden: '  ' }, league).errors).toBeUndefined()
    expect(validate({ ...filled(), reden: 'x'.repeat(301) }, league).errors).toHaveProperty('reden')
    expect(validate({ ...filled(), reden: 'Eerst   dit\n en dan dat' }, league).reason).toBe('Eerst dit en dan dat')
  })
})

describe('readValues and readButton', () => {
  it('reads the fields as text and the goals in order, without a gap after one was removed', () => {
    const formData = new FormData()

    formData.set('aftrap-datum', ' 2026-10-31 ')
    formData.set('reden', 'Fout')
    formData.set('doelpunt-3-minuut', '77')
    formData.set('doelpunt-1-minuut', '12')
    formData.set('doelpunt-1-kant', 'wij')

    const values = readValues(formData)

    expect(values.velden['aftrap-datum']).toBe('2026-10-31')
    expect(values.velden.status).toBe('')
    expect(values.reden).toBe('Fout')
    expect(values.doelpunten).toEqual([
      { ...emptyGoal, extra: '', kant: 'wij', minuut: '12', soort: '' },
      { ...emptyGoal, extra: '', kant: '', minuut: '77', soort: '' },
    ])
  })

  it('wipes the field that does not ask for the scorer, as the team and the kind decide', () => {
    const read = (goal: Record<string, string>) => {
      const formData = new FormData()

      for (const [name, value] of Object.entries({ minuut: '5', naam: 'Sibbing', speler: '11', ...goal })) {
        formData.set(`doelpunt-1-${name}`, value)
      }

      const [read] = readValues(formData).doelpunten

      return { naam: read?.naam, speler: read?.speler }
    }

    // Ours, a player of ours: the squad. The opponent, a player of theirs: a name.
    expect(read({ kant: 'wij', soort: 'gewoon' })).toEqual({ naam: '', speler: '11' })
    expect(read({ kant: 'wij', soort: 'strafschop' })).toEqual({ naam: '', speler: '11' })
    expect(read({ kant: 'zij', soort: 'gewoon' })).toEqual({ naam: 'Sibbing', speler: '' })
    // An own goal of the opponent is scored by a player of ours, and one of ours by theirs.
    expect(read({ kant: 'zij', soort: 'eigen' })).toEqual({ naam: '', speler: '11' })
    expect(read({ kant: 'wij', soort: 'eigen' })).toEqual({ naam: 'Sibbing', speler: '' })
    // Without a team it is not known which fits, so neither is wiped.
    expect(read({ kant: '', soort: 'gewoon' })).toEqual({ naam: 'Sibbing', speler: '11' })
  })

  it('knows the three buttons, and takes anything else for a save', () => {
    const press = (value?: string) => {
      const formData = new FormData()

      if (value !== undefined) {
        formData.set('knop', value)
      }

      return readButton(formData)
    }

    expect(press('doelpunt-toevoegen')).toEqual({ kind: 'add' })
    expect(press('doelpunt-weghalen-2')).toEqual({ kind: 'remove', number: 2 })
    expect(press('opslaan')).toEqual({ kind: 'save' })
    expect(press('doelpunt-weghalen-x')).toEqual({ kind: 'save' })
    expect(press()).toEqual({ kind: 'save' })
  })
})

describe('valuesOf', () => {
  it('puts a stored match and its goals in the form, with the time on the clock in the Netherlands', () => {
    const values = valuesOf(
      {
        afterNinetyAgainst: null,
        afterNinetyFor: null,
        extraTime: false,
        goalsAgainst: 1,
        goalsFor: 2,
        kickoffAt: new Date('2026-10-31T18:45:00Z'),
        matchDate: '2026-10-31',
        penaltiesAgainst: null,
        penaltiesFor: null,
        status: 'played',
      } as never,
      [
        {
          minute: 12,
          ours: true,
          ownGoal: false,
          penalty: true,
          player: 'Luca Oyen',
          playerId: 11,
          stoppageMinutes: null,
        },
        {
          minute: 40,
          ours: false,
          ownGoal: false,
          penalty: false,
          player: 'Sibbing',
          playerId: null,
          stoppageMinutes: 2,
        },
      ] as never,
    )

    expect(values.velden).toMatchObject({
      'aftrap-datum': '2026-10-31',
      'aftrap-tijd': '19:45',
      status: 'played',
      'uitslag-wij': '2',
      'uitslag-zij': '1',
      verlenging: 'nee',
    })
    // The result is 2-1, so the form has a third goal for the one that is not stored.
    expect(values.doelpunten).toEqual([
      { extra: '', kant: 'wij', minuut: '12', naam: '', soort: 'strafschop', speler: '11' },
      { extra: '2', kant: 'zij', minuut: '40', naam: 'Sibbing', soort: 'gewoon', speler: '' },
      emptyGoal,
    ])
  })

  it('shows a goal without a minute with an empty minute, not 0 or null', () => {
    const values = valuesOf(
      { goalsAgainst: 0, goalsFor: 1, kickoffAt: null, matchDate: '2026-10-31', status: 'played' } as never,
      [
        {
          minute: null,
          ours: true,
          ownGoal: false,
          penalty: false,
          player: 'Oyen',
          playerId: 11,
          stoppageMinutes: null,
        },
      ] as never,
    )

    expect(values.doelpunten).toEqual([{ extra: '', kant: 'wij', minuut: '', naam: '', soort: 'gewoon', speler: '11' }])
  })

  it('leaves the score empty for a match that was not played, and shows a date without a time', () => {
    const values = valuesOf(
      {
        afterNinetyAgainst: null,
        afterNinetyFor: null,
        dateText: '12-14 februari 2027',
        extraTime: false,
        goalsAgainst: null,
        goalsFor: null,
        kickoffAt: null,
        matchDate: '2027-02-12',
        penaltiesAgainst: null,
        penaltiesFor: null,
        status: 'scheduled',
      } as never,
      [],
    )

    expect(values.velden).toMatchObject({
      'aftrap-datum': '2027-02-12',
      'aftrap-tekst': '12-14 februari 2027',
      'aftrap-tijd': '',
      status: 'scheduled',
      'uitslag-wij': '',
    })
  })
})
