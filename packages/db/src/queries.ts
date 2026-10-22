import { asc, eq } from 'drizzle-orm'

import type { Database } from './client.ts'

import { sources } from './schema.ts'

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
