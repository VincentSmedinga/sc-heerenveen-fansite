import { and, asc, count, desc, eq, exists, isNotNull, lte, ne, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import { discussions, items, sources } from './schema.ts'

export type PublicDiscussion = Awaited<ReturnType<typeof listNewestDiscussions>>[number]

export type PublicEpisode = Awaited<ReturnType<typeof listPodcastEpisodes>>[number]

export type PublicItem = Awaited<ReturnType<typeof listRecentItems>>[number]

export type PublicPodcast = Awaited<ReturnType<typeof listPodcasts>>[number]

export type PublicSource = Awaited<ReturnType<typeof listEnabledSources>>[number]

/** How many episodes `listPodcastEpisodes` gives in all, with the same `until` and `podcast`. */
export async function countPodcastEpisodes(db: Database, { podcast, until }: { podcast?: string; until: Date }) {
  const [row] = await db
    .select({ total: count() })
    .from(items)
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(episodeFilter(until, podcast))

  return row?.total ?? 0
}

/**
 * The podcast with this slug, when it is switched on: its name, its description in our own words, which is null when
 * it has none, and the addresses where it can be found on Apple Podcasts and Spotify, which are null when it has none.
 * It gives nothing for another source, so a slug of a news source is unknown here.
 */
export async function findPodcast(db: Database, slug: string) {
  const [row] = await db
    .select({
      applePodcastsUrl: sources.applePodcastsUrl,
      description: sources.description,
      name: sql<string>`coalesce(nullif(${sources.attribution}, ''), ${sources.name})`.as('podcast_name'),
      slug: sql<string>`${sources.slug}`.as('slug'),
      spotifyUrl: sources.spotifyUrl,
    })
    .from(sources)
    .where(and(eq(sources.enabled, true), eq(sources.kind, 'podcast'), hasSlug(slug)))

  return row
}

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
 * The importer keeps the newest five, so `limit` only matters when there is more than one forum.
 */
export function listNewestDiscussions(db: Database, limit = 5) {
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
 * The episodes of the podcasts that are switched on, newest first, from `offset`, at most `limit`, with what the pages
 * show of them: the title, the link to the page of the episode, the time, the name of the podcast, and the duration, the
 * season and the number of the episode, which are null when the feed gives none. That name is the
 * way the podcast wants to be credited, or else its own name. Every other column stays internal, so none can reach a
 * page. Give the `slug` of a podcast as `podcast` to get the episodes of that podcast only.
 *
 * Pass the moment of now as `until`, as with `listRecentItems`: an episode a feed dated later doesn't belong on top.
 */
export function listPodcastEpisodes(
  db: Database,
  { limit, offset = 0, podcast, until }: { limit: number; offset?: number; podcast?: string; until: Date },
) {
  return db
    .select({
      durationSeconds: items.durationSeconds,
      episodeNumber: items.episodeNumber,
      publishedAt: items.publishedAt,
      seasonNumber: items.seasonNumber,
      sourceName: sql<string>`coalesce(nullif(${sources.attribution}, ''), ${sources.name})`.as('source_name'),
      title: items.title,
      url: items.url,
    })
    .from(items)
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(episodeFilter(until, podcast))
    .orderBy(desc(items.publishedAt), desc(items.id))
    .limit(limit)
    .offset(offset)
}

/**
 * The podcasts that are switched on and have a slug and at least one episode, by name, with what the filter shows of
 * them: the name, the way the podcast wants to be credited, and the slug for the address.
 */
export function listPodcasts(db: Database) {
  return db
    .select({
      name: sql<string>`coalesce(nullif(${sources.attribution}, ''), ${sources.name})`.as('podcast_name'),
      slug: sql<string>`${sources.slug}`.as('slug'),
    })
    .from(sources)
    .where(
      and(
        eq(sources.enabled, true),
        eq(sources.kind, 'podcast'),
        isNotNull(sources.slug),
        exists(
          db
            .select({ one: sql`1` })
            .from(items)
            .where(eq(items.sourceId, sources.id)),
        ),
      ),
    )
    .orderBy(asc(sources.name))
}

/**
 * The newest `limit` news items published up to and including `until`, newest first, from the sources that are switched
 * on, with what the homepage shows of them: the headline, the link, the time, whether it is behind a paywall, and the
 * name of the source. That name is the way the source wants to be credited, or else its own name. The policy and the
 * permission stay internal, and so does every other column, so none of them can reach a page.
 *
 * The episodes of a podcast are items too, but they are not news, so a source of kind podcast gives none.
 *
 * Pass the moment of now as `until`: the importer keeps a time up to a day ahead, because feeds are sometimes wrong
 * about their clock, and such an item doesn't belong on top.
 */
export function listRecentItems(db: Database, { limit, until }: { limit: number; until: Date }) {
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
    .where(and(eq(sources.enabled, true), ne(sources.kind, 'podcast'), lte(items.publishedAt, until)))
    .orderBy(desc(items.publishedAt), desc(items.id))
    .limit(limit)
}

/** The conditions that make an item an episode to show: of a podcast that is switched on, not later than `until`, and of the podcast with this slug when `podcast` is given. */
function episodeFilter(until: Date, podcast: string | undefined) {
  return and(
    eq(sources.enabled, true),
    eq(sources.kind, 'podcast'),
    lte(items.publishedAt, until),
    podcast === undefined ? undefined : hasSlug(podcast),
  )
}

/**
 * Whether the source has exactly this slug. The column ignores case and accents, which keeps two slugs that differ only
 * in those from both being in the register, but an address must name one podcast only, so this compares byte for byte.
 */
function hasSlug(slug: string) {
  return sql`${sources.slug} = ${slug} collate utf8mb4_bin`
}
