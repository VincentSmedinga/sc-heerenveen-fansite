import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { ClubFullName } from './clubs.ts'
import type { TestDatabase } from './test-database.ts'

import {
  clubSlug,
  createClubBook,
  knownClubPages,
  normaliseClubName,
  repairClubPages,
  repairClubs,
  reservedClubSlugs,
  unrememberedClubPages,
  withClubs,
} from './clubs.ts'
import { personSlug } from './person-slugs.ts'
import { clubNames, clubPages, clubs, matches } from './schema.ts'
import { madeUpMatches, madeUpOldMatches } from './seed.ts'
import { lostLetters, slugLetters } from './slug-letters.ts'
import { createTestDatabase } from './test-database.ts'

describe('normaliseClubName', () => {
  it.each([
    ['N.E.C.', 'NEC'],
    ['Go Ahead Eagles', 'Go-Ahead Eagles'],
    ["Be Quick '28", 'be quick 28'],
    ['FC Zürich', 'fc zurich'],
  ])('takes %s and %s for the same club', (a, b) => {
    expect(normaliseClubName(a)).toBe(normaliseClubName(b))
  })

  it('keeps two different clubs apart', () => {
    expect(normaliseClubName('Excelsior')).not.toBe(normaliseClubName('Excelsior Rotterdam'))
  })
})

describe('clubSlug', () => {
  it.each([
    ['ADO Den Haag', 'ado-den-haag'],
    ['N.E.C.', 'nec'],
    ["Be Quick '28", 'be-quick-28'],
    ['Telstar (voetbalclub)', 'telstar-voetbalclub'],
    ['VVV-Venlo', 'vvv-venlo'],
    ['FC Zürich', 'fc-zurich'],
    ['Lillestrøm SK', 'lillestrom-sk'],
    ['Næstved IF', 'naestved-if'],
    ['Øster Æ Þór Łódź', 'oster-ae-thor-lodz'],
    ['???', 'club'],
  ])('writes %s as %s', (name, slug) => {
    expect(clubSlug(name)).toBe(slug)
  })

  it('writes the letters of the list of slugLetters like the address of a player does', () => {
    for (const [letter, written] of Object.entries(slugLetters)) {
      expect(clubSlug(`Club ${letter}`)).toBe(`club-${written}`)
      expect(personSlug(`Club ${letter}`, 'NL')).toBe(`club-${written === 'dj' ? 'dj' : written}`)
    }
  })

  it('loses no letter of the opponents of the made-up matches of the seed', () => {
    const now = new Date('2026-11-11T12:00:00Z')
    const names = [...madeUpMatches(now), ...madeUpOldMatches()].map(({ opponent }) => opponent)

    expect(names.length).toBeGreaterThan(0)

    for (const name of names) {
      expect(lostLetters(name), name).toEqual([])
    }
  })

  it('stays within 70 characters and does not end in a hyphen', () => {
    const slug = clubSlug(`${'a'.repeat(68)} bb cc`)

    expect(slug.length).toBeLessThanOrEqual(70)
    expect(slug.endsWith('-')).toBe(false)
  })

  it('keeps `kies` in the list of slugs a club never gets', () => {
    expect(reservedClubSlugs).toContain('kies')
  })
})

