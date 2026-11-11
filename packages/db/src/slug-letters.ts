/**
 * The letters without a loose accent, which `normalize('NFKD')` leaves as they are (#1113), and
 * what they give in an address. The list is here and nowhere else: the address of a person
 * (`personSlug`) and the address of a club (`clubSlug`, #1121) both read it. `lostLetters` is
 * for the tests that fail when a name has a letter that is neither in this list nor an ASCII
 * letter with accents.
 */
export const slugLetters: Readonly<Record<string, string>> = {
  æ: 'ae',
  đ: 'dj',
  ð: 'd',
  ı: 'i',
  ł: 'l',
  ø: 'o',
  œ: 'oe',
  ß: 'ss',
  þ: 'th',
}

const slugLetterPattern = new RegExp(`[${Object.keys(slugLetters).join('')}]`, 'gu')

/**
 * The name in lowercase, without accents and with the letters of `slugLetters` written out:
 * the first step of an address. `overrides` changes what a letter gives for one address, such
 * as the đ of a Vietnamese person, which is a d.
 */
export function foldLetters(name: string, overrides: Readonly<Record<string, string>> = {}): string {
  const letters: Readonly<Record<string, string>> = { ...slugLetters, ...overrides }

  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(slugLetterPattern, (letter) => letters[letter] ?? letter)
}

/**
 * The letters of a name that give nothing in an address, so a name does not lose one without us
 * noticing: a letter that is not ASCII after the accents and the letters of `slugLetters` are
 * dealt with. Empty for a name that keeps all its letters.
 */
export function lostLetters(name: string): string[] {
  return [...foldLetters(name)].filter((letter) => /\p{L}/u.test(letter) && !/[a-z]/u.test(letter))
}
