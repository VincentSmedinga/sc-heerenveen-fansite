/** The query of a page with a filter and pagination, as Next.js gives it. */
export type SearchParams = Record<string, string | string[] | undefined>

/** The address of a page for a query from `filterQuery`: the path alone when it is empty. */
export function filterHref(path: string, query: string) {
  return query === '' ? path : `${path}?${query}`
}

/**
 * The query of a page with a choice of values (their slugs, in the order of the list) under one
 * parameter, and a page, without the question mark. It is empty for the first page of all
 * values: none chosen and all chosen are the same page.
 */
export function filterQuery(parameter: string, values: readonly string[], page: number) {
  const parameters = new URLSearchParams()

  for (const value of values) {
    parameters.append(parameter, value)
  }
  if (page > 1) {
    parameters.set('pagina', String(page))
  }

  return parameters.toString()
}

/** The names in a sentence: "A", "A en B" or "A, B en C". It is empty for none. */
export function joinNames(names: readonly string[]) {
  const last = names.at(-1)

  if (last === undefined) {
    return ''
  }

  return names.length === 1 ? last : `${names.slice(0, -1).join(', ')} en ${last}`
}

/**
 * The values of the parameter and the page that the address of a page with a filter asks for,
 * or undefined when the address is wrong: a `pagina` that is given twice or is not a positive
 * whole number written without anything else (such as `0`, `-1`, `2.5` or `abc`), or a value
 * that is given twice. The parameter may be given more than once, in any order. The values are
 * not checked against the list here: that takes the list.
 */
export function parseFilterQuery(searchParams: SearchParams, parameter: string) {
  const { pagina, [parameter]: given } = searchParams

  if (Array.isArray(pagina)) {
    return undefined
  }
  if (pagina !== undefined && !/^[1-9]\d{0,8}$/u.test(pagina)) {
    return undefined
  }

  const values = given === undefined ? [] : Array.isArray(given) ? given : [given]

  if (new Set(values).size !== values.length) {
    return undefined
  }

  return { page: pagina === undefined ? 1 : Number(pagina), values }
}
