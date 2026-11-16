import type { TestDatabase } from '@fansite/db/test-database'

import { persons, playerFieldDifferences, playerListTitles, players, playerStatDifferences } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import SeasonPage from '#src/app/beheer/wedstrijden/kwaliteit/[seizoen]/page'
import { addQualitySeason } from '#src/beheer/quality-fixtures'

import NamesPage, { metadata as namesMetadata } from './namen/page'
import StatDifferencesPage, { metadata as statMetadata } from './spelerscijfers/[seizoen]/page'
import FieldDifferencesPage, { metadata as fieldMetadata } from './spelersgegevens/[seizoen]/page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
}))

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
  await addQualitySeason(database.db)
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  requireRole.mockReset()
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId: 1 })
  await database.db.delete(persons)
  await database.db.delete(playerListTitles)
  await database.db.delete(playerStatDifferences)
  await database.db.delete(playerFieldDifferences)
})

const seasonPage = async (seizoen: string, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await SeasonPage({ params: Promise.resolve({ seizoen }), searchParams: Promise.resolve(searchParams) }),
  )

describe('the page with the names (#1165)', () => {
  it('is for an editor only, and stays out of search engines', async () => {
    renderToStaticMarkup(await NamesPage())

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(namesMetadata.robots).toEqual({ follow: false, index: false })
  })

  it('says what the list of players says about our names, and that it is not read yet', async () => {
    expect(renderToStaticMarkup(await NamesPage())).toContain('nog niet gelezen')

    await database.db.insert(persons).values([{ wikipediaPage: 'Gerrit Abma' }, { wikipediaPage: 'Iemand Anders' }])
    await database.db
      .insert(playerListTitles)
      .values(['Gerrit Abma', 'Luca Oyen'].map((title) => ({ readAt: new Date(), title })))

    const html = renderToStaticMarkup(await NamesPage())

    expect(html).toContain('Iemand Anders')
    expect(html).toContain('Luca Oyen')
    expect(html).toContain('Geen titel verschilt alleen in een teken.')
  })

  it('lists the persons that look alike, and says so when there are none', async () => {
    expect(renderToStaticMarkup(await NamesPage())).toContain('Er zijn geen personen die op elkaar lijken.')

    await database.db
      .insert(persons)
      .values([
        { wikipediaPage: 'Daniël Jansen' },
        { wikipediaPage: "D'aniel Jan-sen" },
        { wikipediaPage: 'Piet Paal' },
      ])

    const html = renderToStaticMarkup(await NamesPage())

    expect(html).toContain('Daniël Jansen en D&#x27;aniel Jan-sen</li>')
    expect(html).not.toContain('Piet Paal')
  })
})

describe('the players whose numbers differ', () => {
  const statDifferences = async (seizoen: string, query: Record<string, string> = {}) =>
    renderToStaticMarkup(
      await StatDifferencesPage({ params: Promise.resolve({ seizoen }), searchParams: Promise.resolve(query) }),
    )

  /** Sanne Spits has one goal in the squad table of 2005/06 and two in the matches. */
  async function addDifference() {
    const [player] = await database.db.select().from(players)

    await database.db.insert(playerStatDifferences).values({
      comparedWith: 'matches',
      competition: 'Eredivisie',
      firstSeenAt: new Date('2026-11-09T10:00:00Z'),
      lastSeenAt: new Date('2026-11-09T10:00:00Z'),
      otherGoals: 2,
      playerId: player!.id,
      season: '2005/06',
      status: 'pending',
      tableGoals: 1,
    })
  }

  it('is for an editor only, and stays out of search engines', async () => {
    await statDifferences('2005-06')

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(statMetadata.robots).toEqual({ follow: false, index: false })
  })

  it('has a link on the page of the season with a difference, and none without', async () => {
    expect(await seasonPage('2005-06')).not.toContain('spelerscijfer')

    await addDifference()

    expect(await seasonPage('2005-06')).toContain(
      '<a href="/beheer/spelers/kwaliteit/spelerscijfers/2005-06">1 spelerscijfer verschilt</a>',
    )
  })

  it('shows the player, the season, the competition and both numbers, with a form to decide', async () => {
    await addDifference()

    const html = await statDifferences('2005-06')
    const buttons = [...html.matchAll(/<button[^>]*aria-label="([^"]*)"[^>]*>(.*?)<\/button>/g)].map(
      ([, name, text]) => [text, name],
    )

    expect(html).toContain('Spelerscijfers die verschillen in 2005/06</h1>')
    expect(html).toContain('Sanne Spits: Eredivisie, tegen de wedstrijden</h2>')
    expect(html).toContain('Selectietabel: 1 doelpunt')
    expect(html).toContain('Wedstrijden: 2 doelpunten')
    expect(buttons).toEqual([
      [
        'Neem de wedstrijden over',
        'Neem de wedstrijden over: de doelpunten van Sanne Spits in de Eredivisie, tegen de wedstrijden',
      ],
      [
        'Houd de selectietabel',
        'Houd de selectietabel: de doelpunten van Sanne Spits in de Eredivisie, tegen de wedstrijden',
      ],
    ])
    expect(html).toContain('Reden voor je besluit over de doelpunten')
  })

  it('says so when nothing differs, and says what the last decision did', async () => {
    const html = await statDifferences('2005-06', { gedaan: 'overgenomen' })

    expect(html).toContain('Er zijn geen spelerscijfers die verschillen in het seizoen 2005/06.')
    expect(html).toContain('<strong>Overgenomen.</strong>')
    expect(await statDifferences('2005-06', { fout: 'geen-rij' })).toContain('De speler staat niet in de selectietabel')
  })

  it.each(['1989-90', '2999-00', 'geen-seizoen'])('does not exist for the season %s', async (seizoen) => {
    await expect(statDifferences(seizoen)).rejects.toThrow('not found')
  })
})

