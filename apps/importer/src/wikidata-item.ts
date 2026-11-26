import type { BirthDatePrecision, PlayerPosition } from '@fansite/db/schema'

import { wikidataPositionLines } from './person-lines.ts'

/** What the page information of an article on Wikipedia tells: its number and its item. */
export type ArticleInfo = {
  pageId: number
  /** The Q-number of the item the article is linked to, or null when it has no item. */
  wikidataId: null | string
}

/** A home ground (`P115`) of a club (#1298), with the dates of its qualifiers if any. */
export type HomeGround = { end: null | PartialDate; stadiumId: string; start: null | PartialDate }

/** A date of a statement as Wikidata knows it: a day, a month or a year, never coarser. */
export type PartialDate = { day: null | number; month: null | number; year: number }

/** What the importer takes from an item to see if a person played for a club (#1678). */
export type PlayerItem = {
  /** Whether the item is a human (`P31` is `Q5`). */
  human: boolean
  /** The Q-number of the item itself. */
  id: string
  /** The teams of `P54`, with the dates of their qualifiers if any. */
  teams: { end: null | PartialDate; start: null | PartialDate; teamId: string }[]
}

/** What the importer takes from the item of a stadium: its coordinates and where it lies. */
export type StadiumItem = {
  /** The coordinates (`P625`), both or none. */
  coordinates: null | { latitude: number; longitude: number }
  /** The Dutch label, else the English one, else null. */
  label: null | string
  /** The Q-number of the place it lies in (`P131`), the first in the order of Wikidata. */
  placeId: null | string
}

/** What the importer takes from the item of a person on Wikidata. */
export type WikidataItem = {
  birth: null | { date: string; precision: BirthDatePrecision }
  /** The date of death (`P570`), read by the rules of the birth date. */
  death: null | { date: string; precision: BirthDatePrecision }
  /** The Q-number of the item itself. */
  id: string
  /** The Dutch label, else the English one, else null. */
  label: null | string
  nationalityIds: string[]
  placeId: null | string
  positionIds: string[]
  /** The countries he plays for (`P1532`, #1278), in the order of Wikidata. */
  sportCountryIds: string[]
}

type Statement = { rank: string; value: unknown }

