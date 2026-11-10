import { isCountryCode } from '@fansite/shared/countries'
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { PersonTitleAlias } from './person-merge.ts'

import {
  type BirthDatePrecision,
  type PersonCountrySource,
  type PersonLineSource,
  type PersonNameSource,
  personNationalities,
  personPages,
  personPositions,
  persons,
  playerListTitles,
  type PlayerPosition,
  players,
  wikidataItems,
} from './schema.ts'

/** The name of a person in parts, as the editors fill it in in the admin (issue 1020). */
export type EditorsName = {
  familyName: string
  familyNamePrefix: null | string
  givenName: null | string
}

/** What came of the book: the persons and the titles it added to the database. */
export type PersonBookCounts = { people: number; titles: number }

/** What the importer reads from Wikidata about one person (#898). Everything may be empty. */
export type PersonData = {
  birthDate: null | { date: string; precision: BirthDatePrecision }
  /** The Q-number of the birth place. Its label is in `wikidata_items`. */
  birthPlaceId: null | string
  /** `keep` leaves the line as it is: the one the editors set. */
  line: 'keep' | null | { line: PlayerPosition; source: PersonLineSource }
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
  /** With a country, by where it came from. */
  countries: Record<PersonCountrySource, number>
  lines: Record<PersonLineSource, number>
  /** With at least one nationality. */
  nationality: number
  /** Without a country. */
  noCountry: number
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
  source: ImportedNameSource
}

/** How many names `storePersonNames` stored, by where they came from. */
export type PersonNameCounts = Record<ImportedNameSource, number>

/** A person the importer has not read from Wikidata yet, with what an earlier try left. */
export type PersonToRead = {
  id: number
  /** Where his line came from. `manual` is a line the importer leaves alone. */
  lineSource: null | PersonLineSource
  /** The Q-number, when an earlier run found it but could not read the item. */
  wikidataId: null | string
  wikipediaPage: string
  wikipediaPageId: null | number
}

/** The sources of a name the importer stores: every one but the editors' (`redactie`). */
type ImportedNameSource = Exclude<PersonNameSource, 'redactie'>

/**
 * Names that look alike and are different people, as the owner decided: each group lists the
 * titles of Wikipedia, or the names as the old fansite typed them. `similarPersons` leaves out
 * a group whose titles are all in one group here, and so does the check report of the old
 * fansite (`findOldSiteNameClusters`). They are never merged. The list is here, and not next
 * to `personTitleAliases` in the importer, because the page Kwaliteit of the admin reads it
 * too; the importer exports it from `person-names.ts`.
 */
export const personsWhoDiffer: readonly (readonly string[])[] = [
  ['Brian Tevreden', 'Brian Tevreden II'],
  // Jordy Bruijn (1996) and Jordy Buijs (1988) both played for sc Heerenveen.
  ['Jordy Bruijn', 'Jordy Buijs'],
  ['Ruud Kool', 'Ruud Knol'],
]

/**
 * Names of opponents' scorers in the old seasons that are a namesake of a person of ours
 * (#1054). The step `doelpunten tegen ons` of `import:old-site` links a goal against us to
 * the one person of ours with exactly that name. A name in this list is never linked, and a
 * link that was laid disappears at the next import. The owner reads the list that
 * `import:status` shows after the import, and adds a name here when the man who scored against
 * us is another man.
 *
 * Example: `'Jan Jansen'`.
 */
export const opponentGoalNamesakes: readonly string[] = []

/**
 * Two or more titles of Wikipedia that are one person while no redirect says so, each with the
 * title that stays and the other titles. The importer looks a title up here before it asks
 * Wikipedia: an other title is the person of the title that stays, and costs no request.
 *
 * `Persons:` in the log of the import warns when two persons look alike (`similarPersons`).
 * Add a person here only after you checked that it is one person: two players with the same
 * name are two persons, and their titles differ by the addition between brackets. Two who
 * look alike and are two people go in `personsWhoDiffer`. The redirects on Wikipedia join the
 * other titles we know of.
 *
 * An other title that is a person of its own already is merged into the person of the title
 * that stays, at the start of every import of matches or of a squad (`mergeListedPersons`).
 * The owner decided four on 10 November 2026 (issue 1027), and Filip Đuričić the same day
 * (issue 1036). The same day (issue 1045) he chose the spelling of four players that is no
 * title: Igor Korneev, Radu Gușatu, Arek Radomski and Hjalte Bo Nørregaard. The article stays
 * the title that stays and `personNames` gives the name; the other titles are redirects.
 *
 * Example: `{ aliases: ['Jan Jansen (voetballer)'], title: 'Jan Jansen (voetballer, 1990)' }`.
 */
