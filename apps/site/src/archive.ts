import {
  countArchiveItems,
  listArchivePage,
  listArchiveSources,
  type PublicArchiveItem,
  type PublicArchiveSource,
} from '@fansite/db/queries'

import { cacheFor, cacheForKey } from './cache'
import { getDatabase } from './database'

/** The number of headlines on a page of /nieuws. */
export const headlinesPerPage = 50

const fiveMinutes = 5 * 60 * 1000

/** The sources for the filter: those that are switched on and have a headline to show. */
const getSources = cacheFor(fiveMinutes, () => listArchiveSources(getDatabase().db, new Date()))

/**
 * The number of headlines of all sources, or of one. The key is the slug, or an empty text for
 * all.
 */
const getTotal = cacheForKey(fiveMinutes, (slug) =>
  countArchiveItems(getDatabase().db, { ...onlySource(slug), until: new Date() }),
)

/**
 * One page of headlines. The key is the slug (empty for all), a line feed and the number of the
 * page.
 */
const getPage = cacheForKey(fiveMinutes, (key) => {
  const [slug = '', page = '1'] = key.split('\n')

  return listArchivePage(getDatabase().db, {
    limit: headlinesPerPage,
    offset: (Number(page) - 1) * headlinesPerPage,
    ...onlySource(slug),
    until: new Date(),
  })
})

export type ArchivePage = {
  headlines: PublicArchiveItem[]
  /** The number of pages, at least 1. */
  pageCount: number
  /** The source that is chosen, or undefined for all sources. */
  selected: PublicArchiveSource | undefined
  /** The sources for the filter. */
  sources: PublicArchiveSource[]
}

/**
 * What /nieuws shows for a source (its slug, or undefined for all) and a page, counting from 1.
 * It gives undefined when there is no such page: a source that isn't in the filter, or a page
 * after the last. The slug is checked against the list of sources, and the page against the
 * number of pages, before anything is cached under them, so a visitor can't fill the cache with
 * addresses of their own.
 */
export async function getArchivePage(source: string | undefined, page: number): Promise<ArchivePage | undefined> {
  const sources = await getSources()
  const selected = source === undefined ? undefined : sources.find((item) => item.slug === source)

  if (source !== undefined && selected === undefined) {
    return undefined
  }

  const pageCount = Math.max(1, Math.ceil((await getTotal(source ?? '')) / headlinesPerPage))

  if (page > pageCount) {
    return undefined
  }

  return { headlines: await getPage(`${source ?? ''}\n${page}`), pageCount, selected, sources }
}

/**
 * The part of the options of a query that limits it to a source, or nothing for all sources (an
 * empty slug).
 */
function onlySource(slug: string) {
  return slug === '' ? {} : { source: slug }
}
