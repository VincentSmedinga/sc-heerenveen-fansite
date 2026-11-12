import type { SearchableMatch } from '@fansite/db/match-search'

import { parseSearch } from './search'

/**
 * The search of matches under Wedstrijden (#1150): what the address asks for, which matches it
 * finds and how many each value would add. All of it works on the list of every played match
 * (about fourteen hundred), so it needs no database and a test can use made-up matches. The
 * page reads the list once in a while (`match-search-data.ts`) and hands it in.
 */

/** The address of the page. */
export const matchSearchPath = '/wedstrijden/zoeken'

/** How many matches a page of results has. */
export const matchesPerSearchPage = 25

/** The highest number of goals a search for an exact score takes. */
export const maxSearchGoals = 99

/** The tail of the address, per group of values. Every name is a word. */
export const venues = [
  { label: 'Thuis', value: 'thuis' },
  { label: 'Uit', value: 'uit' },
] as const

/**
 * The competitions as a supporter asks for them. `Europa` is every European cup and the
 * play-offs, so each competition of the database belongs to exactly one of them.
 */
export const competitionGroups = [
  { label: 'Eredivisie', members: ['Eredivisie'], value: 'eredivisie' },
  { label: 'Eerste divisie', members: ['Eerste divisie'], value: 'eerste-divisie' },
  { label: 'KNVB Beker', members: ['KNVB Beker'], value: 'knvb-beker' },
  {
    label: 'Europa',
    members: [
      'Champions League',
      'Europa League',
      'Europacup II',
      'Intertoto Cup',
      'Play-offs Champions League',
      'Play-offs Conference League',
      'Play-offs Europa League',
      'Play-offs UEFA Cup',
      'UEFA Cup',
    ],
    value: 'europa',
  },
  { label: 'Johan Cruijff Schaal', members: ['Johan Cruijff Schaal'], value: 'johan-cruijff-schaal' },
] as const

export const outcomes = [
  { label: 'Gewonnen', value: 'gewonnen' },
  { label: 'Gelijk', value: 'gelijk' },
  { label: 'Verloren', value: 'verloren' },
] as const

/** The days of the week, Monday first. `index` is the number of `Date#getUTCDay`. */
export const days = [
  { index: 1, label: 'maandag', value: 'maandag' },
  { index: 2, label: 'dinsdag', value: 'dinsdag' },
  { index: 3, label: 'woensdag', value: 'woensdag' },
  { index: 4, label: 'donderdag', value: 'donderdag' },
  { index: 5, label: 'vrijdag', value: 'vrijdag' },
  { index: 6, label: 'zaterdag', value: 'zaterdag' },
  { index: 0, label: 'zondag', value: 'zondag' },
] as const

/** The months, as a visitor says them. */
export const months = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
] as const

/** The most days each month has, with 29 for February so a leap day can be asked for. */
const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

export type CompetitionValue = (typeof competitionGroups)[number]['value']

export type DayValue = (typeof days)[number]['value']

/** What the address asks for, with every value checked: what isn't known has been dropped. */
export type Filters = {
  /** The slug of the club, as in `/tegenstanders/<slug>`. */
  club?: string | undefined
  /** More clubs at once, as slugs. A card uses them; no field. */
  clubs: string[]
  competitions: CompetitionValue[]
  /** The day of the month and the month a match was played on, or the month alone. */
  date?: undefined | { day?: number | undefined; month: number }
  days: DayValue[]
  /** The first season, such as `2019/20`, or none for the first we have. */
  from?: string | undefined
  /** The least number of goals of both clubs together. */
  minGoals?: number | undefined
  order: Order
  /** Our goals in the exact score. */
  ours?: number | undefined
  outcomes: OutcomeValue[]
  /** The page of the results, counting from 1. */
  page: number
  /** Only the matches that a shoot-out decided. */
  penalties: boolean
  /** What was written for a goalscorer, when it meets the limits. */
  scorer?: undefined | { text: string; words: string[] }
  /** The message of a goalscorer that doesn't meet the limits, which the field shows. */
  scorerError?: undefined | { message: string; text: string }
  /** Their goals in the exact score. */
  theirs?: number | undefined
  /** The last season, or none for the last we have. */
  to?: string | undefined
  venues: VenueValue[]
}

