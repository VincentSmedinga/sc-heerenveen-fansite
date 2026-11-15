import { describe, expect, it } from 'vitest'

import { mostPlaceSteps, resolveBritishCountry } from './british-places.ts'

const countries = new Set(['Q21', 'Q25'])

describe('resolveBritishCountry', () => {
  it('follows the places up to a country', () => {
    const places = new Map([
      ['Q1', ['Q2']],
      ['Q2', ['Q3']],
      ['Q3', ['Q25']],
    ])

    expect(resolveBritishCountry('Q1', places, countries)).toEqual({ countryId: 'Q25', kind: 'found' })
  })

  it('names the items it does not know yet, a step at a time', () => {
    expect(resolveBritishCountry('Q1', new Map(), countries)).toEqual({ ids: ['Q1'], kind: 'missing' })
    expect(resolveBritishCountry('Q1', new Map([['Q1', ['Q2', 'Q3']]]), countries)).toEqual({
      ids: ['Q2', 'Q3'],
      kind: 'missing',
    })
  })

  it('gives none for two countries at the same step, and for a chain that ends without one', () => {
    expect(resolveBritishCountry('Q1', new Map([['Q1', ['Q21', 'Q25']]]), countries)).toEqual({ kind: 'none' })
    expect(resolveBritishCountry('Q1', new Map([['Q1', []]]), countries)).toEqual({ kind: 'none' })
  })

  it('stops at a loop and at the most steps', () => {
    expect(
      resolveBritishCountry(
        'Q1',
        new Map([
          ['Q1', ['Q2']],
          ['Q2', ['Q1']],
        ]),
        countries,
      ),
    ).toEqual({ kind: 'none' })

    const chain = new Map<string, string[]>()

    for (let step = 1; step <= mostPlaceSteps + 1; step++) {
      chain.set(`Q${step}`, [step === mostPlaceSteps + 1 ? 'Q25' : `Q${step + 1}`])
    }

    // Q1 reaches Q25 in step seven: one step too many.
    expect(resolveBritishCountry('Q1', chain, countries)).toEqual({ kind: 'none' })
    chain.set(`Q${mostPlaceSteps}`, ['Q25'])
    expect(resolveBritishCountry('Q1', chain, countries)).toEqual({ countryId: 'Q25', kind: 'found' })
  })
})
