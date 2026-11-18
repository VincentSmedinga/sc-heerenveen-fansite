import type { PublicSource } from '@fansite/db/queries'
import type { SourceKind } from '@fansite/db/schema'

import { sourceKinds } from '@fansite/db/schema'

/*
 * How the site shows the source register to visitors: a heading for each kind, and the address
 * of each website.
 */

/** The heading of each kind of source. */
export const kindHeadings = {
  club: 'Club',
  forum: 'Forum',
  news: 'Nieuws',
  podcast: 'Podcasts',
  video: 'Video',
} as const satisfies Record<SourceKind, string>

/** The anchor of the heading of each kind of source on the page Onze bronnen. */
export const kindAnchors = {
  club: 'club',
  forum: 'forum',
  news: 'nieuws',
  podcast: 'podcasts',
  video: 'video',
} as const satisfies Record<SourceKind, string>

/**
 * The sources from Friesland, by domain: they come first on the page Onze bronnen, since the
 * club is Frisian. The rank is a list here and not a column in the register, because it only
 * orders one page and changes about as often as we take a new Frisian source.
 */
const frisianDomains: ReadonlySet<string> = new Set([
  'omny.fm',
  'radiocamataru.podbean.com',
  'www.frieschdagblad.nl',
  'www.lc.nl',
  'www.omropfryslan.nl',
])

/** The national sources, by domain: they come after the Frisian ones and before the rest. */
const nationalDomains: ReadonlySet<string> = new Set([
  'nos.nl',
  'www.ad.nl',
  'www.espn.nl',
  'www.nd.nl',
  'www.parool.nl',
  'www.telegraaf.nl',
  'www.trouw.nl',
  'www.vi.nl',
  'www.volkskrant.nl',
])

/**
 * The sources grouped by kind, in the order of the kinds in the schema: news, podcasts, forum,
 * club and video. A kind without sources is left out. In a group the Frisian sources come
 * first, then the national ones and then the rest, each in the order they came in.
 */
export function groupByKind<Source extends Pick<PublicSource, 'domain' | 'kind'>>(sources: readonly Source[]) {
  return sourceKinds
    .map((kind) => ({
      heading: kindHeadings[kind],
      kind,
      sources: sources.filter((source) => source.kind === kind).toSorted((a, b) => regionRank(a) - regionRank(b)),
    }))
    .filter((group) => group.sources.length > 0)
}

/** 0 for a Frisian source, 1 for a national one and 2 for every other. */
export function regionRank({ domain }: Pick<PublicSource, 'domain'>) {
  if (frisianDomains.has(domain)) {
    return 0
  }

  return nationalDomains.has(domain) ? 1 : 2
}

/** The address of a source's website. The register holds only the domain. */
export function websiteOf({ domain }: Pick<PublicSource, 'domain'>) {
  return `https://${domain}`
}
