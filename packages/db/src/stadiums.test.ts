import type { RowDataPacket } from 'mysql2/promise'

import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { listClubMatches } from './queries.ts'
import { adminUsers, clubHomeGrounds, clubs, matchEdits, matches, stadiumNames, stadiums } from './schema.ts'
import {
  findStadium,
  hasChosenStadium,
  linkMatchesToStadiums,
  linkMatchToStadium,
  listClubStadiumLines,
  migrateStadiums,
  nameKey,
  replaceHomeGrounds,
  seedStadiums,
  startDate,
} from './stadiums.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM match_edits')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM club_home_grounds')
  await database.pool.query('DELETE FROM stadium_names')
  await database.pool.query('DELETE FROM stadiums')
  await database.pool.query('DELETE FROM clubs')
  await database.pool.query('DELETE FROM admin_users')
})

let round = 0

async function clubId(name: string): Promise<number> {
  const [found] = await database.db.select({ id: clubs.id }).from(clubs).where(eq(clubs.name, name))

  return found?.id ?? 0
}

/** A stadium with these names in order, each with a start season (the first may lack one). */
async function makeStadium(...names: [string, null | string][]): Promise<number> {
  const [{ insertId }] = await database.db.insert(stadiums).values({})

  await database.db
    .insert(stadiumNames)
    .values(names.map(([name, startSeason], position) => ({ name, position, stadiumId: insertId, startSeason })))

  return insertId
}

/** A played match of the season of its date, against a club that `withClubs` makes. */
async function played(
  opponent: string,
  parts: { home?: boolean; matchDate: string; stadium: null | string },
): Promise<number> {
  round += 1

  const row: Omit<NewMatch, 'clubId'> = {
    competition: 'Eredivisie',
    goalsAgainst: 0,
    goalsFor: 1,
    home: parts.home ?? false,
    kickoffAt: new Date(`${parts.matchDate}T15:00:00Z`),
    matchDate: parts.matchDate,
    opponent,
    round: `Speelronde ${round}`,
    season:
      Number(parts.matchDate.slice(5, 7)) >= 7
        ? `${parts.matchDate.slice(0, 4)}/${String(Number(parts.matchDate.slice(2, 4)) + 1).padStart(2, '0')}`
        : `${Number(parts.matchDate.slice(0, 4)) - 1}/${parts.matchDate.slice(2, 4)}`,
    stadium: parts.stadium,
    status: 'played',
  }
  const [values] = await withClubs(database.db, [row])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()

  return inserted?.id ?? 0
}

async function stadiumOf(matchId: number) {
  const [row] = await database.db.select({ id: matches.stadiumId }).from(matches).where(eq(matches.id, matchId))

  return row?.id ?? null
}

describe('nameKey', () => {
  it('makes spellings of one name equal, and different names different', () => {
    expect(nameKey('Koning Willem II-stadion')).toBe(nameKey('Koning Willem II Stadion'))
    expect(nameKey('Sparta-Stadion Het Kasteel')).toBe(nameKey('Spartastadion Het Kasteel'))
    expect(nameKey('Estádio José Alvalade')).toBe(nameKey('Estadio Jose Alvalade'))
    expect(nameKey('Het Kasteel')).not.toBe(nameKey('Spartastadion Het Kasteel'))
  })
})

describe('startDate', () => {
  it('counts a season from 1 July and takes a day as it is', () => {
    expect(startDate({ startDay: null, startSeason: '1994/95' })).toBe('1994-07-01')
    expect(startDate({ startDay: '1986-08-01', startSeason: null })).toBe('1986-08-01')
    expect(startDate({ startDay: null, startSeason: null })).toBeNull()
  })
})

