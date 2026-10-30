/** A player's name in the two parts `PlayerName` shows: the given name and the surname. */
export type NameParts = {
  /** The given name; absent for a player with one name. */
  givenName?: string | undefined
  /** The surname, in the stronger weight. Empty when the name cannot be split. */
  surname: string
}

/**
 * The name of a player from the title of his Wikipedia page: the title without the addition in
 * brackets that tells pages with the same title apart, so `Pim Verbeek (voetballer, 1999)` is
 * `Pim Verbeek`.
 */
export function pageTitleName(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/**
 * A goal without a player in the table has the name as the page of the match shows it, mostly a
 * surname (`Kemper`, or `D. Rots` when two players share one), and the title of the player's
 * Wikipedia page, which is his full name. The page gives the name and the short name the search
 * term, after the initials it may start with, so `Boy Kemper` is split into `Boy` and `Kemper`.
 * When the short name is no end of the full name, it is not split (see `splitPlayerName`).
 */
export function splitPageName(shortName: string, title: string): NameParts {
  return splitPlayerName(pageTitleName(title), shortName.replace(/^(?:\p{Lu}\.\s*)+/u, ''))
}

/**
 * Splits the name of a player from the table `players`, with his search term, which is the
 * name without the first given name. When the name ends with the search term, at the start of a
 * word, that end is the surname and what comes before it the given name: `Joost van Aken` with
 * `van Aken`, and `Jakob Trenskow` with `Trenskow`. A name that is the search term has no given
 * name (`Dinho`). Anything else, a search term that is no end of the name (a correction for one
 * player, such as `Vente (Dylan)`) or no search term at all, is not split: the whole name is
 * the given name and the surname is empty, so it shows in the normal weight and nothing is
 * split wrongly.
 *
 * A goal without a player in the table has only the name as the page shows it, mostly a
 * surname, so it has no search term and is shown as a surname: use `surnameOnly` for it.
 */
export function splitPlayerName(name: string, searchTerm: string): NameParts {
  const whole = name.trim()
  const term = searchTerm.trim()

  if (term === '') {
    return { givenName: whole, surname: '' }
  }
  if (whole.toLowerCase() === term.toLowerCase()) {
    return { surname: whole }
  }
  if (whole.toLowerCase().endsWith(` ${term.toLowerCase()}`)) {
    const start = whole.length - term.length

    return { givenName: whole.slice(0, start).trimEnd(), surname: whole.slice(start) }
  }

  return { givenName: whole, surname: '' }
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

/** A name as the page shows it, for a player who is not in the table: it is a surname. */
export function surnameOnly(name: string): NameParts {
  return { surname: name }
}
