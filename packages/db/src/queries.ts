import type { AnyMySqlColumn } from 'drizzle-orm/mysql-core'

import { and, asc, count, desc, eq, exists, inArray, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { MatchPageKind } from './schema.ts'

import {
  articles,
  discussions,
  items,
  matches,
  matchGoals,
  matchPageKinds,
  players,
  sources,
  standings,
  wikipediaPages,
} from './schema.ts'

export type PublicArticle = NonNullable<Awaited<ReturnType<typeof findPublishedArticle>>>

export type PublicArticleCard = NonNullable<Awaited<ReturnType<typeof findNewestArticle>>>

export type PublicArticleLink = Awaited<ReturnType<typeof listPublishedArticles>>[number]

export type PublicDiscussion = Awaited<ReturnType<typeof listNewestDiscussions>>[number]

export type PublicEpisode = Awaited<ReturnType<typeof listPodcastEpisodes>>[number]

export type PublicItem = Awaited<ReturnType<typeof listRecentItems>>[number]

export type PublicMatch = Awaited<ReturnType<typeof listSeasonMatches>>[number]

export type PublicPlayer = Awaited<ReturnType<typeof listSquad>>[number]

export type PublicPodcast = Awaited<ReturnType<typeof listPodcasts>>[number]

export type PublicSearchHit = Awaited<ReturnType<typeof searchPublic>>['hits'][number]

export type PublicSource = Awaited<ReturnType<typeof listEnabledSources>>[number]

export type PublicStandingsRow = Awaited<ReturnType<typeof listSeasonStandings>>[number]

export type PublicWikipediaPage = Awaited<ReturnType<typeof listWikipediaPages>>[number]

/**
 * How many episodes `listPodcastEpisodes` gives in all, with the same `until` and `podcast`.
 */
export async function countPodcastEpisodes(db: Database, { podcast, until }: { podcast?: string; until: Date }) {
  const [row] = await db
    .select({ total: count() })
    .from(items)
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(episodeFilter(until, podcast))

  return row?.total ?? 0
}

/**
 * The newest published article, with what the card on the homepage shows: the slug, the title,
 * the intro and the time of publication. A draft, and an article whose time of publication is
 * after `until`, don't count. Pass the moment of now.
 */
export async function findNewestArticle(db: Database, until: Date) {
  const [row] = await db
    .select({ intro: articles.intro, publishedAt: articles.publishedAt, slug: articles.slug, title: articles.title })
    .from(articles)
    .where(lte(articles.publishedAt, until))
    .orderBy(desc(articles.publishedAt), desc(articles.id))
    .limit(1)

  return row === undefined || row.publishedAt === null ? undefined : { ...row, publishedAt: row.publishedAt }
}

/**
 * The podcast with this slug, when it is switched on: its name, its description in our own
 * words, which is null when it has none, and the addresses where it can be found on Apple
 * Podcasts and Spotify, which are null when it has none. It gives nothing for another source,
 * so a slug of a news source is unknown here.
 */
export async function findPodcast(db: Database, slug: string) {
  const [row] = await db
    .select({
      applePodcastsUrl: sources.applePodcastsUrl,
      description: sources.description,
      name: sql<string>`coalesce(nullif(${sources.attribution}, ''), ${sources.name})`.as('podcast_name'),
      slug: sql<string>`${sources.slug}`.as('slug'),
      spotifyUrl: sources.spotifyUrl,
    })
    .from(sources)
    .where(and(eq(sources.enabled, true), eq(sources.kind, 'podcast'), hasSlug(slug)))

  return row
}

/**
 * The article with this slug, with what its page shows: the title, the intro, the text, the
 * author and the time of publication. It gives nothing for a draft (`published_at` empty) or
 * for an article whose time of publication is after `until`: pass the moment of now, so a date
 * in the future is a draft until then. The slug must match exactly: the collation of the table
 * ignores case and trailing spaces, which would give one article two addresses. The creator and
 * the times of the record stay internal, so none can reach a page.
 */
export async function findPublishedArticle(db: Database, slug: string, until: Date) {
  const [row] = await db
    .select({
      author: articles.author,
      body: articles.body,
      intro: articles.intro,
      publishedAt: articles.publishedAt,
      slug: articles.slug,
      title: articles.title,
    })
    .from(articles)
    .where(and(eq(articles.slug, slug), lte(articles.publishedAt, until)))

  // The condition leaves out an empty time of publication already; this tells the compiler.
  return row !== undefined && row.publishedAt !== null && row.slug === slug
    ? { ...row, publishedAt: row.publishedAt }
    : undefined
}

/**
 * The Wikipedia page the squad of a season, such as `2026/27`, was read from: the title and the
 * moment it was last read, so the list of players can credit it. It gives nothing while no
 * squad has been read. The `Last-Modified` of the page stays internal.
 */
export async function findSquadPage(db: Database, season: string) {
  const [row] = await db
    .select({ readAt: wikipediaPages.readAt, title: wikipediaPages.title })
    .from(wikipediaPages)
    .where(and(eq(wikipediaPages.season, season), eq(wikipediaPages.kind, 'squad')))

  return row
}

/**
 * The sources that are switched on, by name, with what the page 'Onze bronnen' shows of them:
 * the name, the domain, the kind and the description. The policy and the permission stay
 * internal, so they can't reach a page.
 */
export function listEnabledSources(db: Database) {
  return db
    .select({
      description: sources.description,
      domain: sources.domain,
      kind: sources.kind,
      name: sources.name,
    })
    .from(sources)
    .where(eq(sources.enabled, true))
    .orderBy(asc(sources.name))
}

/**
 * The discussions the importer kept of the forums that are switched on, the one with the latest
 * post first, with what the homepage shows of them: the title, the address, the number of
 * replies, the time of the last post and the screen name of whoever wrote it, which is null
 * when the forum doesn't say. Every other column stays internal, so none can reach a page.
 *
 * The importer keeps the newest five, so `limit` only matters when there is more than one
 * forum.
 */
export function listNewestDiscussions(db: Database, limit = 5) {
  return db
    .select({
      lastPostedAt: discussions.lastPostedAt,
      lastPostedBy: discussions.lastPostedBy,
      replyCount: discussions.replyCount,
      title: discussions.title,
      url: discussions.url,
    })
    .from(discussions)
    .innerJoin(sources, eq(discussions.sourceId, sources.id))
    .where(eq(sources.enabled, true))
    .orderBy(desc(discussions.lastPostedAt), desc(discussions.id))
    .limit(limit)
}

/**
 * The episodes of the podcasts that are switched on, newest first, from `offset`, at most
 * `limit`, with what the pages show of them: the title, the link to the page of the episode,
 * the time, the name of the podcast, and the duration, the season and the number of the
 * episode, which are null when the feed gives none. That name is the way the podcast wants to
 * be credited, or else its own name. Every other column stays internal, so none can reach a
 * page. Give the `slug` of a podcast as `podcast` to get the episodes of that podcast only.
 *
 * Pass the moment of now as `until`, as with `listRecentItems`: an episode a feed dated later
 * doesn't belong on top.
 */
export function listPodcastEpisodes(
  db: Database,
  { limit, offset = 0, podcast, until }: { limit: number; offset?: number; podcast?: string; until: Date },
) {
  return db
    .select({
      durationSeconds: items.durationSeconds,
      episodeNumber: items.episodeNumber,
      publishedAt: items.publishedAt,
      seasonNumber: items.seasonNumber,
      sourceName: sql<string>`coalesce(nullif(${sources.attribution}, ''), ${sources.name})`.as('source_name'),
      title: items.title,
      url: items.url,
    })
    .from(items)
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(episodeFilter(until, podcast))
    .orderBy(desc(items.publishedAt), desc(items.id))
    .limit(limit)
    .offset(offset)
}

/**
 * The podcasts that are switched on and have a slug and at least one episode, by name, with
 * what the filter shows of them: the name, the way the podcast wants to be credited, and the
 * slug for the address.
 */
export function listPodcasts(db: Database) {
  return db
    .select({
      name: sql<string>`coalesce(nullif(${sources.attribution}, ''), ${sources.name})`.as('podcast_name'),
      slug: sql<string>`${sources.slug}`.as('slug'),
    })
    .from(sources)
    .where(
      and(
        eq(sources.enabled, true),
        eq(sources.kind, 'podcast'),
        isNotNull(sources.slug),
        exists(
          db
            .select({ one: sql`1` })
            .from(items)
            .where(and(eq(items.sourceId, sources.id), isShown())),
        ),
      ),
    )
    .orderBy(asc(sources.name))
}

/**
 * The slugs of the published articles, newest first, for the sitemap. A draft and an article
 * for later (`published_at` after `until`) are not in it. At most `limit`, 5000 by default,
 * which is far more than the editors will write.
 */
export function listPublishedArticles(db: Database, until: Date, limit = 5000) {
  return db
    .select({ slug: articles.slug })
    .from(articles)
    .where(lte(articles.publishedAt, until))
    .orderBy(desc(articles.publishedAt), desc(articles.id))
    .limit(limit)
}

/**
 * The newest `limit` news items published up to and including `until`, newest first, from the
 * sources that are switched on, with what the homepage shows of them: the headline, the link,
 * the time, whether it is behind a paywall, and the name of the source. That name is the way
 * the source wants to be credited, or else its own name. The policy and the permission stay
 * internal, and so does every other column, so none of them can reach a page.
 *
 * The episodes of a podcast are items too, but they are not news, so a source of kind podcast
 * gives none. An item that a moderator hid (`hidden_at`) or that the importer did not find
 * `relevant` is never given, by this query or by any other that shows items: a new query on
 * `items` for a page must use `isShown` too.
 *
 * Pass the moment of now as `until`: the importer keeps a time up to a day ahead, because feeds
 * are sometimes wrong about their clock, and such an item doesn't belong on top.
 */
export function listRecentItems(db: Database, { limit, until }: { limit: number; until: Date }) {
  return db
    .select({
      paywalled: items.paywalled,
      publishedAt: items.publishedAt,
      sourceName: sql<string>`coalesce(nullif(${sources.attribution}, ''), ${sources.name})`.as('source_name'),
      title: items.title,
      url: items.url,
    })
    .from(items)
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(and(eq(sources.enabled, true), ne(sources.kind, 'podcast'), lte(items.publishedAt, until), isShown()))
    .orderBy(desc(items.publishedAt), desc(items.id))
    .limit(limit)
}

/**
 * The matches of sc Heerenveen 1 in a season, such as `2026/27`, in the order they are played:
 * by day, then by kick-off, with a match without a kick-off before one with. It gives what the
 * pages show: the competition, the round, the opponent, whether the match is at home, the
 * stadium, the status, the goals (null unless the match is played), whether it went to extra
 * time and the shoot-out (null unless there was one), the day, the kick-off in
 * UTC (null while it is unknown) and the date as Wikipedia has it (null when the kick-off is
 * known). `goals` are the scorers of a played match in the order of the clock, both clubs
 * together, and empty when the page names none. The moment the importer saw a result stays
 * internal. Only the season that is asked for is read: the pages show the current season alone.
 */
export async function listSeasonMatches(db: Database, season: string) {
  const rows = await db
    .select({
      competition: matches.competition,
      dateText: matches.dateText,
      extraTime: matches.extraTime,
      goalsAgainst: matches.goalsAgainst,
      goalsFor: matches.goalsFor,
      home: matches.home,
      id: matches.id,
      kickoffAt: matches.kickoffAt,
      matchDate: matches.matchDate,
      opponent: matches.opponent,
      penaltiesAgainst: matches.penaltiesAgainst,
      penaltiesFor: matches.penaltiesFor,
      round: matches.round,
      stadium: matches.stadium,
      status: matches.status,
    })
    .from(matches)
    .where(eq(matches.season, season))
    .orderBy(asc(matches.matchDate), asc(matches.kickoffAt), asc(matches.id))
  const scored = await db
    .select({
      matchId: matchGoals.matchId,
      minute: matchGoals.minute,
      ours: matchGoals.ours,
      ownGoal: matchGoals.ownGoal,
      penalty: matchGoals.penalty,
      player: matchGoals.player,
      stoppageMinutes: matchGoals.stoppageMinutes,
    })
    .from(matchGoals)
    .innerJoin(matches, eq(matchGoals.matchId, matches.id))
    .where(eq(matches.season, season))
    .orderBy(asc(matchGoals.minute), asc(sql`coalesce(${matchGoals.stoppageMinutes}, 0)`), asc(matchGoals.id))

  return rows.map(({ id, ...match }) => ({
    ...match,
    goals: scored
      .filter((goal) => goal.matchId === id)
      .map((goal) => ({
        minute: goal.minute,
        ours: goal.ours,
        ownGoal: goal.ownGoal,
        penalty: goal.penalty,
        player: goal.player,
        stoppageMinutes: goal.stoppageMinutes,
      })),
  }))
}

/**
 * The league table of a season, such as `2026/27`, from the first place down, with what the
 * pages show: the position, the club, the matches played, won, drawn and lost, the goals for
 * and against, the goal difference, the points, and the day the table holds for.
 */
export function listSeasonStandings(db: Database, season: string) {
  return db
    .select({
      club: standings.club,
      drawn: standings.drawn,
      goalDifference: standings.goalDifference,
      goalsAgainst: standings.goalsAgainst,
      goalsFor: standings.goalsFor,
      lost: standings.lost,
      played: standings.played,
      points: standings.points,
      position: standings.position,
      validOn: standings.validOn,
      won: standings.won,
    })
    .from(standings)
    .where(eq(standings.season, season))
    .orderBy(asc(standings.position))
}

/**
 * The players of the squad of a season, such as `2026/27`, for the list on the search page: the
 * name, the position and the surname the search page looks for. The order is the shirt number,
 * and players without one last, by name. Every other column stays internal. This is the one
 * place that decides who is in the list: a condition on who is in the squad now (#333) comes
 * here, in the `where`.
 */
export function listSquad(db: Database, season: string) {
  return db
    .select({ name: players.name, position: players.position, searchTerm: players.searchTerm })
    .from(players)
    .where(eq(players.season, season))
    .orderBy(asc(sql`${players.shirtNumber} is null`), asc(players.shirtNumber), asc(players.name))
}

/**
 * The Wikipedia pages the match import read for a season, such as `2026/27`: the title of the
 * page, which kind it is and the moment it was last read, so a page can credit them. The
 * order is the standings, the programme and the cup. The page of the squad is not one of them.
 * The `Last-Modified` of a page stays internal.
 */
export async function listWikipediaPages(db: Database, season: string) {
  const rows = await db
    .select({ kind: wikipediaPages.kind, readAt: wikipediaPages.readAt, title: wikipediaPages.title })
    .from(wikipediaPages)
    .where(and(eq(wikipediaPages.season, season), inArray(wikipediaPages.kind, matchPageKinds)))
    .orderBy(asc(wikipediaPages.kind), asc(wikipediaPages.title))

  // The condition leaves out the page of the squad, which the type of the column still allows.
  return rows.map((row) => ({ ...row, kind: row.kind as MatchPageKind }))
}

/**
 * Searches what the site shows for words: the titles of the news items and the podcast
 * episodes that the pages show (`isShown`, a source that is switched on, not later than
 * `until`) and the title and the intro of the published articles. Every word must occur, in any
 * order, in any case and with or without accents (the collation of the tables does that), and
 * a part of a word counts. The words are plain text and no pattern: `%`, `_` and `\` stand for
 * themselves. It gives the newest `limit` hits, newest first, however old, and how many there
 * are in all. A hit is `kind` `news`, `podcast` or `article`; an item has the link to the
 * source and its source name, an article has its slug. Pass at least one word; the page checks
 * the words before it asks.
 *
 * It is `LIKE`, without an index: the table is scanned. That is fast for the thousands of items
 * a year we keep, and it finds a word of two letters (LC, VI), which FULLTEXT does not on a
 * host with a minimum length we don't know.
 */
export async function searchPublic(
  db: Database,
  { limit, until, words }: { limit: number; until: Date; words: string[] },
) {
  const [found, written] = await Promise.all([
    db
      .select({
        durationSeconds: items.durationSeconds,
        episodeNumber: items.episodeNumber,
        kind: sources.kind,
        paywalled: items.paywalled,
        publishedAt: items.publishedAt,
        seasonNumber: items.seasonNumber,
        sourceName: sql<string>`coalesce(nullif(${sources.attribution}, ''), ${sources.name})`.as('source_name'),
        title: items.title,
        total: sql<number>`count(*) over ()`.as('total'),
        url: items.url,
      })
      .from(items)
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .where(and(eq(sources.enabled, true), lte(items.publishedAt, until), isShown(), hasWords(words, items.title)))
      .orderBy(desc(items.publishedAt), desc(items.id))
      .limit(limit),
    db
      .select({
        publishedAt: articles.publishedAt,
        slug: articles.slug,
        title: articles.title,
        total: sql<number>`count(*) over ()`.as('total'),
      })
      .from(articles)
      .where(and(lte(articles.publishedAt, until), hasWords(words, articles.title, articles.intro)))
      .orderBy(desc(articles.publishedAt), desc(articles.id))
      .limit(limit),
  ])

  const hits = [
    ...found.flatMap(
      ({ durationSeconds, episodeNumber, kind, paywalled, publishedAt, seasonNumber, sourceName, title, url }) =>
        // Like the homepage, every kind of source that is not a podcast is news.
        [
          {
            durationSeconds,
            episodeNumber,
            kind: kind === 'podcast' ? ('podcast' as const) : ('news' as const),
            paywalled,
            publishedAt,
            seasonNumber,
            sourceName,
            title,
            url,
          },
        ],
    ),
    ...written.flatMap(({ publishedAt, slug, title }) =>
      // The condition leaves out an empty time of publication already; this tells the compiler.
      publishedAt === null ? [] : [{ kind: 'article' as const, publishedAt, slug, title }],
    ),
  ]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit)

  return { hits, total: Number(found[0]?.total ?? 0) + Number(written[0]?.total ?? 0) }
}

