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

/** The number of episodes on a page of /podcasts. */
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
 * The part of the options of a query that limits it to a podcast, or nothing for all podcasts
 * (an empty slug).
 */
function onlyPodcast(slug: string) {
  return slug === '' ? {} : { podcast: slug }
}

/** The podcasts for the filter: those that are switched on and have an episode. */
const getPodcasts = cacheFor(fiveMinutes, () => listPodcasts(getDatabase().db))

/**
 * The description and the addresses of a podcast at Apple Podcasts and Spotify. The key is the
 * slug of a podcast in the filter.
 */
const getLinks = cacheForKey(fiveMinutes, (slug) => findPodcast(getDatabase().db, slug))

/**
 * The number of episodes of all podcasts, or of one. The key is the slug, or an empty text for
 * all.
 */
const getTotal = cacheForKey(fiveMinutes, (slug) =>
  countPodcastEpisodes(getDatabase().db, { ...onlyPodcast(slug), until: new Date() }),
)

/**
 * One page of episodes. The key is the slug (empty for all), a line feed and the number of the
 * page.
 */
const getPage = cacheForKey(fiveMinutes, (key) => {
  const [slug = '', page = '1'] = key.split('\n')

  return listPodcastEpisodes(getDatabase().db, {
    limit: episodesPerPage,
    offset: (Number(page) - 1) * episodesPerPage,
    ...onlyPodcast(slug),
    until: new Date(),
  })
})

export type PodcastPage = {
  episodes: PublicEpisode[]
  /** The number of pages, at least 1. */
  pageCount: number
  /** The podcasts for the filter. */
  podcasts: PublicPodcast[]
  /**
   * The podcast that is chosen, with its description and its addresses, or undefined for all
   * podcasts.
   */
  selected:
    undefined | { applePodcastsUrl: null | string; description: null | string; name: string; spotifyUrl: null | string }
}

/**
 * What /podcasts shows for a podcast (its slug, or undefined for all) and a page, counting from
 * 1. It gives undefined when there is no such page: a podcast that isn't in the filter, or a
 * page after the last. The slug is checked against the list of podcasts, and the page against
 * the number of pages, before anything is cached under them, so a visitor can't fill the cache
 * with addresses of their own.
 */
export async function getPodcastPage(podcast: string | undefined, page: number): Promise<PodcastPage | undefined> {
  const podcasts = await getPodcasts()

  if (podcast !== undefined && !podcasts.some((item) => item.slug === podcast)) {
    return undefined
  }

  const total = await getTotal(podcast ?? '')
  const pageCount = Math.max(1, Math.ceil(total / episodesPerPage))

  if (page > pageCount) {
    return undefined
  }

  const links = podcast === undefined ? undefined : await getLinks(podcast)

  if (podcast !== undefined && links === undefined) {
    return undefined
  }

  return {
    episodes: await getPage(`${podcast ?? ''}\n${page}`),
    pageCount,
    podcasts,
    selected: links,
  }
}
