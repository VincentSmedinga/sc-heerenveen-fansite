import { describe, expect, it } from 'vitest'

import {
  coachesCardOf,
  matchShortcuts,
  matchShortcutsOf,
  resultsCardOf,
  resultsCardsOf,
  scoreCountsCard,
  standingsCardOf,
} from './matchShortcuts'

describe('matchShortcutsOf', () => {
  it('has all three links for the current season', () => {
    expect(matchShortcutsOf(true)).toEqual(matchShortcuts)
    expect(matchShortcutsOf(true)).toHaveLength(3)
  })

  it('has no link to the card Hoe vaak welke uitslag, which is on Cijfers', () => {
    expect(matchShortcutsOf(true).map(({ href }) => href)).not.toContain('#hoe-vaak-welke-uitslag')
    expect(scoreCountsCard.id).toBe('hoe-vaak-welke-uitslag')
  })

  it('has the card with our place per round right after the table, only when the page has it', () => {
    const hrefs = (current: boolean, withPlacePerRound: boolean) =>
      matchShortcutsOf(current, 1, [], withPlacePerRound).map(({ href }) => href)

    expect(hrefs(true, true)).toEqual([
      '#programma',
      '#uitslagen',
      '#stand',
      '#verloop-op-de-ranglijst',
      '#hoofdtrainer',
    ])
    expect(hrefs(false, true)).toEqual(['#uitslagen', '#eindstand', '#verloop-op-de-ranglijst', '#hoofdtrainer'])
    expect(hrefs(true, false)).not.toContain('#verloop-op-de-ranglijst')
  })

  it('has Stand in the current season', () => {
    expect(matchShortcutsOf(true)).toContainEqual({ href: '#stand', label: 'Stand' })
  })

  it('leaves Programma out for a season that is over, and keeps the order of the others', () => {
    const links = matchShortcutsOf(false)

    expect(links).toHaveLength(2)
    expect(links.map(({ href }) => href)).not.toContain('#programma')
    expect(links.map(({ href }) => href)).toEqual(
      matchShortcuts
        .map(({ href }) => (href === '#stand' ? '#eindstand' : href))
        .filter((href) => href !== '#programma'),
    )
  })

  it('calls Stand Eindstand for a season that is over, and links to the anchor of its card', () => {
    const links = matchShortcutsOf(false)

    expect(links).toContainEqual({ href: '#eindstand', label: 'Eindstand' })
    expect(links.map(({ label }) => label)).not.toContain('Stand')
    expect(links.map(({ href }) => href)).not.toContain('#stand')
  })
})

describe('matchShortcutsOf with head coaches', () => {
  it('has a link to the card Hoofdtrainer after the table for one coach', () => {
    const hrefs = matchShortcutsOf(true, 1).map(({ href }) => href)

    expect(hrefs).toEqual(['#programma', '#uitslagen', '#stand', '#hoofdtrainer'])
    expect(matchShortcutsOf(true, 1)).toContainEqual({ href: '#hoofdtrainer', label: 'Hoofdtrainer' })
  })

  it('names the card Hoofdtrainers for more, also after the Eindstand of a season that is over', () => {
    const links = matchShortcutsOf(false, 3)

    expect(links.map(({ href }) => href)).toEqual(['#uitslagen', '#eindstand', '#hoofdtrainer'])
    expect(links).toContainEqual({ href: '#hoofdtrainer', label: 'Hoofdtrainers' })
  })

  it('has no link without a coach', () => {
    expect(matchShortcutsOf(true, 0)).toEqual(matchShortcuts)
  })
})

describe('coachesCardOf', () => {
  it('is Hoofdtrainer for one and Hoofdtrainers for more', () => {
    expect(coachesCardOf(1)).toEqual({ id: 'hoofdtrainer', name: 'Hoofdtrainer' })
    // The anchor stays when a season gets a second coach.
    expect(coachesCardOf(2)).toEqual({ id: 'hoofdtrainer', name: 'Hoofdtrainers' })
  })
})

describe('standingsCardOf', () => {
  it('is Stand with the anchor stand in the current season', () => {
    expect(standingsCardOf(true)).toEqual({ id: 'stand', name: 'Stand' })
  })

  it('is Eindstand with the anchor eindstand in a season that is over', () => {
    expect(standingsCardOf(false)).toEqual({ id: 'eindstand', name: 'Eindstand' })
  })
})

