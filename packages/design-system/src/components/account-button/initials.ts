/** The separators between the parts of a screen name: a space, a hyphen and an underscore. */
const separators = /[\s_-]+/u

/** A letter in any script, so digits and other signs are passed over. */
const letter = /\p{L}/u

/**
 * The initials of a screen name, for the AccountButton: the first letter of the first part
 * and of the last part, in capitals. The parts are split on a space, a hyphen and an
 * underscore, and digits and other signs that are not letters do not count, so "Tjalle99"
 * is "T" and "Blauwwit_Sjoerd" is "BS". A name with one part gives one letter, a name
 * without any letter gives an empty string.
 */
export const screenNameInitials = (screenName: string): string => {
  const firsts = screenName
    .split(separators)
    .map((part) => letter.exec(part)?.[0])
    .filter((first): first is string => first !== undefined)

  if (firsts.length === 0) {
    return ''
  }

  const first = firsts[0] ?? ''
  const last = firsts.length > 1 ? (firsts.at(-1) ?? '') : ''

  return `${first}${last}`.toUpperCase()
}
