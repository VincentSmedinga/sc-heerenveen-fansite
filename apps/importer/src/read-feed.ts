import type { Atom, Rss } from 'feedsmith'

import { itemLimits } from '@fansite/db/schema'
import { decodeHTML, decodeHTMLStrict } from 'entities'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { parseFeed } from 'feedsmith'

/**
 * What the importer keeps of a news item, and nothing more. An intro, an image, an author or a category is not here:
 * no source has given permission for it yet (editorial principle 2), so we do not even read it.
 */
export type FeedItem = {
  /** The GUID of the item, or its link when it has none. Unique within a source. */
  key: string
  /** Whether the source marks the item as behind a paywall. */
  paywalled: boolean
  /** The time of publication, or null when the feed gives no valid one. */
  publishedAt: Date | null
  /** The headline as text. */
  title: string
  /** The link, always `http` or `https`. */
  url: string
}

export type ReadFeed =
  | {
      items: FeedItem[]
      kind: 'read'
      /** The items we left out, with the reason. */
      skipped: SkippedItem[]
    }
  | {
      kind: 'error'
      message: string
    }

export type SkippedItem = {
  /** The place of the item in the feed, counting from 1. */
  position: number
  reason: string
}

/** An item as the feed gives it, before we clean it. Every field can be missing. */
type RawItem = {
  guid?: string | undefined
  link?: string | undefined
  paywalled?: boolean | undefined
  time?: string | undefined
  title?: string | undefined
}

const dayInMs = 24 * 60 * 60 * 1000

/** Nothing we import is older than this. A time before it is a mistake in the feed. */
const earliestTime = Date.UTC(1990, 0, 1)

/**
 * RFC 822 and 2822, as RSS has it: with a zone, because a time without one would count as local time. The year is
 * 19xx or 20xx, because `Date.parse` reads `0001` as 2001.
 */
const rfc822Time =
  /^(?:[a-z]{3},\s*)?\d{1,2}\s+[a-z]{3}\s+(?:19|20)\d{2}\s+\d{2}:\d{2}(?::\d{2})?\s+(?:gmt|utc?|z|[+-]\d{4})$/iu

/** RFC 3339, as Atom has it. */
export const rfc3339Time = /^(?:19|20)\d{2}-\d{2}-\d{2}t\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:z|[+-]\d{2}:\d{2})$/iu

/**
 * Reads the paywall flag. feedsmith leaves out elements it doesn't know, such as the `<premium>` of the Leeuwarder
 * Courant, so this is a second pass over the same text. Like feedsmith it expands no entities, so a hostile feed can't
 * make it allocate more than the feed holds.
 */
const extensionParser = new XMLParser({
  htmlEntities: false,
  ignoreAttributes: true,
  isArray: (name) => name === 'item',
  parseTagValue: false,
  processEntities: false,
  transformTagName: (name) => name.toLowerCase(),
})

/**
 * Turns a headline from a feed into text: tags go, HTML entities become characters, and white space becomes one space.
 * A feed may give a headline as HTML, with or without CDATA, so it always passes through here. The text is stored as it
 * is and escaped when a page shows it.
 */
export function cleanHeadline(raw: string): string {
  // A tag starts with a letter, a slash or an exclamation mark: `5 < 6` is no tag. The pattern can't run past the next
  // `<`, so it takes time in proportion to the text, however hostile.
  const text = decodeHTMLStrict(raw.replace(/<[/!a-z][^<>]*>/giu, ''))

  // A lone surrogate is no text and would not survive the trip to the database.
  return text
    .replace(/[\s\p{Cc}]+/gu, ' ')
    .replace(/\p{Cs}/gu, '\uFFFD')
    .trim()
}

/**
 * How a source says an item is behind a paywall, by the domain of the source. Voetbal International gives such an item
 * a category with this `domain`; every other source uses the `<premium>` element of the Leeuwarder Courant. A feed
 * without either sign has no paywall.
 */
