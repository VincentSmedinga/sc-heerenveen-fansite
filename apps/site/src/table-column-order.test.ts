import { tableColumns } from '@fansite/design-system'
import { describe, expect, it } from 'vitest'

import { flowColumns } from './MatchViews'
import { clubColumns } from './OpponentViews'

const lettersOf = (columns: readonly { abbreviation?: string; name: string }[]) =>
  columns.map((column) => column.abbreviation ?? column.name)

describe('the order of the columns of the tables of the results', () => {
  it('has the list of the opponents as Club, G, W, G, V, P, D', () => {
    expect(lettersOf(clubColumns)).toEqual(['Club', 'G', 'W', 'G', 'V', 'P', 'D'])
    expect(clubColumns.at(-1)).toMatchObject(tableColumns.goalDifference)
  })

  it('has the tables of the course of the matches as G, W, G, V, P', () => {
    expect(lettersOf(flowColumns)).toEqual(['G', 'W', 'G', 'V', 'P'])
  })

  it('has the points before the goals and the goal difference in both', () => {
    for (const columns of [clubColumns, flowColumns]) {
      const words: string[] = columns.map((column) => column.name)
      const points = words.indexOf(tableColumns.points.name)

      expect(points).toBeGreaterThan(-1)
      for (const goals of [tableColumns.goals.name, tableColumns.goalDifference.name]) {
        expect(words.indexOf(goals) === -1 || words.indexOf(goals) > points).toBe(true)
      }
    }
  })
})
