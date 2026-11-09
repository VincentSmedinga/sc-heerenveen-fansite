import { listRecentItems, type PublicItem } from '@fansite/db/queries'

import { cacheFor } from './cache'
import { getDatabase } from './database'
import { fewestHeadlines, headlineWindowDays, mostHeadlines } from './items-per-card'

const day = 24 * 60 * 60 * 1000

/**
 * The newest headlines from the sources that are switched on, newest first, and none published
 * after now, however old they are: `mostHeadlines` of them, or fewer when the sources have
 * fewer. The card on the homepage picks its list from them with `headlinesOfTheWindow`. The
 * list is cached for five minutes, so a visit doesn't cost a query and a new item shows within
 * five minutes.
 */
export const getHeadlines = cacheFor(5 * 60 * 1000, () =>
  listRecentItems(getDatabase().db, { limit: mostHeadlines, until: new Date() }),
)

/** "15 artikelen over de laatste 3 dagen", with "1 artikel" and "de laatste dag". */
export function headlineCount(count: number, days: number) {
  return `${count} ${count === 1 ? 'artikel' : 'artikelen'} over de laatste ${days === 1 ? 'dag' : `${days} dagen`}`
}

/**
 * The headlines of the last `headlineWindowDays` days (72 hours up to `now`) from a list of the
 * newest ones, newest first: at least `fewestHeadlines` of them, however old, and at most
 * `mostHeadlines`. `days` is the age of the oldest headline in the list in whole days of 24
 * hours, rounded up, and at least 1.
 */
export function headlinesOfTheWindow(items: readonly PublicItem[], now: Date) {
  const since = now.getTime() - headlineWindowDays * day
  const inWindow = items.filter((item) => item.publishedAt.getTime() >= since).length
  const shown = items.slice(0, Math.min(mostHeadlines, Math.max(inWindow, fewestHeadlines)))
  const oldest = shown.at(-1)
  const age = oldest === undefined ? 0 : now.getTime() - oldest.publishedAt.getTime()

  return { days: Math.max(1, Math.ceil(age / day)), items: shown }
}
