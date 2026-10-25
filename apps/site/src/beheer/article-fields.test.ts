import { describe, expect, it } from 'vitest'

import { slugMaxLength, suggestSlug } from './article-fields'

describe('suggestSlug', () => {
  it.each([
    ['Welkom bij de Fansite', 'welkom-bij-de-fansite'],
    ['  Wij zijn terug!  ', 'wij-zijn-terug'],
    ['Één thuisclub, twéé jaar: 1997–2006', 'een-thuisclub-twee-jaar-1997-2006'],
    ['Fryslân boppe', 'fryslan-boppe'],
    ['sc Heerenveen   en   de “fans”', 'sc-heerenveen-en-de-fans'],
    ['---a---b---', 'a-b'],
    ['Ça va? Naïef & kalm', 'ca-va-naief-kalm'],
  ])('makes %j into %j', (title, slug) => {
    expect(suggestSlug(title)).toBe(slug)
  })

  it.each(['', '   ', '!!!', '🙂🙂', 'Это не латиница'])(
    'gives nothing for %j, which has no letters or digits to use',
    (title) => {
      expect(suggestSlug(title)).toBe('')
    },
  )

  it('cuts a long title at a hyphen within the longest address', () => {
    const slug = suggestSlug(`${'woord '.repeat(30)}einde`)

    expect(slug.length).toBeLessThanOrEqual(slugMaxLength)
    expect(slug).toMatch(/^(woord-)*woord$/u)
  })

  it('cuts a word with no hyphen at the longest address', () => {
    expect(suggestSlug('a'.repeat(200))).toBe('a'.repeat(slugMaxLength))
  })

  it('always gives something the form accepts or nothing', () => {
    for (const title of [
      'Een titel: met "alles" erin / en meer',
      'ÀÉÎÕÜ ß æ ø',
      '<script>alert(1)</script>',
      'a'.repeat(300),
    ]) {
      expect(suggestSlug(title)).toMatch(/^(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/u)
    }
  })
})
