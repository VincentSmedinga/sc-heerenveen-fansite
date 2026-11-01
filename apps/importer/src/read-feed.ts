import type { Atom, Rss } from 'feedsmith'

import { itemLimits } from '@fansite/db/schema'
import { decodeHTML, decodeHTMLStrict } from 'entities'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { parseFeed } from 'feedsmith'

/**
 * What the importer keeps of a news item, and nothing more. An intro, an image, an author or a
 * category is not here: no source has given permission for it yet (editorial principle 2), so
 * we do not even read it. A podcast episode also gets three facts that are no content: its
 * duration, its season and its number, which are null when the feed has none.
 */
export type FeedItem = {
  /** The duration of a podcast episode in whole seconds, from 1 second to 24 hours, or null. */
  durationSeconds: null | number
  /** The number of a podcast episode, a positive whole number up to 99999, or null. */
  episodeNumber: null | number
  /** The GUID of the item, or its link when it has none. Unique within a source. */
  key: string
  /** Whether the source marks the item as behind a paywall. */
  paywalled: boolean
  /** The time of publication, or null when the feed gives no valid one. */
  publishedAt: Date | null
  /** The season of a podcast episode, a positive whole number up to 99999, or null. */
  seasonNumber: null | number
  /** The key of the story this item is a version of (see `threadRuleFor`), or null. */
  threadKey: null | string
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
  duration?: number | undefined
  episode?: number | undefined
  guid?: string | undefined
  link?: string | undefined
  paywalled?: boolean | undefined
  season?: number | undefined
  time?: string | undefined
  title?: string | undefined
}

const dayInMs = 24 * 60 * 60 * 1000

/** An episode longer than this is a mistake in the feed. */
const maxDurationSeconds = dayInMs / 1000

/** The highest season or episode number we keep. Above it, the feed has made a mistake. */
const maxNumber = 99_999

/** Nothing we import is older than this. A time before it is a mistake in the feed. */
const earliestTime = Date.UTC(1990, 0, 1)

/**
 * RFC 822 and 2822, as RSS has it: with a zone, because a time without one would count as local
 * time. The year is 19xx or 20xx, because `Date.parse` reads `0001` as 2001.
 */
const rfc822Time =
  /^(?:[a-z]{3},\s*)?\d{1,2}\s+[a-z]{3}\s+(?:19|20)\d{2}\s+\d{2}:\d{2}(?::\d{2})?\s+(?:gmt|utc?|z|[+-]\d{4})$/iu

/** RFC 3339, as Atom has it. */
export const rfc3339Time = /^(?:19|20)\d{2}-\d{2}-\d{2}t\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:z|[+-]\d{2}:\d{2})$/iu

/** An RFC 822 time whose zone is a word: the shape of the times that a `TimeRule` reads. */
const ruledShape =
  /^(?:[a-z]{3},\s*)?(?<day>\d{1,2})\s+(?<month>[a-z]{3})\s+(?<year>(?:19|20)\d{2})\s+(?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2}))?\s+(?<label>[a-z]+)$/iu

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

type WallClock = { day: number; hour: number; minute: number; month: number; second: number; year: number }

/**
 * Reads the paywall flag. feedsmith leaves out elements it doesn't know, such as the
 * `<premium>` of the Leeuwarder Courant, so this is a second pass over the same text. Like
 * feedsmith it expands no entities, so a hostile feed can't make it allocate more than the feed
 * holds.
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
 * Turns a headline from a feed into text: tags go, HTML entities become characters, and white
 * space becomes one space. A feed may give a headline as HTML, with or without CDATA, so it
 * always passes through here. The text is stored as it is and escaped when a page shows it.
 */
export function cleanHeadline(raw: string): string {
  // A tag starts with a letter, a slash or an exclamation mark: `5 < 6` is no tag. The pattern
  // can't run past the next `<`, so it takes time in proportion to the text, however hostile.
  const text = decodeHTMLStrict(raw.replace(/<[/!a-z][^<>]*>/giu, ''))

  // A lone surrogate is no text and would not survive the trip to the database.
  return text
    .replace(/[\s\p{Cc}]+/gu, ' ')
    .replace(/\p{Cs}/gu, '\uFFFD')
    .trim()
}

/**
 * How a source says an item is behind a paywall, by the domain of the source. Voetbal
 * International gives such an item a category with this `domain`, and the Algemeen Dagblad and
 * De Gelderlander an element `paid` in a namespace with this address (see `paywallNamespaces`);
 * every other source uses the `<premium>` element of the Leeuwarder Courant. A feed without any
 * of these signs has no paywall.
 */
const paywallCategories: Record<string, string> = {
  'www.vi.nl': 'https://www.vi.nl/pro',
}

