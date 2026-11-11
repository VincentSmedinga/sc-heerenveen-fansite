import { describe, expect, it } from 'vitest'

import { hideReasonErrors, hideReasons, otherReasonKey, parseHideReason } from './hide-reasons'

describe('the reasons to hide an item', () => {
  it('are these five keys and texts, in this order, with Anders last', () => {
    expect(hideReasons.map(({ key, text }) => [key, text])).toEqual([
      ['fout', 'Fout in het bericht'],
      ['past-niet', 'Past niet bij de site'],
      ['bron', 'Op verzoek van de bron'],
      ['dubbel', 'Dubbel bericht'],
    ])
    expect(otherReasonKey).toBe('anders')
  })

  it('give the text of a fixed reason, whatever the text field says', () => {
    for (const { key, text } of hideReasons) {
      expect(parseHideReason(key, 'iets anders')).toEqual({ reason: text })
    }
  })

  it('give the text of Anders, as one line', () => {
    expect(parseHideReason('anders', ' Staat \n twee keer ')).toEqual({ reason: 'Staat twee keer' })
  })

  it('refuse what is no choice from the list', () => {
    for (const choice of [undefined, '', 'iets', 'Fout in het bericht', 7, ['fout']]) {
      expect(parseHideReason(choice, 'tekst')).toEqual({ error: 'kies' })
    }
  })

  it('refuse Anders without a text, or with one that is too long', () => {
    expect(parseHideReason('anders', undefined)).toEqual({ error: 'anders' })
    expect(parseHideReason('anders', '  ')).toEqual({ error: 'anders' })
    expect(parseHideReason('anders', 'x'.repeat(301))).toEqual({ error: 'lang' })
    expect(parseHideReason('anders', 'x'.repeat(300))).toEqual({ reason: 'x'.repeat(300) })
  })

  it('have a text for each error', () => {
    expect(hideReasonErrors.kies).toBe('Kies een reden.')
    expect(hideReasonErrors.anders).toBe('Schrijf een reden bij Anders.')
    expect(hideReasonErrors.lang).toBe('Schrijf een kortere reden, van hoogstens 300 tekens.')
  })
})
