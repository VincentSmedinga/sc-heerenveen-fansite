import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { discussions, sources } from '@fansite/db/schema'
import path from 'node:path'

/** A made-up discussion: how long before the check started it got its last post, and what it says. */
type Row = { minutesAgo: number; replyCount: number; screenName: null | string; title: string }

/**
 * Made-up discussions for the checks of the homepage, in the form of those of the forum. They are not in the seed, and
 * the importer never makes them: they go on the made-up forum of the seed, Proefforum. The check puts them in the
 * database before the first test and takes them out after the last one. Titles and screen names are invented. The
 * times are counted back from the moment the check starts, so each shows in another way: the time, the weekday and
 * the date.
 */
export const forumDiscussions: Row[] = [
  { minutesAgo: 5, replyCount: 83, screenName: 'Buffon1', title: 'Wie wint er zondag?' },
  { minutesAgo: 26 * 60, replyCount: 1, screenName: 'Tribunetijger', title: 'Nieuwe spits gezocht' },
  { minutesAgo: 3 * 24 * 60, replyCount: 0, screenName: null, title: 'Het stadion in de winter' },
  {
    minutesAgo: 10 * 24 * 60,
    replyCount: 1234,
    screenName: 'Tribunetijger_van_het_noorden_en_van_alle_andere_vakken_in_het_stadion_ook_nog',
    title:
      'Een discussie met een heel lange titel over de wedstrijd van zondag, de opstelling, de wissels en OnvoorstelbaarbijzonderediscussieoverdejongeverdedigingsliniebijTestclub',
  },
]

const domain = 'proefforum.test'

/**
 * Puts the made-up discussions in the database and returns the function that takes them out again. The site must have
 * started already: it makes the tables and puts the test sources in (SITE_ENV=acceptance).
 */
export async function addDiscussions() {
  const { close, db, pool } = connectToDatabase()

  try {
    // A run that was stopped halfway may have left its discussions.
    await removeDiscussions(pool)

    const registered = await db.select({ domain: sources.domain, id: sources.id }).from(sources)
    const sourceId = registered.find((source) => source.domain === domain)?.id

    if (sourceId === undefined) {
      throw new Error(`The test source ${domain} is not in the register. Did the site start with SITE_ENV=acceptance?`)
    }

    const now = Date.now()

    await db.insert(discussions).values(
      forumDiscussions.map((row, index) => ({
        lastPostedAt: new Date(now - row.minutesAgo * 60 * 1000),
        lastPostedBy: row.screenName,
        replyCount: row.replyCount,
        sourceId,
        title: row.title,
        url: `https://${domain}/d/${index + 1}-e2e-a11y`,
      })),
    )
  } finally {
    await close()
  }

  return async () => {
    const { close, pool } = connectToDatabase()

    try {
      await removeDiscussions(pool)
    } finally {
      await close()
    }
  }
}

/** Connects with the DATABASE_URL of the environment or the .env in the root, like the server of the check does. */
function connectToDatabase() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return connect(readDatabaseEnv().DATABASE_URL)
}

/** Takes the made-up discussions out. Only those of Proefforum, which the importer never fills. */
async function removeDiscussions(pool: ReturnType<typeof connect>['pool']) {
  await pool.query(
    'DELETE discussions FROM discussions JOIN sources ON sources.id = discussions.source_id WHERE sources.domain = ?',
    [domain],
  )
}
