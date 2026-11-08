import { createClubBook, normaliseClubName } from '@fansite/db/clubs'
import { clubLimits, clubNames, clubPages, clubs } from '@fansite/db/schema'
import { asc } from 'drizzle-orm'

import type { OldSiteClub } from './old-site-file.ts'
import type { OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

import { clubFullNames } from './club-names.ts'

/**
 * The clubs of the old fansite that Wikipedia writes under another name, by the club code of
 * the file, with the name of the club as it is in `clubs` (`Cambuur Lwd.` is `SC Cambuur`). The
 * import looks a club up by its name first (`oldSiteClubIds`), and only then in this list; a
 * club that isn't here, or whose club isn't in the database yet, gets the name of the old
 * fansite. The list is by code and not by name, so a change to a name in the file does not
 * point a club at the wrong one.
 *
 * Add a club only after you checked that it is the same club: a club that merged or moved is a
 * club of its own until a decision says otherwise. `Roda JC` and `Excelsior` are in the list
 * of full names (`club-names.ts`) and so not here.
 */
export const oldSiteClubNames: Readonly<Record<string, string>> = {
  cambuurleeuwarden: 'SC Cambuur',
  eindhoven: 'FC Eindhoven',
  emmen: 'FC Emmen',
  fczwolle: 'PEC Zwolle',
  nac: 'NAC Breda',
  sparta: 'Sparta Rotterdam',
  stormvogelstelstar: 'Telstar',
}

/** The club of an old fansite club in the database, or undefined when it has none. */
export type FoundOldSiteClub = { club: undefined | { id: number; name: string }; old: OldSiteClub }

type ClubDatabase = Pick<OldSiteDatabase, 'insert' | 'select' | 'update'>

/** What the step knows of a club in the database. */
type KnownClub = { id: number; name: string; names: Set<string> }

/**
 * The club of every club in the files, in the order of the files, found by the rules of the
 * step `clubs`. The check report (#880) reads it to tell a club that has the name of the old
 * fansite from a club that has it as another name.
 */
export async function findOldSiteClubs(
  db: Pick<OldSiteDatabase, 'select'>,
  oldClubs: readonly OldSiteClub[],
): Promise<FoundOldSiteClub[]> {
  const known = await knownClubs(db)

  return oldClubs.map((old) => {
    const club = findClub(known, old)

    return { club: club === undefined ? undefined : { id: club.id, name: club.name }, old }
  })
}

/** The step `clubs`: finds or makes the club of every club in the files of the old fansite. */
export async function importOldSiteClubs(
  db: ClubDatabase,
  oldClubs: readonly OldSiteClub[],
): Promise<OldSiteStepReport> {
  const report: OldSiteStepReport = { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
  const book = await createClubBook(db, { fullNames: clubFullNames })
  let known = await knownClubs(db)

  for (const old of oldClubs) {
    const label = `'${old.name}' (${old.code})`
    const key = normaliseClubName(old.name)

    if (key === '' || old.name.length > clubLimits.name) {
      report.skipped += 1
      report.lines.push(
        `skipped old fansite club ${label}: its name is empty or longer than ${clubLimits.name} characters`,
      )
      continue
    }

    let club = findClub(known, old)
    const isNew = club === undefined

    if (club === undefined) {
      const { id } = await book.resolve({ name: otherNames(old)[0] ?? old.name, page: null })

      known = await knownClubs(db)
      club = known.get(id)
      report.created += 1
      report.lines.push(`new club '${club?.name}' for old fansite club ${label}`)
    }
    if (club === undefined || club.names.has(key)) {
      if (!isNew) {
        report.unchanged += 1
      }
      continue
    }

    // The old fansite wrote the club in another way. Remember that name, unless another club
    // has it already.
    if ([...known.values()].some((other) => other.id !== club.id && other.names.has(key))) {
      report.unchanged += isNew ? 0 : 1
      report.lines.push(`name '${old.name}' belongs to another club, not added to club '${club.name}' (${old.code})`)
      continue
    }

    await db.insert(clubNames).values({ clubId: club.id, name: old.name })
    club.names.add(key)
    if (!isNew) {
      report.changed += 1
      report.lines.push(`club '${club.name}' is old fansite club ${label}, name added`)
    }
  }

  return report
}

/**
 * The club of each club in the files, by the club code of the file: what the step `clubs` found
 * or made. A club the database doesn't have yet is left out. The steps after `clubs` use it to
 * give a match its club.
 */
export async function oldSiteClubIds(db: ClubDatabase, oldClubs: readonly OldSiteClub[]): Promise<Map<string, number>> {
  const ids = new Map<string, number>()

  for (const { club, old } of await findOldSiteClubs(db, oldClubs)) {
    if (club !== undefined) {
      ids.set(old.code, club.id)
    }
  }

  return ids
}

/**
 * The club of an old fansite club: the club that has its name (as its name, another name or a
 * title of an article), else the club of a name in the lists. The name of the old fansite wins,
 * so a club that has it keeps it.
 */
function findClub(known: Map<number, KnownClub>, old: OldSiteClub): KnownClub | undefined {
  for (const name of [old.name, ...otherNames(old)]) {
    const key = normaliseClubName(name)
    const club = [...known.values()].find((one) => one.names.has(key))

    if (club !== undefined) {
      return club
    }
  }

  return undefined
}

/** Every club with all the names it can be found by, in the way the importer compares them. */
async function knownClubs(db: Pick<OldSiteDatabase, 'select'>): Promise<Map<number, KnownClub>> {
  const found = new Map<number, KnownClub>()

  for (const row of await db.select().from(clubs).orderBy(asc(clubs.id))) {
    found.set(row.id, { id: row.id, name: row.name, names: new Set([normaliseClubName(row.name)]) })
  }
  for (const row of await db.select().from(clubNames)) {
    found.get(row.clubId)?.names.add(normaliseClubName(row.name))
  }
  for (const row of await db.select().from(clubPages)) {
    found.get(row.clubId)?.names.add(normaliseClubName(row.page))
  }

  return found
}

/**
 * The names the lists give an old fansite club, the one a new club gets first: the name in
 * `oldSiteClubNames` by its code, then the full name of `club-names.ts`.
 */
function otherNames(old: OldSiteClub): string[] {
  const key = normaliseClubName(old.name)
  const listed = clubFullNames.find((entry) =>
    [entry.name, ...entry.aliases].some((name) => normaliseClubName(name) === key),
  )

  return [oldSiteClubNames[old.code], listed?.name].flatMap((name) => (name === undefined ? [] : [name]))
}
