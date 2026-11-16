// A stadium as a thing of its own (#1297): which stadium a match was played in, found from the
// name in the source, the day of the match and the home club, and the steps that fill the
// tables for the matches that were already there. A name is not unique: two grounds can have
// had the same name in different times, so a name alone never decides.
import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import { clubHomeGrounds, matches, stadiumNames, stadiums } from './schema.ts'

/** What `linkMatchesToStadiums` did: how many it linked, and how many have no stadium. */
export type LinkResult = { linked: number; unlinked: number }

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

/** The stadium of a match, read from the database. For many matches, load the index once. */
export async function findStadium(db: Pick<Database, 'select'>, query: StadiumQuery): Promise<null | number> {
  return resolveStadium(await loadStadiumIndex(db), query)
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

  if (stadiumId !== match.stadiumId) {
    await db.update(matches).set({ stadiumId }).where(eq(matches.id, matchId))
  }

  return stadiumId
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
  rows: readonly (Start & { note?: null | string; stadiumId: number })[],
): Promise<void> {
  await db.transaction(async (transaction) => {
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
  })
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
