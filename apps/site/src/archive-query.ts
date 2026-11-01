import { filterHref, filterQuery, joinNames, parseFilterQuery, type SearchParams } from './filter-query'

export type { SearchParams }

/**
 * The heading of the page: "Nieuws", with the names of the sources that are chosen after
 * "van": "A", "A en B" or "A, B en C".
 */
export function archiveHeading(names: readonly string[]) {
  return names.length === 0 ? 'Nieuws' : `Nieuws van ${joinNames(names)}`
}

/** The address of /nieuws for sources and a page, as `archiveQuery` makes the query. */
export function archiveHref(sources: readonly string[], page: number) {
  return filterHref('/nieuws', archiveQuery(sources, page))
}

/**
 * The query of /nieuws for sources (their slugs, in the order of the list of sources) and a
 * page, without the question mark. It is empty for the first page of all sources: no source
 * and all sources are the same page.
 */
export function archiveQuery(sources: readonly string[], page: number) {
  return filterQuery('bron', sources, page)
}

/** The title of a page: the heading, with the page when it is not the first. */
export function archiveTitle(names: readonly string[], page: number) {
  return `${archiveHeading(names)}${page > 1 ? `, pagina ${page}` : ''}`
}

/**
 * The sources and the page that the address of /nieuws asks for, or undefined when the address
 * is wrong (see `parseFilterQuery`). `bron` may be given more than once, one slug for each
 * source, in any order. The slugs are not checked against the sources here: that takes the list
 * of sources.
 */
export function parseArchiveQuery(searchParams: SearchParams) {
  const query = parseFilterQuery(searchParams, 'bron')

  return query && { page: query.page, sources: query.values }
}
