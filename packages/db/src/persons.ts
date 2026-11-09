import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import {
  type BirthDatePrecision,
  type PersonLineSource,
  type PersonNameSource,
  personNationalities,
  personPages,
  personPositions,
  persons,
  type PlayerPosition,
  players,
  wikidataItems,
} from './schema.ts'

/** What came of the book: the persons and the titles it added to the database. */
export type PersonBookCounts = { people: number; titles: number }

/** What the importer reads from Wikidata about one person (#898). Everything may be empty. */
export type PersonData = {
  birthDate: null | { date: string; precision: BirthDatePrecision }
  /** The Q-number of the birth place. Its label is in `wikidata_items`. */
  birthPlaceId: null | string
  line: null | { line: PlayerPosition; source: PersonLineSource }
  /** The Q-numbers of the countries, in the order of Wikidata. */
  nationalityIds: readonly string[]
  /** The Q-numbers of the positions, in the order of Wikidata. */
  positionIds: readonly string[]
  wikidataId: null | string
  wikipediaPageId: null | number
}

/**
 * How many persons have what the importer reads from Wikidata, for `pnpm run import:status`.
 */
export type PersonDataCounts = {
  /** With a birth date. */
  birthDate: number
  /** With each line, whatever its source. */
  byLine: Record<PlayerPosition, number>
  lines: Record<PersonLineSource, number>
  /** With at least one nationality. */
  nationality: number
  /** Without a line. */
  noLine: number
  /** Read from Wikidata, or tried and found nothing. */
  read: number
  total: number
  /** With a Q-number. */
  wikidataId: number
}

/** The name of a person in parts, as the importer stores it (see `storePersonNames`). */
export type PersonName = {
  familyName: string
  familyNamePrefix: null | string
  givenName: null | string
  /** The parts with a space between them. */
  name: string
  source: PersonNameSource
}

/** How many names `storePersonNames` stored, by where they came from. */
export type PersonNameCounts = Record<PersonNameSource, number>

/** A person the importer has not read from Wikidata yet, with what an earlier try left. */
export type PersonToRead = {
  id: number
  /** The Q-number, when an earlier run found it but could not read the item. */
  wikidataId: null | string
  wikipediaPage: string
  wikipediaPageId: null | number
}

/** What the book of persons reads and writes through. */
type PersonDatabase = Pick<Database, 'insert' | 'select'>

/**
 * Applies the lines of the list `personLines` (by the title of the article): a person whose
 * line is not that of the list yet gets it, with the source `manual`. It asks nothing and
 * returns how many persons changed, so a second run changes none.
 */
export async function applyManualLines(
  db: Pick<Database, 'select' | 'update'>,
  lines: ReadonlyMap<string, PlayerPosition>,
): Promise<number> {
  if (lines.size === 0) {
    return 0
  }

  const rows = await db
    .select({ line: persons.line, lineSource: persons.lineSource, title: persons.wikipediaPage })
    .from(persons)
    .where(inArray(persons.wikipediaPage, [...lines.keys()]))
  let changed = 0

  for (const row of rows) {
    const line = lines.get(row.title)

    if (line !== undefined && (row.line !== line || row.lineSource !== 'manual')) {
      await db.update(persons).set({ line, lineSource: 'manual' }).where(eq(persons.wikipediaPage, row.title))
      changed++
    }
  }

  return changed
}

