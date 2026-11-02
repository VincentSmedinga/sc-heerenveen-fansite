import { describe, expect, it } from 'vitest'

import { reservedTableColumns, tableColumns, tableLegend } from './table-columns'

const all = [...Object.values(tableColumns), ...Object.values(reservedTableColumns)]

describe('tableColumns', () => {
  it('holds the set of the abbreviations and their words', () => {
    expect(
      Object.fromEntries(
        Object.entries(tableColumns).map(([key, { abbreviation, name }]) => [key, `${abbreviation} ${name}`]),
      ),
    ).toEqual({
      drawn: 'G gelijk',
      goalDifference: 'S doelsaldo',
      goals: 'D doelpunten',
      lost: 'V verlies',
      played: 'G gespeeld',
      points: 'P punten',
      won: 'W winst',
    })
    expect(reservedTableColumns.assists).toEqual({ abbreviation: 'A', name: 'assists' })
  })

  it('gives every abbreviation one letter', () => {
    for (const { abbreviation } of all) expect(abbreviation).toMatch(/^[A-Z]$/u)
  })

  it('gives every word one letter and every name once, with G as the only letter for two words', () => {
    const wordsOf = new Map<string, Set<string>>()
    for (const { abbreviation, name } of all) {
      wordsOf.set(abbreviation, (wordsOf.get(abbreviation) ?? new Set()).add(name))
    }

    expect(new Set(all.map(({ name }) => name)).size).toBe(all.length)
    expect([...wordsOf].filter(([, words]) => words.size > 1)).toEqual([['G', new Set(['gelijk', 'gespeeld'])]])
  })

  it('writes the legend with the letters and words of the columns in their order, and a note in brackets', () => {
    const { drawn, goals, lost, played, points, won } = tableColumns

    expect(tableLegend([played, won, drawn, lost, { ...goals, note: 'voor–tegen' }, points])).toBe(
      'G gespeeld, W winst, G gelijk, V verlies, D doelpunten (voor–tegen), P punten',
    )
  })
})
