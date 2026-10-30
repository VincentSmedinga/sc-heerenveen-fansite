import type { ItemRelevance } from '@fansite/db/schema'

import {
  clubLegends,
  clubNames,
  clubPeople,
  clubPrefixes,
  clubSurnames,
  footballWords,
  frisianFootballWords,
  ordinaryClubWords,
  otherClubGroups,
  otherClubs,
} from './relevance-terms.ts'

/**
 * Decides from the headline whether an item is about sc Heerenveen. A pure function: the same
 * headline and opponents always give the same answer, and nothing else is read (the importer
 * keeps no intro or category, see `docs/beslissingen.md`).
 *
 * - `relevant`: the headline names "sc Heerenveen" or the Frisian "sc Hearrenfean", a club
 *   legend (Abe Lenstra) or the full name of someone from the club, or it names "Heerenveen" or
 *   "Hearrenfean" together with a word from football (Dutch or Frisian), the surname of someone
 *   from the club or another professional club;
 * - `doubtful`: it names only "Heerenveen" or "Hearrenfean", the town and the municipality, or
 *   only the surname of someone from the club;
 * - `irrelevant`: neither.
 *
 * A headline that would be `doubtful` or `irrelevant` is `relevant` when it names the opponent
 * of a match and no other professional club: `opponents` has the names, as `matches.opponent`
 * has them, of the matches of the season around the day the item was published (see
 * `opponentsAround`). A headline about the opponent and another club is about another match.
 * The matches are an argument, not something this function reads, so the same arguments always
 * give the same answer; without opponents the rules are the ones above.
 *
 * Capitals and accents do not count, and neither do the full stops in "s.c.". It looks at whole
 * words: "Heerenveenseweg" is not "Heerenveen", and "Asc" is not "sc". Words are split at
 * anything that isn't a letter or a digit, so "sc Heerenveen-fan" names the club. Only the
 * exact names count, so the adjectives "Heerenveense" and "Feanster" do not.
 */
export function judgeRelevance(title: string, opponents: readonly string[] = []): ItemRelevance {
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

  if (opponents.some((opponent) => namesOpponentOnly(words, opponent))) {
    return 'relevant'
  }

  return named || surname ? 'doubtful' : 'irrelevant'
}

/** How many days before a match an item about the opponent is `relevant`. */
export const opponentDaysBefore = 3

/** How many days after a match an item about the opponent is `relevant`. */
export const opponentDaysAfter = 3

/** The part of a match that the rule of the opponent needs. */
export type MatchDay = {
  /** The day of the match in Dutch time, `2026-10-25`. */
  matchDate: string
  /** The opponent as `matches.opponent` has it. */
  opponent: string
  /** A match that was `postponed` has no new date and counts for nothing. */
  status: 'played' | 'postponed' | 'scheduled'
}

/**
 * The opponents of the matches from `opponentDaysBefore` days after the day an item was
 * published to `opponentDaysAfter` days before it: a match 3 days ahead and one 3 days back
 * count, one 4 days ahead and one 4 days back do not. Both days are counted in Dutch time, so
 * an item at half past midnight on the night the clocks go back is on the day the reader saw
 * it. A club that plays us twice has two matches and so two windows. Returns the names as
 * `matches.opponent` has them, for the second argument of `judgeRelevance`.
 */
export function opponentsAround(publishedAt: Date, matches: readonly MatchDay[]): string[] {
  const published = dayNumber(dutchDay.format(publishedAt))

  return matches
    .filter((match) => match.status !== 'postponed')
    .filter((match) => {
      const daysAfterMatch = published - dayNumber(match.matchDate)

      return daysAfterMatch >= -opponentDaysBefore && daysAfterMatch <= opponentDaysAfter
    })
    .map((match) => match.opponent)
}

const dutchDay = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Amsterdam',
  year: 'numeric',
})

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

/** The days since 1 January 1970 of a day written `2026-10-25`. */
function dayNumber(day: string): number {
  return Date.parse(`${day}T00:00:00Z`) / 86_400_000
}

/** The terms of `relevance-terms.ts` as lists of words, made once. */
const clubPhrases = {
  footballWords: [...footballWords, ...frisianFootballWords].map(normaliseTitle),
  legends: clubLegends.map(normaliseTitle),
  otherClubs: otherClubs.map(normaliseTitle),
  people: clubPeople.map(normaliseTitle),
  surnames: clubSurnames.map(normaliseTitle),
}

