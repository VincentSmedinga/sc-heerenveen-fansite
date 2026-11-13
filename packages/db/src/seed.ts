import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'

import type { Database } from './client.ts'
import type {
  Competition,
  FeedFilter,
  MatchAppearance,
  NewLeagueResult,
  NewMatch,
  NewMatchCard,
  NewMatchGoal,
  NewMatchIncident,
  NewMatchShootoutKick,
  NewMatchSubstitution,
  NewPlayer,
  NewSource,
  NewStandingsRow,
  NewWikipediaPage,
  WikipediaPageKind,
} from './schema.ts'

import { connect } from './client.ts'
import { withClubs } from './clubs.ts'
import { readDatabaseEnv } from './env.ts'
import {
  feeds,
  leagueResults,
  matchAppearances,
  matchCards,
  matches,
  matchGoals,
  matchIncidents,
  matchReports,
  matchShootoutKicks,
  matchSubstitutions,
  persons,
  players,
  playerSeasonStats,
  sources,
  squadCompleteness,
  standings,
  wikipediaPages,
} from './schema.ts'
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
 * channel of its feed, as it is written but without the HTML (see
 * `docs/beslissingen/importer.md`). `docs/bronnen.md` says which sources belong here and why.
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
 * A `publisher` names the company that publishes several of the sources, such as `dpg-media`
 * for the Algemeen Dagblad and De Gelderlander, which print one article under one article code.
 * The lists show such an article once, from the source that is `local`, the paper closest to
 * the news (De Gelderlander for N.E.C.). A source with no publisher is never merged with
 * another.
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
    publisher: 'dpg-media',
    slug: 'algemeen-dagblad',
  },
  {
    description:
      'Regionaal dagblad voor Gelderland. In de sportfeed staat het sportnieuws van de regio, ook veel achter de betaalmuur; we tonen de berichten over sc Heerenveen en, rond een wedstrijd, over de tegenstander.',
    domain: 'www.gelderlander.nl',
    feeds: [{ filter: 'club', url: 'https://www.gelderlander.nl/sport/rss.xml' }],
    kind: 'news',
    local: true,
    name: 'De Gelderlander',
    publisher: 'dpg-media',
    slug: 'de-gelderlander',
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
  {
    description:
      'Regionale publieke omroep van Rotterdam. In de sportfeed staat vooral nieuws over Feyenoord, Sparta en Excelsior; we tonen alleen berichten over sc Heerenveen, en over de Rotterdamse tegenstander rond een wedstrijd.',
    domain: 'www.rijnmond.nl',
    feeds: [{ filter: 'club', url: 'https://www.rijnmond.nl/rss/sport.xml' }],
    kind: 'news',
    name: 'Rijnmond',
    slug: 'rijnmond',
  },
  {
    description:
      'Regionale publieke omroep van Groningen en Drenthe. In de sportfeed staat vooral nieuws over FC Groningen; we tonen alleen berichten over sc Heerenveen, en over FC Groningen rond een wedstrijd tegen ons.',
    domain: 'www.rtvnoord.nl',
    feeds: [{ filter: 'club', url: 'https://www.rtvnoord.nl/rss/sport.xml' }],
    kind: 'news',
    name: 'RTV Noord',
    slug: 'rtv-noord',
  },
  {
    description:
      'Lokale omroep van de stad Groningen. We lezen twee feeds: de berichten die OOG bij sc Heerenveen heeft gezet, en die bij FC Groningen, waarvan we alleen de berichten rond een wedstrijd tegen ons tonen.',
    domain: 'www.oogtv.nl',
    feeds: [
      'https://www.oogtv.nl/tag/sc-heerenveen/feed/',
      { filter: 'club', url: 'https://www.oogtv.nl/tag/fc-groningen/feed/' },
    ],
    kind: 'news',
    name: 'OOG Groningen',
    slug: 'oog-groningen',
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
 * a win on penalties and a loss on penalties. The first has the score after 90 minutes, the
 * loss on penalties has it too (equal to the result: no goal in extra time), and the win on
 * penalties has none, as a page without it. The away win of round 2 was stopped and finished
 * the next day, so it has a note. Voorbeeld United is visited twice in the Eredivisie, in a
 * stadium that changed its name (round 0 and round 2), so the page of that club has the card
 * Stadions; the other clubs have none or one name. `result_set_at` stays empty. The first read
 * of the season replaces the made-up matches at once, since no page of it has been read yet.
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
      afterNinetyAgainst: 1,
      afterNinetyFor: 1,
      competition: 'KNVB Beker',
      extraTime: true,
      goalsAgainst: 1,
      goalsFor: 2,
      home: false,
      kickoffAt: at(-70, 18, 0),
      matchDate: dayOf(at(-70, 18, 0)),
      opponent: 'FC Maquette',
      referee: 'Jan Voorbeeld',
      round: 'Eerste ronde',
      stadium: 'Sportpark Maquette',
      status: 'played',
    },
    {
      ...base,
      attendance: 12000,
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
      referee: 'Karin Proefstad',
      round: 'Achtste finale',
      stadium: 'Stadion Proeflaan',
      status: 'played',
    },
    {
      ...base,
      afterNinetyAgainst: 2,
      afterNinetyFor: 2,
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
      referee: 'Jan Voorbeeld',
      round: 'Kwartfinale',
      stadium: 'Sportpark Voorbeelddorp',
      status: 'played',
    },
    {
      ...base,
      attendance: 8450,
      competition: 'Play-offs Conference League',
      goalsAgainst: 2,
      goalsFor: 0,
      home: false,
      kickoffAt: at(-30, 21, 0),
      matchDate: dayOf(at(-30, 21, 0)),
      opponent: 'Oefenstad FC',
      referee: 'Pieter Maquette',
      round: 'Halve finale',
      stadium: 'Stadion Voorbeeldlaan',
      status: 'played',
    },
    {
      ...base,
      attendance: 0,
      competition: 'Eredivisie',
      goalsAgainst: 0,
      goalsFor: 0,
      home: false,
      kickoffAt: at(-21, 18, 45),
      matchDate: dayOf(at(-21, 18, 45)),
      opponent: 'Voorbeeld United',
      referee: 'Karin Proefstad',
      round: 'Speelronde 0',
      stadium: 'Oud Voorbeeldpark',
      status: 'played',
    },
    {
      ...base,
      attendance: 21022,
      competition: 'Eredivisie',
      goalsAgainst: 0,
      goalsFor: 6,
      home: true,
      kickoffAt: at(-14, 16, 45),
      matchDate: dayOf(at(-14, 16, 45)),
      opponent: 'Testdorp FC',
      referee: 'Pieter Maquette',
      round: 'Speelronde 1',
      stadium: 'Stadion Proeflaan',
      status: 'played',
    },
    {
      ...base,
      attendance: 14310,
      competition: 'Eredivisie',
      goalsAgainst: 0,
      goalsFor: 6,
      home: false,
      kickoffAt: at(-7, 18, 45),
      matchDate: dayOf(at(-7, 18, 45)),
      note: `Gestaakt in minuut 82. Het restant is op ${at(-6, 0, 0).getUTCDate()} ${dutchMonths[at(-6, 0, 0).getUTCMonth()]} gespeeld in het Stadion Proeflaan.`,
      opponent: 'Voorbeeld United',
      referee: 'Jan Voorbeeld',
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
 * time, a player with two goals, extra time and a long name. Two goals in minutes that follow
 * each other (66 and 67 of the second round) give the card Opmerkelijk of the statistics page a
 * fact to show. The players are made up, like the clubs. For the top scorers they make
 * twelve players: Wouter Proefman with three goals, two players with two goals who share the
 * second place, and nine with one goal who share the fourth. The own goal of an opponent
 * counts for nobody.
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
    { minute: 67, ours: true, player: 'Testvoort', stoppageMinutes: null, wikipediaPage: 'Bas Testvoort' },
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
    // The minute is not known, like the minute of 4 goals of the old fansite.
    { minute: null, ours: false, player: 'Oefenaar', stoppageMinutes: null },
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
  'Play-offs Conference League|Halve finale': [
    { minute: 46, ours: false, player: 'Teststraat', stoppageMinutes: null },
    { minute: 58, ours: false, player: 'Oefenaar', stoppageMinutes: null },
  ],
}

/**
 * The made-up results of every club in the league, which agree with `madeUpMatches` and
 * `madeUpTable`: each club has as many results as the table says it played, so the card Stand
 * has its switch for the latest five matches. The matches of sc Heerenveen are those of the
 * made-up programme. The match in round 2 is played at Voorbeeld United again, as in the
 * programme, but a result is kept once for a home club and an away club, so it is written the
 * other way round here.
 */
export function madeUpLeagueResults(now: Date): NewLeagueResult[] {
  const season = seasonOf(now)
  const dayOf = (days: number) => new Date(now.getTime() + days * day).toISOString().slice(0, 10)
  const rows: [round: number, days: number, home: string, homeGoals: number, awayGoals: number, away: string][] = [
    [0, -21, 'Voorbeeld United', 0, 0, 'sc Heerenveen'],
    [0, -21, 'Proefstad SV', 1, 0, 'Nepstad Rangers'],
    [0, -21, 'Demo Boys', 2, 2, 'Testdorp FC'],
    [1, -14, 'sc Heerenveen', 6, 0, 'Testdorp FC'],
    [1, -14, 'Demo Boys', 3, 2, 'Nepstad Rangers'],
    [1, -14, 'Proefstad SV', 1, 1, 'Voorbeeld United'],
    [2, -7, 'sc Heerenveen', 6, 0, 'Voorbeeld United'],
  ]

  return rows.map(([round, days, homeClub, homeGoals, awayGoals, awayClub]) => ({
    awayClub,
    awayGoals,
    homeClub,
    homeGoals,
    playedOn: dayOf(days),
    round,
    season,
  }))
}

/**
 * The made-up country of each player of the squad, in the order of the rows of `madeUpSquad`: a
 * white flag (Netherlands, Finland, Japan), a country without a flag in the design system
 * (Brazil), and players without a country, so the card Selectie shows each case. The made-up
 * scorers have no country.
 */
const madeUpCountries: (null | string)[] = [
  'NL',
  'NL',
  null,
  'DE',
  'BE',
  'NL',
  'FI',
  'NL',
  'JP',
  null,
  'BR',
  'NL',
  'SE',
  'NO',
  'NL',
  'DK',
  'NL',
  'FI',
  'NL',
  null,
  'NL',
]

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

  const squad = rows.map(([position, shirtNumber, name, searchTerm], index): NewPlayer => ({
    country: madeUpCountries[index] ?? null,
    name,
    position,
    searchTerm,
    season,
    shirtNumber,
    source: 'selectie',
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
    source: 'selectie',
    wikipediaPage: name,
  }))

  return [...squad, ...scorers]
}

