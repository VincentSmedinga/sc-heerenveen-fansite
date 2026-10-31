import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'

import type { Database } from './client.ts'
import type {
  FeedFilter,
  NewMatch,
  NewMatchGoal,
  NewPlayer,
  NewSource,
  NewStandingsRow,
  NewWikipediaPage,
  WikipediaPageKind,
} from './schema.ts'

import { connect } from './client.ts'
import { withClubs } from './clubs.ts'
import { readDatabaseEnv } from './env.ts'
import { feeds, matches, matchGoals, players, sources, standings, wikipediaPages } from './schema.ts'
import { seasonOf } from './season.ts'
import { seedStaff } from './staff-seed.ts'

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
    slug: 'testkrant',
  },
  {
    consentNote: 'Verzonnen: toestemming gevraagd, nog geen antwoord.',
    consentStatus: 'asked',
    description: 'Een verzonnen nieuwssite met verslagen van elke wedstrijd.',
    domain: 'proefnieuws.test',
    kind: 'news',
    name: 'Proefnieuws',
    slug: 'proefnieuws',
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
    slug: 'voorbeeldkrant',
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
    slug: 'testclub',
  },
  {
    allowEmbed: true,
    consentDate: '2026-04-09',
    consentStatus: 'given',
    description: 'Een verzonnen videokanaal met samenvattingen en interviews.',
    domain: 'voorbeeldvideo.test',
    kind: 'video',
    name: 'Voorbeeldvideo',
    slug: 'voorbeeldvideo',
  },
  {
    domain: 'uitgezet.test',
    enabled: false,
    kind: 'news',
    name: 'Uitgezette testbron',
    slug: 'uitgezette-testbron',
  },
] satisfies NewSource[]

/**
 * The real sources, with the feeds we read. They get the strictest policy, because none has
 * given permission yet: only the headline, the link and the name. The descriptions of news
 * sources are in our own words; the description of a podcast is the text its maker puts in the
 * channel of its feed, as it is written but without the HTML (see `docs/beslissingen.md`).
 * `docs/bronnen.md` says which sources belong here and why.
 *
 * Every source that can have headlines has a `slug`, the fixed name of the source in the
 * address of the news archive (`/nieuws?bron=<slug>`). It stays the same when the name changes,
 * so a renamed source keeps its address. The forum has none, because it has discussions and no
 * items.
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
    slug: 'leeuwarder-courant',
  },
  {
    description:
      'Landelijk voetbaltijdschrift en nieuwssite over het betaalde voetbal. De feed bevat de berichten, analyses en video’s over sc Heerenveen; een deel daarvan staat achter een betaalmuur.',
    domain: 'www.vi.nl',
    feeds: ['https://www.vi.nl/feed/news.xml?tag=sc-heerenveen'],
    kind: 'news',
    name: 'Voetbal International',
    slug: 'voetbal-international',
  },
  {
    description:
      'Landelijk dagblad uit Amsterdam. Onder het onderwerp sc Heerenveen staan verslagen, nieuws over transfers en interviews; een deel daarvan staat achter een betaalmuur.',
    domain: 'www.telegraaf.nl',
    feeds: ['https://www.telegraaf.nl/tag/sc-heerenveen/rss/'],
    kind: 'news',
    name: 'De Telegraaf',
    slug: 'de-telegraaf',
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
    slug: 'omrop-fryslan',
  },
  {
    description:
      'Landelijke publieke nieuwsomroep. In de voetbalfeed staat het voetbalnieuws uit binnen- en buitenland; we tonen alleen de berichten waarvan de kop over sc Heerenveen gaat.',
    domain: 'nos.nl',
    feeds: [{ filter: 'club', url: 'https://feeds.nos.nl/nosvoetbal' }],
    kind: 'news',
    name: 'NOS',
    slug: 'nos',
  },
  {
    description:
      'Landelijk dagblad. In de voetbalfeed staat het voetbalnieuws uit binnen- en buitenland, ook veel achter de betaalmuur; we tonen alleen de berichten waarvan de kop over sc Heerenveen gaat.',
    domain: 'www.ad.nl',
    feeds: [{ filter: 'club', url: 'https://www.ad.nl/voetbal/rss.xml' }],
    kind: 'news',
    name: 'Algemeen Dagblad',
    slug: 'algemeen-dagblad',
  },
  {
    description:
      'Nederlandse nieuwssite van de sportzender ESPN. In de voetbalfeed staat het voetbalnieuws uit binnen- en buitenland; we tonen alleen de berichten waarvan de kop over sc Heerenveen gaat.',
    domain: 'www.espn.nl',
    feeds: [{ filter: 'club', url: 'https://www.espn.nl/espn/rss/soccer/news' }],
    kind: 'news',
    name: 'ESPN',
    slug: 'espn',
  },
] satisfies (NewSource & { feeds: (string | { filter: FeedFilter; url: string })[] })[]

/**
 * The fields of a source that the admin changes (see #31), so a seed that finds the source
 * already in the register never overwrites them: whether it is switched on, what permission it
 * gave and how it wants to be credited.
 */
