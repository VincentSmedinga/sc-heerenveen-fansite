import { and, asc, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import { type Person, persons, personSlugLength, personSlugs, players } from './schema.ts'
import { foldLetters } from './slug-letters.ts'

/** A person with a page, as `findPlayerBySlug` finds him. */
export type PlayerBySlug = { person: Person; slug: string }

/** What `updatePlayerAddresses` reads and writes through: the connection or a transaction. */
type SlugDatabase = Pick<Database, 'insert' | 'select' | 'update'>

/**
 * Finds the person of a slug, of now or old, who has a page: a person with a row in `players`.
 * `slug` is his slug of now, so the page can lead an old address there.
 */
export async function findPlayerBySlug(db: Pick<Database, 'select'>, slug: string): Promise<PlayerBySlug | undefined> {
  if (!isPlayerSlug(slug)) {
    return undefined
  }

  const [row] = await db
    .select({ person: persons })
    .from(personSlugs)
    .innerJoin(persons, eq(persons.id, personSlugs.personId))
    .where(and(eq(personSlugs.slug, slug), isNotNull(persons.slug), hasPlayer()))

  return row === undefined || row.person.slug === null ? undefined : { person: row.person, slug: row.person.slug }
}

/**
 * The addresses below `/spelers` that are pages of their own, so no player has one as slug:
 * the figures of the players (`cijfers`, #1218), the form that chooses a season (`kies`), the
 * overview of all players (`overzicht`, #1138) and the search for a player (`zoeken`, #1130).
 */
export const reservedPlayerSlugs: readonly string[] = ['cijfers', 'kies', 'overzicht', 'zoeken']

/**
 * Whether a slug can be the address of a player: `/spelers/kies` is the form that chooses a
 * season, and `/spelers/2025-26` is a season, so a slug is never one of those.
 */
export function isPlayerSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/u.test(slug) && !reservedPlayerSlugs.includes(slug) && !/^\d{4}-\d{2}$/u.test(slug)
}

/** The country of a Vietnamese person: his đ is a d, as in Đức, where "dj" would be wrong. */
const vietnam = 'VN'

export { lostLetters, slugLetters } from './slug-letters.ts'

/**
 * The slug a name gives before it is checked against the slugs that exist: lowercase letters,
 * digits and single hyphens, without the accents, dots and apostrophes (`Jan de Vries` gives
 * `jan-de-vries`). Letters without a loose accent are written out (see `slugLetters`). An empty
 * result is `''`, which is never a slug.
 */
