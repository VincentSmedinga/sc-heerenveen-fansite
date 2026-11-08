import type { BirthDatePrecision, PlayerPosition } from '@fansite/db/schema'

import { wikidataPositionLines } from './person-lines.ts'

/** What the page information of an article on Wikipedia tells: its number and its item. */
export type ArticleInfo = {
  pageId: number
  /** The Q-number of the item the article is linked to, or null when it has no item. */
  wikidataId: null | string
}

/** What the importer takes from the item of a person on Wikidata. */
export type WikidataItem = {
  birth: null | { date: string; precision: BirthDatePrecision }
  /** The Q-number of the item itself. */
  id: string
  /** The Dutch label, else the English one, else null. */
  label: null | string
  nationalityIds: string[]
  placeId: null | string
  positionIds: string[]
}

type Statement = { rank: string; value: unknown }

/**
 * The line of a person from the positions of Wikidata: the first position in the order of
 * Wikidata that the list `wikidataPositionLines` knows. Null when it knows none.
 */
export function lineOfPositions(positionIds: readonly string[]): null | PlayerPosition {
  for (const id of positionIds) {
    const line = wikidataPositionLines.get(id)

    if (line !== undefined) {
      return line
    }
  }

  return null
}

/**
 * The number and the item of an article, from its page information (`?action=info`). The
 * number is 0 for a title without an article, which gives null: the title is a red link. The
 * item is null for an article that is linked to none. Null is also the answer for a page that
 * does not look like page information, which the caller reports.
 */
export function readArticleInfo(html: string): 'missing' | ArticleInfo | null {
  const pageId = /"wgArticleId":(\d+)/u.exec(html)

  if (pageId?.[1] === undefined) {
    return null
  }
  if (Number(pageId[1]) === 0) {
    return 'missing'
  }

  return { pageId: Number(pageId[1]), wikidataId: /Special:EntityPage\/(Q\d+)/u.exec(html)?.[1] ?? null }
}

/**
 * Reads the item of Wikidata (`Special:EntityData/Q….json`): the birth date (`P569`), the birth
 * place (`P19`), the nationalities (`P27`) and the positions (`P413`). A statement with the
 * rank "deprecated" does not count, and when a property has statements with the rank
 * "preferred", only those count. A date coarser than a year is left out. Returns null for a
 * text that is no item.
 */
export function readItem(text: string): null | WikidataItem {
  const entity = firstEntity(text)

  if (entity === null || typeof entity['id'] !== 'string' || !/^Q\d+$/u.test(entity['id'])) {
    return null
  }

  const claims = isRecord(entity['claims']) ? entity['claims'] : {}

  return {
    birth: birthOf(statementsOf(claims, 'P569')),
    id: entity['id'],
    label: labelOf(entity),
    nationalityIds: itemIdsOf(statementsOf(claims, 'P27')),
    placeId: itemIdsOf(statementsOf(claims, 'P19'))[0] ?? null,
    positionIds: itemIdsOf(statementsOf(claims, 'P413')),
  }
}

/** The label of an item: the Dutch one, else the English one. Null when it has neither. */
export function readLabel(text: string): null | string {
  const entity = firstEntity(text)

  return entity === null ? null : labelOf(entity)
}

function birthOf(statements: Statement[]): WikidataItem['birth'] {
  for (const { value } of statements) {
    if (!isRecord(value) || typeof value['time'] !== 'string' || typeof value['precision'] !== 'number') {
      continue
    }

    // `+1994-05-13T00:00:00Z`, and `+1969-00-00T00:00:00Z` for a year. A year before 1000 or
    // after 9999 has no four digits, and a negative year no plus sign: both are skipped.
    const parts = /^\+(\d{4})-(\d\d)-(\d\d)T/u.exec(value['time'])

    if (parts?.[1] === undefined || parts[2] === undefined || parts[3] === undefined || value['precision'] < 9) {
      return null
    }

    const precision: BirthDatePrecision =
      value['precision'] >= 11 ? 'day' : value['precision'] === 10 ? 'month' : 'year'
    const month = precision === 'year' ? '01' : parts[2] === '00' ? '01' : parts[2]
    const day = precision === 'day' ? (parts[3] === '00' ? '01' : parts[3]) : '01'

    return { date: `${parts[1]}-${month}-${day}`, precision }
  }

  return null
}

function firstEntity(text: string): null | Record<string, unknown> {
  let json: unknown

  try {
    json = JSON.parse(text)
  } catch {
    return null
  }

  const entities = isRecord(json) && isRecord(json['entities']) ? Object.values(json['entities']) : []
  const [entity] = entities

  return isRecord(entity) ? entity : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The Q-numbers of the statements, without a repeat, in the order of Wikidata. */
function itemIdsOf(statements: Statement[]): string[] {
  const ids = statements.flatMap(({ value }) =>
    isRecord(value) && typeof value['id'] === 'string' && /^Q\d+$/u.test(value['id']) ? [value['id']] : [],
  )

  return [...new Set(ids)]
}

function labelOf(entity: Record<string, unknown>): null | string {
  const labels = isRecord(entity['labels']) ? entity['labels'] : {}

  for (const language of ['nl', 'en']) {
    const label = labels[language]

    if (isRecord(label) && typeof label['value'] === 'string' && label['value'].trim() !== '') {
      return label['value'].trim()
    }
  }

  return null
}

/** The statements of a property that count: not deprecated, and only the preferred when any. */
function statementsOf(claims: Record<string, unknown>, property: string): Statement[] {
  const list = Array.isArray(claims[property]) ? (claims[property] as unknown[]) : []
  const statements: Statement[] = []

  for (const claim of list) {
    if (!isRecord(claim) || claim['rank'] === 'deprecated' || !isRecord(claim['mainsnak'])) {
      continue
    }

    const snak = claim['mainsnak']
    const data = snak['datavalue']

    if (snak['snaktype'] !== 'value' || !isRecord(data)) {
      continue
    }

    statements.push({ rank: String(claim['rank']), value: data['value'] })
  }

  return statements.some((statement) => statement.rank === 'preferred')
    ? statements.filter((statement) => statement.rank === 'preferred')
    : statements
}