/**
 * The made-up appearances of the made-up scorers, as the squad table of the Dutch Wikipedia
 * gives them: by page of the player, the competition, the appearances and the goals. The goals
 * are those of `madeUpGoals` for the Eredivisie and for the cup, so the column D/W of the card
 * Doelpuntenmakers on Spelers is there for the choice Eredivisie. The made-up season also has a
 * played match of the play-offs, which the table has no figures for, so the choice all matches
 * has no column: the page is checked with and without it. Opponents and own goals have no row.
 */
export const madeUpPlayerStats: Record<
  string,
  [competition: 'Eredivisie' | 'KNVB Beker', appearances: number, goals: number][]
> = {
  'Bas Testvoort': [['Eredivisie', 2, 1]],
  'Gerrit Nepper': [['Eredivisie', 4, 2]],
  'Jan van der Voorbeeldstraat-Proefmans': [['KNVB Beker', 1, 1]],
  'Joris Testvoort': [['Eredivisie', 2, 1]],
  'Lennart Probeer': [['Eredivisie', 2, 1]],
  'Marijn Sjabloon': [['Eredivisie', 1, 1]],
  'Niels Steekproef': [['Eredivisie', 3, 1]],
  'Pieter Voorbeeld': [['KNVB Beker', 2, 1]],
  'Rick Demo': [['Eredivisie', 4, 2]],
  'Sander Monster': [['Eredivisie', 1, 1]],
  'Teun Dummy': [['Eredivisie', 3, 1]],
  'Wouter Proefman': [
    ['Eredivisie', 2, 1],
    ['KNVB Beker', 1, 2],
  ],
}

