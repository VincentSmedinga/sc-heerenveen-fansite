import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { StadiumInput } from './stadium-admin.ts'
import type { TestDatabase } from './test-database.ts'

import { adminUsers, auditLog, clubHomeGrounds, clubs, stadiumNames, stadiums } from './schema.ts'
import {
  findAdminStadium,
  listAdminStadiums,
  listClubHomeGrounds,
  resetStadiumToWikidata,
  saveClubHomeGrounds,
  saveStadium,
  setClubWikidataId,
} from './stadium-admin.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let adminId: number
let azId: number
let nacId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM club_home_grounds')
  await database.pool.query('DELETE FROM stadium_names')
  await database.pool.query('DELETE FROM stadiums')
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM clubs')
  await database.pool.query('DELETE FROM admin_users')
  await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'editor')")
  adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  await database.db.insert(clubs).values([
    { name: 'Oefenstad AZ', slug: 'oefenstad-az' },
    { name: 'Oefenstad NAC', slug: 'oefenstad-nac', wikidataId: 'Q42' },
  ])
  azId = (await database.db.select().from(clubs).where(eq(clubs.slug, 'oefenstad-az')))[0]?.id ?? 0
  nacId = (await database.db.select().from(clubs).where(eq(clubs.slug, 'oefenstad-nac')))[0]?.id ?? 0
})

const name = (text: string, more: Partial<StadiumInput['names'][number]> = {}) => ({
  name: text,
  note: null,
  startDay: null,
  startSeason: null,
  ...more,
})

const input = (more: Partial<StadiumInput> = {}): StadiumInput => ({
  latitude: null,
  longitude: null,
  names: [name('Oefenpark')],
  place: null,
  postcode: null,
  street: null,
  ...more,
})

const actions = async () => (await database.db.select().from(auditLog)).map((row) => row.action).toSorted()

describe('saveStadium', () => {
  it('makes a stadium with its names in order and logs it with counts only', async () => {
    const result = await saveStadium(
      database.db,
      adminId,
      null,
      input({
        latitude: '52.960000',
        longitude: '5.940000',
        names: [name('Oefenpark'), name('Nieuwe Arena', { note: 'Geheim', startSeason: '2000/01' })],
        place: 'Oefenstad',
      }),
    )

    expect(result).toMatchObject({ created: true, status: 'saved' })

    const found = await findAdminStadium(database.db, result.status === 'saved' ? result.id : 0)

    expect(found?.names.map((line) => line.name)).toEqual(['Oefenpark', 'Nieuwe Arena'])
    expect(found?.stadium).toMatchObject({ place: 'Oefenstad', placeSource: 'manual' })
    expect(await actions()).toEqual(['ground-name.save', 'ground.create'])

    const log = await database.db.select().from(auditLog)

    expect(JSON.stringify(log)).not.toContain('Geheim')
    expect(log.find((row) => row.action === 'ground-name.save')?.detail).toBe('2 namen, 1 met toelichting')
  })

  it('makes the place and the coordinates manual when they change, and leaves the source when only the address does', async () => {
    await database.db.insert(stadiums).values({
      latitude: '52.000000',
      longitude: '5.000000',
      place: 'Oud',
      placeSource: 'wikidata',
      wikidataId: 'Q1',
    })

    const id = (await database.db.select().from(stadiums))[0]?.id ?? 0
    const same = { latitude: '52.000000', longitude: '5.000000', place: 'Oud' }

    await saveStadium(database.db, adminId, id, input({ ...same, postcode: '1234 AB', street: 'Weg 1' }))
    expect((await findAdminStadium(database.db, id))?.stadium).toMatchObject({
      placeSource: 'wikidata',
      postcode: '1234 AB',
    })

    await saveStadium(database.db, adminId, id, input({ ...same, place: 'Nieuw' }))
    expect((await findAdminStadium(database.db, id))?.stadium).toMatchObject({ place: 'Nieuw', placeSource: 'manual' })

    await saveStadium(database.db, adminId, id, input())
    expect((await findAdminStadium(database.db, id))?.stadium).toMatchObject({ placeSource: null })
  })

  it('says missing for a stadium that is gone and writes nothing', async () => {
    expect(await saveStadium(database.db, adminId, 999_999, input())).toEqual({ status: 'missing' })
    expect(await actions()).toEqual([])
  })

  it('lists the stadiums with the name they have now', async () => {
    await saveStadium(
      database.db,
      adminId,
      null,
      input({ names: [name('Oud'), name('Nieuw', { startSeason: '2010/11' })] }),
    )

    expect(await listAdminStadiums(database.db)).toEqual([
      expect.objectContaining({ hasAddress: false, hasCoordinates: false, name: 'Nieuw' }),
    ])
  })
})

