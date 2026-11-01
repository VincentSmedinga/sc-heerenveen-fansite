import type { SQL } from 'drizzle-orm'
import type { AnyMySqlColumn } from 'drizzle-orm/mysql-core'

import { and, asc, count, desc, eq, exists, inArray, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/mysql-core'

import type { Database } from './client.ts'
import type { Competition, MatchPageKind, StaffRole } from './schema.ts'

import {
  articles,
  clubNames,
  clubs,
  discussions,
  items,
  matches,
  matchGoals,
  matchPageKinds,
  players,
  playerSeasonStats,
  sources,
  staff,
  standings,
  wikipediaPages,
} from './schema.ts'
import { servedInSeason, type StaffOnDay, staffOnDay } from './staff.ts'

export type PublicArchiveItem = Awaited<ReturnType<typeof listArchivePage>>[number]

export type PublicArchiveSource = Awaited<ReturnType<typeof listArchiveSources>>[number]

export type PublicArticle = NonNullable<Awaited<ReturnType<typeof findPublishedArticle>>>

export type PublicArticleCard = NonNullable<Awaited<ReturnType<typeof findNewestArticle>>>

export type PublicArticleLink = Awaited<ReturnType<typeof listPublishedArticles>>[number]

export type PublicClub = NonNullable<Awaited<ReturnType<typeof findClubBySlug>>>

export type PublicClubMatch = Awaited<ReturnType<typeof listClubMatches>>[number]

export type PublicClubRecord = Awaited<ReturnType<typeof listClubRecords>>[number]

export type PublicDiscussion = Awaited<ReturnType<typeof listNewestDiscussions>>[number]

export type PublicEpisode = Awaited<ReturnType<typeof listPodcastEpisodes>>[number]

export type PublicItem = Awaited<ReturnType<typeof listRecentItems>>[number]

export type PublicMatch = Awaited<ReturnType<typeof listSeasonMatches>>[number]

export type PublicPlayer = Awaited<ReturnType<typeof listSquad>>[number]

export type PublicPlayerStats = Awaited<ReturnType<typeof listSeasonPlayerStats>>[number]

export type PublicPodcast = Awaited<ReturnType<typeof listPodcasts>>[number]

export type PublicSearchHit = Awaited<ReturnType<typeof searchPublic>>['hits'][number]

export type PublicSeasonWikipediaPage = Awaited<ReturnType<typeof listAllWikipediaPages>>[number]

export type PublicSource = Awaited<ReturnType<typeof listEnabledSources>>[number]

export type PublicStaff = Awaited<ReturnType<typeof listStaffInSeason>>[number]

export type PublicStandingsRow = Awaited<ReturnType<typeof listSeasonStandings>>[number]

export type PublicWikipediaPage = Awaited<ReturnType<typeof listWikipediaPages>>[number]

/**
 * How many headlines `listArchivePage` gives in all, with the same `until` and `sources`.
 */
export async function countArchiveItems(
  db: Database,
  { sources: slugs, until }: { sources?: readonly string[]; until: Date },
) {
  const [row] = await db
    .select({ total: count() })
    .from(items)
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(newsFilter(until, slugs))

  return row?.total ?? 0
}

/**
 * How many episodes `listPodcastEpisodes` gives in all, with the same `until` and `podcasts`.
 */
export async function countPodcastEpisodes(
  db: Database,
  { podcasts: slugs, until }: { podcasts?: readonly string[]; until: Date },
) {
  const [row] = await db
    .select({ total: count() })
    .from(items)
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(episodeFilter(until, slugs))

  return row?.total ?? 0
}

/**
 * One club by its `slug`, the fixed name in its address, with the other names Wikipedia writes
 * for it (`otherNames`, A to Z, without the name it has now) and the title of its article,
 * which is null for a club the importer has not met with an article. It gives nothing for a
 * slug that no club has.
 */
export async function findClubBySlug(db: Database, slug: string) {
  const [club] = await db
    .select({ id: clubs.id, name: clubs.name, slug: clubs.slug, wikipediaPage: clubs.wikipediaPage })
    .from(clubs)
    .where(eq(clubs.slug, slug))

  if (club === undefined) {
    return undefined
  }

  const others = await db
    .select({ name: clubNames.name })
    .from(clubNames)
    .where(eq(clubNames.clubId, club.id))
    .orderBy(asc(clubNames.name))

  return { ...club, otherNames: others.map((other) => other.name) }
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
 * Who has a role on a day (`YYYY-MM-DD`): `certain` with the person, `uncertain` with the
 * people who might when the day lies in the uncertainty of a date known to the month or year
 * only, and `none` for a day in a gap or outside the rows (see `staffOnDay`). A person is never
 * named as the answer when the day is not surely in the period.
 */
export async function findStaffOn(db: Database, role: StaffRole, day: string): Promise<StaffOnDay<PublicStaff>> {
  return staffOnDay(await staffOfRole(db, role), day)
}

/**
 * The Wikipedia pages the match import read for every season, newest season first, in the order
 * of `listWikipediaPages` within a season: the season, the title of the page, which kind it is
 * and the moment it was last read. A page that counts across seasons, such as the head-to-head
 * record against a club, credits them all. The page of the squad is not one of them.
 */
export async function listAllWikipediaPages(db: Database) {
  const rows = await db
    .select({
      kind: wikipediaPages.kind,
      readAt: wikipediaPages.readAt,
      season: wikipediaPages.season,
      title: wikipediaPages.title,
    })
    .from(wikipediaPages)
    .where(inArray(wikipediaPages.kind, matchPageKinds))
    .orderBy(desc(wikipediaPages.season), asc(wikipediaPages.kind), asc(wikipediaPages.title))

  return rows.map((row) => ({ ...row, kind: row.kind as MatchPageKind }))
}

/**
 * One page of the news archive: the headlines of the sources that are switched on, newest
 * first, from `offset`, at most `limit`, with what the pages show of them, the same as
 * `listRecentItems`. It has the same headlines too, but without a limit in age: all that the
 * importer found, up to `until`. Give the slugs of some sources as `sources` to get the
 * headlines of those sources only; without them, or with none, it has those of all sources.
 *
 * Pass the moment of now as `until`, as with `listRecentItems`.
 */
export function listArchivePage(
  db: Database,
  {
    limit,
    offset = 0,
    sources: slugs,
    until,
  }: { limit: number; offset?: number; sources?: readonly string[]; until: Date },
) {
  return db
    .select(newsColumns)
    .from(items)
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(newsFilter(until, slugs))
    .orderBy(desc(items.publishedAt), desc(items.id))
    .limit(limit)
    .offset(offset)
}

/**
 * The sources for the filter of the news archive: those that are switched on, are not a
 * podcast, have a slug and have at least one headline that the archive shows (up to `until`),
 * by name, with the name as the source wants to be credited and the slug for the address.
 */
export function listArchiveSources(db: Database, until: Date) {
  return db
    .select({
      name: sql<string>`coalesce(nullif(${sources.attribution}, ''), ${sources.name})`.as('source_name'),
      slug: sql<string>`${sources.slug}`.as('slug'),
    })
    .from(sources)
    .where(
      and(
        isNotNull(sources.slug),
        exists(
          db
            .select({ one: sql`1` })
            .from(items)
            .where(and(eq(items.sourceId, sources.id), lte(items.publishedAt, until), isShown(until))),
        ),
        eq(sources.enabled, true),
        ne(sources.kind, 'podcast'),
      ),
    )
    .orderBy(asc(sources.name))
}

/**
 * The matches against one club, the newest first, whether they are played or not, with what a
 * list of results shows: the season, the competition and round, the day, the kick-off, the
 * result from the side of sc Heerenveen, and whether it was at home. `club` is the `id` of the
 * club (from `findClubBySlug`). With `competition` only the matches of that competition are
 * given; without it all of them. A club with no match, or none in that competition, gives an
 * empty list.
 */
export function listClubMatches(db: Database, club: number, { competition }: { competition?: Competition } = {}) {
  return db
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
      season: matches.season,
      stadium: matches.stadium,
      status: matches.status,
    })
    .from(matches)
    .where(and(eq(matches.clubId, club), competition === undefined ? undefined : eq(matches.competition, competition)))
    .orderBy(desc(matches.matchDate), desc(matches.kickoffAt), desc(matches.id))
}

