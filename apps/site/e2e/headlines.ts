import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { feeds, items, sources } from '@fansite/db/schema'
import path from 'node:path'

/** A made-up item: on which test source, how long before the check started, and what it says. */
type Row = { domain: string; hoursAgo: number; paywalled?: boolean; source: string; title: string }

/**
 * Made-up headlines for the checks of the homepage. They are not in the seed: the seed also runs on acceptance, where
 * they would mix with the real items of the Leeuwarder Courant. The check puts them in the database before the first
 * test and takes them out after the last one.
 *
 * They are in the form of real headlines, on the made-up test sources of the seed. The times are counted back from the
 * moment the check starts. The homepage shows the first ten, and the button under them; `/?nieuws=15` shows all eleven and
 * no button. The first seven are from the last six days and show a weekday; the last four are older and show a date.
 */
export const headlines: { madeUp: Row[] } = {
  madeUp: [
    {
      domain: 'testkrant.test',
      hoursAgo: 1,
      source: 'Testkrant',
      title: 'Heerenveen verslaat Testclub na een doelpunt in de slotminuut',
    },
    {
      domain: 'voorbeeldkrant.test',
      hoursAgo: 2,
      paywalled: true,
      source: 'Voorbeeldkrant, met dank aan de redactie',
      title: 'Trainer na de zege: ‘We hebben laten zien wat erin zit’',
    },
    {
      domain: 'testkrant.test',
      hoursAgo: 4,
      source: 'Testkrant',
      title: 'Blessurezorgen: twee basisspelers twijfelachtig voor zondag',
    },
    {
      domain: 'proefnieuws.test',
      hoursAgo: 27,
      source: 'Proefnieuws',
      title: 'SC Heerenveen haalt jeugdinternational binnen',
    },
    {
      domain: 'proefnieuws.test',
      hoursAgo: 30,
      paywalled: true,
      source: 'Proefnieuws',
      title: 'Interview met de nieuwe aanvaller: ‘Ik voel me al thuis in Friesland’',
    },
    {
      domain: 'testkrant.test',
      hoursAgo: 72,
      source: 'Testkrant',
      title:
        'Een lange kop over een wedstrijd vol wendingen, blessures en een doelpunt in de laatste minuut, met reacties van beide trainers, de spelers en de supporters op de tribune',
    },
    {
      domain: 'voorbeeldkrant.test',
      hoursAgo: 120,
      source: 'Voorbeeldkrant, met dank aan de redactie',
      title: 'Wedstrijdbespreking: ‘OnvoorstelbaarbijzonderevoetbalprestatiesvandejongeverdedigingsliniebijTestclub’',
    },
    {
      domain: 'proefnieuws.test',
      hoursAgo: 192,
      source: 'Proefnieuws',
      title: 'Voorbeschouwing: dit moet Heerenveen op bezoek bij Testclub laten zien',
    },
    {
      domain: 'testkrant.test',
      hoursAgo: 264,
      paywalled: true,
      source: 'Testkrant',
      title: 'Nieuwe keeper tekent tot 2029: ‘Ik wil hier iets moois neerzetten’',
    },
    {
      domain: 'voorbeeldkrant.test',
      hoursAgo: 300,
      source: 'Voorbeeldkrant, met dank aan de redactie',
      title:
        'Terugblik op een bewogen week bij Heerenveen, met een nieuwe aanvaller, een geblesseerde captain en een stadion dat uitverkocht raakt',
    },
    {
      domain: 'proefnieuws.test',
      hoursAgo: 340,
      source: 'Proefnieuws',
      title: 'Heerenveen en Testclub openen het seizoen in een uitverkocht stadion',
    },
  ],
}

/** The feeds of the made-up items. A feed that the importer would read must not outlast the check, so it is easy to recognise. */
const feedPath = '/e2e-a11y/rss/'

const rows: Row[] = headlines.madeUp

/**
 * Puts the made-up headlines in the database and returns the function that takes them out again. The site must have
 * started already: it makes the tables and puts the test sources in (SITE_ENV=acceptance).
 */
export async function addHeadlines() {
  const { close, db, pool } = connectToDatabase()

  try {
    // A run that was stopped halfway may have left its items.
    await removeHeadlines(pool)

    const registered = await db.select({ domain: sources.domain, id: sources.id }).from(sources)
    const now = Date.now()

    for (const domain of new Set(rows.map((row) => row.domain))) {
      const sourceId = registered.find((source) => source.domain === domain)?.id

      if (sourceId === undefined) {
        throw new Error(
          `The test source ${domain} is not in the register. Did the site start with SITE_ENV=acceptance?`,
        )
      }

      const [feed] = await db
        .insert(feeds)
        .values({ sourceId, url: `https://${domain}${feedPath}` })
        .$returningId()

      await db.insert(items).values(
        rows
          .filter((row) => row.domain === domain)
          .map((row, index) => ({
            feedId: feed?.id ?? 0,
            key: `e2e-${index}`,
            paywalled: row.paywalled ?? false,
            publishedAt: new Date(now - row.hoursAgo * 60 * 60 * 1000),
            sourceId,
            title: row.title,
            url: `https://${domain}/e2e-${index}`,
          })),
      )
    }
  } finally {
    await close()
  }

  return async () => {
    const { close, pool } = connectToDatabase()

    try {
      await removeHeadlines(pool)
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

/** Takes the made-up feeds out, and with them their items. */
async function removeHeadlines(pool: ReturnType<typeof connect>['pool']) {
  await pool.query('DELETE FROM feeds WHERE url LIKE ?', [`https://%${feedPath}`])
}
