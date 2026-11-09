import { sourceDifferenceReasons } from '@fansite/db/match-conflicts'
import { describe, expect, it } from 'vitest'

import { differenceWords } from './difference-words'

const firstSeenAt = new Date('2026-11-02T10:00:00Z')

describe('the words of a difference', () => {
  it('names the entry and Wikipedia, with the day the import takes over, for a difference with an entry', () => {
    expect(
      differenceWords(
        { firstSeenAt, part: 'result', reason: 'wijkt af van de invoer van de redactie' },
        { dataSource: 'wikipedia' },
      ),
    ).toMatchObject({
      heading: 'Wikipedia wijkt af: uitslag',
      keep: 'Houd onze invoer',
      note: expect.stringMatching(/^Onze invoer blijft staan tot je beslist\. Beslist niemand, .* 9 nov/),
      ours: 'Onze invoer',
      takeOver: 'Neem Wikipedia over',
      theirs: 'Wikipedia',
      twoSources: false,
    })
  })

  it('names both sources for a difference between two sources, and promises no take-over', () => {
    expect(
      differenceWords(
        { firstSeenAt, part: 'facts', reason: sourceDifferenceReasons.wikipedia },
        { dataSource: 'oude-fansite' },
      ),
    ).toEqual({
      heading: 'Wikipedia wijkt af: gegevens',
      keep: 'Houd de oude fansite',
      note: 'De wedstrijd komt van de oude fansite, en die waarde blijft staan tot je beslist. De import neemt hier niets vanzelf over.',
      ours: 'De oude fansite',
      takeOver: 'Neem Wikipedia over',
      theirs: 'Wikipedia',
      twoSources: true,
    })
  })

  it('calls a match the editors added "onze invoer"', () => {
    expect(
      differenceWords(
        { firstSeenAt, part: 'kickoff', reason: sourceDifferenceReasons['oude-fansite'] },
        { dataSource: 'redactie' },
      ),
    ).toMatchObject({
      heading: 'De oude fansite wijkt af: aftrap',
      keep: 'Houd onze invoer',
      ours: 'Onze invoer',
      takeOver: 'Neem de oude fansite over',
    })
  })
})