export type Order = 'doelsaldo' | 'nieuwste' | 'oudste'

export type OutcomeValue = (typeof outcomes)[number]['value']

/** The matches in which the goalscorer scored, or none when the search has no goalscorer. */
export type ScorerMatches = ReadonlySet<number> | undefined

/** What a search needs to know of the world: the seasons and clubs there are. */
export type SearchWorld = {
  clubs: readonly { name: string; slug: string }[]
  /** Every season with a match, oldest first. */
  seasons: readonly string[]
}

export type VenueValue = (typeof venues)[number]['value']

type Raw = Record<string, string | string[] | undefined>

const valuesOf = (raw: string | string[] | undefined) => (raw === undefined ? [] : Array.isArray(raw) ? raw : [raw])

const firstOf = (raw: string | string[] | undefined) => valuesOf(raw)[0]

/**
 * What the address asks for. A value that doesn't exist (a club, a season, a competition, a
 * day, a score that is not a number) is dropped and gives no error page. A season `van` after
 * the season `tot` swaps the two, and one that is the first or last season we have is dropped,
 * because it asks for nothing. A goalscorer has the limits of the search for a player.
 */
export function parseFilters(raw: Raw, world: SearchWorld): Filters {
  const club = firstOf(raw['tegen'])
  const known = (season: string | undefined) =>
    season !== undefined && world.seasons.includes(season) ? season : undefined
  let from = known(firstOf(raw['van']))
  let to = known(firstOf(raw['tot']))

  if (from !== undefined && to !== undefined && from > to) {
    ;[from, to] = [to, from]
  }

  const scorerText = firstOf(raw['doelpuntenmaker'])
  const scorer = scorerText === undefined || scorerText.trim() === '' ? undefined : parseSearch(scorerText)
  const month = /^(?:[1-9]|1[0-2])$/u.test(firstOf(raw['maand']) ?? '') ? Number(firstOf(raw['maand'])) : undefined
  const dayOfMonth = /^(?:[1-9]|[12]\d|3[01])$/u.test(firstOf(raw['op']) ?? '') ? Number(firstOf(raw['op'])) : undefined
  // A day that its month doesn't have, such as 31 April, is dropped; the month stays.
  const dayAsked =
    month !== undefined && dayOfMonth !== undefined && dayOfMonth <= daysInMonth[month - 1]! ? dayOfMonth : undefined
  const minGoals = goalsOf(raw['doelpunten'])
  const orderAsked = firstOf(raw['volgorde'])
  const page = /^[1-9]\d{0,3}$/u.test(firstOf(raw['pagina']) ?? '') ? Number(firstOf(raw['pagina'])) : 1

  return {
    club: club !== undefined && world.clubs.some((candidate) => candidate.slug === club) ? club : undefined,
    clubs: valuesOf(raw['clubs']).filter(
      (slug, index, all) => all.indexOf(slug) === index && world.clubs.some((candidate) => candidate.slug === slug),
    ),
    competitions: pick(raw['competitie'], competitionGroups),
    date: month === undefined ? undefined : { day: dayAsked, month },
    days: pick(raw['dag'], days),
    from: from === world.seasons[0] ? undefined : from,
    minGoals: minGoals === 0 ? undefined : minGoals,
    order: orderAsked === 'oudste' || orderAsked === 'doelsaldo' ? orderAsked : 'nieuwste',
    ours: goalsOf(raw['wij']),
    outcomes: pick(raw['uitslag'], outcomes),
    page,
    penalties: firstOf(raw['strafschoppen']) === 'ja',
    scorer: scorer?.kind === 'valid' ? { text: scorer.text, words: scorer.words } : undefined,
    scorerError: scorer?.kind === 'invalid' ? { message: scorer.message, text: scorer.text } : undefined,
    theirs: goalsOf(raw['zij']),
    to: to === world.seasons.at(-1) ? undefined : to,
    venues: pick(raw['waar'], venues),
  }
}

