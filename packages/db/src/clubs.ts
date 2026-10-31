import { asc, eq, max, sql } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { NewMatch } from './schema.ts'

import { clubNames, clubs, matches } from './schema.ts'

/**
 * Slugs the pages of the site use themselves, under the address of the clubs. A club never
 * gets one of them: `kies` is the route that takes the choice of a season or a competition.
 */
export const reservedClubSlugs: readonly string[] = ['kies']

/** The longest slug of a name; the rest of the 80 characters is for `-2`, `-3`, and so on. */
const slugBaseLength = 70

/**
 * A club with its full name and the other spellings that are the same club, such as
 * `Excelsior Rotterdam` with `Excelsior` and `SBV Excelsior`. The importer keeps the list (see
 * `club-names.ts` in the importer).
 */
export type ClubFullName = {
  /** The other spellings. They are never the name of a club, and never a club of their own. */
  aliases: readonly string[]
  /** The full name, which is the name of the club and gives its slug. */
  name: string
}

/** A match as the importer reads it, before its club is found or made. */
export type NewMatchWithoutClub = Omit<NewMatch, 'clubId'>

/** The club a name or an article belongs to, and what happened on the way there. */
export type ResolvedClub = {
  /** One line for the log of the import for each club, name or article that was added. */
  events: string[]
  id: number
}

type ClubDatabase = Pick<Database, 'insert' | 'select' | 'update'>

/** What a club is called and where it is, as the book of clubs keeps it. */
type KnownClub = {
  id: number
  name: string
  /** The newest season of a match against the club, or null when it has none. */
  newestSeason: null | string
  /** The normalised other names. */
  otherNames: Set<string>
  slug: string
  wikipediaPage: null | string
}

/** What `repairClubs` writes through: it also deletes the club that goes away. */
type RepairDatabase = Pick<Database, 'delete' | 'insert' | 'select' | 'update'>

/**
 * The slug a name gives before it is checked against the slugs that exist: lowercase letters,
 * digits and single hyphens, without the accents, dots and apostrophes (`N.E.C.` gives `nec`
 * and `Be Quick '28` gives `be-quick-28`), at most 70 characters. A name that has none of those
 * gives `club`.
 */
