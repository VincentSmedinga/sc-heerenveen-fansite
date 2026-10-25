import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FeedItem } from './read-feed.ts'

import { cleanHeadline, paywallCategoryFor, readFeed } from './read-feed.ts'

const now = new Date('2026-10-22T12:00:00Z')

/**
 * The `domain` of the category that Voetbal International gives to an item behind its paywall.
 */
const pro = 'https://www.vi.nl/pro'

const encode = (text: string) => new TextEncoder().encode(text)

/** A feed with the given items inside, as the Leeuwarder Courant writes one. */
const rss = (...items: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Een feed</title>${items.join('')}</channel></rss>`

/** Reads a feed and gives the items, failing the test when the feed can't be read. */
function itemsOf(feed: string, options: { contentType?: string } = {}): FeedItem[] {
  const result = readFeed(encode(feed), { ...options, now })

  if (result.kind === 'error') {
    throw new Error(result.message)
  }

  return result.items
}

/** An RSS item. Every part can be left out with `null`, or replaced. */
function rssItem(
  parts: {
    guid?: null | string
    link?: null | string
    premium?: null | string
    pubDate?: null | string
    title?: null | string
  } = {},
) {
  const {
    guid = 'guid-1',
    link = 'https://krant.test/een',
    premium = null,
    pubDate = 'Tue, 20 Oct 2026 11:58:00 GMT',
    title = 'Een kop',
  } = parts

  return (
    '<item>' +
    (title === null ? '' : `<title>${title}</title>`) +
    (link === null ? '' : `<link>${link}</link>`) +
    (guid === null ? '' : `<guid isPermaLink="false">${guid}</guid>`) +
    (pubDate === null ? '' : `<pubDate>${pubDate}</pubDate>`) +
    (premium === null ? '' : `<premium>${premium}</premium>`) +
    '</item>'
  )
}

function skippedOf(feed: string) {
  const result = readFeed(encode(feed), { now })

  if (result.kind === 'error') {
    throw new Error(result.message)
  }

  return result.skipped
}

describe('the recording of the Leeuwarder Courant', () => {
  const recording = readFileSync(new URL('./fixtures/lc-sc-heerenveen.xml', import.meta.url))
  const result = readFeed(recording, { contentType: 'text/xml; charset=utf-8', now })

  it('gives its 50 items, none skipped', () => {
    expect(result).toMatchObject({ kind: 'read', skipped: [] })
    expect(result.kind === 'read' && result.items).toHaveLength(50)
  })

  it('gives the headline, the link, the GUID as key, the time and the paywall of the first item', () => {
    expect(result.kind === 'read' && result.items[0]).toEqual({
      durationSeconds: null,
      episodeNumber: null,
      key: 'ece-auto-gen-e4f92d18-606d-4257-a39d-2aa94fc86481',
      paywalled: false,
      publishedAt: new Date('2026-10-20T11:58:00Z'),
      seasonNumber: null,
      // The source has a space after the headline and an ampersand in CDATA; the headline is
      // otherwise as published.
      title: 'Timo Zaal verkast naar Zweedse club & nieuwe aflevering van Omroep Abe',
      url: 'https://www.lc.nl/sport/sc-heerenveen/timo-zaal-verkast-naar-zweedse-club-nieuwe-aflevering-van-omroep-abe/160235181.html',
    })
  })

  it('keeps the typographic quotes of the source in a headline', () => {
    expect(result.kind === 'read' && result.items[1]?.title).toBe(
      '’Feest en ruimte voor verbetering bij SC Heerenveen’',
    )
  })

  it('marks the items that are behind the paywall', () => {
    const items = result.kind === 'read' ? result.items : []

    expect(items.filter((item) => item.paywalled)).toHaveLength(8)
    expect(items[2]).toMatchObject({
      key: 'Kordiam-2037552307-3307742035-2565645557',
      paywalled: true,
      title: expect.stringContaining('Bernt Klaverboer') as string,
    })
  })

  it('has a valid time, a web address and a unique key for every item', () => {
    const items = result.kind === 'read' ? result.items : []

    expect(new Set(items.map((item) => item.key)).size).toBe(50)
    for (const item of items) {
      expect(item.publishedAt, item.title).toBeInstanceOf(Date)
      expect(item.url, item.title).toMatch(/^https:\/\/www\.lc\.nl\//u)
    }
  })

  it('gives items with these eight fields only: no intro, image, author or category, and no duration or number for news', () => {
    const items = result.kind === 'read' ? result.items : []

    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual([
        'durationSeconds',
        'episodeNumber',
        'key',
        'paywalled',
        'publishedAt',
        'seasonNumber',
        'title',
        'url',
      ])
      expect([item.durationSeconds, item.episodeNumber, item.seasonNumber]).toEqual([null, null, null])
    }
  })

  it('leaves everything else of the feed out, even when the feed has it', () => {
    const generous = rss(
      '<item><title>Een kop</title><link>https://krant.test/een</link><guid>g1</guid>' +
        '<description>GEHEIME-INTRO</description><dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">GEHEIME-AUTEUR</dc:creator>' +
        '<category>GEHEIME-CATEGORIE</category><enclosure url="https://krant.test/GEHEIME-AFBEELDING.jpg" length="0" type="image/jpeg"/>' +
        '<media:content xmlns:media="http://search.yahoo.com/mrss/" url="https://krant.test/GEHEIME-MEDIA.jpg"/></item>',
    )

    expect(JSON.stringify(readFeed(encode(generous), { now }))).not.toContain('GEHEIME')
  })
})

describe('the recording of Voetbal International', () => {
  const recording = readFileSync(new URL('./fixtures/vi-sc-heerenveen.xml', import.meta.url))
  const result = readFeed(recording, { contentType: 'application/rss+xml; charset=utf-8', now, paywallCategory: pro })
  const items = result.kind === 'read' ? result.items : []

  it('gives its 24 items, none skipped', () => {
    expect(result).toMatchObject({ kind: 'read', skipped: [] })
    expect(items).toHaveLength(24)
  })

  it('gives the headline, the link, the GUID as key and the time in UTC of the first item', () => {
    expect(items[0]).toEqual({
      durationSeconds: null,
      episodeNumber: null,
      key: 'www.vi.nl-news-2149501',
      paywalled: true,
      publishedAt: new Date('2026-10-21T13:00:00Z'),
      seasonNumber: null,
      title: 'Een extra toevoeging aan het spel van een jonge ervaren rot bij SC Heerenveen',
      url: 'https://www.vi.nl/pro/een-extra-toevoeging-aan-het-spel-van-een-jonge-ervaren-rot-bij-sc-heerenveen',
    })
  })

  it('marks the items with the pro category, and those are the items under /pro/', () => {
    expect(items.filter((item) => item.paywalled)).toHaveLength(5)
    expect(items.filter((item) => item.paywalled).every((item) => item.url.startsWith('https://www.vi.nl/pro/'))).toBe(
      true,
    )
    expect(items.filter((item) => item.url.startsWith('https://www.vi.nl/pro/'))).toHaveLength(5)
  })

  it('has items under /nieuws/ and /video/ that are not paywalled', () => {
    for (const section of ['/nieuws/', '/video/']) {
      const inSection = items.filter((item) => item.url.includes(`vi.nl${section}`))

      expect(inSection.length, section).toBeGreaterThan(0)
      expect(inSection.some((item) => item.paywalled)).toBe(false)
    }
  })

  it('gives items with these eight fields only: no intro, image, author or category, and no duration or number for news', () => {
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual([
        'durationSeconds',
        'episodeNumber',
        'key',
        'paywalled',
        'publishedAt',
        'seasonNumber',
        'title',
        'url',
      ])
      expect([item.durationSeconds, item.episodeNumber, item.seasonNumber]).toEqual([null, null, null])
    }
  })

  it('does not look for the premium element, and the Leeuwarder Courant does not look for the category', () => {
    const premium = rss(rssItem({ premium: 'true' }))
    const category = rss(rssItem().replace('</item>', `<category domain="${pro}"><![CDATA[PRO]]></category></item>`))

    expect(readFeed(encode(premium), { now, paywallCategory: pro })).toMatchObject({ items: [{ paywalled: false }] })
    expect(readFeed(encode(category), { now })).toMatchObject({ items: [{ paywalled: false }] })
  })

  it('knows the category by the domain of the source and by nothing else', () => {
    expect(paywallCategoryFor('www.vi.nl')).toBe(pro)
    expect(paywallCategoryFor('www.lc.nl')).toBeUndefined()
  })
})

describe('the headline', () => {
  it.each([
    ['plain text stays as it is', 'SC Heerenveen wint met 3-1', 'SC Heerenveen wint met 3-1'],
    ['named entities become characters', 'Caf&eacute; &amp; bar &ndash; &quot;open&quot;', 'Café & bar – "open"'],
    ['numeric entities become characters', 'Het &#8217;derde&#8217; doelpunt &#x1F3C6;', 'Het ’derde’ doelpunt 🏆'],
    ['an entity is decoded once, not twice', 'Tom &amp;amp; Jerry', 'Tom &amp; Jerry'],
    ['an ampersand that starts no entity stays', 'Q&A over R&D bij AT&T', 'Q&A over R&D bij AT&T'],
    ['an entity without a semicolon stays text', 'Zwolle&notaris', 'Zwolle&notaris'],
    ['tags go and their text stays', 'Een <b>vette</b> <i>kop</i>', 'Een vette kop'],
    ['a tag with attributes goes', 'Een <a href="https://x.test/?a=1&b=2" onclick="alert(1)">link</a>', 'Een link'],
    ['a script tag goes and its text stays as text', 'Kop <script>alert(1)</script>', 'Kop alert(1)'],
    ['a comment goes', 'Kop<!-- verborgen --> twee', 'Kop twee'],
    [
      'an escaped tag becomes text, because it is not a tag any more',
      'Over &lt;b&gt; en &lt;script&gt;',
      'Over <b> en <script>',
    ],
    ['a less-than sign that starts no tag stays', 'Minder dan 5 < 6 en 7 > 3', 'Minder dan 5 < 6 en 7 > 3'],
    ['white space becomes one space', '  Een \n\t kop met   ruimte  ', 'Een kop met ruimte'],
    ['control characters become a space', 'Een\u0000kop\u0007 met', 'Een kop met'],
    ['a lone surrogate becomes the replacement character', 'Een \ud83d kop', 'Een � kop'],
    ['an emoji stays whole', 'Hup 🇳🇱 👨‍👩‍👧', 'Hup 🇳🇱 👨‍👩‍👧'],
    ['nothing is left of a headline of only tags and white space', ' <br/> \n <p> </p>', ''],
  ])('%s', (_, raw, expected) => {
    expect(cleanHeadline(raw)).toBe(expected)
  })

  it('takes time in proportion to its length when the text is full of half tags', () => {
    const started = performance.now()

    cleanHeadline('<a'.repeat(200_000) + '<!--'.repeat(100_000))

    expect(performance.now() - started).toBeLessThan(1000)
  })

  it('is cleaned the same way for a headline in CDATA and one without', () => {
    const [cdata, plain] = itemsOf(
      rss(
        rssItem({ guid: 'a', link: 'https://krant.test/a', title: '<![CDATA[Caf&eacute; <b>open</b>]]>' }),
        rssItem({ guid: 'b', link: 'https://krant.test/b', title: 'Caf&amp;eacute; &lt;b&gt;open&lt;/b&gt;' }),
      ),
    )

    expect(cdata?.title).toBe('Café open')
    expect(plain?.title).toBe('Café open')
  })
})

describe('the link', () => {
  it('is the address, without the white space around it', () => {
    expect(itemsOf(rss(rssItem({ link: '  https://krant.test/een?a=1\n' })))[0]?.url).toBe('https://krant.test/een?a=1')
  })

  it('may be http as well as https', () => {
    expect(itemsOf(rss(rssItem({ link: 'http://krant.test/een' })))[0]?.url).toBe('http://krant.test/een')
  })

  it.each([
    ['javascript:', 'javascript:alert(1)', 'the link does not start with http or https'],
    ['a javascript: link in capitals', 'JaVaScRiPt:alert(1)', 'the link does not start with http or https'],
    ['data:', 'data:text/html,<script>alert(1)</script>', 'the link does not start with http or https'],
    ['ftp:', 'ftp://krant.test/een', 'the link does not start with http or https'],
    ['a relative address', '/sport/een', 'the link is not a complete web address'],
    ['a protocol-relative address', '//krant.test/een', 'the link is not a complete web address'],
    ['text that is no address', 'geen link', 'the link is not a complete web address'],
    ['an address with a password', 'https://gebruiker:geheim@krant.test/een', 'the link has a username or password'],
    ['an empty link', '', 'there is no link'],
    ['no link', null, 'there is no link'],
  ])('is skipped and reported for %s', (_, link, reason) => {
    const feed = rss(rssItem({ guid: 'slecht', link }), rssItem({ guid: 'goed', link: 'https://krant.test/goed' }))

    expect(skippedOf(feed)).toEqual([{ position: 1, reason }])
    expect(itemsOf(feed).map((item) => item.key)).toEqual(['goed'])
  })

  it('is skipped when it is longer than the column', () => {
    const feed = rss(rssItem({ link: `https://krant.test/${'a'.repeat(2048)}` }))

    expect(skippedOf(feed)).toEqual([{ position: 1, reason: 'the link is longer than 2048 characters' }])
  })
})