/** A whole number from 0 to `maxSearchGoals` written in digits, or undefined. */
function goalsOf(raw: string | string[] | undefined): number | undefined {
  const text = firstOf(raw)

  if (text === undefined || !/^\d{1,2}$/u.test(text)) {
    return undefined
  }

  const goals = Number(text)

  return goals <= maxSearchGoals ? goals : undefined
}

/** The values of a group that are known, once each, in the order of the list. */
function pick<T extends string>(raw: string | string[] | undefined, known: readonly { value: T }[]): T[] {
  const given = new Set(valuesOf(raw))

  return known.map((item) => item.value).filter((value) => given.has(value))
}

/** Whether the address has at least one choice, which is what shows the results. */
export const hasChoice = (filters: Filters) =>
  filters.club !== undefined ||
  filters.clubs.length > 0 ||
  filters.competitions.length > 0 ||
  filters.date !== undefined ||
  filters.days.length > 0 ||
  filters.from !== undefined ||
  filters.minGoals !== undefined ||
  filters.ours !== undefined ||
  filters.outcomes.length > 0 ||
  filters.penalties ||
  filters.scorer !== undefined ||
  filters.theirs !== undefined ||
  filters.to !== undefined ||
  filters.venues.length > 0

/**
 * The address of a search: the page and the choices, in a fixed order, with what is not chosen
 * left out. The order of the results and the page are kept only when they differ from the
 * start (`pagina` is left out for page 1).
 */
export function searchHref(filters: Filters, { page = filters.page }: { page?: number } = {}): string {
  const query = new URLSearchParams()

  if (filters.club !== undefined) {
    query.set('tegen', filters.club)
  }
  for (const slug of filters.clubs) {
    query.append('clubs', slug)
  }
  if (filters.from !== undefined) {
    query.set('van', filters.from)
  }
  if (filters.to !== undefined) {
    query.set('tot', filters.to)
  }
  for (const value of filters.venues) {
    query.append('waar', value)
  }
  for (const value of filters.competitions) {
    query.append('competitie', value)
  }
  for (const value of filters.outcomes) {
    query.append('uitslag', value)
  }
  for (const value of filters.days) {
    query.append('dag', value)
  }
  if (filters.scorer !== undefined) {
    query.set('doelpuntenmaker', filters.scorer.text)
  }
  if (filters.minGoals !== undefined) {
    query.set('doelpunten', String(filters.minGoals))
  }
  if (filters.penalties) {
    query.set('strafschoppen', 'ja')
  }
  if (filters.date !== undefined) {
    query.set('maand', String(filters.date.month))
    if (filters.date.day !== undefined) {
      query.set('op', String(filters.date.day))
    }
  }
  if (filters.ours !== undefined) {
    query.set('wij', String(filters.ours))
  }
  if (filters.theirs !== undefined) {
    query.set('zij', String(filters.theirs))
  }
  if (filters.order !== 'nieuwste') {
    query.set('volgorde', filters.order)
  }
  if (page > 1) {
    query.set('pagina', String(page))
  }

  const text = query.toString()

  return text === '' ? matchSearchPath : `${matchSearchPath}?${text}`
}

/** How a match went for us: the score after extra time decides, a shoot-out makes it a draw. */
export const outcomeOf = ({
  goalsAgainst,
  goalsFor,
}: Pick<SearchableMatch, 'goalsAgainst' | 'goalsFor'>): OutcomeValue =>
  goalsFor > goalsAgainst ? 'gewonnen' : goalsFor < goalsAgainst ? 'verloren' : 'gelijk'

/** The day of the week of a match, from its local day. */
export const dayOf = ({ matchDate }: Pick<SearchableMatch, 'matchDate'>): DayValue => {
  const index = new Date(`${matchDate}T12:00:00Z`).getUTCDay()

  return days.find((day) => day.index === index)?.value ?? 'zondag'
}

const competitionOf = (match: SearchableMatch): CompetitionValue =>
  competitionGroups.find((group) => (group.members as readonly string[]).includes(match.competition))?.value ??
  'eredivisie'