/**
 * The clubs sc Heerenveen has a match against, A to Z by their name, each with the record of
 * the played matches against it: played, won, drawn, lost, and the goals for and against. A
 * match is won, drawn or lost by the goals, as Wikipedia gives them, so a cup tie that a
 * shoot-out decided after a level score is drawn. With `competition` only the matches of that
 * competition count, and a club without one in it is left out; without it all of them count.
 * A club that has matches but none played yet is in the list with zeros.
 */
export function listClubRecords(db: Database, { competition }: { competition?: Competition } = {}) {
  const played = eq(matches.status, 'played')
  const total = (condition: SQL) => sql<number>`cast(coalesce(sum(${condition}), 0) as unsigned)`.mapWith(Number)

  return db
    .select({
      drawn: total(and(played, sql`${matches.goalsFor} = ${matches.goalsAgainst}`) as SQL),
      goalsAgainst: sql<number>`cast(coalesce(sum(${matches.goalsAgainst}), 0) as unsigned)`.mapWith(Number),
      goalsFor: sql<number>`cast(coalesce(sum(${matches.goalsFor}), 0) as unsigned)`.mapWith(Number),
      id: clubs.id,
      lost: total(and(played, sql`${matches.goalsFor} < ${matches.goalsAgainst}`) as SQL),
      name: clubs.name,
      played: total(played),
      slug: clubs.slug,
      won: total(and(played, sql`${matches.goalsFor} > ${matches.goalsAgainst}`) as SQL),
    })
    .from(clubs)
    .innerJoin(
      matches,
      and(eq(matches.clubId, clubs.id), competition === undefined ? undefined : eq(matches.competition, competition)),
    )
    .groupBy(clubs.id)
    .orderBy(asc(clubs.name), asc(clubs.id))
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
 * The seasons that have matches, such as `2026/27`, the newest first. A season without a match,
 * even one with a table or a squad, is not in it: the season picker lists what the matches page
 * can show.
 */
export async function listMatchSeasons(db: Database) {
  const rows = await db.selectDistinct({ season: matches.season }).from(matches).orderBy(desc(matches.season))

  return rows.map((row) => row.season)
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
 * page. Give the slugs of some podcasts as `podcasts` to get the episodes of those podcasts
 * only; without them, or with none, it has those of all podcasts.
 *
 * Pass the moment of now as `until`, as with `listRecentItems`: an episode a feed dated later
 * doesn't belong on top.
 */
export function listPodcastEpisodes(
  db: Database,
  {
    limit,
    offset = 0,
    podcasts: slugs,
    until,
  }: { limit: number; offset?: number; podcasts?: readonly string[]; until: Date },
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
    .where(episodeFilter(until, slugs))
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
    .select(newsColumns)
    .from(items)
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(newsFilter(until))
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
 * together, and empty when the page names none. `player` is the name as the page shows it. A
 * goal of one of our players also has `playerId`, and the full name and the search term of
 * that player in `playerName` and `playerSearchTerm` (all three null for a goal that has no
 * player in the table `players`: a goal of the opponent, or one that could not be linked). The
 * player may have left the squad since. `playerPage` is the title of the player's Wikipedia
 * page as the table of the match links it, whether or not the goal is linked to a player, and
 * null when the table does not link the name. The moment the importer saw a result stays
 * internal. Only the season that is asked for is read: the pages show the current season alone.
 */
export async function listSeasonMatches(db: Database, season: string) {
  const rows = await db
    .select({
      afterNinetyAgainst: matches.afterNinetyAgainst,
      afterNinetyFor: matches.afterNinetyFor,
      competition: matches.competition,
      dateText: matches.dateText,
      extraTime: matches.extraTime,
      goalsAgainst: matches.goalsAgainst,
      goalsFor: matches.goalsFor,
      home: matches.home,
      id: matches.id,
      kickoffAt: matches.kickoffAt,
      matchDate: matches.matchDate,
      note: matches.note,
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
      playerId: matchGoals.playerId,
      playerName: players.name,
      playerPage: matchGoals.wikipediaPage,
      playerSearchTerm: players.searchTerm,
      stoppageMinutes: matchGoals.stoppageMinutes,
    })
    .from(matchGoals)
    .innerJoin(matches, eq(matchGoals.matchId, matches.id))
    .leftJoin(players, eq(matchGoals.playerId, players.id))
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
        playerId: goal.playerId,
        playerName: goal.playerName,
        playerPage: goal.playerPage,
        playerSearchTerm: goal.playerSearchTerm,
        stoppageMinutes: goal.stoppageMinutes,
      })),
  }))
}