/** Whether the page information is of a redirect (#1341): a redirect has no item of its own. */
export function isRedirectInfo(html: string): boolean {
  return /"wgIsRedirect":true/u.test(html)
}

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
 * The Q-numbers of the country of an item (`P17`, #1264), in the order of Wikidata, with the
 * same rules as the other properties: a deprecated statement does not count, and a preferred
 * one goes alone. Empty when the item has none or the text is no item.
 */
export function readCountryIds(text: string): string[] {
  const entity = firstEntity(text)
  const claims = entity !== null && isRecord(entity['claims']) ? entity['claims'] : {}

  return itemIdsOf(statementsOf(claims, 'P17'))
}

/**
 * The title of the article on the Dutch Wikipedia that the item links to (`sitelinks.nlwiki`),
 * or null when the item has none or the text is no item.
 */
export function readDutchTitle(text: string): null | string {
  const entity = firstEntity(text)
  const sitelinks = entity !== null && isRecord(entity['sitelinks']) ? entity['sitelinks'] : {}
  const link = sitelinks['nlwiki']
  const title = isRecord(link) && typeof link['title'] === 'string' ? link['title'].trim() : ''

  return title === '' ? null : title
}

/**
 * The home grounds of a club (`P115`, #1298), in the order of Wikidata, each with its start
 * (`P580`) and end (`P582`) when the statement has them. Unlike the other properties every
 * statement counts that is not deprecated, preferred or not: a club that moved has the old
 * ground too, and Wikidata often marks only the current one as preferred. The same stadium
 * may come twice, with other dates. A date coarser than a year, or one that is no date, is
 * left out. Empty when the item has none or the text is no item.
 */
export function readHomeGrounds(text: string): HomeGround[] {
  const entity = firstEntity(text)
  const claims = entity !== null && isRecord(entity['claims']) ? entity['claims'] : {}
  return datedItemsOf(claims, 'P115').map(({ end, itemId, start }) => ({ end, stadiumId: itemId, start }))
}

/**
 * The kinds the item is an instance of (`P31`, #1341), such as a football club, in the order of
 * Wikidata. Empty when the item has none or the text is no item.
 */
export function readInstanceIds(text: string): string[] {
  const entity = firstEntity(text)
  const claims = entity !== null && isRecord(entity['claims']) ? entity['claims'] : {}

  return itemIdsOf(statementsOf(claims, 'P31'))
}

/**
 * Reads the item of Wikidata (`Special:EntityData/Q….json`): the birth date (`P569`), the date
 * of death (`P570`, with the same rules), the birth
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
    birth: dateOf(statementsOf(claims, 'P569')),
    death: dateOf(statementsOf(claims, 'P570')),
    id: entity['id'],
    label: labelOf(entity),
    nationalityIds: itemIdsOf(statementsOf(claims, 'P27')),
    placeId: itemIdsOf(statementsOf(claims, 'P19'))[0] ?? null,
    positionIds: itemIdsOf(statementsOf(claims, 'P413')),
    sportCountryIds: itemIdsOf(statementsOf(claims, 'P1532')),
  }
}

/** The label of an item: the Dutch one, else the English one. Null when it has neither. */
export function readLabel(text: string): null | string {
  const entity = firstEntity(text)

  return entity === null ? null : labelOf(entity)
}

/**
 * The places an item is in (#1278): its headquarters (`P159`) and the places it lies in
 * (`P131`), in the order of Wikidata, without a repeat, with the same rules as the other
 * properties. Empty when it has none. Null when the text is no item.
 */
export function readPlaceIds(text: string): null | string[] {
  const entity = firstEntity(text)

  if (entity === null || typeof entity['id'] !== 'string' || !/^Q\d+$/u.test(entity['id'])) {
    return null
  }

  const claims = isRecord(entity['claims']) ? entity['claims'] : {}

  return [...new Set([...itemIdsOf(statementsOf(claims, 'P159')), ...itemIdsOf(statementsOf(claims, 'P131'))])]
}

/**
 * Whether a person is a human and which teams they were a member of (`P54`, #1678), with the
 * start (`P580`) and end (`P582`) of each. Every statement counts that is not deprecated,
 * preferred or not, since a career has many. Null for a text that is no item.
 */
export function readPlayerItem(text: string): null | PlayerItem {
  const entity = firstEntity(text)

  if (entity === null || typeof entity['id'] !== 'string' || !/^Q\d+$/u.test(entity['id'])) {
    return null
  }

  const claims = isRecord(entity['claims']) ? entity['claims'] : {}

  return {
    human: itemIdsOf(statementsOf(claims, 'P31')).includes('Q5'),
    id: entity['id'],
    teams: datedItemsOf(claims, 'P54').map(({ end, itemId, start }) => ({ end, start, teamId: itemId })),
  }
}

/**
 * The item of a stadium (#1298): the label, the place it lies in (`P131`) and the coordinates
 * (`P625`), with the rules of the other properties. Null for a text that is no item.
 */
export function readStadium(text: string): null | StadiumItem {
  const entity = firstEntity(text)

  if (entity === null || typeof entity['id'] !== 'string' || !/^Q\d+$/u.test(entity['id'])) {
    return null
  }

  const claims = isRecord(entity['claims']) ? entity['claims'] : {}
  let coordinates: StadiumItem['coordinates'] = null

  for (const { value } of statementsOf(claims, 'P625')) {
    const latitude = isRecord(value) ? value['latitude'] : undefined
    const longitude = isRecord(value) ? value['longitude'] : undefined

    if (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
    ) {
      coordinates = { latitude, longitude }

      break
    }
  }

  return { coordinates, label: labelOf(entity), placeId: itemIdsOf(statementsOf(claims, 'P131'))[0] ?? null }
}

/**
 * The items of every statement of a property that is not deprecated, preferred or not, with the
 * dates of the qualifiers start (`P580`) and end (`P582`).
 */
function datedItemsOf(claims: Record<string, unknown>, property: string) {
  const list = Array.isArray(claims[property]) ? (claims[property] as unknown[]) : []
  const found: { end: null | PartialDate; itemId: string; start: null | PartialDate }[] = []

  for (const claim of list) {
    if (!isRecord(claim) || claim['rank'] === 'deprecated' || !isRecord(claim['mainsnak'])) {
      continue
    }

    const snak = claim['mainsnak']
    const data = snak['datavalue']
    const id = isRecord(data) && isRecord(data['value']) ? data['value']['id'] : undefined

    if (snak['snaktype'] !== 'value' || typeof id !== 'string' || !/^Q\d+$/u.test(id)) {
      continue
    }

    const qualifiers = isRecord(claim['qualifiers']) ? claim['qualifiers'] : {}

    found.push({ end: qualifierDate(qualifiers['P582']), itemId: id, start: qualifierDate(qualifiers['P580']) })
  }

  return found
}

function dateOf(statements: Statement[]): WikidataItem['birth'] {
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

/** The first date of the qualifiers of a property that is a day, a month or a year. */
function qualifierDate(qualifiers: unknown): null | PartialDate {
  for (const qualifier of Array.isArray(qualifiers) ? (qualifiers as unknown[]) : []) {
    const data = isRecord(qualifier) ? qualifier['datavalue'] : undefined
    const value = isRecord(data) ? data['value'] : undefined

    if (!isRecord(value) || typeof value['time'] !== 'string' || typeof value['precision'] !== 'number') {
      continue
    }

    const parts = /^\+(\d{4})-(\d\d)-(\d\d)T/u.exec(value['time'])

    if (parts?.[1] === undefined || value['precision'] < 9) {
      continue
    }

    return {
      day: value['precision'] >= 11 && parts[3] !== '00' ? Number(parts[3]) : null,
      month: value['precision'] >= 10 && parts[2] !== '00' ? Number(parts[2]) : null,
      year: Number(parts[1]),
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
