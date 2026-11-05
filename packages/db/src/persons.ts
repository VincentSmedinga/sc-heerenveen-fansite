import { asc, eq } from 'drizzle-orm'

import type { Database } from './client.ts'

import { type PersonNameSource, personPages, persons } from './schema.ts'

/** What came of the book: the persons and the titles it added to the database. */
export type PersonBookCounts = { people: number; titles: number }

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

/** What the book of persons reads and writes through. */
type PersonDatabase = Pick<Database, 'insert' | 'select'>

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

/**
 * Every person with the source of his name: null while he has none. The importer asks about
 * the articles of the persons without a name, and puts the names of its list on the rest.
 */
export async function personNamesBySource(db: Pick<Database, 'select'>): Promise<Map<string, null | PersonNameSource>> {
  const rows = await db.select({ page: persons.wikipediaPage, source: persons.nameSource }).from(persons)

  return new Map(rows.map((row) => [row.page, row.source]))
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
