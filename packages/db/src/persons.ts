import { asc, eq } from 'drizzle-orm'

import type { Database } from './client.ts'

import { personPages, persons } from './schema.ts'

/** What came of the book: the persons and the titles it added to the database. */
export type PersonBookCounts = { people: number; titles: number }

/** What the book of persons reads and writes through. */
type PersonDatabase = Pick<Database, 'insert' | 'select'>

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
