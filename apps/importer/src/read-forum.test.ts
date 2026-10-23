import { describe, expect, it } from 'vitest'

import type { MadeUpDiscussion } from './test-forum.ts'

import { discussionsToKeep, leftOutTags, readForum } from './read-forum.ts'
import { forumAnswer } from './test-forum.ts'

const origin = 'https://forum.test'

const encode = (text: string) => new TextEncoder().encode(text)

/** Reads an answer made of these discussions, failing the test when it can't be read. */
function read(discussions: MadeUpDiscussion[]) {
  const result = readForum(encode(forumAnswer(discussions)), origin)

  if (result.kind === 'error') {
    throw new Error(result.message)
  }

  return result
}

describe('readForum', () => {
  it('gives the address, the title, the replies, the time and the screen name of the last poster', () => {
    const { discussions, skipped } = read([
      {
        commentCount: 84,
        id: 41,
        lastPostedAt: '2026-10-23T13:28:21+02:00',
        lastPostedUser: 502,
        slug: '41-wie-wint-zondag',
        title: 'Wie wint er zondag?',
      },
    ])

    expect(skipped).toEqual([])
    expect(discussions).toEqual([
      {
        lastPostedAt: new Date('2026-10-23T11:28:21Z'),
        lastPostedBy: 'Buffon1',
        replyCount: 83,
        title: 'Wie wint er zondag?',
        url: 'https://forum.test/d/41-wie-wint-zondag/84',
      },
    ])
  })

  it('counts the replies without the opening post, and never below zero', () => {
    const { discussions } = read([
      { commentCount: 1, id: 1 },
      { commentCount: 2, id: 2 },
      { commentCount: 0, id: 3 },
    ])

    expect(discussions.map((discussion) => discussion.replyCount)).toEqual([0, 1, 0])
  })

  it('keeps the newest four, by the time of the last post, whatever order the forum gives', () => {
    const { discussions } = read([
      { id: 1, lastPostedAt: '2026-10-20T10:00:00+00:00' },
      { id: 2, lastPostedAt: '2026-10-23T10:00:00+00:00' },
      { id: 3, lastPostedAt: '2026-10-22T10:00:00+00:00' },
      { id: 4, lastPostedAt: '2026-10-21T10:00:00+00:00' },
      { id: 5, lastPostedAt: '2026-10-19T10:00:00+00:00' },
      { id: 6, lastPostedAt: '2026-10-23T12:00:00+00:00' },
    ])

    expect(discussions).toHaveLength(discussionsToKeep)
    expect(discussions.map((discussion) => discussion.url)).toEqual([
      'https://forum.test/d/6-discussie-6/5',
      'https://forum.test/d/2-discussie-2/5',
      'https://forum.test/d/3-discussie-3/5',
      'https://forum.test/d/4-discussie-4/5',
    ])
  })

  it('leaves out the discussions in Offtopics and Sport overig, and takes the next ones instead', () => {
    expect(leftOutTags).toEqual(['offtopics', 'sport-overig'])

    const { discussions, skipped } = read([
      { id: 1, tags: [10] },
      { id: 2, tags: [9] },
      { id: 3, tags: [2, 10] },
      { id: 4, tags: [3] },
      { id: 5, tags: [2] },
      { id: 6, tags: [2, 3] },
      { id: 7, tags: [] },
      { id: 8, tags: [12] },
    ])

    expect(skipped).toEqual([])
    expect(discussions.map((discussion) => discussion.url)).toEqual([
      'https://forum.test/d/4-discussie-4/5',
      'https://forum.test/d/5-discussie-5/5',
      'https://forum.test/d/6-discussie-6/5',
      'https://forum.test/d/7-discussie-7/5',
    ])
  })

  it('keeps a discussion without a last poster, with no screen name', () => {
    const { discussions } = read([{ id: 1, lastPostedUser: null }])

    expect(discussions[0]?.lastPostedBy).toBeNull()
  })

  it('keeps a discussion whose last poster is not in the answer, with no screen name', () => {
    const { discussions } = read([{ id: 1, lastPostedUser: 999 }])

    expect(discussions[0]?.lastPostedBy).toBeNull()
  })

  it('builds the address from the origin we asked, the id and the slug, and trusts no link of the answer', () => {
    const answer = JSON.parse(forumAnswer([{ id: 7, slug: '7-een slug/met?tekens' }]))

    answer.data[0].links = { self: 'https://kwaad.test/discussions/7' }

    const result = readForum(encode(JSON.stringify(answer)), origin)

    expect(result).toMatchObject({
      discussions: [{ url: 'https://forum.test/d/7-een%20slug%2Fmet%3Ftekens/5' }],
      kind: 'read',
    })
  })

  it('does not put the id in the address twice, because the slug of the API starts with it', () => {
    const { discussions } = read([{ id: 2859, slug: '2859-24-10-2026-ado-den-haag-sc-heerenveen-2100-uur' }])

    expect(discussions[0]?.url).toBe('https://forum.test/d/2859-24-10-2026-ado-den-haag-sc-heerenveen-2100-uur/5')
  })

  it('puts the id in front of a slug that does not start with it', () => {
    const { discussions } = read([{ id: 2859, slug: 'ado-den-haag' }])

    expect(discussions[0]?.url).toBe('https://forum.test/d/2859-ado-den-haag/5')
  })

  it('gives the address with the id alone when the slug is the id', () => {
    const { discussions } = read([{ id: 2859, slug: '2859' }])

    expect(discussions[0]?.url).toBe('https://forum.test/d/2859/5')
  })

  it('ends the address in the number of the last post, which is higher than the posts that are left after a deleted post', () => {
    const { discussions } = read([{ commentCount: 53, id: 2856, lastPostNumber: 55 }])

    expect(discussions[0]?.url).toBe('https://forum.test/d/2856-discussie-2856/55')
    expect(discussions[0]?.replyCount).toBe(52)
  })

  it.each([undefined, 0, -1, 1.5, '9'])(
    'gives the address of the discussion itself when the last post number is %j',
    (number) => {
      const answer = JSON.parse(forumAnswer([{ id: 2856 }]))

      if (number === undefined) {
        delete answer.data[0].attributes.lastPostNumber
      } else {
        answer.data[0].attributes.lastPostNumber = number
      }

      expect(readForum(encode(JSON.stringify(answer)), origin)).toMatchObject({
        discussions: [{ url: 'https://forum.test/d/2856-discussie-2856' }],
      })
    },
  )

  it('gives the address without a slug when the discussion has none', () => {
    const answer = JSON.parse(forumAnswer([{ id: 7 }]))

    delete answer.data[0].attributes.slug

    expect(readForum(encode(JSON.stringify(answer)), origin)).toMatchObject({
      discussions: [{ url: 'https://forum.test/d/7/5' }],
    })
  })

  it('keeps nothing but the five fields: no thumbnail, avatar, e-mail address or text of a post', () => {
    const { discussions } = read([{ id: 1 }])
    const stored = JSON.stringify(discussions)

    expect(Object.keys(discussions[0] ?? {}).sort()).toEqual([
      'lastPostedAt',
      'lastPostedBy',
      'replyCount',
      'title',
      'url',
    ])
    expect(stored).not.toContain('thumbnail')
    expect(stored).not.toContain('avatar')
  })

  it('cleans a title of white space and control characters, and keeps its characters as they are', () => {
    const { discussions } = read([{ id: 1, title: ' Spelers &  staf\n\t<b>nieuw</b> \u0007' }])

    expect(discussions[0]?.title).toBe('Spelers & staf <b>nieuw</b>')
  })

  it('skips a discussion with something wrong, says why and reads the others', () => {
    const answer = JSON.parse(forumAnswer([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }]))

    answer.data[0].attributes.title = '   '
    answer.data[1].attributes.commentCount = 'veel'
    answer.data[2].attributes.lastPostedAt = 'gisteren'
    answer.data[3].id = 'abc'
    answer.data[4].relationships.tags.data.push({ id: '404', type: 'tags' })

    const result = readForum(encode(JSON.stringify(answer)), origin)

    expect(result).toMatchObject({ discussions: [{ url: 'https://forum.test/d/6-discussie-6/5' }], kind: 'read' })
    expect(result.kind === 'read' && result.skipped).toEqual([
      { position: 1, reason: 'there is no title' },
      { position: 2, reason: 'there is no valid number of posts' },
      { position: 3, reason: 'there is no valid time of the last post' },
      { position: 4, reason: 'there is no valid id' },
      { position: 5, reason: 'a tag of the discussion is not in the answer' },
    ])
  })

  it('skips a title, a screen name or an address that does not fit the database, and does not cut it off', () => {
    const answer = JSON.parse(forumAnswer([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4, lastPostedUser: 502 }]))

    answer.data[0].attributes.title = 'x'.repeat(501)
    // The last poster of the second discussion, and of the first and third too.
    answer.included.find((resource: { id: string }) => resource.id === '501').attributes.displayName = 'x'.repeat(151)
    answer.data[2].attributes.slug = 'x'.repeat(2100)

    const result = readForum(encode(JSON.stringify(answer)), origin)

    expect(result).toMatchObject({ discussions: [{ url: 'https://forum.test/d/4-discussie-4/5' }], kind: 'read' })
    expect(result.kind === 'read' && result.skipped.map((item) => item.reason)).toEqual([
      'the title is longer than 500 characters',
      'the screen name is longer than 150 characters',
      'the address is longer than 2048 characters',
    ])
  })

  it('gives an empty list for a forum without discussions', () => {
    expect(read([])).toEqual({ discussions: [], kind: 'read', skipped: [] })
  })

  it('gives an empty list when every discussion is in a tag we leave out', () => {
    expect(
      read([
        { id: 1, tags: [10] },
        { id: 2, tags: [9] },
      ]),
    ).toEqual({ discussions: [], kind: 'read', skipped: [] })
  })

  it.each([
    ['text that is not JSON', 'Dit is geen JSON'],
    ['JSON without a list of discussions', '{"errors":[{"status":"500"}]}'],
    ['JSON that is not an object', '[]'],
    ['an empty answer', ''],
  ])('gives an error for %s', (_name, body) => {
    expect(readForum(encode(body), origin).kind).toBe('error')
  })

  it('gives an error, and no empty list, when it holds discussions and none can be read', () => {
    const answer = JSON.parse(forumAnswer([{ id: 1 }, { id: 2 }]))

    for (const discussion of answer.data) {
      delete discussion.attributes.title
    }

    expect(readForum(encode(JSON.stringify(answer)), origin)).toEqual({
      kind: 'error',
      message: 'None of the 2 discussions could be read: there is no title',
    })
  })
})
