import { discussionLimits } from '@fansite/db/schema'

import type { SkippedItem } from './read-feed.ts'

import { rfc3339Time } from './read-feed.ts'

/**
 * What the importer keeps of a forum discussion, and nothing more: the address, the title, the number of replies, the
 * time of the last post and the screen name of whoever wrote it. The text of a post, avatars and every other detail of a
 * member are not here, so they are never stored.
 */
export type ForumDiscussion = {
  lastPostedAt: Date
  /** The screen name of the last poster, or null when the forum doesn't say who it was. */
  lastPostedBy: null | string
  /** The number of posts minus the opening post, as the forum counts. */
  replyCount: number
  title: string
  /** The address of the discussion on the forum, at its last post. */
  url: string
}

export type ReadForum =
  | {
      discussions: ForumDiscussion[]
      kind: 'read'
      /** The discussions we left out because something was wrong with them, with the reason. */
      skipped: SkippedItem[]
    }
  | {
      kind: 'error'
      message: string
    }

/** A resource of the JSON:API response, with its `attributes` and `relationships` as far as we read them. */
type Resource = Record<string, unknown>

/**
 * The tags whose discussions the block "Nieuwste discussies" leaves out, by slug. Offtopics is mostly about other things
 * than the club, and so is Sport overig (decision of 23 October 2026). This is the one place that lists them.
 */
export const leftOutTags: readonly string[] = ['offtopics', 'sport-overig']

/** How many discussions the importer keeps: the block shows five. */
export const discussionsToKeep = 5

/**
 * Reads the answer of the Flarum API to a request for the discussions, sorted by the time of the last post and with
 * `include=lastPostedUser,tags`, as a guest gets it. Flarum only lists what a guest may see, so the importer makes no
 * rules about that. It leaves out the discussions in the tags of `leftOutTags`, keeps the newest `discussionsToKeep` of
 * the rest, and builds their addresses from `origin` (the address of the forum we asked), the id, the slug and the number
 * of the last post.
 *
 * It gives an error when the answer is not what we expect, or when it holds discussions and none could be read: that is
 * more likely a change in the API than an empty forum, and the discussions we have are better than none.
 */
