import { listRecentItems, type PublicItem } from '@fansite/db/queries'

import { cacheForKey } from './cache'
import { getDatabase } from './database'
import { itemsPerCard } from './items-per-card'

/** The most headlines the homepage shows. Older news is for the archive (#26). */
export const maxHeadlines = 100

export type Headlines = {
  /** The newest headlines, newest first: `count` of them, or fewer when the sources have fewer. */
  headlines: PublicItem[]
  /** Whether the sources have older headlines than these, and the homepage can show more of them. */
  more: boolean
}

/**
 * The newest `count` headlines from the sources that are switched on, newest first, and none published after now,
 * however old they are. It asks for one more than `count`, to know whether there are older ones. At `maxHeadlines`
 * there are no more to load, so it doesn't ask for the extra one. The list for each `count` is cached for five minutes,
 * so a visit doesn't cost a query and a new item shows within five minutes.
 *
 * The cache has an entry for every `count` it is asked for, so a `count` that isn't one that `parseHeadlineCount` gives
 * becomes the first card of headlines: a visitor can't fill the memory of the server with numbers of their own. That
 * leaves twenty entries at most.
 */
export function getHeadlines(count: number): Promise<Headlines> {
  return getHeadlinesFor(String(parseHeadlineCount(String(count))))
}

/**
 * The number of headlines that the address asks for with `?nieuws=`: a whole number from the number per card, in steps
 * of that number, and no more than `maxHeadlines`. Anything else, such as no number, a number twice, `7`, `0`, `-5`,
 * `1e1`, `010`, `105` or `abc`, gives the first card of headlines.
 */
export function parseHeadlineCount(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,2}$/u.test(value)) {
    return itemsPerCard
  }

  const count = Number(value)

  return count % itemsPerCard === 0 && count <= maxHeadlines ? count : itemsPerCard
}

const getHeadlinesFor = cacheForKey(5 * 60 * 1000, async (key) => {
  const count = Number(key)
  const found = await listRecentItems(getDatabase().db, {
    limit: count < maxHeadlines ? count + 1 : count,
    until: new Date(),
  })

  return { headlines: found.slice(0, count), more: found.length > count }
})
