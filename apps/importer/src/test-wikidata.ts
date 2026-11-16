import type { Handler } from './test-server.ts'

import { reply } from './test-server.ts'

/**
 * Answers as Wikidata and the page information of the Dutch Wikipedia do, abbreviated to what
 * the importer reads. The shape was read on 8 November 2026 from
 * `Special:EntityData/Q15943430.json` (the item of a footballer) and from `?action=info` on
 * `Joost van Aken`; the values are made up.
 */

export type TestItem = {
  birth?: TimeStatement[]
  /** The coordinates of a stadium (`P625`, #1298). */
  coordinates?: { latitude: number; longitude: number }
  /** The country of the item (`P17`), as a club has it (#1264). */
  countries?: (ItemStatement | string)[]
  /** The date of death (`P570`). */
  death?: TimeStatement[]
  /** The headquarters (`P159`) of a club (#1278). */
  headquarters?: (ItemStatement | string)[]
  /** The home grounds (`P115`) of a club, with the dates of their qualifiers (#1298). */
  homeGrounds?: { end?: TimeValue; rank?: Rank; start?: TimeValue; value: string }[]
  /** What the item is an instance of (`P31`), such as a football club (#1341). */
  instanceOf?: (ItemStatement | string)[]
  /** The label in Dutch and in English; leave both out for an item with no label. */
  labels?: { en?: string; nl?: string }
  nationalities?: (ItemStatement | string)[]
  place?: ItemStatement | string
  /** The places it lies in (`P131`, #1278). */
  placesIn?: (ItemStatement | string)[]
  positions?: (ItemStatement | string)[]
  /** The countries a person plays for (`P1532`, #1278). */
  sportCountries?: (ItemStatement | string)[]
}

type ItemStatement = { rank?: Rank; value: string }

type Rank = 'deprecated' | 'normal' | 'preferred'

type TimeStatement = { precision: number; rank?: Rank; time: string }

type TimeValue = { precision: number; time: string }

const wikidataHeaders = { 'Content-Type': 'application/json; charset=utf-8' }
const pageHeaders = { 'Content-Type': 'text/html; charset=UTF-8' }

/** The page information of an article: its number and its item. */
export function infoPage(pageId: number, item: null | string): string {
  return `<!DOCTYPE html><html><head><script>RLCONF={"wgPageName":"X","wgArticleId":${pageId},"wgNamespaceNumber":0};</script></head><body>${
    item === null ? '' : `<a href="https://www.wikidata.org/wiki/Special:EntityPage/${item}">item</a>`
  }</body></html>`
}

/** The path and query where the importer asks for the page information of a title. */
export function infoPath(title: string): string {
  return `/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}?action=info`
}

/** A route that serves the page information of a title. */
export function infoRoute(title: string, pageId: number, item: null | string): Record<string, Handler> {
  return { [infoPath(title)]: reply(200, infoPage(pageId, item), pageHeaders) }
}

/** The item of Wikidata as JSON text. */
export function itemJson(id: string, item: TestItem = {}): string {
  const items = (list: (ItemStatement | string)[] = []) =>
    list.map((one) => {
      const { rank = 'normal', value } = typeof one === 'string' ? { value: one } : one

      return {
        mainsnak: {
          datavalue: { type: 'wikibase-entityid', value: { 'entity-type': 'item', id: value } },
          property: 'P0',
          snaktype: 'value',
        },
        rank,
        type: 'statement',
      }
    })
  const claims: Record<string, unknown> = {}

  for (const [property, statements] of [
    ['P569', item.birth],
    ['P570', item.death],
  ] as const) {
    if (statements === undefined) {
      continue
    }

    claims[property] = statements.map(({ precision, rank = 'normal', time }) => ({
      mainsnak: {
        datavalue: {
          type: 'time',
          value: { calendarmodel: 'http://www.wikidata.org/entity/Q1985727', precision, time },
        },
        property,
        snaktype: 'value',
      },
      rank,
      type: 'statement',
    }))
  }
  if (item.homeGrounds !== undefined) {
    const qualifier = (time: TimeValue | undefined, property: string) =>
      time === undefined
        ? {}
        : {
            [property]: [
              {
                datavalue: {
                  type: 'time',
                  value: { calendarmodel: 'http://www.wikidata.org/entity/Q1985727', ...time },
                },
                property,
                snaktype: 'value',
              },
            ],
          }

    claims['P115'] = item.homeGrounds.map(({ end, rank = 'normal', start, value }) => ({
      mainsnak: {
        datavalue: { type: 'wikibase-entityid', value: { 'entity-type': 'item', id: value } },
        property: 'P115',
        snaktype: 'value',
      },
      qualifiers: { ...qualifier(start, 'P580'), ...qualifier(end, 'P582') },
      rank,
      type: 'statement',
    }))
  }
  if (item.coordinates !== undefined) {
    claims['P625'] = [
      {
        mainsnak: {
          datavalue: {
            type: 'globecoordinate',
            value: { ...item.coordinates, globe: 'http://www.wikidata.org/entity/Q2', precision: 0.0001 },
          },
          property: 'P625',
          snaktype: 'value',
        },
        rank: 'normal',
        type: 'statement',
      },
    ]
  }
  if (item.countries !== undefined) {
    claims['P17'] = items(item.countries)
  }
  if (item.instanceOf !== undefined) {
    claims['P31'] = items(item.instanceOf)
  }
  if (item.headquarters !== undefined) {
    claims['P159'] = items(item.headquarters)
  }
  if (item.placesIn !== undefined) {
    claims['P131'] = items(item.placesIn)
  }
  if (item.sportCountries !== undefined) {
    claims['P1532'] = items(item.sportCountries)
  }
  if (item.place !== undefined) {
    claims['P19'] = items([item.place])
  }
  if (item.nationalities !== undefined) {
    claims['P27'] = items(item.nationalities)
  }
  if (item.positions !== undefined) {
    claims['P413'] = items(item.positions)
  }

  const labels: Record<string, unknown> = {}

  for (const language of ['nl', 'en'] as const) {
    const value = item.labels?.[language]

    if (value !== undefined) {
      labels[language] = { language, value }
    }
  }

  return JSON.stringify({ entities: { [id]: { claims, id, labels, type: 'item' } } })
}

/** The path and query where the importer asks for an item. */
export function itemPath(id: string): string {
  return `/wiki/Special:EntityData/${id}.json`
}

/** A route that serves an item. */
export function itemRoute(id: string, item: TestItem = {}): Record<string, Handler> {
  return { [itemPath(id)]: reply(200, itemJson(id, item), wikidataHeaders) }
}

/** A route that serves the label of a country, a place or a position. */
export function labelRoute(id: string, nl: string, en = nl): Record<string, Handler> {
  return itemRoute(id, { labels: { en, nl } })
}
