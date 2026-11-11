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
  /** The date of death (`P570`). */
  death?: TimeStatement[]
  /** The label in Dutch and in English; leave both out for an item with no label. */
  labels?: { en?: string; nl?: string }
  nationalities?: (ItemStatement | string)[]
  place?: ItemStatement | string
  positions?: (ItemStatement | string)[]
}

type ItemStatement = { rank?: Rank; value: string }

type Rank = 'deprecated' | 'normal' | 'preferred'

type TimeStatement = { precision: number; rank?: Rank; time: string }

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
