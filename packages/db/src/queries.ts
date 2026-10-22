import { and, asc, desc, eq, gte, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import { items, sources } from './schema.ts'

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
 * The news items published at or after `since`, newest first, from the sources that are switched on, with what the
 * homepage shows of them: the headline, the link, the time, whether it is behind a paywall, and the name of the source.
 * That name is the way the source wants to be credited, or else its own name. The policy and the permission stay
 * internal, and so does every other column, so none of them can reach a page.
 */
export function listRecentItems(db: Database, since: Date) {
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
    .where(and(eq(sources.enabled, true), gte(items.publishedAt, since)))
    .orderBy(desc(items.publishedAt), desc(items.id))
}
