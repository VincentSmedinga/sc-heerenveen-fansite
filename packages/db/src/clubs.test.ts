import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { ClubFullName } from './clubs.ts'
import type { TestDatabase } from './test-database.ts'

import { clubSlug, createClubBook, normaliseClubName, repairClubs, reservedClubSlugs, withClubs } from './clubs.ts'
import { clubNames, clubs, matches } from './schema.ts'
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
    ['???', 'club'],
  ])('writes %s as %s', (name, slug) => {
    expect(clubSlug(name)).toBe(slug)
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
