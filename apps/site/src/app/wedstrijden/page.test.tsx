import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData } from '../../matches'
import { matchData } from '../../test-matches'
import { withoutIcons } from '../../without-icons'
import MatchesPage, { generateMetadata } from './page'

// Only the query is replaced: the split into the programme and the results is the real one.
vi.mock('../../matches', async (importOriginal) => ({ ...(await importOriginal<object>()), getMatchData: vi.fn() }))

// The afternoon of Friday 23 October 2026 in the Netherlands.
const now = new Date('2026-10-23T13:40:00Z')

async function render() {
  return withoutIcons(renderToStaticMarkup(await MatchesPage()))
}

/** The part of the page under the h2 with this id, up to the next h2 or the end. */
function section(html: string, id: string) {
  const start = html.indexOf(`<h2 class="hf-heading-2" id="${id}">`)
  const end = html.indexOf('<h2', start + 1)

  return html.slice(start, end === -1 ? undefined : end)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchData).mockResolvedValue(matchData)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page /wedstrijden', () => {
  it('has one h1 and three h2 headings in order: the programme, the table and the results', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Wedstrijden</h1>',
      '<h2 class="hf-heading-2" id="programma">Programma</h2>',
      '<h2 class="hf-heading-2" id="stand">Stand</h2>',
      '<h2 class="hf-heading-2" id="uitslagen">Uitslagen</h2>',
    ])
  })

  it('has the programme in the main with the h1, and the table and the results in a named, wide sidebar after it', async () => {
    const html = await render()
    const main = html.match(/<main[^>]*>.*<\/main>/s)?.[0] ?? ''
    const sidebar = html.match(/<aside[^>]*>.*<\/aside>/s)?.[0] ?? ''

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(sidebar).toMatch(
      /^<aside class="hf-page-sidebar hf-page-sidebar-wide" aria-label="De stand en de uitslagen">/,
    )
    expect(main.match(/<h1/g)).toHaveLength(1)
    expect(main).toContain('id="programma"')
    expect(main).not.toContain('id="stand"')
    expect(main).not.toContain('id="uitslagen"')
    expect(sidebar.indexOf('id="stand"')).toBeLessThan(sidebar.indexOf('id="uitslagen"'))
    expect(sidebar).not.toContain('<h1')
    expect(sidebar).not.toContain('id="programma"')
  })

  it('has no order or style attribute, so the order on a phone is the order in the source', async () => {
    expect(await render()).not.toMatch(/ style=|order:/)
  })

  it('names each card by its h2, so the links with a hash on the homepage have a target', async () => {
    const html = await render()

    for (const id of ['programma', 'uitslagen', 'stand']) {
      expect(html).toContain(`<section class="hf-card" aria-labelledby="${id}">`)
    }
  })

  it('shows every match still to come in the programme, in order, a postponed one and a weekend included', async () => {
    const programme = section(await render(), 'programma')

    expect(programme.match(/class="hf-match"/g)).toHaveLength(3)
    expect(programme.indexOf('Speelronde 5')).toBeLessThan(programme.indexOf('Speelronde 10'))
    expect(programme.indexOf('Speelronde 10')).toBeLessThan(programme.indexOf('Speelronde 22'))
    expect(programme).toContain('Uitgesteld')
    expect(programme).toContain('wo 28 okt 19:45')
    expect(programme).toContain('weekend 12–14 februari')
    expect(programme).not.toContain('Speelronde 9')
  })

  it('shows the results with the newest first, with the day', async () => {
    const results = section(await render(), 'uitslagen')

    expect(results.match(/class="hf-match"/g)).toHaveLength(4)
    expect(results.indexOf('Tweede ronde')).toBeLessThan(results.indexOf('Speelronde 9'))
    expect(results.indexOf('Speelronde 9')).toBeLessThan(results.indexOf('Speelronde 8'))
    expect(results.indexOf('Speelronde 8')).toBeLessThan(results.indexOf('Speelronde 7'))
    expect(results).toContain('zo 11 okt')
    expect(results).toContain('2–0')
  })

  it('shows the full table with a caption for a screen reader that says the day, and the row of sc Heerenveen marked', async () => {
    const stand = section(await render(), 'stand')

    expect(stand).toContain('<caption class="hf-visually-hidden">Stand op 18 oktober 2026</caption>')
    expect(stand).toContain('aria-label="De volledige stand" class="hf-standings-scroll" role="region" tabindex="0"')
    expect(stand).toContain('class="hf-highlight hf-standings-table-own"')
    expect(stand).toContain('<b>G</b> gespeeld')
    expect(stand).toContain('<b>P</b> punten')
    expect(stand.match(/<th scope="col"/g)?.length).toBeGreaterThan(0)
    expect(stand.match(/<tr[ >]/g)).toHaveLength(4)
  })

  it('has one credit under the page, for the three pages, with the time of the last reading', async () => {
    const html = await render()

    expect(html.match(/class="hf-meta hf-wikipedia-credit"/g)).toHaveLength(1)
    expect(html).toContain('Bron: Wikipedia (')
    expect(html).toContain('href="https://nl.wikipedia.org/wiki/Eredivisie_2026/27_(mannenvoetbal)"')
    expect(html).toContain('href="https://nl.wikipedia.org/wiki/KNVB_Beker_2026/27_(mannen)"')
    expect(html).toContain('<time dateTime="2026-10-23T12:05:00.000Z">23 oktober 2026 om 14:05</time>')
    expect(html.lastIndexOf('hf-wikipedia-credit')).toBeGreaterThan(html.lastIndexOf('</table>'))
    // Last in the sidebar, so on a phone it follows the results and not the programme.
    expect(html.lastIndexOf('hf-wikipedia-credit')).toBeGreaterThan(html.indexOf('id="uitslagen"'))
    expect(html.match(/<aside.*<\/aside>/s)?.[0]).toContain('hf-wikipedia-credit')
  })

  it('has no link to another site except in the credit, and loads nothing from another domain', async () => {
    const html = await render()
    const outside = html.replace(/<p class="hf-meta hf-wikipedia-credit".*?<\/p>/s, '')

    expect(outside).not.toMatch(/https?:\/\//u)
    expect(html).not.toMatch(/<(?:img|script|iframe|link)\b/u)
  })

  it('says in a sentence for visitors that there is nothing yet when the importer has not run', async () => {
    vi.mocked(getMatchData).mockResolvedValue({ matches: [], pages: [], season: '2026/27', standings: [] })

    const html = await render()

    expect(html).toContain('We hebben het programma nog niet gevonden. Kijk straks nog eens.')
    expect(html).toContain('We hebben nog geen uitslagen van dit seizoen.')
    expect(html).toContain('We hebben de stand nog niet gevonden. Kijk straks nog eens.')
    expect(html).not.toContain('Bron: Wikipedia')
    expect(html.match(/<h1/g)).toHaveLength(1)
  })

  it('says the programme is empty when the season is over', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: matchData.matches.filter((match) => match.status === 'played'),
    })

    expect(await render()).toContain('Er staan dit seizoen geen wedstrijden meer op het programma.')
  })

  it('shows the error page in the HTML, and logs the reason, when the database can not be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getMatchData).mockRejectedValue(
      new Error('Failed query: select 1\nparams: geheim', { cause: new Error('connect ECONNREFUSED 127.0.0.1:3306') }),
    )

    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
    expect(html).toContain('<a href="/wedstrijden">Probeer het opnieuw</a>')
    expect(error).toHaveBeenCalledWith(
      'Could not read the matches and the table for /wedstrijden: Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)',
    )
    expect(await generateMetadata()).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })

  it('has a title of its own, a description and the canonical link', async () => {
    const metadata = await generateMetadata()

    expect(metadata.title).toBe('Wedstrijden')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/wedstrijden')
    expect(metadata.description).toMatch(/programma.*uitslagen.*stand/u)
  })
})
