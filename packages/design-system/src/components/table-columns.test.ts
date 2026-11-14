import { describe, expect, it } from 'vitest'

import { tableColumns, tableLegend } from './table-columns'

const all = Object.values(tableColumns)

describe('tableColumns', () => {
  it('holds the set of the abbreviations and their words', () => {
    expect(
      Object.fromEntries(
        Object.entries(tableColumns).map(([key, { abbreviation, name }]) => [key, `${abbreviation} ${name}`]),
      ),
    ).toEqual({
      assists: 'A assists',
      cleanSheets: 'N nul',
      conceded: 'T tegendoelpunten',
      drawn: 'G gelijk',
      goalDifference: 'D doelsaldo',
      goals: 'D doelpunten',
      goalsPerMatch: 'D/W doelpunten per wedstrijd',
      hattricks: 'H hattricks',
      lost: 'V verlies',
      minutes: 'M minuten',
      penalties: 'S strafschoppen',
      played: 'G gespeeld',
      points: 'P punten',
      pointsPerMatch: 'P punten per wedstrijd',
      red: 'R rood',
      seasons: 'Z seizoenen',
      started: 'B basis',
      substituted: 'I invallers',
      won: 'W winst',
      yellow: 'Y geel',
    })
  })

  it('gives every abbreviation one letter, except D/W', () => {
    for (const { abbreviation } of all) expect(abbreviation).toMatch(/^([A-Z]|D\/W)$/u)
  })

  it('gives every word one letter and every name once, with G, D and P as the only letters for two words', () => {
    const wordsOf = new Map<string, Set<string>>()
    for (const { abbreviation, name } of all) {
      wordsOf.set(abbreviation, (wordsOf.get(abbreviation) ?? new Set()).add(name))
    }

    expect(new Set(all.map(({ name }) => name)).size).toBe(all.length)
    expect([...wordsOf].filter(([, words]) => words.size > 1)).toEqual([
      ['G', new Set(['gelijk', 'gespeeld'])],
      ['D', new Set(['doelpunten', 'doelsaldo'])],
      ['P', new Set(['punten', 'punten per wedstrijd'])],
    ])
  })

  it('writes the legend with the letters and words of the columns in their order, and a note in brackets', () => {
    const { drawn, goals, lost, played, points, won } = tableColumns

    expect(tableLegend([played, won, drawn, lost, { ...goals, note: 'voor–tegen' }, points])).toBe(
      'G gespeeld, W winst, G gelijk, V verlies, D doelpunten (voor–tegen), P punten',
    )
  })
})
