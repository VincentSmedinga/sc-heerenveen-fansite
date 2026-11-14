import { describe, expect, it } from 'vitest'

import { playerFiguresShortcuts, playerFiguresShortcutsFor, statisticsShortcuts } from './statisticsShortcuts'

describe('statisticsShortcuts', () => {
  it('has a link for each of the four groups of cards, in the order of the page', () => {
    expect(statisticsShortcuts).toEqual([
      { href: '#competitie', label: 'Competitie' },
      { href: '#uitslagen', label: 'Uitslagen' },
      { href: '#doelpunten', label: 'Doelpunten' },
      { href: '#rondom-de-wedstrijd', label: 'Rondom de wedstrijd' },
    ])
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

describe('playerFiguresShortcuts', () => {
  it('has two links, to the cards Doelpuntenmakers and Bijzondere doelpunten, in the order of the page', () => {
    expect(playerFiguresShortcuts).toEqual([
      { href: '#doelpuntenmakers', label: 'Doelpuntenmakers' },
      { href: '#bijzondere-doelpunten', label: 'Bijzondere doelpunten' },
    ])
  })

  it('has no link on Cijfers of the matches, which has no card Doelpuntenmakers', () => {
    expect(statisticsShortcuts.map(({ href }) => href)).not.toContain('#doelpuntenmakers')
  })
})

describe('playerFiguresShortcutsFor', () => {
  it('is the two links without reports', () => {
    expect(playerFiguresShortcutsFor(false)).toBe(playerFiguresShortcuts)
  })

  it('adds Alle spelers after Doelpuntenmakers and Assists and Minuten before the special goals when there are reports, with no anchor twice', () => {
    const links = playerFiguresShortcutsFor(true)

    expect(links.map(({ href }) => href)).toEqual([
      '#doelpuntenmakers',
      '#alle-spelers',
      '#assists',
      '#minuten',
      '#bijzondere-doelpunten',
    ])
    expect(new Set(links.map(({ href }) => href)).size).toBe(links.length)
  })
})
