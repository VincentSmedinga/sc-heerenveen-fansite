import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { feeds, type ItemRelevance, items, sources } from '@fansite/db/schema'
import path from 'node:path'

/**
 * A made-up item: on which test source, how long before the check started, and what it says.
 */
type Row = {
  domain: string
  hoursAgo: number
  paywalled?: boolean
  relevance?: ItemRelevance
  source: string
  title: string
}

/**
 * Made-up headlines for the checks of the homepage. They are not in the seed: the seed also
 * runs on acceptance, where they would mix with the real items of the Leeuwarder Courant. The
 * check puts them in the database before the first test and takes them out after the last one.
 *
 * They are in the form of real headlines, on the made-up test sources of the seed. The times
 * are counted back from the moment the check starts. The homepage shows the first ten, and the
 * link to /nieuws under them. The first seven are from the last six days and show a weekday and
 * the time; the next four are older and show a weekday and the date. The news page shows them
 * all.
 *
 * Behind them come 45 older headlines of two sources, so that the news page (/nieuws) has 56 in
 * all and a second page of 50 per page, and a page of one source (`/nieuws?bron=testkrant`).
 */
export const headlines: { madeUp: Row[]; notForVisitors: Row[] } = {
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
  // The importer keeps these, but no page may show them, however new they are (#74). The check
  // `relevance.spec.ts` looks for them on every page.
  notForVisitors: [
    {
      domain: 'testkrant.test',
      hoursAgo: 0.5,
      relevance: 'doubtful',
      source: 'Testkrant',
      title: 'Gemeente Verzonnen zoekt een nieuwe wethouder, twijfelgeval',
    },
    {
      domain: 'proefnieuws.test',
      hoursAgo: 0.7,
      relevance: 'irrelevant',
      source: 'Proefnieuws',
      title: 'Verzonnen museum opent de deuren, afgewezen bericht',
    },
  ],
}

/**
 * The 45 headlines for the second page of the archive: older than the eleven above, alternately
 * of Testkrant and Proefnieuws.
 */
const archiveRows: Row[] = Array.from({ length: 45 }, (_, index) => {
  const testkrant = index % 2 === 0

  return {
    domain: testkrant ? 'testkrant.test' : 'proefnieuws.test',
    hoursAgo: 400 + index * 12,
    source: testkrant ? 'Testkrant' : 'Proefnieuws',
    title: `Archiefkop ${index + 1}: terugblik op een wedstrijd van Heerenveen tegen Testclub`,
  }
})

/**
 * The feeds of the made-up items. A feed that the importer would read must not outlast the
 * check, so it is easy to recognise.
 */
const feedPath = '/e2e-a11y/rss/'

const rows: Row[] = [...headlines.madeUp, ...archiveRows, ...headlines.notForVisitors]

/**
 * Puts the made-up headlines in the database and returns the function that takes them out
 * again. The site must have started already: it makes the tables, and global-setup.ts
 * has put the test sources in (see test-sources.ts).
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
          `The test source ${domain} is not in the register. Did global-setup.ts put the test sources in (test-sources.ts)?`,
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
            relevance: row.relevance ?? 'relevant',
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

/** Takes the made-up feeds out, and with them their items. */
async function removeHeadlines(pool: ReturnType<typeof connect>['pool']) {
  await pool.query('DELETE FROM feeds WHERE url LIKE ?', [`https://%${feedPath}`])
}