export const personTitleAliases: readonly PersonTitleAlias[] = [
  { aliases: ['Arek Radomski'], title: 'Arkadiusz Radomski' },
  { aliases: ['Filip Djuričić'], title: 'Filip Đuričić' },
  { aliases: ['Hjalte Norregaard'], title: 'Hjalte Bo Nørregaard' },
  { aliases: ['Igor Korneev'], title: 'Igor Kornejev' },
  { aliases: ['Jan-Harm Schippers'], title: 'Jan Harm Schippers' },
  { aliases: ['Radoslav Samardzic'], title: 'Radoslav Samardžić' },
  { aliases: ['Radu Gusatu'], title: 'Mugur Radu Gușatu' },
  { aliases: ['Robert van der Berg'], title: 'Robert van den Berg' },
  { aliases: ['Ugur Yıldırım'], title: 'Uğur Yıldırım' },
]

/** What `refreshPersonCountries` did: the persons that got a country, by its source. */
export type PersonCountriesRefresh = {
  /** From the first nationality of Wikidata. */
  filled: number
  /** From the first flag in the list of players. */
  list: number
  /** From the country that stands most often on the rows of the squad lists. */
  squad: number
  /** The first nationalities of Wikidata that are not in the list of countries. */
  unknown: { id: string; label: string; persons: number }[]
}

/** A title of the list of players with the country of its first flag, or null. */
export type PlayerListEntry = { country: null | string; title: string }

/**
 * What the list of players of sc Heerenveen says about our persons (issue 1028). It is
 * information: nothing is made, changed or merged from it.
 */