export function personSlug(name: string, country?: null | string): string {
  return foldLetters(name, { đ: country === vietnam ? 'd' : 'dj' })
    .replace(/[.'’]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, personSlugLength - 12)
    .replace(/-+$/u, '')
}

/** The slugs of now of every person with a page, for the sitemap. */
export async function playerSlugs(db: Pick<Database, 'select'>): Promise<string[]> {
  const rows = await db
    .select({ slug: persons.slug })
    .from(persons)
    .where(and(isNotNull(persons.slug), hasPlayer()))
    .orderBy(asc(persons.slug))

  return rows.flatMap((row) => (row.slug === null ? [] : [row.slug]))
}

/**
 * Gives every person with a row in `players` the slug of his name, and remembers every slug in
 * `person_slugs`, so an old address keeps working (#1079). The rules:
 *
 * - The name is `persons.name`, or without one the name of his newest row in `players`.
 * - A person keeps his slug of now while it still fits his name, so an address does not move
 *   because another person came.
 * - Otherwise he gets the first of his name, his name with his year of birth, and his name with
 *   his number that no other person has, now or before, and that is no season and no
 *   reserved address (`reservedPlayerSlugs`).
 *   The persons go by number, so of two persons with one name the lower number gets the name.
 *
 * It changes nothing when everything fits, so it can run as often as it likes: when the site
 * starts, after each import and after the editors change a player. Returns how many persons got
 * a new slug.
 */
export async function updatePlayerAddresses(db: SlugDatabase): Promise<number> {
  const rows = await db
    .select({
      birthDate: persons.birthDate,
      country: persons.country,
      current: persons.slug,
      id: persons.id,
      name: persons.name,
      playerName: players.name,
    })
    .from(persons)
    .innerJoin(players, eq(players.personId, persons.id))
    .orderBy(asc(persons.id), desc(players.season), desc(players.id))
  const held = new Map((await db.select().from(personSlugs)).map((row) => [row.slug, row.personId] as [string, number]))
  const seen = new Set<number>()
  let changed = 0

  for (const row of rows) {
    // The first row of a person is his newest season.
    if (seen.has(row.id)) {
      continue
    }

    seen.add(row.id)

    const base = personSlug(row.name ?? row.playerName, row.country)
    const year = row.birthDate?.slice(0, 4)
    const candidates = [
      base,
      year === undefined ? '' : `${base}-${year}`,
      `${base === '' ? 'speler' : base}-${row.id}`,
    ].filter((slug) => slug !== '' && isPlayerSlug(slug))
    const free = (slug: string) => (held.get(slug) ?? row.id) === row.id

    if (row.current !== null && candidates.includes(row.current) && free(row.current)) {
      continue
    }

    const slug = candidates.find(free)

    if (slug === undefined) {
      continue
    }

    await db.insert(personSlugs).values({ personId: row.id, slug }).onDuplicateKeyUpdate({ set: { slug } })
    await db.update(persons).set({ slug }).where(eq(persons.id, row.id))
    held.set(slug, row.id)
    changed += 1
  }

  return changed
}

/** Whether the person has a row in `players`: only those have a page. */
function hasPlayer() {
  return sql`exists (select 1 from ${players} where ${players.personId} = ${persons.id})`
}

/** The most players `searchPlayers` gives back. */
export const maxFoundPlayers = 10

/** A player the search found: the name as the importer kept it, his line and his seasons. */
export type FoundPlayer = {
  familyName: null | string
  familyNamePrefix: null | string
  givenName: null | string
  id: number
  line: null | string
  name: null | string
  /** His seasons with us, oldest first, such as `2019/20`. */
  seasons: string[]
  slug: string
}

/**
 * Finds the players whose name has every word, as a part of a word (#1130). The words go
 * against the slug of a person and his old slugs (`person_slugs`), the way the slug is written:
 * lowercase, without accents, with hyphens between the parts, so `Džeko` and `Dzeko` find the
 * same
 * person and so does an old spelling of his name. Only a person with a slug counts. They are
 * put in order by family name and then given name, and `limit` of them come back with how
 * many there are in all. A word without a letter or digit finds nobody. The words are plain
 * text and no pattern. It is `LIKE`, without an index: the list of people is small.
 */
export async function searchPlayers(
  db: Pick<Database, 'select'>,
  { limit = maxFoundPlayers, words }: { limit?: number; words: string[] },
): Promise<{ players: FoundPlayer[]; total: number }> {
  const conditions = words.map((word) => {
    const patterns = slugPatterns(word)

    return patterns.length === 0
      ? sql`false`
      : or(
          ...patterns.flatMap((pattern) => [
            sql`${persons.slug} like ${pattern} escape '|'`,
            sql`exists (select 1 from ${personSlugs} where ${personSlugs.personId} = ${persons.id} and ${personSlugs.slug} like ${pattern} escape '|')`,
          ]),
        )
  })
  const found = await db
    .select({
      familyName: persons.familyName,
      familyNamePrefix: persons.familyNamePrefix,
      givenName: persons.givenName,
      id: persons.id,
      line: persons.line,
      name: persons.name,
      slug: persons.slug,
      total: sql<number>`count(*) over ()`.as('total'),
    })
    .from(persons)
    .where(and(isNotNull(persons.slug), ...conditions))
    .orderBy(
      asc(sql`coalesce(nullif(${persons.familyName}, ''), nullif(${persons.givenName}, ''), ${persons.name})`),
      asc(persons.givenName),
      asc(persons.id),
    )
    .limit(limit)
  const seasons =
    found.length === 0
      ? []
      : await db
          .select({ personId: players.personId, season: players.season })
          .from(players)
          .where(
            inArray(
              players.personId,
              found.map((row) => row.id),
            ),
          )

  return {
    players: found.flatMap((row) =>
      row.slug === null
        ? []
        : [
            {
              familyName: row.familyName,
              familyNamePrefix: row.familyNamePrefix,
              givenName: row.givenName,
              id: row.id,
              line: row.line,
              name: row.name,
              seasons: [
                ...new Set(seasons.filter((season) => season.personId === row.id).map((season) => season.season)),
              ].sort(),
              slug: row.slug,
            },
          ],
    ),
    total: Number(found[0]?.total ?? 0),
  }
}

/**
 * The patterns of a word of a search against a slug: the word as it would be written in an
 * address (accents and dots gone, anything else a hyphen, the ends trimmed), with `%`, `_` and
 * `|` made ordinary like `hasWords` does for the news. A đ is a `dj` and, for the Vietnamese
 * spelling, a `d`, so a word with one has two patterns. Empty for a word with no letter or
 * digit.
 */
function slugPatterns(word: string): string[] {
  const spellings = new Set(
    [{ đ: 'dj' }, { đ: 'd' }].map((overrides) =>
      foldLetters(word, overrides)
        .replace(/[.'’]/gu, '')
        .replace(/[^a-z0-9]+/gu, '-')
        .replace(/^-+|-+$/gu, ''),
    ),
  )

  return [...spellings]
    .filter((spelling) => spelling !== '')
    .map((spelling) => `%${spelling.replaceAll(/[%_|]/gu, '|$&')}%`)
}
