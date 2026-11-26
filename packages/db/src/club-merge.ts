import { and, asc, count, eq, inArray, isNotNull, or, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import { type AuditEntry, recordAction } from './audit-log.ts'
import { normaliseClubName } from './clubs.ts'
import {
  type Club,
  clubHomeGrounds,
  clubNamePeriods,
  clubNames,
  clubPages,
  clubs,
  groupStandings,
  itemClubs,
  leagueResults,
  matches,
  standings,
} from './schema.ts'

/** The form of a season, such as `2002/03`. */
const seasonForm = /^\d{4}\/\d{2}$/

/**
 * What a merge of two clubs does, worked out before it happens (`planClubMerge`): the
 * confirmation page of the admin shows it and the row of the log is written from it.
 */
export type ClubMergePlan = {
  /**
   * The grounds of the club that goes that the club that stays has already, or has no room for.
   */
  groundsLeft: string[]
  /** How many home grounds of the club that goes move to the club that stays. */
  groundsMoved: number
  /**
   * How many rows of `item_clubs`, `standings` and `league_results` follow the name of the club
   * that goes.
   */
  itemClubs: number
  /** The club that stays, as it is before the merge. */
  kept: Club
  /** How many matches the club that stays has before the merge. */
  keptMatches: number
  leagueResults: number
  /** The matches that move. */
  matches: number
  /**
   * The other names that move, and the name of the club that goes, which becomes one of them.
   */
  names: string[]
  /** The club that goes. */
  other: Club
  /**
   * The titles of articles that move, and the article of the club that goes if it becomes a
   * title.
   */
  pages: string[]
  /**
   * True when the club that goes has a list of names and the club that stays has one too, so
   * the first is left.
   */
  periodsLeft: boolean
  /** How many lines of the names of the club that goes (`club_name_periods`) move. */
  periodsMoved: number
  /** The season the name that stays begins in, as the editor filled it in. */
  since: string | undefined
  standings: number
}

/**
 * Why two clubs can't be merged: one club twice, a club that is gone, or two Wikidata numbers.
 */
export type ClubMergeRefusal = 'both-wikidata' | 'missing' | 'same'

type Ground = typeof clubHomeGrounds.$inferSelect

/** What the writes of a merge go through: the connection, or the transaction of a step. */
type MergeDatabase = Pick<Database, 'delete' | 'insert' | 'select' | 'update'>

/**
 * Which of two clubs stays unless the editor says otherwise, by the rules of `repairClubs`: the
 * one with the Wikidata number, else the one with the article, else the one with the most
 * matches, else the oldest.
 */
export async function defaultKeptClub(db: Pick<Database, 'select'>, a: Club, b: Club): Promise<number> {
  const counts = await matchCounts(db, [a.id, b.id])
  const [first] = [a, b].sort(
    (x, y) =>
      Number(y.wikidataId !== null) - Number(x.wikidataId !== null) ||
      Number(y.wikipediaPage !== null) - Number(x.wikipediaPage !== null) ||
      (counts.get(y.id) ?? 0) - (counts.get(x.id) ?? 0) ||
      x.id - y.id,
  )

  return first!.id
}

/**
 * Merges two clubs the editors chose in the admin (#1345): everything of `otherId` goes to
 * `keptId` and the club goes, and one row of the log (`club.merge`, with the club that stays in
 * `item_id`) says what moved. The plan, the merge and the row are one transaction. `describe`
 * writes the `detail` of the row from the plan. Returns the plan, or why there is none: nothing
 * is written then.
 *
 * The name of the club that goes becomes another name of the club that stays, so the import of
 * the old fansite finds the club under that name and doesn't make it again.
 */
export async function mergeChosenClubs(
  db: Pick<Database, 'transaction'>,
  {
    describe,
    keptId,
    otherId,
    since,
    userId,
  }: {
    describe: (plan: ClubMergePlan) => string
    keptId: number
    otherId: number
    since?: string | undefined
    userId: AuditEntry['userId']
  },
  now = new Date(),
): Promise<ClubMergePlan | ClubMergeRefusal> {
  if (otherId === keptId) {
    return 'same'
  }

  return db.transaction(async (tx) => {
    // Both rows are locked, lowest number first, so two merges at once wait for each other.
    await tx
      .select({ id: clubs.id })
      .from(clubs)
      .where(inArray(clubs.id, [otherId, keptId]))
      .orderBy(asc(clubs.id))
      .for('update')

    const plan = await planClubMerge(tx, otherId, keptId, since)

    if (typeof plan === 'string') {
      return plan
    }

    await mergeClubInto(tx, plan)
    await recordAction(tx, { action: 'club.merge', detail: describe(plan), itemId: keptId, userId }, now)

    return plan
  })
}

/**
 * Works out what a merge does without writing anything. `same` for one club twice, `missing`
 * when either is gone, `both-wikidata` when both have a number: those are two clubs. A `since`
 * that is not a season, such as `2002/03`, is an error.
 */
export async function planClubMerge(
  db: Pick<Database, 'select'>,
  otherId: number,
  keptId: number,
  since?: string,
): Promise<ClubMergePlan | ClubMergeRefusal> {
  if (otherId === keptId) {
    return 'same'
  }
  if (since !== undefined && !seasonForm.test(since)) {
    throw new Error(`'${since}' is not a season such as 2002/03`)
  }

  const rows = await db
    .select()
    .from(clubs)
    .where(inArray(clubs.id, [otherId, keptId]))
  const other = rows.find((row) => row.id === otherId)
  const kept = rows.find((row) => row.id === keptId)

  if (other === undefined || kept === undefined) {
    return 'missing'
  }
  if (other.wikidataId !== null && kept.wikidataId !== null) {
    return 'both-wikidata'
  }

  const goneNames = [other.name, ...(await namesOf(db, otherId))]
  const keptNames = await namesOf(db, keptId)
  const taken = new Set([kept.name, ...keptNames].map(normaliseClubName))
  const newNames = [...new Set(goneNames)].filter((name) => !taken.has(normaliseClubName(name)))
  const otherPages = (await db.select().from(clubPages).where(eq(clubPages.clubId, otherId))).map((row) => row.page)
  const keptPages = new Set(
    (await db.select().from(clubPages).where(eq(clubPages.clubId, keptId))).map((row) => row.page),
  )
  const pages = otherPages.filter((page) => !keptPages.has(page))

  if (
    other.wikipediaPage !== null &&
    kept.wikipediaPage !== null &&
    !keptPages.has(other.wikipediaPage) &&
    !pages.includes(other.wikipediaPage)
  ) {
    pages.push(other.wikipediaPage)
  }

  const grounds = await groundsOf(db, otherId)
  const keptGrounds = await groundsOf(db, keptId)
  const sorted = placeGrounds(grounds, keptGrounds)
  const [{ n: goneMatches } = { n: 0 }] = await db
    .select({ n: count() })
    .from(matches)
    .where(eq(matches.clubId, otherId))
  const [{ n: keptMatches } = { n: 0 }] = await db
    .select({ n: count() })
    .from(matches)
    .where(eq(matches.clubId, keptId))
  const [{ n: goneItems } = { n: 0 }] = await db
    .select({ n: count() })
    .from(itemClubs)
    .where(eq(itemClubs.club, other.name))
  const [{ n: goneStandings } = { n: 0 }] = await db
    .select({ n: count() })
    .from(standings)
    .where(eq(standings.club, other.name))
  const [{ n: goneResults } = { n: 0 }] = await db
    .select({ n: count() })
    .from(leagueResults)
    .where(or(eq(leagueResults.homeClub, other.name), eq(leagueResults.awayClub, other.name)))
  const gonePeriods = await db.select().from(clubNamePeriods).where(eq(clubNamePeriods.clubId, otherId))
  const keptPeriods = await db.select().from(clubNamePeriods).where(eq(clubNamePeriods.clubId, keptId))

  return {
    groundsLeft: sorted.left.map((ground) => `stadion ${ground.stadiumId}`),
    groundsMoved: sorted.moved.length,
    itemClubs: goneItems,
    kept,
    keptMatches,
    leagueResults: goneResults,
    matches: goneMatches,
    names: newNames,
    other,
    pages,
    periodsLeft: gonePeriods.length > 0 && keptPeriods.length > 0,
    periodsMoved: keptPeriods.length === 0 ? gonePeriods.length : 0,
    since,
    standings: goneStandings,
  }
}

async function groundsOf(db: Pick<Database, 'select'>, clubId: number) {
  return db
    .select()
    .from(clubHomeGrounds)
    .where(eq(clubHomeGrounds.clubId, clubId))
    .orderBy(asc(clubHomeGrounds.position))
}

async function matchCounts(db: Pick<Database, 'select'>, ids: number[]) {
  const rows = await db
    .select({ clubId: matches.clubId, n: count() })
    .from(matches)
    .where(inArray(matches.clubId, ids))
    .groupBy(matches.clubId)

  return new Map(rows.map((row) => [row.clubId, row.n]))
}

/** Moves everything of `plan.other` to `plan.kept`, then removes the club. */
async function mergeClubInto(db: MergeDatabase, plan: ClubMergePlan): Promise<void> {
  const { kept, other } = plan
  const names = await namesOf(db, other.id)

  // The rows that go with the club's number.
  await db.update(matches).set({ clubId: kept.id }).where(eq(matches.clubId, other.id))
  await db.update(clubPages).set({ clubId: kept.id }).where(eq(clubPages.clubId, other.id))
  // The table of a group stage follows the number too (#1405).
  await db.update(groupStandings).set({ clubId: kept.id }).where(eq(groupStandings.clubId, other.id))
  // A title the club that stays has is not in `plan.pages`; one that went with the move can't
  // clash, a title is unique.
  await moveNames(db, kept, other, names)
  await movePeriods(db, plan)
  await moveGrounds(db, plan)
  await moveNamedRows(db, kept.name, other.name)

  // Free the unique columns of the club that goes before the club that stays takes them.
  const takes = {
    wikidataId: kept.wikidataId ?? other.wikidataId,
    wikipediaPage: kept.wikipediaPage ?? other.wikipediaPage,
  }
  const fromOther = kept.wikidataId === null && other.wikidataId !== null

  await db.update(clubs).set({ wikidataId: null, wikipediaPage: null }).where(eq(clubs.id, other.id))
  await db
    .update(clubs)
    .set({
      ...takes,
      ...(fromOther
        ? {
            countryItemId: other.countryItemId,
            wikidataReadAt: other.wikidataReadAt,
            wikidataSearchedAt: other.wikidataSearchedAt,
            wikidataSource: other.wikidataSource,
          }
        : {}),
      ...(kept.country === null && other.country !== null
        ? { country: other.country, countrySource: other.countrySource }
        : {}),
      // The choice of a colour of the editors stays; without one, that of the club that goes.
      ...(kept.colourChoice === null && other.colourChoice !== null ? { colourChoice: other.colourChoice } : {}),
      ...(kept.homeGroundsSource === null && plan.groundsMoved > 0
        ? { homeGroundsSource: other.homeGroundsSource }
        : {}),
    })
    .where(eq(clubs.id, kept.id))

  if (other.wikipediaPage !== null && kept.wikipediaPage !== null) {
    await db
      .insert(clubPages)
      .values({ clubId: kept.id, page: other.wikipediaPage })
      .onDuplicateKeyUpdate({ set: { clubId: kept.id } })
  }

  await db.delete(clubs).where(eq(clubs.id, other.id))
}

async function moveGrounds(db: MergeDatabase, plan: ClubMergePlan) {
  const { kept, other } = plan
  const gone = await groundsOf(db, other.id)
  const own = await groundsOf(db, kept.id)
  const { moved } = placeGrounds(gone, own)

  await db.delete(clubHomeGrounds).where(eq(clubHomeGrounds.clubId, other.id))

  // The series is in order of time: a ground without a start first (only the first row may have
  // none, and it stays first), the rest by start, the ones of the club that stays before the
  // ones that came when the starts are the same.
  const series = [...own, ...moved].sort((a, b) => startKey(a).localeCompare(startKey(b)))

  // Clear the places of the rows that have a start, so the new places can't clash.
  await db
    .update(clubHomeGrounds)
    .set({ position: sql`${clubHomeGrounds.position} + 1000` })
    .where(
      and(
        eq(clubHomeGrounds.clubId, kept.id),
        or(isNotNull(clubHomeGrounds.startSeason), isNotNull(clubHomeGrounds.startDay)),
      ),
    )

  for (const [position, ground] of series.entries()) {
    if (own.includes(ground)) {
      await db.update(clubHomeGrounds).set({ position }).where(eq(clubHomeGrounds.id, ground.id))
    } else {
      await db.insert(clubHomeGrounds).values({ ...ground, clubId: kept.id, id: undefined, position })
    }
  }
}

/** The rows that name a club by its name: the headlines, the table and the results. */
async function moveNamedRows(db: MergeDatabase, to: string, from: string) {
  if (normaliseClubName(to) === normaliseClubName(from)) {
    return
  }

  // A row the club that stays has already is kept once: the row of the club that goes is
  // dropped.
  const items = await db.select().from(itemClubs).where(eq(itemClubs.club, from))
  const itemsOfKept = new Set(
    (await db.select().from(itemClubs).where(eq(itemClubs.club, to))).map((row) => row.itemId),
  )

  for (const row of items) {
    if (itemsOfKept.has(row.itemId)) {
      await db.delete(itemClubs).where(and(eq(itemClubs.itemId, row.itemId), eq(itemClubs.club, from)))
    } else {
      await db
        .update(itemClubs)
        .set({ club: to })
        .where(and(eq(itemClubs.itemId, row.itemId), eq(itemClubs.club, from)))
    }
  }

  const seasonsOfKept = new Set(
    (await db.select({ season: standings.season }).from(standings).where(eq(standings.club, to))).map(
      (row) => row.season,
    ),
  )

  for (const row of await db.select().from(standings).where(eq(standings.club, from))) {
    if (seasonsOfKept.has(row.season)) {
      await db.delete(standings).where(and(eq(standings.season, row.season), eq(standings.club, from)))
    } else {
      await db
        .update(standings)
        .set({ club: to })
        .where(and(eq(standings.season, row.season), eq(standings.club, from)))
    }
  }

  const results = await db
    .select()
    .from(leagueResults)
    .where(or(eq(leagueResults.homeClub, from), eq(leagueResults.awayClub, from)))
  const keys = new Set(
    (
      await db
        .select()
        .from(leagueResults)
        .where(or(eq(leagueResults.homeClub, to), eq(leagueResults.awayClub, to)))
    ).map((row) => `${row.season}|${row.homeClub}|${row.awayClub}`.toLowerCase()),
  )

  for (const row of results) {
    const home = normaliseClubName(row.homeClub) === normaliseClubName(from) ? to : row.homeClub
    const away = normaliseClubName(row.awayClub) === normaliseClubName(from) ? to : row.awayClub
    const key = `${row.season}|${home}|${away}`.toLowerCase()
    const where = and(
      eq(leagueResults.season, row.season),
      eq(leagueResults.homeClub, row.homeClub),
      eq(leagueResults.awayClub, row.awayClub),
    )

    if (keys.has(key)) {
      await db.delete(leagueResults).where(where)
    } else {
      keys.add(key)
      await db.update(leagueResults).set({ awayClub: away, homeClub: home }).where(where)
    }
  }
}

async function moveNames(db: MergeDatabase, kept: Club, other: Club, names: string[]) {
  const own = normaliseClubName(kept.name)

  await db.update(clubNames).set({ clubId: kept.id }).where(eq(clubNames.clubId, other.id))
  // A name that is the name of the club that stays is no other name.
  for (const name of names) {
    if (normaliseClubName(name) === own) {
      await db.delete(clubNames).where(and(eq(clubNames.clubId, kept.id), eq(clubNames.name, name)))
    }
  }

  const known = new Set((await namesOf(db, kept.id)).map(normaliseClubName))
  const others = new Set(
    (
      await db
        .select({ name: clubNames.name })
        .from(clubNames)
        .where(sql`${clubNames.clubId} <> ${kept.id}`)
    ).map((row) => normaliseClubName(row.name)),
  )
  const key = normaliseClubName(other.name)

  if (key !== own && !known.has(key) && !others.has(key)) {
    await db.insert(clubNames).values({ clubId: kept.id, name: other.name })
  }
}

async function movePeriods(db: MergeDatabase, plan: ClubMergePlan) {
  const { kept, other, since } = plan
  const own = await db
    .select()
    .from(clubNamePeriods)
    .where(eq(clubNamePeriods.clubId, kept.id))
    .orderBy(asc(clubNamePeriods.position))
  const gone = await db
    .select()
    .from(clubNamePeriods)
    .where(eq(clubNamePeriods.clubId, other.id))
    .orderBy(asc(clubNamePeriods.position))

  // The list of the club that goes goes with the club, rows included, unless the club that
  // stays has one.
  await db.delete(clubNamePeriods).where(eq(clubNamePeriods.clubId, other.id))

  if (own.length === 0 && gone.length > 0) {
    await db.insert(clubNamePeriods).values(gone.map((row) => ({ ...row, clubId: kept.id, id: undefined })))

    if (since !== undefined && normaliseClubName(gone.at(-1)!.name) !== normaliseClubName(kept.name)) {
      await db
        .insert(clubNamePeriods)
        .values({ clubId: kept.id, name: kept.name, position: gone.length, startSeason: since })
    }

    return
  }
  if (since === undefined || normaliseClubName(other.name) === normaliseClubName(kept.name)) {
    return
  }
  if (own.length === 0) {
    await db.insert(clubNamePeriods).values([
      { clubId: kept.id, name: other.name, position: 0 },
      { clubId: kept.id, name: kept.name, position: 1, startSeason: since },
    ])

    return
  }

  // The list already has the name that goes, on any line: nothing to put in front.
  if (own.some((row) => normaliseClubName(row.name) === normaliseClubName(other.name))) {
    return
  }

  // The list of the club that stays gets the name that goes in front, and its first line starts
  // in `since`.
  await db.delete(clubNamePeriods).where(eq(clubNamePeriods.clubId, kept.id))
  await db.insert(clubNamePeriods).values([
    { clubId: kept.id, name: other.name, position: 0 },
    ...own.map((row, index) => ({
      ...row,
      clubId: kept.id,
      id: undefined,
      position: index + 1,
      ...(index === 0 && row.startSeason === null && row.startDay === null ? { startSeason: since } : {}),
    })),
  ])
}

async function namesOf(db: Pick<Database, 'select'>, clubId: number): Promise<string[]> {
  return (await db.select({ name: clubNames.name }).from(clubNames).where(eq(clubNames.clubId, clubId))).map(
    (row) => row.name,
  )
}

/**
 * Which grounds of the club that goes move, and which stay behind because a ground has no
 * place.
 */
function placeGrounds(gone: Ground[], kept: Ground[]) {
  const have = new Set(kept.map((ground) => ground.stadiumId))
  const moved: Ground[] = []
  const left: Ground[] = []

  for (const ground of gone) {
    if (have.has(ground.stadiumId)) {
      left.push(ground)
      continue
    }
    // A row after the first needs a start (`club_home_grounds_start_after_first`).
    if (kept.length + moved.length > 0 && ground.startSeason === null && ground.startDay === null) {
      left.push(ground)
      continue
    }
    have.add(ground.stadiumId)
    moved.push(ground)
  }

  return { left, moved }
}

/** When a ground starts, as a day that sorts as text; a season counts as 1 July. */
function startKey(ground: Ground): string {
  if (ground.startDay !== null) {
    return ground.startDay
  }

  return ground.startSeason === null ? '' : `${ground.startSeason.slice(0, 4)}-07-01`
}