/**
 * Made-up matches of the old fansite (1990 to 2007), for the pages and the accessibility
 * checks: a match of the Eerste divisie and one of the Intertoto Cup that have a day and no
 * time (a played match shows its day only), and one of the UEFA Cup with a kick-off. Unlike
 * `madeUpMatches` they are in fixed seasons, because the old seasons never move. They have the
 * source `oude-fansite`, so the page names the archive of the old fansite as their source.
 * Each has an opponent of its own that the current season does not meet, so the page of that
 * club has the archive as its only source. The import of the old fansite replaces them: it
 * removes a match of its source that is not in its files.
 */
export function madeUpOldMatches(): MadeUpMatch[] {
  const base = { dataSource: 'oude-fansite', resultSetAt: null, stadium: null, status: 'played' } as const

  return [
    {
      ...base,
      competition: 'Eerste divisie',
      goalsAgainst: 1,
      goalsFor: 3,
      home: false,
      matchDate: '1992-11-21',
      opponent: 'Oudstad FC',
      round: 'Wedstrijd 14',
      season: '1992/93',
    },
    {
      ...base,
      competition: 'Intertoto Cup',
      goalsAgainst: 0,
      goalsFor: 0,
      home: false,
      matchDate: '1996-06-22',
      opponent: 'SV Archiefdorp',
      round: 'Wedstrijd 1',
      season: '1996/97',
    },
    {
      ...base,
      attendance: 13500,
      competition: 'UEFA Cup',
      goalsAgainst: 0,
      goalsFor: 2,
      home: true,
      kickoffAt: new Date('2004-09-16T17:00:00Z'),
      matchDate: '2004-09-16',
      opponent: 'Zomerstad United',
      round: 'Eerste ronde',
      season: '2004/05',
    },
  ]
}