export function readForum(body: Uint8Array, origin: string): ReadForum {
  let parsed: unknown

  try {
    parsed = JSON.parse(new TextDecoder().decode(body))
  } catch {
    return { kind: 'error', message: 'The response is not JSON' }
  }

  const root = asRecord(parsed)
  const data = root?.['data']

  if (!Array.isArray(data)) {
    return { kind: 'error', message: 'The response has no list of discussions' }
  }

  const included = includedResources(root?.['included'])
  const discussions: ForumDiscussion[] = []
  const skipped: SkippedItem[] = []

  data.forEach((raw: unknown, index) => {
    const position = index + 1
    const discussion = cleanDiscussion(raw, included, origin)

    if (discussion === 'left-out') {
      return
    }
    if ('reason' in discussion) {
      skipped.push({ position, reason: discussion.reason })
    } else {
      discussions.push(discussion)
    }
  })

  if (discussions.length === 0 && skipped.length > 0) {
    return { kind: 'error', message: `None of the ${skipped.length} discussions could be read: ${skipped[0]?.reason}` }
  }

  // The sort is the forum's, but stickied discussions can come first. Array.sort is stable, so equal times keep the order.
  discussions.sort((a, b) => b.lastPostedAt.getTime() - a.lastPostedAt.getTime())

  return { discussions: discussions.slice(0, discussionsToKeep), kind: 'read', skipped }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/**
 * Turns a discussion of the answer into what we keep, 'left-out' for one in a tag we leave out, or the reason to skip
 * it.
 */
function cleanDiscussion(
  raw: unknown,
  included: Map<string, Resource>,
  origin: string,
): 'left-out' | ForumDiscussion | { reason: string } {
  const discussion = asRecord(raw)
  const attributes = asRecord(discussion?.['attributes'])
  const relationships = asRecord(discussion?.['relationships'])

  if (discussion === undefined || attributes === undefined) {
    return { reason: 'it is not a discussion' }
  }

  const id = String(discussion['id'] ?? '')

  if (!/^\d{1,15}$/u.test(id)) {
    return { reason: 'there is no valid id' }
  }

  const tags = relationshipsOf(relationships, 'tags')

  for (const reference of tags) {
    const tagSlug = asRecord(included.get(reference)?.['attributes'])?.['slug']

    // A tag we can't look up might be one we leave out, so the discussion doesn't get in.
    if (typeof tagSlug !== 'string') {
      return { reason: 'a tag of the discussion is not in the answer' }
    }
    if (leftOutTags.includes(tagSlug)) {
      return 'left-out'
    }
  }

  const title = plainText(attributes['title'])

  if (title === '') {
    return { reason: 'there is no title' }
  }
  if (title.length > discussionLimits.title) {
    return { reason: `the title is longer than ${discussionLimits.title} characters` }
  }

  const commentCount = attributes['commentCount']

  if (typeof commentCount !== 'number' || !Number.isSafeInteger(commentCount) || commentCount < 0) {
    return { reason: 'there is no valid number of posts' }
  }

  const lastPostedAt = parseTime(attributes['lastPostedAt'])

  if (lastPostedAt === null) {
    return { reason: 'there is no valid time of the last post' }
  }

  // The `slug` of the API already starts with the id, as in "2859-24-10-2026-ado-den-haag", so the id comes off before it
  // goes in front again. Flarum answers `/d/<id>` with or without the rest, which is only there for people, and it may hold
  // any character.
  const rawSlug = typeof attributes['slug'] === 'string' ? attributes['slug'] : ''
  const slug = rawSlug.startsWith(`${id}-`) ? rawSlug.slice(id.length + 1) : rawSlug === id ? '' : rawSlug
  // The address ends in the number of the last post, so a visitor lands on the post that the line is about, as the
  // forum does for a member who has read up to there. The number is not the number of posts: a deleted post leaves a gap.
  const lastPostNumber = attributes['lastPostNumber']
  const jump =
    typeof lastPostNumber === 'number' && Number.isSafeInteger(lastPostNumber) && lastPostNumber > 0
      ? `/${lastPostNumber}`
      : ''
  const url = new URL(`/d/${id}${slug === '' ? '' : `-${encodeURIComponent(slug)}`}${jump}`, origin).href

  if (url.length > discussionLimits.url) {
    return { reason: `the address is longer than ${discussionLimits.url} characters` }
  }

  const [userReference] = relationshipsOf(relationships, 'lastPostedUser')
  const lastPostedBy = plainText(asRecord(included.get(userReference ?? '')?.['attributes'])?.['displayName']) || null

  if (lastPostedBy !== null && lastPostedBy.length > discussionLimits.lastPostedBy) {
    return { reason: `the screen name is longer than ${discussionLimits.lastPostedBy} characters` }
  }

  // The first post is no reply.
  return { lastPostedAt, lastPostedBy, replyCount: Math.max(0, commentCount - 1), title, url }
}

/** The tags and users of `included`, by `type:id`, which is also how a relationship points at them. */
function includedResources(value: unknown): Map<string, Resource> {
  const resources = new Map<string, Resource>()

  for (const raw of Array.isArray(value) ? value : []) {
    const resource = asRecord(raw)

    if (typeof resource?.['type'] === 'string') {
      resources.set(`${resource['type']}:${String(resource['id'] ?? '')}`, resource)
    }
  }

  return resources
}

/** The time of the last post, in whole seconds, or null when it isn't a time with a zone. */
function parseTime(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !rfc3339Time.test(raw.trim())) {
    return null
  }

  const time = Date.parse(raw.trim())

  return Number.isNaN(time) ? null : new Date(Math.floor(time / 1000) * 1000)
}

/** Text from the forum as one line: white space and control characters become one space. */
function plainText(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  // A lone surrogate is no text and would not survive the trip to the database.
  return value
    .replace(/[\s\p{Cc}]+/gu, ' ')
    .replace(/\p{Cs}/gu, '�')
    .trim()
}

/** The `type:id` of what a relationship points at, as a list for any number of them. */
function relationshipsOf(relationships: Record<string, unknown> | undefined, name: string): string[] {
  const data = asRecord(relationships?.[name])?.['data']

  return (Array.isArray(data) ? data : [data]).flatMap((raw: unknown) => {
    const reference = asRecord(raw)

    return typeof reference?.['type'] === 'string' ? [`${reference['type']}:${String(reference['id'] ?? '')}`] : []
  })
}