const adminFields = [
  'allowEmbed',
  'allowImage',
  'attribution',
  'consentDate',
  'consentNote',
  'consentStatus',
  'enabled',
  'introMaxLength',
] as const satisfies (keyof NewSource)[]

/**
 * Takes the test sources out of the register, with their feeds and items, for acceptance, which
 * had them before it got only real sources. It recognises them by the domain in `testSources`
 * and deletes nothing else. Returns how many sources it removed, which is none when it runs
 * again.
 */
export async function removeTestSources(db: Database): Promise<number> {
  const [result] = await db.delete(sources).where(
    inArray(
      sources.domain,
      testSources.map((source) => source.domain),
    ),
  )

  return result.affectedRows
}

/**
 * Puts the real sources, with their feeds, in the register. Running it again updates a source
 * by its domain and a feed by its address and adds no duplicates. It leaves what the admin
 * changes alone (`enabled`, the permission and the credit of a source that is already there)
 * and the `ETag`, the `Last-Modified`, the filter and the health of a feed.
 *
 * The site calls this when it starts on acceptance and on production. The list of real sources
 * goes when the admin (#31) can add sources, because the register is then the only truth.
 */
export async function seedRealSources(db: Database) {
  for (const { feeds: urls, ...source } of realSources) {
    const update = Object.fromEntries(
      Object.entries(source).filter(([field]) => !(adminFields as readonly string[]).includes(field)),
    )

    await db.insert(sources).values(source).onDuplicateKeyUpdate({ set: update })

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

/**
 * Puts the test sources and the real sources in the register, for local development and the
 * tests. Running it again updates them by domain and by feed address and adds no duplicates.
 * Acceptance and production get only the real sources (`seedRealSources`).
 */
export async function seedSources(db: Database) {
  for (const source of testSources) {
    await db.insert(sources).values(source).onDuplicateKeyUpdate({ set: source })
  }

  await seedRealSources(db)
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

/** The goals of one made-up match, without the match they belong to. */
export type MadeUpGoal = Omit<NewMatchGoal, 'id' | 'matchId'>

/** A made-up match, without its club: `withClubs` finds or makes it from the opponent. */
export type MadeUpMatch = Omit<NewMatch, 'clubId'>

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
export function madeUpMatches(now: Date): MadeUpMatch[] {
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
      goalsFor: 6,
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
      goalsFor: 6,
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
 * The made-up players who score, with the page each is known by. A goal in `madeUpGoals` names
 * the surname and this page, and the seed links it to the player (see `linkMadeUpGoals`). Two
 * of them are called Testvoort, so the goals of those two can only be told apart by the page.
 * Monster is no longer in the squad but has his goal. They are 12 players, and `madeUpSquad`
 * has them next to the other players.
 */
const madeUpScorers: [name: string, shirtNumber: number, inSquad: boolean][] = [
  ['Rick Demo', 30, true],
  ['Teun Dummy', 31, true],
  ['Sander Monster', 32, false],
  ['Lennart Probeer', 33, true],
  ['Gerrit Nepper', 34, true],
  ['Marijn Sjabloon', 35, true],
  ['Wouter Proefman', 36, true],
  ['Niels Steekproef', 37, true],
  ['Joris Testvoort', 38, true],
  ['Bas Testvoort', 39, true],
  ['Jan van der Voorbeeldstraat-Proefmans', 40, true],
  ['Pieter Voorbeeld', 41, true],
]

/**
 * Made-up scorers for the played matches of `madeUpMatches`, by `<competition>|<round>`, in
 * the order of the clock. The goals of each club add up to its result. Together they cover the
 * cases a page must show: goals of one club only and of both, a penalty, an own goal, added
 * time, a player with two goals, extra time and a long name. The players are made up, like the
 * clubs. For the top scorers they make twelve players: Wouter Proefman with three goals, two
 * players with two goals who share the second place, and nine with one goal who share the
 * fourth. The own goal of an opponent counts for nobody.
 *
 * The goals of our players have the page of the player (`wikipedia_page`), as the importer
 * stores it, and the seed links them to `players`: a goal of a player who left the squad
 * (Monster), and the goals of two players with the same surname (Testvoort). A goal of the
 * opponent has no page and no player.
 */
export const madeUpGoals: Record<string, MadeUpGoal[]> = {
  'Eredivisie|Speelronde 1': [
    { minute: 12, ours: true, player: 'Demo', stoppageMinutes: null, wikipediaPage: 'Rick Demo' },
    { minute: 25, ours: true, player: 'Dummy', stoppageMinutes: null, wikipediaPage: 'Teun Dummy' },
    { minute: 41, ours: true, player: 'Monster', stoppageMinutes: null, wikipediaPage: 'Sander Monster' },
    { minute: 58, ours: true, player: 'Probeer', stoppageMinutes: null, wikipediaPage: 'Lennart Probeer' },
    { minute: 77, ours: true, player: 'Nepper', stoppageMinutes: null, wikipediaPage: 'Gerrit Nepper' },
    { minute: 83, ours: true, player: 'Demo', stoppageMinutes: null, wikipediaPage: 'Rick Demo' },
  ],
  'Eredivisie|Speelronde 2': [
    { minute: 8, ours: true, player: 'Sjabloon', stoppageMinutes: null, wikipediaPage: 'Marijn Sjabloon' },
    { minute: 23, ours: true, player: 'Proefman', stoppageMinutes: null, wikipediaPage: 'Wouter Proefman' },
    { minute: 51, ours: true, player: 'Steekproef', stoppageMinutes: null, wikipediaPage: 'Niels Steekproef' },
    { minute: 66, ours: true, player: 'Testvoort', stoppageMinutes: null, wikipediaPage: 'Joris Testvoort' },
    { minute: 74, ours: true, player: 'Testvoort', stoppageMinutes: null, wikipediaPage: 'Bas Testvoort' },
    { minute: 90, ours: true, player: 'Nepper', stoppageMinutes: 4, wikipediaPage: 'Gerrit Nepper' },
  ],
  'KNVB Beker|Achtste finale': [
    {
      minute: 30,
      ours: true,
      player: 'Van der Voorbeeldstraat-Proefmans',
      stoppageMinutes: null,
      wikipediaPage: 'Jan van der Voorbeeldstraat-Proefmans',
    },
    { minute: 90, ours: false, player: 'Oefenaar', stoppageMinutes: 3 },
  ],
  'KNVB Beker|Eerste ronde': [
    { minute: 12, ours: true, player: 'Proefman', stoppageMinutes: null, wikipediaPage: 'Wouter Proefman' },
    { minute: 55, ours: false, player: 'Teststraat', stoppageMinutes: null },
    { minute: 105, ours: true, player: 'Proefman', stoppageMinutes: null, wikipediaPage: 'Wouter Proefman' },
  ],
  'KNVB Beker|Kwartfinale': [
    {
      minute: 18,
      ours: true,
      penalty: true,
      player: 'Voorbeeld',
      stoppageMinutes: null,
      wikipediaPage: 'Pieter Voorbeeld',
    },
    { minute: 45, ours: false, player: 'Teststraat', stoppageMinutes: 1 },
    { minute: 70, ours: true, ownGoal: true, player: 'Kopie', stoppageMinutes: null },
    { minute: 88, ours: false, player: 'Teststraat', stoppageMinutes: null },
  ],
}

/**
 * A made-up squad for the current season, for the pages and the accessibility checks: invented
 * names, all four positions, a name with a particle, a name of one word and a player without a
 * shirt number. It passes the checks of the importer (18 to 45 players, two goalkeepers). The
 * search terms are written out, as the importer would work them out, and every player has the
 * page of his name. The players who score in `madeUpGoals` are in it too, with one who has left
 * the squad (`in_squad` false), who is not in the list on the search page.
 */
export function madeUpSquad(now: Date): NewPlayer[] {
  const season = seasonOf(now)
  const rows: [NewPlayer['position'], null | number, string, string][] = [
    ['doelman', 1, 'Tjerk Brandsma', 'Brandsma'],
    ['doelman', 16, 'Wessel Oosting', 'Oosting'],
    ['doelman', null, 'Sander Veldkamp', 'Veldkamp'],
    ['verdediger', 2, 'Daan Boerema', 'Boerema'],
    ['verdediger', 3, 'Jurre van der Kooi', 'van der Kooi'],
    ['verdediger', 4, 'Ruben ten Hove', 'ten Hove'],
    ['verdediger', 5, 'Stijn de Haan', 'de Haan'],
    ['verdediger', 15, 'Lars Wijbenga', 'Wijbenga'],
    ['verdediger', 24, 'Koen Bakkeveld', 'Bakkeveld'],
    ['middenvelder', 6, 'Milan Reitsma', 'Reitsma'],
    ['middenvelder', 8, 'Thijs Idzenga', 'Idzenga'],
    ['middenvelder', 10, 'Bram van Dijkhuizen', 'van Dijkhuizen'],
    ['middenvelder', 14, 'Gerben Tuinstra', 'Tuinstra'],
    ['middenvelder', 18, 'Joeri Haagsma', 'Haagsma'],
    ['middenvelder', 25, 'Noud Zeinstra', 'Zeinstra'],
    ['aanvaller', 7, 'Sjoerd Altena', 'Altena'],
    ['aanvaller', 9, 'Jesse Postma', 'Postma'],
    ['aanvaller', 11, 'Floris de Wal', 'de Wal'],
    ['aanvaller', 17, 'Yannick Hettinga', 'Hettinga'],
    ['aanvaller', 21, 'Mick van Wieren', 'van Wieren'],
    ['aanvaller', 22, 'Dinho', 'Dinho'],
  ]

  const squad = rows.map(([position, shirtNumber, name, searchTerm]) => ({
    name,
    position,
    searchTerm,
    season,
    shirtNumber,
    wikipediaPage: name,
  }))
  const scorers = madeUpScorers.map(([name, shirtNumber, inSquad]): NewPlayer => ({
    inSquad,
    leftSquadAt: inSquad ? null : new Date(now.getTime() - 3 * day),
    name,
    position: 'aanvaller',
    searchTerm: name.split(' ').slice(1).join(' '),
    season,
    shirtNumber,
    wikipediaPage: name,
  }))

  return [...squad, ...scorers]
}

/** The page that the made-up squad pretends to come from, with the title the importer reads. */
export function madeUpSquadPage(now: Date): NewWikipediaPage {
  const season = seasonOf(now)

  return { kind: 'squad', readAt: now, season, title: `Sc Heerenveen in het seizoen ${season} (mannen)`, version: null }
}

/**
 * A made-up league table that agrees with `madeUpMatches`: six made-up clubs and sc Heerenveen,
 * two rounds played, and the day of the last match as the day it holds for.
 */
export function madeUpTable(now: Date): NewStandingsRow[] {
  const season = seasonOf(now)
  const validOn = new Date(now.getTime() - 7 * day).toISOString().slice(0, 10)
  const rows: [string, number, number, number, number, number][] = [
    ['sc Heerenveen', 2, 0, 0, 12, 0],
    ['Demo Boys', 1, 1, 0, 5, 4],
    ['Proefstad SV', 1, 1, 0, 2, 1],
    ['Voorbeeld United', 0, 1, 1, 1, 7],
    ['Testdorp FC', 0, 1, 1, 2, 8],
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

    await transaction.insert(matches).values(await withClubs(transaction, madeUpMatches(now)))

    const goals = (await transaction.select().from(matches).where(eq(matches.season, season))).flatMap((match) =>
      (madeUpGoals[`${match.competition}|${match.round}`] ?? []).map((goal) => ({ ...goal, matchId: match.id })),
    )

    if (goals.length > 0) {
      await transaction.insert(matchGoals).values(goals)
    }
    await linkMadeUpGoals(transaction, season)
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

/**
 * Puts a made-up squad and the page it credits in the database, but only when the current
 * season has no player. The real import replaces it the first time it runs, and a database that
 * already has the real squad is left alone. Returns whether it put them in.
 */
export async function seedSquad(db: Database, now: Date = new Date()): Promise<boolean> {
  const season = seasonOf(now)

  return db.transaction(async (transaction) => {
    const [anyPlayer] = await transaction
      .select({ id: players.id })
      .from(players)
      .where(eq(players.season, season))
      .limit(1)

    if (anyPlayer !== undefined) {
      return false
    }

    await transaction.insert(players).values(madeUpSquad(now))
    await linkMadeUpGoals(transaction, season)

    const page = madeUpSquadPage(now)

    await transaction
      .insert(wikipediaPages)
      .values(page)
      .onDuplicateKeyUpdate({ set: { readAt: page.readAt } })

    return true
  })
}

/**
 * Points the made-up goals of the season to the made-up players they name by page, for the
 * goals that have none yet. The seed of the matches and the seed of the squad each call it when
 * they are done, so the links are there whichever of the two runs last. A goal whose page no
 * player has stays without a link.
 */
async function linkMadeUpGoals(db: Pick<Database, 'select' | 'update'>, season: string) {
  const squad = await db
    .select({ id: players.id, page: players.wikipediaPage })
    .from(players)
    .where(and(eq(players.season, season), isNotNull(players.wikipediaPage)))
  const idOf = new Map(squad.map((player) => [player.page, player.id]))
  const unlinked = await db
    .select({ id: matchGoals.id, page: matchGoals.wikipediaPage })
    .from(matchGoals)
    .innerJoin(matches, eq(matchGoals.matchId, matches.id))
    .where(and(eq(matches.season, season), isNotNull(matchGoals.wikipediaPage), isNull(matchGoals.playerId)))

  for (const goal of unlinked) {
    const playerId = idOf.get(goal.page)

    if (playerId !== undefined) {
      await db.update(matchGoals).set({ playerId }).where(eq(matchGoals.id, goal.id))
    }
  }
}

if (import.meta.main) {
  // The made-up sources must never reach production. The site puts the real sources in by
  // itself when it starts; this keeps `pnpm db:seed` from doing the rest by hand.
  if (process.env['SITE_ENV'] === 'production') {
    console.error('The seed puts made-up test sources in the register, so it never runs with SITE_ENV=production.')
    process.exit(1)
  }

  const { close, db } = connect(readDatabaseEnv().DATABASE_URL)

  try {
    await seedSources(db)
    await seedMatches(db)
    await seedSquad(db)

    const coaches = await seedStaff(db)

    console.log(
      `The register holds ${testSources.length} test sources and the real sources: ${realSources.map((source) => source.name).join(', ')}. The table staff holds ${coaches} head coaches.`,
    )
  } finally {
    await close()
  }
}
