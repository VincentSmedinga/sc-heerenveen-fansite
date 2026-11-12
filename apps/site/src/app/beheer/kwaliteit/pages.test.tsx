import type { TestDatabase } from '@fansite/db/test-database'

import { persons, playerFieldDifferences, playerListTitles, players, playerStatDifferences } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { addQualitySeason } from '#src/beheer/quality-fixtures'

import SeasonPage, { metadata as seasonMetadata } from './[seizoen]/page'
import StatDifferencesPage, { metadata as statMetadata } from './[seizoen]/spelerscijfers/page'
import FieldDifferencesPage, { metadata as fieldMetadata } from './[seizoen]/spelersgegevens/page'
import QualityPage, { metadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
}))

let database: TestDatabase
let ids: Awaited<ReturnType<typeof addQualitySeason>>

beforeAll(async () => {
  database = await createTestDatabase()
  ids = await addQualitySeason(database.db)
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

/** The row of a season or a match in a table, from its row header to the end of the row. */
const rowOf = (html: string, header: string) =>
  new RegExp(`<tr><th scope="row">(?:<a [^>]*>)?${header}.*?</tr>`).exec(html)?.[0] ?? ''

/** The signs of a row, in the order of the columns, with an empty string for a full cell. */
const signsOf = (row: string) =>
  [...row.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(
    ([, cell]) => /class="hf-data-table-mark">([^<]*?) ?</.exec(cell ?? '')?.[1] ?? '',
  )

describe('the page Kwaliteit', () => {
  it('is for an editor only, and stays out of search engines', async () => {
    renderToStaticMarkup(await QualityPage())

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(metadata.robots).toEqual({ follow: false, index: false })
    expect(metadata.title).toBe('Kwaliteit')
  })

  it('shows nothing to somebody without a session or with another role', async () => {
    requireRole.mockRejectedValue(new Error('redirect to /beheer/inloggen'))

    await expect(QualityPage()).rejects.toThrow('redirect to /beheer/inloggen')
  })

  it('says how many persons have no line or no country, with a link to their work list', async () => {
    expect(renderToStaticMarkup(await QualityPage())).toContain('Elke persoon heeft een linie en een land.')

    await database.db
      .insert(persons)
      .values([
        { country: 'NL', name: 'Verzonnen Spits' },
        { name: 'Bedachte Back' },
        { country: 'DK', line: 'doelman', name: 'Proef de Keeper' },
      ])

    const html = renderToStaticMarkup(await QualityPage())

    expect(html).toContain('2 personen hebben geen linie en 1 persoon heeft geen land.')
    expect(html).toContain('<a href="/beheer/kwaliteit/personen">Vul de linie en het land aan</a>')
  })

  it('is a table with a caption, a header for each part of a match and a row for each season, the newest first', async () => {
    const html = renderToStaticMarkup(await QualityPage())
    const seasons = [...html.matchAll(/<tr><th scope="row"><a [^>]*>(\d{4}\/\d{2})/g)].map(([, season]) => season)

    expect(html).toContain('<caption class="hf-visually-hidden">Wedstrijden met een gat per seizoen')
    expect([...html.matchAll(/<abbr title="([^"]+)">/g)].map(([, name]) => name)).toEqual([
      'Uitslag',
      'Aftrap',
      'Doelpunten',
      'Opstelling',
      'Verslag',
      'Gegevens',
      'Wacht',
    ])
    expect(html).toContain('U Uitslag, A Aftrap, D Doelpunten, O Opstelling, V Verslag, G Gegevens, W Wacht.')
    expect(seasons.at(-1)).toBe('1990/91')
    expect(seasons).toEqual(seasons.toSorted().reverse())
  })

  it('counts the matches of a season with a gap in each part, each a link to the season with that column', async () => {
    const html = renderToStaticMarkup(await QualityPage())
    const row = rowOf(html, '2005/06')

    expect(row).toContain('<span class="hf-data-table-secondary">6 wedstrijden</span>')
    expect(signsOf(row)).toEqual(['', '6', '2', '6', '5', '6', '1'])
    expect(row).toContain(
      '<a href="/beheer/kwaliteit/2005-06?kolom=doelpunten" class="hf-data-table-mark">2 <span class="hf-visually-hidden">wedstrijden met een gat in Doelpunten in 2005/06</span></a>',
    )
    expect(html).toMatch(/Nog \d+ gaten in 7 wedstrijden van de 7\./)
  })

  it('says a season without gaps is complete, with no sign', async () => {
    const row = rowOf(renderToStaticMarkup(await QualityPage()), '1990/91')

    expect(row).toContain('0 wedstrijden, alles compleet')
    expect(signsOf(row)).toEqual(['', '', '', '', '', '', ''])
  })

  it('says what the list of players says about our names, and that it is not read yet', async () => {
    expect(renderToStaticMarkup(await QualityPage())).toContain('nog niet gelezen')

    await database.db.insert(persons).values([{ wikipediaPage: 'Gerrit Abma' }, { wikipediaPage: 'Iemand Anders' }])
    await database.db
      .insert(playerListTitles)
      .values(['Gerrit Abma', 'Luca Oyen'].map((title) => ({ readAt: new Date(), title })))

    const html = renderToStaticMarkup(await QualityPage())

    expect(html).toContain('Iemand Anders')
    expect(html).toContain('Luca Oyen')
    expect(html).toContain('Geen titel verschilt alleen in een teken.')
  })

  it('lists the persons that look alike, and says so when there are none', async () => {
    expect(renderToStaticMarkup(await QualityPage())).toContain('Er zijn geen personen die op elkaar lijken.')

    await database.db
      .insert(persons)
      .values([
        { wikipediaPage: 'Daniël Jansen' },
        { wikipediaPage: "D'aniel Jan-sen" },
        { wikipediaPage: 'Piet Paal' },
      ])

    const html = renderToStaticMarkup(await QualityPage())

    expect(html).toContain('Daniël Jansen en D&#x27;aniel Jan-sen</li>')
    expect(html).not.toContain('Piet Paal')
  })
})

describe('the table of a season (#1163)', () => {
  it('is for an editor only, stays out of search engines, and is not there for a season it does not know', async () => {
    await seasonPage('2005-06')

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(seasonMetadata.robots).toEqual({ follow: false, index: false })
    await expect(seasonPage('1980-81')).rejects.toThrow('not found')
    await expect(seasonPage('iets')).rejects.toThrow('not found')
  })

  it('has a row for each match with a gap, with a sign that leads to the part of the match', async () => {
    const html = await seasonPage('2005-06')
    const row = rowOf(html, '17 sep')

    expect(html).toContain('<h2 class="hf-heading-2" id="competitie-eredivisie">Eredivisie</h2>')
    expect(row).toContain('<span class="hf-data-table-secondary">Nepstad Rangers (t)</span>')
    expect(signsOf(row)).toEqual(['', '?', '2', '?', '?', '3', ''])
    expect(row).toContain(
      `href="/beheer/wedstrijden/${ids.unlinked}/doelpunten?terug=%2Fbeheer%2Fkwaliteit%2F2005-06&amp;kolom=doelpunten" class="hf-data-table-mark">2 <span class="hf-visually-hidden">doelpunten zonder speler bij Nepstad Rangers (t), 17 september 2005</span>`,
    )
    expect(row).toContain(`href="/beheer/wedstrijden/${ids.unlinked}/verslag"`)
    expect(row).toContain(
      `href="/beheer/wedstrijden/${ids.unlinked}/uitslag?terug=%2Fbeheer%2Fkwaliteit%2F2005-06&amp;kolom=aftrap#aftrap-kop"`,
    )
  })

  it('keeps only the matches with a gap in one column, and links to all columns', async () => {
    const html = await seasonPage('2005-06', { kolom: 'wacht' })

    expect([...html.matchAll(/<tr><th scope="row">/g)]).toHaveLength(1)
    expect(signsOf(rowOf(html, '24 sep')).at(-1)).toBe('2')
    expect(html).toContain('<a href="/beheer/kwaliteit/2005-06">Alle kolommen</a>')
    expect(html).toContain('1 wedstrijd van de 6 heeft een gat in de kolom Wacht.')
  })

  it('says when a column is complete, and after the last save in it', async () => {
    const html = await seasonPage('2005-06', { gedaan: 'kolom-compleet', kolom: 'uitslag' })

    expect(html).toContain('Alles compleet in de kolom Uitslag.')
    expect(html).toContain('Er is geen andere wedstrijd van 2005/06 met een gat in deze kolom.')
  })

  it('links to the seasons before and after', async () => {
    const html = await seasonPage('2005-06')

    expect(html).toContain('<a href="/beheer/kwaliteit/2004-05">Vorig seizoen</a>')
    expect(html).toContain('<a href="/beheer/kwaliteit/2006-07">Volgend seizoen</a>')
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
      '<a href="/beheer/kwaliteit/2005-06/spelerscijfers">1 spelerscijfer verschilt</a>',
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
      '<a href="/beheer/kwaliteit/2005-06/spelersgegevens">1 spelersgegeven verschilt</a>',
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
