import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { feeds, items, sources } from '@fansite/db/schema'
import path from 'node:path'

/** A made-up podcast of the seed: its domain, and how many episodes it gets. */
const podcasts = [
  { count: 30, domain: 'testpodcast.test' },
  { count: 12, domain: 'proefpodcast.test' },
]

/**
 * Made-up episodes for the checks of /podcasts and of the homepage. They are not in the seed:
 * the seed also runs on acceptance, where they would mix with the real episodes. The check puts
 * them in the database before the first test and takes them out after the last one. There are
 * more than 25 in all, so /podcasts has a second page, and they go back far enough to show a
 * weekday, a date and a date with a year. The first has a title with a very long word, and one
 * has a title that is HTML: it is shown as text.
 */
export const episodeTitles = {
  html: 'Aflevering over <b>vet</b> & "aanhalingstekens"',
  long: 'Een aflevering met een heel lang woord: OnvoorstelbaarbijzonderevoetbalprestatiesvandejongeverdedigingsliniebijTestclub',
}

const feedPath = '/e2e-a11y/podcast.rss'

const day = 24 * 60 * 60 * 1000

/**
 * Puts the made-up episodes in the database and returns the function that takes them out again.
 * The site must have started already: it makes the tables, and global-setup.ts
 * has put the test sources in (see test-sources.ts).
 */
export async function addEpisodes() {
  const { close, db, pool } = connectToDatabase()

  try {
    // A run that was stopped halfway may have left its episodes.
    await removeEpisodes(pool)

    const registered = await db.select({ domain: sources.domain, id: sources.id }).from(sources)
    const now = Date.now()

    for (const { count, domain } of podcasts) {
      const sourceId = registered.find((source) => source.domain === domain)?.id

      if (sourceId === undefined) {
        throw new Error(
          `The test podcast ${domain} is not in the register. Did global-setup.ts put the test sources in (test-sources.ts)?`,
        )
      }

      const [feed] = await db
        .insert(feeds)
        .values({ sourceId, url: `https://${domain}${feedPath}` })
        .$returningId()

      await db.insert(items).values(
        Array.from({ length: count }, (_, index) => ({
          // Every third has a season and a number, the rest only a duration, and one has
          // neither.
          durationSeconds: index === 5 ? null : 600 + index * 137,
          episodeNumber: index % 3 === 0 ? count - index : null,
          feedId: feed?.id ?? 0,
          key: `e2e-${index}`,
          // The first is an hour old, and each next one is a few days older: this week, this
          // year and years ago.
          publishedAt: new Date(now - (index === 0 ? 1 / 24 : index * 11) * day),
          seasonNumber: index % 6 === 0 ? 2 : null,
          sourceId,
          title: index === 1 ? episodeTitles.long : index === 2 ? episodeTitles.html : `Aflevering ${count - index}`,
          url: `https://${domain}/e/e2e-${index}`,
        })),
      )
    }
  } finally {
    await close()
  }

  return async () => {
    const { close, pool } = connectToDatabase()

    try {
      await removeEpisodes(pool)
    } finally {
      await close()
    }
  }
}

/**
 * Connects with the DATABASE_URL of the environment or the .env in the root, like the server of
 * the check does.
 */
function connectToDatabase() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return connect(readDatabaseEnv().DATABASE_URL)
}

/** Takes the made-up feeds out, and with them their episodes. */
async function removeEpisodes(pool: ReturnType<typeof connect>['pool']) {
  await pool.query('DELETE FROM feeds WHERE url LIKE ?', [`https://%${feedPath}`])
}
