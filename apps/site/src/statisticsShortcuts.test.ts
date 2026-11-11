import { describe, expect, it } from 'vitest'

import { playersShortcuts, playersShortcutsFor, statisticsShortcuts } from './statisticsShortcuts'

describe('statisticsShortcuts', () => {
  it('has a link for each of the twelve cards with figures', () => {
    expect(statisticsShortcuts).toHaveLength(12)
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
  it('has four links, to the cards Selectie, Doelpuntenmakers, Sinds 1990/91 and Bijzondere doelpunten, in the order of the page', () => {
    expect(playersShortcuts).toEqual([
      { href: '#selectie', label: 'Selectie' },
      { href: '#doelpuntenmakers', label: 'Doelpuntenmakers' },
      { href: '#alle-tijden', label: 'Sinds 1990/91' },
      { href: '#bijzondere-doelpunten', label: 'Bijzondere doelpunten' },
    ])
  })

  it('has no link on Cijfers, which has no card Doelpuntenmakers any more', () => {
    expect(statisticsShortcuts.map(({ href }) => href)).not.toContain('#doelpuntenmakers')
  })
})

describe('playersShortcutsFor', () => {
  it('is the four links without reports', () => {
    expect(playersShortcutsFor(false)).toBe(playersShortcuts)
  })

  it('adds Alle spelers after the squad and Assists and Minuten at the end when there are reports, with no anchor twice', () => {
    const links = playersShortcutsFor(true)

    expect(links.map(({ href }) => href)).toEqual([
      '#selectie',
      '#alle-spelers',
      '#doelpuntenmakers',
      '#alle-tijden',
      '#bijzondere-doelpunten',
      '#assists',
      '#minuten',
    ])
    expect(new Set(links.map(({ href }) => href)).size).toBe(links.length)
  })
})
