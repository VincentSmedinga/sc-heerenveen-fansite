import {
  countArchiveItems,
  listArchivePage,
  listArchiveSources,
  type PublicArchiveItem,
  type PublicArchiveSource,
} from '@fansite/db/queries'

import { cacheFor, cacheForKey } from './cache'
import { getDatabase } from './database'
import { headlinesPerPage } from './items-per-card'

const fiveMinutes = 5 * 60 * 1000

/** The sources for the filter: those that are switched on and have a headline to show. */
const getSources = cacheFor(fiveMinutes, () => listArchiveSources(getDatabase().db, new Date()))

/**
 * The number of headlines of all sources, or of some. The key is the slugs, in the order of the
 * list of sources and with a comma between them, or an empty text for all.
 */
const getTotal = cacheForKey(fiveMinutes, (slugs) =>
  countArchiveItems(getDatabase().db, { ...onlySources(slugs), until: new Date() }),
)

/**
 * One page of headlines. The key is the slugs as for `getTotal`, a line feed and the number of
 * the page.
 */
const getPage = cacheForKey(fiveMinutes, (key) => {
  const [slugs = '', page = '1'] = key.split('\n')

  return listArchivePage(getDatabase().db, {
    limit: headlinesPerPage,
    offset: (Number(page) - 1) * headlinesPerPage,
    ...onlySources(slugs),
    until: new Date(),
  })
})

export type ArchivePage = {
  headlines: PublicArchiveItem[]
  /** The number of pages, at least 1. */
  pageCount: number
  /**
   * The sources that are chosen, in the order of the list. It is empty for all sources: none
   * chosen and all chosen are the same page.
   */
  selected: PublicArchiveSource[]
  /** The sources for the filter. */
  sources: PublicArchiveSource[]
}

/**
 * What /nieuws shows for sources (their slugs, in any order, none for all) and a page, counting
 * from 1. It gives undefined when there is no such page: a slug that isn't in the filter or is
 * given twice, or a page after the last. The slugs are checked against the list of sources, and
 * the page against the number of pages, before anything is cached under them, so a visitor
 * can't fill the cache with addresses of their own. The sources are put in the order of the
 * list, so the same choice has one key, and all sources are the same as none.
 */
export async function getArchivePage(slugs: readonly string[], page: number): Promise<ArchivePage | undefined> {
  const sources = await getSources()
  const chosen = sources.filter((item) => slugs.includes(item.slug))

  if (chosen.length !== slugs.length) {
    return undefined
  }

  const selected = chosen.length === sources.length ? [] : chosen
  const key = selected.map((item) => item.slug).join(',')
  const pageCount = Math.max(1, Math.ceil((await getTotal(key)) / headlinesPerPage))

  if (page > pageCount) {
    return undefined
  }

  return { headlines: await getPage(`${key}\n${page}`), pageCount, selected, sources }
}

/**
 * The part of the options of a query that limits it to some sources, or nothing for all sources
 * (an empty key).
 */
function onlySources(key: string) {
  return key === '' ? {} : { sources: key.split(',') }
}
