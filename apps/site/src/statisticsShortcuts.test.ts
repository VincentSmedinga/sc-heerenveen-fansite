import { describe, expect, it } from 'vitest'

import { playersShortcuts, statisticsShortcuts } from './statisticsShortcuts'

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

describe('playersShortcuts', () => {
  it('has two links, to the cards Doelpuntenmakers and Bijzondere doelpunten, in the order of the page', () => {
    expect(playersShortcuts).toEqual([
      { href: '#doelpuntenmakers', label: 'Doelpuntenmakers' },
      { href: '#bijzondere-doelpunten', label: 'Bijzondere doelpunten' },
    ])
  })

  it('goes to the same anchor as the card on Statistieken, which keeps its link', () => {
    expect(statisticsShortcuts.map(({ href }) => href)).toContain(playersShortcuts[0].href)
  })
})
