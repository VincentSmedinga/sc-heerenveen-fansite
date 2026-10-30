import { describe, expect, it } from 'vitest'

import { coachesCardOf, matchShortcuts, matchShortcutsOf, standingsCardOf } from './matchShortcuts'

describe('matchShortcutsOf', () => {
  it('has all twelve links for the current season', () => {
    expect(matchShortcutsOf(true)).toEqual(matchShortcuts)
    expect(matchShortcutsOf(true)).toHaveLength(12)
  })

  it('has Stand in the current season', () => {
    expect(matchShortcutsOf(true)).toContainEqual({ href: '#stand', label: 'Stand' })
  })

  it('leaves Programma out for a season that is over, and keeps the order of the others', () => {
    const links = matchShortcutsOf(false)

    expect(links).toHaveLength(11)
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
  it('has a link to the card Hoofdtrainer straight after the table for one coach', () => {
    const hrefs = matchShortcutsOf(true, 1).map(({ href }) => href)

    expect(hrefs).toHaveLength(13)
    expect(hrefs.slice(2, 5)).toEqual(['#stand', '#hoofdtrainer', '#onze-plek-in-de-competitie'])
    expect(matchShortcutsOf(true, 1)).toContainEqual({ href: '#hoofdtrainer', label: 'Hoofdtrainer' })
  })

  it('names the card Hoofdtrainers for more, also after the Eindstand of a season that is over', () => {
    const links = matchShortcutsOf(false, 3)

    expect(links.map(({ href }) => href).slice(1, 4)).toEqual([
      '#eindstand',
      '#hoofdtrainer',
      '#onze-plek-in-de-competitie',
    ])
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
