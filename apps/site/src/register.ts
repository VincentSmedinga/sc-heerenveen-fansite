import type { PublicSource } from '@fansite/db/queries'
import type { SourceKind } from '@fansite/db/schema'

import { sourceKinds } from '@fansite/db/schema'

/* How the site shows the source register to visitors: a heading for each kind, and the address of each website. */

/** The heading of each kind of source. */
export const kindHeadings = {
  club: 'Club',
  forum: 'Forum',
  news: 'Nieuws',
  podcast: 'Podcasts',
  video: 'Video',
} as const satisfies Record<SourceKind, string>

/**
 * The sources grouped by kind, in the order of the kinds in the schema: news, podcasts, forum, club and video. A kind
 * without sources is left out.
 */
export function groupByKind<Source extends Pick<PublicSource, 'kind'>>(sources: readonly Source[]) {
  return sourceKinds
    .map((kind) => ({
      heading: kindHeadings[kind],
      kind,
      sources: sources.filter((source) => source.kind === kind),
    }))
    .filter((group) => group.sources.length > 0)
}

/** The address of a source's website. The register holds only the domain. */
export function websiteOf({ domain }: Pick<PublicSource, 'domain'>) {
  return `https://${domain}`
}