const paywallCategories: Record<string, string> = {
  'www.vi.nl': 'https://www.vi.nl/pro',
}

/** The category `domain` that marks a paywalled item for this source, or undefined when the feed uses `<premium>`. */
export function paywallCategoryFor(sourceDomain: string): string | undefined {
  return paywallCategories[sourceDomain]
}

/**
 * Reads the items of a feed: RSS or Atom, in the encoding the response names. An item without a headline or a usable
 * link, or that doesn't fit its columns, is left out and reported in `skipped`. The rest of the feed goes on.
 */
export function readFeed(
  body: Uint8Array,
  {
    contentType = null,
    now = new Date(),
    paywallCategory,
  }: { contentType?: null | string; now?: Date; paywallCategory?: string | undefined } = {},
): ReadFeed {
  const text = decode(body, contentType)

  let raw: RawItem[]

  try {
    const parsed = parseFeed(text)

    if (parsed.format !== 'rss' && parsed.format !== 'atom') {
      return { kind: 'error', message: `Feeds in the format ${parsed.format} are not supported, only RSS and Atom` }
    }

    // feedsmith forgives a lot, such as a feed that stops halfway, and reads what it can. A feed that is not well-formed
    // XML may be cut off or mangled, so we take nothing from it.
    const validation = XMLValidator.validate(text)

    if (validation !== true) {
      return { kind: 'error', message: `The feed is not well-formed XML: ${validation.err.msg}` }
    }

    raw = parsed.format === 'rss' ? rssItems(parsed.feed, text, paywallCategory) : atomItems(parsed.feed)
  } catch (error) {
    return { kind: 'error', message: `The response is not an RSS or Atom feed: ${errorMessage(error)}` }
  }

  const items: FeedItem[] = []
  const skipped: SkippedItem[] = []
  const keys = new Set<string>()

  raw.forEach((candidate, index) => {
    const position = index + 1
    const item = cleanItem(candidate, now)

    if ('reason' in item) {
      skipped.push({ position, reason: item.reason })
    } else if (keys.has(item.key)) {
      skipped.push({ position, reason: 'an earlier item in the feed has the same key' })
    } else {
      keys.add(item.key)
      items.push(item)
    }
  })

  return { items, kind: 'read', skipped }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/** The items of an Atom feed. The link to the page is the one without a `rel`, or with `rel="alternate"`. */
function atomItems(feed: Atom.Feed<string>): RawItem[] {
  return (feed.entries ?? []).map((entry) => ({
    guid: entry.id,
    link: entry.links?.find((link) => link.rel === undefined || link.rel === 'alternate')?.href,
    time: entry.published ?? entry.updated,
    title: entry.title?.value,
  }))
}

/** Checks and cleans one item. */
function cleanItem(raw: RawItem, now: Date): FeedItem | { reason: string } {
  const title = cleanHeadline(raw.title ?? '')

  if (title === '') {
    return { reason: 'there is no headline' }
  }
  if (title.length > itemLimits.title) {
    return { reason: `the headline is longer than ${itemLimits.title} characters` }
  }

  const link = parseLink(raw.link)

  if ('reason' in link) {
    return link
  }
  if (link.href.length > itemLimits.url) {
    return { reason: `the link is longer than ${itemLimits.url} characters` }
  }

  const key = keyOf(raw)

  if (key.length > itemLimits.key) {
    return { reason: `the key is longer than ${itemLimits.key} characters` }
  }

  return { key, paywalled: raw.paywalled === true, publishedAt: parseTime(raw.time, now), title, url: link.href }
}

/** Gets the text of a response as the response says it is encoded; UTF-8 when it says nothing we know. */
function decode(body: Uint8Array, contentType: null | string): string {
  const declaration = /^\s*<\?xml[^>]*\sencoding\s*=\s*["']([^"']+)["']/iu.exec(
    new TextDecoder('latin1').decode(body.subarray(0, 200)),
  )
  const label = /;\s*charset\s*=\s*"?([^";\s]+)/iu.exec(contentType ?? '')?.[1] ?? declaration?.[1] ?? 'utf-8'

  try {
    return new TextDecoder(label).decode(body)
  } catch {
    // The label is not an encoding we know.
    return new TextDecoder().decode(body)
  }
}

