/** A player's name in the two parts `PlayerName` shows: the given name and the surname. */
export type NameParts = {
  /** The given name; absent for a player with one name. */
  givenName?: string | undefined
  /** The surname, in the stronger weight. Empty when the name cannot be split. */
  surname: string
}

/** The name the importer kept of a person (#715), as the queries give it. */
export type PersonName = {
  personFamilyName: null | string
  personFamilyNamePrefix: null | string
  personGivenName: null | string
}

/**
 * The name of a person in the two parts `PlayerName` shows, as the importer kept it: the given
 * name in the normal weight, and the prefix and the family name together in the stronger one
 * (`Joost` and `van Aken`). A person with one name has a family name and no given name
 * (`Dinho`), and a person without a family name shows the given name alone, in the normal
 * weight. Nothing is guessed: when the importer kept no name, it gives `undefined`.
 */
export function personNameParts(name: PersonName): NameParts | undefined {
  const given = (name.personGivenName ?? '').trim()
  const family = [name.personFamilyNamePrefix, name.personFamilyName]
    .map((part) => (part ?? '').trim())
    .filter((part) => part !== '')
    .join(' ')

  if (family === '') {
    return given === '' ? undefined : { givenName: given, surname: '' }
  }

  return given === '' ? { surname: family } : { givenName: given, surname: family }
}

/**
 * What a list of people is put in order by: the family name without its prefix, so Joost van
 * Aken stands under the A, and the given name for a person without a family name.
 */
export function personSortName(name: PersonName): string {
  return (name.personFamilyName ?? '').trim() || (name.personGivenName ?? '').trim()
}

/**
 * The name of a person of the staff in the two parts `PlayerName` shows: the first word is the
 * given name and the rest the surname, so `Robin van Persie` is `Robin` and `van Persie`, and
 * `Jan Olde Riekerink` is `Jan` and `Olde Riekerink`. A name of one word is a surname.
 */
export function splitStaffName(name: string): NameParts {
  const [first = '', ...rest] = name.trim().split(/\s+/)

  return rest.length === 0 ? { surname: first } : { givenName: first, surname: rest.join(' ') }
}

/** A name as the page shows it, for a goal without a person: it is a surname. */
export function surnameOnly(name: string): NameParts {
  return { surname: name }
}
