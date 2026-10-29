import { describe, expect, it } from 'vitest'

import { matchShortcuts, matchShortcutsOf } from './matchShortcuts'

describe('matchShortcutsOf', () => {
  it('has all twelve links for the current season', () => {
    expect(matchShortcutsOf(true)).toEqual(matchShortcuts)
    expect(matchShortcutsOf(true)).toHaveLength(12)
  })

  it('leaves Programma out for a season that is over, and keeps the order of the others', () => {
    const links = matchShortcutsOf(false)

    expect(links).toHaveLength(11)
    expect(links.map(({ href }) => href)).not.toContain('#programma')
    expect(links.map(({ href }) => href)).toEqual(
      matchShortcuts.map(({ href }) => href).filter((href) => href !== '#programma'),
    )
  })
})
