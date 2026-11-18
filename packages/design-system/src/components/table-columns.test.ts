import { describe, expect, it } from 'vitest'

import { tableColumnIconNames } from './table-column-icon/TableColumnIcon'
import { tableColumns, tableLegend } from './table-columns'

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
      goalsFor: 'goalsFor doelpunten',
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

  it('gives every column an icon of its own and a word of its own, except the goals for', () => {
    expect(new Set(all.map(([, { icon }]) => icon)).size).toBe(all.length)
    // `goalsFor` says `doelpunten` like `goals`: it is only used beside `conceded`, never in a
    // table with `goals`.
    const others = all.filter(([key]) => key !== 'goalsFor')

    expect(new Set(others.map(([, { name }]) => name)).size).toBe(others.length)
    expect(tableColumns.goalsFor.name).toBe(tableColumns.goals.name)
  })

  it('has an icon for every column and a column for every icon', () => {
    expect(all.map(([, { icon }]) => icon).toSorted()).toEqual([...tableColumnIconNames].toSorted())
  })

  it('has no letter left', () => {
    for (const [, column] of all) expect(column).not.toHaveProperty('abbreviation')
  })

  it('refuses a legend with both the goals and the goals for, which say the same word', () => {
    expect(() => tableLegend([tableColumns.goals, tableColumns.goalsFor])).toThrow(/cannot share a table/u)
    expect(() => tableLegend([tableColumns.goalsFor, tableColumns.conceded])).not.toThrow()
  })
})
