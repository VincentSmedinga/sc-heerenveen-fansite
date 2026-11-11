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
  searchPlayers,
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
    expect(isPlayerSlug('zoeken')).toBe(false)
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

describe('searchPlayers', () => {
  // Every person is made up. `slug` is what the page gives him; `old` are his old addresses.
  async function addFound(
    name: string,
    slug: null | string,
    { family = null as null | string, given = null as null | string, old = [] as string[], seasons = ['2020/21'] } = {},
  ) {
    const [inserted] = await database.db
      .insert(persons)
      .values({ familyName: family, givenName: given, line: 'doelman', name, slug })
      .$returningId()
    const id = inserted!.id

    for (const season of seasons) {
      await database.db.insert(players).values({ name, personId: id, searchTerm: 'x', season })
    }
    for (const address of old) {
      await database.db.insert(personSlugs).values({ personId: id, slug: address })
    }

    return id
  }

  beforeEach(async () => {
    await database.pool.query('DELETE FROM person_slugs')
  })

  it('finds a person by a part of a word, by each word alone and by two words', async () => {
    await addFound('Joost van Aken', 'joost-van-aken', { family: 'Aken', given: 'Joost' })
    await addFound('Piet Jansen', 'piet-jansen', { family: 'Jansen', given: 'Piet' })

    const names = async (words: string[]) =>
      (await searchPlayers(database.db, { words })).players.map((player) => player.slug)

    expect(await names(['aken'])).toEqual(['joost-van-aken'])
    expect(await names(['joo'])).toEqual(['joost-van-aken'])
    expect(await names(['joost', 'aken'])).toEqual(['joost-van-aken'])
    expect(await names(['aken', 'joost'])).toEqual(['joost-van-aken'])
    expect(await names(['joost', 'jansen'])).toEqual([])
  })

  it('finds a name with and without accents, a đ as dj and as d, and a loose accent', async () => {
    await addFound('Edin Džeko', 'edin-dzeko')
    await addFound('Dinh Đức', 'dinh-duc')
    await addFound('Luka Đuričić', 'luka-djuricic')

    const slugs = async (word: string) =>
      (await searchPlayers(database.db, { words: [word] })).players.map((player) => player.slug)

    expect(await slugs('Dzeko')).toEqual(['edin-dzeko'])
    expect(await slugs('Džeko')).toEqual(['edin-dzeko'])
    expect(await slugs('Dz\u030Ceko')).toEqual(['edin-dzeko'])
    expect(await slugs('Đuričić')).toEqual(['luka-djuricic'])
    expect(await slugs('Đức')).toEqual(['dinh-duc'])
  })

  it('finds a person by an old address', async () => {
    await addFound('Jan Nieuwenaam', 'jan-nieuwenaam', { old: ['jan-oudenaam'] })

    expect((await searchPlayers(database.db, { words: ['oudenaam'] })).players).toHaveLength(1)
  })

  it('leaves out a person without a slug, and treats % _ | and a lone dash as plain text', async () => {
    await addFound('Zonder Pagina', null)
    await addFound('Met Pagina', 'met-pagina')

    expect((await searchPlayers(database.db, { words: ['pagina'] })).total).toBe(1)
    for (const word of ['%%', '__', '||', '--']) {
      expect(await searchPlayers(database.db, { words: [word] })).toEqual({ players: [], total: 0 })
    }
  })

  it('puts them in order by family name and gives ten of all of them, with their line and seasons', async () => {
    for (let index = 0; index < 12; index += 1) {
      const letter = String.fromCodePoint(97 + index)

      await addFound(`Test ${letter}`, `test-${letter}`, {
        family: letter.toUpperCase(),
        given: 'Test',
        seasons: ['2021/22', '2019/20'],
      })
    }

    const { players: found, total } = await searchPlayers(database.db, { words: ['test'] })

    expect(total).toBe(12)
    expect(found.map((player) => player.familyName)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'])
    expect(found[0]).toMatchObject({ line: 'doelman', seasons: ['2019/20', '2021/22'] })
  })
})