describe('the book of clubs', () => {
  let database: TestDatabase

  beforeAll(async () => {
    database = await createTestDatabase()
  })

  afterAll(async () => {
    // Undefined when the server wasn't there, which beforeAll has already reported.
    await database?.drop()
  })

  beforeEach(async () => {
    await database.pool.query('DELETE FROM matches')
    await database.pool.query('DELETE FROM club_pages')
    await database.pool.query('DELETE FROM club_names')
    await database.pool.query('DELETE FROM clubs')
  })

  const book = () => createClubBook(database.db)

  const stored = async () =>
    (await database.db.select().from(clubs).orderBy(clubs.id)).map((club) => ({
      name: club.name,
      slug: club.slug,
      wikipediaPage: club.wikipediaPage,
    }))

  it('makes a club with the article and the slug of the name, and says so', async () => {
    const result = await (await book()).resolve({ name: 'FC Twente', page: 'FC Twente', season: '2026/27' })

    expect(result.events).toEqual(["new club 'FC Twente' (article 'FC Twente')"])
    expect(await stored()).toEqual([{ name: 'FC Twente', slug: 'fc-twente', wikipediaPage: 'FC Twente' }])
  })

  it('makes a club without an article from a name alone, and says so', async () => {
    const result = await (await book()).resolve({ name: 'SV Proefdorp', page: null, season: '2026/27' })

    expect(result.events).toEqual(["new club 'SV Proefdorp', with no article"])
    expect(await stored()).toEqual([{ name: 'SV Proefdorp', slug: 'sv-proefdorp', wikipediaPage: null }])
  })

  it('finds the same club again, in the same book and in a new one, without a line in the log', async () => {
    const first = await (await book()).resolve({ name: 'FC Twente', page: 'FC Twente', season: '2026/27' })
    const again = await (await book()).resolve({ name: 'FC Twente', page: 'FC Twente', season: '2026/27' })
    const byName = await (await book()).resolve({ name: 'fc twente', page: null, season: '2026/27' })

    expect([again.id, byName.id]).toEqual([first.id, first.id])
    expect([again.events, byName.events]).toEqual([[], []])
    expect(await stored()).toHaveLength(1)
  })

  it('puts a spelling that is already among the other names with the club, whatever the punctuation', async () => {
    const [club] = await database.db.insert(clubs).values({ name: 'NEC Nijmegen', slug: 'nec-nijmegen' }).$returningId()

    await database.db.insert(clubNames).values({ clubId: club!.id, name: 'N.E.C. Nijmegen' })

    const result = await (await book()).resolve({ name: 'NEC-Nijmegen', page: null, season: '2026/27' })

    expect(result).toEqual({ events: [], id: club!.id })
  })

  it('takes two articles for two clubs with the same name, and gives the second slug a number', async () => {
    const first = await (await book()).resolve({ name: 'Quick', page: 'Quick (Den Haag)', season: '2026/27' })
    const second = await (await book()).resolve({ name: 'Quick', page: 'Quick (Oldenzaal)', season: '2026/27' })

    expect(second.id).not.toBe(first.id)
    expect((await stored()).map((club) => club.slug)).toEqual(['quick', 'quick-2'])
  })

  it('numbers the slug of a club whose slug is taken, and counts on', async () => {
    const clubBook = await book()

    await clubBook.resolve({ name: 'F.C. Groningen', page: 'F.C. Groningen', season: '2026/27' })
    await clubBook.resolve({ name: 'FC Groningen', page: 'FC Groningen (2)', season: '2026/27' })
    await clubBook.resolve({ name: 'FC-Groningen', page: 'FC Groningen (3)', season: '2026/27' })

    expect((await stored()).map((club) => club.slug)).toEqual(['fc-groningen', 'fc-groningen-2', 'fc-groningen-3'])
  })

  it('never gives a club a slug the pages of the site use', async () => {
    await (await book()).resolve({ name: 'Kies', page: null, season: '2026/27' })

    expect((await stored()).map((club) => club.slug)).toEqual(['kies-2'])
  })

  it('gives the article to the club of that name when it has none yet, and says so', async () => {
    await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente' })

    const result = await (await book()).resolve({ name: 'FC Twente', page: 'FC Twente', season: '2026/27' })

    expect(result.events).toEqual(["article 'FC Twente' for club 'FC Twente'"])
    expect(await stored()).toEqual([{ name: 'FC Twente', slug: 'fc-twente', wikipediaPage: 'FC Twente' }])
  })

  it('finds a club by its article when the name differs, and adds the name as the name of a newer season', async () => {
    await (await book()).resolve({ name: 'Telstar', page: 'Telstar (voetbalclub)', season: '2025/26' })

    const result = await (
      await book()
    ).resolve({ name: 'Telstar 1963', page: 'Telstar (voetbalclub)', season: '2026/27' })

    expect(result.events).toEqual(["club 'Telstar' is now called 'Telstar 1963'"])
    expect(await stored()).toEqual([{ name: 'Telstar 1963', slug: 'telstar', wikipediaPage: 'Telstar (voetbalclub)' }])
    expect((await database.db.select().from(clubNames)).map((row) => row.name)).toEqual(['Telstar'])
  })

  it('adds the name of an older season to the other names and keeps the name of the newest season', async () => {
    const [club] = await database.db
      .insert(clubs)
      .values({ name: 'Telstar 1963', slug: 'telstar', wikipediaPage: 'Telstar (voetbalclub)' })
      .$returningId()

    await database.db.insert(matches).values({
      clubId: club!.id,
      competition: 'Eredivisie',
      dateText: 'februari 2027',
      home: true,
      matchDate: '2026-10-24',
      opponent: 'Telstar 1963',
      round: 'Speelronde 1',
      season: '2026/27',
      status: 'scheduled',
    })

    const result = await (await book()).resolve({ name: 'Telstar', page: 'Telstar (voetbalclub)', season: '2025/26' })

    expect(result).toEqual({ events: ["new name 'Telstar' for club 'Telstar 1963'"], id: club!.id })
    expect((await stored())[0]).toMatchObject({ name: 'Telstar 1963' })
    expect((await database.db.select().from(clubNames)).map((row) => row.name)).toEqual(['Telstar'])
  })

  it('does not let two spellings in one season take turns, and logs a new name once', async () => {
    const clubBook = await book()

    await clubBook.resolve({ name: 'Telstar', page: 'Telstar (voetbalclub)', season: '2026/27' })

    const first = await clubBook.resolve({ name: 'Telstar 1963', page: 'Telstar (voetbalclub)', season: '2026/27' })
    const second = await clubBook.resolve({ name: 'Telstar', page: 'Telstar (voetbalclub)', season: '2026/27' })
    const third = await (
      await book()
    ).resolve({ name: 'Telstar 1963', page: 'Telstar (voetbalclub)', season: '2026/27' })

    expect(first.events).toHaveLength(1)
    expect([second.events, third.events]).toEqual([[], []])
    expect((await stored())[0]).toMatchObject({ name: 'Telstar 1963' })
  })

  it('makes a second club when a name with another article is taken by a club that has an article', async () => {
    await database.db.insert(clubs).values({ name: 'Excelsior', slug: 'excelsior', wikipediaPage: 'Excelsior' })

    const result = await (
      await book()
    ).resolve({
      name: 'Excelsior',
      page: 'Excelsior Rotterdam',
      season: '2026/27',
    })

    // The article is not known, and the name is that of a club with another article.
    expect(result.events).toEqual(["new club 'Excelsior' (article 'Excelsior Rotterdam')"])

    const other = await (await book()).resolve({ name: 'Excelsior', page: 'Excelsior Rotterdam', season: '2026/27' })

    expect(other.events).toEqual([])
    expect((await stored()).map((club) => club.slug)).toEqual(['excelsior', 'excelsior-2'])

    const named = await (await book()).resolve({ name: 'Excelsior', page: 'Excelsior Maassluis', season: '2026/27' })

    expect(named.events).toEqual(["new club 'Excelsior' (article 'Excelsior Maassluis')"])
  })

  it('does not take a name from another club', async () => {
    const [one] = await database.db
      .insert(clubs)
      .values({ name: 'Excelsior', slug: 'excelsior', wikipediaPage: 'A' })
      .$returningId()
    const [two] = await database.db
      .insert(clubs)
      .values({ name: 'Quick', slug: 'quick', wikipediaPage: 'B' })
      .$returningId()

    // The article B is club two, but the name belongs to club one.
    const result = await (await book()).resolve({ name: 'Excelsior', page: 'B', season: '2026/27' })

    expect(result).toEqual({
      events: ["name 'Excelsior' stays with club 'Excelsior', not added to club 'Quick'"],
      id: two!.id,
    })
    expect(await database.db.select().from(clubNames)).toEqual([])
    expect(one!.id).not.toBe(two!.id)
  })

  it('has the clubs of a made-up match found by name, and the same club for the same opponent', async () => {
    const rows = await withClubs(database.db, [
      {
        competition: 'Eredivisie',
        dateText: 'x',
        home: true,
        matchDate: '2026-10-24',
        opponent: 'FC Maquette',
        round: 'a',
        season: '2026/27',
        status: 'scheduled',
      },
      {
        competition: 'Eredivisie',
        dateText: 'x',
        home: false,
        matchDate: '2026-10-31',
        opponent: 'FC Maquette',
        round: 'b',
        season: '2026/27',
        status: 'scheduled',
      },
    ])

    expect(rows[0]!.clubId).toBe(rows[1]!.clubId)
    expect(await database.db.select().from(clubs).where(eq(clubs.id, rows[0]!.clubId))).toMatchObject([
      { name: 'FC Maquette', slug: 'fc-maquette' },
    ])
  })
})

