import type { PersonPart } from '#src/beheer/person-fields'

/** Where the forms of the persons are (issue 1164). There is no list of all persons. */
export const personsPath = '/beheer/personen'

/** The address of one part of the form of a person, as `personPath`. */
export function personPartPath(
  id: number,
  part: PersonPart,
  { back, done }: { back?: string | undefined; done?: string | undefined } = {},
) {
  return withQuery(`${personsPath}/${id}/${part}`, { back, done })
}

/**
 * The address of the form of a person, with what the last action left to say (`done`) and the
 * page to go back to (`back`, only within the admin).
 */
export function personPath(id: number, { back, done }: { back?: string | undefined; done?: string | undefined } = {}) {
  return withQuery(`${personsPath}/${id}`, { back, done })
}

function withQuery(path: string, { back, done }: { back?: string | undefined; done?: string | undefined }) {
  const query = new URLSearchParams()

  if (done !== undefined) {
    query.set('gedaan', done)
  }
  if (back !== undefined) {
    query.set('terug', back)
  }

  return query.size === 0 ? path : `${path}?${query}`
}