describe('the key', () => {
  it('is the GUID', () => {
    expect(itemsOf(rss(rssItem({ guid: 'Kordiam-1' })))[0]?.key).toBe('Kordiam-1')
  })

  it('is the GUID without the white space around it, and in the case the source wrote it', () => {
    expect(itemsOf(rss(rssItem({ guid: '  AbC-1\n' })))[0]?.key).toBe('AbC-1')
  })

  it.each([
    ['there is no GUID', null],
    ['the GUID is empty', ''],
    ['the GUID is only white space', ' \n '],
  ])('is the link when %s', (_, guid) => {
    expect(itemsOf(rss(rssItem({ guid, link: 'https://krant.test/een' })))[0]?.key).toBe('https://krant.test/een')
  })

  it('is skipped when it is longer than the column', () => {
    expect(skippedOf(rss(rssItem({ guid: 'g'.repeat(701) })))).toEqual([
      { position: 1, reason: 'the key is longer than 700 characters' },
    ])
  })
})

describe('an item that cannot be used', () => {
  it.each([
    ['has no headline', rssItem({ title: null })],
    ['has an empty headline', rssItem({ title: '' })],
    ['has a headline of only white space and tags', rssItem({ title: ' <b> </b> ' })],
    ['has a headline of only an empty CDATA section', rssItem({ title: '<![CDATA[]]>' })],
  ])('is skipped when it %s, and the rest of the feed goes on', (_, bad) => {
    const feed = rss(
      rssItem({ guid: 'eerst', link: 'https://krant.test/eerst' }),
      bad,
      rssItem({ guid: 'laatst', link: 'https://krant.test/laatst' }),
    )

    expect(skippedOf(feed)).toEqual([{ position: 2, reason: 'there is no headline' }])
    expect(itemsOf(feed).map((item) => item.key)).toEqual(['eerst', 'laatst'])
  })

  it('is skipped when the headline is longer than the column', () => {
    expect(skippedOf(rss(rssItem({ title: 'k'.repeat(501) })))).toEqual([
      { position: 1, reason: 'the headline is longer than 500 characters' },
    ])
    expect(itemsOf(rss(rssItem({ title: 'k'.repeat(500) })))).toHaveLength(1)
  })

  it('is skipped when an earlier item has the same key, and the first one counts', () => {
    const feed = rss(
      rssItem({ guid: 'dubbel', link: 'https://krant.test/een', title: 'Eerste' }),
      rssItem({ guid: 'dubbel', link: 'https://krant.test/twee', title: 'Tweede' }),
    )

    expect(skippedOf(feed)).toEqual([{ position: 2, reason: 'an earlier item in the feed has the same key' }])
    expect(itemsOf(feed).map((item) => item.title)).toEqual(['Eerste'])
  })

  it('keeps the position of each item in the feed, also after a skipped one', () => {
    const feed = rss(rssItem({ guid: 'a', title: null }), rssItem({ guid: 'b' }), rssItem({ guid: 'c', link: null }))

    expect(skippedOf(feed).map((item) => item.position)).toEqual([1, 3])
  })
})

