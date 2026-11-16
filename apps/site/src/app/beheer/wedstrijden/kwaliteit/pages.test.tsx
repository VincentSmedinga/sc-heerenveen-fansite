import type { TestDatabase } from '@fansite/db/test-database'

import { persons } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { addQualitySeason } from '#src/beheer/quality-fixtures'

import SeasonPage, { metadata as seasonMetadata } from './[seizoen]/page'
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

describe('the page Kwaliteit van wedstrijden', () => {
  it('is for an editor only, and stays out of search engines', async () => {
    renderToStaticMarkup(await QualityPage())

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(metadata.robots).toEqual({ follow: false, index: false })
    expect(metadata.title).toBe('Kwaliteit van wedstrijden')
  })

  it('shows nothing to somebody without a session or with another role', async () => {
    requireRole.mockRejectedValue(new Error('redirect to /beheer/inloggen'))

    await expect(QualityPage()).rejects.toThrow('redirect to /beheer/inloggen')
  })

  it('has no switch to the persons, and a link back to the matches', async () => {
    const html = renderToStaticMarkup(await QualityPage())

    expect(html).not.toContain('Welke gegevens')
    expect(html).not.toContain('href="/beheer/spelers/kwaliteit/personen"')
    expect(html).toContain('href="/beheer/wedstrijden"')
    expect(html).toContain('href="/beheer/wedstrijden/kwaliteit/formaties"')
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
      'Stadion',
      'Wacht',
    ])
    expect(html).toContain(
      'U Uitslag, A Aftrap, D Doelpunten, O Opstelling, V Verslag, G Gegevens, S Stadion, W Wacht.',
    )
    expect(seasons.at(-1)).toBe('1990/91')
    expect(seasons).toEqual(seasons.toSorted().reverse())
  })

  it('counts the matches of a season with a gap in each part, each a link to the season with that column', async () => {
    const html = renderToStaticMarkup(await QualityPage())
    const row = rowOf(html, '2005/06')

    expect(row).toContain('<span class="hf-data-table-secondary">6 wedstrijden</span>')
    expect(signsOf(row)).toEqual(['', '6', '2', '6', '5', '6', '6', '1'])
    expect(row).toContain(
      '<a href="/beheer/wedstrijden/kwaliteit/2005-06?kolom=doelpunten" class="hf-data-table-mark">2 <span class="hf-visually-hidden">wedstrijden met een gat in Doelpunten in 2005/06</span></a>',
    )
    expect(html).toMatch(/Nog \d+ gaten in 7 wedstrijden van de 7\./)
  })

  it('says a season without gaps is complete, with no sign', async () => {
    const row = rowOf(renderToStaticMarkup(await QualityPage()), '1990/91')

    expect(row).toContain('0 wedstrijden, alles compleet')
    expect(signsOf(row)).toEqual(['', '', '', '', '', '', '', ''])
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
    expect(signsOf(row)).toEqual(['', '?', '2', '?', '?', '2', '?', ''])
    expect(row).toContain(
      `href="/beheer/wedstrijden/${ids.unlinked}/doelpunten?terug=%2Fbeheer%2Fwedstrijden%2Fkwaliteit%2F2005-06&amp;kolom=doelpunten" class="hf-data-table-mark">2 <span class="hf-visually-hidden">doelpunten zonder speler bij Nepstad Rangers (t), 17 september 2005</span>`,
    )
    expect(row).toContain(`href="/beheer/wedstrijden/${ids.unlinked}/verslag"`)
    expect(row).toContain(
      `href="/beheer/wedstrijden/${ids.unlinked}/uitslag?terug=%2Fbeheer%2Fwedstrijden%2Fkwaliteit%2F2005-06&amp;kolom=aftrap#aftrap-kop"`,
    )
  })

  it('keeps only the matches with a gap in one column, and links to all columns', async () => {
    const html = await seasonPage('2005-06', { kolom: 'wacht' })

    expect([...html.matchAll(/<tr><th scope="row">/g)]).toHaveLength(1)
    expect(signsOf(rowOf(html, '24 sep')).at(-1)).toBe('2')
    expect(html).toContain('<a href="/beheer/wedstrijden/kwaliteit/2005-06">Alle kolommen</a>')
    expect(html).toContain('1 wedstrijd van de 6 heeft een gat in de kolom Wacht.')
  })

  it('says when a column is complete, and after the last save in it', async () => {
    const html = await seasonPage('2005-06', { gedaan: 'kolom-compleet', kolom: 'uitslag' })

    expect(html).toContain('Alles compleet in de kolom Uitslag.')
    expect(html).toContain('Er is geen andere wedstrijd van 2005/06 met een gat in deze kolom.')
  })

  it('links to the seasons before and after', async () => {
    const html = await seasonPage('2005-06')

    expect(html).toContain('<a href="/beheer/wedstrijden/kwaliteit/2004-05">Vorig seizoen</a>')
    expect(html).toContain('<a href="/beheer/wedstrijden/kwaliteit/2006-07">Volgend seizoen</a>')
  })
})
