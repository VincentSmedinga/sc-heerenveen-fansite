// Two persons of one player become one in the admin (issue 977). A player who changed his name
// has a person under the old name and one under the new: an editor chooses the other person on
// the form of a player, reads on a page of its own what the merge does, and confirms. The merge
// itself is that of the importer (`mergePersonInto` in the database package), so both merge by
// one rule. This file adds what the admin needs around it: which person stays by default, the
// words of the confirmation page, and the row of the log.
import type { Database } from '@fansite/db/client'
import type { Person } from '@fansite/db/schema'

import { mergeChosenPersons, type PersonMergePlan, planPersonMerge } from '@fansite/db/person-merge'

import { refreshCompleteness } from './players'

/** A value both persons have a say in, as the confirmation page and the log name it. */
export type MergeDifference = {
  /** What the person that stays has now, in words. `geen` for none. */
  kept: string
  /** The name of the value, with a capital: `Linie`. */
  label: string
  /** What the person that goes has. */
  other: string
  /** What the person that stays has after the merge. */
  result: string
}

/** What `findMerge` found: the plan, or why there is none. */
export type MergeView = 'missing' | 'same' | PersonMergePlan

/** What is in a field without a value. */
export const none = 'geen'

const lineSources = { manual: 'redactie', 'old-site': 'oude fansite', squad: 'selectie', wikidata: 'Wikidata' }
const countrySources = { ...lineSources, list: 'spelerslijst' }

type Facts = Pick<
  Person,
  | 'birthDate'
  | 'birthDatePrecision'
  | 'country'
  | 'countrySource'
  | 'line'
  | 'lineSource'
  | 'name'
  | 'wikidataId'
  | 'wikipediaPage'
>

/**
 * Which of two persons stays unless the editor says otherwise: the one with an article on the
 * Dutch Wikipedia, and of two with one or two without one the oldest (the lowest number).
 */
export function defaultKept(a: Person, b: Person): number {
  const dutch = (person: Person) => person.wikipediaPage !== null && !person.englishTitle

  return dutch(a) === dutch(b) ? Math.min(a.id, b.id) : dutch(a) ? a.id : b.id
}

/**
 * The row of the log of a merge: both persons with their number, name and title, the rows of
 * `players` and the titles that moved, the numbers of what moved with them, and each value of
 * either person that is not the value after the merge. With it a merge can be undone
 * by hand.
 */
export function describeMerge(plan: PersonMergePlan): string {
  const { appearances, doubles, editorsValues, goals, kept, other, pages, rows } = plan
  const person = ({ id, name, wikipediaPage }: Person) =>
    `persoon ${id} (${name ?? 'zonder naam'}, Wikipedia: ${wikipediaPage ?? none})`
  const list = (items: string[]) => (items.length === 0 ? none : items.join(', '))
  // A value of either person that is not the value after the merge is gone.
  const gone = mergeDifferences(plan).flatMap(({ kept: mine, label, other: theirs, result }) =>
    [mine, theirs]
      .filter((value) => value !== none && value !== result)
      .map((value) => `${label.toLowerCase()} ${value}`),
  )

  // What went comes before the lists, which can be long: the log cuts a long line off at its
  // end, and the values that went are what nothing else remembers.
  return [
    `Samengevoegd: ${person(other)} in ${person(kept)}.`,
    `Verdwenen: ${list(gone)}.`,
    `Verhuisd: ${count(goals, 'doelpunt', 'doelpunten')}, ${count(appearances, 'wedstrijdoptreden', 'wedstrijdoptredens')}, ${count(editorsValues, 'waarde van de redactie', 'waarden van de redactie')}, spelersrijen: ${list(rows.map((row) => `${row.id} (${row.season})`))}, titels: ${list(pages)}.`,
    ...(doubles.length === 0
      ? []
      : [
          `Eén rij geworden: ${doubles.map(({ gone: row, season, stays }) => `${row.id} (${row.name}, ${season}) in ${stays.id}`).join(', ')}.`,
        ]),
  ].join(' ')
}

/**
 * What a merge of the two persons does, with `keptId` as the person that stays: one of the
 * two, or the default (`defaultKept`) for anything else. `same` for one person twice,
 * `missing` when either is not there.
 */
export async function findMerge(
  db: Pick<Database, 'select'>,
  personId: number,
  withId: number,
  keptId?: number,
): Promise<MergeView> {
  const plan = await planPersonMerge(db, personId, withId)

  if (plan === 'missing' || plan === 'same') {
    return plan
  }

  const stays = keptId === personId || keptId === withId ? keptId : defaultKept(plan.other, plan.kept)

  return stays === withId ? plan : planPersonMerge(db, withId, personId)
}

/**
 * The values the two persons do not share, with what stays: the name, the Wikipedia page, the
 * item on Wikidata, the line, the country and the date of birth. A value both have the same,
 * or neither has, is not in it.
 */
export function mergeDifferences({ kept, other, result }: PersonMergePlan): MergeDifference[] {
  return personFacts(kept)
    .map(({ label, value }, index) => ({
      kept: value,
      label,
      other: personFacts(other)[index]?.value ?? none,
      result: personFacts(result)[index]?.value ?? none,
    }))
    .filter((difference) => difference.kept !== difference.other)
}

/**
 * Merges two persons for an editor: see `mergeChosenPersons`, which writes `person.merge` with
 * `describeMerge` in the same transaction. A season in which two rows became one has a player
 * less, so its completeness is worked out again.
 */
export async function mergePersons(
  db: Database,
  userId: number,
  { keptId, otherId }: { keptId: number; otherId: number },
  now = new Date(),
): Promise<MergeView> {
  const outcome = await mergeChosenPersons(db, { describe: describeMerge, keptId, otherId, userId }, now)

  if (outcome !== 'missing' && outcome !== 'same') {
    for (const season of new Set(outcome.doubles.map((double) => double.season))) {
      await refreshCompleteness(db, season, now)
    }
  }

  return outcome
}

/**
 * The values of a person the confirmation page puts next to those of the other, in words: the
 * line and the country with where they come from, and the date of birth as exact as we know it.
 */
export function personFacts(person: Facts): { label: string; value: string }[] {
  return [
    { label: 'Naam', value: person.name ?? none },
    { label: 'Wikipedia-pagina', value: person.wikipediaPage ?? none },
    { label: 'Wikidata', value: person.wikidataId ?? none },
    {
      label: 'Linie',
      value: person.line === null ? none : withSource(person.line, lineSources[person.lineSource ?? 'manual']),
    },
    {
      label: 'Land',
      value:
        person.country === null
          ? none
          : withSource(countryName(person.country), countrySources[person.countrySource ?? 'manual']),
    },
    { label: 'Geboortedatum', value: birthDateText(person) },
  ]
}

function birthDateText({ birthDate, birthDatePrecision }: Pick<Person, 'birthDate' | 'birthDatePrecision'>) {
  if (birthDate === null) {
    return none
  }

  const options: Intl.DateTimeFormatOptions =
    birthDatePrecision === 'year'
      ? { year: 'numeric' }
      : birthDatePrecision === 'month'
        ? { month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'long', year: 'numeric' }

  return new Intl.DateTimeFormat('nl-NL', { ...options, timeZone: 'UTC' }).format(new Date(`${birthDate}T00:00:00Z`))
}

const count = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`

function countryName(code: string) {
  try {
    return `${new Intl.DisplayNames('nl', { type: 'region' }).of(code) ?? code} (${code})`
  } catch {
    return code
  }
}

const withSource = (value: string, source: string) => `${value} (${source})`
