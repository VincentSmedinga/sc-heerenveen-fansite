import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import { discussions, items, sources } from './schema.ts'

export type PublicDiscussion = Awaited<ReturnType<typeof listNewestDiscussions>>[number]

export type PublicItem = Awaited<ReturnType<typeof listRecentItems>>[number]

export type PublicSource = Awaited<ReturnType<typeof listEnabledSources>>[number]

/**
 * The sources that are switched on, by name, with what the page 'Onze bronnen' shows of them: the name, the domain, the
 * kind and the description. The policy and the permission stay internal, so they can't reach a page.
 */
export function listEnabledSources(db: Database) {
  return db
    .select({
      description: sources.description,
      domain: sources.domain,
      kind: sources.kind,
      name: sources.name,
    })
    .from(sources)
    .where(eq(sources.enabled, true))
    .orderBy(asc(sources.name))
}

/**
 * The discussions the importer kept of the forums that are switched on, the one with the latest post first, with what the
 * homepage shows of them: the title, the address, the number of replies, the time of the last post and the screen name of
 * whoever wrote it, which is null when the forum doesn't say. Every other column stays internal, so none can reach a page.
 *
 * The importer keeps the newest four, so `limit` only matters when there is more than one forum.
 */
export function listNewestDiscussions(db: Database, limit = 4) {
  return db
    .select({
      lastPostedAt: discussions.lastPostedAt,
      lastPostedBy: discussions.lastPostedBy,
      replyCount: discussions.replyCount,
      title: discussions.title,
      url: discussions.url,
    })
    .from(discussions)
    .innerJoin(sources, eq(discussions.sourceId, sources.id))
    .where(eq(sources.enabled, true))
    .orderBy(desc(discussions.lastPostedAt), desc(discussions.id))
    .limit(limit)
}

/**
 * The news items published from `since` up to and including `until`, newest first, from the sources that are switched
 * on, with what the homepage shows of them: the headline, the link, the time, whether it is behind a paywall, and the
 * name of the source. That name is the way the source wants to be credited, or else its own name. The policy and the
 * permission stay internal, and so does every other column, so none of them can reach a page.
 *
 * Pass the moment of now as `until`: the importer keeps a time up to a day ahead, because feeds are sometimes wrong
 * about their clock, and such an item doesn't belong under a day that hasn't begun.
 */
export function listRecentItems(db: Database, since: Date, until: Date) {
  return db
    .select({
      paywalled: items.paywalled,
      publishedAt: items.publishedAt,
      sourceName: sql<string>`coalesce(nullif(${sources.attribution}, ''), ${sources.name})`.as('source_name'),
      title: items.title,
      url: items.url,
    })
    .from(items)
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(and(eq(sources.enabled, true), gte(items.publishedAt, since), lte(items.publishedAt, until)))
    .orderBy(desc(items.publishedAt), desc(items.id))
}
