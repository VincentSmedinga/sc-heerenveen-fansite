import type { Person } from '@fansite/db/schema'

/**
 * The names of two persons as a sentence or a button names them: the name, or the title, or
 * the number. Two persons with the same name get their number behind it, so they differ.
 */
export function personLabels(
  a: Pick<Person, 'id' | 'name' | 'wikipediaPage'>,
  b: Pick<Person, 'id' | 'name' | 'wikipediaPage'>,
): [string, string] {
  const label = (person: typeof a) => person.name ?? person.wikipediaPage ?? `persoon ${person.id}`

  return label(a) === label(b)
    ? [`${label(a)} (persoon ${a.id})`, `${label(b)} (persoon ${b.id})`]
    : [label(a), label(b)]
}