describe('the full names of clubs', () => {
  let database: TestDatabase

  const fullNames: ClubFullName[] = [{ aliases: ['Excelsior', 'SBV Excelsior'], name: 'Excelsior Rotterdam' }]

  beforeAll(async () => {
    database = await createTestDatabase()
  })

  afterAll(async () => {
    // Undefined when the server wasn't there, which beforeAll has already reported.
    await database?.drop()
  })

  beforeEach(async () => {
    await database.pool.query('DELETE FROM matches')
    await database.pool.query('DELETE FROM club_pages')
    await database.pool.query('DELETE FROM club_names')
    await database.pool.query('DELETE FROM clubs')
  })

  let rounds = 0

  /** A club with its matches, one per entry of `seasons`, each in a round of its own. */
  async function club(
    name: string,
    slug: string,
    { page = null, seasons = [] }: { page?: null | string; seasons?: string[] } = {},
  ) {
    const [{ id }] = (await database.db.insert(clubs).values({ name, slug, wikipediaPage: page }).$returningId()) as [
      { id: number },
    ]

    for (const [index, season] of seasons.entries()) {
      await database.db.insert(matches).values({
        clubId: id,
        competition: 'Eredivisie',
        dateText: 'x',
        home: true,
        matchDate: `${season.slice(0, 4)}-09-0${index + 1}`,
        opponent: name,
        round: `Speelronde ${(rounds += 1)}`,
        season,
        status: 'scheduled',
      })
    }

    return id
  }

  /** Everything the repair may change, for a comparison. */
  async function state() {
    return {
      clubs: await database.db.select().from(clubs).orderBy(clubs.slug),
      matches: (await database.db.select().from(matches).orderBy(matches.id)).map((match) => ({
        clubId: match.clubId,
        id: match.id,
      })),
      names: (await database.db.select().from(clubNames).orderBy(clubNames.name)).map((name) => ({
        clubId: name.clubId,
        name: name.name,
      })),
    }
  }

  const repair = () => database.db.transaction((transaction) => repairClubs(transaction, fullNames))

  const names = async (clubId: number) =>
    (await database.db.select().from(clubNames).where(eq(clubNames.clubId, clubId))).map((name) => name.name).sort()

  describe('repairClubs', () => {
    it('merges Excelsior into Excelsior Rotterdam when the full name has the most matches', async () => {
      const short = await club('Excelsior', 'excelsior', { seasons: ['2024/25'] })
      const full = await club('Excelsior Rotterdam', 'excelsior-rotterdam', { seasons: ['2025/26', '2026/27'] })
      const events = await repair()

      expect(await database.db.select().from(clubs)).toMatchObject([
        { id: full, name: 'Excelsior Rotterdam', slug: 'excelsior-rotterdam' },
      ])
      expect(await database.db.select().from(matches).where(eq(matches.clubId, full))).toHaveLength(3)
      expect(await names(full)).toEqual(['Excelsior', 'SBV Excelsior'])
      expect(events).toEqual([
        "merged club 'Excelsior' into club 'Excelsior Rotterdam'",
        "new name 'SBV Excelsior' for club 'Excelsior Rotterdam'",
      ])
      expect(short).not.toBe(full)
    })

    it('keeps the older club with the most matches, and gives it the full name and the slug', async () => {
      const short = await club('Excelsior', 'excelsior', { seasons: ['2023/24', '2024/25', '2025/26'] })

      await club('Excelsior Rotterdam', 'excelsior-rotterdam', { seasons: ['2026/27'] })

      const events = await repair()

      expect(await database.db.select().from(clubs)).toMatchObject([
        { id: short, name: 'Excelsior Rotterdam', slug: 'excelsior-rotterdam' },
      ])
      expect(await database.db.select().from(matches).where(eq(matches.clubId, short))).toHaveLength(4)
      expect(await names(short)).toEqual(['Excelsior', 'SBV Excelsior'])
      expect(events).toEqual([
        "merged club 'Excelsior Rotterdam' into club 'Excelsior'",
        "club 'Excelsior' is now called 'Excelsior Rotterdam'",
        "slug of club 'Excelsior Rotterdam' is now 'excelsior-rotterdam'",
        "new name 'SBV Excelsior' for club 'Excelsior Rotterdam'",
      ])
    })

    it('gives an existing club the address of its name when the list names it, and keeps the old address nowhere', async () => {
      // The address the code made while it lost the ø (#1121).
      const old = await club('Lillestrøm SK', 'lillestr-m-sk', { seasons: ['2010/11'] })
      const other = await club('Næstved IF', 'n-stved-if', { seasons: ['2010/11'] })
      const events = await database.db.transaction((transaction) =>
        repairClubs(transaction, [
          { aliases: [], name: 'Lillestrøm SK' },
          { aliases: [], name: 'Næstved IF' },
        ]),
      )

      expect(await database.db.select().from(clubs).orderBy(clubs.id)).toMatchObject([
        { id: old, slug: 'lillestrom-sk' },
        { id: other, slug: 'naestved-if' },
      ])
      expect(events).toEqual([
        "slug of club 'Lillestrøm SK' is now 'lillestrom-sk'",
        "slug of club 'Næstved IF' is now 'naestved-if'",
      ])
      expect(await database.db.select().from(matches).where(eq(matches.clubId, old))).toHaveLength(1)
    })

    it('keeps the address of a club that another club has, and says so', async () => {
      await club('Lillestrøm SK', 'lillestr-m-sk')
      await club('Andere club', 'lillestrom-sk')

      const events = await database.db.transaction((transaction) =>
        repairClubs(transaction, [{ aliases: [], name: 'Lillestrøm SK' }]),
      )

      expect(events).toEqual([
        "slug 'lillestrom-sk' belongs to another club, club 'Lillestrøm SK' keeps 'lillestr-m-sk'",
      ])
    })

    it('keeps the club with the article, whatever the matches', async () => {
      const full = await club('Excelsior Rotterdam', 'excelsior-rotterdam', { page: 'Excelsior Rotterdam' })

      await club('Excelsior', 'excelsior', { seasons: ['2025/26', '2026/27'] })
      await repair()

      expect(await database.db.select().from(clubs)).toMatchObject([
        { id: full, slug: 'excelsior-rotterdam', wikipediaPage: 'Excelsior Rotterdam' },
      ])
      expect(await database.db.select().from(matches)).toHaveLength(2)
    })

    it('moves the other names of the club that goes, and its own name, to the club that stays', async () => {
      const short = await club('Excelsior', 'excelsior')
      const full = await club('Excelsior Rotterdam', 'excelsior-rotterdam', { seasons: ['2026/27'] })

      await database.db.insert(clubNames).values({ clubId: short, name: 'S.B.V. Excelsior (oud)' })
      await repair()

      expect(await names(full)).toEqual(['Excelsior', 'S.B.V. Excelsior (oud)', 'SBV Excelsior'])
    })

    it('renames a club that exists alone as Excelsior, and keeps its slug moving to the full name', async () => {
      const short = await club('Excelsior', 'excelsior', { page: 'Excelsior Rotterdam', seasons: ['2026/27'] })
      const events = await repair()

      expect(await database.db.select().from(clubs)).toMatchObject([
        { id: short, name: 'Excelsior Rotterdam', slug: 'excelsior-rotterdam' },
      ])
      expect(await names(short)).toEqual(['Excelsior', 'SBV Excelsior'])
      expect(events).toEqual([
        "club 'Excelsior' is now called 'Excelsior Rotterdam'",
        "slug of club 'Excelsior Rotterdam' is now 'excelsior-rotterdam'",
        "new name 'SBV Excelsior' for club 'Excelsior Rotterdam'",
      ])
    })

    it('adds the other spellings to Excelsior Rotterdam when it exists alone', async () => {
      const full = await club('Excelsior Rotterdam', 'excelsior-rotterdam', { seasons: ['2026/27'] })
      const events = await repair()

      expect(await names(full)).toEqual(['Excelsior', 'SBV Excelsior'])
      expect(events).toEqual([
        "new name 'Excelsior' for club 'Excelsior Rotterdam'",
        "new name 'SBV Excelsior' for club 'Excelsior Rotterdam'",
      ])
    })

    it('changes nothing for a club that is right already, and nothing when it runs again', async () => {
      await club('Excelsior', 'excelsior', { seasons: ['2025/26'] })
      await club('Excelsior Rotterdam', 'excelsior-rotterdam', { seasons: ['2026/27'] })
      await repair()

      const before = await state()

      expect(await repair()).toEqual([])
      expect(await state()).toEqual(before)
    })

    it('does nothing when the database has no such club', async () => {
      await club('FC Twente', 'fc-twente', { seasons: ['2026/27'] })

      const before = await state()

      expect(await repair()).toEqual([])
      expect(await state()).toEqual(before)
    })

    it('leaves Excelsior Maassluis alone', async () => {
      const maassluis = await club('Excelsior Maassluis', 'excelsior-maassluis', { seasons: ['2026/27'] })

      await club('Excelsior', 'excelsior', { seasons: ['2026/27'] })
      await repair()

      expect(await database.db.select().from(clubs).where(eq(clubs.id, maassluis))).toMatchObject([
        { name: 'Excelsior Maassluis', slug: 'excelsior-maassluis' },
      ])
      expect(await names(maassluis)).toEqual([])
      expect(await database.db.select().from(matches).where(eq(matches.clubId, maassluis))).toHaveLength(1)
    })

    it('does not merge two clubs that have an article each, and says so', async () => {
      await club('Excelsior', 'excelsior', { page: 'Excelsior (amateurclub)' })
      await club('Excelsior Rotterdam', 'excelsior-rotterdam', { page: 'Excelsior Rotterdam' })

      const before = await state()

      expect(await repair()).toEqual([
        "clubs 'Excelsior' and 'Excelsior Rotterdam' have an article each, not merged into 'Excelsior Rotterdam'",
      ])
      expect(await state()).toEqual(before)
    })

    it('keeps its slug when a club that is not Excelsior has the slug of the full name', async () => {
      const short = await club('Excelsior', 'excelsior', { seasons: ['2026/27'] })

      await club('Excelsior (oud)', 'excelsior-rotterdam', { page: 'Excelsior (oud)' })

      const events = await repair()

      expect(await database.db.select().from(clubs).where(eq(clubs.id, short))).toMatchObject([
        { name: 'Excelsior Rotterdam', slug: 'excelsior' },
      ])
      expect(events).toContain(
        "slug 'excelsior-rotterdam' belongs to another club, club 'Excelsior Rotterdam' keeps 'excelsior'",
      )
    })

    it('finds a club that has a spelling among its other names', async () => {
      const full = await club('Excelsior Rotterdam', 'excelsior-rotterdam', { seasons: ['2026/27'] })
      const other = await club('SBV 1902', 'sbv-1902')

      await database.db.insert(clubNames).values({ clubId: other, name: 'SBV Excelsior' })
      await repair()

      expect(await database.db.select().from(clubs)).toMatchObject([{ id: full }])
      expect(await names(full)).toEqual(['Excelsior', 'SBV 1902', 'SBV Excelsior'])
    })
  })

  describe('the book with a list of full names', () => {
    it.each(['Excelsior', 'SBV Excelsior', 'excelsior', 'Excelsior Rotterdam'])(
      'takes %s for the club Excelsior Rotterdam, with the slug of the full name',
      async (name) => {
        const book = await createClubBook(database.db, { fullNames })
        const result = await book.resolve({ name, page: null, season: '2026/27' })

        expect(await database.db.select().from(clubs).where(eq(clubs.id, result.id))).toMatchObject([
          { name: 'Excelsior Rotterdam', slug: 'excelsior-rotterdam' },
        ])
        expect(await names(result.id)).toEqual(['Excelsior', 'SBV Excelsior'])
      },
    )

    it('finds the same club for the three spellings, in the same book, and logs the new club and names once', async () => {
      const book = await createClubBook(database.db, { fullNames })
      const first = await book.resolve({ name: 'Excelsior', page: null })
      const second = await book.resolve({ name: 'SBV Excelsior', page: null })
      const third = await book.resolve({ name: 'Excelsior Rotterdam', page: 'Excelsior Rotterdam' })

      expect([second.id, third.id]).toEqual([first.id, first.id])
      expect(first.events).toEqual([
        "new club 'Excelsior Rotterdam', with no article",
        "new name 'Excelsior' for club 'Excelsior Rotterdam'",
        "new name 'SBV Excelsior' for club 'Excelsior Rotterdam'",
      ])
      expect(second.events).toEqual([])
      expect(third.events).toEqual(["article 'Excelsior Rotterdam' for club 'Excelsior Rotterdam'"])
      expect(await database.db.select().from(clubs)).toHaveLength(1)
    })

    it('keeps Excelsior Maassluis another club, and works for a name that is not in the list as before', async () => {
      const book = await createClubBook(database.db, { fullNames })
      const rotterdam = await book.resolve({ name: 'Excelsior', page: null })
      const maassluis = await book.resolve({ name: 'Excelsior Maassluis', page: null })
      const twente = await book.resolve({ name: 'FC Twente', page: 'FC Twente' })

      expect(new Set([maassluis.id, rotterdam.id, twente.id]).size).toBe(3)
      expect(await database.db.select().from(clubs).orderBy(clubs.slug)).toMatchObject([
        { name: 'Excelsior Maassluis', slug: 'excelsior-maassluis' },
        { name: 'Excelsior Rotterdam', slug: 'excelsior-rotterdam' },
        { name: 'FC Twente', slug: 'fc-twente' },
      ])
      expect(await names(maassluis.id)).toEqual([])
      expect(maassluis.events).toEqual(["new club 'Excelsior Maassluis', with no article"])
    })

    it('does not take the name of a club from the list when the book has no list', async () => {
      const book = await createClubBook(database.db)
      const short = await book.resolve({ name: 'Excelsior', page: null })
      const full = await book.resolve({ name: 'Excelsior Rotterdam', page: null })

      expect(short.id).not.toBe(full.id)
    })

    it('refuses a list that has a name twice', async () => {
      await expect(
        createClubBook(database.db, {
          fullNames: [
            { aliases: ['Excelsior'], name: 'Excelsior Rotterdam' },
            { aliases: [], name: 'Excelsior' },
          ],
        }),
      ).rejects.toThrow(/in the list of full names twice/u)
    })
  })
})

