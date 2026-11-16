// A stadium as a thing of its own (#1297): which stadium a match was played in, found from the
// name in the source, the day of the match and the home club, and the steps that fill the
// tables for the matches that were already there. A name is not unique: two grounds can have
// had the same name in different times, so a name alone never decides.
import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import { clubHomeGrounds, clubs, matchEdits, matches, stadiumLimits, stadiumNames, stadiums } from './schema.ts'

/** One home ground of a club as it is written: the stadium, a start and a note. */
export type HomeGroundRow = Start & { note?: null | string; stadiumId: number }

/** What `linkMatchesToStadiums` did: how many it linked, and how many have no stadium. */
export type LinkResult = { linked: number; unlinked: number }

/**
 * One name of a stadium as it is kept, for a line of a list. The start is a season
 * (`2019/20`), a day (`2021-02-14`) or neither, never both; only the first name has neither.
 */
export type StadiumLine = {
  name: string
  note: null | string
  startDay: null | string
  startSeason: null | string
}

/** What the lookup needs of a match. `homeClubId` is empty when sc Heerenveen was at home. */
export type StadiumQuery = {
  homeClubId: null | number
  matchDate: string
  name: string
}

type StadiumIndex = {
  /** The home grounds of a club in order, with `null` for sc Heerenveen. */
  grounds: Map<null | number, { stadiumId: number; start: null | string }[]>
  /** The names of a stadium by their key, each with the day it began (empty: always). */
  names: Map<string, { stadiumId: number; start: null | string }[]>
}

type Start = { startDay: null | string; startSeason: null | string }

/**
 * The name of the stadium of a match as it was on the day of the match (#1301): the last name
 * of the linked stadium that had begun by then, or the text of the source when the match has no
 * stadium. SQL for the `select` of a list of matches that reads from `matches`, without an
 * alias. A name begins on its day or on 1 July of its season, and the names are in order.
 */
export const stadiumOnTheDay = sql<null | string>`coalesce((
  select ${stadiumNames.name} from ${stadiumNames}
  where ${stadiumNames.stadiumId} = ${sql.raw('`matches`.`stadium_id`')}
    and (${stadiumNames.startDay} is null and ${stadiumNames.startSeason} is null
      or coalesce(${stadiumNames.startDay}, str_to_date(concat(left(${stadiumNames.startSeason}, 4), '-07-01'), '%Y-%m-%d'))
        <= ${sql.raw('`matches`.`match_date`')})
  order by ${stadiumNames.position} desc limit 1
), ${sql.raw('`matches`.`stadium`')})`

/** The stadium of a match, read from the database. For many matches, load the index once. */
export async function findStadium(db: Pick<Database, 'select'>, query: StadiumQuery): Promise<null | number> {
  return resolveStadium(await loadStadiumIndex(db), query)
}

/**
 * Whether the editors chose the stadium of a match: they entered its facts, and the stadium is
 * not the one the text, the day and the home club give. A link the import made, which follows
 * the text, is no choice, so it is not kept when the text changes.
 */
export async function hasChosenStadium(db: Pick<Database, 'select'>, matchId: number): Promise<boolean> {
  const [match] = await db
    .select({
      clubId: matches.clubId,
      home: matches.home,
      matchDate: matches.matchDate,
      stadium: matches.stadium,
      stadiumId: matches.stadiumId,
    })
    .from(matches)
    .where(eq(matches.id, matchId))

  if (match?.stadiumId === null || match === undefined || !(await factsAreEdited(db, matchId))) {
    return false
  }

  const resolved =
    match.stadium === null
      ? null
      : await findStadium(db, { homeClubId: homeClubOf(match), matchDate: match.matchDate, name: match.stadium })

  return resolved !== match.stadiumId
}

/** The home club of a match for `findStadium`: none for sc Heerenveen, else the opponent. */
export function homeClubOf(match: { clubId: number; home: boolean }): null | number {
  return match.home ? null : match.clubId
}

