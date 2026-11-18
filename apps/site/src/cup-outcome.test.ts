import { describe, expect, it } from 'vitest'

import { cupOutcomeOf } from '#src/cup-outcome'

type Row = Parameters<typeof cupOutcomeOf>[0][number]

const cupMatch = (round: string, day: string, own: Partial<Row> = {}): Row => ({
  competition: 'KNVB Beker',
  goalsAgainst: 0,
  goalsFor: 1,
  matchDate: day,
  penaltiesAgainst: null,
  penaltiesFor: null,
  round,
  status: 'played',
  ...own,
})

describe('cupOutcomeOf', () => {
  it('is won after a final that goes to penalties and is won there', () => {
    expect(
      cupOutcomeOf([
        cupMatch('Halve finale', '2009-03-01'),
        cupMatch('Finale', '2009-05-01', { goalsAgainst: 2, goalsFor: 2, penaltiesAgainst: 4, penaltiesFor: 5 }),
      ]),
    ).toEqual({ kind: 'won' })
  })

  it('names the round we lost in, in lower case', () => {
    expect(
      cupOutcomeOf([
        cupMatch('Tweede ronde', '2025-09-01'),
        cupMatch('Achtste finale', '2025-12-01', { goalsAgainst: 2, goalsFor: 1 }),
      ]),
    ).toEqual({ kind: 'lost', line: 'Uitgeschakeld in de achtste finale' })
  })

  it('counts a lost shoot-out as a loss', () => {
    expect(
      cupOutcomeOf([
        cupMatch('Derde ronde', '2012-12-19', { goalsAgainst: 2, goalsFor: 2, penaltiesAgainst: 7, penaltiesFor: 6 }),
      ]),
    ).toEqual({ kind: 'lost', line: 'Uitgeschakeld in de derde ronde' })
  })

  it('says a lost final was lost, not that we were knocked out', () => {
    expect(cupOutcomeOf([cupMatch('Finale', '1997-05-01', { goalsAgainst: 4, goalsFor: 2 })])).toEqual({
      kind: 'lost',
      line: 'Verloren in de finale',
    })
  })

  it('has no outcome while the cup goes on, or when the last result is not there', () => {
    expect(
      cupOutcomeOf([
        cupMatch('Eerste ronde', '2026-09-01'),
        cupMatch('Tweede ronde', '2026-10-28', { goalsAgainst: null, goalsFor: null, status: 'scheduled' }),
      ]),
    ).toBeUndefined()
    expect(
      cupOutcomeOf([cupMatch('Eerste ronde', '2026-09-01', { goalsAgainst: null, goalsFor: null })]),
    ).toBeUndefined()
  })

  it('has no outcome for a round without a name, a level score without a shoot-out, or no cup at all', () => {
    expect(cupOutcomeOf([cupMatch('Wedstrijd 6', '1997-03-01', { goalsAgainst: 3 })])).toBeUndefined()
    expect(cupOutcomeOf([cupMatch('Kwartfinale', '2017-02-01', { goalsAgainst: 1 })])).toBeUndefined()
    expect(cupOutcomeOf([{ ...cupMatch('Speelronde 3', '2025-08-30'), competition: 'Eredivisie' }])).toBeUndefined()
    expect(cupOutcomeOf([])).toBeUndefined()
  })

  it('has no outcome after a won match that is not the final', () => {
    expect(cupOutcomeOf([cupMatch('Halve finale', '2009-03-01')])).toBeUndefined()
  })
})
