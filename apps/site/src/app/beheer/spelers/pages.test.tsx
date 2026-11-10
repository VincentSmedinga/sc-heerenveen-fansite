import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { adminUsers, matches, matchGoals, personPages, persons, players } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { addPlayer } from '#src/beheer/players'

import PlayerPage, { metadata as playerMetadata } from './[id]/page'
import AddPage, { metadata as addMetadata } from './nieuw/page'
import ListPage, { metadata as listMetadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
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
let matchId: number
let pelleId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const season = '2019/20'
const current = seasonOf(new Date())

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'beheerder', userId })
  await database.db.insert(matches).values(
    await withClubs(database.db, [
      {
        competition: 'Eredivisie',
        goalsAgainst: 0,
        goalsFor: 1,
        home: true,
        kickoffAt: new Date('2019-09-01T12:30:00Z'),
        matchDate: '2019-09-01',
        opponent: 'Oefenstad AZ',
        round: 'Speelronde 5',
        season,
        status: 'played',
      },
    ]),
  )
  matchId = (await database.db.select().from(matches))[0]?.id ?? 0

  const [{ insertId: personId }] = await database.db.insert(persons).values({
    familyName: 'Oyen',
    givenName: 'Luca',
    name: 'Luca Oyen',
    nameSource: 'sort_key',
    wikipediaPage: 'Luca Oyen',
  })

  await database.db.insert(personPages).values({ page: 'Luca Oyen', personId })
  await database.db.insert(players).values([
    {
      name: 'Luca Oyen',
      personId,
      position: 'aanvaller',
      searchTerm: 'Oyen',
      season,
      shirtNumber: 7,
      wikipediaPage: 'Luca Oyen',
    },
    {
      inSquad: false,
      leftSquadAt: new Date('2020-01-31T12:00:00Z'),
      name: 'Jan Vos',
      searchTerm: 'Vos',
      season,
      source: 'verslag',
    },
  ])

  const added = await addPlayer(database.db, userId, season, {
    name: { familyName: 'Amersfoort', familyNamePrefix: 'van', givenName: 'Pelle' },
    page: null,
    personId: null,
    position: 'middenvelder',
    shirtNumber: 14,
  })

  pelleId = 'id' in added ? added.id : 0
})

const list = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await ListPage({ searchParams: Promise.resolve(searchParams) }))
const addForm = async (searchParams: Record<string, string> = { seizoen: '2019-20' }) =>
  renderToStaticMarkup(await AddPage({ searchParams: Promise.resolve(searchParams) }))
const playerForm = async (id: number | string, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await PlayerPage({ params: Promise.resolve({ id: String(id) }), searchParams: Promise.resolve(searchParams) }),
  )
const idOf = async (name: string) =>
  (await database.db.select().from(players)).find((row) => row.name === name)?.id ?? 0