describe('findStadium', () => {
  it('finds the one stadium that had the name on the day, whoever was at home', async () => {
    const id = await makeStadium(['Oefenstadion', null])
    await makeStadium(['Ander Stadion', null])

    expect(await findStadium(database.db, { homeClubId: null, matchDate: '2020-01-01', name: 'oefenstadion' })).toBe(id)
  })

  it('keeps a name that matches nothing, and a name before the stadium had it, without a stadium', async () => {
    await makeStadium(['Oefenstadion', null], ['Nieuw Stadion', '2015/16'])

    expect(await findStadium(database.db, { homeClubId: null, matchDate: '2020-01-01', name: 'Nergens' })).toBeNull()
    expect(
      await findStadium(database.db, { homeClubId: null, matchDate: '2014-05-01', name: 'Nieuw Stadion' }),
    ).toBeNull()
    expect(
      await findStadium(database.db, { homeClubId: null, matchDate: '2015-07-01', name: 'Nieuw Stadion' }),
    ).not.toBeNull()
  })

  it('answers to the old name of a renamed stadium', async () => {
    const id = await makeStadium(['Oud Stadion', null], ['Sponsor Stadion', '2012/13'])

    expect(await findStadium(database.db, { homeClubId: null, matchDate: '2020-01-01', name: 'Oud Stadion' })).toBe(id)
  })

  it('tells two grounds with the same name apart by the day, then by the ground in use of the home club', async () => {
    const old = await makeStadium(['Sportpark Noord', null], ['Abe Lenstra Stadion', '1986/87'])
    const modern = await makeStadium(['Abe Lenstra Stadion', '1994/95'])

    await replaceHomeGrounds(database.db, null, [
      { stadiumId: old, startDay: null, startSeason: null },
      { stadiumId: modern, startDay: null, startSeason: '1994/95' },
    ])

    const name = 'Abe Lenstra Stadion'

    // Only the old ground had the name in 1992: no home club is needed.
    expect(await findStadium(database.db, { homeClubId: null, matchDate: '1992-03-01', name })).toBe(old)
    // Both had it in 2000: sc Heerenveen played on the new one.
    expect(await findStadium(database.db, { homeClubId: null, matchDate: '2000-03-01', name })).toBe(modern)
  })

  it('gives no stadium for an away match when the opponent cannot decide between two grounds', async () => {
    const first = await makeStadium(['Oefenveld', null])
    const second = await makeStadium(['Oefenveld', '2010/11'])
    await database.db.insert(clubs).values([
      { name: 'Oefenstad', slug: 'oefenstad' },
      { name: 'Verhuisd', slug: 'verhuisd' },
    ])

    const oefenstad = await clubId('Oefenstad')
    const verhuisd = await clubId('Verhuisd')

    await replaceHomeGrounds(database.db, verhuisd, [
      { stadiumId: first, startDay: null, startSeason: null },
      { stadiumId: second, startDay: null, startSeason: '2010/11' },
    ])

    // A club with no grounds, and one whose ground in use is not one of the two.
    expect(
      await findStadium(database.db, { homeClubId: oefenstad, matchDate: '2012-01-01', name: 'Oefenveld' }),
    ).toBeNull()
    // The club that moved: before and after.
    expect(await findStadium(database.db, { homeClubId: verhuisd, matchDate: '2012-01-01', name: 'Oefenveld' })).toBe(
      second,
    )
    expect(await findStadium(database.db, { homeClubId: verhuisd, matchDate: '2010-05-01', name: 'Oefenveld' })).toBe(
      first,
    )
  })
})

describe('replaceHomeGrounds', () => {
  it('keeps one series for sc Heerenveen, which has no club', async () => {
    const one = await makeStadium(['Een', null])
    const two = await makeStadium(['Twee', null])

    await replaceHomeGrounds(database.db, null, [{ stadiumId: one, startDay: null, startSeason: null }])
    await replaceHomeGrounds(database.db, null, [
      { stadiumId: one, startDay: null, startSeason: null },
      { stadiumId: two, startDay: null, startSeason: '1994/95' },
    ])

    const rows = await database.db.select().from(clubHomeGrounds)

    expect(rows.map((row) => [row.clubId, row.stadiumId, row.position])).toEqual([
      [null, one, 0],
      [null, two, 1],
    ])
  })
})

