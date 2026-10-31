import { describe, expect, it } from 'vitest'

import { statisticsShortcuts } from './statisticsShortcuts'

describe('statisticsShortcuts', () => {
  it('has a link for each of the nine cards with figures', () => {
    expect(statisticsShortcuts).toHaveLength(9)
  })

  it('has an anchor and a name for each link, and no anchor twice', () => {
    const hrefs = statisticsShortcuts.map(({ href }) => href)

    expect(new Set(hrefs).size).toBe(hrefs.length)
    for (const { href, label } of statisticsShortcuts) {
      expect(href).toMatch(/^#[a-z-]+$/)
      expect(label).not.toBe('')
    }
  })
})
