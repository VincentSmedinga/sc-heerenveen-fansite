import type { PublicSource } from '@fansite/db/queries'
import type { SourceKind } from '@fansite/db/schema'

import { sourceKinds } from '@fansite/db/schema'

/*
 * How the site words the source register for visitors. Every page that shows what we take from a source uses these,
 * so no page writes its own version.
 */

/** The heading of each kind of source. */
export const kindHeadings = {
  club: 'Club',
  forum: 'Forum',
  news: 'Nieuws',
  podcast: 'Podcasts',
  video: 'Video',
} as const satisfies Record<SourceKind, string>

export type Policy = Pick<PublicSource, 'allowEmbed' | 'allowImage' | 'introMaxLength'>

/**
 * What we show of a source, in plain words: always the headline, the link and the name of the source, and more only
 * when its policy allows it.
 */
export function describePolicy({ allowEmbed, allowImage, introMaxLength }: Policy) {
  const parts = ['kop', 'link', 'bronnaam']

  if (introMaxLength > 0) parts.push('intro')
  if (allowImage) parts.push('afbeelding')
  if (allowEmbed) parts.push('insluiten')

  return `${parts.slice(0, -1).join(', ')} en ${parts.at(-1)}`
}

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