describe('the rules of a row', () => {
  it('lets a name begin with a season or a day, never both, and only the first without a start', async () => {
    const id = await makeStadium(['Een', null])
    const insert = (values: object) =>
      database.db.insert(stadiumNames).values({ name: 'Twee', position: 1, stadiumId: id, ...values })

    await expect(insert({ startDay: '2020-01-01', startSeason: '2020/21' })).rejects.toThrow()
    await expect(insert({})).rejects.toThrow()
    await expect(insert({ startSeason: '2020' })).rejects.toThrow()
    await expect(insert({ startDay: '2020-01-01' })).resolves.toBeDefined()
  })

  it('wants the coordinates in a pair', async () => {
    await expect(database.db.insert(stadiums).values({ latitude: '53.0', longitude: null })).rejects.toThrow()
    await expect(database.db.insert(stadiums).values({ latitude: '53.0', longitude: '5.9' })).resolves.toBeDefined()
  })

  it('gives each table the character set of the others', async () => {
    const [rows] = await database.pool.query<RowDataPacket[]>(
      "SELECT table_name AS name, table_collation AS collation FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('stadiums', 'stadium_names', 'club_home_grounds')",
    )

    expect(rows).toHaveLength(3)
    expect(rows.every((row) => row['collation'] === 'utf8mb4_unicode_ci')).toBe(true)
  })

  it('leaves a match without a stadium when its stadium goes', async () => {
    const id = await makeStadium(['Oefenstadion', null])
    const matchId = await played('Oefenstad', { matchDate: '2020-01-01', stadium: 'Oefenstadion' })

    await database.db.update(matches).set({ stadiumId: id }).where(eq(matches.id, matchId))
    await database.db.delete(stadiums).where(eq(stadiums.id, id))

    expect(await stadiumOf(matchId)).toBeNull()
  })
})

describe('seedStadiums and linkMatchesToStadiums', () => {
  it('makes the two stadiums of sc Heerenveen and links its home matches by the ground in use', async () => {
    const home = await played('Oefenstad', { home: true, matchDate: '2010-03-01', stadium: 'Abe Lenstra Stadion' })

    await seedStadiums(database.db)
    await linkMatchesToStadiums(database.db)

    const names = await database.db.select().from(stadiumNames)
    const grounds = await database.db.select().from(clubHomeGrounds)

    expect(names.map((row) => row.name).sort()).toEqual([
      'Abe Lenstra Stadion',
      'Abe Lenstra Stadion',
      'Sportpark Noord',
    ])
    expect(grounds.map((row) => [row.clubId, row.position, row.startSeason])).toEqual([
      [null, 0, null],
      [null, 1, '1994/95'],
    ])
    expect(grounds[1]?.note).toContain('20 augustus 1994')
    // The new ground, the second in the series.
    expect(await stadiumOf(home)).toBe(grounds[1]?.stadiumId)
  })

  it('makes one stadium of the spellings of a name and of a renamed ground, and a home club of its main user', async () => {
    const first = await played('Willem II', { matchDate: '2009-10-25', stadium: 'Koning Willem II Stadion' })
    const second = await played('Willem II', { matchDate: '2014-10-04', stadium: 'Koning Willem II-stadion' })
    const earlier = await played('Willem II', { matchDate: '2008-12-07', stadium: 'Willem II Stadion' })
    const other = await played('Oefenstad', { matchDate: '2012-02-01', stadium: 'Ander Stadion' })
    // A neutral ground: a match of another club there, which is not most of the matches.
    const neutral = await played('Elders', { matchDate: '2015-02-01', stadium: 'Koning Willem II Stadion' })

    await seedStadiums(database.db)
    await linkMatchesToStadiums(database.db)

    const ids = await Promise.all([first, second, earlier, neutral].map(stadiumOf))

    expect(new Set(ids).size).toBe(1)
    expect(ids[0]).not.toBeNull()
    expect(await stadiumOf(other)).not.toBe(ids[0])

    const names = await database.db.select().from(stadiumNames).where(eq(stadiumNames.stadiumId, ids[0]!))

    expect(names.map((row) => [row.name, row.startSeason])).toEqual([
      ['Willem II Stadion', null],
      ['Koning Willem II Stadion', '2009/10'],
    ])

    const grounds = await database.db.select().from(clubHomeGrounds).where(eq(clubHomeGrounds.stadiumId, ids[0]!))

    expect(grounds.map((row) => row.clubId)).toEqual([await clubId('Willem II')])
  })

  it('does nothing the second time, and links only a match that has no stadium', async () => {
    const id = await played('Oefenstad', { matchDate: '2012-02-01', stadium: 'Ander Stadion' })

    await migrateStadiums(database.db)

    const before = await database.db.select().from(stadiums)
    const kept = await stadiumOf(id)

    await database.db.update(matches).set({ stadium: 'Nergens' }).where(eq(matches.id, id))
    await migrateStadiums(database.db)

    expect(await database.db.select().from(stadiums)).toEqual(before)
    expect(await stadiumOf(id)).toBe(kept)
    expect(await linkMatchesToStadiums(database.db)).toEqual({ linked: 0, unlinked: 0 })
  })

  it('leaves a match that is not certain without a stadium and says so', async () => {
    const uncertain = await played('Oefenstad', { matchDate: '2012-02-01', stadium: 'Ander Stadion' })

    await seedStadiums(database.db)
    await database.db
      .update(matches)
      .set({ stadium: 'Onbekend Stadion', stadiumId: null })
      .where(eq(matches.id, uncertain))

    expect(await linkMatchesToStadiums(database.db)).toEqual({ linked: 0, unlinked: 1 })
    expect(await stadiumOf(uncertain)).toBeNull()
  })
})