/** The page that the made-up squad pretends to come from, with the title the importer reads. */
export function madeUpSquadPage(now: Date): NewWikipediaPage {
  const season = seasonOf(now)

  return { kind: 'squad', readAt: now, season, title: `Sc Heerenveen in het seizoen ${season} (mannen)`, version: null }
}

/**
 * A made-up league table that agrees with `madeUpMatches`: six made-up clubs and sc Heerenveen,
 * round 0 and two rounds played, and the day of the last match as the day it holds for.
 */
export function madeUpTable(now: Date): NewStandingsRow[] {
  const season = seasonOf(now)
  const validOn = new Date(now.getTime() - 7 * day).toISOString().slice(0, 10)
  const rows: [string, number, number, number, number, number][] = [
    ['sc Heerenveen', 2, 1, 0, 12, 0],
    ['Demo Boys', 1, 1, 0, 5, 4],
    ['Proefstad SV', 1, 1, 0, 2, 1],
    ['Voorbeeld United', 0, 2, 1, 1, 7],
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
    page('playoffs', `Play-offs Nederlands voetbal ${Number(season.slice(0, 4)) + 1}`),
  ]
}

/**
 * Puts made-up matches, a made-up league table with the results of every club and the pages
 * they credit in the database, but only when the current season has none of either. The real
 * import replaces them with Wikipedia's the first time it runs, and a database that already has
 * the real ones is left alone, so a restart on acceptance never puts the made-up ones over the
 * real ones. Returns whether it put them in.
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

    // The made-up matches of the old fansite, unless the database has some of its own.
    const [anyOld] = await transaction
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.dataSource, 'oude-fansite'))
      .limit(1)

    if (anyOld === undefined) {
      await transaction.insert(matches).values(await withClubs(transaction, madeUpOldMatches()))
    }

    const goals = (await transaction.select().from(matches).where(eq(matches.season, season))).flatMap((match) =>
      (madeUpGoals[`${match.competition}|${match.round}`] ?? []).map((goal) => ({ ...goal, matchId: match.id })),
    )

    if (goals.length > 0) {
      await transaction.insert(matchGoals).values(goals)
    }
    await linkMadeUpGoals(transaction, season)
    await seedMadeUpReport(transaction, season, now)
    await transaction.insert(standings).values(madeUpTable(now))
    await transaction.insert(leagueResults).values(madeUpLeagueResults(now))

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
 * Puts a made-up squad, the chance that it is complete and the page it credits in the
 * database, but only when the current season has no player. The real import replaces it the
 * first time it runs, and a database that already has the real squad is left alone. Returns
 * whether it put them in.
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

    const squad = madeUpSquad(now)

    await transaction.insert(players).values(squad)
    await linkMadeUpGoals(transaction, season)
    await seedMadeUpReport(transaction, season, now)

    const seasonPlayers = await transaction
      .select({ id: players.id, page: players.wikipediaPage })
      .from(players)
      .where(eq(players.season, season))

    await transaction.insert(playerSeasonStats).values(
      seasonPlayers.flatMap((player) =>
        (madeUpPlayerStats[player.page ?? ''] ?? []).map(([competition, appearances, goals]) => ({
          appearances,
          assists: 0,
          competition,
          goals,
          playerId: player.id,
          season,
        })),
      ),
    )

    // The made-up squad is a whole table of the squad, so the page Spelers says it is complete.
    // The import works the chance out again the first time it reads the real squad.
    await transaction
      .insert(squadCompleteness)
      .values({
        bestSource: 'selectie',
        calculatedAt: now,
        checks: [],
        level: 'compleet',
        playerCount: squad.length,
        probability: 95,
        season,
      })
      .onDuplicateKeyUpdate({ set: { calculatedAt: now } })

    const page = madeUpSquadPage(now)

    await transaction
      .insert(wikipediaPages)
      .values(page)
      .onDuplicateKeyUpdate({ set: { readAt: page.readAt } })

    return true
  })
}

/** The match that has the made-up report: the home win in the first round of the Eredivisie. */
export const madeUpReportMatch = { competition: 'Eredivisie', round: 'Speelronde 1' } as const

/**
 * The cup tie that has the second made-up report: the home draw in the round of 16 of the cup,
 * with extra time, decided 4–3 on penalties (#844).
 */
export const madeUpCupReportMatch = { competition: 'KNVB Beker', round: 'Achtste finale' } as const

/** The name that the made-up reports give as their source. */
const madeUpReportSource = 'Verzonnen wedstrijdformulier'

type MadeUpMoment = {
  appearanceId: number
  matchId: number
  minute: number
  ours: boolean
  stoppageMinutes: null | number
}