/**
 * Links the matches that have a stadium text and no stadium yet, with `resolveStadium`. A match
 * that is not certain keeps its text and stays without a stadium; the page Kwaliteit of the
 * admin lists it. It can run again: it only looks at matches without a link.
 */
export async function linkMatchesToStadiums(db: Database): Promise<LinkResult> {
  const waiting = await db
    .select({
      clubId: matches.clubId,
      home: matches.home,
      id: matches.id,
      matchDate: matches.matchDate,
      stadium: matches.stadium,
    })
    .from(matches)
    .where(and(isNotNull(matches.stadium), isNull(matches.stadiumId)))
  const index = await loadStadiumIndex(db)
  let linked = 0

  for (const match of waiting) {
    const stadiumId = resolveStadium(index, {
      homeClubId: homeClubOf(match),
      matchDate: match.matchDate,
      name: match.stadium ?? '',
    })

    if (stadiumId !== null) {
      await db
        .update(matches)
        .set({ stadiumId })
        .where(and(eq(matches.id, match.id), isNull(matches.stadiumId)))
      linked += 1
    }
  }

  return { linked, unlinked: waiting.length - linked }
}

/**
 * Sets the stadium of a match from its text, the day and the home club as they are now, for
 * the import and the form: call it after a write that can change one of them. It empties the
 * link when no stadium is certain, so the match keeps only its text. Returns the stadium.
 */
export async function linkMatchToStadium(
  db: Pick<Database, 'select' | 'update'>,
  matchId: number,
): Promise<null | number> {
  const [match] = await db
    .select({
      clubId: matches.clubId,
      home: matches.home,
      matchDate: matches.matchDate,
      stadium: matches.stadium,
      stadiumId: matches.stadiumId,
    })
    .from(matches)
    .where(eq(matches.id, matchId))

  if (match === undefined) {
    return null
  }

  const stadiumId =
    match.stadium === null
      ? null
      : await findStadium(db, { homeClubId: homeClubOf(match), matchDate: match.matchDate, name: match.stadium })

  if (match.stadiumId !== null && stadiumId !== match.stadiumId && (await factsAreEdited(db, matchId))) {
    // The editors entered the facts of this match, and the stadium differs from what the text
    // says, so they chose it.
    return match.stadiumId
  }

  if (stadiumId !== match.stadiumId) {
    await db.update(matches).set({ stadiumId }).where(eq(matches.id, matchId))
  }

  return stadiumId
}

/**
 * The lines of the card Stadion on the page of a club: the grounds it played its home matches
 * on, in order, each with the names the stadium had while the club played there. A name that
 * began before the club came starts when the club did, and a name that began after the club
 * left is left out. A ground that has one name is one line. The first line of a ground after
 * the first starts with the ground, so the card can say from when. The note of the ground wins
 * over the note of a name. An empty list means the club has no home grounds: the card then
 * shows what the matches say.
 */
