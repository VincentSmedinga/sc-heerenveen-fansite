export const supportersPath = '/beheer/supporters'

/** The address of the list, with a search and a page. Both are left out when they are empty. */
export function listPath(query = '', page = 1) {
  const parameters = new URLSearchParams()

  if (query !== '') {
    parameters.set('zoek', query)
  }

  if (page > 1) {
    parameters.set('pagina', String(page))
  }

  const text = parameters.toString()

  return text === '' ? supportersPath : `${supportersPath}?${text}`
}

/** The address of the page of one account, with what the last action left to say (`gedaan`). */
export function supporterPath(id: number, done?: string) {
  return done === undefined ? `${supportersPath}/${id}` : `${supportersPath}/${id}?gedaan=${done}`
}