/** How many persons have what Wikidata gives, and where their line comes from. */
export async function countPersonData(db: Pick<Database, 'select'>): Promise<PersonDataCounts> {
  const counts: PersonDataCounts = {
    birthDate: 0,
    byLine: { aanvaller: 0, doelman: 0, middenvelder: 0, verdediger: 0 },
    lines: { manual: 0, squad: 0, wikidata: 0 },
    nationality: 0,
    noLine: 0,
    read: 0,
    total: 0,
    wikidataId: 0,
  }
  const withNationality = new Set(
    (await db.select({ id: personNationalities.personId }).from(personNationalities)).map((row) => row.id),
  )

  for (const row of await db
    .select({
      birthDate: persons.birthDate,
      id: persons.id,
      line: persons.line,
      lineSource: persons.lineSource,
      readAt: persons.wikidataReadAt,
      wikidataId: persons.wikidataId,
    })
    .from(persons)) {
    counts.total++
    counts.read += row.readAt === null ? 0 : 1
    counts.wikidataId += row.wikidataId === null ? 0 : 1
    counts.birthDate += row.birthDate === null ? 0 : 1
    counts.nationality += withNationality.has(row.id) ? 1 : 0

    if (row.lineSource === null) {
      counts.noLine++
    } else {
      counts.lines[row.lineSource]++
    }
    if (row.line !== null) {
      counts.byLine[row.line]++
    }
  }

  return counts
}

/** How many persons have a name, by where it came from, and how many have none. */
export async function countPersonNames(db: Pick<Database, 'select'>): Promise<PersonNameCounts & { none: number }> {
  const counts = { guess: 0, manual: 0, none: 0, sort_key: 0 }

  for (const source of (await personNamesBySource(db)).values()) {
    counts[source ?? 'none']++
  }

  return counts
}

/**
 * Finds or makes the person of a Wikipedia title, writing through `db` (use the transaction of
 * the import). One person is one article, so two titles that redirect to the same article are
 * the same person (`Alfred Finnbogason` and `Alfreð Finnbogason`).
 *
 * The book does not ask Wikipedia: the importer does, once for each title the database does
 * not know (`knownPersonPages`), and gives the answers as `redirects`, from each title it asked
 * about, redirects on the way included, to the title of the article they end in (the title
 * itself when it is no redirect, and also when it has no article at all). `aliases` maps a
 * title to the title of the person it is the same as, for two titles that no redirect joins
 * (see `personTitleAliases` in the importer); it goes first.
 *
 * `resolve(title)` gives the `id` of the person and remembers every title on the way in
 * `person_pages`, so the next run needs no answer. It gives null for a title that is not in the
 * database and not in `redirects`: nobody could ask about it, so it is not remembered, and the
 * goal or player waits for a later run.
 */
export async function createPersonBook(
  db: PersonDatabase,
  {
    aliases = new Map(),
    redirects = new Map(),
  }: { aliases?: ReadonlyMap<string, string>; redirects?: ReadonlyMap<string, string> } = {},
) {
  /** Every title in `person_pages`. */
  const byPage = new Map<string, number>()
  /** The title of the article of every person. */
  const byArticle = new Map<string, number>()
  const counts: PersonBookCounts = { people: 0, titles: 0 }

  for (const row of await db.select().from(persons).orderBy(asc(persons.id))) {
    byArticle.set(row.wikipediaPage, row.id)
  }
  for (const row of await db.select().from(personPages)) {
    byPage.set(row.page, row.personId)
  }

  async function remember(title: string, id: number): Promise<void> {
    if (!byPage.has(title)) {
      await db.insert(personPages).values({ page: title, personId: id })
      byPage.set(title, id)
      counts.titles++
    }
  }

  return {
    counts,
    async resolve(title: string): Promise<null | number> {
      const known = byPage.get(title)

      if (known !== undefined) {
        return known
      }

      const listed = aliases.get(title) ?? title
      const ofListed = byPage.get(listed)

      if (ofListed !== undefined) {
        await remember(title, ofListed)

        return ofListed
      }

      const article = redirects.get(listed)

      if (article === undefined) {
        return null
      }

      let id = byArticle.get(article) ?? byPage.get(article)

      if (id === undefined) {
        const [{ insertId }] = await db.insert(persons).values({ wikipediaPage: article })

        id = insertId
        byArticle.set(article, id)
        counts.people++
      }

      for (const one of new Set([article, listed, title])) {
        await remember(one, id)
      }

      return id
    },
  }
}

/**
 * Every title the database knows as the article of a person: the rows of `person_pages`, which
 * has the title of every article too. The importer asks Wikipedia about a title that is not
 * here, and about no other.
 */
