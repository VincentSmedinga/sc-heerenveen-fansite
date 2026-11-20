import { screenNameMaxLength } from '@fansite/db/schema'

// The rules of a screen name of a supporter (issue 1446). Pure functions, so the tests show
// each rule; the database keeps the normalised form as a unique key.

/** The fewest characters of a screen name. */
export const screenNameMinLength = 3

export { screenNameMaxLength }

/**
 * The names that would pass for the club, the editors or the site. A screen name is refused
 * when its normalised form contains the normalised form of one of these, so "SC Heer3nveen",
 * "Fansite_Redactie" and "Badminton" (it holds "admin") are refused too. A Builder may add a
 * name.
 */
export const refusedNames = [
  'sc Heerenveen',
  'Heerenveen',
  'Fansite',
  'redactie',
  'beheer',
  'beheerder',
  'admin',
  'moderator',
  'webmaster',
] as const

export type ScreenNameCheck = ScreenNameProblem | { key: string; name: string; problem?: undefined }

/** Why a screen name is refused, with the character that can't be used for `character`. */
export type ScreenNameProblem =
  | { character: string; problem: 'character' }
  | { problem: 'empty' }
  | { problem: 'length' }
  | { problem: 'no-letter' }
  | { problem: 'refused' }
  | { problem: 'spaces' }

/**
 * The letters a screen name may have: the Latin alphabet, with or without an accent (Latin-1
 * and Latin Extended-A, and the comma below of Romanian). Letters of other scripts, such as the
 * Cyrillic а that looks like a Latin a, fullwidth letters and combining marks that are left
 * after composing are not in it.
 */
const letter = /[A-Za-zÀ-ÖØ-öø-ſȘ-ț]/u
const allowed = new RegExp(`^(?:${letter.source}|[0-9 _-])$`, 'u')

/**
 * Checks a screen name as it was typed: the spaces around it go, and then it must have 3 to 20
 * characters of the Latin alphabet, digits, single spaces, `-` and `_`, and not pass for the
 * club, the editors or the site. Gives the name to keep and its normalised form, or the
 * problem.
 */
export function checkScreenName(value: string): ScreenNameCheck {
  const name = value.normalize('NFC').trim()

  if (name === '') {
    return { problem: 'empty' }
  }

  const wrong = [...name].find((character) => !allowed.test(character))

  if (wrong !== undefined) {
    return { character: wrong, problem: 'character' }
  }

  const length = [...name].length

  if (length < screenNameMinLength || length > screenNameMaxLength) {
    return { problem: 'length' }
  }

  if (name.includes('  ')) {
    return { problem: 'spaces' }
  }

  const key = screenNameKey(name)

  // A name of only spaces, - and _ has an empty normalised form, which every such name shares.
  if (key === '') {
    return { problem: 'no-letter' }
  }

  if (refusedKeys.some((refused) => key.includes(refused))) {
    return { problem: 'refused' }
  }

  return { key, name }
}

/** Letters that keep their look without the accent, written as the letters they look like. */
const foldedLetters: Readonly<Record<string, string>> = {
  æ: 'ae',
  đ: 'd',
  ð: 'd',
  ħ: 'h',
  ĳ: 'ij',
  ı: 'i',
  ł: 'l',
  ŀ: 'l',
  ŋ: 'n',
  ø: 'o',
  œ: 'oe',
  ĸ: 'k',
  ſ: 's',
  ß: 'ss',
  ŧ: 't',
  þ: 'th',
}

/**
 * Characters that look alike, written as one of them: a digit as the letter it looks like, and
 * the i and the l as the 1 does (an I is an l in many fonts).
 */
const lookAlikes: Readonly<Record<string, string>> = {
  '0': 'o',
  '1': 'l',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  i: 'l',
}

/**
 * The normalised form of a screen name, which must be unique: in lowercase, without accents,
 * without spaces, `-` and `_`, and with characters that look alike made the same, so
 * "Tjalle99", "tjálle 99" and "TJALLE_99" are one name, and so are "Sjoerd" and "SJ0ERD". Two
 * letters that read as one (rn as m, vv as w) are one too.
 */
export function screenNameKey(name: string) {
  return [...name.normalize('NFD').replaceAll(/\p{M}/gu, '').toLowerCase()]
    .map((character) => foldedLetters[character] ?? character)
    .join('')
    .replaceAll(/[ _-]/g, '')
    .replaceAll(/[013457i]/g, (character) => lookAlikes[character] ?? character)
    .replaceAll('rn', 'm')
    .replaceAll('vv', 'w')
}

const refusedKeys = refusedNames.map((name) => screenNameKey(name))
