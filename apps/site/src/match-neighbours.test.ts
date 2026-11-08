import type { MatchInSequence } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { neighbourOf, neighboursOf } from './match-neighbours'

const now = new Date('2026-10-25T13:40:00Z')

const match = (fields: Partial<MatchInSequence>): MatchInSequence => ({
  clubSlug: 'testdorp-fc',
  competition: 'Eredivisie',
  dateText: null,
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  id: 1,
  kickoffAt: null,
  matchDate: '2026-08-08',
  opponent: 'Testdorp FC',
  penaltiesAgainst: null,
  penaltiesFor: null,
  round: '1',
  season: '2026/27',
  status: 'played',
  ...fields,
})

describe('neighboursOf', () => {
  const sequence = [
    match({ id: 1, matchDate: '2025-05-18', season: '2024/25' }),
    match({ id: 2, matchDate: '2025-08-09', season: '2025/26' }),
    match({ id: 3, matchDate: '2025-08-16', season: '2025/26' }),
  ]

  it('finds the match before and the match after, also across the boundary of two seasons', () => {
    const { next, previous } = neighboursOf(sequence, 2)

    expect(previous?.id).toBe(1)
    expect(previous?.season).toBe('2024/25')
    expect(next?.id).toBe(3)
  })

  it('has no previous match for the first match', () => {
    const found = neighboursOf(sequence, 1)

    expect(found.previous).toBeUndefined()
    expect(found.next?.id).toBe(2)
  })

  it('has no next match for the last match', () => {
    const found = neighboursOf(sequence, 3)

    expect(found.previous?.id).toBe(2)
    expect(found.next).toBeUndefined()
  })

  it('has neither for a match that is not in the list', () => {
    expect(neighboursOf(sequence, 99)).toEqual({})
    expect(neighboursOf([], 1)).toEqual({})
  })
})

describe('neighbourOf', () => {
  it('gives the stand from our side and the address, whichever side we played on', () => {
    expect(neighbourOf(match({ goalsAgainst: 3, goalsFor: 0, home: false }), '/wedstrijden/2026-27/x', now)).toEqual({
      club: 'Testdorp FC',
      goalsAgainst: 3,
      goalsFor: 0,
      home: false,
      href: '/wedstrijden/2026-27/x',
    })
  })

  it('gives the shoot-out of a match that had one', () => {
    expect(
      neighbourOf(match({ goalsAgainst: 1, goalsFor: 1, penaltiesAgainst: 5, penaltiesFor: 4 }), undefined, now),
    ).toMatchObject({ goalsFor: 1, penaltiesAgainst: 5, penaltiesFor: 4 })
  })

  it('gives no address for a match without a page', () => {
    expect(neighbourOf(match({}), undefined, now)).not.toHaveProperty('href')
  })

  it('gives the day, without a stand or a time, for a match that is still to come', () => {
    const upcoming = match({
      goalsAgainst: null,
      goalsFor: null,
      kickoffAt: new Date('2026-11-01T13:30:00Z'),
      matchDate: '2026-11-01',
      status: 'scheduled',
    })

    expect(neighbourOf(upcoming, undefined, now)).toEqual({
      club: 'Testdorp FC',
      home: true,
      state: 'zo 1 nov',
      stateDateTime: '2026-11-01',
    })
  })

  it('gives "Live" for a match that has begun and has no result', () => {
    const live = match({
      goalsAgainst: null,
      goalsFor: null,
      kickoffAt: new Date('2026-10-25T13:00:00Z'),
      matchDate: '2026-10-25',
      status: 'scheduled',
    })

    expect(neighbourOf(live, undefined, now)).toMatchObject({ state: 'Live' })
  })

  it('gives a word for a postponed and for a cancelled match', () => {
    const none = { goalsAgainst: null, goalsFor: null }

    expect(neighbourOf(match({ ...none, status: 'postponed' }), undefined, now)).toMatchObject({ state: 'Uitgesteld' })
    expect(neighbourOf(match({ ...none, status: 'cancelled' }), undefined, now)).toMatchObject({
      state: 'Geannuleerd',
    })
  })
})
