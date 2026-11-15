import { describe, expect, it } from 'vitest'

import { countryChoices } from './countries'

describe('countryChoices', () => {
  it('lists every country by its Dutch name, with the code behind it', () => {
    const choices = countryChoices()
    const labels = choices.map((choice) => choice.label)

    expect(choices).toHaveLength(254)
    expect(labels).toContain('Nederland (NL)')
    expect(labels).toContain('Kosovo (XK)')
    expect(labels).toContain('Verenigd Koninkrijk (GB)')
    // The four countries of the United Kingdom are choices of their own (#1277).
    for (const label of ['Engeland (GB-ENG)', 'Noord-Ierland (GB-NIR)', 'Schotland (GB-SCT)', 'Wales (GB-WLS)']) {
      expect(labels).toContain(label)
    }
    // By name, not by code: Duitsland (DE) stands before Nederland (NL), Zweden (SE) after it.
    expect(labels.indexOf('Duitsland (DE)')).toBeLessThan(labels.indexOf('Nederland (NL)'))
    expect(labels.indexOf('Nederland (NL)')).toBeLessThan(labels.indexOf('Zweden (SE)'))
    // Every country has a name: none shows its code twice.
    expect(choices.filter((choice) => choice.label === `${choice.code} (${choice.code})`)).toEqual([])
  })
})