/**
 * The namespaces of the `<paid>` element, by the domain of the source. DPG Media, the publisher
 * of the Algemeen Dagblad and De Gelderlander, puts `<dpp:paid>true</dpp:paid>` in an item
 * behind the paywall. The namespace is known by its address, because the feed may choose
 * another prefix than `dpp`.
 */
const paywallNamespaces: Record<string, string> = {
  'www.ad.nl': 'https://www.dpgmedia.cloud/paidrss',
  'www.gelderlander.nl': 'https://www.dpgmedia.cloud/paidrss',
}

/**
 * How a source tells the versions of one story apart from other stories: a pattern that finds
 * a code in the path of a link. A source that puts a story in its feed again under a new
 * headline, such as a live blog that gets a headline for every update, gives every version a
 * link with the same code. The pattern has one group, the code, which is the `thread_key` of
 * the item. The site shows the newest version of a story of a source only.
 */
export type ThreadRule = RegExp

/**
 * A zone label that a source puts on times that are in another zone: `label` is what the feed
 * writes at the end of a time, `timeZone` is the zone the times are really in.
 */
export type TimeRule = { label: string; timeZone: string }

/**
 * The category `domain` that marks a paywalled item for this source, or undefined when the feed
 * uses `<premium>`.
 */
export function paywallCategoryFor(sourceDomain: string): string | undefined {
  return paywallCategories[sourceDomain]
}

/**
 * The namespace address of the `<paid>` element that marks a paywalled item for this source, or
 * undefined when the source doesn't use one.
 */
export function paywallNamespaceFor(sourceDomain: string): string | undefined {
  return paywallNamespaces[sourceDomain]
}

/**
 * The code of DPG Media, the publisher of the Algemeen Dagblad and De Gelderlander: a tilde and
 * eight letters and digits at the end of the path, as in `/regio/een-kop~a40dbd48/`. The text
 * before the tilde is the headline and changes with every version, the code does not. It is the
 * same code at both newspapers for an article they share, which is why the key only joins items
 * of one source.
 */
const dpgMediaThread: ThreadRule = /~([a-z0-9]{8})\/?$/iu

/**
 * The rules for the versions of a story, by the domain of the source. A source without a rule
 * has no keys: every item is its own story.
 */
const threadRules: Record<string, ThreadRule> = {
  'www.ad.nl': dpgMediaThread,
  'www.gelderlander.nl': dpgMediaThread,
}

/**
 * Sources whose times carry a wrong zone, by the domain of the source. ESPN NL writes
 * `Mon, 26 Oct 2026 11:26:08 EST`, but the time is Dutch local time, summer and winter time
 * included (see `docs/bronnen.md`, ESPN NL). Read as the zone it names it would be five or six
 * hours late, and in the future. The rule is for this source only: in any other feed `EST` is
 * not a zone we read, so the item gets the moment we first saw it.
 */
const timeRules: Record<string, TimeRule> = {
  'www.espn.nl': { label: 'EST', timeZone: 'Europe/Amsterdam' },
}

/**
 * Reads the items of a feed: RSS or Atom, in the encoding the response names. An item without a
 * headline or a usable link, or that doesn't fit its columns, is left out and reported in
 * `skipped`. The rest of the feed goes on.
 */