/** The rows of the table of the list: the name in the row header and the texts of the cells. */
const rowsOf = (html: string) =>
  [...html.matchAll(/<tr><th scope="row">(.*?)<\/th>(.*?)<\/tr>/g)].map(([, name, cells]) => [
    // The row header also holds the line of the folded columns: the name is its link.
    (/<a[^>]*>(.*?)<\/a>/u.exec(name ?? '')?.[1] ?? '').replaceAll(/<[^>]*>/g, ''),
    ...[...(cells ?? '').matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(([, cell]) => (cell ?? '').replaceAll(/<[^>]*>/g, '')),
  ])

const valueOf = (html: string, id: string) => new RegExp(`<input[^>]*id="${id}"[^>]*>`, 'u').exec(html)?.[0] ?? ''

describe('the pages of the players', () => {
  it.each([
    ['the list', listMetadata],
    ['the form that adds', addMetadata],
    ['the player', playerMetadata],
  ])('tell search engines to stay away from %s', (_name, metadata) => {
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })

  it.each([
    ['the list', () => list()],
    ['the form that adds', () => addForm()],
    ['the player', () => playerForm(pelleId)],
  ])('are for the beheerder and not for the moderator: %s', async (_name, render) => {
    requireRole.mockImplementation((...roles: string[]) =>
      roles.includes('moderator') ? Promise.resolve({}) : Promise.reject(new Error('not found')),
    )

    await expect(render()).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('beheerder')
  })
})

describe('the list of the players', () => {
  it('opens on the current season, which has no players yet, with the link that adds one', async () => {
    const html = await list()

    expect(html).toContain(`Er zijn nog geen spelers in het seizoen ${current}.`)
    expect(html).toContain(`href="/beheer/spelers/nieuw?seizoen=${current.replace('/', '-')}"`)
    expect(html).toContain(`Speler toevoegen aan ${current}`)
  })

  it('has the players of the chosen season with number, line, source and whether they are in the squad', async () => {
    const html = await list({ seizoen: '2019-20' })

    expect(rowsOf(html)).toEqual([
      ['Luca Oyen', 'Rugnummer 7', 'Aanvaller', 'Wikipedia: selectie', 'In de selectie'],
      ['Pelle van Amersfoort', 'Rugnummer 14', 'Middenvelder', 'Redactie', 'In de selectie'],
      ['Jan Vos', 'Geen rugnummer', 'Positie onbekend', 'Verslag van de redactie', 'Uit de selectie'],
    ])
    expect(html).toContain(`href="/beheer/spelers/${pelleId}"`)
    expect(html).toContain('href="/beheer/spelers/nieuw?seizoen=2019-20"')
    expect(html).toContain('<caption')
    expect(html).toContain('Spelers in het seizoen 2019/20')
  })

  it('falls back to the current season for a season we do not have', async () => {
    expect(await list({ seizoen: '1901-02' })).toContain(`Er zijn nog geen spelers in het seizoen ${current}.`)
  })

  it.each([
    ['gedaan', 'toegevoegd', 'De speler staat in de selectie van 2019/20 en is te kiezen bij een doelpunt.'],
    ['gedaan', 'weggehaald', 'De speler is uit de selectie van 2019/20 gehaald.'],
    ['fout', 'weg', 'Deze speler bestaat niet.'],
    ['fout', 'seizoen', 'Dit seizoen kennen we niet'],
  ])('says what the last action did: %s=%s', async (name, value, text) => {
    const html = await list({ [name]: value, seizoen: '2019-20' })

    expect(html).toMatch(new RegExp(`<p[^>]*role="status"[^>]*>[^<]*${text}`, 'u'))
  })

  it('says nothing for a word it does not know', async () => {
    expect(await list({ gedaan: '<script>' })).not.toContain('role="status"')
  })
})

describe('the form that adds a player', () => {
  it('names the season, and has the search and the fields of a new person, without a list', async () => {
    const html = await addForm()

    expect(html).toContain('Speler toevoegen aan 2019/20')
    expect(html).toContain('action="/beheer/spelers/nieuw"')
    expect(html).toContain('name="seizoen"')
    expect(html).toContain('value="2019-20"')
    expect(html).not.toContain('id="persoon"')

    for (const id of ['zoek', 'voornaam', 'tussenvoegsel', 'achternaam', 'wikipedia', 'rugnummer', 'positie']) {
      expect(html).toMatch(new RegExp(`<label[^>]*for="${id}"`, 'u'))
    }
  })

  it('lists the persons the search finds, the first one chosen, and says how many', async () => {
    const html = await addForm({ q: 'oyen', seizoen: '2019-20' })

    expect(html).toContain('1 persoon met “oyen” in de lijst hieronder.')
    expect(html).toMatch(/<select[^>]*id="persoon"/u)
    expect(html).toMatch(/<option value="\d+" selected="">Luca Oyen \(2019\/20\)<\/option>/u)
    expect(html).toContain('Een nieuwe persoon, die hieronder staat')
    expect(valueOf(html, 'zoek')).toContain('value="oyen"')
  })

  it('says so when the search finds nobody, and keeps the form of a new person', async () => {
    const html = await addForm({ q: 'niemand', seizoen: '2019-20' })

    expect(html).toContain('Geen persoon gevonden met “niemand”. Maak hieronder een nieuwe persoon.')
    expect(html).not.toContain('id="persoon"')
  })

  it('goes to the list with a notice without a season, or for a season we do not have', async () => {
    await expect(addForm({})).rejects.toThrow('redirect to /beheer/spelers?fout=seizoen')
    await expect(addForm({ seizoen: '1901-02' })).rejects.toThrow('redirect to /beheer/spelers?fout=seizoen')
  })
})

describe('the form of a player', () => {
  it('opens with the name of his person in parts, his number, line and page', async () => {
    const html = await playerForm(await idOf('Luca Oyen'))

    expect(html).toContain('<h1')
    expect(valueOf(html, 'voornaam')).toContain('value="Luca"')
    expect(valueOf(html, 'achternaam')).toContain('value="Oyen"')
    expect(valueOf(html, 'wikipedia')).toContain('value="Luca Oyen"')
    expect(valueOf(html, 'rugnummer')).toContain('value="7"')
    expect(html).toMatch(/<option value="aanvaller" selected="">Aanvaller<\/option>/u)
    expect(html).toContain('Een andere naam geldt voor deze persoon in elk seizoen.')
    expect(html).toContain('Import')
    expect(html).not.toContain('id="persoon"')
  })

  it('has the block that takes him out of the squad, with a button that names him', async () => {
    const html = await playerForm(pelleId)

    expect(html).toContain('<summary')
    expect(html).toContain('Uit de selectie halen')
    expect(html).toContain('aria-label="Pelle van Amersfoort uit de selectie halen"')
    expect(html).toContain('Redactie')
  })

  it('has no such block for a player with a goal, and says why', async () => {
    await database.db
      .insert(matchGoals)
      .values({ matchId, minute: 12, ours: true, player: 'Van Amersfoort', playerId: pelleId })

    const html = await playerForm(pelleId)

    expect(html).not.toContain('<summary')
    expect(html).toContain('Uit de selectie halen kan niet.')
    expect(html).toContain('heeft in 2019/20 doelpunten of wedstrijden op zijn naam')
  })

  it('has no such block for a player who is out of the squad already', async () => {
    const html = await playerForm(await idOf('Jan Vos'))

    expect(html).not.toContain('<summary')
    expect(html).not.toContain('Uit de selectie halen')
    expect(html).toContain('uit de selectie')
    expect(html).toContain('Hij heeft nog geen persoon')
  })

  it.each([
    ['opgeslagen', 'Opgeslagen'],
    ['ongewijzigd', 'Niets veranderd'],
    ['blijft', 'Niet weggehaald'],
    ['was-al-weg', 'Niets veranderd'],
  ])('says what the last action did: %s', async (word, title) => {
    expect(await playerForm(pelleId, { gedaan: word })).toMatch(
      new RegExp(`<p[^>]*role="status"[^>]*><strong[^>]*>${title}\\.</strong>`, 'u'),
    )
  })

  it('does not exist for a number no player has, or for something that is no number', async () => {
    await expect(playerForm(pelleId + 100)).rejects.toThrow('not found')
    await expect(playerForm('abc')).rejects.toThrow('not found')
  })
})