/**
 * The numbers of the players in a season, such as `2026/27`: one row per player and
 * competition, with the appearances (also as a substitute), goals and assists the squad table
 * of the Dutch Wikipedia gives. The rows come in the order of the player's name and then the
 * competition (Eredivisie before KNVB Beker). A player without numbers in a competition has no
 * row for it, and a player who left the squad keeps his rows (`inSquad` says whether he is
 * still in it). There is no total over the competitions: whoever shows one adds the rows. The
 * player is given by `playerId`, the same `id` as `match_goals.player_id`, with the name, the
 * position and the Wikipedia page of the player.
 */
export function listSeasonPlayerStats(db: Database, season: string) {
  return db
    .select({
      appearances: playerSeasonStats.appearances,
      assists: playerSeasonStats.assists,
      competition: playerSeasonStats.competition,
      goals: playerSeasonStats.goals,
      inSquad: players.inSquad,
      name: players.name,
      playerId: players.id,
      position: players.position,
      wikipediaPage: players.wikipediaPage,
    })
    .from(playerSeasonStats)
    .innerJoin(players, eq(playerSeasonStats.playerId, players.id))
    .where(eq(playerSeasonStats.season, season))
    .orderBy(asc(players.name), asc(players.id), asc(playerSeasonStats.competition))
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
 * place that decides who is in the list: only the players who are in the squad now. A player
 * who left stays in the table for his goals, and is not listed.
 */
export function listSquad(db: Database, season: string) {
  return db
    .select({ name: players.name, position: players.position, searchTerm: players.searchTerm })
    .from(players)
    .where(and(eq(players.season, season), eq(players.inSquad, true)))
    .orderBy(asc(sql`${players.shirtNumber} is null`), asc(players.shirtNumber), asc(players.name))
}

/**
 * The staff with a role in a season, such as `2024/25`, in the order their periods began: the
 * people who surely held a day of the season, so a coach whose start is only known to the year
 * is not in the season before it (see `servedInSeason`). It gives what the pages show: the
 * name, the title of the Wikipedia page (null when there is none), whether the person stood in,
 * and the dates with how exactly each is known. The seed holds some twenty rows per role, so
 * the rows of the role are read and the season is picked in code.
 */
export async function listStaffInSeason(db: Database, role: StaffRole, season: string) {
  return (await staffOfRole(db, role)).filter((member) => servedInSeason(member, season))
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
      .where(
        and(
          eq(sources.enabled, true),
          lte(items.publishedAt, until),
          isShown(until, { merge: true }),
          hasWords(words, items.title),
        ),
      )
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
 * What a page shows of a headline: the headline, the link, the time, whether it is behind a
 * paywall, and the name of the source as it wants to be credited. Nothing else leaves the
 * database.
 */
const newsColumns = {
  paywalled: items.paywalled,
  publishedAt: items.publishedAt,
  sourceName: sql<string>`coalesce(nullif(${sources.attribution}, ''), ${sources.name})`.as('source_name'),
  title: items.title,
  url: items.url,
}

/**
 * The conditions that make an item an episode to show: of a podcast that is switched on, not
 * hidden, not later than `until`, and of one of the podcasts with these slugs when some are
 * given.
 */
function episodeFilter(until: Date, slugs: readonly string[] = []) {
  return and(
    eq(sources.enabled, true),
    eq(sources.kind, 'podcast'),
    lte(items.publishedAt, until),
    isShown(),
    slugs.length === 0 ? undefined : or(...slugs.map(hasSlug)),
  )
}

/**
 * Whether the source has exactly this slug. The column ignores case and accents, which keeps
 * two slugs that differ only in those from both being in the register, but an address must name
 * one source only, so this compares byte for byte.
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
 * The condition that makes an item one to show to a visitor: no moderator hid it, and the
 * importer found it `relevant` (see `items.relevance`). Every query that puts items on a page
 * includes it. The admin's list is the one that doesn't, so a moderator finds every item.
 *
 * An item with a `thread_key` is a version of a story that its source put in the feed again
 * under a new headline, such as a live blog. Only the newest version of the story is shown (the
 * newest `published_at`, and the highest `id` among versions of the same time), and the story
 * counts as relevant when any of its versions is: the headline of the last version may say
 * "the final whistle" and nothing about the club. A version a moderator hid is not a version:
 * the one before it is shown, and no version is left when all are hidden. Versions of one key
 * at two sources are two stories. Pass `until` to leave out the versions that are later than
 * that, as the query itself does for the item.
 *
 * With `merge` the query must join `sources`, and the sources of one publisher (`publisher`)
 * that have a story under the same key are one story: see `isShownOnce`. Without it, a list
 * shows everything a source itself has, which is what the filter per source needs.
 */
function isShown(until?: Date, { merge = false }: { merge?: boolean } = {}) {
  const sibling = alias(items, 'sibling')
  const sameStory = sql`${sibling.sourceId} = ${items.sourceId} and ${sibling.threadKey} = ${items.threadKey} and ${sibling.hiddenAt} is null${
    until === undefined ? sql`` : sql` and ${lte(sibling.publishedAt, until)}`
  }`

  const ofItsSource = and(
    isNull(items.hiddenAt),
    or(
      and(isNull(items.threadKey), eq(items.relevance, 'relevant')),
      and(
        isNotNull(items.threadKey),
        sql`not exists (select 1 from items sibling where ${sameStory} and (${sibling.publishedAt} > ${items.publishedAt} or (${sibling.publishedAt} = ${items.publishedAt} and ${sibling.id} > ${items.id})))`,
        sql`exists (select 1 from items sibling where ${sameStory} and ${sibling.relevance} = 'relevant')`,
      ),
    ),
  )

  return merge
    ? or(and(or(isNull(sources.publisher), isNull(items.threadKey)), ofItsSource), isShownOnce(until))
    : ofItsSource
}

/**
 * Whether an item of a source with a `publisher` and a `thread_key` is the one to show of its
 * story, when the lists show a story of one publisher once. The story is every item of the
 * sources that are switched on, no podcast and have this publisher, under this key. It is
 * relevant when one of the items that no moderator hid is, whatever the source. Each source
 * puts forward its newest item that no moderator hid. Of those, the one of a `local` source
 * goes first, and then the one that was published first, and then the lowest `id`. The others
 * are not shown. A moderator who hid the item of the winner, or a winner that was never in the
 * feed, leaves the item of another source to be shown.
 */
function isShownOnce(until?: Date) {
  const other = alias(items, 'other')
  const otherSource = alias(sources, 'other_source')
  const later = alias(items, 'later')
  const dated = (item: { publishedAt: AnyMySqlColumn }) =>
    until === undefined ? sql`` : sql` and ${lte(item.publishedAt, until)}`
  // The newest item of its source that no moderator hid: no item of the same key that is not
  // hidden is later (or of the same time and a higher id).
  const newestOf = (item: Record<'id' | 'publishedAt' | 'sourceId' | 'threadKey', AnyMySqlColumn>) =>
    sql`not exists (select 1 from items later where ${later.sourceId} = ${item.sourceId} and ${later.threadKey} = ${item.threadKey} and ${later.hiddenAt} is null${dated(later)} and (${later.publishedAt} > ${item.publishedAt} or (${later.publishedAt} = ${item.publishedAt} and ${later.id} > ${item.id})))`
  const ofStory = sql`${otherSource.id} = ${other.sourceId} and ${otherSource.publisher} = ${sources.publisher} and ${otherSource.enabled} = true and ${otherSource.kind} <> 'podcast' and ${other.threadKey} = ${items.threadKey} and ${other.hiddenAt} is null${dated(other)}`
  const beats = sql`(${otherSource.local} > ${sources.local} or (${otherSource.local} = ${sources.local} and (${other.publishedAt} < ${items.publishedAt} or (${other.publishedAt} = ${items.publishedAt} and ${other.id} < ${items.id}))))`

  return and(
    isNotNull(sources.publisher),
    isNotNull(items.threadKey),
    isNull(items.hiddenAt),
    newestOf(items),
    sql`exists (select 1 from items other, sources other_source where ${ofStory} and ${other.relevance} = 'relevant')`,
    sql`not exists (select 1 from items other, sources other_source where ${ofStory} and ${other.sourceId} <> ${items.sourceId} and ${newestOf(other)} and ${beats})`,
  )
}

/**
 * The conditions that make an item a headline to show: of a source that is switched on and is
 * no podcast, shown (see `isShown`), not later than `until`, and of one of the sources with
 * these slugs when some are given. Without slugs a story that sources of one publisher have
 * all is shown once (see `isShownOnce`); with slugs the list has all that those sources have.
 */
function newsFilter(until: Date, slugs: readonly string[] = []) {
  return and(
    eq(sources.enabled, true),
    ne(sources.kind, 'podcast'),
    lte(items.publishedAt, until),
    // A story of two sources of one publisher is shown once, unless the visitor chose sources.
    isShown(until, { merge: slugs.length === 0 }),
    slugs.length === 0 ? undefined : or(...slugs.map(hasSlug)),
  )
}

function staffOfRole(db: Database, role: StaffRole) {
  return db
    .select({
      endDate: staff.endDate,
      endPrecision: staff.endPrecision,
      interim: staff.interim,
      name: staff.name,
      startDate: staff.startDate,
      startPrecision: staff.startPrecision,
      wikipediaPage: staff.wikipediaPage,
    })
    .from(staff)
    .where(eq(staff.role, role))
    .orderBy(asc(staff.startDate), asc(staff.id))
}
