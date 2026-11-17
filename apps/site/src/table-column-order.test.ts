import { tableColumns } from '@fansite/design-system'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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

describe('the columns of the tables of the site', () => {
  it('never write a letter for a column that tableColumns has', () => {
    const source = readdirSync(import.meta.dirname, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.tsx?$/u.test(entry.name) && !/\.test\./u.test(entry.name))
      .map((entry) => readFileSync(join(entry.parentPath, entry.name), 'utf8'))
    const words = Object.values(tableColumns).map(({ name }) => name.toLowerCase())
    const own = source
      .flatMap((text) => [...text.matchAll(/abbreviation: '([^']*)',\s*(?:[a-z]+: [a-z]+,\s*)*name: '([^']*)'/gu)])
      .map(([, letter, name]) => ({ letter, name: (name ?? '').toLowerCase() }))

    // What is left is for columns not in the set: `Gem.`, `#` and the admin pages.
    expect(own.filter(({ name }) => words.includes(name))).toEqual([])
  })
})
