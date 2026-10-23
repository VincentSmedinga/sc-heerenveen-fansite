/**
 * Made-up answers of the Flarum API, in the shape of the real one: JSON:API, with the tags and the last poster in
 * `included`, and fields of the forum that we must not store. The titles and screen names are invented, and so are the
 * ids. No real content or members of the forum are in here.
 */

export type MadeUpDiscussion = {
  commentCount?: number
  id: number
  lastPostedAt?: string
  /** The id of a user in `madeUpUsers`, or null for a discussion without a last poster. */
  lastPostedUser?: null | number
  /** As the API gives it: the id, a dash and the title in lower case, such as `2859-wie-wint-zondag`. */
  slug?: string
  tags?: number[]
  title?: string
}

/** The tags a guest sees, with the ids and slugs of the real forum. De Pronkkeamer is hidden. */
export const madeUpTags = [
  { id: 2, isHidden: false, name: 'Algemeen', slug: 'algemeen' },
  { id: 3, isHidden: false, name: 'Wedstrijden', slug: 'wedstrijden' },
  { id: 9, isHidden: false, name: 'Sport overig', slug: 'sport-overig' },
  { id: 10, isHidden: false, name: 'Offtopics', slug: 'offtopics' },
  { id: 12, isHidden: true, name: 'De Pronkkeamer', slug: 'de-pronkkeamer' },
]

export const madeUpUsers = [
  { displayName: 'Tribunetijger', id: 501 },
  { displayName: 'Buffon1', id: 502 },
  { displayName: 'Friesche Pompebled', id: 503 },
]

/** The address of the API for a forum on this origin, as the seed has it. */
export const discussionsPath = '/api/discussions?sort=-lastPostedAt&page[limit]=30&include=lastPostedUser,tags'

/** The answer of the API to the request of the importer, with these discussions in this order. */
export function forumAnswer(discussions: MadeUpDiscussion[]): string {
  return JSON.stringify({
    data: discussions.map(resource),
    included: [
      ...madeUpTags.map(({ id, ...attributes }) => ({
        attributes: { ...attributes, color: '#336699', discussionCount: 12, position: id },
        id: String(id),
        type: 'tags',
      })),
      ...madeUpUsers.map(({ id, ...attributes }) => ({
        attributes: {
          ...attributes,
          avatarUrl: `https://forum.test/assets/avatars/${id}.png`,
          lastSeenAt: '2026-10-23T11:00:00+00:00',
          username: attributes.displayName.toLowerCase(),
        },
        id: String(id),
        type: 'users',
      })),
    ],
    jsonapi: { version: '1.1' },
    links: { first: `https://forum.test${discussionsPath}` },
  })
}

/** A discussion with the fields of the real API that we must not store. */
function resource(discussion: MadeUpDiscussion) {
  const {
    commentCount = 5,
    id,
    lastPostedAt = '2026-10-23T11:28:21+00:00',
    slug = `${id}-discussie-${id}`,
    tags = [2],
  } = discussion
  const lastPostedUser = discussion.lastPostedUser === undefined ? 501 : discussion.lastPostedUser

  return {
    attributes: {
      canDelete: false,
      commentCount,
      createdAt: '2026-10-01T09:00:00+00:00',
      customThumbnail: `https://forum.test/assets/thumbnails/${id}.jpg`,
      isSticky: false,
      lastPostedAt,
      slug,
      title: discussion.title ?? `Verzonnen discussie ${id}`,
    },
    id: String(id),
    links: { self: `/discussions/${id}` },
    relationships: {
      firstPost: { data: { id: String(id * 10), type: 'posts' } },
      lastPostedUser: { data: lastPostedUser === null ? null : { id: String(lastPostedUser), type: 'users' } },
      tags: { data: tags.map((tag) => ({ id: String(tag), type: 'tags' })) },
    },
    type: 'discussions',
  }
}
