import type { ItemRelevance } from '@fansite/db/schema'

import {
  clubLegends,
  clubNames,
  clubPeople,
  clubSurnames,
  footballWords,
  frisianFootballWords,
  otherClubs,
} from './relevance-terms.ts'

/**
 * Decides from the headline alone whether an item is about sc Heerenveen. A pure function: the
 * same headline always gives the same answer, and nothing else is read (the importer keeps no
 * intro or category, see `docs/beslissingen.md`).
 *
 * - `relevant`: the headline names "sc Heerenveen" or the Frisian "sc Hearrenfean", a club
 *   legend (Abe Lenstra) or the full name of someone from the club, or it names "Heerenveen" or
 *   "Hearrenfean" together with a word from football (Dutch or Frisian), the surname of someone
 *   from the club or another professional club;
 * - `doubtful`: it names only "Heerenveen" or "Hearrenfean", the town and the municipality, or
 *   only the surname of someone from the club;
 * - `irrelevant`: neither.
 *
 * Capitals and accents do not count, and neither do the full stops in "s.c.". It looks at whole
 * words: "Heerenveenseweg" is not "Heerenveen", and "Asc" is not "sc". Words are split at
 * anything that isn't a letter or a digit, so "sc Heerenveen-fan" names the club. Only the
 * exact names count, so the adjectives "Heerenveense" and "Feanster" do not.
 */
export function judgeRelevance(title: string): ItemRelevance {
  const words = normaliseTitle(title)

  if (
    clubNames.some((name) => containsPhrase(words, ['sc', name])) ||
    clubPhrases.legends.some((phrase) => containsPhrase(words, phrase)) ||
    clubPhrases.people.some((phrase) => containsPhrase(words, phrase))
  ) {
    return 'relevant'
  }

  const named = clubNames.some((name) => words.includes(name))
  const surname = clubPhrases.surnames.some((phrase) => containsPhrase(words, phrase))

  if (
    named &&
    (surname ||
      clubPhrases.footballWords.some((phrase) => containsPhrase(words, phrase)) ||
      clubPhrases.otherClubs.some((phrase) => containsPhrase(words, phrase)))
  ) {
    return 'relevant'
  }

  return named || surname ? 'doubtful' : 'irrelevant'
}

/**
 * The words of a headline as the rules compare them: lower case, without accents, "s.c." as
 * "sc", split at anything that isn't a letter or a digit.
 */
export function normaliseTitle(title: string): string[] {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/\p{M}+/gu, '')
    .replaceAll(/\bs\.\s*c\b\.?/gu, 'sc ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '')
}

/** The terms of `relevance-terms.ts` as lists of words, made once. */
const clubPhrases = {
  footballWords: [...footballWords, ...frisianFootballWords].map(normaliseTitle),
  legends: clubLegends.map(normaliseTitle),
  otherClubs: otherClubs.map(normaliseTitle),
  people: clubPeople.map(normaliseTitle),
  surnames: clubSurnames.map(normaliseTitle),
}

/** Whether `phrase` is in `words` as a run of words next to each other, in that order. */
function containsPhrase(words: string[], phrase: string[]): boolean {
  for (let start = 0; start + phrase.length <= words.length; start++) {
    if (phrase.every((word, offset) => words[start + offset] === word)) {
      return true
    }
  }

  return false
}
