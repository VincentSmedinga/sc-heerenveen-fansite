import { tableColumns } from '@fansite/design-system'
import { describe, expect, it } from 'vitest'

import { flowColumns } from './MatchViews'
import { clubColumns } from './OpponentViews'

const iconsOf = (columns: readonly { icon?: string; name: string }[]) =>
  columns.map((column) => column.icon ?? column.name)

describe('the order of the columns of the tables of the results', () => {
  it('has the list of the opponents as Club, played, won, drawn, lost, points, goal difference', () => {
    expect(iconsOf(clubColumns)).toEqual(['Club', 'played', 'won', 'drawn', 'lost', 'points', 'goalDifference'])
    expect(clubColumns.at(-1)).toMatchObject(tableColumns.goalDifference)
  })

  it('has the tables of the course of the matches as played, won, drawn, lost, points', () => {
    expect(iconsOf(flowColumns)).toEqual(['played', 'won', 'drawn', 'lost', 'points'])
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
