import { sourceKinds } from '@fansite/db/schema'
import { describe, expect, it } from 'vitest'

import { groupByKind, kindHeadings, websiteOf } from './register'

describe('groupByKind', () => {
  it('groups the sources in the order news, podcasts, forum, club and video, and leaves empty kinds out', () => {
    const groups = groupByKind([
      { kind: 'video', name: 'Voorbeeldvideo' },
      { kind: 'news', name: 'Testkrant' },
      { kind: 'club', name: 'Testclub' },
      { kind: 'news', name: 'Voorbeeldkrant' },
    ] as const)

    expect(groups.map((group) => group.heading)).toEqual(['Nieuws', 'Club', 'Video'])
    expect(groups[0]?.sources.map((source) => source.name)).toEqual(['Testkrant', 'Voorbeeldkrant'])
  })

  it('gives no groups without sources', () => {
    expect(groupByKind([])).toEqual([])
  })

  it('has a heading for every kind in the register', () => {
    expect(Object.keys(kindHeadings).sort()).toEqual([...sourceKinds].sort())
  })
})

describe('websiteOf', () => {
  it('links to the website on the domain, over HTTPS', () => {
    expect(websiteOf({ domain: 'testkrant.test' })).toBe('https://testkrant.test')
  })
})
