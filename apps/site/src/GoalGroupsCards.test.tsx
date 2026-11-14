import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { GoalGroups } from './goal-groups'

import { GoalsPerCountryCard, GoalsPerLineCard } from './GoalGroupsCards'
import { withoutIcons } from './without-icons'

const render = (element: React.ReactElement) => withoutIcons(renderToStaticMarkup(element))

const lineGroups: GoalGroups = {
  counted: 9,
  groups: [
    { goals: 7, key: 'aanvaller', name: 'Aanvallers' },
    { goals: 2, key: 'verdediger', name: 'Verdedigers' },
  ],
  total: 9,
}

describe('GoalsPerLineCard', () => {
  it('has a bar per line with the goals as text and no sentence about the basis when all goals count', () => {
    const html = render(<GoalsPerLineCard competition="all" groups={lineGroups} />)

    expect(html).toContain('Doelpunten per linie')
    expect(html).toContain('Aanvallers')
    expect(html).toContain('<span class="hf-bar-list-value">7</span>')
    expect(html).not.toContain('Op basis van')
  })

  it('says on how many goals it rests when some have no line', () => {
    const html = render(<GoalsPerLineCard competition="all" groups={{ ...lineGroups, total: 12 }} />)

    expect(html).toContain(
      'Op basis van 9 van de 12 doelpunten: van de rest kennen we de linie van de doelpuntenmaker niet.',
    )
  })

  it('is a sentence without goals, with the competition it counts', () => {
    const html = render(<GoalsPerLineCard competition="league" groups={{ counted: 0, groups: [], total: 0 }} />)

    expect(html).toContain('We kennen nog geen doelpunten per linie van de Eredivisie.')
    expect(html).not.toContain('hf-bar-list')
  })
})

describe('GoalsPerCountryCard', () => {
  const groups: GoalGroups = {
    counted: 10,
    groups: [
      { goals: 8, key: 'NL', name: 'Nederland' },
      { goals: 2, key: 'DK', name: 'Denemarken' },
    ],
    total: 11,
  }

  it('shows the countries in words, says it is the country of the scorer and on how many goals it rests', () => {
    const html = render(<GoalsPerCountryCard competition="all" groups={groups} />)

    expect(html).toContain('Doelpunten per land')
    expect(html).toContain('Nederland')
    expect(html).toContain('Denemarken')
    expect(html).toContain('Het land van de doelpuntenmaker.')
    expect(html).toContain(
      'Op basis van 10 van de 11 doelpunten: van de rest kennen we het land van de doelpuntenmaker niet.',
    )
  })

  it('is a sentence without goals', () => {
    const html = render(<GoalsPerCountryCard competition="cup" groups={{ counted: 0, groups: [], total: 0 }} />)

    expect(html).toContain('We kennen nog geen doelpunten per land van de KNVB Beker.')
  })
})
