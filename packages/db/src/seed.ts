import { eq } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { FeedFilter, NewMatch, NewSource, NewStandingsRow, NewWikipediaPage, WikipediaPageKind } from './schema.ts'

import { connect } from './client.ts'
import { readDatabaseEnv } from './env.ts'
import { feeds, matches, sources, standings, wikipediaPages } from './schema.ts'
import { seasonOf } from './season.ts'

/**
 * Made-up sources for local development, with different policies and permissions. None is real:
 * the domains end in `.test`, which is reserved for tests and never resolves. Proefforum has no
 * description, so the page shows a source without one too.
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
 * The real sources, with the feeds we read. They get the strictest policy, because none has
 * given permission yet: only the headline, the link and the name. The descriptions of news
 * sources are in our own words; the description of a podcast is the text its maker puts in the
 * channel of its feed, as it is written but without the HTML (see `docs/beslissingen.md`).
 * `docs/bronnen.md` says which sources belong here and why.
 *
 * A podcast is a source of kind podcast: the importer reads its feed like a news feed, and an
 * episode is an item whose link is the page of the episode. The enclosure, the MP3 file, is
 * never read.
 *
 * The forum's "feed" is the list of discussions of its API, which the importer reads as a guest
 * (see `read-forum.ts`).
 *
 * A feed is its address, or an object when it needs a filter: a feed that is about more than
 * the club starts with `club`, so the importer judges each headline (see `docs/bronnen.md`).
 * The seed sets the filter only when it puts the feed in the register; it never changes it
 * later.
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
  {
    description:
      'Regionale publieke omroep van Friesland. Het regionieuws van de provincie van de club; we tonen alleen de berichten waarvan de kop over sc Heerenveen gaat.',
    domain: 'www.omropfryslan.nl',
    feeds: [{ filter: 'club', url: 'https://www.omropfryslan.nl/rss/index.xml' }],
    kind: 'news',
    name: 'Omrop Fryslân',
  },
] satisfies (NewSource & { feeds: (string | { filter: FeedFilter; url: string })[] })[]

/**
 * Puts the test sources and the real sources, with their feeds, in the register. Running it
 * again updates them by domain and by feed address and adds no duplicates. It leaves the
 * `ETag`, the `Last-Modified`, the filter and the health of a feed alone.
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

    for (const feed of urls) {
      const { filter, url } = typeof feed === 'string' ? { filter: 'none' as const, url: feed } : feed

      await db
        .insert(feeds)
        .values({ filter, sourceId: row.id, url })
        .onDuplicateKeyUpdate({ set: { sourceId: row.id } })
    }
  }
}

const dutchMonths = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
]

const day = 24 * 60 * 60 * 1000

/**
 * Made-up matches for the current season, for the pages and the accessibility checks.
 * Every date counts from the moment of the seed, so the season is always the current
 * one: a made-up Eredivisie programme of five rounds with the clubs of `madeUpTable`,
 * and one cup tie.
 *
 * It covers every case a page must show: played at home and away, still to be played
 * with a kick-off, still to be played without one (the weekend as text), postponed, and
 * a cup tie, and three played cup ties with extra time or a shoot-out: a win after extra time,
 * a win on penalties and a loss on penalties. `result_set_at` stays empty, so the import never
 * warns about a made-up result it replaces.
 */
export function madeUpMatches(now: Date): NewMatch[] {
  const season = seasonOf(now)
  const at = (days: number, hours: number, minutes: number) => {
    const moment = new Date(now.getTime() + days * day)

    moment.setUTCHours(hours, minutes, 0, 0)

    return moment
  }
  const dayOf = (moment: Date) => moment.toISOString().slice(0, 10)
  const weekend = at(10, 0, 0)
  const weekendEnd = new Date(weekend.getTime() + 2 * day)
  const weekendText = `${weekend.getUTCDate()}-${weekendEnd.getUTCDate()} ${dutchMonths[weekendEnd.getUTCMonth()]} ${weekendEnd.getUTCFullYear()}`
  const base = { resultSetAt: null, season, stadium: null } as const

  return [
    {
      ...base,
      competition: 'KNVB Beker',
      extraTime: true,
      goalsAgainst: 1,
      goalsFor: 2,
      home: false,
      kickoffAt: at(-70, 18, 0),
      matchDate: dayOf(at(-70, 18, 0)),
      opponent: 'FC Maquette',
      round: 'Eerste ronde',
      stadium: 'Sportpark Maquette',
      status: 'played',
    },
    {
      ...base,
      competition: 'KNVB Beker',
      extraTime: true,
      goalsAgainst: 1,
      goalsFor: 1,
      home: true,
      kickoffAt: at(-60, 18, 45),
      matchDate: dayOf(at(-60, 18, 45)),
      opponent: 'Oefenstad FC',
      penaltiesAgainst: 3,
      penaltiesFor: 4,
      round: 'Achtste finale',
      stadium: 'Stadion Proeflaan',
      status: 'played',
    },
    {
      ...base,
      competition: 'KNVB Beker',
      extraTime: true,
      goalsAgainst: 2,
      goalsFor: 2,
      home: false,
      kickoffAt: at(-50, 19, 0),
      matchDate: dayOf(at(-50, 19, 0)),
      opponent: 'SV Voorbeelddorp',
      penaltiesAgainst: 5,
      penaltiesFor: 4,
      round: 'Kwartfinale',
      stadium: 'Sportpark Voorbeelddorp',
      status: 'played',
    },
    {
      ...base,
      competition: 'Eredivisie',
      goalsAgainst: 0,
      goalsFor: 2,
      home: true,
      kickoffAt: at(-14, 16, 45),
      matchDate: dayOf(at(-14, 16, 45)),
      opponent: 'Testdorp FC',
      round: 'Speelronde 1',
      stadium: 'Stadion Proeflaan',
      status: 'played',
    },
    {
      ...base,
      competition: 'Eredivisie',
      goalsAgainst: 0,
      goalsFor: 1,
      home: false,
      kickoffAt: at(-7, 18, 45),
      matchDate: dayOf(at(-7, 18, 45)),
      opponent: 'Voorbeeld United',
      round: 'Speelronde 2',
      stadium: 'Voorbeeldpark',
      status: 'played',
    },
    {
      ...base,
      competition: 'Eredivisie',
      home: true,
      kickoffAt: at(3, 18, 45),
      matchDate: dayOf(at(3, 18, 45)),
      opponent: 'Proefstad SV',
      round: 'Speelronde 3',
      stadium: 'Stadion Proeflaan',
      status: 'scheduled',
    },
    {
      ...base,
      competition: 'Eredivisie',
      dateText: weekendText,
      home: false,
      matchDate: dayOf(weekend),
      opponent: 'Nepstad Rangers',
      round: 'Speelronde 4',
      stadium: 'Nepstadion',
      status: 'scheduled',
    },
    {
      ...base,
      competition: 'Eredivisie',
      home: true,
      kickoffAt: at(-2, 14, 30),
      matchDate: dayOf(at(-2, 14, 30)),
      opponent: 'Demo Boys',
      round: 'Speelronde 5',
      stadium: 'Stadion Proeflaan',
      status: 'postponed',
    },
    {
      ...base,
      competition: 'KNVB Beker',
      home: false,
      kickoffAt: at(5, 19, 0),
      matchDate: dayOf(at(5, 19, 0)),
      opponent: 'SV Proefdorp',
      round: 'Tweede ronde',
      stadium: 'Sportpark Proefdorp',
      status: 'scheduled',
    },
  ]
}

