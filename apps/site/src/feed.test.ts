import { describe, expect, it } from 'vitest'

import { feedOf } from './feed'

const releases = [
  { date: '2026-11-03', sentences: ['Koppen & links staan <nu> op één plek.'], version: '0.2.0' },
  { date: '2026-10-21', sentences: ['De eerste versie.', 'Met een tweede zin.'], version: '0.1.0' },
]

describe('feedOf', () => {
  it('is an RSS 2.0 feed of the page, with full addresses of the site it comes from', () => {
    const feed = feedOf(releases, 'https://acc.sc.heerenveen.org')

    expect(feed).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss version="2\.0"/)
    expect(feed).toContain('<title>Wat is er nieuw – sc Heerenveen Fansite</title>')
    expect(feed).toContain('<link>https://acc.sc.heerenveen.org/wat-is-er-nieuw</link>')
    expect(feed).toContain('<atom:link href="https://acc.sc.heerenveen.org/wat-is-er-nieuw/feed.xml" rel="self"')
    expect(feed).toContain('<language>nl</language>')
  })

  it('has an item per version, newest first, with the number, the date, the sentences and a link to the version', () => {
    const feed = feedOf(releases, 'https://sc.heerenveen.org')
    const items = feed.match(/<item>[\s\S]*?<\/item>/g)

    expect(items).toHaveLength(2)
    expect(items?.[1]).toBe(
      [
        '<item>',
        '<title>Versie 0.1.0</title>',
        '<link>https://sc.heerenveen.org/wat-is-er-nieuw#versie-0.1.0</link>',
        '<guid isPermaLink="true">https://sc.heerenveen.org/wat-is-er-nieuw#versie-0.1.0</guid>',
        '<pubDate>Wed, 21 Oct 2026 00:00:00 GMT</pubDate>',
        '<description>&lt;ul&gt;&lt;li&gt;De eerste versie.&lt;/li&gt;&lt;li&gt;Met een tweede zin.&lt;/li&gt;&lt;/ul&gt;</description>',
        '</item>',
      ].join('\n'),
    )
    expect(items?.[0]).toContain('<title>Versie 0.2.0</title>')
  })

  it('escapes the sentences for the HTML of the description and again for the XML around it', () => {
    expect(feedOf(releases, 'https://sc.heerenveen.org')).toContain(
      '&lt;li&gt;Koppen &amp;amp; links staan &amp;lt;nu&amp;gt; op één plek.&lt;/li&gt;',
    )
  })

  it('has no items before the first release', () => {
    const feed = feedOf([], 'https://sc.heerenveen.org')

    expect(feed).not.toContain('<item>')
    expect(feed).toContain('</channel>\n</rss>')
  })
})
