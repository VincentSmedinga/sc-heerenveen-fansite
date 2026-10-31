import { filterHref, filterQuery, joinNames, parseFilterQuery, type SearchParams } from './filter-query'

/**
 * The podcasts and the page that the address of /nieuws/podcasts asks for, or undefined when
 * the address is wrong (see `parseFilterQuery`). `podcast` may be given more than once, one
 * slug for each podcast, in any order. The slugs are not checked against the podcasts here:
 * that takes the list of podcasts.
 */
export function parsePodcastsQuery(searchParams: SearchParams) {
  const query = parseFilterQuery(searchParams, 'podcast')

  return query && { page: query.page, podcasts: query.values }
}

/**
 * The heading of the page: "Podcasts", with the names of the podcasts that are chosen after
 * "van": "A", "A en B" or "A, B en C".
 */
export function podcastsHeading(names: readonly string[]) {
  return names.length === 0 ? 'Podcasts' : `Podcasts van ${joinNames(names)}`
}

/** The address of /nieuws/podcasts for podcasts and a page, as `podcastsQuery` makes it. */
export function podcastsHref(podcasts: readonly string[], page: number) {
  return filterHref('/nieuws/podcasts', podcastsQuery(podcasts, page))
}

/**
 * The query of /nieuws/podcasts for podcasts (their slugs, in the order of the list of
 * podcasts) and a page, without the question mark. It is empty for the first page of all
 * podcasts: no podcast and all podcasts are the same page.
 */
export function podcastsQuery(podcasts: readonly string[], page: number) {
  return filterQuery('podcast', podcasts, page)
}

/** The title of a page: the heading, with the page when it is not the first. */
export function podcastsTitle(names: readonly string[], page: number) {
  return `${podcastsHeading(names)}${page > 1 ? `, pagina ${page}` : ''}`
}