export async function knownPersonPages(db: Pick<Database, 'select'>): Promise<Set<string>> {
  return new Set((await db.select({ page: personPages.page }).from(personPages)).map((row) => row.page))
}

/** The labels the database has, by Q-number. The importer never asks again about these. */
export async function knownWikidataLabels(db: Pick<Database, 'select'>): Promise<Map<string, string>> {
  return new Map((await db.select().from(wikidataItems)).map((row) => [row.id, row.label]))
}

/**
 * Every person with the source of his name: null while he has none. The importer asks about
 * the articles of the persons without a name, and puts the names of its list on the rest.
 */
export async function personNamesBySource(db: Pick<Database, 'select'>): Promise<Map<string, null | PersonNameSource>> {
  const rows = await db.select({ page: persons.wikipediaPage, source: persons.nameSource }).from(persons)

  return new Map(rows.map((row) => [row.page, row.source]))
}

/** The Q-numbers that persons have, with the title of the person, for the unique key. */
export async function personsByWikidataId(db: Pick<Database, 'select'>): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: persons.wikidataId, title: persons.wikipediaPage })
    .from(persons)
    .where(isNotNull(persons.wikidataId))

  return new Map(rows.flatMap((row) => (row.id === null ? [] : [[row.id, row.title] as const])))
}

/** The persons not read from Wikidata yet, the oldest first, at most `limit`. */
export async function personsToRead(db: Pick<Database, 'select'>, limit: number): Promise<PersonToRead[]> {
  return db
    .select({
      id: persons.id,
      wikidataId: persons.wikidataId,
      wikipediaPage: persons.wikipediaPage,
      wikipediaPageId: persons.wikipediaPageId,
    })
    .from(persons)
    .where(isNull(persons.wikidataReadAt))
    .orderBy(asc(persons.id))
    .limit(limit)
}

/**
 * The titles in `person_pages` with the article of their person (`Alfred Finnbogason` with
 * `Alfreð Finnbogason`), which is where a redirect to a remembered title ends.
 */
export async function rememberedPersonArticles(db: Pick<Database, 'select'>): Promise<Map<string, string>> {
  const rows = await db
    .select({ article: persons.wikipediaPage, page: personPages.page })
    .from(personPages)
    .innerJoin(persons, eq(persons.id, personPages.personId))

  return new Map(rows.map((row) => [row.page, row.article]))
}

/**
 * Keeps the Q-number and the page number of a person whose item could not be read, so the next
 * run asks for the item only. The person stays unread.
 */
export async function rememberWikidataId(
  db: Pick<Database, 'update'>,
  personId: number,
  wikidataId: string,
  wikipediaPageId: null | number,
): Promise<void> {
  await db.update(persons).set({ wikidataId, wikipediaPageId }).where(eq(persons.id, personId))
}

/**
 * The persons whose titles are the same without accents, capitals, hyphens, spaces and
 * apostrophes, the addition between brackets included (`Johnny Jansen (1952)` and `(1975)` are
 * not alike). Each group lists the titles of the persons, in the order of their `id`. The
 * import warns about them and merges nothing: two players can have the same name. Join them
 * with `personTitleAliases` when they are one person.
 */
export async function similarPersons(db: Pick<Database, 'select'>): Promise<string[][]> {
  const groups = new Map<string, string[]>()

  for (const { wikipediaPage } of await db.select().from(persons).orderBy(asc(persons.id))) {
    const key = normalisePersonTitle(wikipediaPage)

    groups.set(key, [...(groups.get(key) ?? []), wikipediaPage])
  }

  return [...groups.values()].filter((titles) => titles.length > 1)
}

/**
 * The line that the squad lists give a person: the one that stands most often in his rows of
 * `players`, and for a tie the one of the latest season. A person with no row with a position
 * is not in the map.
 */
