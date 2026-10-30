/** The query of a page of the news archive, as Next.js gives it. */
export type SearchParams = Record<string, string | string[] | undefined>

/**
 * The heading of the page: "Nieuwsarchief", with the names of the sources that are chosen after
 * "van": "A", "A en B" or "A, B en C".
 */
export function archiveHeading(names: readonly string[]) {
  const last = names.at(-1)

  if (last === undefined) {
    return 'Nieuwsarchief'
  }

  return `Nieuwsarchief van ${names.length === 1 ? last : `${names.slice(0, -1).join(', ')} en ${last}`}`
}

/** The address of /nieuws for sources and a page, as `archiveQuery` makes the query. */
export function archiveHref(sources: readonly string[], page: number) {
  const query = archiveQuery(sources, page)

  return query === '' ? '/nieuws' : `/nieuws?${query}`
}

/**
 * The query of /nieuws for sources (their slugs, in the order of the list of sources) and a
 * page, without the question mark. It is empty for the first page of all sources: no source
 * and all sources are the same page.
 */
export function archiveQuery(sources: readonly string[], page: number) {
  const parameters = new URLSearchParams()

  for (const source of sources) {
    parameters.append('bron', source)
  }
  if (page > 1) {
    parameters.set('pagina', String(page))
  }

  return parameters.toString()
}

/** The title of a page: the heading, with the page when it is not the first. */
export function archiveTitle(names: readonly string[], page: number) {
  return `${archiveHeading(names)}${page > 1 ? `, pagina ${page}` : ''}`
}

/**
 * The sources and the page that the address of /nieuws asks for, or undefined when the address
 * is wrong: a `pagina` that is given twice or is not a positive whole number written without
 * anything else (such as `0`, `-1`, `2.5` or `abc`), or a `bron` that is given twice with the
 * same slug. `bron` may be given more than once, one slug for each source, in any order. The
 * slugs are not checked against the sources here: that takes the list of sources.
 */
export function parseArchiveQuery(searchParams: SearchParams) {
  const { bron, pagina } = searchParams

  if (Array.isArray(pagina)) {
    return undefined
  }
  if (pagina !== undefined && !/^[1-9]\d{0,8}$/u.test(pagina)) {
    return undefined
  }

  const sources = bron === undefined ? [] : Array.isArray(bron) ? bron : [bron]

  if (new Set(sources).size !== sources.length) {
    return undefined
  }

  return { page: pagina === undefined ? 1 : Number(pagina), sources }
}