/** The groups of values that have a count behind each value. */
export type CountedGroup = 'competitions' | 'days' | 'outcomes' | 'venues'

/** Whether a match was played on the day and month, or in the month. */
const meetsDate = ({ matchDate }: Pick<SearchableMatch, 'matchDate'>, date: NonNullable<Filters['date']>) =>
  Number(matchDate.slice(5, 7)) === date.month &&
  (date.day === undefined || Number(matchDate.slice(8, 10)) === date.day)

/** Whether a match meets every choice. */
function passes(match: SearchableMatch, filters: Filters, scorer: ScorerMatches): boolean {
  return (
    (filters.club === undefined || match.clubSlug === filters.club) &&
    (filters.clubs.length === 0 || filters.clubs.includes(match.clubSlug)) &&
    (filters.date === undefined || meetsDate(match, filters.date)) &&
    (filters.minGoals === undefined || match.goalsFor + match.goalsAgainst >= filters.minGoals) &&
    (!filters.penalties || match.penaltiesFor !== null) &&
    (filters.from === undefined || match.season >= filters.from) &&
    (filters.to === undefined || match.season <= filters.to) &&
    (filters.venues.length === 0 || filters.venues.includes(match.home ? 'thuis' : 'uit')) &&
    (filters.competitions.length === 0 || filters.competitions.includes(competitionOf(match))) &&
    (filters.outcomes.length === 0 || filters.outcomes.includes(outcomeOf(match))) &&
    (filters.days.length === 0 || filters.days.includes(dayOf(match))) &&
    (filters.scorer === undefined || scorer?.has(match.id) === true) &&
    (filters.ours === undefined || match.goalsFor === filters.ours) &&
    (filters.theirs === undefined || match.goalsAgainst === filters.theirs)
  )
}

/** The matches that meet every choice, in the order of `all`. */
export const findMatches = (all: readonly SearchableMatch[], filters: Filters, scorer: ScorerMatches) =>
  all.filter((match) => passes(match, filters, scorer))

/** One value of a group with the number of matches you get when you add it. */
export type Counted<T extends string> = { count: number; label: string; selected: boolean; value: T }

/** Every club we played, by name, for the choice: the count of all clubs is in the tip. */
export function clubsOf(all: readonly SearchableMatch[]): { name: string; slug: string }[] {
  return [...new Map(all.map((match) => [match.clubSlug, match.clubName])).entries()]
    .map(([slug, name]) => ({ name, slug }))
    .toSorted((first, second) => first.name.localeCompare(second.name, 'nl'))
}

/** The clubs with the count of the matches against each, other choices as they are. */
export function countClubs(all: readonly SearchableMatch[], filters: Filters, scorer: ScorerMatches) {
  const counts = new Map<string, { count: number; name: string }>()

  for (const match of findMatches(all, { ...filters, club: undefined }, scorer)) {
    const entry = counts.get(match.clubSlug)

    counts.set(match.clubSlug, { count: (entry?.count ?? 0) + 1, name: match.clubName })
  }

  return [...counts]
    .map(([slug, { count, name }]) => ({ count, name, slug }))
    .toSorted((first, second) => first.name.localeCompare(second.name, 'nl'))
}

/**
 * The values of a group with their count: the matches you get when you add the value to the
 * choices as they are. Values of one group are "or", groups are "and", so a value that is
 * chosen already counts the matches of its group as they are. A value with 0 is left out,
 * unless it is chosen.
 */
export function countGroup<T extends CountedGroup>(
  all: readonly SearchableMatch[],
  filters: Filters,
  scorer: ScorerMatches,
  group: T,
  items: readonly { label: string; value: Filters[T][number] }[],
): Counted<Filters[T][number]>[] {
  return items.flatMap((item) => {
    const chosen = (filters[group] as readonly string[]).includes(item.value)
    const added = chosen ? filters : { ...filters, [group]: [...filters[group], item.value] }
    const count = findMatches(all, added, scorer).length

    return count === 0 && !chosen ? [] : [{ count, label: item.label, selected: chosen, value: item.value }]
  })
}

/** The seasons of the matches, oldest first. */
export const seasonsOf = (all: readonly SearchableMatch[]) => [...new Set(all.map((match) => match.season))].toSorted()