/** What a made-up report needs to be written down, apart from the events (see `events`). */
type MadeUpReport = {
  /** The captain of sc Heerenveen, by name. */
  captain: string
  /** The events, written with the helpers of `seedMadeUpReport`. */
  events: (helpers: MadeUpReportHelpers) => MadeUpReportEvents
  formations: { opponent: string; ours: string }
  /**
   * The goals of the match by their minute (`unknown` for a goal without one): the scorer and
   * the player who gave the assist, or `null` for no assist. They are the goals of
   * `madeUpGoals`.
   */
  goals: Partial<Record<'unknown' | number, [scorer: MadeUpWho, assist: MadeUpWho | null]>>
  match: { competition: Competition; round: string }
  /** The line-up and the bench of the opponent: shirt number, name and whether he starts. */
  opponent: [shirtNumber: number, name: string, starter: boolean][]
  /** The captain of the opponent: the shirt number. */
  opponentCaptain: number
  /** The line-up and the bench of sc Heerenveen, by the name in the made-up squad. */
  ours: [name: string, starter: boolean][]
  /**
   * The players of ours who have no shirt number in this report, like the old line-ups, by the
   * name in the made-up squad. The squad keeps his number.
   */
  withoutShirtNumber?: string[]
}

type MadeUpReportEvents = {
  cards: NewMatchCard[]
  incidents: NewMatchIncident[]
  shootout: NewMatchShootoutKick[]
  substitutions: NewMatchSubstitution[]
}

type MadeUpReportHelpers = {
  /** A card or an incident of a player at a minute. */
  at: (player: { id: number; ours: boolean }, minute: number, stoppageMinutes?: null | number) => MadeUpMoment
  /** A kick in the shoot-out. */
  kick: (
    player: { id: number; ours: boolean },
    round: number,
    outcome: NewMatchShootoutKick['outcome'],
  ) => NewMatchShootoutKick
  ours: (name: string) => MatchAppearance
  swap: (out: { id: number; ours: boolean }, on: { id: number }, minute: number) => NewMatchSubstitution
  theirs: (shirtNumber: number) => MatchAppearance
  /** A yellow card of a player at a moment nobody knows. */
  unknownMinute: (player: { id: number; ours: boolean }) => Omit<MadeUpMoment, 'minute'> & { minute: null }
}

/** A player in a made-up report: one of ours by name, or the opponent's by shirt number. */
type MadeUpWho = number | string

/**
 * The line-up and the bench of sc Heerenveen in the first made-up report, by the name in the
 * made-up squad: `true` for the line-up. The shirt number is the one in `players`.
 */
const madeUpReportOurs: [name: string, starter: boolean][] = [
  ['Tjerk Brandsma', true],
  ['Daan Boerema', true],
  ['Jurre van der Kooi', true],
  ['Ruben ten Hove', true],
  ['Stijn de Haan', true],
  ['Milan Reitsma', true],
  ['Thijs Idzenga', true],
  ['Rick Demo', true],
  ['Teun Dummy', true],
  ['Sander Monster', true],
  ['Lennart Probeer', true],
  ['Wessel Oosting', false],
  ['Lars Wijbenga', false],
  ['Gerben Tuinstra', false],
  ['Joeri Haagsma', false],
  ['Gerrit Nepper', false],
  ['Marijn Sjabloon', false],
  ['Sjoerd Altena', false],
]

/**
 * The line-up and the bench of the opponent, Testdorp FC, in the first made-up report: shirt
 * number, name and whether the player is in the line-up. The names are made up, like the club.
 */
const madeUpReportOpponent: MadeUpReport['opponent'] = [
  [1, 'Ruud Oefenman', true],
  [2, 'Kees Teststraat', true],
  [3, 'Dirk Proefland', true],
  [4, 'Henk Maquette', true],
  [5, 'Joop Voorbeeldlaan', true],
  [6, 'Arjen Nepveld', true],
  [7, 'Ties Demostad', true],
  [8, 'Bert Sjabloonweg', true],
  [9, 'Frank Dummydijk', true],
  [10, 'Ronald Proefveld', true],
  [11, 'Gijs Testwijk', true],
  [12, 'Maarten Oefenpad', false],
  [13, 'Sjaak Voorbeeldhof', false],
  [14, 'Wim Maquettelaan', false],
  [15, 'Cor Nepstraat', false],
  [16, 'Evert Demoplein', false],
]

/**
 * The made-up reports: the home win in the first round of the Eredivisie, with a line-up, a
 * bench, three substitutions of ours and two of theirs, a yellow card and a yellow-red card, a
 * red card for the opponent, a penalty that the opponent took and our goalkeeper stopped, a
 * penalty of ours that was missed, and the assist for every goal; and the draw in the round of
 * 16 of the cup, with extra time, so with minutes up to 120, and a shoot-out that we won 4–3,
 * four players of ours without a shirt number, and a yellow card and a goal without a minute.
 * They are the made-up data of the pages of a match and of their checks. The names are made up,
 * like the clubs.
 */