describe('the redirects of Wikipedia', () => {
  let database: TestDatabase
  let rounds = 0

  beforeAll(async () => {
    database = await createTestDatabase()
  })

  afterAll(async () => {
    await database?.drop()
  })

  beforeEach(async () => {
    await database.pool.query('DELETE FROM matches')
    await database.pool.query('DELETE FROM club_pages')
    await database.pool.query('DELETE FROM club_names')
    await database.pool.query('DELETE FROM clubs')
  })

  /** A club with its matches, one per entry of `seasons`, each in a round of its own. */
  async function club(
    name: string,
    slug: string,
    { page = null, seasons = [] }: { page?: null | string; seasons?: string[] } = {},
  ) {
    const [{ id }] = (await database.db.insert(clubs).values({ name, slug, wikipediaPage: page }).$returningId()) as [
      { id: number },
    ]

    for (const [index, season] of seasons.entries()) {
      await database.db.insert(matches).values({
        clubId: id,
        competition: 'Eredivisie',
        dateText: 'x',
        home: true,
        matchDate: `${season.slice(0, 4)}-09-0${index + 1}`,
        opponent: name,
        round: `Speelronde ${(rounds += 1)}`,
        season,
        status: 'scheduled',
      })
    }

    return id
  }

  const pagesOf = async () =>
    (await database.db.select().from(clubPages).orderBy(clubPages.page)).map((row) => [row.page, row.clubId])

  const repair = (redirects: Record<string, string>) => repairClubPages(database.db, new Map(Object.entries(redirects)))

  /** Everything the repair may change, for a comparison. */
  async function state() {
    return {
      clubs: await database.db.select().from(clubs).orderBy(clubs.slug),
      matches: (await database.db.select().from(matches).orderBy(matches.id)).map((match) => [match.id, match.clubId]),
      names: (await database.db.select().from(clubNames).orderBy(clubNames.name)).map((name) => [
        name.clubId,
        name.name,
      ]),
      pages: await pagesOf(),
    }
  }

  describe('the book of clubs', () => {
    it('takes a title that redirects to the article of a club as that club, and remembers both titles', async () => {
      const az = await club('AZ', 'az', { page: 'AZ (voetbalclub)' })
      const book = await createClubBook(database.db, {
        redirects: new Map([['AZ Alkmaar', 'AZ (voetbalclub)']]),
      })
      const result = await book.resolve({ name: 'AZ', page: 'AZ Alkmaar', season: '2012/13' })

      expect(result.id).toBe(az)
      expect(result.events).toEqual([
        "title 'AZ Alkmaar' is a redirect to 'AZ (voetbalclub)', the article of club 'AZ'",
      ])
      expect(await database.db.select({ slug: clubs.slug }).from(clubs)).toEqual([{ slug: 'az' }])
      expect(await pagesOf()).toEqual([
        ['AZ (voetbalclub)', az],
        ['AZ Alkmaar', az],
      ])
    })

    it('makes a club for the article a redirect ends in, and not for the redirect', async () => {
      const book = await createClubBook(database.db, {
        redirects: new Map([['AZ Alkmaar', 'AZ (voetbalclub)']]),
      })
      const result = await book.resolve({ name: 'AZ', page: 'AZ Alkmaar', season: '2012/13' })
      const [made] = await database.db.select().from(clubs)

      expect(result.events).toEqual([
        "new club 'AZ' (article 'AZ (voetbalclub)')",
        "title 'AZ Alkmaar' is a redirect to 'AZ (voetbalclub)', the article of club 'AZ'",
      ])
      expect(made).toMatchObject({ slug: 'az', wikipediaPage: 'AZ (voetbalclub)' })
      expect(await pagesOf()).toEqual([
        ['AZ (voetbalclub)', made!.id],
        ['AZ Alkmaar', made!.id],
      ])
    })

    it('finds the club of a title it remembered, without an answer from Wikipedia', async () => {
      const az = await club('AZ', 'az', { page: 'AZ (voetbalclub)' })

      await database.db.insert(clubPages).values([
        { clubId: az, page: 'AZ (voetbalclub)' },
        { clubId: az, page: 'AZ Alkmaar' },
      ])

      const result = await (await createClubBook(database.db)).resolve({ name: 'AZ', page: 'AZ Alkmaar' })

      expect(result).toEqual({ events: [], id: az })
      expect(await pagesOf()).toHaveLength(2)
    })

    it('remembers the title of an article that is no redirect, and finds Excelsior Rotterdam under SBV Excelsior', async () => {
      const full = await club('Excelsior Rotterdam', 'excelsior-rotterdam', { page: 'Excelsior Rotterdam' })
      const fullNames = [{ aliases: ['Excelsior', 'SBV Excelsior'], name: 'Excelsior Rotterdam' }]
      const book = await createClubBook(database.db, {
        fullNames,
        redirects: new Map([
          ['Excelsior Rotterdam', 'Excelsior Rotterdam'],
          ['SBV Excelsior', 'Excelsior Rotterdam'],
        ]),
      })

      expect((await book.resolve({ name: 'SBV Excelsior', page: 'SBV Excelsior', season: '2010/11' })).id).toBe(full)
      expect(await database.db.select({ slug: clubs.slug }).from(clubs)).toEqual([{ slug: 'excelsior-rotterdam' }])
      expect(await pagesOf()).toEqual([
        ['Excelsior Rotterdam', full],
        ['SBV Excelsior', full],
      ])
    })

    it('takes a title nobody checked as its own article, and does not remember it', async () => {
      const result = await (await createClubBook(database.db)).resolve({ name: 'FC Twente', page: 'FC Twente' })

      expect(result.events).toEqual(["new club 'FC Twente' (article 'FC Twente')"])
      expect(await pagesOf()).toEqual([])
    })

    it('keeps two clubs with an article each apart, whatever the redirects', async () => {
      await club('Excelsior Rotterdam', 'excelsior-rotterdam', { page: 'Excelsior Rotterdam' })

      const book = await createClubBook(database.db, {
        redirects: new Map([['Excelsior Maassluis', 'Excelsior Maassluis']]),
      })
      const maassluis = await book.resolve({ name: 'Excelsior Maassluis', page: 'Excelsior Maassluis' })

      expect(await database.db.select().from(clubs)).toHaveLength(2)
      expect(maassluis.events).toEqual(["new club 'Excelsior Maassluis' (article 'Excelsior Maassluis')"])
    })
  })

  describe('knownClubPages and unrememberedClubPages', () => {
    it('knows the article of every club and the rows of club_pages, and lists the clubs nobody checked', async () => {
      const az = await club('AZ', 'az', { page: 'AZ (voetbalclub)' })

      await club('FC Twente', 'fc-twente', { page: 'FC Twente' })
      await club('SV Proefdorp', 'sv-proefdorp')
      await database.db.insert(clubPages).values({ clubId: az, page: 'AZ Alkmaar' })

      expect([...(await knownClubPages(database.db))].sort()).toEqual(['AZ (voetbalclub)', 'AZ Alkmaar', 'FC Twente'])
      expect(await unrememberedClubPages(database.db)).toEqual(['AZ (voetbalclub)', 'FC Twente'])
    })
  })

  describe('repairClubPages', () => {
    it('merges the club of a redirect into the club of its article, with the matches, the names and the slug of the one that stays', async () => {
      const stays = await club('AZ', 'az', { page: 'AZ (voetbalclub)', seasons: ['2025/26', '2024/25'] })
      const goes = await club('AZ Alkmaar', 'az-2', { page: 'AZ Alkmaar', seasons: ['2012/13'] })

      await database.db.insert(clubNames).values({ clubId: goes, name: 'AZ 67' })

      const events = await repair({ 'AZ (voetbalclub)': 'AZ (voetbalclub)', 'AZ Alkmaar': 'AZ (voetbalclub)' })

      expect(events).toEqual([
        "merged club 'AZ Alkmaar' into club 'AZ'",
        "title 'AZ Alkmaar' is a redirect to 'AZ (voetbalclub)', the article of club 'AZ'",
      ])
      expect(await database.db.select().from(clubs)).toMatchObject([
        { id: stays, name: 'AZ', slug: 'az', wikipediaPage: 'AZ (voetbalclub)' },
      ])
      expect(await database.db.select().from(matches).where(eq(matches.clubId, stays))).toHaveLength(3)
      expect((await database.db.select().from(clubNames)).map((name) => [name.clubId, name.name]).sort()).toEqual([
        [stays, 'AZ 67'],
        [stays, 'AZ Alkmaar'],
      ])
      expect(await pagesOf()).toEqual([
        ['AZ (voetbalclub)', stays],
        ['AZ Alkmaar', stays],
      ])
    })

    it('merges Excelsior Maassluis never, and SBV Excelsior into Excelsior Rotterdam', async () => {
      const full = await club('Excelsior Rotterdam', 'excelsior-rotterdam', {
        page: 'Excelsior Rotterdam',
        seasons: ['2025/26'],
      })

      await club('SBV Excelsior', 'excelsior-rotterdam-2', { page: 'SBV Excelsior', seasons: ['2010/11', '2011/12'] })
      await club('Excelsior Maassluis', 'excelsior-maassluis', { page: 'Excelsior Maassluis' })

      const events = await repair({
        'Excelsior Maassluis': 'Excelsior Maassluis',
        'Excelsior Rotterdam': 'Excelsior Rotterdam',
        'SBV Excelsior': 'Excelsior Rotterdam',
      })

      expect(events).toContain("merged club 'SBV Excelsior' into club 'Excelsior Rotterdam'")
      expect((await database.db.select().from(clubs).orderBy(clubs.slug)).map((one) => one.slug)).toEqual([
        'excelsior-maassluis',
        'excelsior-rotterdam',
      ])
      expect(await database.db.select().from(matches).where(eq(matches.clubId, full))).toHaveLength(3)
    })

    it('gives a club the article its redirect ends in when no club has it, and makes no second club', async () => {
      const graafschap = await club('BV De Graafschap', 'de-graafschap', {
        page: 'BV De Graafschap',
        seasons: ['2012/13'],
      })
      const events = await repair({
        'BV De Graafschap': 'De Graafschap (voetbalclub)',
        'De Graafschap (voetbalclub)': 'De Graafschap (voetbalclub)',
      })

      expect(events).toEqual([
        "article 'De Graafschap (voetbalclub)' for club 'BV De Graafschap'",
        "title 'BV De Graafschap' is a redirect to 'De Graafschap (voetbalclub)', the article of club 'BV De Graafschap'",
      ])
      expect(await database.db.select().from(clubs)).toMatchObject([
        { id: graafschap, slug: 'de-graafschap', wikipediaPage: 'De Graafschap (voetbalclub)' },
      ])
      expect(await pagesOf()).toEqual([
        ['BV De Graafschap', graafschap],
        ['De Graafschap (voetbalclub)', graafschap],
      ])
    })

    it('keeps the club with the most matches, then the oldest, of two redirects to a new article', async () => {
      const few = await club('Club A', 'club-a', { page: 'Club A (oud)', seasons: ['2010/11'] })
      const many = await club('Club B', 'club-b', { page: 'Club B (oud)', seasons: ['2011/12', '2012/13'] })
      const events = await repair({ 'Club A (oud)': 'Club (nieuw)', 'Club B (oud)': 'Club (nieuw)' })

      expect(events).toContain("merged club 'Club A' into club 'Club B'")
      expect(await database.db.select().from(clubs)).toMatchObject([
        { id: many, slug: 'club-b', wikipediaPage: 'Club (nieuw)' },
      ])
      expect(await pagesOf()).toEqual([
        ['Club (nieuw)', many],
        ['Club A (oud)', many],
        ['Club B (oud)', many],
      ])
      expect(few).not.toBe(many)
    })

    it('remembers the article of a club that is no redirect, and merges nothing', async () => {
      const twente = await club('FC Twente', 'fc-twente', { page: 'FC Twente' })
      const events = await repair({ 'FC Twente': 'FC Twente' })

      expect(events).toEqual([])
      expect(await pagesOf()).toEqual([['FC Twente', twente]])
    })

    it('writes nothing the second time, and leaves a title with no answer alone', async () => {
      await club('AZ', 'az', { page: 'AZ (voetbalclub)', seasons: ['2025/26'] })
      await club('AZ Alkmaar', 'az-2', { page: 'AZ Alkmaar', seasons: ['2012/13'] })
      await club('FC Twente', 'fc-twente', { page: 'FC Twente' })
      await repair({ 'AZ (voetbalclub)': 'AZ (voetbalclub)', 'AZ Alkmaar': 'AZ (voetbalclub)' })

      const before = await state()

      expect(await unrememberedClubPages(database.db)).toEqual(['FC Twente'])
      expect(await repair({ 'AZ (voetbalclub)': 'AZ (voetbalclub)', 'AZ Alkmaar': 'AZ (voetbalclub)' })).toEqual([])
      expect(await state()).toEqual(before)
    })
  })
})