/** The record of a list of matches: the outcomes and the goals. */
export type Tally = { drawn: number; goalsAgainst: number; goalsFor: number; lost: number; won: number }

export function tallyOf(found: readonly SearchableMatch[]): Tally {
  const tally: Tally = { drawn: 0, goalsAgainst: 0, goalsFor: 0, lost: 0, won: 0 }

  for (const match of found) {
    const outcome = outcomeOf(match)

    tally.won += outcome === 'gewonnen' ? 1 : 0
    tally.drawn += outcome === 'gelijk' ? 1 : 0
    tally.lost += outcome === 'verloren' ? 1 : 0
    tally.goalsFor += match.goalsFor
    tally.goalsAgainst += match.goalsAgainst
  }

  return tally
}

/** The record as one line: `9 gewonnen · 15 gelijk · 52 verloren · doelpunten 89–218`. */
export const tallyLine = (tally: Tally) =>
  `${tally.won} gewonnen · ${tally.drawn} gelijk · ${tally.lost} verloren · doelpunten ${tally.goalsFor}–${tally.goalsAgainst}`

/** `76 wedstrijden`, and `1 wedstrijd`. */
export const matchCount = (count: number) => `${count} ${count === 1 ? 'wedstrijd' : 'wedstrijden'}`

/** One choice of the search, as a chip: its words, and the filters without it. */
export type Choice = {
  label: string
  lower?: true
  sorting?: true
  /** The order, which is not a filter. */ without: Filters
}

const seasonLabel = (filters: Filters, first: string) =>
  filters.from !== undefined && filters.to !== undefined
    ? `${filters.from} t/m ${filters.to}`
    : filters.to !== undefined
      ? `${first} t/m ${filters.to}`
      : `Vanaf ${filters.from}`

/** The results: the matches of one page by season, and what the page says about them. */
export type SearchResult = {
  /** The page, after it is kept within the pages there are. */
  page: number
  pageCount: number
  /** The first and last number of the matches shown, as `1–25`. */
  range: [number, number]
  /** The matches by season; the order of the goal difference has one group without a season. */
  seasons: { matches: SearchableMatch[]; season: string | undefined }[]
  tally: Tally
  total: number
}

/** Everything the page shows for a search. */
export type SearchView = {
  chips: Choice[]
  chosen: boolean
  clubs: { count: number; name: string; slug: string }[]
  competitions: Counted<CompetitionValue>[]
  days: Counted<DayValue>[]
  outcomes: Counted<OutcomeValue>[]
  relaxed: { count: number; href: string; label: string }[]
  result: SearchResult
  sentence: string
  venues: Counted<VenueValue>[]
}

/**
 * The choices of the address, one for each value: the club, the seasons, each venue,
 * competition, outcome and day, the goalscorer and the score. Each has the filters without it,
 * so a chip can link there and the page can count what you would get without it.
 */
