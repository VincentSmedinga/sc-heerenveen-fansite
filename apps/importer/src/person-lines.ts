import type { PlayerPosition } from '@fansite/db/schema'

/** The line of a person, by the title of his article, for a line that Wikidata gets wrong. */
export type PersonLineEntry = {
  line: PlayerPosition
  title: string
}

/**
 * The positions of Wikidata (`P413`) that name a line, by Q-number. The label is what Wikidata
 * calls the item (checked on 8 November 2026). A position that is not here says nothing about
 * the line: the importer skips it, and takes the next position of the person. Add a position
 * when a run shows a person whose line is missing because of it.
 */
export const wikidataPositionLines: ReadonlyMap<string, PlayerPosition> = new Map<string, PlayerPosition>([
  ['Q193592', 'middenvelder'], // midfielder
  ['Q201330', 'doelman'], // goalkeeper
  ['Q268258', 'verdediger'], // centre-back
  ['Q280658', 'aanvaller'], // forward
  ['Q336286', 'verdediger'], // defender
  ['Q8025128', 'middenvelder'], // wing half
  ['Q90173132', 'verdediger'], // full-back
  ['Q90326494', 'middenvelder'], // attacking midfielder
  ['Q114358150', 'aanvaller'], // right winger
])

/**
 * The line of a person, by his title, for a line that neither Wikidata nor the squad lists get
 * right. It goes before everything and is never replaced. The list starts empty: add a person
 * after you checked the line.
 *
 * Example: `{ line: 'middenvelder', title: 'Joost van Aken' }`.
 */
export const personLines: readonly PersonLineEntry[] = []

/** The map for `applyManualLines` and the import: a title to its line. */
export function lineMap(list: readonly PersonLineEntry[]): Map<string, PlayerPosition> {
  return new Map(list.map(({ line, title }) => [title, line] as const))
}
