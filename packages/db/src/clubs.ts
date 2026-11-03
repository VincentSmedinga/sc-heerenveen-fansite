import { and, asc, eq, inArray, isNotNull, isNull, max, sql } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { NewMatch } from './schema.ts'

import { clubNames, clubPages, clubs, matches } from './schema.ts'

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

/** What `repairClubPages` writes through: it moves rows and deletes the club that goes away. */
type PagesDatabase = Pick<Database, 'transaction'> & RepairDatabase

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
 * - a name with an article goes to the club with that article, after any redirects (see
 *   below). When no club has it, the club with that name takes the article if it has none yet
 *   (a club the migration made from a name alone); otherwise a new club is made.
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
 *
 * A title that is a redirect on Wikipedia is the article it redirects to, so it is the same
 * club (`AZ Alkmaar` is `AZ (voetbalclub)`). The book does not ask Wikipedia: the importer
 * does,
 * once for each title the database does not know (`knownClubPages`), and gives the answers as
 * `redirects`, from each title it asked about, redirects on the way included, to the title of
 * the article it ends in (the title itself when it is no redirect). The book then looks for the
 * club of that article, and remembers both titles in `club_pages`, so the next run needs no
 * answer. A title that is in neither the database nor `redirects` is taken as its own article,
 * as before, and is not remembered: nobody checked it. Run `repairClubPages` first when the
 * database may hold a club under a title that is a redirect.
 */
