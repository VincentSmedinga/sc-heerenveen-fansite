import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { mergeChosenPersons } from './person-merge.ts'
import {
  findPlayerBySlug,
  isPlayerSlug,
  lostLetters,
  personSlug,
  playerSlugs,
  slugLetters,
  updatePlayerAddresses,
} from './person-slugs.ts'
import { persons, personSlugs, players } from './schema.ts'
import { madeUpSquad } from './seed.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  for (const table of ['players', 'persons']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

// Every person below is made up.
async function addPerson(name: null | string, { birthDate = null as null | string, season = '2004/05' } = {}) {
  const [inserted] = await database.db.insert(persons).values({ birthDate, name }).$returningId()
  const id = inserted!.id

  if (season !== '') {
    await database.db
      .insert(players)
      .values({ name: name ?? 'Speler Zondernaam', personId: id, searchTerm: 'x', season })
  }

  return id
}

async function slugOf(personId: number) {
  const [row] = await database.db.select({ slug: persons.slug }).from(persons).where(eq(persons.id, personId))

  return row?.slug
}

async function slugsOf(personId: number) {
  const rows = await database.db
    .select({ slug: personSlugs.slug })
    .from(personSlugs)
    .where(eq(personSlugs.personId, personId))
    .orderBy(asc(personSlugs.slug))

  return rows.map((row) => row.slug)
}

describe('personSlug', () => {
  it('writes a name in lowercase letters without accents, with hyphens', () => {
    expect(personSlug('Jan de Vries')).toBe('jan-de-vries')
    expect(personSlug('Alfreð Finnbogason')).toBe('alfred-finnbogason')
    expect(personSlug('Uğur Yıldırım')).toBe('ugur-yildirim')
    expect(personSlug("Jan-Harm O'Neill")).toBe('jan-harm-oneill')
    expect(personSlug('Ståle Sørensen')).toBe('stale-sorensen')
    expect(personSlug('…')).toBe('')
  })

  it.each([
    ['đ', 'Đuričić', 'djuricic'],
    ['ø', 'Øyvind Ølsen', 'oyvind-olsen'],
    ['ł', 'Łukasz Łoś', 'lukasz-los'],
    ['ð', 'Ðorđe Alfreð', 'dordje-alfred'],
    ['þ', 'Þór Þorsteinn', 'thor-thorsteinn'],
    ['æ', 'Æbeltoft Bjærre', 'aebeltoft-bjaerre'],
    ['œ', 'Œuvre Cœur', 'oeuvre-coeur'],
    ['ß', 'Weiß Strauß', 'weiss-strauss'],
    ['ı', 'Yıldız Iğdır', 'yildiz-igdir'],
  ])('writes out the letter %s, in capitals too (%s)', (letter, name, slug) => {
    expect(letter in slugLetters).toBe(true)
    expect(personSlug(name)).toBe(slug)
    expect(lostLetters(name)).toEqual([])
  })

  it('writes the đ of a Vietnamese person as a d, and as dj for another or an unknown country', () => {
    expect(personSlug('Đặng Văn Lâm', 'VN')).toBe('dang-van-lam')
    expect(personSlug('Đặng Văn Lâm')).toBe('djang-van-lam')
    expect(personSlug('Đặng Văn Lâm', null)).toBe('djang-van-lam')
    expect(personSlug('Đuričić', 'RS')).toBe('djuricic')
    // Only the đ depends on the country.
    expect(personSlug('Ðorđe Æ', 'VN')).toBe('dorde-ae')
  })

  it('knows a letter that gives nothing, so a name never loses one unnoticed', () => {
    expect(lostLetters('Jan de Vries')).toEqual([])
    expect(lostLetters('Ångström Çelik')).toEqual([])
    expect(lostLetters('Ǥerard 山田')).toEqual(['ǥ', '山', '田'])
  })
})

describe('the names of the made-up squad of the seed', () => {
  it('lose no letter in their address (#1113), so a new letter is noticed', () => {
    const names = madeUpSquad(new Date('2026-11-11T12:00:00Z')).map(({ name }) => name)

    expect(names.length).toBeGreaterThan(0)

    for (const name of names) {
      expect(lostLetters(name), name).toEqual([])
    }
  })
})

describe('isPlayerSlug', () => {
  it('refuses kies and anything that looks like a season', () => {
    expect(isPlayerSlug('jan-de-vries')).toBe(true)
    expect(isPlayerSlug('kies')).toBe(false)
    expect(isPlayerSlug('overzicht')).toBe(false)
    expect(isPlayerSlug('2025-26')).toBe(false)
    expect(isPlayerSlug('Jan')).toBe(false)
  })
})

