/**
 * The address of the list of items, with the search and what the last action left to say (`fout`, `bericht`,
 * `verborgen` or `getoond`).
 */
export function itemsPath(search: string, extra: Record<string, number | string> = {}) {
  const parameters = new URLSearchParams()

  if (search !== '') {
    parameters.set('q', search)
  }

  for (const [name, value] of Object.entries(extra)) {
    parameters.set(name, String(value))
  }

  const query = parameters.toString()

  return query === '' ? '/beheer/berichten' : `/beheer/berichten?${query}`
}
