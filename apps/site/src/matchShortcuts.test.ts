import { describe, expect, it } from 'vitest'

import { matchShortcuts, matchShortcutsOf, standingsCardOf } from './matchShortcuts'

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

describe('standingsCardOf', () => {
  it('is Stand with the anchor stand in the current season', () => {
    expect(standingsCardOf(true)).toEqual({ id: 'stand', name: 'Stand' })
  })

  it('is Eindstand with the anchor eindstand in a season that is over', () => {
    expect(standingsCardOf(false)).toEqual({ id: 'eindstand', name: 'Eindstand' })
  })
})
