import { asc, eq } from 'drizzle-orm'

import type { Database } from './client.ts'

import { sources } from './schema.ts'

export type PublicSource = Awaited<ReturnType<typeof listEnabledSources>>[number]

/**
 * The sources that are switched on, by name, with what visitors may know about them: the name, the domain, the kind
 * and the display policy. The permission (its status, date and note) stays internal, so it can't reach a page.
 */
export function listEnabledSources(db: Database) {
  return db
    .select({
      allowEmbed: sources.allowEmbed,
      allowImage: sources.allowImage,
      domain: sources.domain,
      introMaxLength: sources.introMaxLength,
      kind: sources.kind,
      name: sources.name,
    })
    .from(sources)
    .where(eq(sources.enabled, true))
    .orderBy(asc(sources.name))
}