export async function listClubStadiumLines(db: Pick<Database, 'select'>, clubId: number): Promise<StadiumLine[]> {
  const grounds = await db
    .select({
      note: clubHomeGrounds.note,
      stadiumId: clubHomeGrounds.stadiumId,
      startDay: clubHomeGrounds.startDay,
      startSeason: clubHomeGrounds.startSeason,
    })
    .from(clubHomeGrounds)
    .where(eq(clubHomeGrounds.clubId, clubId))
    .orderBy(asc(clubHomeGrounds.position))

  if (grounds.length === 0) {
    return []
  }

  const names = await db
    .select({
      name: stadiumNames.name,
      note: stadiumNames.note,
      stadiumId: stadiumNames.stadiumId,
      startDay: stadiumNames.startDay,
      startSeason: stadiumNames.startSeason,
    })
    .from(stadiumNames)
    .orderBy(asc(stadiumNames.stadiumId), asc(stadiumNames.position))
  const lines: StadiumLine[] = []

  for (const [index, ground] of grounds.entries()) {
    const from = startDate(ground)
    const until = grounds[index + 1] === undefined ? null : startDate(grounds[index + 1]!)
    const own = names.filter((name) => name.stadiumId === ground.stadiumId)
    // The names in use while the club played: not after the club left, and the last one that
    // had begun when the club came, with the ones that came after.
    const inUse = own.filter((name) => until === null || (startDate(name) ?? '') < until)
    const first = from === null ? 0 : inUse.findLastIndex((name) => (startDate(name) ?? '') <= from)
    const kept = inUse.slice(Math.max(first, 0))

    for (const [position, name] of kept.entries()) {
      // The first name of a ground starts with the ground; the next ones start with themselves.
      const begins = position === 0 ? ground : name

      lines.push({
        name: name.name,
        note: position === 0 ? (ground.note ?? name.note) : name.note,
        startDay: begins.startDay,
        startSeason: begins.startSeason,
      })
    }
  }

  return lines
}

/** Reads the names and home grounds, which are few, so a lookup needs no query per match. */
export async function loadStadiumIndex(db: Pick<Database, 'select'>): Promise<StadiumIndex> {
  const names = await db
    .select({
      name: stadiumNames.name,
      stadiumId: stadiumNames.stadiumId,
      startDay: stadiumNames.startDay,
      startSeason: stadiumNames.startSeason,
    })
    .from(stadiumNames)
  const grounds = await db
    .select({
      clubId: clubHomeGrounds.clubId,
      stadiumId: clubHomeGrounds.stadiumId,
      startDay: clubHomeGrounds.startDay,
      startSeason: clubHomeGrounds.startSeason,
    })
    .from(clubHomeGrounds)
    .orderBy(asc(clubHomeGrounds.position))
  const index: StadiumIndex = { grounds: new Map(), names: new Map() }

  for (const row of names) {
    const key = nameKey(row.name)

    index.names.set(key, [...(index.names.get(key) ?? []), { stadiumId: row.stadiumId, start: startDate(row) }])
  }
  for (const row of grounds) {
    index.grounds.set(row.clubId, [
      ...(index.grounds.get(row.clubId) ?? []),
      { stadiumId: row.stadiumId, start: startDate(row) },
    ])
  }

  return index
}

/**
 * The text of a name without what writers disagree on: capitals, accents, spaces and
 * punctuation, so `Koning Willem II-stadion` and `Koning Willem II Stadion` are one name.
 */