describe('linkMatchToStadium', () => {
  it('follows the text of the match, and empties the link when the text goes', async () => {
    await makeStadium(['Oefenstadion', null])

    const id = await played('Oefenstad', { matchDate: '2020-01-01', stadium: 'Oefenstadion' })
    expect(await linkMatchToStadium(database.db, id)).not.toBeNull()
    expect(await stadiumOf(id)).not.toBeNull()
    await database.db.update(matches).set({ stadium: null }).where(eq(matches.id, id))
    expect(await linkMatchToStadium(database.db, id)).toBeNull()
    expect(await stadiumOf(id)).toBeNull()
  })
})

describe('linkMatchToStadium and a stadium the editors chose', () => {
  it('keeps the stadium of a match whose facts the editors entered, and follows the text again without them', async () => {
    const chosen = await makeStadium(['Neutraal Veld', null])

    await makeStadium(['Oefenstadion', null])

    const id = await played('Oefenstad', { matchDate: '2020-01-01', stadium: 'Oefenstadion' })

    await database.db.update(matches).set({ stadiumId: chosen }).where(eq(matches.id, id))
    // Without the marker the text decides.
    expect(await linkMatchToStadium(database.db, id)).not.toBe(chosen)

    await database.db.update(matches).set({ stadiumId: chosen }).where(eq(matches.id, id))
    const [user] = await database.db
      .insert(adminUsers)
      .values({ email: 'redacteur@example.test', role: 'editor' })
      .$returningId()

    await database.db.insert(matchEdits).values({
      beforeGoals: '[]',
      beforeMatch: '{}',
      editedAt: new Date(),
      editedBy: user?.id ?? 0,
      factsEdited: true,
      matchId: id,
    })
    expect(await linkMatchToStadium(database.db, id)).toBe(chosen)
    expect(await stadiumOf(id)).toBe(chosen)
  })
})

describe('hasChosenStadium', () => {
  it('is true only for a stadium that differs from the text, in a match whose facts the editors entered', async () => {
    const own = await makeStadium(['Oefenstadion', null])
    const other = await makeStadium(['Neutraal Veld', null])
    const id = await played('Oefenstad', { matchDate: '2020-01-01', stadium: 'Oefenstadion' })
    const [user] = await database.db
      .insert(adminUsers)
      .values({ email: 'keuze@example.test', role: 'editor' })
      .$returningId()

    await database.db.update(matches).set({ stadiumId: other }).where(eq(matches.id, id))
    expect(await hasChosenStadium(database.db, id)).toBe(false)
    await database.db.insert(matchEdits).values({
      beforeGoals: '[]',
      beforeMatch: '{}',
      editedAt: new Date(),
      editedBy: user?.id ?? 0,
      factsEdited: true,
      matchId: id,
    })
    expect(await hasChosenStadium(database.db, id)).toBe(true)
    await database.db.update(matches).set({ stadiumId: own }).where(eq(matches.id, id))
    expect(await hasChosenStadium(database.db, id)).toBe(false)
    // A match without a stadium has no choice.
    await database.db.update(matches).set({ stadiumId: null }).where(eq(matches.id, id))
    expect(await hasChosenStadium(database.db, id)).toBe(false)
  })
})

