import type { TestDatabase } from '@fansite/db/test-database'

import { mergeChosenClubs } from '@fansite/db/club-merge'
import { createClubBook } from '@fansite/db/clubs'
import {
  auditLog,
  clubNamePeriods,
  clubNames,
  clubPages,
  clubs,
  leagueResults,
  matches,
  standings,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { OldSiteClub } from './old-site-file.ts'

import { clubFullNames } from './club-names.ts'
import { repairKnownClubs } from './import-matches.ts'
import { importOldSiteClubs, oldSiteClubIds, oldSiteClubNames } from './old-site-clubs.ts'
import { oldSiteClubSchema, readOldSiteData } from './old-site-file.ts'
import { fetcherFor } from './test-server.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  for (const table of ['audit_log', 'league_results', 'matches', 'standings', 'clubs']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

const old = (code: string, name: string): OldSiteClub => ({ code, country: 'NL', name })

/** A club of the database, with the article it has on Wikipedia, if any. */
async function club(name: string, slug: string, page: null | string = null, otherNames: string[] = []) {
  const [row] = await database.db.insert(clubs).values({ name, slug, wikipediaPage: page }).$returningId()
  const id = row!.id

  for (const other of otherNames) {
    await database.db.insert(clubNames).values({ clubId: id, name: other })
  }

  return id
}

const run = (oldClubs: OldSiteClub[]) => importOldSiteClubs(database.db, oldClubs)
const rows = () => database.db.select().from(clubs).orderBy(asc(clubs.id))
const names = () => database.db.select().from(clubNames).orderBy(asc(clubNames.id))

describe('the step clubs', () => {
  it('finds a club that is there under another spelling and writes nothing', async () => {
    const id = await club('N.E.C.', 'nec', 'N.E.C.')

    const report = await run([old('nec', 'NEC')])

    expect(report).toEqual({ changed: 0, created: 0, lines: [], skipped: 0, unchanged: 1 })
    expect(await rows()).toHaveLength(1)
    expect(await names()).toEqual([])
    expect(await oldSiteClubIds(database.db, [old('nec', 'NEC')])).toEqual(new Map([['nec', id]]))
  })

  it('links a club that Wikipedia writes under another name, from the list by the code', async () => {
    const id = await club('SC Cambuur', 'sc-cambuur', 'SC Cambuur')

    const report = await run([old('cambuurleeuwarden', 'Cambuur Lwd.')])

    expect(report).toMatchObject({ changed: 1, created: 0, skipped: 0, unchanged: 0 })
    expect(report.lines).toEqual([
      "club 'SC Cambuur' is old fansite club 'Cambuur Lwd.' (cambuurleeuwarden), name added",
    ])
    expect(await rows()).toHaveLength(1)
    expect(await names()).toMatchObject([{ clubId: id, name: 'Cambuur Lwd.' }])
  })

  it('does not use the list for a code that is not in it, even when the name is the same', async () => {
    await club('SC Cambuur', 'sc-cambuur', 'SC Cambuur')

    const report = await run([old('anderecode', 'Cambuur Lwd.')])

    expect(report).toMatchObject({ changed: 0, created: 1 })
    expect((await rows()).map((row) => row.name)).toEqual(['SC Cambuur', 'Cambuur Lwd.'])
  })

  it('makes a club that is new, with an address from its name and no article', async () => {
    const report = await run([old('fcbasel', 'FC Basel'), old('dordrecht90', "Dordrecht '90")])

    expect(report).toMatchObject({ changed: 0, created: 2, skipped: 0, unchanged: 0 })
    expect(report.lines).toEqual([
      "new club 'FC Basel' for old fansite club 'FC Basel' (fcbasel)",
      "new club 'Dordrecht '90' for old fansite club 'Dordrecht '90' (dordrecht90)",
    ])
    expect(await rows()).toMatchObject([
      { name: 'FC Basel', slug: 'fc-basel', wikipediaPage: null },
      { name: "Dordrecht '90", slug: 'dordrecht-90', wikipediaPage: null },
    ])
  })

  it('makes a new club under the name of the list, with the name of the old fansite as another name', async () => {
    const report = await run([old('fczwolle', 'FC Zwolle'), old('rodajc', 'Roda JC')])

    expect(report).toMatchObject({ created: 2 })
    expect(await rows()).toMatchObject([
      { name: 'PEC Zwolle', slug: 'pec-zwolle' },
      { name: 'Roda JC Kerkrade', slug: 'roda-jc-kerkrade' },
    ])
    expect((await names()).map((row) => row.name).sort()).toEqual(['FC Zwolle', 'Roda JC'])
  })

  it('gives a new club an address with a number when another club has the address', async () => {
    const other = await club('Ajax Cape Town', 'ajax')

    const report = await run([old('ajax', 'Ajax')])

    expect(report.created).toBe(1)
    expect(await rows()).toMatchObject([
      { id: other, name: 'Ajax Cape Town', slug: 'ajax' },
      { name: 'Ajax', slug: 'ajax-2' },
    ])
  })

  it('makes no club twice: a second run writes nothing and says nothing', async () => {
    await club('SC Cambuur', 'sc-cambuur', 'SC Cambuur')

    const oldClubs = [
      old('cambuurleeuwarden', 'Cambuur Lwd.'),
      old('fcbasel', 'FC Basel'),
      old('fczwolle', 'FC Zwolle'),
      old('nec', 'NEC'),
    ]

    await run(oldClubs)

    const before = { clubs: await rows(), names: await names() }
    const again = await run(oldClubs)

    expect(again).toEqual({ changed: 0, created: 0, lines: [], skipped: 0, unchanged: 4 })
    expect({ clubs: await rows(), names: await names() }).toEqual(before)
  })

  it('skips a club whose name the database can not hold, and says so', async () => {
    const report = await run([old('lang', 'x'.repeat(101)), old('leeg', '...'), old('fcbasel', 'FC Basel')])

    expect(report).toMatchObject({ created: 1, skipped: 2 })
    expect(report.lines[0]).toContain("skipped old fansite club '")
    expect(await rows()).toHaveLength(1)
  })

  it('does not take a name from another club', async () => {
    await club('FC Emmen', 'fc-emmen', 'FC Emmen')
    await club('Emmen', 'emmen')

    const report = await run([old('emmen', 'Emmen')])

    // The club that has the name of the old fansite is its club, whatever the list says.
    expect(report).toMatchObject({ changed: 0, created: 0, unchanged: 1 })
    expect(await oldSiteClubIds(database.db, [old('emmen', 'Emmen')])).toEqual(
      new Map([['emmen', (await rows()).find((row) => row.name === 'Emmen')?.id]]),
    )
  })

  it('finds the club by a title of its article in club_pages', async () => {
    const id = await club('AZ', 'az', 'AZ (voetbalclub)')

    await database.db.insert(clubPages).values({ clubId: id, page: 'AZ Alkmaar' })

    const report = await run([old('azalkmaar', 'AZ Alkmaar')])

    expect(report).toMatchObject({ created: 0, unchanged: 1 })
    expect(await rows()).toHaveLength(1)
  })

  it('finds the club that stayed after the editors merged two clubs, and makes the one that went no more', async () => {
    const stays = await club('VVV-Venlo', 'vvv-venlo', 'VVV-Venlo')
    const goes = await club('VVV', 'vvv')

    await mergeChosenClubs(database.db, { describe: () => 'samengevoegd', keptId: stays, otherId: goes, userId: null })

    const report = await run([old('vvv', 'VVV')])

    expect(report).toMatchObject({ created: 0, skipped: 0, unchanged: 1 })
    expect(await rows()).toMatchObject([{ id: stays, name: 'VVV-Venlo' }])
    expect(await oldSiteClubIds(database.db, [old('vvv', 'VVV')])).toEqual(new Map([['vvv', stays]]))
  })

  describe('the club of the old fansite that Wikipedia has under another name (#1637)', () => {
    const match = (clubId: number, round: string) => ({
      clubId,
      competition: 'Eerste divisie' as const,
      dataSource: 'oude-fansite' as const,
      goalsAgainst: 1,
      goalsFor: 2,
      home: true,
      matchDate: '1992-09-05',
      opponent: 'VVV',
      round,
      season: '1992/93',
      status: 'played' as const,
    })
    const stand = (club: string, season: string) => ({
      club,
      competition: 'Eredivisie' as const,
      drawn: 1,
      goalDifference: 0,
      goalsAgainst: 1,
      goalsFor: 1,
      lost: 1,
      played: 3,
      points: 4,
      position: 5,
      season,
      validOn: '1994-05-08',
      won: 1,
    })

    /** VVV-Venlo of Wikipedia with an article, and VVV of the old fansite, with their rows. */
    async function twoClubs() {
      const stays = await club('VVV-Venlo', 'vvv-venlo', 'VVV-Venlo', ['V.V.V. Venlo'])
      const goes = await club('VVV', 'vvv')

      await database.db.insert(matches).values([match(stays, 'Speelronde 9'), match(goes, 'Speelronde 5')])
      await database.db.insert(clubNamePeriods).values({ clubId: stays, name: 'VVV-Venlo', position: 0 })
      await database.db.insert(standings).values([stand('VVV', '1993/94'), stand('VVV-Venlo', '2009/10')])
      await database.db.insert(leagueResults).values({
        awayClub: 'sc Heerenveen',
        awayGoals: 1,
        homeClub: 'VVV',
        homeGoals: 2,
        playedOn: '1993-09-11',
        round: 3,
        season: '1993/94',
      })

      return { goes, stays }
    }

    it('merges the club that has no article into the club that has, with what hangs on it', async () => {
      const { goes, stays } = await twoClubs()

      const report = await run([old('vvv', 'VVV')])

      expect(report.lines).toEqual(["merged club 'VVV' into club 'VVV-Venlo': 1 matches moved"])
      expect(report).toMatchObject({ created: 0, skipped: 0, unchanged: 1 })
      expect(await rows()).toMatchObject([{ id: stays, name: 'VVV-Venlo', wikipediaPage: 'VVV-Venlo' }])
      expect((await database.db.select().from(matches).orderBy(asc(matches.id))).map((row) => row.clubId)).toEqual([
        stays,
        stays,
      ])
      // The names stay: the one of Wikipedia, and the one the old fansite wrote.
      expect((await names()).map((row) => [row.clubId, row.name]).toSorted()).toEqual([
        [stays, 'V.V.V. Venlo'],
        [stays, 'VVV'],
      ])
      expect(await database.db.select().from(clubNamePeriods)).toMatchObject([{ clubId: stays, name: 'VVV-Venlo' }])
      expect(
        (await database.db.select().from(standings).orderBy(asc(standings.season))).map((row) => row.club),
      ).toEqual(['VVV-Venlo', 'VVV-Venlo'])
      expect(await database.db.select().from(leagueResults)).toMatchObject([{ homeClub: 'VVV-Venlo' }])
      // The merge is in the log, as an action of the import.
      expect(await database.db.select().from(auditLog)).toMatchObject([
        { action: 'club.merge', itemId: stays, userId: null },
      ])
      // The match of the old fansite now finds its club by the old name, and no club is made.
      expect(await oldSiteClubIds(database.db, [old('vvv', 'VVV')])).toEqual(new Map([['vvv', stays]]))
      expect(goes).not.toBe(stays)
    })

    it('changes nothing in a second run', async () => {
      await twoClubs()
      await run([old('vvv', 'VVV')])

      const before = [await rows(), await names(), await database.db.select().from(matches)]
      const second = await run([old('vvv', 'VVV')])

      expect(second).toMatchObject({ changed: 0, created: 0, unchanged: 1 })
      expect(second.lines).toEqual([])
      expect([await rows(), await names(), await database.db.select().from(matches)]).toEqual(before)
      expect(await database.db.select().from(auditLog)).toHaveLength(1)
    })

    it('leaves two clubs that have an article each, and a club without the other, alone', async () => {
      await club('VVV-Venlo', 'vvv-venlo', 'VVV-Venlo')
      await club('VVV', 'vvv', 'VVV (andere club)')

      expect((await run([old('vvv', 'VVV')])).lines).toEqual([])
      expect(await rows()).toHaveLength(2)

      await database.pool.query('DELETE FROM clubs')
      await club('VVV', 'vvv')

      expect((await run([old('vvv', 'VVV')])).lines).toEqual([])
      expect(await rows()).toHaveLength(1)
    })
  })

  it('has only names in its list that are not listed twice, and codes that are in the files', async () => {
    const { clubs: oldClubs } = await readOldSiteData()
    const codes = new Set(oldClubs.map((one) => one.code))

    for (const code of Object.keys(oldSiteClubNames)) {
      expect(codes.has(code), code).toBe(true)
    }
    // A name of the list of full names is never in this list: that one is looked at first.
    const listed = new Set(clubFullNames.flatMap((entry) => [entry.name, ...entry.aliases]))

    for (const [code, name] of Object.entries(oldSiteClubNames)) {
      expect(listed.has(name), code).toBe(false)
    }
    expect(oldClubs.every((one) => oldSiteClubSchema.safeParse(one).success)).toBe(true)
  })
})

describe('the import of Wikipedia next to the clubs of the old fansite', () => {
  it('works with a club that has no article, and makes no second club of it', async () => {
    await run([old('fcbasel', 'FC Basel'), old('cambuurleeuwarden', 'Cambuur Lwd.')])

    const before = await rows()

    // The repair at the start of every run, without a Wikipedia to ask.
    expect(await repairKnownClubs(database.db, fetcherFor([]), null)).toEqual([])
    expect(await rows()).toEqual(before)

    // The next season that Wikipedia reads names the club again, now with an article.
    const book = await createClubBook(database.db, { fullNames: clubFullNames })
    const basel = await book.resolve({ name: 'FC Basel', page: 'FC Basel', season: '1995/96' })
    const cambuur = await book.resolve({ name: 'SC Cambuur', page: 'SC Cambuur', season: '1995/96' })

    expect(basel.events).toEqual(["article 'FC Basel' for club 'FC Basel'"])
    expect(cambuur.events).toEqual(["article 'SC Cambuur' for club 'SC Cambuur'"])
    expect(await rows()).toMatchObject([
      { id: basel.id, name: 'FC Basel', wikipediaPage: 'FC Basel' },
      { id: cambuur.id, name: 'SC Cambuur', wikipediaPage: 'SC Cambuur' },
    ])

    // The old spelling finds the same club.
    const again = await createClubBook(database.db, { fullNames: clubFullNames })

    expect((await again.resolve({ name: 'Cambuur Lwd.', page: null })).id).toBe(cambuur.id)
    expect(await rows()).toHaveLength(2)
    expect(await database.db.select().from(clubs).where(eq(clubs.name, 'SC Cambuur'))).toHaveLength(1)
  })
})