const madeUpReports: MadeUpReport[] = [
  {
    captain: 'Milan Reitsma',
    events: ({ at, ours, swap, theirs }) => ({
      cards: [
        { ...at(ours('Daan Boerema'), 34), kind: 'geel' },
        { ...at(ours('Daan Boerema'), 70), kind: 'geel-rood' },
        { ...at(theirs(4), 40), kind: 'geel' },
        { ...at(theirs(9), 85), kind: 'rood' },
      ],
      incidents: [
        { ...at(theirs(10), 22), kind: 'strafschop-gestopt' },
        { ...at(ours('Milan Reitsma'), 50), kind: 'strafschop-gemist' },
      ],
      shootout: [],
      substitutions: [
        swap(ours('Thijs Idzenga'), ours('Gerrit Nepper'), 60),
        swap(ours('Sander Monster'), ours('Marijn Sjabloon'), 65),
        swap(ours('Milan Reitsma'), ours('Sjoerd Altena'), 75),
        swap(theirs(11), theirs(14), 55),
        swap(theirs(7), theirs(15), 70),
      ],
    }),
    formations: { opponent: '4-4-2', ours: '4-3-3' },
    goals: {
      12: ['Rick Demo', 'Thijs Idzenga'],
      25: ['Teun Dummy', 'Rick Demo'],
      41: ['Sander Monster', 'Milan Reitsma'],
      58: ['Lennart Probeer', 'Teun Dummy'],
      77: ['Gerrit Nepper', 'Lennart Probeer'],
      83: ['Rick Demo', 'Gerrit Nepper'],
    },
    match: madeUpReportMatch,
    opponent: madeUpReportOpponent,
    opponentCaptain: 5,
    ours: madeUpReportOurs,
  },
  {
    captain: 'Milan Reitsma',
    events: ({ at, kick, ours, swap, theirs, unknownMinute }) => ({
      cards: [
        // A yellow card without a minute, like most of the old fansite.
        { ...unknownMinute(theirs(4)), kind: 'geel' },
        { ...at(theirs(3), 117), kind: 'rood' },
        { ...at(ours('Daan Boerema'), 118), kind: 'geel' },
        { ...at(ours('Ruben ten Hove'), 120, 1), kind: 'geel' },
      ],
      incidents: [],
      // We won 4–3: the kicks that went in add up to the result in the match.
      shootout: [
        kick(ours('Milan Reitsma'), 1, 'raak'),
        kick(theirs(10), 1, 'raak'),
        kick(ours('Sjoerd Altena'), 2, 'raak'),
        kick(theirs(8), 2, 'gestopt'),
        kick(ours('Daan Boerema'), 3, 'naast'),
        kick(theirs(7), 3, 'raak'),
        kick(ours('Gerben Tuinstra'), 4, 'raak'),
        kick(theirs(6), 4, 'naast'),
        kick(ours('Mick van Wieren'), 5, 'raak'),
        kick(theirs(5), 5, 'raak'),
      ],
      substitutions: [
        swap(ours('Jesse Postma'), ours('Sjoerd Altena'), 62),
        swap(ours('Thijs Idzenga'), ours('Gerben Tuinstra'), 100),
        swap(ours('Floris de Wal'), ours('Mick van Wieren'), 110),
        swap(theirs(11), theirs(14), 65),
        swap(theirs(9), theirs(15), 100),
      ],
    }),
    formations: { opponent: '4-4-2', ours: '4-2-3-1' },
    goals: { 30: ['Jan van der Voorbeeldstraat-Proefmans', 'Thijs Idzenga'], unknown: [9, null] },
    match: madeUpCupReportMatch,
    opponent: [
      [1, 'Jaap Keepertest', true],
      [2, 'Nico Rechtsachter', true],
      [3, 'Hans Linksachter', true],
      [4, 'Wout Centraalweg', true],
      [5, 'Rob Stopperlaan', true],
      [6, 'Gert Middenveld', true],
      [7, 'Luuk Rechtsbuiten', true],
      [8, 'Tom Passpad', true],
      [9, 'Piet Oefenaar', true],
      [10, 'Mees Spelverdeler', true],
      [11, 'Daan Linksbuiten', true],
      [12, 'Ivo Reservekeeper', false],
      [13, 'Bas Wisselstraat', false],
      [14, 'Kai Banklaan', false],
      [15, 'Sem Invalpad', false],
      [16, 'Jos Reservehof', false],
    ],
    opponentCaptain: 5,
    ours: [
      ['Tjerk Brandsma', true],
      ['Daan Boerema', true],
      ['Jurre van der Kooi', true],
      ['Ruben ten Hove', true],
      ['Stijn de Haan', true],
      ['Milan Reitsma', true],
      ['Thijs Idzenga', true],
      ['Bram van Dijkhuizen', true],
      ['Jan van der Voorbeeldstraat-Proefmans', true],
      ['Jesse Postma', true],
      ['Floris de Wal', true],
      ['Wessel Oosting', false],
      ['Lars Wijbenga', false],
      ['Gerben Tuinstra', false],
      ['Sjoerd Altena', false],
      ['Mick van Wieren', false],
      ['Dinho', false],
    ],
    // Line-ups without shirt numbers, like the old fansite has: two in the line-up and two on
    // the bench, so the pitch and the bench show a player without a number.
    withoutShirtNumber: ['Bram van Dijkhuizen', 'Floris de Wal', 'Mick van Wieren', 'Dinho'],
  },
]

