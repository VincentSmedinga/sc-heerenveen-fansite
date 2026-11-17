import { describe, expect, it } from 'vitest'

import { tableColumnIconNames } from './table-column-icon/TableColumnIcon'
import { tableColumns } from './table-columns'

const all = Object.entries(tableColumns)

describe('tableColumns', () => {
  it('holds the set of the columns with their icons and their words', () => {
    expect(Object.fromEntries(all.map(([key, { icon, name }]) => [key, `${icon} ${name}`]))).toEqual({
      assists: 'assists assists',
      cleanSheets: 'cleanSheets nul',
      conceded: 'conceded tegendoelpunten',
      drawn: 'drawn gelijk',
      goalDifference: 'goalDifference doelsaldo',
      goals: 'goals doelpunten',
      goalsPerMatch: 'goalsPerMatch doelpunten per wedstrijd',
      hattricks: 'hattricks hattricks',
      lost: 'lost verlies',
      minutes: 'minutes minuten',
      penalties: 'penalties strafschoppen',
      played: 'played gespeeld',
      points: 'points punten',
      pointsPerMatch: 'pointsPerMatch punten per wedstrijd',
      red: 'red rood',
      seasons: 'seasons seizoenen',
      started: 'started basis',
      substituted: 'substituted ingevallen',
      substitutedOff: 'substitutedOff gewisseld',
      won: 'won winst',
      yellow: 'yellow geel',
    })
  })

  it('gives every column an icon of its own and a word of its own', () => {
    expect(new Set(all.map(([, { icon }]) => icon)).size).toBe(all.length)
    expect(new Set(all.map(([, { name }]) => name)).size).toBe(all.length)
  })

  it('has an icon for every column and a column for every icon', () => {
    expect(all.map(([, { icon }]) => icon).toSorted()).toEqual([...tableColumnIconNames].toSorted())
  })

  it('has no letter left', () => {
    for (const [, column] of all) expect(column).not.toHaveProperty('abbreviation')
  })
})