describe('the name of the stadium on the day of the match', () => {
  async function stadiumTextOf(club: string, day: string) {
    const rows = await listClubMatches(database.db, await clubId(club))

    return rows.find((row) => row.matchDate === day)?.stadium
  }

  it('is the last name the stadium had by then, or the text of the source without a stadium', async () => {
    const id = await makeStadium(['Oud Veld', null], ['Nieuwe Arena', '2006/07'])

    await played('Oefenstad', { matchDate: '2005-10-10', stadium: 'Oud Veld' })
    await played('Oefenstad', { matchDate: '2007-10-10', stadium: 'Oud Veld' })
    await played('Oefenstad', { matchDate: '2008-10-10', stadium: 'Een Veld Zonder Stadion' })
    await database.db.update(matches).set({ stadiumId: id }).where(eq(matches.matchDate, '2005-10-10'))
    await database.db.update(matches).set({ stadiumId: id }).where(eq(matches.matchDate, '2007-10-10'))

    expect(await stadiumTextOf('Oefenstad', '2005-10-10')).toBe('Oud Veld')
    expect(await stadiumTextOf('Oefenstad', '2007-10-10')).toBe('Nieuwe Arena')
    expect(await stadiumTextOf('Oefenstad', '2008-10-10')).toBe('Een Veld Zonder Stadion')
  })

  it('begins a name on its day, not on the first of July of its season, when it has a day', async () => {
    const [{ insertId }] = await database.db.insert(stadiums).values({})

    await database.db.insert(stadiumNames).values([
      { name: 'Eerst', position: 0, stadiumId: insertId },
      { name: 'Daarna', position: 1, stadiumId: insertId, startDay: '2001-03-05' },
    ])
    await played('Oefenstad', { matchDate: '2001-03-04', stadium: 'Eerst' })
    await played('Oefenstad', { matchDate: '2001-03-05', stadium: 'Eerst' })
    await database.db.update(matches).set({ stadiumId: insertId })

    expect(await stadiumTextOf('Oefenstad', '2001-03-04')).toBe('Eerst')
    expect(await stadiumTextOf('Oefenstad', '2001-03-05')).toBe('Daarna')
  })
})

describe('listClubStadiumLines', () => {
  async function ground(
    club: string,
    rows: { note?: string; stadiumId: number; startDay?: string; startSeason?: string }[],
  ) {
    const clubIdValue = await clubId(club)

    await database.db.insert(clubHomeGrounds).values(
      rows.map((row, position) => ({
        clubId: clubIdValue,
        note: row.note ?? null,
        position,
        stadiumId: row.stadiumId,
        startDay: row.startDay ?? null,
        startSeason: row.startSeason ?? null,
      })),
    )

    return clubIdValue
  }

  beforeEach(async () => {
    await database.db.insert(clubs).values({ name: 'Oefenstad', slug: 'oefenstad' })
  })

  it('is empty for a club without home grounds', async () => {
    expect(await listClubStadiumLines(database.db, await clubId('Oefenstad'))).toEqual([])
  })

  it('gives each ground with the names its stadium had while the club played there', async () => {
    const sportpark = await makeStadium(['Sportpark', null], ['Proef Arena', '2020/21'])
    const temporary = await makeStadium(['Stadion Tijdelijk', null])
    const club = await ground('Oefenstad', [
      { stadiumId: sportpark },
      { note: 'Tijdelijk elders.', stadiumId: temporary, startDay: '2019-08-10' },
      { stadiumId: sportpark, startSeason: '2020/21' },
    ])

    expect(await listClubStadiumLines(database.db, club)).toEqual([
      // The name from 2020/21 began after the club left the sportpark, so it is not here.
      { name: 'Sportpark', note: null, startDay: null, startSeason: null },
      { name: 'Stadion Tijdelijk', note: 'Tijdelijk elders.', startDay: '2019-08-10', startSeason: null },
      // The club came back when the stadium had its new name, so the old name is left out.
      { name: 'Proef Arena', note: null, startDay: null, startSeason: '2020/21' },
    ])
  })

  it('gives a renamed stadium a line for each name, with the start of the name', async () => {
    const stadium = await makeStadium(['Sportpark', null], ['Proef Arena', '2012/13'], ['Proef Park', '2020/21'])
    const club = await ground('Oefenstad', [{ stadiumId: stadium }])

    expect(await listClubStadiumLines(database.db, club)).toEqual([
      { name: 'Sportpark', note: null, startDay: null, startSeason: null },
      { name: 'Proef Arena', note: null, startDay: null, startSeason: '2012/13' },
      { name: 'Proef Park', note: null, startDay: null, startSeason: '2020/21' },
    ])
  })
})