export async function createClubBook(
  db: ClubDatabase,
  {
    fullNames = [],
    redirects = new Map(),
  }: { fullNames?: readonly ClubFullName[]; redirects?: ReadonlyMap<string, string> } = {},
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
  /** The titles that are in `club_pages`. */
  const remembered = new Set<string>()
  const slugs = new Set(rows.map((row) => row.slug))

  for (const club of known.values()) {
    if (club.wikipediaPage !== null) {
      byPage.set(club.wikipediaPage, club)
    }
    if (!byName.has(normaliseClubName(club.name))) {
      byName.set(normaliseClubName(club.name), club)
    }
  }
  for (const row of await db.select().from(clubPages)) {
    const club = known.get(row.clubId)

    if (club !== undefined) {
      byPage.set(row.page, club)
      remembered.add(row.page)
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

  /** Puts a title that was checked in `club_pages`, unless it is there or is another club's. */
  async function remember(title: string, club: KnownClub): Promise<boolean> {
    if (remembered.has(title) || (byPage.get(title) ?? club) !== club) {
      return false
    }

    await db.insert(clubPages).values({ clubId: club.id, page: title })
    remembered.add(title)
    byPage.set(title, club)

    return true
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
      // The article the title ends in: a title the book knows is its own article.
      const article = page === null || byPage.has(page) ? page : (redirects.get(page) ?? page)
      let club = article === null ? byName.get(key) : byPage.get(article)

      if (club === undefined && article !== null) {
        const named = byName.get(key)

        if (named !== undefined && named.wikipediaPage === null) {
          club = named
          club.wikipediaPage = article
          byPage.set(article, club)
          await db.update(clubs).set({ wikipediaPage: article }).where(eq(clubs.id, club.id))
          events.push(`article '${article}' for club '${club.name}'`)
        }
      }
      if (club === undefined) {
        club = await create(name, article, season ?? null, events)
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
      if (page !== null && article !== null && redirects.has(page)) {
        const isNew = !remembered.has(page)

        await remember(page, club)
        await remember(article, club)
        if (isNew && article !== page) {
          events.push(`title '${page}' is a redirect to '${article}', the article of club '${club.name}'`)
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
 * Every title the database knows as the article of a club: the `wikipedia_page` of the clubs
 * and the rows of `club_pages`. The importer asks Wikipedia about a title that is not here, and
 * about no other.
 */
export async function knownClubPages(db: Pick<Database, 'select'>): Promise<Set<string>> {
  const own = await db.select({ page: clubs.wikipediaPage }).from(clubs).where(isNotNull(clubs.wikipediaPage))
  const remembered = await db.select({ page: clubPages.page }).from(clubPages)

  return new Set([...own, ...remembered].flatMap((row) => (row.page === null ? [] : [row.page])))
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
 * The titles in `club_pages` with the article of their club (`AZ Alkmaar` with
 * `AZ (voetbalclub)`), which is where a redirect to a remembered title ends.
 */
export async function rememberedClubArticles(db: Pick<Database, 'select'>): Promise<Map<string, string>> {
  const rows = await db
    .select({ article: clubs.wikipediaPage, page: clubPages.page })
    .from(clubPages)
    .innerJoin(clubs, eq(clubs.id, clubPages.clubId))
    .where(isNotNull(clubs.wikipediaPage))

  return new Map(rows.flatMap((row) => (row.article === null ? [] : [[row.page, row.article] as const])))
}

/**
 * Makes the clubs right that are in the database under a title that is a redirect on
 * Wikipedia, with the answers the importer got for `unrememberedClubPages`: `redirects` maps
 * each title it asked about, redirects on the way included, to the title of the article the
 * redirects end in (the title itself when it is none). One club is one article, so the clubs
 * that end in the same article are one club.
 *
 * For each article, in a transaction of its own:
 *
 * - the club that stays is the one that has the article, else the one with the most matches,
 *   else the oldest, as `repairClubs` does. A club that has the article but is not in a
 *   redirect still stays: it is the article.
 * - the matches and the other names of the other clubs go to the club that stays, their names
 *   become other names of it unless that name is its own or belongs to another club, and their
 *   rows go. The club that stays keeps its slug and its name.
 * - the club that stays gets the article as its `wikipedia_page` when it had a redirect, and
 *   every title that ends in the article goes in `club_pages`, the article itself too.
 *
 * Two clubs that have an article each, and that is not a redirect, are not in one group and so
 * stay two clubs. A title not in `redirects` is left alone, and a club that is right already
 * changes nothing, so running it again writes nothing and gives no events. The events are lines
 * for the log of the run, in English, with no personal data.
 */
export async function repairClubPages(db: PagesDatabase, redirects: ReadonlyMap<string, string>): Promise<string[]> {
  const events: string[] = []
  const articles = new Set<string>()

  for (const title of await unrememberedClubPages(db)) {
    const article = redirects.get(title)

    if (article !== undefined) {
      articles.add(article)
    }
  }

  for (const article of articles) {
    const titles = [
      ...new Set([article, ...[...redirects].filter(([, end]) => end === article).map(([title]) => title)]),
    ]

    events.push(...(await db.transaction((transaction) => repairArticle(transaction, article, titles))))
  }

  return events
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
 * The titles of clubs that nobody checked yet: the article of a club that is not in
 * `club_pages`, oldest club first. Once `repairClubPages` has run, it is empty until the
 * importer makes a club, which it remembers itself.
 */
export async function unrememberedClubPages(db: Pick<Database, 'select'>): Promise<string[]> {
  const rows = await db
    .select({ page: clubs.wikipediaPage })
    .from(clubs)
    .leftJoin(clubPages, eq(clubPages.page, clubs.wikipediaPage))
    .where(and(isNotNull(clubs.wikipediaPage), isNull(clubPages.page)))
    .orderBy(asc(clubs.id))

  return rows.flatMap((row) => (row.page === null ? [] : [row.page]))
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

/** One article of `repairClubPages`: the clubs under `titles` become one, in a transaction. */
async function repairArticle(db: RepairDatabase, article: string, titles: readonly string[]): Promise<string[]> {
  const events: string[] = []
  const remembered = await db
    .select()
    .from(clubPages)
    .where(inArray(clubPages.page, [...titles]))
  const own = await db
    .select()
    .from(clubs)
    .where(inArray(clubs.wikipediaPage, [...titles]))
  const owner =
    own.find((club) => club.wikipediaPage === article)?.id ?? remembered.find((row) => row.page === article)?.clubId
  const ids = new Set([...own.map((club) => club.id), ...remembered.map((row) => row.clubId)])

  if (ids.size === 0) {
    return events
  }

  const everyone = await db.select().from(clubs)
  const found = everyone.filter((club) => ids.has(club.id)).sort((a, b) => a.id - b.id)
  const counts = await db
    .select({ clubId: matches.clubId, matches: sql<number>`count(*)`.mapWith(Number) })
    .from(matches)
    .where(inArray(matches.clubId, [...ids]))
    .groupBy(matches.clubId)
  const matchesOf = (id: number) => counts.find((count) => count.clubId === id)?.matches ?? 0
  const [stays] = [...found].sort(
    (a, b) => Number(b.id === owner) - Number(a.id === owner) || matchesOf(b.id) - matchesOf(a.id) || a.id - b.id,
  )

  if (stays === undefined) {
    return events
  }

  const others = found.filter((club) => club.id !== stays.id)
  const names = await db.select().from(clubNames)
  const goneIds = new Set(others.map((club) => club.id))
  // The names the club has once the others are merged in, and those of clubs that stay apart.
  const had = new Set([
    normaliseClubName(stays.name),
    ...names
      .filter((other) => other.clubId === stays.id || goneIds.has(other.clubId))
      .map((other) => normaliseClubName(other.name)),
  ])
  const apart = new Set([
    ...everyone.filter((club) => !ids.has(club.id)).map((club) => normaliseClubName(club.name)),
    ...names.filter((other) => !ids.has(other.clubId)).map((other) => normaliseClubName(other.name)),
  ])

  for (const other of others) {
    await db.update(matches).set({ clubId: stays.id }).where(eq(matches.clubId, other.id))
    await db.update(clubNames).set({ clubId: stays.id }).where(eq(clubNames.clubId, other.id))
    await db.update(clubPages).set({ clubId: stays.id }).where(eq(clubPages.clubId, other.id))
    await db.delete(clubs).where(eq(clubs.id, other.id))
    events.push(`merged club '${other.name}' into club '${stays.name}'`)

    const key = normaliseClubName(other.name)

    if (!had.has(key) && !apart.has(key)) {
      await db.insert(clubNames).values({ clubId: stays.id, name: other.name })
      had.add(key)
    }
  }

  if (stays.wikipediaPage !== article) {
    await db.update(clubs).set({ wikipediaPage: article }).where(eq(clubs.id, stays.id))
    events.push(`article '${article}' for club '${stays.name}'`)
  }

  const inThere = new Set([...remembered.map((row) => row.page)])

  for (const title of titles) {
    if (!inThere.has(title)) {
      await db.insert(clubPages).values({ clubId: stays.id, page: title })
      if (title !== article) {
        events.push(`title '${title}' is a redirect to '${article}', the article of club '${stays.name}'`)
      }
    }
  }

  return events
}