export function clubSlug(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[.'’]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, slugBaseLength)
    .replace(/-+$/u, '')

  return slug === '' ? 'club' : slug
}

/**
 * Reads the clubs once and finds or makes the club of each opponent the importer reads, writing
 * through `db` (use the transaction of the import). One club is one article on the Dutch
 * Wikipedia, so:
 *
 * - a name with an article goes to the club with that article. When no club has it, the club
 *   with that name takes the article if it has none yet (a club the migration made from a name
 *   alone); otherwise a new club is made.
 * - a name without an article goes to the club with that name, or with that name among its
 *   other names, whatever the capitals and punctuation; otherwise a new club is made.
 * - a new club gets the slug of its name, with `-2`, `-3` and so on when another club has it.
 *   A club keeps its slug, whatever happens to its name.
 * - a name the club did not have yet is added to its other names. When the match is of the
 *   newest season we have of the club, it becomes the name of the club, and the old one an
 *   other name. A name that already is one of the club's never changes anything, so two
 *   spellings in one season don't take turns. A name that another club has stays with that
 *   club, and the event says so.
 *
 * `season` is the season of the match, such as `2026/27`; without it a name is only added to
 * the other names. The events are lines for the log of the run, in English, with no personal
 * data: clubs are no persons.
 *
 * `fullNames` is looked at first: a name that is a full name or one of the other spellings in
 * it is the full name, so `Excelsior` is the club `Excelsior Rotterdam`, with or without an
 * article. A club the book makes under a listed full name gets the other spellings as its other
 * names. A name that is not listed, such as `Excelsior Maassluis`, works as before. Run
 * `repairClubs` first when the database may hold such a club twice.
 */
export async function createClubBook(
  db: ClubDatabase,
  { fullNames = [] }: { fullNames?: readonly ClubFullName[] } = {},
) {
  const listed = listedNames(fullNames)
  const rows = await db.select().from(clubs).orderBy(asc(clubs.id))
  const names = await db.select().from(clubNames).orderBy(asc(clubNames.id))
  const seasons = await db
    .select({ clubId: matches.clubId, season: max(matches.season) })
    .from(matches)
    .groupBy(matches.clubId)
  const known = new Map<number, KnownClub>(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        newestSeason: seasons.find((found) => found.clubId === row.id)?.season ?? null,
        otherNames: new Set(),
        slug: row.slug,
        wikipediaPage: row.wikipediaPage,
      },
    ]),
  )
  const byPage = new Map<string, KnownClub>()
  const byName = new Map<string, KnownClub>()
  const slugs = new Set(rows.map((row) => row.slug))

  for (const club of known.values()) {
    if (club.wikipediaPage !== null) {
      byPage.set(club.wikipediaPage, club)
    }
    if (!byName.has(normaliseClubName(club.name))) {
      byName.set(normaliseClubName(club.name), club)
    }
  }
  for (const other of names) {
    const club = known.get(other.clubId)

    if (club !== undefined) {
      club.otherNames.add(normaliseClubName(other.name))
      if (!byName.has(normaliseClubName(other.name))) {
        byName.set(normaliseClubName(other.name), club)
      }
    }
  }

  function freeSlug(name: string): string {
    const base = clubSlug(name)

    for (let number = 1; ; number++) {
      const candidate = number === 1 ? base : `${base}-${number}`

      if (number === 1 && reservedClubSlugs.includes(base)) {
        continue
      }
      if (!slugs.has(candidate) && !reservedClubSlugs.includes(candidate)) {
        return candidate
      }
    }
  }

  async function create(
    name: string,
    page: null | string,
    season: null | string,
    events: string[],
  ): Promise<KnownClub> {
    const slug = freeSlug(name)
    const [{ insertId }] = await db.insert(clubs).values({ name, slug, wikipediaPage: page })

    events.push(`new club '${name}'${page === null ? ', with no article' : ` (article '${page}')`}`)
    const club: KnownClub = {
      id: insertId,
      name,
      newestSeason: season,
      otherNames: new Set(),
      slug,
      wikipediaPage: page,
    }

    slugs.add(slug)
    known.set(insertId, club)
    if (page !== null) {
      byPage.set(page, club)
    }
    if (!byName.has(normaliseClubName(name))) {
      byName.set(normaliseClubName(name), club)
    }
    for (const alias of listed.get(normaliseClubName(name))?.aliases ?? []) {
      if (!byName.has(normaliseClubName(alias))) {
        await db.insert(clubNames).values({ clubId: insertId, name: alias })
        club.otherNames.add(normaliseClubName(alias))
        byName.set(normaliseClubName(alias), club)
        events.push(`new name '${alias}' for club '${name}'`)
      }
    }

    return club
  }

  return {
    async resolve({
      name: given,
      page,
      season,
    }: {
      name: string
      page: null | string
      season?: string
    }): Promise<ResolvedClub> {
      const events: string[] = []
      const name = listed.get(normaliseClubName(given))?.name ?? given
      const key = normaliseClubName(name)
      let club = page === null ? byName.get(key) : byPage.get(page)

      if (club === undefined && page !== null) {
        const named = byName.get(key)

        if (named !== undefined && named.wikipediaPage === null) {
          club = named
          club.wikipediaPage = page
          byPage.set(page, club)
          await db.update(clubs).set({ wikipediaPage: page }).where(eq(clubs.id, club.id))
          events.push(`article '${page}' for club '${club.name}'`)
        }
      }
      if (club === undefined) {
        club = await create(name, page, season ?? null, events)
      } else if (key !== normaliseClubName(club.name) && !club.otherNames.has(key)) {
        const owner = byName.get(key)

        if (owner !== undefined && owner !== club) {
          events.push(`name '${name}' stays with club '${owner.name}', not added to club '${club.name}'`)
        } else if (season !== undefined && (club.newestSeason === null || season >= club.newestSeason)) {
          const before = club.name

          await db.insert(clubNames).values({ clubId: club.id, name: before })
          await db.update(clubs).set({ name }).where(eq(clubs.id, club.id))
          club.otherNames.add(normaliseClubName(before))
          club.name = name
          byName.set(key, club)
          events.push(`club '${before}' is now called '${name}'`)
        } else {
          await db.insert(clubNames).values({ clubId: club.id, name })
          club.otherNames.add(key)
          byName.set(key, club)
          events.push(`new name '${name}' for club '${club.name}'`)
        }
      }
      if (season !== undefined && (club.newestSeason === null || season > club.newestSeason)) {
        club.newestSeason = season
      }

      return { events, id: club.id }
    },
  }
}

/**
 * A name as a computer compares it: without capitals, accents, dots, spaces and other
 * punctuation, so that `N.E.C.` and `NEC`, and `Go Ahead Eagles` and `Go-Ahead Eagles`, are the
 * same club.
 */
export function normaliseClubName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

/**
 * Finds the clubs of each listed full name that are in the database more than once or under the
 * wrong name, and makes them one club with the full name. Call it with the transaction of the
 * import: the merge is several writes that belong together.
 *
 * For each entry, the clubs of that name are the clubs whose name or one of whose other names
 * is the full name or one of its other spellings, whatever the capitals and punctuation:
 *
 * - the club that stays is the one with the article, else the one with the most matches, else
 *   the oldest. Two clubs with an article each are two articles and so two clubs: nothing is
 *   merged, and the event says so.
 * - the matches and the other names of the other clubs go to the club that stays, their names
 *   become other names of it, and their rows go. The slug of a club that goes is free again.
 * - the club that stays gets the full name, with the name it had as an other name, the other
 *   spellings of the entry as other names, and the slug of the full name unless a club that is
 *   not part of the entry has it.
 *
 * A club that is right already changes nothing, so running it again writes nothing and gives no
 * events. The events are lines for the log of the run, in English, with no personal data.
 */