describe('updatePlayerAddresses', () => {
  it('gives each person with a row in players the slug of his name, and no other person', async () => {
    const jan = await addPerson('Jan de Vries')
    const opponent = await addPerson('Piet Tegenstander', { season: '' })

    expect(await updatePlayerAddresses(database.db)).toBe(1)
    expect(await slugOf(jan)).toBe('jan-de-vries')
    expect(await slugsOf(jan)).toEqual(['jan-de-vries'])
    expect(await slugOf(opponent)).toBeNull()
    expect(await playerSlugs(database.db)).toEqual(['jan-de-vries'])
  })

  it('changes nothing on a second run', async () => {
    await addPerson('Jan de Vries')
    await updatePlayerAddresses(database.db)

    expect(await updatePlayerAddresses(database.db)).toBe(0)
  })

  it('takes the name of the newest row when the person has no name yet', async () => {
    const id = await addPerson(null)

    await updatePlayerAddresses(database.db)

    expect(await slugOf(id)).toBe('speler-zondernaam')
  })

  it('gives the second of two persons with one name his year of birth, or his number', async () => {
    const first = await addPerson('Jan Jansen')
    const second = await addPerson('Jan Jansen', { birthDate: '1975-04-01', season: '2005/06' })
    const third = await addPerson('Jan Jansen', { season: '2006/07' })

    await updatePlayerAddresses(database.db)

    expect(await slugOf(first)).toBe('jan-jansen')
    expect(await slugOf(second)).toBe('jan-jansen-1975')
    expect(await slugOf(third)).toBe(`jan-jansen-${third}`)
  })

  it('never gives the address kies or that of a season', async () => {
    const kies = await addPerson('Kies')

    await updatePlayerAddresses(database.db)

    expect(await slugOf(kies)).toBe(`kies-${kies}`)
  })

  it('never gives the address overzicht, which is the overview of all players (#1138)', async () => {
    const overzicht = await addPerson('Overzicht')

    await updatePlayerAddresses(database.db)

    expect(await slugOf(overzicht)).toBe(`overzicht-${overzicht}`)
  })

  it('keeps the old slug when the name changes, and it leads to the person', async () => {
    const id = await addPerson('Jan de Vries')

    await updatePlayerAddresses(database.db)
    await database.db.update(persons).set({ name: 'Johannes de Vries' }).where(eq(persons.id, id))
    await updatePlayerAddresses(database.db)

    expect(await slugOf(id)).toBe('johannes-de-vries')
    expect(await slugsOf(id)).toEqual(['jan-de-vries', 'johannes-de-vries'])
    expect(await findPlayerBySlug(database.db, 'jan-de-vries')).toMatchObject({
      person: { id },
      slug: 'johannes-de-vries',
    })
  })

  it('does not give an old slug of one person to another', async () => {
    const first = await addPerson('Jan de Vries')

    await updatePlayerAddresses(database.db)
    await database.db.update(persons).set({ name: 'Johannes de Vries' }).where(eq(persons.id, first))

    const second = await addPerson('Jan de Vries', { season: '2005/06' })

    await updatePlayerAddresses(database.db)

    expect(await slugOf(second)).toBe(`jan-de-vries-${second}`)
    expect((await findPlayerBySlug(database.db, 'jan-de-vries'))?.person.id).toBe(first)
  })
})

describe('findPlayerBySlug', () => {
  it('finds nobody for an unknown slug or a person without a row in players', async () => {
    const id = await addPerson('Jan de Vries')

    await updatePlayerAddresses(database.db)
    await database.db.delete(players).where(eq(players.personId, id))

    expect(await findPlayerBySlug(database.db, 'jan-de-vries')).toBeUndefined()
    expect(await findPlayerBySlug(database.db, 'niemand')).toBeUndefined()
    expect(await findPlayerBySlug(database.db, 'kies')).toBeUndefined()
  })
})

describe('a merge of two persons', () => {
  it('moves the slugs of the person that goes to the person that stays, in the transaction', async () => {
    const kept = await addPerson('Jan de Vries')
    const other = await addPerson('Johannes de Vries', { season: '2005/06' })

    await updatePlayerAddresses(database.db)
    await mergeChosenPersons(database.db, {
      describe: () => 'samengevoegd',
      keptId: kept,
      otherId: other,
      userId: null,
    })

    expect(await slugsOf(kept)).toEqual(['jan-de-vries', 'johannes-de-vries'])
    expect(await findPlayerBySlug(database.db, 'johannes-de-vries')).toMatchObject({
      person: { id: kept },
      slug: 'jan-de-vries',
    })
  })

  it('gives a person that stays without an address that of the other', async () => {
    const kept = await addPerson('Jan de Vries', { season: '' })
    const other = await addPerson('Johannes de Vries')

    await updatePlayerAddresses(database.db)
    await mergeChosenPersons(database.db, {
      describe: () => 'samengevoegd',
      keptId: kept,
      otherId: other,
      userId: null,
    })

    expect((await findPlayerBySlug(database.db, 'johannes-de-vries'))?.slug).toBe('johannes-de-vries')

    await updatePlayerAddresses(database.db)

    expect((await findPlayerBySlug(database.db, 'johannes-de-vries'))?.slug).toBe('jan-de-vries')
  })

  it('gives a person whose address changes the new address, and keeps the old one as a redirect', async () => {
    const id = await addPerson('Đuričić Test')

    // The address the old code gave: the capital đ was lost.
    await database.db.update(persons).set({ slug: 'uricic-test' }).where(eq(persons.id, id))
    await database.db.insert(personSlugs).values({ personId: id, slug: 'uricic-test' })

    expect(await updatePlayerAddresses(database.db)).toBe(1)
    expect(await slugOf(id)).toBe('djuricic-test')
    expect(await slugsOf(id)).toEqual(['djuricic-test', 'uricic-test'])
    expect((await findPlayerBySlug(database.db, 'uricic-test'))?.slug).toBe('djuricic-test')
    expect(await updatePlayerAddresses(database.db)).toBe(0)
  })

  it('uses his country: a Vietnamese đ is a d, and a new address that is taken gets his year of birth', async () => {
    const taken = await addPerson('Dang Van')
    const id = await addPerson('Đang Van', { birthDate: '1990-01-01', season: '2005/06' })
    const other = await addPerson('Đang Van', { season: '2006/07' })

    await database.db.update(persons).set({ country: 'VN' }).where(eq(persons.id, id))
    await updatePlayerAddresses(database.db)

    expect(await slugOf(taken)).toBe('dang-van')
    expect(await slugOf(id)).toBe('dang-van-1990')
    expect(await slugOf(other)).toBe('djang-van')
  })
})
