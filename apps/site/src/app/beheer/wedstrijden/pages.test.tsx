import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { adminUsers, matchEdits, matches, type NewMatch, players } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '../../../beheer/accounts'
import { saveEntry } from '../../../beheer/match-entries'
import MatchPage, { metadata as matchMetadata } from './[id]/page'
import MatchesPage, { metadata as listMetadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('../../../database', () => ({ getDatabase: () => database }))
vi.mock('../../../beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const season = seasonOf(new Date())

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'beheerder', userId })
})

const base: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  home: true,
  // Whole seconds, as the database keeps them.
  kickoffAt: new Date(Math.floor(Date.now() / 1000) * 1000 - 24 * 60 * 60 * 1000),
  matchDate: '2026-10-31',
  opponent: 'N.E.C.',
  round: 'Speelronde 11',
  season,
  status: 'scheduled',
}

async function addMatch(overrides: Partial<Omit<NewMatch, 'clubId'>> = {}) {
  const [values] = await withClubs(database.db, [{ ...base, ...overrides }])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()

  return inserted?.id ?? 0
}

const list = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await MatchesPage({ searchParams: Promise.resolve(searchParams) }))
const form = async (id: number | string, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await MatchPage({ params: Promise.resolve({ id: String(id) }), searchParams: Promise.resolve(searchParams) }),
  )

const headings = (html: string) =>
  [...html.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/g)].map(([, level, text]) => `h${level} ${text}`)

describe('the pages of the matches', () => {
  it.each([
    ['the list', listMetadata],
    ['the match', matchMetadata],
  ])('tell search engines to stay away from %s', (_name, metadata) => {
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })

  it.each([
    ['the list', () => list()],
    ['the match', () => form(1)],
  ])('are for the beheerder and not for the moderator: %s', async (_name, render) => {
    requireRole.mockImplementation((...roles: string[]) =>
      roles.includes('moderator') ? Promise.resolve({}) : Promise.reject(new Error('not found')),
    )

    await expect(render()).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('beheerder')
  })
})

describe('the list', () => {
  it('names each match in its link, puts a match without a result first and says so in words', async () => {
    await addMatch({
      goalsAgainst: 0,
      goalsFor: 1,
      kickoffAt: new Date('2026-08-09T14:45:00Z'),
      matchDate: '2026-08-09',
      opponent: 'FC Twente',
      round: 'Speelronde 1',
      status: 'played',
    })
    await addMatch()

    const html = await list()

    expect(headings(html)[0]).toBe('h1 Wedstrijden')
    expect(html.match(/<a href="\/beheer\/wedstrijden\/\d+">(.*?)<\/a>/g)).toEqual([
      expect.stringContaining('Speelronde 11: sc Heerenveen - N.E.C.'),
      expect.stringContaining('Speelronde 1: sc Heerenveen - FC Twente'),
    ])
    expect(html).toContain('Uitslag ontbreekt')
    expect(html).toContain('sc Heerenveen 1-0 FC Twente')
  })

  it('labels a match with an entry "Aangepast door de redactie", in words and not by colour', async () => {
    const id = await addMatch()

    expect(await list()).not.toContain('Aangepast door de redactie')

    await saveEntry(
      database.db,
      userId,
      id,
      {
        goals: [],
        kickoff: { dateText: null, kickoffAt: base.kickoffAt ?? null, matchDate: '2026-10-31' },
        result: {
          afterNinetyAgainst: null,
          afterNinetyFor: null,
          extraTime: false,
          goalsAgainst: 1,
          goalsFor: 2,
          penaltiesAgainst: null,
          penaltiesFor: null,
          status: 'played',
        },
      },
      'Wikipedia is achter',
    )

    const html = await list()

    expect(html).toContain('Aangepast door de redactie')
    expect(html).not.toContain('Uitslag ontbreekt')
  })

  it('shows only the matches of the current season', async () => {
    await addMatch({ round: 'Speelronde 3', season: '2025/26' })

    expect(await list()).toContain('Er zijn nog geen wedstrijden')
  })

  it('tells that a match is gone, from the address, in a card with a heading', async () => {
    expect(headings(await list({ fout: 'weg' }))).toContain('h2 Deze wedstrijd bestaat niet')
  })
})

