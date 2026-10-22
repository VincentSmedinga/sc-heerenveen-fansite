import { eq } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { NewSource } from './schema.ts'

import { connect } from './client.ts'
import { readDatabaseEnv } from './env.ts'
import { feeds, sources } from './schema.ts'

/**
 * Made-up sources for local development, with different policies and permissions. None is real: the domains end in
 * `.test`, which is reserved for tests and never resolves. Proefforum has no description, so the page shows a source
 * without one too.
 */
export const testSources = [
  {
    description: 'Een verzonnen dagblad om de site mee te testen. Het schrijft elke dag over sc Heerenveen.',
    domain: 'testkrant.test',
    kind: 'news',
    name: 'Testkrant',
  },
  {
    consentNote: 'Verzonnen: toestemming gevraagd, nog geen antwoord.',
    consentStatus: 'asked',
    description: 'Een verzonnen nieuwssite met verslagen van elke wedstrijd.',
    domain: 'proefnieuws.test',
    kind: 'news',
    name: 'Proefnieuws',
  },
  {
    allowImage: true,
    attribution: 'Voorbeeldkrant, met dank aan de redactie',
    consentDate: '2026-01-15',
    consentNote: 'Verzonnen: intro tot 200 tekens en foto, zonder insluiten.',
    consentStatus: 'given',
    description: 'Een verzonnen regionale krant, met nieuws over de club en de spelers.',
    domain: 'voorbeeldkrant.test',
    introMaxLength: 200,
    kind: 'news',
    name: 'Voorbeeldkrant',
  },
  {
    allowEmbed: true,
    consentDate: '2026-02-03',
    consentNote: 'Verzonnen: alleen insluiten van afleveringen.',
    consentStatus: 'given',
    description: 'Een verzonnen podcast waarin supporters na elke wedstrijd napraten.',
    domain: 'testpodcast.test',
    kind: 'podcast',
    name: 'Testpodcast',
  },
  {
    domain: 'proefforum.test',
    kind: 'forum',
    name: 'Proefforum',
  },
  {
    allowImage: true,
    consentDate: '2026-03-20',
    consentNote: 'Verzonnen: alleen foto.',
    consentStatus: 'given',
    description: 'Een verzonnen clubsite, met het nieuws van de club zelf.',
    domain: 'testclub.test',
    kind: 'club',
    name: 'Testclub',
  },
  {
    allowEmbed: true,
    consentDate: '2026-04-09',
    consentStatus: 'given',
    description: 'Een verzonnen videokanaal met samenvattingen en interviews.',
    domain: 'voorbeeldvideo.test',
    kind: 'video',
    name: 'Voorbeeldvideo',
  },
  {
    domain: 'uitgezet.test',
    enabled: false,
    kind: 'news',
    name: 'Uitgezette testbron',
  },
] satisfies NewSource[]

/**
 * The real sources, with the feeds we read. They get the strictest policy, because none has given permission yet: only
 * the headline, the link and the name. The descriptions are in our own words. More real sources come with #10.
 */
export const realSources = [
  {
    description:
      'Dagblad uit Leeuwarden voor Friesland. Op de sportpagina’s staan verslagen, interviews en columns over sc Heerenveen.',
    domain: 'www.lc.nl',
    feeds: ['https://www.lc.nl/sport/sc-heerenveen/rss/'],
    kind: 'news',
    name: 'Leeuwarder Courant',
  },
] satisfies (NewSource & { feeds: string[] })[]

/**
 * Puts the test sources and the real sources, with their feeds, in the register. Running it again updates them by
 * domain and by feed address and adds no duplicates. It leaves the `ETag` and `Last-Modified` of a feed alone.
 */
export async function seedSources(db: Database) {
  for (const source of testSources) {
    await db.insert(sources).values(source).onDuplicateKeyUpdate({ set: source })
  }

  for (const { feeds: urls, ...source } of realSources) {
    await db.insert(sources).values(source).onDuplicateKeyUpdate({ set: source })

    const [row] = await db.select({ id: sources.id }).from(sources).where(eq(sources.domain, source.domain))

    if (row === undefined) {
      throw new Error(`The source ${source.domain} is not in the register after the seed put it there.`)
    }

    for (const url of urls) {
      await db
        .insert(feeds)
        .values({ sourceId: row.id, url })
        .onDuplicateKeyUpdate({ set: { sourceId: row.id } })
    }
  }
}

if (import.meta.main) {
  // The made-up sources must never reach production. The site seeds only on acceptance; this keeps `pnpm db:seed` from
  // doing it by hand.
  if (process.env['SITE_ENV'] === 'production') {
    console.error('The seed puts made-up test sources in the register, so it never runs with SITE_ENV=production.')
    process.exit(1)
  }

  const { close, db } = connect(readDatabaseEnv().DATABASE_URL)

  try {
    await seedSources(db)
    console.log(
      `The register holds ${testSources.length} test sources and the real sources: ${realSources.map((source) => source.name).join(', ')}.`,
    )
  } finally {
    await close()
  }
}