describe('the time', () => {
  const timeOf = (pubDate: null | string) => itemsOf(rss(rssItem({ pubDate })))[0]?.publishedAt

  it('is UTC, whatever the time zone of the computer', () => {
    vi.stubEnv('TZ', 'Pacific/Auckland')

    expect(timeOf('Tue, 20 Oct 2026 11:58:00 GMT')).toEqual(new Date('2026-10-20T11:58:00Z'))
    expect(timeOf('Tue, 20 Oct 2026 13:58:00 +0200')).toEqual(new Date('2026-10-20T11:58:00Z'))
    expect(timeOf('20 Oct 2026 11:58 UT')).toEqual(new Date('2026-10-20T11:58:00Z'))
    expect(timeOf('Tue, 20 Oct 2026 06:58:00 -0500')).toEqual(new Date('2026-10-20T11:58:00Z'))
  })

  it('is null when the feed gives none, or something that is no time', () => {
    for (const bad of [
      null,
      '',
      'gisteren',
      'foo 5',
      'Tue, 20 Oct 2026',
      'Tue, 32 Oct 2026 11:58:00 GMT',
      'Tue, 20 Oct 26 11:58:00 GMT',
      // Without a zone it would be a time on the computer, which is not a time in UTC.
      'Tue, 20 Oct 2026 11:58:00',
      'Tue, 20 Oct 2026 11:58:00 CET',
      '2026-10-20T11:58:00',
    ]) {
      expect(timeOf(bad), String(bad)).toBeNull()
    }
  })

  it('is null before 1990 and more than a day after now, and still fine a few hours ahead', () => {
    expect(timeOf('Mon, 01 Jan 1900 00:00:00 GMT')).toBeNull()
    expect(timeOf('Mon, 01 Jan 0001 00:00:00 GMT')).toBeNull()
    expect(timeOf('Mon, 01 Jan 2040 00:00:00 GMT')).toBeNull()
    expect(timeOf('Thu, 22 Oct 2026 14:00:00 GMT')).toEqual(new Date('2026-10-22T14:00:00Z'))
  })

  it('is cut to whole seconds, because the database keeps no more', () => {
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><title>t</title><entry><title>Kop</title><link href="https://krant.test/een"/><id>1</id><published>2026-10-20T11:58:00.987Z</published></entry></feed>`

    expect(itemsOf(atom)[0]?.publishedAt).toEqual(new Date('2026-10-20T11:58:00Z'))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })
})

describe('the paywall', () => {
  const paywallOf = (premium: null | string) => itemsOf(rss(rssItem({ premium })))[0]?.paywalled

  it('is on for premium true, in any case and with white space, and off for anything else', () => {
    expect(paywallOf('true')).toBe(true)
    expect(paywallOf(' TRUE ')).toBe(true)
    expect(paywallOf('false')).toBe(false)
    expect(paywallOf('1')).toBe(false)
    expect(paywallOf('')).toBe(false)
    expect(paywallOf(null)).toBe(false)
  })

  it('goes with the right item when the feed is mixed, also when an item is skipped or has no GUID', () => {
    const feed = rss(
      rssItem({ guid: 'a', link: 'https://krant.test/a', premium: 'true' }),
      rssItem({ guid: 'b', link: 'https://krant.test/b', premium: 'false', title: null }),
      rssItem({ guid: null, link: 'https://krant.test/c', premium: 'true' }),
      rssItem({ guid: 'd', link: 'https://krant.test/d' }),
    )

    expect(itemsOf(feed).map((item) => [item.key, item.paywalled])).toEqual([
      ['a', true],
      ['https://krant.test/c', true],
      ['d', false],
    ])
  })

  it.each([
    ['an entity in the GUID', rssItem({ guid: 'a&amp;b', premium: 'true' }), 'a&b'],
    [
      'an entity in the link of an item without a GUID',
      rssItem({ guid: null, link: 'https://krant.test/a?x=1&amp;y=2', premium: 'true' }),
      'https://krant.test/a?x=1&y=2',
    ],
    [
      'an entity in a GUID in CDATA, which stays as it is',
      rssItem({ guid: '<![CDATA[a&amp;b]]>', premium: 'true' }),
      'a&amp;b',
    ],
  ])('is kept for %s', (_, item, key) => {
    expect(itemsOf(rss(item))[0]).toMatchObject({ key, paywalled: true })
  })

  it('does not exist in an Atom feed', () => {
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><title>t</title><entry><title>Kop</title><link href="https://krant.test/een"/><id>1</id><premium>true</premium></entry></feed>`

    expect(itemsOf(atom)[0]?.paywalled).toBe(false)
  })

  it('is read from a feed with one item as well as from a feed with many', () => {
    expect(itemsOf(rss(rssItem({ premium: 'true' })))[0]?.paywalled).toBe(true)
  })
})

