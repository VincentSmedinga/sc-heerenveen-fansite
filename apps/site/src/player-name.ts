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

/** The words that start a surname after the first word, as in `Jan Willem van Hanegem`. */
const surnamePrefixes = new Set(["'t", '’t', 'da', 'de', 'den', 'der', 'di', 'het', 'te', 'ten', 'ter', 'van', 'von'])

const isPrefix = (word: string) => surnamePrefixes.has(word.toLowerCase())

/**
 * The name of a person of whom we only have the name as text (a trainer, or a scorer without a
 * person) in the two parts `PlayerName` shows. The first word is the given name and the rest
 * the surname. When a word after the first is a prefix (`van`, `de`, `der`, ...), the surname
 * starts there, so a second given name stays with the first: `Jan Willem van Hanegem` is `Jan
 * Willem` and `van Hanegem`. A name that starts with a prefix, or of one word, is all surname.
 * Nothing else is guessed: `Jon Dahl Tomasson` is `Jon` and `Dahl Tomasson`.
 */
export function splitPersonName(name: string): NameParts {
  const words = name.trim().split(/\s+/)
  const [first = ''] = words

  if (words.length < 2 || isPrefix(first)) {
    return { surname: words.join(' ') }
  }

  const start = words.findIndex((word, index) => index > 0 && isPrefix(word))
  const at = start === -1 ? 1 : start

  return { givenName: words.slice(0, at).join(' '), surname: words.slice(at).join(' ') }
}

/**
 * What a list is put in order by for a name given as text: the surname of `splitPersonName`
 * without its prefix, so `Joost van Aken` stands under the A, like a person with a family name.
 */
export function textSortName(name: string): string {
  const words = splitPersonName(name).surname.split(' ')
  const at = words.findIndex((word) => !isPrefix(word))

  return (at === -1 ? words : words.slice(at)).join(' ')
}