export function nameKey(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

/**
 * Replaces the home grounds of a club (or of sc Heerenveen, with `null`) by these, in order.
 * A UNIQUE key does not stop a second series for an empty club, so this is the one place that
 * writes the rows, in a transaction that locks the series first. The first ground may have no
 * start; the table keeps the other rules of a row.
 */
export async function replaceHomeGrounds(
  db: Database,
  clubId: null | number,
  rows: readonly HomeGroundRow[],
): Promise<void> {
  await db.transaction((transaction) => writeHomeGrounds(transaction, clubId, rows))
}

/**
 * The stadium of a match, or `null` when it is not certain. The candidates are the stadiums
 * that had this name on the day of the match, which is a name they have had by then, so a
 * stadium that was renamed still answers to its old name. One candidate is the answer. With
 * more, the home club decides: the ground it played on that day, when that is one of them. A
 * name that no stadium had, or a tie that the home club does not break, gives `null`, and the
 * match keeps its text.
 */
export function resolveStadium(index: StadiumIndex, query: StadiumQuery): null | number {
  const candidates = new Set(
    (index.names.get(nameKey(query.name)) ?? [])
      .filter((name) => name.start === null || name.start <= query.matchDate)
      .map((name) => name.stadiumId),
  )

  if (candidates.size <= 1) {
    return candidates.values().next().value ?? null
  }

  // The grounds are in order, so the last one that had begun is the one in use.
  const inUse = (index.grounds.get(query.homeClubId) ?? [])
    .filter((ground) => ground.start === null || ground.start <= query.matchDate)
    .at(-1)

  return inUse !== undefined && candidates.has(inUse.stadiumId) ? inUse.stadiumId : null
}

/** The day a start counts from: a season is 1 July of its first year. */
export function startDate({ startDay, startSeason }: Start): null | string {
  if (startDay !== null) {
    return startDay
  }

  return startSeason === null ? null : `${startSeason.slice(0, 4)}-07-01`
}

/** The body of `replaceHomeGrounds`, for a caller that has a transaction of its own. */
export async function writeHomeGrounds(
  transaction: Pick<Database, 'delete' | 'insert' | 'select'>,
  clubId: null | number,
  rows: readonly HomeGroundRow[],
): Promise<void> {
  await transaction
    .select({ id: clubHomeGrounds.id })
    .from(clubHomeGrounds)
    .where(clubId === null ? isNull(clubHomeGrounds.clubId) : eq(clubHomeGrounds.clubId, clubId))
    .for('update')
  await transaction
    .delete(clubHomeGrounds)
    .where(clubId === null ? isNull(clubHomeGrounds.clubId) : eq(clubHomeGrounds.clubId, clubId))

  if (rows.length > 0) {
    await transaction.insert(clubHomeGrounds).values(
      rows.map((row, position) => ({
        clubId,
        note: row.note ?? null,
        position,
        stadiumId: row.stadiumId,
        startDay: row.startDay,
        startSeason: row.startSeason,
      })),
    )
  }
}

/** Whether the editors entered the facts of a match, which can include its stadium. */
async function factsAreEdited(db: Pick<Database, 'select'>, matchId: number): Promise<boolean> {
  const [edit] = await db
    .select({ edited: matchEdits.factsEdited })
    .from(matchEdits)
    .where(eq(matchEdits.matchId, matchId))

  return edit?.edited === true
}

const noteOfDerivedStart = 'Begin: de eerste wedstrijd in onze gegevens, niet het echte begin.'

/**
 * The stadiums that had more than one name, or more than one spelling that is no spelling of
 * the same name (`De Kuip` is `Stadion Feijenoord`), in the order of their names. A name that
 * is not here is a stadium of its own; spellings that differ only in capitals, spaces or
 * punctuation are one name (see `nameKey`). The first name has no start, and each next name
 * starts with the season of the first match in our data that has it.
 */
const renamedStadiums: readonly (readonly string[])[] = [
  ['ADO Den Haag Stadion', 'Kyocera Stadion', 'Cars Jeans Stadion', 'WerkTalent Stadion'],
  ['Amsterdam ArenA', 'Johan Cruijff ArenA'],
  ['DSB Stadion', 'AFAS Stadion'],
  ['Euroborg', 'Noordlease Stadion', 'Hitachi Capital Mobility Stadion'],
  ['Stadion Woudestein', 'Van Donge & De Roo Stadion'],
  ['Polman Stadion', 'Erve Asito', 'Asito Stadion'],
  ['Goffertstadion', 'McDOS Goffertstadion'],
  ['IJsseldeltastadion', 'MAC³PARK stadion'],
  ['Spartastadion Het Kasteel', 'Het Kasteel'],
  ['De Koel', 'Seacon Stadion - De Koel -', 'Covebo Stadion - De Koel -'],
  ['Willem II Stadion', 'Koning Willem II Stadion'],
  ['Stadion Feijenoord', 'De Kuip'],
]

/** The two stadiums of sc Heerenveen and where they began, with their names. */
const heerenveenStadiums = [
  {
    names: [
      { name: 'Sportpark Noord', note: null, startSeason: null },
      { name: 'Abe Lenstra Stadion', note: null, startSeason: '1986/87' },
    ],
    note: null,
    startSeason: null,
  },
  {
    names: [
      {
        name: 'Abe Lenstra Stadion',
        note: 'Ingehuldigd op 20 augustus 1994.',
        startSeason: '1994/95',
      },
    ],
    note: 'Ingehuldigd op 20 augustus 1994.',
    startSeason: '1994/95',
  },
] as const

/** A club whose home grounds the importer has not read yet, with who set the grounds it has. */
export type ClubToReadStadiums = { homeGroundsSource: 'manual' | 'wikidata' | null; id: number; wikidataId: string }

/** What `storeWikidataStadium` did with one stadium. */
export type StadiumStored = { created: boolean; id: number; updated: boolean }

/** What the importer takes from the item of a stadium on Wikidata. */
export type WikidataStadium = {
  /** The coordinates (`P625`), both or none. */
  coordinates: null | { latitude: number; longitude: number }
  label: string
  /** The label of the place the stadium lies in (`P131`), cut to fit. */
  place: null | string
  wikidataId: string
}

/** The clubs with a Q-number that were not read for their stadiums yet, oldest club first. */
export async function clubsToReadStadiums(db: Pick<Database, 'select'>): Promise<ClubToReadStadiums[]> {
  return db
    .select({ homeGroundsSource: clubs.homeGroundsSource, id: clubs.id, wikidataId: clubs.wikidataId })
    .from(clubs)
    .where(and(isNotNull(clubs.wikidataId), isNull(clubs.stadiumsReadAt)))
    .orderBy(asc(clubs.id)) as Promise<ClubToReadStadiums[]>
}

/**
 * The step after the migrations: makes the stadiums once (`seedStadiums`) and links the matches
 * that are not linked (`linkMatchesToStadiums`). It can run again, and it does nothing in a
 * database that has not had the migration of the stadiums yet, which a test of an older
 * migration relies on.
 */
export async function migrateStadiums(db: Database): Promise<void> {
  const [exists] = await db.execute(
    sql`select 1 from information_schema.tables where table_schema = database() and table_name = 'stadiums'`,
  )

  if ((exists as unknown as unknown[]).length === 0) {
    return
  }

  await seedStadiums(db)
  await linkMatchesToStadiums(db)
}

/**
 * Puts the stadiums in the tables for the names that the matches already have, once: it does
 * nothing when there is a stadium. sc Heerenveen gets its two grounds. Every other name makes a
 * stadium, except that spellings of one name and the names in `renamedStadiums` share one,
 * and the clubs that played at a ground are its home clubs when they are most of the away
 * matches there (a neutral ground then has none). The first match with a name decides when it
 * began, as the note says; the editors correct it. Returns how many stadiums it made.
 */
export async function seedStadiums(db: Database): Promise<number> {
  const [{ total = 0 } = {}] = await db.select({ total: sql<number>`count(*)` }).from(stadiums)

  if (Number(total) > 0) {
    return 0
  }

  return db.transaction(async (transaction) => {
    const ours = new Set<string>(
      heerenveenStadiums.flatMap((stadium) => stadium.names.map((name) => nameKey(name.name))),
    )
    const ourStadiumIds: number[] = []

    for (const stadium of heerenveenStadiums) {
      const [{ insertId }] = await transaction.insert(stadiums).values({})

      await transaction.insert(stadiumNames).values(
        stadium.names.map((name, position) => ({
          name: name.name,
          note: name.note,
          position,
          stadiumId: insertId,
          startSeason: name.startSeason,
        })),
      )
      ourStadiumIds.push(insertId)
    }
    await transaction.insert(clubHomeGrounds).values(
      heerenveenStadiums.map((stadium, position) => ({
        clubId: null,
        note: stadium.note,
        position,
        stadiumId: ourStadiumIds[position]!,
        startSeason: stadium.startSeason,
      })),
    )

    const used = await transaction
      .select({
        clubId: matches.clubId,
        firstDay: sql<string>`min(${matches.matchDate})`,
        firstSeason: sql<string>`min(${matches.season})`,
        home: matches.home,
        matches: sql<number>`count(*)`,
        name: matches.stadium,
      })
      .from(matches)
      .where(isNotNull(matches.stadium))
      .groupBy(matches.stadium, matches.clubId, matches.home)

    // The names by key, with how often each spelling occurs and the first season.
    const keys = new Map<string, { count: number; firstSeason: string; spellings: Map<string, number> }>()

    for (const row of used) {
      const key = nameKey(row.name ?? '')

      if (key === '' || ours.has(key)) {
        continue
      }

      const found = keys.get(key) ?? { count: 0, firstSeason: row.firstSeason, spellings: new Map() }

      found.count += Number(row.matches)
      found.firstSeason = found.firstSeason < row.firstSeason ? found.firstSeason : row.firstSeason
      found.spellings.set(row.name ?? '', (found.spellings.get(row.name ?? '') ?? 0) + Number(row.matches))
      keys.set(key, found)
    }

    // The keys that go together in one stadium, in the order of their names.
    const groups: string[][] = []
    const grouped = new Set<string>()

    for (const names of renamedStadiums) {
      const present = names.map(nameKey).filter((key) => keys.has(key))

      if (present.length > 0) {
        groups.push(present)
        present.forEach((key) => grouped.add(key))
      }
    }
    for (const key of [...keys.keys()].sort()) {
      if (!grouped.has(key)) {
        groups.push([key])
      }
    }

    const stadiumOfKey = new Map<string, number>()

    for (const group of groups) {
      const [{ insertId }] = await transaction.insert(stadiums).values({})

      await transaction.insert(stadiumNames).values(
        group.map((key, position) => {
          const found = keys.get(key)!
          const spelling = [...found.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0]

          return {
            name: spelling,
            note: position === 0 ? null : noteOfDerivedStart,
            position,
            stadiumId: insertId,
            startSeason: position === 0 ? null : found.firstSeason,
          }
        }),
      )
      group.forEach((key) => stadiumOfKey.set(key, insertId))
    }

    // A club's home grounds: where most away matches of others were played.
    const awayAtStadium = new Map<number, number>()
    const awayOfClub = new Map<string, { day: string; matches: number; season: string }>()

    for (const row of used.filter((used) => !used.home)) {
      const stadiumId = stadiumOfKey.get(nameKey(row.name ?? ''))

      if (stadiumId === undefined) {
        continue
      }

      awayAtStadium.set(stadiumId, (awayAtStadium.get(stadiumId) ?? 0) + Number(row.matches))

      const club = `${row.clubId}:${stadiumId}`
      const before = awayOfClub.get(club)

      awayOfClub.set(club, {
        day: before === undefined || row.firstDay < before.day ? row.firstDay : before.day,
        matches: (before?.matches ?? 0) + Number(row.matches),
        season: before === undefined || row.firstSeason < before.season ? row.firstSeason : before.season,
      })
    }

    const groundsOfClub = new Map<number, { day: string; season: string; stadiumId: number }[]>()

    for (const [club, found] of awayOfClub) {
      const [clubId, stadiumId] = club.split(':').map(Number) as [number, number]

      if (found.matches * 2 > (awayAtStadium.get(stadiumId) ?? 0)) {
        groundsOfClub.set(clubId, [...(groundsOfClub.get(clubId) ?? []), { ...found, stadiumId }])
      }
    }
    for (const [clubId, grounds] of groundsOfClub) {
      grounds.sort((a, b) => a.day.localeCompare(b.day))
      await transaction.insert(clubHomeGrounds).values(
        grounds.map((ground, position) => ({
          clubId,
          note: position === 0 ? null : noteOfDerivedStart,
          position,
          stadiumId: ground.stadiumId,
          startSeason: position === 0 ? null : ground.season,
        })),
      )
    }

    return ourStadiumIds.length + groups.length
  })
}

/** Remembers that the stadiums of a club were read, so the importer does not ask again. */
export async function storeClubStadiumsRead(
  db: Pick<Database, 'update'>,
  clubId: number,
  readAt: Date,
  homeGroundsSource: 'wikidata' | null = null,
): Promise<void> {
  await db
    .update(clubs)
    .set({ stadiumsReadAt: readAt, ...(homeGroundsSource === null ? {} : { homeGroundsSource }) })
    .where(eq(clubs.id, clubId))
}

/**
 * Stores a stadium from Wikidata (#1298) and says which one it is. A stadium with this item is
 * updated; else a stadium without an item that has this name at this club (a name of one of
 * its names, in the grounds of the club) takes the item; else a new stadium is made, with the
 * label as its first name. The place and the coordinates follow Wikidata, with the source
 * `wikidata`, unless the editors set them (`manual`): then nothing of the stadium changes.
 * The street and the postcode are never written. Wikidata with neither a place nor
 * coordinates changes nothing either.
 */
export async function storeWikidataStadium(
  db: Database,
  clubId: number,
  stadium: WikidataStadium,
): Promise<StadiumStored> {
  const [byItem] = await db.select().from(stadiums).where(eq(stadiums.wikidataId, stadium.wikidataId))
  let found = byItem
  let created = false

  if (found === undefined) {
    const key = nameKey(stadium.label)
    const grounds = await db
      .select({ id: stadiums.id, name: stadiumNames.name })
      .from(clubHomeGrounds)
      .innerJoin(stadiums, eq(stadiums.id, clubHomeGrounds.stadiumId))
      .innerJoin(stadiumNames, eq(stadiumNames.stadiumId, stadiums.id))
      .where(and(eq(clubHomeGrounds.clubId, clubId), isNull(stadiums.wikidataId)))
    const same = [...new Set(grounds.filter((ground) => nameKey(ground.name) === key).map((ground) => ground.id))]

    if (same.length === 1) {
      const [only] = await db.select().from(stadiums).where(eq(stadiums.id, same[0]!))

      found = only
    }
  }
  if (found === undefined) {
    const [{ insertId }] = await db.insert(stadiums).values({ wikidataId: stadium.wikidataId })

    await db
      .insert(stadiumNames)
      .values({ name: stadium.label.slice(0, stadiumLimits.name), position: 0, stadiumId: insertId })
    ;[found] = await db.select().from(stadiums).where(eq(stadiums.id, insertId))
    created = true
  }
  if (found === undefined) {
    throw new Error(`The stadium ${stadium.wikidataId} was not found after it was made`)
  }

  const hasPlace = stadium.place !== null || stadium.coordinates !== null
  const latitude = stadium.coordinates === null ? null : stadium.coordinates.latitude.toFixed(6)
  const longitude = stadium.coordinates === null ? null : stadium.coordinates.longitude.toFixed(6)
  const changed =
    found.wikidataId !== stadium.wikidataId ||
    (hasPlace &&
      (found.place !== stadium.place ||
        found.latitude !== latitude ||
        found.longitude !== longitude ||
        found.placeSource !== 'wikidata'))

  if (found.placeSource === 'manual') {
    // The editors' place stays, but a stadium that had no item may still get its number.
    if (found.wikidataId === null) {
      await db.update(stadiums).set({ wikidataId: stadium.wikidataId }).where(eq(stadiums.id, found.id))
    }

    return { created, id: found.id, updated: found.wikidataId === null && !created }
  }
  if (changed) {
    await db
      .update(stadiums)
      .set({
        wikidataId: stadium.wikidataId,
        ...(hasPlace ? { latitude, longitude, place: stadium.place, placeSource: 'wikidata' as const } : {}),
      })
      .where(eq(stadiums.id, found.id))
  }

  return { created, id: found.id, updated: changed && !created }
}