export async function squadLines(
  db: Pick<Database, 'select'>,
  personIds: readonly number[],
): Promise<Map<number, PlayerPosition>> {
  const lines = new Map<number, PlayerPosition>()

  if (personIds.length === 0) {
    return lines
  }

  const rows = await db
    .select({
      n: sql<number>`count(*)`,
      personId: players.personId,
      position: players.position,
      season: sql<string>`max(${players.season})`,
    })
    .from(players)
    .where(and(inArray(players.personId, [...personIds]), isNotNull(players.position)))
    .groupBy(players.personId, players.position)
  const best = new Map<number, { count: number; position: PlayerPosition; season: string }>()

  for (const row of rows) {
    if (row.personId === null || row.position === null) {
      continue
    }

    const count = Number(row.n)
    const current = best.get(row.personId)

    if (current === undefined || count > current.count || (count === current.count && row.season > current.season)) {
      best.set(row.personId, { count, position: row.position, season: row.season })
    }
  }
  for (const [id, { position }] of best) {
    lines.set(id, position)
  }

  return lines
}

/**
 * Writes what Wikidata gave about a person and marks him read at `readAt`. The nationalities
 * and positions replace what was there. Every Q-number must be in `wikidata_items`
 * (`storeWikidataLabel`). Use the transaction of the import, so a person is stored whole or not
 * at all.
 */
export async function storePersonData(
  db: Pick<Database, 'delete' | 'insert' | 'update'>,
  personId: number,
  data: PersonData,
  readAt: Date,
): Promise<void> {
  await db
    .update(persons)
    .set({
      birthDate: data.birthDate?.date ?? null,
      birthDatePrecision: data.birthDate?.precision ?? null,
      birthPlaceId: data.birthPlaceId,
      line: data.line?.line ?? null,
      lineSource: data.line?.source ?? null,
      wikidataId: data.wikidataId,
      wikidataReadAt: readAt,
      wikipediaPageId: data.wikipediaPageId,
    })
    .where(eq(persons.id, personId))
  await db.delete(personNationalities).where(eq(personNationalities.personId, personId))
  await db.delete(personPositions).where(eq(personPositions.personId, personId))

  if (data.nationalityIds.length > 0) {
    await db
      .insert(personNationalities)
      .values(data.nationalityIds.map((itemId, position) => ({ itemId, personId, position })))
  }
  if (data.positionIds.length > 0) {
    await db
      .insert(personPositions)
      .values(data.positionIds.map((itemId, position) => ({ itemId, personId, position })))
  }
}

/**
 * Stores the names, by the title of the article of the person. A person keeps the name he has,
 * except that a name from the list (`manual`) goes before every other and is never replaced.
 * An article that is not in `persons` is skipped. Returns how many names it stored, by source,
 * and the titles whose name it guessed, so the run can warn about them.
 */
export async function storePersonNames(
  db: Pick<Database, 'select' | 'update'>,
  names: ReadonlyMap<string, PersonName>,
): Promise<{ counts: PersonNameCounts; guessed: { name: PersonName; title: string }[] }> {
  const counts: PersonNameCounts = { guess: 0, manual: 0, sort_key: 0 }
  const guessed: { name: PersonName; title: string }[] = []
  const current = await personNamesBySource(db)

  for (const [title, name] of names) {
    if (!current.has(title)) {
      continue
    }

    const had = current.get(title) ?? null

    if (had === 'manual' || (had !== null && name.source !== 'manual')) {
      continue
    }

    await db
      .update(persons)
      .set({
        familyName: name.familyName,
        familyNamePrefix: name.familyNamePrefix,
        givenName: name.givenName,
        name: name.name,
        nameSource: name.source,
      })
      .where(eq(persons.wikipediaPage, title))
    counts[name.source]++

    if (name.source === 'guess') {
      guessed.push({ name, title })
    }
  }

  return { counts, guessed }
}

/** Keeps the label of an item. A label that is there stays: the importer asks once. */
export async function storeWikidataLabel(db: Pick<Database, 'insert'>, id: string, label: string): Promise<void> {
  await db
    .insert(wikidataItems)
    .values({ id, label })
    .onDuplicateKeyUpdate({ set: { id: sql`id` } })
}

/** A title as a computer compares it: no accents, capitals, hyphens, spaces or apostrophes. */
function normalisePersonTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}