describe('the match', () => {
  it('shows the form with the values of the match, a label for every field and one button per goal that names it', async () => {
    const id = await addMatch({ competition: 'KNVB Beker', round: 'Tweede ronde' })

    await database.db.insert(players).values({ name: 'Luca Oyen', position: 'aanvaller', searchTerm: 'oyen', season })

    const html = await form(id)

    expect(headings(html)).toEqual(
      expect.arrayContaining([
        'h1 Wedstrijd invullen',
        'h2 Aftrap',
        'h2 Status en uitslag',
        'h2 Doelpunten',
        'h2 Reden',
      ]),
    )
    for (const label of [
      'Datum',
      'Tijd',
      'Status',
      'Doelpunten sc Heerenveen',
      'Doelpunten N.E.C.',
      'Verlenging',
      'Reden',
    ]) {
      expect(html).toContain(`>${label}`)
    }
    expect(html).toContain('Doelpunt toevoegen')
    expect(html).not.toContain('weghalen')
    // The hidden first button makes Enter save.
    expect(html.indexOf('value="opslaan"')).toBeLessThan(html.indexOf('Doelpunt toevoegen'))
  })

  it('has no field for extra time in the league', async () => {
    const id = await addMatch()
    const html = await form(id)

    expect(html).not.toContain('Verlenging')
    expect(html).not.toContain('strafschoppen-wij')
  })

  it('names the goal in every field and button of it, and offers the squad', async () => {
    const id = await addMatch()

    await database.db.insert(players).values({ name: 'Luca Oyen', position: 'aanvaller', searchTerm: 'oyen', season })
    await saveEntry(
      database.db,
      userId,
      id,
      {
        goals: [
          {
            minute: 12,
            ours: true,
            ownGoal: false,
            penalty: false,
            player: 'Oyen',
            playerId: null,
            stoppageMinutes: null,
            wikipediaPage: null,
          },
        ],
        kickoff: { dateText: null, kickoffAt: base.kickoffAt ?? null, matchDate: '2026-10-31' },
        result: {
          afterNinetyAgainst: null,
          afterNinetyFor: null,
          extraTime: false,
          goalsAgainst: 0,
          goalsFor: 1,
          penaltiesAgainst: null,
          penaltiesFor: null,
          status: 'played',
        },
      },
      'Wikipedia is achter',
    )

    const html = await form(id)

    expect(headings(html)).toContain('h3 Doelpunt 1')
    expect(html).toContain('Minuut, doelpunt 1')
    expect(html).toContain('Doelpunt 1 weghalen')
    expect(html).toContain('Luca Oyen')
    expect(html).toContain('Andere speler')
  })

  it('tells what the editors entered, who did it and why, and the button to take it away with its own reason', async () => {
    const id = await addMatch()

    expect(await form(id)).not.toContain('Invoer weghalen')

    await saveEntry(
      database.db,
      userId,
      id,
      {
        goals: [],
        kickoff: { dateText: null, kickoffAt: base.kickoffAt ?? null, matchDate: '2026-10-31' },
        result: {
          afterNinetyAgainst: null,
          afterNinetyFor: null,
          extraTime: false,
          goalsAgainst: 0,
          goalsFor: 0,
          penaltiesAgainst: null,
          penaltiesFor: null,
          status: 'played',
        },
      },
      'Wikipedia is achter',
    )

    const html = await form(id)

    expect(headings(html)).toContain('h2 Aangepast door de redactie')
    expect(html).toContain('ingevuld: uitslag')
    expect(html).toContain('sanne@example.org')
    expect(html).toContain('Reden: Wikipedia is achter')
    expect(html).toContain('Invoer weghalen voor Speelronde 11 (Eredivisie): sc Heerenveen - N.E.C.')
    expect(html).toContain('Reden om de invoer weg te halen')
  })

  it('shows what Wikipedia said when it differed from the entry', async () => {
    const id = await addMatch()

    await saveEntry(
      database.db,
      userId,
      id,
      {
        goals: [],
        kickoff: { dateText: null, kickoffAt: base.kickoffAt ?? null, matchDate: '2026-10-31' },
        result: {
          afterNinetyAgainst: null,
          afterNinetyFor: null,
          extraTime: false,
          goalsAgainst: 0,
          goalsFor: 0,
          penaltiesAgainst: null,
          penaltiesFor: null,
          status: 'played',
        },
      },
      'Wikipedia is achter',
    )
    await database.db.update(matchEdits).set({ reportedResult: 'sc Heerenveen 1-1 N.E.C.' })

    const html = await form(id)

    expect(headings(html)).toContain('h3 Wikipedia zegt iets anders')
    expect(html).toContain('Voor de uitslag zegt Wikipedia: sc Heerenveen 1-1 N.E.C.')
  })

  it.each([
    ['opgeslagen', 'Opgeslagen'],
    ['ongewijzigd', 'Niets veranderd'],
    ['weggehaald', 'Invoer weggehaald'],
    ['geen-invoer', 'Niets weggehaald'],
  ])('tells what the last action did: %s', async (done, title) => {
    const id = await addMatch()

    expect(headings(await form(id, { gedaan: done }))).toContain(`h2 ${title}`)
  })

  it('says nothing for an action it does not know', async () => {
    const id = await addMatch()

    expect(await form(id, { gedaan: 'iets-anders' })).not.toContain('gedaan-kop')
  })

  it('is not there for a match that does not exist, or a number that is not one', async () => {
    await expect(form(99_999)).rejects.toThrow('not found')
    await expect(form('abc')).rejects.toThrow('not found')
  })
})
