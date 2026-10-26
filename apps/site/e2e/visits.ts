import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { dailyVisitors, pageViews } from '@fansite/db/schema'
import path from 'node:path'

import { lastDays } from '../src/beheer/visits'

/**
 * The made-up counters for the page "Bezoek" of the admin: the last twelve days, newest first,
 * and a few pages. The paths start with this, so a leftover is easy to find and the rows
 * are the only ones in `page_views` that the checks write.
 */
const pathPrefix = '/e2e-bezoek'

/**
 * The visitors and views of the made-up days, today first. Today and the other days differ, so
 * a total that is added up wrongly shows.
 */
const dayNumbers = [
  [12, 31],
  [48, 120],
  [51, 133],
  [37, 90],
  [64, 211],
  [42, 98],
  [29, 61],
  [55, 140],
  [40, 102],
  [33, 77],
  [26, 58],
  // The oldest day has more than a thousand, so the page shows a thousands separator.
  [1204, 3519],
] as const

/** The made-up pages and how many views each has on every made-up day. */
const pagePaths = [
  [pathPrefix, 5],
  [`${pathPrefix}/een-heel-lang-pad/dat-de-pagina-niet-breder-mag-maken/zonder-spaties-of-streepjes`, 2],
  [`${pathPrefix}/derde`, 1],
] as const

const loopback = new Set(['127.0.0.1', '::1', '[::1]', 'localhost'])

/**
 * Puts the made-up counters in the database and returns the function that takes them out
 * again. Like `addAdmin`, it only works on a database on this computer. A day that already
 * has a counter keeps it; the function takes out only the counters it put in, found by their
 * exact numbers. The site must have started already: it makes the tables.
 */
export async function addVisits() {
  const { DATABASE_URL } = databaseEnv()
  const { hostname } = new URL(DATABASE_URL)

  if (!loopback.has(hostname)) {
    throw new Error(
      `The checks of the page Bezoek only write to a database on this computer, and DATABASE_URL names ${hostname}.`,
    )
  }

  const { close, db, pool } = connect(DATABASE_URL)
  const days = lastDays(new Date(), dayNumbers.length)

  try {
    // A run that was stopped halfway may have left its counters.
    await remove(pool, days)

    await db
      .insert(dailyVisitors)
      .ignore()
      .values(days.map((day, index) => ({ day, visitors: dayNumbers[index]?.[0] ?? 0 })))
    await db.insert(pageViews).values(
      days.flatMap((day, index) =>
        pagePaths.map(([pagePath, share]) => ({
          day,
          path: pagePath,
          views: (dayNumbers[index]?.[1] ?? 0) * share,
        })),
      ),
    )
  } finally {
    await close()
  }

  return async () => {
    const { close: closeAgain, pool: poolAgain } = connect(DATABASE_URL)

    try {
      await remove(poolAgain, days)
    } finally {
      await closeAgain()
    }
  }
}

/**
 * Connects with the DATABASE_URL of the environment or the .env in the root, like the server of
 * the check does.
 */
function databaseEnv() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return readDatabaseEnv()
}

/** Takes the made-up pages out, and the made-up number of each day if it is still there. */
async function remove(pool: ReturnType<typeof connect>['pool'], days: readonly string[]) {
  await pool.query('DELETE FROM page_views WHERE path LIKE ?', [`${pathPrefix}%`])

  for (const [index, day] of days.entries()) {
    await pool.query('DELETE FROM daily_visitors WHERE day = ? AND visitors = ?', [day, dayNumbers[index]?.[0]])
  }
}