/**
 * The names of the opponent of a match as lists of words (`own`), and the names of the other
 * professional clubs on the list (`others`).
 */
type OpponentTerms = { others: string[][]; own: string[][] }

const opponentTermsCache = new Map<string, OpponentTerms>()

const allClubPhrases = otherClubGroups.map((names) => names.map(normaliseTitle))

/** Whether `phrase` is in `words` as a run of words next to each other, in that order. */
function containsPhrase(words: string[], phrase: string[]): boolean {
  return indexOfPhrase(words, phrase) >= 0
}

/** Where `phrase` starts in `words`, or -1. */
function indexOfPhrase(words: string[], phrase: string[]): number {
  for (let start = 0; start + phrase.length <= words.length; start++) {
    if (phrase.every((word, offset) => words[start + offset] === word)) {
      return start
    }
  }

  return -1
}

function isOrdinaryOrPrefix(word: string): boolean {
  return isPrefix(word) || (ordinaryClubWords as readonly string[]).includes(word)
}

function isPrefix(word: string): boolean {
  return (clubPrefixes as readonly string[]).includes(word)
}

/**
 * Whether the headline names the opponent and no other professional club of the list. The words
 * of the longest name of the opponent are left out first, so "Excelsior Maassluis" is not
 * "Excelsior" of Rotterdam as well.
 */
function namesOpponentOnly(words: string[], opponent: string): boolean {
  const { others, own } = opponentTerms(opponent)
  let found = { length: 0, start: -1 }

  for (const phrase of own) {
    const start = indexOfPhrase(words, phrase)

    if (start >= 0 && phrase.length > found.length) {
      found = { length: phrase.length, start }
    }
  }
  if (found.start < 0) {
    return false
  }

  const rest = words.map((word, index) => (index >= found.start && index < found.start + found.length ? '' : word))

  return !others.some((phrase) => containsPhrase(rest, phrase))
}

/**
 * The names to look for in a headline for the opponent of a match, as lists of words. The rule
 * (`relevance-terms.ts` has the lists):
 *
 * 1. The name of the match, or the name without a prefix or suffix (FC, SC, VV, SV, AFC), is
 *    one of the names of a club on the list `otherClubGroups`: all names of that club count.
 *    "N.E.C." is "nec", "ADO Den Haag" is also "ado", "Almere City FC" is "almere city".
 *    A club that is named after a place keeps its full name, as in the list: "FC Twente", not
 *    "Twente".
 * 2. Otherwise the name without the prefix and the suffix counts as it is: "Excelsior
 *    Maassluis", "Quick Boys", "De Treffers", "HSV Hoek", and the one word of a club such as
 *    "IJsselmeervogels" or "ASWH" ("FC Lisse" is "Lisse"). Not when it is one word that is
 *    also an ordinary word (`ordinaryClubWords`), and not a name that is only a prefix.
 *
 * The names of every other club on the list are the `others`: a headline that has one of them
 * is about another match.
 */
function opponentTerms(opponent: string): OpponentTerms {
  const cached = opponentTermsCache.get(opponent)

  if (cached !== undefined) {
    return cached
  }

  const name = normaliseTitle(opponent)
  const bare = withoutPrefixes(name)
  const group = otherClubGroups.find((names) =>
    names.some((term) => [name, bare].some((candidate) => candidate.join(' ') === term)),
  )
  const terms: OpponentTerms = { others: allClubPhrases.flat(), own: [] }

  if (group !== undefined) {
    terms.own = group.map(normaliseTitle)
    terms.others = allClubPhrases.filter((_phrases, index) => otherClubGroups[index] !== group).flat()
  } else if (bare.length >= 2 || (bare.length === 1 && !isOrdinaryOrPrefix(bare[0] ?? ''))) {
    terms.own = [bare]
  }
  opponentTermsCache.set(opponent, terms)

  return terms
}

/** The words of a name without the prefixes and suffixes of `clubPrefixes`, if any is left. */
function withoutPrefixes(name: string[]): string[] {
  let bare = name

  if (bare.length > 1 && isPrefix(bare[0] ?? '')) {
    bare = bare.slice(1)
  }
  if (bare.length > 1 && isPrefix(bare.at(-1) ?? '')) {
    bare = bare.slice(0, -1)
  }

  return bare
}
