import type { ItemRelevance } from '@fansite/db/schema'

import { clubLegends, clubPeople, footballWords } from './relevance-terms.ts'

/**
 * Decides from the headline alone whether an item is about sc Heerenveen. A pure function: the
 * same headline always gives the same answer, and nothing else is read (the importer keeps no
 * intro or category, see `docs/beslissingen.md`).
 *
 * - `relevant`: the headline names "sc Heerenveen" or a club legend (Abe Lenstra), or it names
 *   "Heerenveen" together with a word from football or the name of someone from the club;
 * - `doubtful`: it names only "Heerenveen", the town and the municipality, or only someone from
 *   the club;
 * - `irrelevant`: neither.
 *
 * Capitals and accents do not count, and neither do the full stops in "s.c.". It looks at whole
 * words: "Heerenveenseweg" is not "Heerenveen", and "Asc" is not "sc". Words are split at
 * anything that isn't a letter or a digit, so "sc Heerenveen-fan" names the club. Only the
 * exact word "Heerenveen" counts, so the adjective "Heerenveense" does not.
 */
export function judgeRelevance(title: string): ItemRelevance {
  const words = normaliseTitle(title)

  if (
    containsPhrase(words, ['sc', 'heerenveen']) ||
    clubPhrases.legends.some((phrase) => containsPhrase(words, phrase))
  ) {
    return 'relevant'
  }

  const named = words.includes('heerenveen')
  const person = clubPhrases.people.some((phrase) => containsPhrase(words, phrase))

  if (named && (person || clubPhrases.footballWords.some((phrase) => containsPhrase(words, phrase)))) {
    return 'relevant'
  }

  return named || person ? 'doubtful' : 'irrelevant'
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
  footballWords: footballWords.map(normaliseTitle),
  legends: clubLegends.map(normaliseTitle),
  people: clubPeople.map(normaliseTitle),
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
