import { describe, expect, it } from 'vitest'

import { cardSources, lastModifiedOfCard, type SourceVersion } from './card-sources'

// Friday 23 October 2026, 15:40 Dutch time.
const now = new Date('2026-10-23T13:40:00Z')

/**
 * Every card with data from an import, with the pages it rests on. A new card with data from an
 * import goes in `cardSources` and in this list; a card that is missing from one of the two
 * stands out here. The cards with news, podcasts and discussions are not in it: each item has
 * its own time.
 */
const expected = {
  // Tegenstanders.
  'alle-tegenstanders': ['standings', 'programme', 'cup'],
  // Spelers.
  'bijzondere-doelpunten': ['standings', 'programme', 'cup', 'squad'],
  'de-nul-gehouden': ['standings', 'programme', 'cup'],
  'doelpunten-per-kwartier': ['standings', 'programme', 'cup'],
  doelpuntenmakers: ['standings', 'programme', 'cup', 'squad'],
  'hoe-de-wedstrijden-verlopen': ['standings', 'programme', 'cup'],
  // The homepage.
  'home-stand': ['standings'],
  'home-wedstrijden': ['standings', 'programme', 'cup'],
  hoofdtrainers: ['squad'],
  // Statistieken, the nine cards in the order of the page.
  'onze-plek-in-de-competitie': ['standings'],
  'onze-uitslagen': ['standings', 'programme', 'cup'],
  // Wedstrijden.
  programma: ['standings', 'programme', 'cup'],
  reeksen: ['standings', 'programme', 'cup'],
  // The list of players on the page Zoeken.
  spelers: ['squad'],
  stand: ['standings'],
  'thuis-en-uit': ['standings', 'programme', 'cup'],
  uitersten: ['standings', 'programme', 'cup'],
  uitslagen: ['standings', 'programme', 'cup'],
  'verloop-van-het-seizoen': ['standings', 'programme', 'cup'],
  wedstrijden: ['standings', 'programme', 'cup'],
} as const

const sources: SourceVersion[] = [
  { kind: 'standings', version: 'Thu, 22 Oct 2026 10:00:00 GMT' },
  { kind: 'programme', version: 'Fri, 23 Oct 2026 09:30:00 GMT' },
  { kind: 'cup', version: 'Mon, 19 Oct 2026 20:15:00 GMT' },
  { kind: 'squad', version: 'Wed, 21 Oct 2026 18:00:00 GMT' },
]

describe('cardSources', () => {
  it('names every card with data from an import, with the pages it rests on', () => {
    expect(Object.keys(cardSources).sort()).toEqual(Object.keys(expected).sort())

    for (const [card, kinds] of Object.entries(expected)) {
      expect([...cardSources[card as keyof typeof cardSources]].sort(), card).toEqual([...kinds].sort())
    }
  })

  it('gives every card at least one source', () => {
    for (const [card, kinds] of Object.entries(cardSources)) {
      expect(kinds.length, card).toBeGreaterThan(0)
    }
  })
})

describe('lastModifiedOfCard', () => {
  it('takes the newest moment of the pages the card rests on', () => {
    expect(lastModifiedOfCard('uitslagen', sources, now)?.text).toBe('vr 11:30')
  })

  it('takes only the pages of the card: the table card ignores the newer page of the matches', () => {
    expect(lastModifiedOfCard('stand', sources, now)?.text).toBe('do 12:00')
  })

  it('takes the squad for the card of the head coaches', () => {
    expect(lastModifiedOfCard('hoofdtrainers', sources, now)?.text).toBe('wo 20:00')
  })

  it('gives nothing when none of its pages was read, or a page has no version', () => {
    expect(lastModifiedOfCard('hoofdtrainers', sources.slice(0, 3), now)).toBeUndefined()
    expect(lastModifiedOfCard('stand', [{ kind: 'standings', version: null }], now)).toBeUndefined()
    expect(lastModifiedOfCard('stand', [], now)).toBeUndefined()
  })
})
