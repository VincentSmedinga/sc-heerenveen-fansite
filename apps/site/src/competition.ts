import type { Competition } from '@fansite/db/schema'

/**
 * The choice of the pages with figures between the matches their cards count, and the address
 * that holds it. It is apart from `matches.ts`, so the code that only handles an address needs
 * no database.
 */

/**
 * Which matches the cards count: `all` is every played match, whatever the competition.
 * `league` is the league (the Eredivisie, and in the two seasons of the Eerste divisie that
 * one), `cup` is the KNVB Beker and `europe` is every European cup and the play-offs for them.
 */
export type CompetitionChoice = 'all' | 'cup' | 'europe' | 'league'

/** The name of the query parameter that holds the choice. `all` has no parameter at all. */
export const competitionParam = 'competitie'

/** The value of each choice in the address, in the order of the switch. */
export const competitionValues = { cup: 'beker', europe: 'europa', league: 'eredivisie' } as const

/** The choices in the order of the switch, with what the switch says. */
export const competitionChoices: { choice: CompetitionChoice; label: string }[] = [
  { choice: 'all', label: 'Alles' },
  { choice: 'league', label: 'Eredivisie' },
  { choice: 'cup', label: 'Beker' },
  { choice: 'europe', label: 'Europa' },
]

/**
 * The competitions of each choice other than `all`. Europe is every European cup and the
 * play-offs for them, as the filter Competitie in the search of matches has it.
 */
const members: Record<Exclude<CompetitionChoice, 'all'>, readonly Competition[]> = {
  cup: ['KNVB Beker'],
  europe: [
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
  league: ['Eredivisie', 'Eerste divisie'],
}

/** Whether a match of this competition counts for the choice. */
export const countsFor = (competition: string, choice: CompetitionChoice) =>
  choice === 'all' || members[choice].includes(competition as Competition)

/**
 * The choice an address asks for with `?competitie=`: no parameter is `all`, and `eredivisie`,
 * `beker` and `europa` are the others. Anything else is undefined, so the page is "niet
 * gevonden": a value that is not known, an empty one, `Eredivisie`, `alle` or one given twice.
 */
export function parseCompetition(value: string | string[] | undefined): CompetitionChoice | undefined {
  if (value === undefined) {
    return 'all'
  }

  return (Object.entries(competitionValues) as [Exclude<CompetitionChoice, 'all'>, string][]).find(
    ([, candidate]) => candidate === value,
  )?.[0]
}

/** The part of a query string that holds the choice: nothing for `all`, which has none. */
export const competitionQuery = (choice: CompetitionChoice) =>
  choice === 'all' ? '' : `?${competitionParam}=${competitionValues[choice]}`

/** The words for what a card counts, after "in" or "alleen": `all` is every competition. */
export const competitionWords = (choice: CompetitionChoice) =>
  ({ all: 'alle competities', cup: 'de KNVB Beker', europe: 'Europa', league: 'de Eredivisie' })[choice]

/**
 * What the switch calls the league: `Eerste divisie` when the matches in range have only that,
 * `Competitie` when they have both, and `Eredivisie` otherwise.
 */
export function leagueLabel(competitions: Iterable<string>) {
  const names = new Set(competitions)

  if (names.has('Eerste divisie')) {
    return names.has('Eredivisie') ? 'Competitie' : 'Eerste divisie'
  }

  return 'Eredivisie'
}

/** What a form or the season picker sends to keep the choice (see `SeasonPicker`). */
export const competitionFields = (choice: CompetitionChoice): Record<string, string> =>
  choice === 'all' ? {} : { [competitionParam]: competitionValues[choice] }

/** The competitions of a choice, which are all of them for `all`. */
export const competitionMembers = (choice: CompetitionChoice): readonly Competition[] | undefined =>
  choice === 'all' ? undefined : members[choice]

/**
 * The choices of the switch when these are the choices that have a match: `all` first, then
 * those in `present` in the order of the switch. With fewer than two present the choices would
 * count the same matches as `all`, so there is nothing to choose and the list is empty.
 */
export const optionsOf = (present: readonly CompetitionChoice[]): CompetitionChoice[] =>
  present.filter((choice) => choice !== 'all').length < 2
    ? []
    : competitionChoices.map(({ choice }) => choice).filter((choice) => choice === 'all' || present.includes(choice))
