import type { PersonName } from '@fansite/db/persons'

import { personNameLimits } from '@fansite/db/schema'

/**
 * The small words that start a family name or stand between the given names and it: `van`,
 * `de`, `der` and the like. They go in the prefix of the family name, apart from the family
 * name itself, so a list can sort Joost van Aken under the A.
 */
export const familyNamePrefixes: ReadonlySet<string> = new Set([
  'al',
  'bin',
  'da',
  'das',
  'de',
  'del',
  'den',
  'der',
  'di',
  'do',
  'dos',
  'du',
  'el',
  'ibn',
  'la',
  'le',
  'te',
  'ten',
  'ter',
  'van',
  'von',
])

/** A name given by hand for a title that neither the sort key nor the guess gets right. */
export type PersonNameEntry = {
  familyName: string
  familyNamePrefix?: string
  givenName?: string
  title: string
}

/** Whether the parts fit the columns of `persons`. A name that is too long is not stored. */
export function fitsColumns(name: PersonName): boolean {
  return (
    name.name.length <= personNameLimits.name &&
    (name.givenName?.length ?? 0) <= personNameLimits.givenName &&
    (name.familyNamePrefix?.length ?? 0) <= personNameLimits.familyNamePrefix &&
    name.familyName.length <= personNameLimits.familyName
  )
}

/** The map for `personNameOf`: a title to the name the list gives it. */
export function manualNames(list: readonly PersonNameEntry[]): Map<string, PersonName> {
  return new Map(
    list.map(({ familyName, familyNamePrefix, givenName, title }) => [
      title,
      partsToName({ familyName, familyNamePrefix: familyNamePrefix ?? null, givenName: givenName ?? null }, 'manual'),
    ]),
  )
}

/** The name of a title: the title without the addition between brackets. */
export function nameOfTitle(title: string): string {
  return title.replace(/\s*\([^()]*\)\s*$/u, '').trim()
}

/**
 * The name of a person from the title of his article, the sort key of it, and the list of
 * names given by hand: the list first, then the sort key when it fits the title, and else a
 * guess. The title with the addition between brackets taken off is the `name`, so an accent
 * stays: `Pelé van Anholt` and not `Pele van Anholt`.
 *
 * A sort key fits when its family name is the end of the title, whatever the accents, the
 * capitals, the full stops and the hyphens: `Anholt, Pele van` fits `Pelé van Anholt` and `St
 * Juste, Jerry` fits `Jerry St. Juste`. The small words just before the family name, and those
 * that start it, are the prefix. The guess takes the last word as the family name, and the
 * small words before it as the prefix. A name of one word is a family name only.
 */
export function personNameOf(
  title: string,
  sortKey: null | string,
  manual: ReadonlyMap<string, PersonName> = new Map(),
): PersonName {
  const listed = manual.get(title)

  if (listed !== undefined) {
    return listed
  }

  const words = nameOfTitle(title).split(/\s+/u).filter(Boolean)
  const key = sortKey?.split(',')[0]?.trim()
  const fitted = key === undefined || key === '' ? null : familyWordsOf(words, key)

  return partsToName(split(words, fitted ?? 1), fitted === null ? 'guess' : 'sort_key')
}

/**
 * The sort key of an article: the text of `{{DEFAULTSORT:Aken, Joost van}}`, or null when the
 * article has none. When it has more than one, the first counts.
 */
export function readSortKey(text: string): null | string {
  const found = /\{\{\s*DEFAULTSORT\s*:([^{}|]*)/iu.exec(text)
  const key = found?.[1]?.replaceAll(/\s+/gu, ' ').trim()

  return key === undefined || key === '' ? null : key
}

/** How many of the last words of the name the family name of the sort key is, or null. */
function familyWordsOf(words: readonly string[], key: string): null | number {
  const wanted = fold(key)

  if (wanted === '') {
    return null
  }

  for (let count = 1; count <= words.length; count++) {
    const folded = fold(words.slice(-count).join(''))

    if (folded === wanted) {
      return count
    }
    if (folded.length > wanted.length) {
      return null
    }
  }

  return null
}

/** The letters of a text as a computer compares them: no accents, capitals or punctuation. */
function fold(text: string): string {
  return text
    .normalize('NFKD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll('ı', 'i')
    .replaceAll('ø', 'o')
    .replaceAll('đ', 'd')
    .replaceAll('ł', 'l')
    .replaceAll('ß', 'ss')
    .replaceAll('æ', 'ae')
    .replaceAll('œ', 'oe')
    .replaceAll(/[^\p{L}\p{N}]/gu, '')
}

function partsToName(
  parts: { familyName: string; familyNamePrefix: null | string; givenName: null | string },
  source: PersonName['source'],
): PersonName {
  return {
    ...parts,
    name: [parts.givenName, parts.familyNamePrefix, parts.familyName].filter(Boolean).join(' '),
    source,
  }
}

/**
 * The parts of a name of which the last `familyWords` words are the family name. The small
 * words at the start of the family name, as long as a word is left, and the small words in a
 * row just before it are the prefix.
 */
function split(words: readonly string[], familyWords: number) {
  const family = words.slice(-familyWords)
  const before = words.slice(0, -familyWords)
  let start = 0

  while (start < family.length - 1 && familyNamePrefixes.has(family[start]!.toLowerCase())) {
    start++
  }

  let given = before.length

  while (given > 0 && familyNamePrefixes.has(before[given - 1]!.toLowerCase())) {
    given--
  }

  const prefix = [...before.slice(given), ...family.slice(0, start)]

  return {
    familyName: family.slice(start).join(' '),
    familyNamePrefix: prefix.length === 0 ? null : prefix.join(' '),
    givenName: given === 0 ? null : before.slice(0, given).join(' '),
  }
}
