/** A player's name in the two parts `PlayerName` shows: the given name and the surname. */
export type NameParts = {
  /** The given name; absent for a player with one name. */
  givenName?: string | undefined
  /** The surname, in the stronger weight. Empty when the name cannot be split. */
  surname: string
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

/** A name as the page shows it, for a player who is not in the table: it is a surname. */
export function surnameOnly(name: string): NameParts {
  return { surname: name }
}
