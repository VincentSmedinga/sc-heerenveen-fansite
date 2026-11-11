import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import { type Person, persons, personSlugLength, personSlugs, players } from './schema.ts'

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
 * Whether a slug can be the address of a player: `/spelers/kies` is the form that chooses a
 * season, and `/spelers/2025-26` is a season, so a slug is never one of those.
 */
export function isPlayerSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/u.test(slug) && slug !== 'kies' && !/^\d{4}-\d{2}$/u.test(slug)
}

/**
 * The letters without a loose accent, which `normalize('NFKD')` leaves as they are (#1113),
 * and what they give in an address. The list is here and nowhere else; `lostLetters` fails a
 * test when a name has a letter that is neither in this list nor an ASCII letter with accents.
 */
export const slugLetters: Readonly<Record<string, string>> = {
  æ: 'ae',
  đ: 'dj',
  ð: 'd',
  ı: 'i',
  ł: 'l',
  ø: 'o',
  œ: 'oe',
  ß: 'ss',
  þ: 'th',
}

const slugLetterPattern = new RegExp(`[${Object.keys(slugLetters).join('')}]`, 'gu')

/** The country of a Vietnamese person: his đ is a d, as in Đức, where "dj" would be wrong. */
const vietnam = 'VN'

/**
 * The letters of a name that give nothing in an address, so a name does not lose one without us
 * noticing (#1113): a letter that is not ASCII after the accents and the letters of
 * `slugLetters` are dealt with. Empty for a name that keeps all its letters.
 */
export function lostLetters(name: string): string[] {
  return [...foldedName(name, null)].filter((letter) => /\p{L}/u.test(letter) && !/[a-z]/u.test(letter))
}

/**
 * The slug a name gives before it is checked against the slugs that exist: lowercase letters,
 * digits and single hyphens, without the accents, dots and apostrophes (`Jan de Vries` gives
 * `jan-de-vries`). Letters without a loose accent are written out (see `slugLetters`). An empty
 * result is `''`, which is never a slug.
 */
export function personSlug(name: string, country?: null | string): string {
  return foldedName(name, country)
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
 *   his number that no other person has, now or before, and that is no season and not `kies`.
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

/**
 * The name in lowercase, without accents and with the letters of `slugLetters` written out: the
 * part of `personSlug` that decides what a letter gives. `country` is the code of
 * the country of the person (`persons.country`): for a Vietnamese đ is "d", and for everyone
 * else, also a person whose country we do not know, it is "dj".
 */
function foldedName(name: string, country: null | string | undefined): string {
  const letters: Record<string, string> = { ...slugLetters, đ: country === vietnam ? 'd' : 'dj' }

  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(slugLetterPattern, (letter) => letters[letter] ?? letter)
}

/** Whether the person has a row in `players`: only those have a page. */
function hasPlayer() {
  return sql`exists (select 1 from ${players} where ${players.personId} = ${persons.id})`
}
