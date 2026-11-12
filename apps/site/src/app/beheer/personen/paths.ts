import type { PersonPart } from '#src/beheer/person-fields'

/** Where the forms of the persons are (issue 1164). There is no list of all persons. */
export const personsPath = '/beheer/personen'

type Query = { back?: string | undefined; column?: string | undefined; done?: string | undefined }

/**
 * The address of one part of the form of a person, as `personPath`, with the column of the
 * table of Kwaliteit that the editor works through (`kolom`, issue 1165).
 */
export function personPartPath(id: number, part: PersonPart, query: Query = {}) {
  return withQuery(`${personsPath}/${id}/${part}`, query)
}

/**
 * The address of the form of a person, with what the last action left to say (`done`) and the
 * page to go back to (`back`, only within the admin).
 */
export function personPath(id: number, { back, done }: Omit<Query, 'column'> = {}) {
  return withQuery(`${personsPath}/${id}`, { back, done })
}

function withQuery(path: string, { back, column, done }: Query) {
  const query = new URLSearchParams()

  if (done !== undefined) {
    query.set('gedaan', done)
  }
  if (back !== undefined) {
    query.set('terug', back)
  }
  if (column !== undefined) {
    query.set('kolom', column)
  }

  return query.size === 0 ? path : `${path}?${query}`
}
