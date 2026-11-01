import { describe, expect, it } from 'vitest'

import type { MatchValues } from './match-fields'

import { emptyFields, emptyGoal } from './match-fields'
import { readButton, readValues, validate, valuesOf } from './match-form'

const squad = [
  { id: 11, name: 'Luca Oyen', wikipediaPage: 'Luca Oyen' },
  { id: 12, name: 'Bernt Klaverboer', wikipediaPage: null },
]
const league = { competition: 'Eredivisie', opponent: 'N.E.C.', squad } as const
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
const theirs = { ...emptyGoal, kant: 'zij', minuut: '40', naam: 'Sibbing', speler: 'andere' }

describe('validate', () => {
  it('understands a played match: the kick-off in UTC, the result, and no goals', () => {
    const checked = validate(filled(), league)

    expect(checked.errors).toBeUndefined()
    expect(checked.entry).toEqual({
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
        player: 'Bernt Klaverboer',
        playerId: 12,
        stoppageMinutes: null,
        wikipediaPage: null,
      },
    ])
  })

  it('accepts a result without goals, and a scheduled or postponed match without a result', () => {
    expect(validate(filled({ 'uitslag-wij': '0', 'uitslag-zij': '0' }), league).errors).toBeUndefined()

    for (const status of ['scheduled', 'postponed']) {
      const checked = validate(filled({ status, 'uitslag-wij': '', 'uitslag-zij': '' }), league)

      expect(checked.errors).toBeUndefined()
      expect(checked.entry?.result).toMatchObject({ goalsAgainst: null, goalsFor: null, status })
    }
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

  it('refuses what the database refuses: a result of a match that was not played, extra time in the league', () => {
    expect(validate(filled({ status: 'scheduled' }), league).errors).toHaveProperty('uitslag-wij')
    expect(validate(filled({ status: 'bijna' }), league).errors).toHaveProperty('status')
    expect(validate(filled({ 'uitslag-zij': '' }), league).errors).toHaveProperty('uitslag-zij')
    expect(validate(filled({ 'uitslag-zij': '-1' }), league).errors).toHaveProperty('uitslag-zij')
    expect(validate(filled({ verlenging: 'ja' }), league).errors).toHaveProperty('verlenging')
    expect(validate(filled({ verlenging: 'ja' }), cup).errors).toBeUndefined()
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
      'De doelpunten geven 1-0 en de uitslag is 2-1. Pas de doelpunten of de uitslag aan.',
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
      ]),
      league,
    )

    expect(checked.errors).toMatchObject({
      'doelpunt-1-kant': expect.stringContaining('doelpunt 1'),
      'doelpunt-1-minuut': expect.stringContaining('doelpunt 1'),
      'doelpunt-2-minuut': expect.stringContaining('doelpunt 2'),
      'doelpunt-3-extra': expect.stringContaining('doelpunt 3'),
      'doelpunt-3-speler': expect.stringContaining('doelpunt 3'),
      'doelpunt-4-naam': expect.stringContaining('doelpunt 4'),
    })
  })

  it('links a scorer of ours to the squad and keeps a player of the opponent apart, own goals included', () => {
    const own = { ...emptyGoal, kant: 'wij', minuut: '30', naam: 'Sibbing', soort: 'eigen', speler: 'andere' }
    const ourOwn = { ...emptyGoal, kant: 'zij', minuut: '60', soort: 'eigen', speler: '12' }
    const checked = validate(filled({ 'uitslag-wij': '1', 'uitslag-zij': '1' }, [own, ourOwn]), league)

    expect(checked.errors).toBeUndefined()
    expect(checked.entry?.goals).toMatchObject([
      { ours: true, ownGoal: true, player: 'Sibbing', playerId: null },
      { ours: false, ownGoal: true, player: 'Bernt Klaverboer', playerId: 12 },
    ])
    // A player of the opponent is not chosen from the squad, and ours has no typed name.
    expect(validate(filled({}, [{ ...theirs, speler: '11' }]), league).errors).toHaveProperty('doelpunt-1-speler')
    expect(validate(filled({}, [{ ...ours, naam: 'Oyen' }]), league).errors).toHaveProperty('doelpunt-1-naam')
    expect(validate(filled({}, [{ ...ours, speler: '99' }]), league).errors).toHaveProperty('doelpunt-1-speler')
  })

  it('asks for a reason, and takes it as one line', () => {
    expect(validate({ ...filled(), reden: '' }, league).errors).toHaveProperty('reden')
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
    expect(values.doelpunten).toEqual([
      { extra: '', kant: 'wij', minuut: '12', naam: '', soort: 'strafschop', speler: '11' },
      { extra: '2', kant: 'zij', minuut: '40', naam: 'Sibbing', soort: 'gewoon', speler: 'andere' },
    ])
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