describe('an Atom feed', () => {
  const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Een Atom-feed</title>
  <id>urn:uuid:60a76c80-d399-11d9-b93c-0003939e0af6</id>
  <updated>2026-10-21T08:00:00Z</updated>
  <entry>
    <title type="html">Een &lt;b&gt;vette&lt;/b&gt; kop &amp;amp; meer</title>
    <link rel="self" href="https://krant.test/feed/een"/>
    <link rel="alternate" type="text/html" href="https://krant.test/een"/>
    <id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>
    <published>2026-10-20T13:58:00+02:00</published>
    <updated>2026-10-21T08:00:00Z</updated>
    <summary>GEHEIME-INTRO</summary>
    <author><name>GEHEIME-AUTEUR</name></author>
    <category term="GEHEIME-CATEGORIE"/>
  </entry>
  <entry>
    <title>Alleen bijgewerkt</title>
    <link href="https://krant.test/twee"/>
    <id>urn:uuid:2</id>
    <updated>2026-10-21T07:00:00Z</updated>
  </entry>
  <entry>
    <title>Zonder id</title>
    <link href="https://krant.test/drie"/>
    <updated>niet-een-tijd</updated>
  </entry>
  <entry>
    <title>Zonder pagina</title>
    <link rel="self" href="https://krant.test/feed/vier"/>
    <id>urn:uuid:4</id>
  </entry>
</feed>`

  it('gives the headline, the link to the page, the id as key and the publication time', () => {
    expect(itemsOf(atom)[0]).toEqual({
      durationSeconds: null,
      episodeNumber: null,
      key: 'urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a',
      paywalled: false,
      publishedAt: new Date('2026-10-20T11:58:00Z'),
      seasonNumber: null,
      title: 'Een vette kop & meer',
      url: 'https://krant.test/een',
    })
  })

  it('takes the update time when an entry has no publication time, and none when it has neither', () => {
    const items = itemsOf(atom)

    expect(items[1]?.publishedAt).toEqual(new Date('2026-10-21T07:00:00Z'))
    expect(items[2]?.publishedAt).toBeNull()
  })

  it('uses the link as key when an entry has no id', () => {
    expect(itemsOf(atom)[2]?.key).toBe('https://krant.test/drie')
  })

  it('skips an entry that has no link to a page', () => {
    expect(skippedOf(atom)).toEqual([{ position: 4, reason: 'there is no link' }])
  })

  it('leaves the intro, the author and the category out', () => {
    expect(JSON.stringify(readFeed(encode(atom), { now }))).not.toContain('GEHEIME')
  })
})

/**
 * A podcast feed in the shape of the real ones, with made-up titles and addresses: the iTunes
 * and Podcast namespaces, an enclosure with the MP3 file, a description, an image and a
 * duration.
 */
const podcastItem = (parts: {
  duration?: null | string
  episode?: null | string
  guid: string
  link: null | string
  season?: null | string
  title: string
}) =>
  '<item>' +
  `<title>${parts.title}</title><itunes:title>${parts.title}</itunes:title>` +
  (parts.link === null ? '' : `<link>${parts.link}</link>`) +
  `<guid isPermaLink="false">${parts.guid}</guid>` +
  '<pubDate>Tue, 20 Oct 2026 00:31:00 +0200</pubDate>' +
  '<description>Een verzonnen beschrijving met shownotes.</description>' +
  `<enclosure url="https://mcdn.podcast.test/${parts.guid}.mp3" length="53188902" type="audio/mpeg"/>` +
  (parts.duration === null ? '' : `<itunes:duration>${parts.duration ?? '2216'}</itunes:duration>`) +
  (parts.episode === undefined || parts.episode === null ? '' : `<itunes:episode>${parts.episode}</itunes:episode>`) +
  (parts.season === undefined || parts.season === null ? '' : `<itunes:season>${parts.season}</itunes:season>`) +
  '<itunes:episodeType>full</itunes:episodeType><itunes:image href="https://podcast.test/plaatje.jpg"/>' +
  '</item>'

const podcastFeed = (...entries: string[]) =>
  '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" ' +
  'xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">' +
  `<channel><title>Een verzonnen podcast</title><link>https://podcast.test</link>${entries.join('')}</channel></rss>`

describe('a podcast feed', () => {
  it('gives the title, the page of the episode as link, the GUID as key, the time and the duration', () => {
    const [episode] = itemsOf(
      podcastFeed(
        podcastItem({ guid: 'a-1', link: 'https://podcast.test/e/aflevering-een/', title: 'Aflevering één' }),
      ),
    )

    expect(episode).toEqual({
      durationSeconds: 2216,
      episodeNumber: null,
      key: 'a-1',
      paywalled: false,
      publishedAt: new Date('2026-10-19T22:31:00Z'),
      seasonNumber: null,
      title: 'Aflevering één',
      url: 'https://podcast.test/e/aflevering-een/',
    })
  })

  it('never takes the enclosure as the link, not even in an item without a link, which is skipped and reported', () => {
    const feed = podcastFeed(
      podcastItem({ guid: 'a-1', link: 'https://podcast.test/e/een/', title: 'Met link' }),
      podcastItem({ guid: 'a-2', link: null, title: 'Zonder link' }),
      podcastItem({ guid: 'a-3', link: '', title: 'Met een lege link' }),
    )

    expect(itemsOf(feed).map((item) => item.url)).toEqual(['https://podcast.test/e/een/'])
    expect(skippedOf(feed)).toEqual([
      { position: 2, reason: 'there is no link' },
      { position: 3, reason: 'there is no link' },
    ])
    expect(JSON.stringify(readFeed(encode(feed), { now }))).not.toContain('.mp3')
  })

  it('skips an item with the same GUID as an earlier one, and the first one counts', () => {
    const feed = podcastFeed(
      podcastItem({ guid: 'dubbel', link: 'https://podcast.test/e/een/', title: 'Eerste' }),
      podcastItem({ guid: 'dubbel', link: 'https://podcast.test/e/twee/', title: 'Tweede' }),
    )

    expect(itemsOf(feed).map((item) => item.title)).toEqual(['Eerste'])
    expect(skippedOf(feed)).toEqual([{ position: 2, reason: 'an earlier item in the feed has the same key' }])
  })

  it('gives the duration, the season and the number of an episode', () => {
    const [episode] = itemsOf(
      podcastFeed(
        podcastItem({
          duration: '2944',
          episode: '120',
          guid: 'a-1',
          link: 'https://podcast.test/e/een/',
          season: '9',
          title: 'Aflevering één',
        }),
      ),
    )

    expect(episode).toMatchObject({ durationSeconds: 2944, episodeNumber: 120, seasonNumber: 9 })
  })

  it.each([
    ['seconds', '2944', 2944],
    ['minutes and seconds', '49:04', 2944],
    ['hours, minutes and seconds', '1:02:03', 3723],
    ['more than a day', '90000', null],
    ['exactly a day', '86400', 86_400],
    ['zero', '0', null],
    ['no number', 'lang', null],
    ['nothing', null, null],
  ])('reads a duration given as %s', (_, duration, seconds) => {
    const [episode] = itemsOf(
      podcastFeed(podcastItem({ duration, guid: 'a-1', link: 'https://podcast.test/e/een/', title: 'Een' })),
    )

    expect(episode?.durationSeconds).toBe(seconds)
  })

  it.each([
    ['a whole number', '16', 16],
    ['zero', '0', null],
    ['a negative number', '-3', null],
    ['a fraction', '2.5', null],
    ['text', 'S9E16', null],
    ['a number that is too large', '100000', null],
    ['nothing', null, null],
  ])('reads an episode and a season given as %s, and keeps the item either way', (_, value, number) => {
    const [episode] = itemsOf(
      podcastFeed(
        podcastItem({ episode: value, guid: 'a-1', link: 'https://podcast.test/e/een/', season: value, title: 'Een' }),
      ),
    )

    expect(episode).toMatchObject({ episodeNumber: number, seasonNumber: number })
  })

  it('leaves the episode type, the description, the image and the MP3 file out', () => {
    const [episode] = itemsOf(
      podcastFeed(podcastItem({ guid: 'a-1', link: 'https://podcast.test/e/een/', title: 'Aflevering één' })),
    )

    expect(Object.keys(episode ?? {}).sort()).toEqual([
      'durationSeconds',
      'episodeNumber',
      'key',
      'paywalled',
      'publishedAt',
      'seasonNumber',
      'title',
      'url',
    ])
    expect(JSON.stringify(episode)).not.toMatch(/mp3|shownotes|plaatje|full/u)
  })
})

describe('a response that is no usable feed', () => {
  it.each([
    ['text that is no XML', 'Dit is geen feed.'],
    ['an empty response', ''],
    [
      'an HTML page',
      '<!doctype html><html><head><title>Toestemming</title></head><body>Accepteer cookies</body></html>',
    ],
    ['XML that is no feed', '<?xml version="1.0"?><note><to>Jan</to></note>'],
  ])('is an error for %s, and not an exception', (_, body) => {
    expect(readFeed(encode(body), { now })).toMatchObject({
      kind: 'error',
      message: expect.stringContaining('not an RSS or Atom feed') as string,
    })
  })

  it.each([
    [
      'a feed that stops halfway',
      '<rss version="2.0"><channel><item><title>Kop</title><link>https://krant.test/een</link>',
    ],
    ['a tag that is never closed', '<rss version="2.0"><channel><item><title>Kop</item></channel></rss>'],
  ])('is an error for %s, because nothing is taken from XML that is not well-formed', (_, body) => {
    expect(readFeed(encode(body), { now })).toMatchObject({
      kind: 'error',
      message: expect.stringMatching(/not well-formed XML|not an RSS or Atom feed/u) as string,
    })
  })

  it('is an error for a format that is not supported', () => {
    const jsonFeed = JSON.stringify({ items: [], title: 'Een feed', version: 'https://jsonfeed.org/version/1.1' })

    expect(readFeed(encode(jsonFeed), { now })).toEqual({
      kind: 'error',
      message: 'Feeds in the format json are not supported, only RSS and Atom',
    })
  })

  it('is no problem for a feed without items', () => {
    expect(readFeed(encode(rss()), { now })).toEqual({ items: [], kind: 'read', skipped: [] })
  })

  it('does not expand entities that the feed defines itself', () => {
    const bomb =
      '<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;">]>' +
      rss(rssItem({ title: 'Kop &c; &c;' })).replace('<?xml version="1.0" encoding="UTF-8"?>', '')

    const result = readFeed(encode(bomb), { now })

    expect(JSON.stringify(result).length).toBeLessThan(2000)
  })
})

describe('the encoding', () => {
  const latin1 = (text: string) => Uint8Array.from(Buffer.from(text, 'latin1'))
  const feed = (declaration: string) =>
    `${declaration}<rss version="2.0"><channel><title>t</title>${rssItem({ title: 'Fryslân &amp; Ljouwert' })}</channel></rss>`

  it('is UTF-8 when nothing says otherwise', () => {
    const result = readFeed(encode(feed('<?xml version="1.0"?>')), { now })

    expect(result.kind === 'read' && result.items[0]?.title).toBe('Fryslân & Ljouwert')
  })

  it('is what the XML declaration says', () => {
    const result = readFeed(latin1(feed('<?xml version="1.0" encoding="ISO-8859-1"?>')), { now })

    expect(result.kind === 'read' && result.items[0]?.title).toBe('Fryslân & Ljouwert')
  })

  it('is what the content type says, before the XML declaration', () => {
    const result = readFeed(latin1(feed('<?xml version="1.0" encoding="UTF-8"?>')), {
      contentType: 'application/rss+xml; charset=windows-1252',
      now,
    })

    expect(result.kind === 'read' && result.items[0]?.title).toBe('Fryslân & Ljouwert')
  })

  it('is UTF-8 when the label is not an encoding we know', () => {
    const result = readFeed(encode(feed('<?xml version="1.0" encoding="geen-encoding"?>')), { now })

    expect(result.kind === 'read' && result.items[0]?.title).toBe('Fryslân & Ljouwert')
  })
})