/**
 * Points the made-up goals of the season to the made-up players they name by page, and to the
 * person of that player, for the goals that have none yet. The seed of the matches and the seed
 * of the squad each call it when they are done, so the links are there whichever of the two
 * runs last. A goal whose page no player has stays without a link.
 */
async function linkMadeUpGoals(db: Pick<Database, 'insert' | 'select' | 'update'>, season: string) {
  await personsForMadeUpPlayers(db, season)

  const squad = await db
    .select({ id: players.id, page: players.wikipediaPage, personId: players.personId })
    .from(players)
    .where(and(eq(players.season, season), isNotNull(players.wikipediaPage)))
  const playerOf = new Map(squad.map((player) => [player.page, player]))
  const unlinked = await db
    .select({ id: matchGoals.id, page: matchGoals.wikipediaPage })
    .from(matchGoals)
    .innerJoin(matches, eq(matchGoals.matchId, matches.id))
    .where(and(eq(matches.season, season), isNotNull(matchGoals.wikipediaPage), isNull(matchGoals.playerId)))

  for (const goal of unlinked) {
    const player = playerOf.get(goal.page)

    if (player !== undefined) {
      await db
        .update(matchGoals)
        .set({ personId: player.personId, playerId: player.id })
        .where(eq(matchGoals.id, goal.id))
    }
  }
}

/**
 * The name of a made-up person in the parts the importer keeps: the search term is the prefix
 * and the family name, so `van der Kooi` is the prefix `van der` and the family name `Kooi`
 * (the words in lower case at the start are the prefix), and what comes before the search term
 * is the given name. A name of one word has no given name.
 */
function madeUpPersonName(name: string, searchTerm: string) {
  const words = searchTerm.split(' ')
  const prefixLength = words.findIndex((word) => word !== word.toLowerCase())
  const split = prefixLength < 0 ? words.length - 1 : prefixLength
  const givenName = name.endsWith(searchTerm) ? name.slice(0, name.length - searchTerm.length).trim() : name

  return {
    familyName: words.slice(split).join(' '),
    familyNamePrefix: split === 0 ? null : words.slice(0, split).join(' '),
    givenName: givenName === '' ? null : givenName,
  }
}

/**
 * Gives each made-up player of the season a person, as the import does (one for each page, with
 * the name kept in parts), for the players that have none yet.
 */
// The made-up players with a side (#1194), so the form of a person and the quiz show one.
const madeUpSides: Record<string, 'links' | 'midden' | 'rechts'> = {
  'Floris de Wal': 'links',
  'Jesse Postma': 'midden',
  'Sjoerd Altena': 'rechts',
}

async function personsForMadeUpPlayers(db: Pick<Database, 'insert' | 'select' | 'update'>, season: string) {
  const squad = await db
    .select({ id: players.id, name: players.name, page: players.wikipediaPage, searchTerm: players.searchTerm })
    .from(players)
    .where(and(eq(players.season, season), isNotNull(players.wikipediaPage), isNull(players.personId)))

  for (const player of squad) {
    if (player.page === null) {
      continue
    }

    await db
      .insert(persons)
      .values({
        ...madeUpPersonName(player.name, player.searchTerm),
        name: player.name,
        nameSource: 'manual',
        ...(madeUpSides[player.name] === undefined ? {} : { side: madeUpSides[player.name] }),
        wikipediaPage: player.page,
      })
      .onDuplicateKeyUpdate({ set: { wikipediaPage: player.page } })

    const [person] = await db.select({ id: persons.id }).from(persons).where(eq(persons.wikipediaPage, player.page))

    await db
      .update(players)
      .set({ personId: person?.id ?? null })
      .where(eq(players.id, player.id))
  }
}