function decodeEntities(value: string | undefined) {
  return value === undefined ? undefined : decodeHTML(value)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/** The key of an item: its GUID, or its link when it has no GUID. */
function keyOf({ guid, link }: Pick<RawItem, 'guid' | 'link'>): string {
  const trimmed = guid?.trim() ?? ''

  if (trimmed !== '') {
    return trimmed
  }

  const parsed = parseLink(link)

  return 'href' in parsed ? parsed.href : ''
}

/** The address of a link, or the reason we can't use it. Only `http` and `https`, and without a username or password. */
function parseLink(raw: string | undefined): { href: string } | { reason: string } {
  const text = raw?.trim() ?? ''

  if (text === '') {
    return { reason: 'there is no link' }
  }

  let url: URL

  try {
    url = new URL(text)
  } catch {
    return { reason: 'the link is not a complete web address' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { reason: 'the link does not start with http or https' }
  }
  if (url.username !== '' || url.password !== '') {
    return { reason: 'the link has a username or password' }
  }

  return { href: url.href }
}

/**
 * Reads a time in UTC. It is null when the text is not an RFC 822 or RFC 3339 time with a zone, when the time is
 * before 1990, or when it is more than a day ahead of `now`: a news item that is not yet published would stay on top of
 * the list for days. `Date.parse` alone is too forgiving, so the shape is checked first.
 */
function parseTime(raw: string | undefined, now: Date): Date | null {
  const text = raw?.trim() ?? ''

  if (!rfc822Time.test(text) && !rfc3339Time.test(text)) {
    return null
  }

  const time = Date.parse(text)

  // The database keeps whole seconds, so we do too: a time with milliseconds would never equal what we stored.
  return Number.isNaN(time) || time < earliestTime || time > now.getTime() + dayInMs
    ? null
    : new Date(Math.floor(time / 1000) * 1000)
}

/** The keys of the items that the feed marks as `<premium>true</premium>`. */
function paywalledKeys(text: string): Set<string> {
  const keys = new Set<string>()
  const channel = asRecord(asRecord(extensionParser.parse(text))?.['rss'])?.['channel']
  const items = asRecord(channel)?.['item']

  for (const item of Array.isArray(items) ? items : []) {
    const fields = asRecord(item)

    if (typeof fields?.['premium'] === 'string' && fields['premium'].trim().toLowerCase() === 'true') {
      const guid = stringOrUndefined(fields['guid'])
      const link = stringOrUndefined(fields['link'])

      // feedsmith turns an entity such as `&amp;` into a character, except inside CDATA. This pass can't tell the two
      // apart, so it adds the key both ways and the one feedsmith made is among them.
      keys.add(keyOf({ guid, link }))
      keys.add(keyOf({ guid: decodeEntities(guid), link: decodeEntities(link) }))
    }
  }

  return keys
}

/**
 * The items of an RSS feed, with the paywall flag. With a `paywallCategory` an item is paywalled when it has that
 * category, and the category is not kept. Without one, feedsmith doesn't give the flag, so a second pass finds it.
 */
function rssItems(feed: Rss.Feed<string>, text: string, paywallCategory: string | undefined): RawItem[] {
  const paywalled = paywallCategory === undefined ? paywalledKeys(text) : new Set<string>()

  return (feed.items ?? []).map((item) => {
    const candidate = { guid: item.guid?.value, link: item.link, time: item.pubDate, title: item.title }

    return {
      ...candidate,
      paywalled:
        paywallCategory === undefined
          ? paywalled.has(keyOf(candidate))
          : (item.categories ?? []).some((category) => category.domain === paywallCategory),
    }
  })
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' ? value : undefined
}