describe('the page with the fields of players where the import says something else than the editors', () => {
  const fieldDifferences = async (seizoen: string, query: Record<string, string> = {}) =>
    renderToStaticMarkup(
      await FieldDifferencesPage({ params: Promise.resolve({ seizoen }), searchParams: Promise.resolve(query) }),
    )

  /** The editors gave Sanne Spits number 9 in 2005/06, and the import read 19. */
  async function addDifference(values: Partial<typeof playerFieldDifferences.$inferInsert> = {}) {
    const [player] = await database.db.select().from(players)

    await database.db.insert(playerFieldDifferences).values({
      editorsValue: '9',
      field: 'shirt_number',
      firstSeenAt: new Date('2026-11-10T10:00:00Z'),
      importValue: '19',
      lastSeenAt: new Date('2026-11-10T10:00:00Z'),
      playerId: player!.id,
      season: '2005/06',
      status: 'pending',
      ...values,
    })
  }

  it('is for an editor only, and stays out of search engines', async () => {
    await fieldDifferences('2005-06')

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(fieldMetadata.robots).toEqual({ follow: false, index: false })
  })

  it('has a link on the page of the season with a difference, and none without', async () => {
    expect(await seasonPage('2005-06')).not.toContain('spelersgegeven')

    await addDifference()

    expect(await seasonPage('2005-06')).toContain(
      '<a href="/beheer/spelers/kwaliteit/spelersgegevens/2005-06">1 spelersgegeven verschilt</a>',
    )
  })

  it('shows the player, the season, the field and both values, with a form to decide', async () => {
    await addDifference()
    await addDifference({ editorsValue: null, field: 'wikipedia_page', importValue: 'Sanne Spits (voetballer)' })

    const html = await fieldDifferences('2005-06')
    const buttons = [...html.matchAll(/<button[^>]*aria-label="([^"]*)"[^>]*>(.*?)<\/button>/g)].map(
      ([, name, text]) => [text, name],
    )

    expect(html).toContain('Spelersgegevens die verschillen in 2005/06</h1>')
    expect(html).toContain('Sanne Spits: rugnummer</h2>')
    expect(html).toContain('Redactie: 9')
    expect(html).toContain('Import: 19')
    expect(html).toContain('Sanne Spits: Wikipedia-pagina</h2>')
    expect(html).toContain('Redactie: leeg')
    expect(html).toContain('Import: Sanne Spits (voetballer)')
    expect(buttons).toEqual([
      ['Neem de import over', 'Neem de import over: het rugnummer van Sanne Spits'],
      ['Houd de redactie', 'Houd de redactie: het rugnummer van Sanne Spits'],
      ['Neem de import over', 'Neem de import over: de Wikipedia-pagina van Sanne Spits'],
      ['Houd de redactie', 'Houd de redactie: de Wikipedia-pagina van Sanne Spits'],
    ])
  })

  it('leaves out a difference that is decided', async () => {
    await addDifference({ resolution: 'person', status: 'rejected' })

    expect(await fieldDifferences('2005-06')).not.toContain('Sanne Spits')
  })

  it('says so when nothing differs, and says what the last decision did', async () => {
    const html = await fieldDifferences('2005-06', { gedaan: 'overgenomen' })

    expect(html).toContain('Er zijn geen spelersgegevens die verschillen in het seizoen 2005/06.')
    expect(html).toContain('<strong>Overgenomen.</strong>')
    expect(await fieldDifferences('2005-06', { fout: 'bezet' })).toContain('Een andere speler van dit seizoen')
  })

  it.each(['1989-90', '2999-00', 'geen-seizoen'])('does not exist for the season %s', async (seizoen) => {
    await expect(fieldDifferences(seizoen)).rejects.toThrow('not found')
  })
})