/**
 * A made-up league table that agrees with `madeUpMatches`: six made-up clubs and sc Heerenveen,
 * two rounds played, and the day of the last match as the day it holds for.
 */
export function madeUpTable(now: Date): NewStandingsRow[] {
  const season = seasonOf(now)
  const validOn = new Date(now.getTime() - 7 * day).toISOString().slice(0, 10)
  const rows: [string, number, number, number, number, number][] = [
    ['sc Heerenveen', 2, 0, 0, 3, 0],
    ['Demo Boys', 1, 1, 0, 5, 4],
    ['Proefstad SV', 1, 1, 0, 2, 1],
    ['Voorbeeld United', 0, 1, 1, 1, 2],
    ['Testdorp FC', 0, 1, 1, 2, 4],
    ['Nepstad Rangers', 0, 0, 2, 2, 4],
  ]

  return rows.map(([club, won, drawn, lost, goalsFor, goalsAgainst], index) => ({
    club,
    drawn,
    goalDifference: goalsFor - goalsAgainst,
    goalsAgainst,
    goalsFor,
    lost,
    played: won + drawn + lost,
    points: 3 * won + drawn,
    position: index + 1,
    season,
    validOn,
    won,
  }))
}

/**
 * The Wikipedia pages that the made-up matches pretend to come from, with the titles the
 * importer reads (`pageTitles` in the importer), so a page can credit its source like it will
 * with the real data. They count as read at `now`.
 */
export function madeUpWikipediaPages(now: Date): NewWikipediaPage[] {
  const season = seasonOf(now)
  const page = (kind: WikipediaPageKind, title: string): NewWikipediaPage => ({
    kind,
    readAt: now,
    season,
    title,
    version: null,
  })

  return [
    page('standings', `Eredivisie ${season} (mannenvoetbal)`),
    page('programme', `Eredivisie ${season} (mannenvoetbal)/Wedstrijden`),
    page('cup', `KNVB Beker ${season} (mannen)`),
  ]
}

/**
 * Puts made-up matches, a made-up league table and the pages they credit in the database, but
 * only when the current season has none of either. The real import replaces them with
 * Wikipedia's the first time it runs, and a database that already has the real ones is left
 * alone, so a restart on acceptance never puts the made-up ones over the real ones. Returns
 * whether it put them in.
 */
export async function seedMatches(db: Database, now: Date = new Date()): Promise<boolean> {
  const season = seasonOf(now)

  return db.transaction(async (transaction) => {
    const [anyMatch] = await transaction
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.season, season))
      .limit(1)
    const [anyRow] = await transaction
      .select({ club: standings.club })
      .from(standings)
      .where(eq(standings.season, season))
      .limit(1)

    if (anyMatch !== undefined || anyRow !== undefined) {
      return false
    }

    await transaction.insert(matches).values(madeUpMatches(now))
    await transaction.insert(standings).values(madeUpTable(now))

    for (const page of madeUpWikipediaPages(now)) {
      await transaction
        .insert(wikipediaPages)
        .values(page)
        .onDuplicateKeyUpdate({ set: { readAt: page.readAt } })
    }

    return true
  })
}

if (import.meta.main) {
  // The made-up sources must never reach production. The site seeds only on acceptance; this
  // keeps `pnpm db:seed` from doing it by hand.
  if (process.env['SITE_ENV'] === 'production') {
    console.error('The seed puts made-up test sources in the register, so it never runs with SITE_ENV=production.')
    process.exit(1)
  }

  const { close, db } = connect(readDatabaseEnv().DATABASE_URL)

  try {
    await seedSources(db)
    await seedMatches(db)
    console.log(
      `The register holds ${testSources.length} test sources and the real sources: ${realSources.map((source) => source.name).join(', ')}.`,
    )
  } finally {
    await close()
  }
}