export async function repairClubs(db: RepairDatabase, fullNames: readonly ClubFullName[]): Promise<string[]> {
  const events: string[] = []

  for (const entry of fullNames) {
    const wanted = new Set([entry.name, ...entry.aliases].map(normaliseClubName))
    const rows = await db.select().from(clubs).orderBy(asc(clubs.id))
    const names = await db.select().from(clubNames)
    const found = rows.filter(
      (row) =>
        wanted.has(normaliseClubName(row.name)) ||
        names.some((other) => other.clubId === row.id && wanted.has(normaliseClubName(other.name))),
    )

    if (found.length === 0) {
      continue
    }

    const counts = await db
      .select({ clubId: matches.clubId, matches: sql<number>`count(*)`.mapWith(Number) })
      .from(matches)
      .groupBy(matches.clubId)
    const matchesOf = (id: number) => counts.find((count) => count.clubId === id)?.matches ?? 0
    const withArticle = found.filter((row) => row.wikipediaPage !== null)

    if (withArticle.length > 1) {
      events.push(
        `clubs ${found.map((row) => `'${row.name}'`).join(' and ')} have an article each, not merged into '${entry.name}'`,
      )
      continue
    }

    const [stays] = [...found].sort(
      (a, b) =>
        Number(b.wikipediaPage !== null) - Number(a.wikipediaPage !== null) ||
        matchesOf(b.id) - matchesOf(a.id) ||
        a.id - b.id,
    )

    if (stays === undefined) {
      continue
    }

    const others = found.filter((row) => row.id !== stays.id)
    const goneIds = new Set(others.map((row) => row.id))
    const full = normaliseClubName(entry.name)
    // The names a club has once the others are merged in, and the ones another club has.
    const had = new Set(
      names
        .filter((other) => other.clubId === stays.id || goneIds.has(other.clubId))
        .map((other) => normaliseClubName(other.name)),
    )
    const ofOthers = new Set(
      names
        .filter((other) => !found.some((one) => one.id === other.clubId))
        .map((other) => normaliseClubName(other.name)),
    )
    const addName = async (name: string, say: boolean) => {
      const key = normaliseClubName(name)

      if (key !== full && !had.has(key) && !ofOthers.has(key)) {
        await db.insert(clubNames).values({ clubId: stays.id, name })
        had.add(key)
        if (say) {
          events.push(`new name '${name}' for club '${entry.name}'`)
        }
      }
    }

    for (const other of others) {
      await db.update(matches).set({ clubId: stays.id }).where(eq(matches.clubId, other.id))
      await db.update(clubNames).set({ clubId: stays.id }).where(eq(clubNames.clubId, other.id))
      await db.delete(clubs).where(eq(clubs.id, other.id))
      events.push(`merged club '${other.name}' into club '${stays.name}'`)
    }

    const slug = clubSlug(entry.name)
    const taken = rows.some((row) => row.slug === slug && !goneIds.has(row.id) && row.id !== stays.id)
    const set: { name?: string; slug?: string } = {}

    if (stays.name !== entry.name) {
      set.name = entry.name
    }
    if (stays.slug !== slug && !taken) {
      set.slug = slug
    }
    if (Object.keys(set).length > 0) {
      await db.update(clubs).set(set).where(eq(clubs.id, stays.id))
    }
    if (set.name !== undefined) {
      events.push(`club '${stays.name}' is now called '${entry.name}'`)
    }
    if (set.slug !== undefined) {
      events.push(`slug of club '${entry.name}' is now '${slug}'`)
    } else if (stays.slug !== slug) {
      events.push(`slug '${slug}' belongs to another club, club '${entry.name}' keeps '${stays.slug}'`)
    }

    for (const other of others) {
      await addName(other.name, false)
    }
    await addName(stays.name, false)
    for (const alias of entry.aliases) {
      await addName(alias, true)
    }
  }

  return events
}

/**
 * Gives each row the club of its `opponent`, found or made by name. For tests and the seed,
 * where there is no article to go by.
 */
export async function withClubs(db: ClubDatabase, rows: NewMatchWithoutClub[]): Promise<NewMatch[]> {
  const book = await createClubBook(db)
  const result: NewMatch[] = []

  for (const row of rows) {
    result.push({ ...row, clubId: (await book.resolve({ name: row.opponent, page: null })).id })
  }

  return result
}

/** The listed names, normalised, and the entry each belongs to. */
function listedNames(fullNames: readonly ClubFullName[]): Map<string, ClubFullName> {
  const listed = new Map<string, ClubFullName>()

  for (const entry of fullNames) {
    for (const name of [entry.name, ...entry.aliases]) {
      const key = normaliseClubName(name)

      if (listed.has(key) && listed.get(key) !== entry) {
        throw new Error(`The name '${name}' is in the list of full names twice`)
      }
      listed.set(key, entry)
    }
  }

  return listed
}