export function readFeed(
  body: Uint8Array,
  {
    contentType = null,
    now = new Date(),
    paywallCategory,
    paywallNamespace,
    threadRule,
    timeRule,
  }: {
    contentType?: null | string
    now?: Date
    paywallCategory?: string | undefined
    paywallNamespace?: string | undefined
    threadRule?: ThreadRule | undefined
    timeRule?: TimeRule | undefined
  } = {},
): ReadFeed {
  const text = decode(body, contentType)

  let raw: RawItem[]

  try {
    const parsed = parseFeed(text)

    if (parsed.format !== 'rss' && parsed.format !== 'atom') {
      return { kind: 'error', message: `Feeds in the format ${parsed.format} are not supported, only RSS and Atom` }
    }

    // feedsmith forgives a lot, such as a feed that stops halfway, and reads what it can. A
    // feed that is not well-formed XML may be cut off or mangled, so we take nothing from it.
    const validation = XMLValidator.validate(text)

    if (validation !== true) {
      return { kind: 'error', message: `The feed is not well-formed XML: ${validation.err.msg}` }
    }

    raw =
      parsed.format === 'rss'
        ? rssItems(parsed.feed, text, { category: paywallCategory, namespace: paywallNamespace })
        : atomItems(parsed.feed)
  } catch (error) {
    return { kind: 'error', message: `The response is not an RSS or Atom feed: ${errorMessage(error)}` }
  }

  const items: FeedItem[] = []
  const skipped: SkippedItem[] = []
  const keys = new Set<string>()

  raw.forEach((candidate, index) => {
    const position = index + 1
    const item = cleanItem(candidate, now, timeRule, threadRule)

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

/**
 * The key of the story that a link belongs to under a rule, or null when the link has no code.
 * The key is the code as the link writes it, in lower case, with its tilde: `~a40dbd48`.
 */
export function threadKeyOf(href: string, rule: ThreadRule): null | string {
  try {
    const code = rule.exec(new URL(href).pathname)?.[1]

    return code === undefined ? null : `~${code.toLowerCase()}`
  } catch {
    return null
  }
}

/** The rule for the versions of a story at this source, or undefined when it has none. */
export function threadRuleFor(sourceDomain: string): ThreadRule | undefined {
  return threadRules[sourceDomain]
}

/** The rule for the times of this source, or undefined when its zones are right. */
export function timeRuleFor(sourceDomain: string): TimeRule | undefined {
  return timeRules[sourceDomain]
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/**
 * The items of an Atom feed. The link to the page is the one without a `rel`, or with
 * `rel="alternate"`.
 */
function atomItems(feed: Atom.Feed<string>): RawItem[] {
  return (feed.entries ?? []).map((entry) => ({
    guid: entry.id,
    link: entry.links?.find((link) => link.rel === undefined || link.rel === 'alternate')?.href,
    time: entry.published ?? entry.updated,
    title: entry.title?.value,
  }))
}

/** Checks and cleans one item. */
function cleanItem(
  raw: RawItem,
  now: Date,
  timeRule: TimeRule | undefined,
  threadRule: ThreadRule | undefined,
): FeedItem | { reason: string } {
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

  return {
    durationSeconds: wholeNumber(raw.duration, maxDurationSeconds),
    episodeNumber: wholeNumber(raw.episode, maxNumber),
    key,
    paywalled: raw.paywalled === true,
    publishedAt: parseTime(raw.time, now, timeRule),
    seasonNumber: wholeNumber(raw.season, maxNumber),
    threadKey: threadRule === undefined ? null : threadKeyOf(link.href, threadRule),
    title,
    url: link.href,
  }
}

/**
 * Gets the text of a response as the response says it is encoded; UTF-8 when it says nothing we
 * know.
 */
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

/** Whether the text of an element says `true`, in any case and with white space around it. */
function isTrue(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true'
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

/**
 * The address of a link, or the reason we can't use it. Only `http` and `https`, and without a
 * username or password.
 */
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
 * Reads a time in UTC. It is null when the text is not an RFC 822 or RFC 3339 time with a zone,
 * when the time is before 1990, or when it is more than a day ahead of `now`: a news item that
 * is not yet published would stay on top of the list for days. `Date.parse` alone is too
 * forgiving, so the shape is checked first. A source with a `timeRule` that writes its label
 * as the zone has its times read in the zone of the rule.
 */
function parseTime(raw: string | undefined, now: Date, timeRule: TimeRule | undefined): Date | null {
  const text = raw?.trim() ?? ''
  const time = ruledTime(text, timeRule) ?? readableTime(text)

  // The database keeps whole seconds, so we do too: a time with milliseconds would never equal
  // what we stored.
  return time === null || time < earliestTime || time > now.getTime() + dayInMs
    ? null
    : new Date(Math.floor(time / 1000) * 1000)
}

/** The time as milliseconds since 1970 when the text has a zone we read, or null. */
function readableTime(text: string): null | number {
  if (!rfc822Time.test(text) && !rfc3339Time.test(text)) {
    return null
  }

  const time = Date.parse(text)

  return Number.isNaN(time) ? null : time
}

/**
 * An RFC 822 time that ends in the label of the rule, as milliseconds since 1970, or null when
 * the text is something else, so that the normal reading goes on. The label is read as the
 * wall clock of the zone of the rule.
 */
function ruledTime(text: string, timeRule: TimeRule | undefined): null | number {
  const found = timeRule === undefined ? null : ruledShape.exec(text)?.groups

  if (timeRule === undefined || found?.['label']?.toLowerCase() !== timeRule.label.toLowerCase()) {
    return null
  }

  const month = months.indexOf((found['month'] ?? '').toLowerCase())

  return month === -1
    ? null
    : wallClockToUtc(
        {
          day: Number(found['day']),
          hour: Number(found['hour']),
          minute: Number(found['minute']),
          month,
          second: Number(found['second'] ?? 0),
          year: Number(found['year']),
        },
        timeRule.timeZone,
      )
}

/**
 * The instant at which a zone shows this wall clock, as milliseconds since 1970, or null when
 * the wall clock is no time (31 February, 25:00). When the zone shows the wall clock twice, as
 * at the end of summer time, it is the first time. When it never does, as at the start of
 * summer time, it is the wall clock read with the offset from before the gap.
 */
function wallClockToUtc(wall: WallClock, timeZone: string): null | number {
  const asUtc = Date.UTC(wall.year, wall.month, wall.day, wall.hour, wall.minute, wall.second)
  const check = new Date(asUtc)

  if (
    check.getUTCFullYear() !== wall.year ||
    check.getUTCMonth() !== wall.month ||
    check.getUTCDate() !== wall.day ||
    check.getUTCHours() !== wall.hour ||
    check.getUTCMinutes() !== wall.minute ||
    check.getUTCSeconds() !== wall.second
  ) {
    return null
  }

  // The offset can change within a day, but not twice, so the offsets of a day before and a day
  // after hold the one that applies.
  const before = offsetAt(asUtc - dayInMs, timeZone)
  const after = offsetAt(asUtc + dayInMs, timeZone)
  const instants = [...new Set([after, before])]
    .map((offset) => asUtc - offset)
    .filter((instant) => asUtc - offsetAt(instant, timeZone) === instant)

  return instants.length > 0 ? Math.min(...instants) : asUtc - before
}

const zoneFormats = new Map<string, Intl.DateTimeFormat>()

/** How far the wall clock of a zone is ahead of UTC at an instant, in milliseconds. */
function offsetAt(instant: number, timeZone: string): number {
  const parts = Object.fromEntries(
    zoneFormat(timeZone)
      .formatToParts(instant)
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>

  return (
    Date.UTC(
      parts['year'] ?? 0,
      (parts['month'] ?? 1) - 1,
      parts['day'],
      parts['hour'],
      parts['minute'],
      parts['second'],
    ) - instant
  )
}

/** The keys of the items that the feed marks as `true` in one of these elements. */
function paywalledKeys(text: string, elements: string[]): Set<string> {
  const keys = new Set<string>()
  const channel = asRecord(asRecord(extensionParser.parse(text))?.['rss'])?.['channel']
  const items = asRecord(channel)?.['item']

  for (const item of Array.isArray(items) ? items : []) {
    const fields = asRecord(item)

    if (fields !== undefined && elements.some((element) => isTrue(fields[element]))) {
      const guid = stringOrUndefined(fields['guid'])
      const link = stringOrUndefined(fields['link'])

      // feedsmith turns an entity such as `&amp;` into a character, except inside CDATA. This
      // pass can't tell the two apart, so it adds the key both ways and the one feedsmith made
      // is among them.
      keys.add(keyOf({ guid, link }))
      keys.add(keyOf({ guid: decodeEntities(guid), link: decodeEntities(link) }))
    }
  }

  return keys
}

/**
 * The prefixes that the feed gives a namespace, written in lower case as the parser has them.
 * It reads every declaration in the feed, wherever it stands, so it also finds a prefix that
 * isn't `dpp`.
 */
function prefixesOf(text: string, namespace: string): string[] {
  const escaped = namespace.replace(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)
  const declaration = new RegExp(String.raw`xmlns:([\w.-]+)\s*=\s*(["'])${escaped}\2`, 'gu')

  return [...text.matchAll(declaration)].map((match) => (match[1] ?? '').toLowerCase())
}

/**
 * The items of an RSS feed, with the paywall flag. With a `category` an item is paywalled when
 * it has that category, and the category is not kept. Otherwise feedsmith doesn't give the
 * flag, so a second pass finds it: in the `<paid>` element of the `namespace`, or in the
 * `<premium>` element when the source has neither.
 */
function rssItems(
  feed: Rss.Feed<string>,
  text: string,
  { category: paywallCategory, namespace }: { category: string | undefined; namespace: string | undefined },
): RawItem[] {
  const elements = namespace === undefined ? ['premium'] : prefixesOf(text, namespace).map((prefix) => `${prefix}:paid`)
  const paywalled = paywallCategory === undefined ? paywalledKeys(text, elements) : new Set<string>()

  return (feed.items ?? []).map((item) => {
    const candidate = {
      duration: item.itunes?.duration,
      episode: item.itunes?.episode,
      guid: item.guid?.value,
      link: item.link,
      season: item.itunes?.season,
      time: item.pubDate,
      title: item.title,
    }

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

/**
 * A fact about an episode, as a positive whole number up to `max`, or null for anything else: a
 * missing value, zero, a fraction, a negative number or a number that is too large. feedsmith
 * has already turned `HH:MM:SS` into seconds.
 */
function wholeNumber(value: number | undefined, max: number): null | number {
  return Number.isInteger(value) && value !== undefined && value >= 1 && value <= max ? value : null
}

/** A formatter that gives the wall clock of a zone with numbers, on a 24-hour clock. */
function zoneFormat(timeZone: string): Intl.DateTimeFormat {
  let format = zoneFormats.get(timeZone)

  if (format === undefined) {
    format = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      hour: 'numeric',
      hourCycle: 'h23',
      minute: 'numeric',
      month: 'numeric',
      second: 'numeric',
      timeZone,
      year: 'numeric',
    })
    zoneFormats.set(timeZone, format)
  }

  return format
}