export function choicesOf(filters: Filters, world: SearchWorld): Choice[] {
  const without = (changes: Partial<Filters>): Filters => ({ ...filters, ...changes, page: 1 })
  const choices: Choice[] = []
  const club = world.clubs.find((candidate) => candidate.slug === filters.club)

  if (club !== undefined) {
    choices.push({ label: club.name, without: without({ club: undefined }) })
  }
  if (filters.clubs.length > 0) {
    choices.push({
      label: listOf(
        filters.clubs.map((slug) => world.clubs.find((candidate) => candidate.slug === slug)?.name ?? slug),
      ),
      without: without({ clubs: [] }),
    })
  }
  if (filters.from !== undefined || filters.to !== undefined) {
    choices.push({
      label: seasonLabel(filters, world.seasons[0] ?? ''),
      without: without({ from: undefined, to: undefined }),
    })
  }
  for (const value of filters.venues) {
    choices.push({
      label: venues.find((item) => item.value === value)?.label ?? value,
      lower: true,
      without: without({ venues: filters.venues.filter((item) => item !== value) }),
    })
  }
  for (const value of filters.competitions) {
    choices.push({
      label: competitionGroups.find((item) => item.value === value)?.label ?? value,
      without: without({ competitions: filters.competitions.filter((item) => item !== value) }),
    })
  }
  for (const value of filters.outcomes) {
    choices.push({
      label: outcomes.find((item) => item.value === value)?.label ?? value,
      lower: true,
      without: without({ outcomes: filters.outcomes.filter((item) => item !== value) }),
    })
  }
  for (const value of filters.days) {
    choices.push({
      label: days.find((item) => item.value === value)?.label ?? value,
      without: without({ days: filters.days.filter((item) => item !== value) }),
    })
  }
  if (filters.minGoals !== undefined) {
    choices.push({ label: `Ten minste ${filters.minGoals} doelpunten`, without: without({ minGoals: undefined }) })
  }
  if (filters.penalties) {
    choices.push({ label: 'Beslist met strafschoppen', without: without({ penalties: false }) })
  }
  if (filters.date !== undefined) {
    choices.push({ label: dateLabel(filters.date), without: without({ date: undefined }) })
  }
  if (filters.scorer !== undefined) {
    choices.push({ label: `Doelpunt van ${filters.scorer.text}`, without: without({ scorer: undefined }) })
  }
  if (filters.ours !== undefined || filters.theirs !== undefined) {
    choices.push({
      label: `Uitslag ${filters.ours ?? '?'}–${filters.theirs ?? '?'}`,
      without: without({ ours: undefined, theirs: undefined }),
    })
  }
  if (filters.order === 'doelsaldo') {
    choices.push({ label: 'Op doelsaldo', sorting: true, without: without({ order: 'nieuwste' }) })
  }

  return choices
}