describe('resetStadiumToWikidata', () => {
  async function stadiumWith(source: 'manual' | 'wikidata', clubSource: 'manual' | 'wikidata' | null) {
    await database.db
      .update(clubs)
      .set({ homeGroundsSource: clubSource, stadiumsReadAt: new Date('2026-11-01T00:00:00Z') })
      .where(eq(clubs.id, azId))
    await database.db.insert(stadiums).values({
      latitude: '52.000000',
      longitude: '5.000000',
      place: 'Eigen',
      placeSource: source,
      wikidataId: 'Q7',
    })

    const id = (await database.db.select().from(stadiums))[0]?.id ?? 0

    await database.db.insert(clubHomeGrounds).values({ clubId: azId, position: 0, stadiumId: id })

    return id
  }

  it('empties the place and lets the importer read the clubs again', async () => {
    const id = await stadiumWith('manual', 'wikidata')

    expect(await resetStadiumToWikidata(database.db, adminId, id)).toEqual({ clubs: 1, status: 'done' })
    expect((await findAdminStadium(database.db, id))?.stadium).toMatchObject({
      latitude: null,
      place: null,
      placeSource: null,
    })
    expect((await database.db.select().from(clubs).where(eq(clubs.id, azId)))[0]?.stadiumsReadAt).toBeNull()
    expect(await actions()).toEqual(['ground.edit'])
  })

  it('says so when only clubs the editors set use the stadium', async () => {
    const id = await stadiumWith('manual', 'manual')

    expect(await resetStadiumToWikidata(database.db, adminId, id)).toEqual({ status: 'manual-source-only' })
  })

  it('changes nothing for a place of Wikidata', async () => {
    const id = await stadiumWith('wikidata', null)

    expect(await resetStadiumToWikidata(database.db, adminId, id)).toEqual({ status: 'unchanged' })
    expect(await actions()).toEqual([])
  })
})

describe('saveClubHomeGrounds', () => {
  it('saves the grounds in order, sets the source to manual and logs counts only', async () => {
    await saveStadium(database.db, adminId, null, input({ names: [name('Een')] }))
    await saveStadium(database.db, adminId, null, input({ names: [name('Twee')] }))

    const [one, two] = (await database.db.select().from(stadiums)).map((row) => row.id) as [number, number]
    const rows = [
      { note: null, stadiumId: one, startDay: null, startSeason: null },
      { note: 'Geheime toelichting', stadiumId: two, startDay: null, startSeason: '2005/06' },
    ]

    expect(await saveClubHomeGrounds(database.db, adminId, azId, rows)).toBe('saved')
    expect((await listClubHomeGrounds(database.db, azId)).map((row) => row.stadiumId)).toEqual([one, two])
    expect((await database.db.select().from(clubs).where(eq(clubs.id, azId)))[0]?.homeGroundsSource).toBe('manual')
    expect((await database.db.select().from(clubs).where(eq(clubs.id, nacId)))[0]?.homeGroundsSource).toBeNull()

    const log = (await database.db.select().from(auditLog)).filter((row) => row.action === 'home-ground.save')

    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ detail: '2 thuisvelden, 1 met toelichting', itemId: azId })
    expect(JSON.stringify(log)).not.toContain('Geheime')
  })

  it('writes nothing for a stadium that does not exist or a club that is gone', async () => {
    const row = { note: null, stadiumId: 999_999, startDay: null, startSeason: null }

    expect(await saveClubHomeGrounds(database.db, adminId, azId, [row])).toBe('unknown-stadium')
    expect(await saveClubHomeGrounds(database.db, adminId, 999_999, [])).toBe('missing')
    expect(await database.db.select().from(clubHomeGrounds)).toEqual([])
    expect((await database.db.select().from(clubs).where(eq(clubs.id, azId)))[0]?.homeGroundsSource).toBeNull()
  })

  it('keeps the names of a stadium when its grounds change', async () => {
    await saveStadium(database.db, adminId, null, input())
    expect(await database.db.select().from(stadiumNames)).toHaveLength(1)
  })
})

describe('setClubWikidataId', () => {
  it('sets the number, clears the reads and logs the change', async () => {
    await database.db
      .update(clubs)
      .set({ stadiumsReadAt: new Date(), wikidataReadAt: new Date() })
      .where(eq(clubs.id, azId))

    expect(await setClubWikidataId(database.db, adminId, azId, 'Q99')).toEqual({ name: 'Oefenstad AZ', status: 'done' })

    const [club] = await database.db.select().from(clubs).where(eq(clubs.id, azId))

    expect(club).toMatchObject({
      stadiumsReadAt: null,
      wikidataId: 'Q99',
      wikidataReadAt: null,
      wikidataSource: 'manual',
    })
    expect((await database.db.select().from(auditLog))[0]).toMatchObject({
      action: 'club.edit',
      detail: 'Oefenstad AZ, Wikidata-nummer van de club: geen → Q99',
    })
  })

  it('makes a number found by name the editors’ own, and a number they take away is not searched for again', async () => {
    const now = new Date('2026-11-17T10:00:00Z')

    await database.db.update(clubs).set({ wikidataId: 'Q77', wikidataSource: 'name' }).where(eq(clubs.id, azId))
    await setClubWikidataId(database.db, adminId, azId, 'Q78', now)

    expect((await database.db.select().from(clubs).where(eq(clubs.id, azId)))[0]).toMatchObject({
      wikidataId: 'Q78',
      wikidataSearchedAt: null,
      wikidataSource: 'manual',
    })

    await setClubWikidataId(database.db, adminId, azId, null, now)

    expect((await database.db.select().from(clubs).where(eq(clubs.id, azId)))[0]).toMatchObject({
      wikidataId: null,
      wikidataSearchedAt: now,
      wikidataSource: null,
    })
  })

  it('refuses a number that another club has, and does nothing for the same number', async () => {
    expect(await setClubWikidataId(database.db, adminId, azId, 'Q42')).toEqual({
      club: 'Oefenstad NAC',
      status: 'taken',
    })
    expect(await setClubWikidataId(database.db, adminId, nacId, 'Q42')).toMatchObject({ status: 'unchanged' })
    expect(await actions()).toEqual([])
  })
})
