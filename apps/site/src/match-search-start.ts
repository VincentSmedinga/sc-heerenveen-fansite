import type { SearchableMatch } from '@fansite/db/match-search'

import {
  byGoalDifference,
  dateLabel,
  dayOf,
  days,
  type Filters,
  findMatches,
  months,
  outcomeOf,
  searchHref,
} from './match-search'

/**
 * What the search page shows before a visitor has chosen anything (#1151): nine questions with
 * a number, and the matches that were played on the date of today in earlier years. The
 * numbers are counted from the list of matches on each request, so they follow the data.
 */

/** The filters of no choice at all, which a question changes. */
const nothing: Filters = {
  clubs: [],
  competitions: [],
  days: [],
  order: 'nieuwste',
  outcomes: [],
  page: 1,
  penalties: false,
  venues: [],
}

/** A question as the page shows it. A question without a match is left out. */
export type Question = { figure: string; href: string; note?: string; question: string }

/** The line under the number, or nothing when there is none. */
const noteOf = (note: string | undefined) => (note === undefined ? {} : { note })

/** The goals of ours first, as `11–1`, whichever side played at home. */
const ourScore = ({ goalsAgainst, goalsFor }: SearchableMatch) => `${goalsFor}–${goalsAgainst}`

const wonCount = (found: readonly SearchableMatch[]) => found.filter((match) => outcomeOf(match) === 'gewonnen').length

/** The day and month in Europe/Amsterdam, whatever the time zone of the server is. */
export function amsterdamToday(now: Date): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: 'numeric',
    month: 'numeric',
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
  }).formatToParts(now)
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value)

  return { day: part('day'), month: part('month'), year: part('year') }
}

/**
 * The questions, in the order of the page. The list is fixed here; `found` and `all` give the
 * number and the line under it.
 */
export function questionsOf(all: readonly SearchableMatch[], firstSeason: string): Question[] {
  const ask = (filters: Partial<Filters>) => {
    const asked = { ...nothing, ...filters }

    return { asked, found: findMatches(all, asked, undefined) }
  }
  const questions: (Question | undefined)[] = []
  const add = (
    question: string,
    filters: Partial<Filters>,
    note: (found: readonly SearchableMatch[]) => string | undefined,
  ) => {
    const { asked, found } = ask(filters)

    questions.push(
      found.length === 0
        ? undefined
        : { figure: String(found.length), href: searchHref(asked), question, ...noteOf(note(found)) },
    )
  }

  add(
    'Elke uitzege in Europa',
    { competitions: ['europa'], outcomes: ['gewonnen'], theirs: 0, venues: ['uit'] },
    () => 'en geen tegendoelpunt',
  )
  add('De derby tegen sc Cambuur', { club: 'sc-cambuur' }, (found) => `${wonCount(found)} keer gewonnen`)
  add('Tegen Ajax, PSV en Feyenoord', { clubs: ['ajax', 'psv', 'feyenoord'] }, () => `sinds ${firstSeason}`)
  add('Vrijdagavond thuis', { days: ['vrijdag'], venues: ['thuis'] }, (found) => `${wonCount(found)} keer gewonnen`)
  add('Zeven doelpunten of meer', { minGoals: 7, order: 'doelsaldo' }, (found) => {
    const [best] = byGoalDifference(found)

    return best === undefined ? undefined : `met ${ourScore(best)} tegen ${best.clubName} bovenaan`
  })
  add('Alle 0–0’s', { ours: 0, theirs: 0 }, () => undefined)
  add('Beslist met strafschoppen', { penalties: true }, () => 'na verlenging')
  // "The rarest day" is only said when it is true: no other day of the week has fewer matches.
  add('Op een maandag', { days: ['maandag'] }, (found) => {
    const counts = days.map((day) => all.filter((match) => dayOf(match) === day.value).length)

    return found.length === Math.min(...counts.filter((count) => count > 0)) ? 'de zeldzaamste dag' : undefined
  })

  const biggest = ask({ order: 'doelsaldo', outcomes: ['gewonnen'] })
  const best = byGoalDifference(biggest.found)[0]

  questions.push(
    best === undefined
      ? undefined
      : {
          figure: ourScore(best),
          href: searchHref(biggest.asked),
          note: 'de lijst, op doelsaldo',
          question: 'Onze grootste zeges',
        },
  )

  return questions.filter((question) => question !== undefined)
}

const numberWords = [
  'nul',
  'één',
  'twee',
  'drie',
  'vier',
  'vijf',
  'zes',
  'zeven',
  'acht',
  'negen',
  'tien',
  'elf',
  'twaalf',
]

/** A number as a word up to twelve, and in digits above, as a sentence starts with it. */
const wordOf = (count: number) => {
  const word = numberWords[count] ?? String(count)

  return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`
}

/** The card with the matches of today's date in earlier years, or undefined without matches. */
export type OnThisDay = {
  intro: string
  matches: { clubs: string; score: string; year: string }[]
  monthHref: string
  monthLabel: string
  title: string
}

/** The matches of the day and month of `now` in Amsterdam in earlier years, newest first. */
export function onThisDayOf(all: readonly SearchableMatch[], now: Date): OnThisDay | undefined {
  const today = amsterdamToday(now)
  const date = { day: today.day, month: today.month }
  const found = findMatches(all, { ...nothing, date }, undefined)
    .filter((match) => Number(match.matchDate.slice(0, 4)) < today.year)
    .toSorted((first, second) => second.matchDate.localeCompare(first.matchDate))

  if (found.length === 0) {
    return undefined
  }

  const home = found.filter((match) => match.home).length
  const away = found.length - home
  const where =
    away === 0
      ? found.length === 1
        ? ', thuis'
        : `, alle ${numberWords[found.length] ?? found.length} thuis`
      : home === 0
        ? found.length === 1
          ? ', uit'
          : `, alle ${numberWords[found.length] ?? found.length} uit`
        : `, ${home} thuis en ${away} uit`

  return {
    intro: `${wordOf(found.length)} keer speelden we op ${dateLabel(date)}${where}.`,
    matches: found.map((match) => ({
      clubs: match.home ? `sc Heerenveen – ${match.opponent}` : `${match.opponent} – sc Heerenveen`,
      score: match.home ? `${match.goalsFor}–${match.goalsAgainst}` : `${match.goalsAgainst}–${match.goalsFor}`,
      year: match.matchDate.slice(0, 4),
    })),
    monthHref: searchHref({ ...nothing, date: { month: today.month } }),
    monthLabel: `Alle wedstrijden in ${months[today.month - 1]}`,
    title: `Op deze dag: ${dateLabel(date)}`,
  }
}