/**
 * Puts the made-up reports (`madeUpReports`) at their made-up matches: a line-up and a bench
 * for sc Heerenveen and for the opponent, and the events. They pass the rules in
 * `@fansite/shared/match-report` without an error or a warning.
 *
 * A report needs its match, its goals and the made-up players, and the seeds of the matches
 * and of the squad each call this when they are done, so a report is there whichever of the
 * two runs last. A report is skipped when its match already has one, and when its match or a
 * player is not there. The goals are not marked as the editors' (`match_edits`): the import
 * replaces the made-up matches with the real ones at its first read. Returns whether it put a
 * report in.
 */
async function seedMadeUpReport(db: Pick<Database, 'insert' | 'select' | 'update'>, season: string, now: Date) {
  let seeded = false

  for (const report of madeUpReports) {
    seeded = (await seedOneMadeUpReport(db, season, now, report)) || seeded
  }

  return seeded
}

async function seedOneMadeUpReport(
  db: Pick<Database, 'insert' | 'select' | 'update'>,
  season: string,
  now: Date,
  report: MadeUpReport,
) {
  const [match] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.season, season),
        eq(matches.competition, report.match.competition),
        eq(matches.round, report.match.round),
      ),
    )

  if (match === undefined) {
    return false
  }

  const [existing] = await db
    .select({ id: matchReports.matchId })
    .from(matchReports)
    .where(eq(matchReports.matchId, match.id))
  const squad = await db.select().from(players).where(eq(players.season, season))
  const playerNamed = new Map(squad.map((player) => [player.name, player]))
  const goals = await db.select().from(matchGoals).where(eq(matchGoals.matchId, match.id))

  if (
    existing !== undefined ||
    goals.length !== Object.keys(report.goals).length ||
    report.ours.some(
      ([name]) =>
        !(report.withoutShirtNumber ?? []).includes(name) && (playerNamed.get(name)?.shirtNumber ?? null) === null,
    )
  ) {
    return false
  }

  await db.insert(matchReports).values({
    formationOpponent: report.formations.opponent,
    formationOurs: report.formations.ours,
    matchId: match.id,
    opponentComplete: true,
    savedAt: now,
    source: madeUpReportSource,
    status: 'klaar',
  })
  await db.insert(matchAppearances).values([
    ...report.ours.map(([name, starter]) => {
      const player = playerNamed.get(name)!

      return {
        captain: name === report.captain,
        matchId: match.id,
        name,
        ours: true,
        playerId: player.id,
        shirtNumber: (report.withoutShirtNumber ?? []).includes(name) ? null : player.shirtNumber!,
        starter,
      }
    }),
    ...report.opponent.map(([shirtNumber, name, starter]) => ({
      captain: shirtNumber === report.opponentCaptain,
      matchId: match.id,
      name,
      ours: false,
      playerId: null,
      shirtNumber,
      starter,
    })),
  ])

  const appearances = await db.select().from(matchAppearances).where(eq(matchAppearances.matchId, match.id))
  const ours = (name: string) => appearances.find((player) => player.ours && player.name === name)!
  const theirs = (shirtNumber: number) =>
    appearances.find((player) => !player.ours && player.shirtNumber === shirtNumber)!
  const who = (person: MadeUpWho) => (typeof person === 'string' ? ours(person) : theirs(person))
  const events = report.events({
    at: (player, minute, stoppageMinutes = null) => ({
      appearanceId: player.id,
      matchId: match.id,
      minute,
      ours: player.ours,
      stoppageMinutes,
    }),
    kick: (player, round, outcome) => ({
      appearanceId: player.id,
      matchId: match.id,
      ours: player.ours,
      outcome,
      round,
    }),
    ours,
    swap: (out, on, minute) => ({
      appearanceInId: on.id,
      appearanceOutId: out.id,
      matchId: match.id,
      minute,
      ours: out.ours,
      stoppageMinutes: null,
    }),
    theirs,
    unknownMinute: (player) => ({
      appearanceId: player.id,
      matchId: match.id,
      minute: null,
      ours: player.ours,
      stoppageMinutes: null,
    }),
  })

  await db.insert(matchSubstitutions).values(events.substitutions)
  await db.insert(matchCards).values(events.cards)

  if (events.incidents.length > 0) {
    await db.insert(matchIncidents).values(events.incidents)
  }
  if (events.shootout.length > 0) {
    await db.insert(matchShootoutKicks).values(events.shootout)
  }

  for (const goal of goals) {
    const people = report.goals[goal.minute ?? 'unknown']

    if (people !== undefined) {
      await db
        .update(matchGoals)
        .set({
          appearanceId: who(people[0]).id,
          assistAppearanceId: people[1] === null ? null : who(people[1]).id,
        })
        .where(eq(matchGoals.id, goal.id))
    }
  }

  return true
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