export type PlayerListReport = {
  /** Persons of ours, by title, that are not on the list. */
  notOnList: string[]
  /** Titles of the list that are no person of ours. */
  notOurs: string[]
  /** How many titles the list has. 0 when the import has not read it. */
  read: number
  /** Pairs of our title and the title of the list that differ only in a sign. */
  spelling: [string, string][]
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
    // A person without a title is never in the list, which is by title.
    if (row.title === null) {
      continue
    }

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
    countries: { list: 0, manual: 0, 'old-site': 0, squad: 0, wikidata: 0 },
    lines: { manual: 0, 'old-site': 0, squad: 0, wikidata: 0 },
    nationality: 0,
    noCountry: 0,
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
      countrySource: persons.countrySource,
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

    if (row.countrySource === null) {
      counts.noCountry++
    } else {
      counts.countries[row.countrySource]++
    }
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

/**
 * How many persons with an article have a name, by where it came from (`redactie` is a name
 * the editors filled in), and how many have none.
 */
export async function countPersonNames(
  db: Pick<Database, 'select'>,
): Promise<PersonNameCounts & { none: number; redactie: number }> {
  const counts = { guess: 0, manual: 0, none: 0, redactie: 0, sort_key: 0 }

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

  // A person of the editors without an article has no title, so no title leads to him.
  for (const row of await db.select().from(persons).orderBy(asc(persons.id))) {
    if (row.wikipediaPage !== null) {
      byArticle.set(row.wikipediaPage, row.id)
    }
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
 * Finds or makes the person of a player the editors add or change in the admin (issue 1020),
 * writing through `db` (use the transaction of the change). With a title it is the person of
 * that title, found or made by the book (`createPersonBook`), so a title that belongs to a
 * person never makes a second one. The admin asks Wikipedia nothing: the title is taken as the
 * title of the article. Without a title it makes a person who has only a name.
 *
 * A person it makes gets `name`, with the source `redactie`, and so does a person of the title
 * who had no name yet. A person who had a name keeps it. `created` says whether the person is
 * new.
 */
export async function findOrAddEditorsPerson(
  db: PersonDatabase & Pick<Database, 'update'>,
  { name, page }: { name: EditorsName; page: null | string },
): Promise<{ created: boolean; id: number }> {
  if (page === null) {
    const [{ insertId }] = await db.insert(persons).values(editorsNameColumns(name))

    return { created: true, id: insertId }
  }

  const book = await createPersonBook(db, { redirects: new Map([[page, page]]) })
  const id = await book.resolve(page)

  if (id === null) {
    throw new Error('The book made no person for a title it was given')
  }

  const [person] = await db.select({ nameSource: persons.nameSource }).from(persons).where(eq(persons.id, id))

  if (person?.nameSource === null) {
    await setEditorsName(db, id, name)
  }

  return { created: book.counts.people > 0, id }
}

/**
 * Gives a person without a title the title of his article, and remembers it in `person_pages`,
 * as the book does for a person it makes. Only for a title that belongs to no person yet.
 */
export async function givePersonPage(db: Pick<Database, 'insert' | 'update'>, personId: number, page: string) {
  await db.update(persons).set({ wikipediaPage: page }).where(eq(persons.id, personId))
  await db.insert(personPages).values({ page, personId })
}

/** The parts of a name with a space between them, as `persons.name` holds them. */
export function joinNameParts({ familyName, familyNamePrefix, givenName }: EditorsName): string {
  return [givenName, familyNamePrefix, familyName].filter((part) => part !== null && part !== '').join(' ')
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
 * Every person with an article, by its title, with the source of his name: null while he has
 * none. The importer asks about the articles of the persons without a name, and puts the names
 * of its list on the rest. A person without a title is not in the map: his name is the
 * editors'.
 */
export async function personNamesBySource(db: Pick<Database, 'select'>): Promise<Map<string, null | PersonNameSource>> {
  const rows = await db.select({ page: persons.wikipediaPage, source: persons.nameSource }).from(persons)

  return new Map(rows.flatMap((row) => (row.page === null ? [] : [[row.page, row.source] as const])))
}

/** The Q-numbers that persons have, with the title of the person, for the unique key. */
export async function personsByWikidataId(db: Pick<Database, 'select'>): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: persons.wikidataId, title: persons.wikipediaPage })
    .from(persons)
    .where(isNotNull(persons.wikidataId))

  return new Map(rows.flatMap((row) => (row.id === null || row.title === null ? [] : [[row.id, row.title] as const])))
}

/**
 * The persons not read from Wikidata yet, the oldest first, at most `limit`. A person without a
 * title has no article to ask about, and a person with a title of the English Wikipedia has
 * none on the Dutch one, so neither is ever one of them.
 */
export async function personsToRead(db: Pick<Database, 'select'>, limit: number): Promise<PersonToRead[]> {
  const rows = await db
    .select({
      id: persons.id,
      lineSource: persons.lineSource,
      wikidataId: persons.wikidataId,
      wikipediaPage: persons.wikipediaPage,
      wikipediaPageId: persons.wikipediaPageId,
    })
    .from(persons)
    .where(and(isNull(persons.wikidataReadAt), isNotNull(persons.wikipediaPage), eq(persons.englishTitle, false)))
    .orderBy(asc(persons.id))
    .limit(limit)

  return rows.flatMap((row) => (row.wikipediaPage === null ? [] : [{ ...row, wikipediaPage: row.wikipediaPage }]))
}

/** When the list was read last, or null when never. */
export async function playerListReadAt(db: Pick<Database, 'select'>): Promise<Date | null> {
  const [row] = await db
    .select({ readAt: playerListTitles.readAt })
    .from(playerListTitles)
    .orderBy(desc(playerListTitles.readAt))
    .limit(1)

  return row?.readAt ?? null
}

/**
 * Compares the titles of our persons with the list of players. `decided` holds the titles the
 * owner already decided on (`personsWhoDiffer` and `personTitleAliases`): they are in no
 * group. A title that differs only in a sign counts as the same person
 * (`normalisePersonTitle`, as in `similarPersons`) and comes back as a spelling that differs.
 */
export async function playerListReport(
  db: Pick<Database, 'select'>,
  decided: readonly string[] = decidedTitles(),
): Promise<PlayerListReport> {
  const skip = new Set(decided)
  const list = (await db.select().from(playerListTitles).orderBy(asc(playerListTitles.title))).map((row) => row.title)
  const ours = (await db.select().from(persons).orderBy(asc(persons.id)))
    .map((row) => row.wikipediaPage)
    .filter((title): title is string => title !== null)

  if (list.length === 0) {
    return { notOnList: [], notOurs: [], read: 0, spelling: [] }
  }

  const onList = new Set(list)
  const ourKeys = new Map<string, string>()

  for (const title of ours) {
    if (!skip.has(title)) {
      ourKeys.set(normalisePersonTitle(title), ourKeys.get(normalisePersonTitle(title)) ?? title)
    }
  }

  const spelling: [string, string][] = []
  const listKeys = new Set<string>()
  const notOurs: string[] = []

  for (const title of list) {
    if (skip.has(title)) {
      continue
    }

    const key = normalisePersonTitle(title)

    listKeys.add(key)

    const own = ourKeys.get(key)

    if (own === undefined) {
      notOurs.push(title)
    } else if (own !== title) {
      spelling.push([own, title])
    }
  }

  const notOnList = ours.filter(
    (title) => !skip.has(title) && !onList.has(title) && !listKeys.has(normalisePersonTitle(title)),
  )

  return { notOnList, notOurs, read: list.length, spelling }
}

/**
 * Fills in the country of the persons (#1051, #1052) from three sources, the strongest first.
 * A stronger source replaces a weaker one and never the other way round; the country the
 * editors set (`manual`) never changes, and the one of the old fansite (`old-site`, filled by
 * the import of the old fansite) sits between the list and the squad.
 *
 * - Wikidata: the first nationality (`person_nationalities`, position 0), through `codes`: the
 *   code of two letters by Q-number. A first nationality that is not in `codes` gives no
 *   country and no guess: the item is in `unknown` with its label and how many persons have
 *   it, and a weaker source may fill the person in.
 * - The list of players: the country of the title of the person in `player_list_titles`. Only
 *   the title of his article counts, never a name, so a namesake gets nothing.
 * - The squad lists: the country that stands most often on his rows of `players`, and for a
 *   tie the one of the latest season. Only for a person without a country, or with one of the
 *   squad.
 *
 * It asks nothing, and a second run changes nothing.
 */
export async function refreshPersonCountries(
  db: Pick<Database, 'select' | 'update'>,
  codes: ReadonlyMap<string, string>,
): Promise<PersonCountriesRefresh> {
  const rows = await db
    .select({
      country: persons.country,
      id: persons.id,
      itemId: personNationalities.itemId,
      label: wikidataItems.label,
      source: persons.countrySource,
    })
    .from(persons)
    .innerJoin(
      personNationalities,
      and(eq(personNationalities.personId, persons.id), eq(personNationalities.position, 0)),
    )
    .innerJoin(wikidataItems, eq(wikidataItems.id, personNationalities.itemId))
    .where(sql`${persons.countrySource} is null or ${persons.countrySource} <> 'manual'`)
    .orderBy(asc(persons.id))
  const unknown = new Map<string, { id: string; label: string; persons: number }>()
  const report: PersonCountriesRefresh = { filled: 0, list: 0, squad: 0, unknown: [] }

  for (const row of rows) {
    const code = codes.get(row.itemId)

    if (code === undefined) {
      const item = unknown.get(row.itemId) ?? { id: row.itemId, label: row.label, persons: 0 }

      item.persons++
      unknown.set(row.itemId, item)
    } else if (row.country !== code || row.source !== 'wikidata') {
      await db.update(persons).set({ country: code, countrySource: 'wikidata' }).where(eq(persons.id, row.id))
      report.filled++
    }
  }
  report.unknown = [...unknown.values()]

  // A person whose first nationality is not in `codes` still has his old source here, so a
  // country of Wikidata that was stored for him earlier stays: the list only fills what is
  // empty or weaker than itself.
  const listed = await db
    .select({
      country: persons.country,
      id: persons.id,
      listed: playerListTitles.country,
      source: persons.countrySource,
    })
    .from(persons)
    .innerJoin(playerListTitles, eq(playerListTitles.title, persons.wikipediaPage))
    .where(
      and(
        isNotNull(playerListTitles.country),
        sql`(${persons.countrySource} is null or ${persons.countrySource} in ('list', 'old-site', 'squad'))`,
      ),
    )
    .orderBy(asc(persons.id))

  for (const row of listed) {
    if (row.listed !== null && isCountryCode(row.listed) && (row.country !== row.listed || row.source !== 'list')) {
      await db.update(persons).set({ country: row.listed, countrySource: 'list' }).where(eq(persons.id, row.id))
      report.list++
    }
  }

  const weakest = await db
    .select({ country: persons.country, id: persons.id })
    .from(persons)
    .where(sql`${persons.countrySource} is null or ${persons.countrySource} = 'squad'`)
    .orderBy(asc(persons.id))
  const fromSquad = await squadCountries(
    db,
    weakest.map((person) => person.id),
  )

  for (const person of weakest) {
    const country = fromSquad.get(person.id)

    if (country !== undefined && country !== person.country) {
      await db.update(persons).set({ country, countrySource: 'squad' }).where(eq(persons.id, person.id))
      report.squad++
    }
  }

  return report
}

/**
 * Works out the line of the persons again (#1051) who have none, or whose line came from the
 * squad lists or the old fansite: a line the editors or our list set (`manual`) and a line
 * from Wikidata stay as they are. The line is the first position Wikidata gave the person
 * (`person_positions`) that `positionLines` knows, and else the one of his rows of `players`
 * (`squadLines`), also when the editors set the position of such a row. A line of the old
 * fansite (`old-site`, #1052) is weaker than Wikidata and stronger than the squad: it makes
 * way for a line of Wikidata and stays otherwise. So a position that is filled in later gives
 * the person his line at the next import, and a line the editors took away is filled in
 * again. A person whose rows have no position any more loses the line of the squad. It asks
 * nothing, and a second run changes nothing. Returns how many persons got a line, by its
 * source, and how many lost theirs.
 */
export async function refreshPersonLines(
  db: Pick<Database, 'select' | 'update'>,
  positionLines: ReadonlyMap<string, PlayerPosition>,
): Promise<{ cleared: number; squad: number; wikidata: number }> {
  const counts = { cleared: 0, squad: 0, wikidata: 0 }
  const people = await db
    .select({ id: persons.id, line: persons.line, lineSource: persons.lineSource })
    .from(persons)
    .where(sql`${persons.lineSource} is null or ${persons.lineSource} in ('squad', 'old-site')`)
    .orderBy(asc(persons.id))

  if (people.length === 0) {
    return counts
  }

  const ids = people.map((person) => person.id)
  const fromSquad = await squadLines(db, ids)
  const fromWikidata = new Map<number, PlayerPosition>()

  for (const row of await db
    .select({ itemId: personPositions.itemId, personId: personPositions.personId })
    .from(personPositions)
    .where(inArray(personPositions.personId, ids))
    .orderBy(asc(personPositions.personId), asc(personPositions.position))) {
    const line = positionLines.get(row.itemId)

    if (line !== undefined && !fromWikidata.has(row.personId)) {
      fromWikidata.set(row.personId, line)
    }
  }

  for (const person of people) {
    const wikidata = fromWikidata.get(person.id)

    if (wikidata === undefined && person.lineSource === 'old-site') {
      continue
    }

    const line = wikidata ?? fromSquad.get(person.id) ?? null
    const lineSource = line === null ? null : wikidata === undefined ? ('squad' as const) : ('wikidata' as const)

    if (line === person.line && lineSource === person.lineSource) {
      continue
    }

    await db.update(persons).set({ line, lineSource }).where(eq(persons.id, person.id))
    counts[lineSource ?? 'cleared']++
  }

  return counts
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

  return new Map(rows.flatMap((row) => (row.article === null ? [] : [[row.page, row.article] as const])))
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

/** Puts the name the editors filled in on a person, with the source `redactie`. */
export async function setEditorsName(db: Pick<Database, 'update'>, personId: number, name: EditorsName) {
  await db.update(persons).set(editorsNameColumns(name)).where(eq(persons.id, personId))
}

/**
 * Sets the line and the country of a person as the editors chose them in the admin (#1051). A
 * value gets the source `manual`, which the importer never replaces; null takes the value and
 * its source away, so the importer fills it in again at its next run. A field that is left out
 * stays as it is.
 */
export async function setEditorsPersonFacts(
  db: Pick<Database, 'update'>,
  personId: number,
  facts: { country?: null | string; line?: null | PlayerPosition },
): Promise<void> {
  const { country, line } = facts

  if (country === undefined && line === undefined) {
    return
  }

  await db
    .update(persons)
    .set({
      ...(country === undefined ? {} : { country, countrySource: country === null ? null : ('manual' as const) }),
      ...(line === undefined ? {} : { line, lineSource: line === null ? null : ('manual' as const) }),
    })
    .where(eq(persons.id, personId))
}

/**
 * The persons whose titles are the same without accents, capitals, hyphens, spaces and
 * apostrophes, the addition between brackets included (`Johnny Jansen (1952)` and `(1975)` are
 * not alike). Each group lists the titles of the persons, in the order of their `id`. The
 * import warns about them and merges nothing: two players can have the same name. Join them
 * with `personTitleAliases` when they are one person. A group whose titles are all in one
 * group of `differ` (`personsWhoDiffer`) is left out: the owner said they are different
 * people. A third title that looks like them brings the whole group back.
 */
export async function similarPersons(
  db: Pick<Database, 'select'>,
  differ: readonly (readonly string[])[] = personsWhoDiffer,
): Promise<string[][]> {
  const groups = new Map<string, string[]>()

  for (const { wikipediaPage } of await db.select().from(persons).orderBy(asc(persons.id))) {
    // The list compares titles, and a person of the editors without an article has none.
    if (wikipediaPage === null) {
      continue
    }

    const key = normalisePersonTitle(wikipediaPage)

    groups.set(key, [...(groups.get(key) ?? []), wikipediaPage])
  }

  return [...groups.values()]
    .filter((titles) => titles.length > 1)
    .filter((titles) => !differ.some((names) => titles.every((title) => names.includes(title))))
}

/**
 * The country that the squad lists give a person (#1052): the one that stands most often on
 * his rows of `players`, and for a tie the one of the latest season. A country that is not in
 * the list of countries does not count, and a person with no row with a country is not in the
 * map.
 */
export async function squadCountries(
  db: Pick<Database, 'select'>,
  personIds: readonly number[],
): Promise<Map<number, string>> {
  const countries = new Map<number, string>()

  if (personIds.length === 0) {
    return countries
  }

  const rows = await db
    .select({
      country: players.country,
      n: sql<number>`count(*)`,
      personId: players.personId,
      season: sql<string>`max(${players.season})`,
    })
    .from(players)
    .where(and(inArray(players.personId, [...personIds]), isNotNull(players.country)))
    .groupBy(players.personId, players.country)
  const best = new Map<number, { count: number; country: string; season: string }>()

  for (const row of rows) {
    if (row.personId === null || row.country === null || !isCountryCode(row.country)) {
      continue
    }

    const count = Number(row.n)
    const current = best.get(row.personId)

    if (current === undefined || count > current.count || (count === current.count && row.season > current.season)) {
      best.set(row.personId, { count, country: row.country, season: row.season })
    }
  }
  for (const [id, { country }] of best) {
    countries.set(id, country)
  }

  return countries
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
      ...(data.line === 'keep' ? {} : { line: data.line?.line ?? null, lineSource: data.line?.source ?? null }),
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
 * A name of the editors (`redactie`) is never replaced either, not by the list.
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

    // A name the editors filled in stays, also when the list has one (issue 1022).
    if (had === 'manual' || had === 'redactie' || (had !== null && name.source !== 'manual')) {
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

/**
 * Keeps the titles of the list as the import read them, each with the country of its first
 * flag (#1052): a title that is new is added, one that is gone is removed, and the time of the
 * read and the country go on every title. A second read of the same page changes no title.
 */
export async function storePlayerList(
  db: Pick<Database, 'delete' | 'insert' | 'select'>,
  entries: readonly PlayerListEntry[],
  now: Date,
): Promise<{ added: number; removed: number }> {
  const known = new Set((await db.select().from(playerListTitles)).map((row) => row.title))
  const wanted = new Map(entries.map((entry) => [entry.title, entry.country] as const))
  const gone = [...known].filter((title) => !wanted.has(title))
  const added = [...wanted.keys()].filter((title) => !known.has(title))

  if (gone.length > 0) {
    await db.delete(playerListTitles).where(inArray(playerListTitles.title, gone))
  }
  if (wanted.size > 0) {
    await db
      .insert(playerListTitles)
      .values([...wanted].map(([title, country]) => ({ country, readAt: now, title })))
      .onDuplicateKeyUpdate({ set: { country: sql`values(\`country\`)`, readAt: now } })
  }

  return { added: added.length, removed: gone.length }
}

/** Keeps the label of an item. A label that is there stays: the importer asks once. */
export async function storeWikidataLabel(db: Pick<Database, 'insert'>, id: string, label: string): Promise<void> {
  await db
    .insert(wikidataItems)
    .values({ id, label })
    .onDuplicateKeyUpdate({ set: { id: sql`id` } })
}

/** The titles of the decided groups: who differs, and the titles that are one person. */
function decidedTitles(): string[] {
  return [...personsWhoDiffer.flat(), ...personTitleAliases.flatMap(({ aliases, title }) => [title, ...aliases])]
}

function editorsNameColumns(name: EditorsName) {
  return { ...name, name: joinNameParts(name), nameSource: 'redactie' as const }
}

/** A title as a computer compares it: no accents, capitals, hyphens, spaces or apostrophes. */
function normalisePersonTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}
