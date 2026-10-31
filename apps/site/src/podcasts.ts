import {
  countPodcastEpisodes,
  findPodcast,
  listPodcastEpisodes,
  listPodcasts,
  type PublicEpisode,
  type PublicPodcast,
} from '@fansite/db/queries'

import { cacheFor, cacheForKey } from './cache'
import { getDatabase } from './database'
import { itemsPerCard } from './items-per-card'

/** The number of episodes on a page of /nieuws/podcasts. */
export const episodesPerPage = 25

const fiveMinutes = 5 * 60 * 1000

/**
 * The newest episodes of all podcasts together, for the block on the homepage. The list is
 * cached for five minutes, so a visit doesn't cost a query and a new episode shows within five
 * minutes of the import.
 */
export const getLatestEpisodes = cacheFor(fiveMinutes, () =>
  listPodcastEpisodes(getDatabase().db, { limit: itemsPerCard, until: new Date() }),
)

/**
 * The part of the options of a query that limits it to some podcasts, or nothing for all
 * podcasts (an empty key).
 */
function onlyPodcasts(key: string) {
  return key === '' ? {} : { podcasts: key.split(',') }
}

/** The podcasts for the filter: those that are switched on and have an episode. */
const getPodcasts = cacheFor(fiveMinutes, () => listPodcasts(getDatabase().db))

/**
 * The description and the addresses of a podcast at Apple Podcasts and Spotify. The key is the
 * slug of a podcast in the filter.
 */
const getLinks = cacheForKey(fiveMinutes, (slug) => findPodcast(getDatabase().db, slug))

/**
 * The number of episodes of all podcasts, or of some. The key is the slugs, in the order of the
 * list of podcasts and with a comma between them, or an empty text for all.
 */
const getTotal = cacheForKey(fiveMinutes, (slugs) =>
  countPodcastEpisodes(getDatabase().db, { ...onlyPodcasts(slugs), until: new Date() }),
)

/**
 * One page of episodes. The key is the slugs as for `getTotal`, a line feed and the number of
 * the page.
 */
const getPage = cacheForKey(fiveMinutes, (key) => {
  const [slugs = '', page = '1'] = key.split('\n')

  return listPodcastEpisodes(getDatabase().db, {
    limit: episodesPerPage,
    offset: (Number(page) - 1) * episodesPerPage,
    ...onlyPodcasts(slugs),
    until: new Date(),
  })
})

export type PodcastPage = {
  /**
   * The description and the addresses of the podcast that is chosen, when it is exactly one, or
   * undefined.
   */
  about:
    undefined | { applePodcastsUrl: null | string; description: null | string; name: string; spotifyUrl: null | string }
  episodes: PublicEpisode[]
  /** The number of pages, at least 1. */
  pageCount: number
  /** The podcasts for the filter. */
  podcasts: PublicPodcast[]
  /**
   * The podcasts that are chosen, in the order of the list. It is empty for all podcasts: none
   * chosen and all chosen are the same page.
   */
  selected: PublicPodcast[]
}

/**
 * What /nieuws/podcasts shows for podcasts (their slugs, in any order, none for all) and a
 * page, counting from 1. It gives undefined when there is no such page: a slug that isn't in
 * the filter or is given twice, or a page after the last. The slugs are checked against the
 * list of podcasts, and the page against the number of pages, before anything is cached under
 * them, so a visitor can't fill the cache with addresses of their own. The podcasts are put in
 * the order of the list, so the same choice has one key, and all podcasts are the same as
 * none.
 */
export async function getPodcastPage(slugs: readonly string[], page: number): Promise<PodcastPage | undefined> {
  const podcasts = await getPodcasts()
  const chosen = podcasts.filter((item) => slugs.includes(item.slug))

  if (chosen.length !== slugs.length) {
    return undefined
  }

  const selected = chosen.length === podcasts.length ? [] : chosen
  const key = selected.map((item) => item.slug).join(',')
  const pageCount = Math.max(1, Math.ceil((await getTotal(key)) / episodesPerPage))

  if (page > pageCount) {
    return undefined
  }

  const [only] = selected
  const about = selected.length === 1 && only !== undefined ? await getLinks(only.slug) : undefined

  if (selected.length === 1 && about === undefined) {
    return undefined
  }

  return { about, episodes: await getPage(`${key}\n${page}`), pageCount, podcasts, selected }
}
