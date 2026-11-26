import { foldLetters } from '@fansite/db/slug-letters'

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

const collator = new Intl.Collator('nl')

/** What puts a name in a list by name: the family name without prefix, and the given name. */
export type NameOrder = { givenName: string; sortName: string }

/** The order of a list by name: family name without prefix, then given name. */
export function compareByName(a: NameOrder, b: NameOrder): number {
  return (
    collator.compare(foldLetters(a.sortName), foldLetters(b.sortName)) ||
    collator.compare(foldLetters(a.givenName), foldLetters(b.givenName))
  )
}

/**
 * What puts a player in a list by name: the name the importer kept of the person, or without
 * one the name as text. A person without a family name is put in order by the given name.
 */
export function nameOrderOf(name: PersonName, text: string): NameOrder {
  if (personNameParts(name) === undefined) {
    return { givenName: splitPersonName(text).givenName ?? '', sortName: textSortName(text) }
  }

  const family = (name.personFamilyName ?? '').trim()

  return { givenName: family === '' ? '' : (name.personGivenName ?? '').trim(), sortName: personSortName(name) }
}

/** The words that start a surname after the first word, as in `Jan Willem van Hanegem`. */
const surnamePrefixes = new Set(["'t", '’t', 'da', 'de', 'den', 'der', 'di', 'het', 'te', 'ten', 'ter', 'van', 'von'])

const isPrefix = (word: string) => surnamePrefixes.has(word.toLowerCase())

/** A player of the opponent in a report: the name as text, and the person if he is linked. */
export type OpponentPlayer = { name: string; person?: PersonName | undefined }

/**
 * What stands before the surname of a player to tell him from someone with the same surname:
 * the first letter of his given name and a full stop (`J.`), or the whole given name when one
 * of the others starts with the same letter too. It is empty for a player without a given name.
 * The caller decides when there is a namesake at all.
 */
export function leadOfName(
  givenName: null | string | undefined,
  others: readonly (null | string | undefined)[],
): string {
  const given = (givenName ?? '').trim()

  if (given === '') {
    return ''
  }

  const initial = given.charAt(0).toUpperCase()
  const shared = others.some((other) => (other ?? '').trim().charAt(0).toUpperCase() === initial)

  return shared ? given : `${initial}.`
}

/**
 * How the players of the opponent in one line-up are shortened, on the pitch of a match and
 * among the scorers above the score (#1672): the name without the given name, in the order of
 * `players`. When two or more have the same short name, each gets a lead before it (see
 * `leadOfName`): `J.`, or the whole given name when the initial is shared too.
 */
export function shortOpponentNames(players: readonly OpponentPlayer[]): { lead: string; shortName: string }[] {
  const shortened = players.map(withoutGivenName)

  return shortened.map((player, index) => {
    const same = shortened.filter(
      (other, at) => at !== index && other.shortName.toLowerCase() === player.shortName.toLowerCase(),
    )

    return {
      lead:
        same.length === 0
          ? ''
          : leadOfName(
              player.givenName,
              same.map((other) => other.givenName),
            ),
      shortName: player.shortName,
    }
  })
}

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

/**
 * An opponent's name without the given name. A linked person gives his prefix and family name
 * (`van Oevelen`), or the given name when that is all he has. A name as text loses its first
 * word (`Anis Hadj Moussa` is `Hadj Moussa`). A name of one word, or one that starts with a
 * prefix and so has no given name, stays whole.
 */
function withoutGivenName({ name, person }: OpponentPlayer): { givenName: string; shortName: string } {
  const kept = person === undefined ? undefined : personNameParts(person)

  if (kept !== undefined) {
    return kept.surname === ''
      ? { givenName: '', shortName: kept.givenName ?? '' }
      : { givenName: kept.givenName ?? '', shortName: kept.surname }
  }

  const words = name.trim().split(/\s+/)
  const [first = ''] = words

  return words.length < 2 || isPrefix(first)
    ? { givenName: '', shortName: words.join(' ') }
    : { givenName: first, shortName: words.slice(1).join(' ') }
}

/** The year a season starts in: `2004/05` is 2004. */
const startYearOfSeason = (season: string) => Number(season.slice(0, 4))

/**
 * What stands before the surname of one of our players on the page of a match: the lead (see
 * `leadOfName`) when another person of ours with the same surname has a season at most one
 * season from one of his, in `players`. Otherwise it is empty, such as for a player without a
 * person, a surname or a given name. The seasons in between need not exist: one season apart
 * is enough, so twins and a father and son in neighbouring seasons are told apart.
 */
export function leadOfNamesake(
  player:
    | undefined
    | {
        givenName: null | string
        namesakes: readonly { givenName: null | string; seasons: readonly string[] }[]
        seasons: readonly string[]
      },
): string {
  if (player === undefined) {
    return ''
  }

  const years = player.seasons.map(startYearOfSeason)
  const close = player.namesakes.filter((other) =>
    other.seasons.some((season) => years.some((year) => Math.abs(startYearOfSeason(season) - year) <= 1)),
  )

  return close.length === 0
    ? ''
    : leadOfName(
        player.givenName,
        close.map((other) => other.givenName),
      )
}