/** A list of names for a sentence: `Ajax, PSV en Feyenoord`. */
export const listOf = (names: readonly string[]) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} en ${names.at(-1)}`

/** The day and month as a visitor says them, `11 november`, or the month alone, `november`. */
export const dateLabel = ({ day, month }: NonNullable<Filters['date']>) =>
  `${day === undefined ? '' : `${day} `}${months[month - 1]}`

/**
 * What you get when you leave one choice out, for the page that found nothing: the choices
 * that would give a match, with the count, in the order of the chips.
 */
export function relaxedChoices(
  all: readonly SearchableMatch[],
  filters: Filters,
  scorer: ScorerMatches,
  world: SearchWorld,
) {
  return choicesOf(filters, world)
    .filter((choice) => choice.sorting !== true)
    .flatMap((choice) => {
      const count = findMatches(all, choice.without, scorer).length

      const label = choice.lower === true ? choice.label.toLowerCase() : choice.label

      return count === 0 ? [] : [{ count, href: searchHref(choice.without), label }]
    })
}

/** The best result first: the highest goal difference, then the most goals, then the newest. */
export const byGoalDifference = (found: readonly SearchableMatch[]) =>
  found.toSorted(
    (first, second) =>
      second.goalsFor - second.goalsAgainst - (first.goalsFor - first.goalsAgainst) ||
      second.goalsFor - first.goalsFor ||
      second.matchDate.localeCompare(first.matchDate),
  )

/** The matches of the page in the order asked for, grouped by season in that order. */
export function resultOf(found: readonly SearchableMatch[], filters: Filters): SearchResult {
  const ordered =
    filters.order === 'oudste' ? found : filters.order === 'doelsaldo' ? byGoalDifference(found) : found.toReversed()
  const pageCount = Math.max(1, Math.ceil(ordered.length / matchesPerSearchPage))
  const page = Math.min(filters.page, pageCount)
  const start = (page - 1) * matchesPerSearchPage
  const shown = ordered.slice(start, start + matchesPerSearchPage)
  const seasons: SearchResult['seasons'] = []

  for (const match of shown) {
    const last = seasons.at(-1)

    // The order of the goal difference runs through the seasons, so it has no headings.
    if (filters.order === 'doelsaldo') {
      if (last === undefined) {
        seasons.push({ matches: [match], season: undefined })
      } else {
        last.matches.push(match)
      }
    } else if (last?.season === match.season) {
      last.matches.push(match)
    } else {
      seasons.push({ matches: [match], season: match.season })
    }
  }

  return {
    page,
    pageCount,
    range: [ordered.length === 0 ? 0 : start + 1, start + shown.length],
    seasons,
    tally: tallyOf(found),
    total: ordered.length,
  }
}

/** The search as a sentence: `Alle uitwedstrijden tegen Ajax die we wonnen, sinds 1990/91.` */
export function sentenceOf(filters: Filters, world: SearchWorld): string {
  const or = (words: readonly string[]) => words.join(' of ')
  const first = world.seasons[0] ?? ''
  const club = world.clubs.find((candidate) => candidate.slug === filters.club)
  const kind =
    filters.venues.length === 1
      ? filters.venues[0] === 'thuis'
        ? 'thuiswedstrijden'
        : 'uitwedstrijden'
      : 'wedstrijden'
  const outcomeWords = { gelijk: 'gelijkspeelden', gewonnen: 'wonnen', verloren: 'verloren' } as const
  const parts = [
    `Alle ${kind}`,
    club === undefined && filters.clubs.length === 0
      ? ''
      : ` tegen ${listOf([
          ...(club === undefined ? [] : [club.name]),
          ...filters.clubs.flatMap((slug) => world.clubs.find((candidate) => candidate.slug === slug)?.name ?? []),
        ])}`,
    filters.minGoals === undefined ? '' : ` met ${filters.minGoals} doelpunten of meer`,
    filters.penalties ? ' die met strafschoppen werden beslist' : '',
    filters.competitions.length === 0
      ? ''
      : ` in ${or(filters.competitions.map((value) => competitionGroups.find((item) => item.value === value)?.label ?? value))}`,
    filters.outcomes.length === 0 ? '' : ` die we ${or(filters.outcomes.map((value) => outcomeWords[value]))}`,
    filters.days.length === 0 ? '' : `, op een ${or(filters.days)}`,
    filters.date === undefined
      ? ''
      : `, gespeeld ${filters.date.day === undefined ? 'in' : 'op'} ${dateLabel(filters.date)}`,
    filters.scorer === undefined ? '' : `, met een doelpunt van ${filters.scorer.text}`,
    filters.ours === undefined && filters.theirs === undefined
      ? ''
      : `, met als uitslag ${filters.ours ?? '?'}–${filters.theirs ?? '?'}`,
    filters.from !== undefined && filters.to !== undefined
      ? `, van ${filters.from} tot en met ${filters.to}`
      : filters.to !== undefined
        ? `, van ${first} tot en met ${filters.to}`
        : `, sinds ${filters.from ?? first}`,
    filters.order === 'doelsaldo' ? ', de grootste uitslag eerst' : '',
  ]

  return `${parts.join('')}.`
}

/** The page for a search: the counts behind the values, the results and the way out of none. */
export function viewOf(
  all: readonly SearchableMatch[],
  filters: Filters,
  scorer: ScorerMatches,
  world: SearchWorld,
): SearchView {
  const found = findMatches(all, filters, scorer)
  const result = resultOf(found, filters)
  const chosen = hasChoice(filters)
  const clubs = countClubs(all, filters, scorer)

  return {
    chips: choicesOf(filters, world),
    chosen,
    // A club that is chosen stays in the list, even when the other choices leave no match.
    clubs:
      filters.club === undefined || clubs.some((club) => club.slug === filters.club)
        ? clubs
        : [
            ...clubs,
            ...world.clubs.filter((club) => club.slug === filters.club).map((club) => ({ ...club, count: 0 })),
          ].toSorted((first, second) => first.name.localeCompare(second.name, 'nl')),
    competitions: countGroup(all, filters, scorer, 'competitions', competitionGroups),
    days: countGroup(all, filters, scorer, 'days', days),
    outcomes: countGroup(all, filters, scorer, 'outcomes', outcomes),
    relaxed: chosen && found.length === 0 ? relaxedChoices(all, filters, scorer, world) : [],
    result,
    sentence: sentenceOf(filters, world),
    venues: countGroup(all, filters, scorer, 'venues', venues),
  }
}