/**
 * The conditions that make an item an episode to show: of a podcast that is switched on, not
 * hidden, not later than `until`, and of the podcast with this slug when `podcast` is given.
 */
function episodeFilter(until: Date, podcast: string | undefined) {
  return and(
    eq(sources.enabled, true),
    eq(sources.kind, 'podcast'),
    lte(items.publishedAt, until),
    isShown(),
    podcast === undefined ? undefined : hasSlug(podcast),
  )
}

/**
 * Whether the source has exactly this slug. The column ignores case and accents, which keeps
 * two slugs that differ only in those from both being in the register, but an address must name
 * one podcast only, so this compares byte for byte.
 */
function hasSlug(slug: string) {
  return sql`${sources.slug} = ${slug} collate utf8mb4_bin`
}

/**
 * The condition that every word occurs in the column (or, with more columns, in one of them).
 * The words are text and no pattern, so `%`, `_` and the escape character `|` itself get an
 * escape character in front. `escape '|'` also makes `\` an ordinary character, which MariaDB
 * would read as the escape character otherwise.
 */
function hasWords(words: string[], ...columns: [AnyMySqlColumn, ...AnyMySqlColumn[]]) {
  return and(
    ...words.map((word) => {
      const pattern = `%${word.replaceAll(/[%_|]/gu, '|$&')}%`

      return or(...columns.map((column) => sql`${column} like ${pattern} escape '|'`))
    }),
  )
}

/**
 * The condition that makes an item one to show to a visitor: the importer found it `relevant`
 * (see `items.relevance`), and no moderator hid it. Every query that puts items on a page
 * includes it. The admin's list is the one that doesn't, so a moderator finds every item.
 */
function isShown() {
  return and(eq(items.relevance, 'relevant'), isNull(items.hiddenAt))
}
