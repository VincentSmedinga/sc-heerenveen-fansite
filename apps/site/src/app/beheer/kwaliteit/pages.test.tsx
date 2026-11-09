import type { TestDatabase } from '@fansite/db/test-database'

import { persons } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { addQualitySeason } from '#src/beheer/quality-fixtures'

import WorkListPage, { metadata as listMetadata } from './[seizoen]/[lijst]/page'
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
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'beheerder', userId: 1 })
  await database.db.delete(persons)
})

const workList = async (seizoen: string, lijst: string) =>
  renderToStaticMarkup(await WorkListPage({ params: Promise.resolve({ lijst, seizoen }) }))

/** The row of a season in the table, from its row header to the end of the row. */
const rowOf = (html: string, season: string) =>
  new RegExp(`<tr><th scope="row">${season}.*?</tr>`).exec(html)?.[0] ?? ''

describe('the page Kwaliteit', () => {
  it('is for a beheerder only, and stays out of search engines', async () => {
    renderToStaticMarkup(await QualityPage())

    expect(requireRole).toHaveBeenCalledWith('beheerder')
    expect(metadata.robots).toEqual({ follow: false, index: false })
    expect(metadata.title).toBe('Kwaliteit')
  })

  it('shows nothing to somebody without a session or with another role', async () => {
    requireRole.mockRejectedValue(new Error('redirect to /beheer/inloggen'))

    await expect(QualityPage()).rejects.toThrow('redirect to /beheer/inloggen')
  })

  it('is a table with a caption, a header for each column and a row for each season, the newest first', async () => {
    const html = renderToStaticMarkup(await QualityPage())
    const seasons = [...html.matchAll(/<tr><th scope="row">(\d{4}\/\d{2})/g)].map(([, season]) => season)

    expect(html).toContain('<caption class="hf-visually-hidden">Wat we van elk seizoen weten')
    expect([...html.matchAll(/<th[^>]*scope="col">(.*?)<\/th>/g)].map(([, name]) => name)).toEqual([
      'Seizoen',
      'Wedstrijden',
      'Details',
      'Selectie',
      'Verslagen',
      'Te doen',
    ])
    expect(seasons.at(-1)).toBe('1990/91')
    expect(seasons).toEqual(seasons.toSorted().reverse())
    expect(seasons).toContain('2005/06')
  })

  it('says in words what a season has, with a link to each work list that has work', async () => {
    const row = rowOf(renderToStaticMarkup(await QualityPage()), '2005/06')

    expect(row).toContain('6 wedstrijden, 6 gespeeld (6 van de oude fansite)')
    expect(row).toContain('href="/beheer/kwaliteit/2005-06/zonder-doelpunten">1 wedstrijd zonder doelpunten</a>')
    expect(row).toContain('href="/beheer/kwaliteit/2005-06/doelpunten-zonder-speler">2 doelpunten zonder speler</a>')
    expect(row).toContain('1 verslag klaar')
    expect(row).toContain('href="/beheer/kwaliteit/2005-06/verslagen-bezig">1 verslag niet af</a>')
    expect(row).toContain('Toeschouwers bij 0, scheidsrechter bij 0, geen stand')
    expect(row).toContain('1 speler, onbekend hoe compleet')
    expect(row).toContain('href="/beheer/kwaliteit/2005-06/wachtende-wijzigingen">2 wijzigingen wachten</a>')
  })

  it('has words and no link in a season without matches', async () => {
    const row = rowOf(renderToStaticMarkup(await QualityPage()), '1990/91')

    expect(row).toContain('Geen wedstrijden')
    expect(row).toContain('Geen stand')
    expect(row).toContain('Geen spelers')
    expect(row).toContain('Geen verslagen')
    expect(row).toContain('Niets te doen')
    expect(row).not.toContain('<a ')
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

describe('a work list', () => {
  it('is for a beheerder only, and stays out of search engines', async () => {
    await workList('2005-06', 'zonder-doelpunten')

    expect(requireRole).toHaveBeenCalledWith('beheerder')
    expect(listMetadata.robots).toEqual({ follow: false, index: false })
  })

  it('names the list and the season, and leads each row to the match in the admin', async () => {
    const html = await workList('2005-06', 'zonder-doelpunten')

    expect(html).toContain('Wedstrijden zonder doelpunten in 2005/06</h1>')
    expect(html).toContain(`<a href="/beheer/wedstrijden/${ids.withoutGoals}"`)
    expect(html).toContain('Voorbeeld United - sc Heerenveen')
    expect(html).toContain('27 aug 2005 · Eredivisie, 3')
    expect(html).toContain('<td>1 - 2</td><td>Doelpunten invullen</td>')
    expect(html.match(/<tr>/g)).toHaveLength(2)
  })

  it('leads a report that is not finished to the report', async () => {
    expect(await workList('2005-06', 'verslagen-bezig')).toContain(
      `<a href="/beheer/wedstrijden/${ids.unfinished}/verslag"`,
    )
  })

  it('says how many goals have no player and how many changes wait', async () => {
    expect(await workList('2005-06', 'doelpunten-zonder-speler')).toContain('<td>2 doelpunten zonder speler</td>')
    expect(await workList('2005-06', 'wachtende-wijzigingen')).toContain('<td>2 wijzigingen wachten</td>')
  })

  it('says so when a list is empty', async () => {
    const html = await workList('1990-91', 'verslagen-bezig')

    expect(html).toContain('Deze lijst is leeg')
    expect(html).not.toContain('<table')
  })

  it.each([
    ['1989-90', 'zonder-doelpunten'],
    ['2999-00', 'zonder-doelpunten'],
    ['geen-seizoen', 'zonder-doelpunten'],
    ['2005-06', 'bestaat-niet'],
  ])('says "niet gevonden" for %s/%s', async (seizoen, lijst) => {
    await expect(workList(seizoen, lijst)).rejects.toThrow('not found')
  })
})