describe('resultsCardOf', () => {
  it('keeps the anchor uitslagen for the league, so an old link still lands on its card', () => {
    expect(resultsCardOf('Eredivisie')).toEqual({ id: 'uitslagen', name: 'Eredivisie' })
  })

  it('names the cup and the play-offs, each with an anchor of its own', () => {
    expect(resultsCardOf('KNVB Beker')).toEqual({ id: 'uitslagen-knvb-beker', name: 'KNVB Beker' })
    expect(resultsCardOf('Play-offs Conference League')).toEqual({
      id: 'uitslagen-play-offs',
      name: 'Play-offs Conference League',
    })
  })

  it('names the play-offs for the Europa League, with an anchor of its own', () => {
    expect(resultsCardOf('Play-offs Europa League')).toEqual({
      id: 'uitslagen-play-offs-europa-league',
      name: 'Play-offs Europa League',
    })
  })

  it('names the Europa League, with an anchor of its own', () => {
    expect(resultsCardOf('Europa League')).toEqual({ id: 'uitslagen-europa-league', name: 'Europa League' })
  })
})

describe('resultsCardsOf', () => {
  it('is the one card Uitslagen for a season without results', () => {
    expect(resultsCardsOf([])).toEqual([{ id: 'uitslagen', name: 'Uitslagen' }])
  })

  it('is a card for each competition with results, in the order given', () => {
    expect(resultsCardsOf(['Eredivisie', 'Play-offs Conference League']).map(({ id }) => id)).toEqual([
      'uitslagen',
      'uitslagen-play-offs',
    ])
  })
})

describe('matchShortcutsOf with the cards with results', () => {
  const all = ['Eredivisie', 'KNVB Beker', 'Play-offs Conference League'] as const

  it('has a link for each card with results, with the name of its heading, in the place of Uitslagen', () => {
    expect(matchShortcutsOf(false, 0, all)).toEqual([
      { href: '#uitslagen', label: 'Eredivisie' },
      { href: '#uitslagen-knvb-beker', label: 'KNVB Beker' },
      { href: '#uitslagen-play-offs', label: 'Play-offs Conference League' },
      { href: '#eindstand', label: 'Eindstand' },
    ])
  })

  it('has one link for each competition that has results, and keeps the rest of the bar', () => {
    expect(matchShortcutsOf(false, 1, ['Eredivisie', 'KNVB Beker']).map(({ href }) => href)).toEqual([
      '#uitslagen',
      '#uitslagen-knvb-beker',
      '#eindstand',
      '#hoofdtrainer',
    ])
  })

  it('keeps the link Uitslagen without results', () => {
    expect(matchShortcutsOf(false, 0, [])).toContainEqual({ href: '#uitslagen', label: 'Uitslagen' })
    expect(matchShortcutsOf(true, 0, [])).toEqual(matchShortcuts)
  })

  it('has the same links for the current season, with Programma first and Stand for Eindstand', () => {
    expect(matchShortcutsOf(true, 0, all)).toEqual([
      { href: '#programma', label: 'Programma' },
      { href: '#uitslagen', label: 'Eredivisie' },
      { href: '#uitslagen-knvb-beker', label: 'KNVB Beker' },
      { href: '#uitslagen-play-offs', label: 'Play-offs Conference League' },
      { href: '#stand', label: 'Stand' },
    ])
    expect(matchShortcutsOf(true, 1, ['Eredivisie']).map(({ href }) => href)).toEqual([
      '#programma',
      '#uitslagen',
      '#stand',
      '#hoofdtrainer',
    ])
  })
})

describe('matchShortcutsOf with a last match', () => {
  it('puts Laatste wedstrijd before Programma in the current season only', () => {
    expect(matchShortcutsOf(true, 0, [], false, true).map(({ href }) => href)).toEqual([
      '#laatste-wedstrijd',
      '#programma',
      '#uitslagen',
      '#stand',
    ])
    expect(matchShortcutsOf(false, 0, [], false, true).map(({ href }) => href)).not.toContain('#laatste-wedstrijd')
  })
})
