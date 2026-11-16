import type { ClubMergePlan } from '@fansite/db/club-merge'

import { describe, expect, it } from 'vitest'

import { clubFacts, describeClubMerge, parseSince } from './club-merge'

describe('parseSince', () => {
  it.each([
    ['', undefined],
    ['  ', undefined],
    [undefined, undefined],
    ['2002/03', '2002/03'],
    [' 1999/00 ', '1999/00'],
  ])('reads %j', (value, since) => {
    expect(parseSince(value)).toEqual({ since })
  })

  it.each(['2002', '2002/3', '2002/04', '02/03', 'vorig seizoen', '2002-03'])('refuses %j', (value) => {
    expect(parseSince(value)).toEqual({ error: 'Vul een seizoen in zoals 2002/03, of laat het veld leeg.' })
  })
})

const club = (id: number, name: string, more: Partial<ClubMergePlan['kept']> = {}) =>
  ({
    country: null,
    id,
    name,
    slug: name.toLowerCase(),
    wikidataId: null,
    wikipediaPage: null,
    ...more,
  }) as ClubMergePlan['kept']

describe('describeClubMerge', () => {
  it('names both clubs, what moved and the season', () => {
    const detail = describeClubMerge({
      groundsLeft: [],
      groundsMoved: 1,
      itemClubs: 2,
      kept: club(33, 'VVV-Venlo', { wikidataId: 'Q24689' }),
      keptMatches: 19,
      leagueResults: 0,
      matches: 6,
      names: ['VVV'],
      other: club(139, 'VVV'),
      pages: [],
      periodsLeft: false,
      periodsMoved: 0,
      since: '2002/03',
      standings: 3,
    })

    expect(detail).toContain('Samengevoegd: club 139 (VVV, adres vvv, Wikidata: geen, Wikipedia: geen)')
    expect(detail).toContain('in club 33 (VVV-Venlo, adres vvv-venlo, Wikidata: Q24689')
    expect(detail).toContain('Verhuisd: 6 wedstrijden, 1 thuisstadions')
    expect(detail).toContain('namen: VVV, titels: geen.')
    expect(detail).toContain('De blijvende naam begint in 2002/03.')
  })
})

describe('clubFacts', () => {
  it('puts an empty value as geen and the country in words', () => {
    expect(clubFacts(club(1, 'AZ', { country: 'NL' }), 4)).toEqual([
      { label: 'Naam', value: 'AZ' },
      { label: 'Adres', value: 'az' },
      { label: 'Wikidata', value: 'geen' },
      { label: 'Wikipedia-artikel', value: 'geen' },
      { label: 'Land', value: 'Nederland (NL)' },
      { label: 'Wedstrijden', value: '4' },
    ])
  })
})
