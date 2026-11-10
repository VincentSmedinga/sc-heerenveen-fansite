import { sourceDifferenceReasons } from '@fansite/db/match-conflicts'
import { describe, expect, it } from 'vitest'

import { differenceWords } from './difference-words'

const firstSeenAt = new Date('2026-11-02T10:00:00Z')
const now = new Date('2026-11-03T10:00:00Z')
const season = '2026/27'

describe('the words of a difference', () => {
  it('names the entry and Wikipedia, with the day the import takes over, for a difference with an entry', () => {
    expect(
      differenceWords(
        { firstSeenAt, part: 'result', reason: 'wijkt af van de invoer van de redactie', season },
        { dataSource: 'wikipedia' },
        now,
      ),
    ).toMatchObject({
      heading: 'Wikipedia wijkt af: uitslag',
      keep: 'Houd onze invoer',
      note: expect.stringMatching(/^Onze invoer blijft staan tot je beslist\. Beslist niemand, .* 9 nov/),
      ours: 'Onze invoer',
      takeOver: 'Neem Wikipedia over',
      theirs: 'Wikipedia',
    })
  })

  it('promises no take-over for a difference with an entry in a season that is over (#1025)', () => {
    const words = differenceWords(
      { firstSeenAt, part: 'result', reason: 'wijkt af van de invoer van de redactie', season: '2025/26' },
      { dataSource: 'wikipedia' },
      now,
    )

    expect(words).toMatchObject({
      keep: 'Houd onze invoer',
      note: 'Onze invoer blijft staan tot je beslist. Het seizoen is voorbij, dus de import neemt Wikipedia niet vanzelf over.',
      takeOver: 'Neem Wikipedia over',
    })
  })

  it('names both sources for a difference between two sources, and promises no take-over', () => {
    expect(
      differenceWords(
        { firstSeenAt, part: 'facts', reason: sourceDifferenceReasons.wikipedia, season },
        { dataSource: 'oude-fansite' },
        now,
      ),
    ).toEqual({
      heading: 'Wikipedia wijkt af: gegevens',
      keep: 'Houd de oude fansite',
      note: 'De wedstrijd komt van de oude fansite, en die waarde blijft staan tot je beslist. De import neemt hier niets vanzelf over.',
      ours: 'De oude fansite',
      takeOver: 'Neem Wikipedia over',
      theirs: 'Wikipedia',
    })
  })

  it('calls a match the editors added "onze invoer"', () => {
    expect(
      differenceWords(
        { firstSeenAt, part: 'kickoff', reason: sourceDifferenceReasons['oude-fansite'], season },
        { dataSource: 'redactie' },
        now,
      ),
    ).toMatchObject({
      heading: 'De oude fansite wijkt af: aftrap',
      keep: 'Houd onze invoer',
      ours: 'Onze invoer',
      takeOver: 'Neem de oude fansite over',
    })
  })
})
