import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { defaultKeptClub, mergeChosenClubs, planClubMerge } from './club-merge.ts'
import {
  auditLog,
  clubHomeGrounds,
  clubNamePeriods,
  clubNames,
  clubPages,
  clubs,
  feeds,
  itemClubs,
  items,
  leagueResults,
  matches,
  sources,
  stadiums,
  standings,
} from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  for (const table of [
    'audit_log',
    'sources',
    'matches',
    'item_clubs',
    'standings',
    'league_results',
    'club_home_grounds',
    'stadiums',
    'club_name_periods',
    'club_pages',
    'club_names',
    'clubs',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

const describe_ = () => 'samengevoegd'

async function addClub(values: typeof clubs.$inferInsert): Promise<number> {
  const [{ insertId }] = await database.db.insert(clubs).values(values)

  return insertId
}

async function addMatches(clubId: number, opponent: string, seasons: string[]) {
  for (const season of seasons) {
    await database.db.insert(matches).values({
      clubId,
      competition: 'Eredivisie',
      goalsAgainst: 0,
      goalsFor: 1,
      home: true,
      kickoffAt: new Date('2004-10-24T18:45:00Z'),
      matchDate: '2004-10-24',
      opponent,
      round: `Wedstrijd ${season}`,
      season,
      status: 'played',
    })
  }
}

async function addStadium(): Promise<number> {
  const [{ insertId }] = await database.db.insert(stadiums).values({})

  return insertId
}

const table = (season: string, position: number, club: string) => ({
  club,
  drawn: 0,
  goalDifference: 0,
  goalsAgainst: 0,
  goalsFor: 0,
  lost: 0,
  played: 0,
  points: 0,
  position,
  season,
  validOn: '2005-05-01',
  won: 0,
})

/**
 * VVV (the double, from the old site) and VVV-Venlo (the club with the number and the article).
 */
async function addVvv() {
  const venlo = await addClub({
    name: 'VVV-Venlo',
    slug: 'vvv-venlo',
    wikidataId: 'Q24689',
    wikipediaPage: 'VVV-Venlo',
  })
  const double = await addClub({ name: 'VVV', slug: 'vvv' })

  return { double, venlo }
}

describe('planClubMerge', () => {
  it('refuses one club twice, a club that is gone and two Wikidata numbers', async () => {
    const a = await addClub({ name: 'A', slug: 'a', wikidataId: 'Q1' })
    const b = await addClub({ name: 'B', slug: 'b', wikidataId: 'Q2' })

    expect(await planClubMerge(database.db, a, a)).toBe('same')
    expect(await planClubMerge(database.db, a, 99999)).toBe('missing')
    expect(await planClubMerge(database.db, a, b)).toBe('both-wikidata')
    await expect(planClubMerge(database.db, a, b, '2002')).rejects.toThrow('not a season')
  })

  it('counts what moves and writes nothing', async () => {
    const { double, venlo } = await addVvv()

    await addMatches(double, 'VVV', ['2002/03', '2003/04'])

    const plan = await planClubMerge(database.db, double, venlo)

    expect(plan).toMatchObject({ kept: { id: venlo }, matches: 2, names: ['VVV'], other: { id: double } })
    expect(await database.db.select().from(clubs)).toHaveLength(2)
  })
})

describe('defaultKeptClub', () => {
  it('keeps the number, then the article, then the most matches, then the oldest', async () => {
    const { double, venlo } = await addVvv()
    const [one, other] = (await database.db.select().from(clubs).orderBy(asc(clubs.id))) as [
      typeof clubs.$inferSelect,
      typeof clubs.$inferSelect,
    ]

    expect(await defaultKeptClub(database.db, one, other)).toBe(venlo)

    const first = await addClub({ name: 'Eerste', slug: 'eerste' })
    const second = await addClub({ name: 'Tweede', slug: 'tweede' })
    const rows = await database.db.select().from(clubs).orderBy(asc(clubs.id))
    const pick = (id: number) => rows.find((row) => row.id === id)!

    expect(await defaultKeptClub(database.db, pick(first), pick(second))).toBe(first)
    await addMatches(second, 'Tweede', ['2002/03'])
    expect(await defaultKeptClub(database.db, pick(first), pick(second))).toBe(second)
    expect(double).toBeGreaterThan(0)
  })
})

describe('mergeChosenClubs', () => {
  it('moves the matches, names, titles and the rest, and removes the club', async () => {
    const { double, venlo } = await addVvv()
    const stadium = await addStadium()
    const other = await addStadium()
    const [source] = await database.db
      .insert(sources)
      .values({ attribution: 'De Testkrant', domain: 'testkrant.test', kind: 'news', name: 'Testkrant' })
      .$returningId()
    const [feed] = await database.db
      .insert(feeds)
      .values({ sourceId: source!.id, url: 'https://testkrant.test/rss/' })
      .$returningId()
    const makeItem = async (key: string) => {
      const [row] = await database.db
        .insert(items)
        .values({
          feedId: feed!.id,
          key,
          publishedAt: new Date('2026-01-01T00:00:00Z'),
          relevance: 'relevant',
          sourceId: source!.id,
          title: key,
          url: `https://testkrant.test/${key}`,
        })
        .$returningId()

      return row!.id
    }
    const both = await makeItem('both')
    const onlyGone = await makeItem('only-gone')

    await addMatches(double, 'VVV', ['2002/03', '2003/04'])
    await addMatches(venlo, 'VVV-Venlo', ['2004/05'])
    await database.db.insert(clubNames).values([
      { clubId: double, name: 'Venlo FC' },
      { clubId: venlo, name: 'VVV Venlo' },
    ])
    await database.db.insert(clubPages).values([
      { clubId: venlo, page: 'VVV-Venlo' },
      { clubId: double, page: 'VVV' },
    ])
    await database.db.insert(clubHomeGrounds).values([
      { clubId: double, position: 0, stadiumId: stadium },
      { clubId: venlo, position: 0, stadiumId: stadium },
      { clubId: venlo, position: 1, stadiumId: other, startSeason: '2010/11' },
    ])
    await database.db.insert(itemClubs).values([
      { club: 'VVV', itemId: both },
      { club: 'VVV-Venlo', itemId: both },
      { club: 'VVV', itemId: onlyGone },
    ])
    await database.db
      .insert(standings)
      .values([table('2002/03', 5, 'VVV'), table('2002/03', 6, 'VVV-Venlo'), table('2003/04', 7, 'VVV')])
    await database.db.insert(leagueResults).values([
      {
        awayClub: 'VVV',
        awayGoals: 0,
        homeClub: 'Ajax',
        homeGoals: 1,
        playedOn: '2003-01-01',
        round: 1,
        season: '2002/03',
      },
      {
        awayClub: 'VVV-Venlo',
        awayGoals: 0,
        homeClub: 'Ajax',
        homeGoals: 1,
        playedOn: '2003-01-01',
        round: 1,
        season: '2002/03',
      },
      {
        awayClub: 'Ajax',
        awayGoals: 0,
        homeClub: 'VVV',
        homeGoals: 1,
        playedOn: '2003-02-01',
        round: 2,
        season: '2003/04',
      },
    ])

    const plan = await mergeChosenClubs(database.db, {
      describe: describe_,
      keptId: venlo,
      otherId: double,
      since: '2002/03',
      userId: null,
    })

    expect(plan).toMatchObject({ matches: 2 })
    expect(await database.db.select().from(clubs).where(eq(clubs.id, double))).toHaveLength(0)
    expect((await database.db.select().from(matches).where(eq(matches.clubId, venlo))).length).toBe(3)
    expect(
      (await database.db.select().from(clubNames).where(eq(clubNames.clubId, venlo))).map((row) => row.name).sort(),
    ).toEqual(['VVV', 'VVV Venlo', 'Venlo FC'])
    expect(
      (await database.db.select().from(clubPages).where(eq(clubPages.clubId, venlo))).map((row) => row.page).sort(),
    ).toEqual(['VVV', 'VVV-Venlo'])
    expect(await database.db.select().from(clubHomeGrounds)).toHaveLength(2)
    expect(
      (await database.db.select().from(itemClubs).orderBy(asc(itemClubs.itemId))).map((row) => [row.itemId, row.club]),
    ).toEqual([
      [both, 'VVV-Venlo'],
      [onlyGone, 'VVV-Venlo'],
    ])
    expect(
      (await database.db.select().from(standings).orderBy(asc(standings.season), asc(standings.position))).map(
        (row) => [row.season, row.club],
      ),
    ).toEqual([
      ['2002/03', 'VVV-Venlo'],
      ['2003/04', 'VVV-Venlo'],
    ])
    expect(
      (await database.db.select().from(leagueResults)).map((row) => `${row.homeClub}-${row.awayClub}`).sort(),
    ).toEqual(['Ajax-VVV-Venlo', 'VVV-Venlo-Ajax'])
    expect(
      (
        await database.db
          .select()
          .from(clubNamePeriods)
          .where(eq(clubNamePeriods.clubId, venlo))
          .orderBy(asc(clubNamePeriods.position))
      ).map((row) => [row.name, row.startSeason]),
    ).toEqual([
      ['VVV', null],
      ['VVV-Venlo', '2002/03'],
    ])
    expect(await database.db.select().from(auditLog)).toMatchObject([
      { action: 'club.merge', detail: 'samengevoegd', itemId: venlo, userId: null },
    ])
  })

  it('gives the club that stays the number and the article of the club that goes when it has none', async () => {
    const stays = await addClub({ name: 'Dordrecht', slug: 'dordrecht', wikidataId: null })
    const goes = await addClub({
      country: 'NL',
      countrySource: 'wikidata',
      name: 'FC Dordrecht',
      slug: 'fc-dordrecht',
      wikidataId: 'Q1045811',
      wikidataSource: 'wikipedia',
      wikipediaPage: 'FC Dordrecht',
    })

    await mergeChosenClubs(database.db, { describe: describe_, keptId: stays, otherId: goes, userId: null })

    const [row] = await database.db.select().from(clubs)

    expect(row).toMatchObject({
      country: 'NL',
      id: stays,
      wikidataId: 'Q1045811',
      wikidataSource: 'wikipedia',
      wikipediaPage: 'FC Dordrecht',
    })
    expect((await database.db.select().from(clubNames)).map((one) => one.name)).toEqual(['FC Dordrecht'])
    expect(await database.db.select().from(clubNamePeriods)).toHaveLength(0)
  })

  it('makes the article of the club that goes a title when the club that stays has one', async () => {
    const stays = await addClub({ name: 'A', slug: 'a', wikipediaPage: 'A (club)' })
    const goes = await addClub({ name: 'B', slug: 'b', wikipediaPage: 'B (club)' })

    await mergeChosenClubs(database.db, { describe: describe_, keptId: stays, otherId: goes, userId: null })

    expect(await database.db.select().from(clubs)).toMatchObject([{ id: stays, wikipediaPage: 'A (club)' }])
    expect((await database.db.select().from(clubPages)).map((row) => row.page)).toEqual(['B (club)'])
  })

  it('moves the list of names of the club that goes and puts the name that stays after it', async () => {
    const stays = await addClub({ name: 'Nieuw', slug: 'nieuw' })
    const goes = await addClub({ name: 'Oud', slug: 'oud' })

    await database.db.insert(clubNamePeriods).values({ clubId: goes, name: 'Oud', position: 0 })
    await mergeChosenClubs(database.db, {
      describe: describe_,
      keptId: stays,
      otherId: goes,
      since: '1999/00',
      userId: null,
    })

    expect(
      (await database.db.select().from(clubNamePeriods).orderBy(asc(clubNamePeriods.position))).map((row) => [
        row.clubId,
        row.name,
        row.startSeason,
      ]),
    ).toEqual([
      [stays, 'Oud', null],
      [stays, 'Nieuw', '1999/00'],
    ])
  })

  it('leaves the name another club has alone, and writes nothing for a refusal', async () => {
    const a = await addClub({ name: 'A', slug: 'a', wikidataId: 'Q1' })
    const b = await addClub({ name: 'B', slug: 'b', wikidataId: 'Q2' })

    expect(await mergeChosenClubs(database.db, { describe: describe_, keptId: a, otherId: b, userId: null })).toBe(
      'both-wikidata',
    )
    expect(await mergeChosenClubs(database.db, { describe: describe_, keptId: a, otherId: a, userId: null })).toBe(
      'same',
    )
    expect(await database.db.select().from(clubs)).toHaveLength(2)
    expect(await database.db.select().from(auditLog)).toHaveLength(0)
  })
})
