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
    applePodcastsUrl: 'https://apple.test/podcast/testpodcast',
    consentDate: '2026-02-03',
    consentNote: 'Verzonnen: alleen insluiten van afleveringen.',
    consentStatus: 'given',
    description: 'Een verzonnen podcast waarin supporters na elke wedstrijd napraten.',
    domain: 'testpodcast.test',
    kind: 'podcast',
    name: 'Testpodcast',
    slug: 'testpodcast',
    spotifyUrl: 'https://spotify.test/show/testpodcast',
  },
  {
    applePodcastsUrl: 'https://apple.test/podcast/proefpodcast',
    description: 'Een verzonnen podcast over de jeugd van de club, met alleen een link naar Apple Podcasts.',
    domain: 'proefpodcast.test',
    kind: 'podcast',
    name: 'Proefpodcast',
    slug: 'proefpodcast',
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
 * the headline, the link and the name. The descriptions of news sources are in our own words; the description of a
 * podcast is the text its maker puts in the channel of its feed, as it is written but without the HTML (see
 * `docs/beslissingen.md`). `docs/bronnen.md` says which sources belong here and why.
 *
 * A podcast is a source of kind podcast: the importer reads its feed like a news feed, and an episode is an item whose
 * link is the page of the episode. The enclosure, the MP3 file, is never read.
 *
 * The forum's "feed" is the list of discussions of its API, which the importer reads as a guest (see `read-forum.ts`).
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
  {
    description:
      'Landelijk voetbaltijdschrift en nieuwssite over het betaalde voetbal. De feed bevat de berichten, analyses en video’s over sc Heerenveen; een deel daarvan staat achter een betaalmuur.',
    domain: 'www.vi.nl',
    feeds: ['https://www.vi.nl/feed/news.xml?tag=sc-heerenveen'],
    kind: 'news',
    name: 'Voetbal International',
  },
  {
    description:
      'Landelijk dagblad uit Amsterdam. Onder het onderwerp sc Heerenveen staan verslagen, nieuws over transfers en interviews; een deel daarvan staat achter een betaalmuur.',
    domain: 'www.telegraaf.nl',
    feeds: ['https://www.telegraaf.nl/tag/sc-heerenveen/rss/'],
    kind: 'news',
    name: 'De Telegraaf',
  },
  {
    description:
      'Het forum van onze eigen gemeenschap, waar supporters praten over wedstrijden, spelers en transfers. We tonen alleen de titels van de nieuwste discussies, hoeveel reacties er zijn en wie het laatst reageerde.',
    domain: 'forum.heerenveen.org',
    feeds: [
      'https://forum.heerenveen.org/api/discussions?sort=-lastPostedAt&page[limit]=30&include=lastPostedUser,tags',
    ],
    kind: 'forum',
    name: 'sc Heerenveen Forum',
  },
  {
    applePodcastsUrl: 'https://podcasts.apple.com/nl/podcast/omroep-abe/id1589027848',
    description:
      'Omroep Abe is de podcast over SC Heerenveen van de Leeuwarder Courant. Clubwatcher Sander de Vries bespreekt met oud-spelers Gerald Sibon, Geert Arend Roorda en Henrico Drost wekelijks de actualiteiten en achtergronden bij de club.',
    domain: 'omny.fm',
    feeds: [
      'https://www.omnycontent.com/d/playlist/fdd7ab40-270d-4a1e-a257-acd200da1324/6470c909-db21-4ceb-a53d-b2940145c1ee/06a49ae8-2226-44c4-bbf0-b2940145c83c/podcast.rss',
    ],
    kind: 'podcast',
    name: 'Omroep Abe',
    slug: 'omroep-abe',
    spotifyUrl: 'https://open.spotify.com/show/6agzU3xVFCZIHm4hrvnoHD',
  },
  {
    applePodcastsUrl: 'https://podcasts.apple.com/nl/podcast/radio-camataru/id1436580634',
    description: 'Wekelijkse supporterspodcast over sc Heerenveen!',
    domain: 'radiocamataru.podbean.com',
    feeds: ['https://feed.podbean.com/radiocamataru/feed.xml'],
    kind: 'podcast',
    name: 'Radio Camataru',
    slug: 'radio-camataru',
    spotifyUrl: 'https://open.spotify.com/show/51W3UP2B4H2kBK9Ukyv8et',
  },
] satisfies (NewSource & { feeds: string[] })[]

/**
 * Puts the test sources and the real sources, with their feeds, in the register. Running it again updates them by
 * domain and by feed address and adds no duplicates. It leaves the `ETag`, the `Last-Modified` and the health of a feed
 * alone.
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
