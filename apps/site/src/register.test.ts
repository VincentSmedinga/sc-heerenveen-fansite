import { sourceKinds } from '@fansite/db/schema'
import { realSources } from '@fansite/db/seed'
import { describe, expect, it } from 'vitest'

import { groupByKind, kindHeadings, regionRank, websiteOf } from './register'

describe('groupByKind', () => {
  it('groups the sources in the order news, podcasts, forum, club and video, and leaves empty kinds out', () => {
    const groups = groupByKind([
      { domain: 'voorbeeldvideo.test', kind: 'video', name: 'Voorbeeldvideo' },
      { domain: 'testkrant.test', kind: 'news', name: 'Testkrant' },
      { domain: 'testclub.test', kind: 'club', name: 'Testclub' },
      { domain: 'voorbeeldkrant.test', kind: 'news', name: 'Voorbeeldkrant' },
    ] as const)

    expect(groups.map((group) => group.heading)).toEqual(['Nieuws', 'Club', 'Video'])
    expect(groups[0]?.sources.map((source) => source.name)).toEqual(['Testkrant', 'Voorbeeldkrant'])
  })

  it('puts the Frisian sources first in a group, then the national ones, then the rest, each in the order they came in', () => {
    const names = (domains: string[]) =>
      groupByKind(domains.map((domain) => ({ domain, kind: 'news' as const, name: domain })))[0]?.sources.map(
        (source) => source.name,
      )

    expect(
      names([
        'www.dvhn.nl',
        'www.ad.nl',
        'www.frieschdagblad.nl',
        'www.rijnmond.nl',
        'nos.nl',
        'www.lc.nl',
        'www.omropfryslan.nl',
      ]),
    ).toEqual([
      'www.frieschdagblad.nl',
      'www.lc.nl',
      'www.omropfryslan.nl',
      'www.ad.nl',
      'nos.nl',
      'www.dvhn.nl',
      'www.rijnmond.nl',
    ])
  })

  it('orders the podcasts the same way, and leaves the order of the kinds alone', () => {
    const groups = groupByKind([
      { domain: 'testpodcast.test', kind: 'podcast', name: 'Testpodcast' },
      { domain: 'omny.fm', kind: 'podcast', name: 'Omroep Abe' },
      { domain: 'www.ad.nl', kind: 'news', name: 'Algemeen Dagblad' },
    ] as const)

    expect(groups.map((group) => group.kind)).toEqual(['news', 'podcast'])
    expect(groups[1]?.sources.map((source) => source.name)).toEqual(['Omroep Abe', 'Testpodcast'])
  })

  it('gives no groups without sources', () => {
    expect(groupByKind([])).toEqual([])
  })

  it('has a heading for every kind in the register', () => {
    expect(Object.keys(kindHeadings).sort()).toEqual([...sourceKinds].sort())
  })
})

describe('regionRank', () => {
  const rank = (domain: string) => regionRank({ domain })

  it('ranks the Frisian sources 0, the national ones 1 and every other 2', () => {
    expect([rank('www.lc.nl'), rank('www.omropfryslan.nl'), rank('radiocamataru.podbean.com')]).toEqual([0, 0, 0])
    expect([rank('www.vi.nl'), rank('nos.nl'), rank('www.nd.nl')]).toEqual([1, 1, 1])
    expect([rank('www.dvhn.nl'), rank('testkrant.test'), rank('forum.heerenveen.org')]).toEqual([2, 2, 2])
  })

  it('ranks each source of the register as the register says it is from Friesland or national', () => {
    const rankOfName = (name: string) => {
      const source = realSources.find((entry) => entry.name === name)

      expect(source, name).toBeDefined()

      return rank(source?.domain ?? '')
    }

    for (const name of ['Leeuwarder Courant', 'Friesch Dagblad', 'Omrop Fryslân', 'Omroep Abe', 'Radio Camataru']) {
      expect(rankOfName(name), name).toBe(0)
    }

    for (const name of [
      'Voetbal International',
      'De Telegraaf',
      'Algemeen Dagblad',
      'NOS',
      'ESPN',
      'de Volkskrant',
      'Trouw',
      'Het Parool',
      'Nederlands Dagblad',
    ]) {
      expect(rankOfName(name), name).toBe(1)
    }

    for (const name of ['Dagblad van het Noorden', 'De Gelderlander', 'Rijnmond', 'RTV Noord', 'sc Heerenveen Forum']) {
      expect(rankOfName(name), name).toBe(2)
    }
  })
})

describe('websiteOf', () => {
  it('links to the website on the domain, over HTTPS', () => {
    expect(websiteOf({ domain: 'testkrant.test' })).toBe('https://testkrant.test')
  })
})
