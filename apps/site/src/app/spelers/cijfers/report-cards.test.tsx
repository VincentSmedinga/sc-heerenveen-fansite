import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons } from '#src/matches'
import { getSeasonPlayerStats } from '#src/season-player-stats'
import { getSeasonReportFigures } from '#src/season-report-figures'
import { playerFiguresShortcutsFor } from '#src/statisticsShortcuts'
import { matchData } from '#src/test-matches'
import { figuresData, noReports } from '#src/test-report-figures'
import { withoutIcons } from '#src/without-icons'

import PlayersPage from './page'

vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))
vi.mock('#src/season-player-stats', () => ({ getSeasonPlayerStats: vi.fn() }))
vi.mock('#src/season-report-figures', () => ({ getSeasonReportFigures: vi.fn(), seasonHasReports: vi.fn() }))

// The afternoon of Friday 23 October 2026 in the Netherlands.
const now = new Date('2026-10-23T13:40:00Z')

const render = async (searchParams: Record<string, string> = {}) =>
  withoutIcons(renderToStaticMarkup(await PlayersPage({ searchParams: Promise.resolve(searchParams) })))

const plain = (html: string | undefined) => (html ?? '').replaceAll(/<[^>]*>/g, '')

/** The card with this heading, as HTML. */
const cardOf = (html: string, id: string) =>
  html.match(new RegExp(`<section class="hf-card[^"]*" aria-labelledby="${id}">.*?</section>`, 's'))?.[0] ?? ''

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27'])
  vi.mocked(getSeasonPlayerStats).mockReset()
  vi.mocked(getSeasonPlayerStats).mockResolvedValue([])
  vi.mocked(getSeasonReportFigures).mockReset()
  vi.mocked(getSeasonReportFigures).mockResolvedValue(figuresData)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the cards with the figures of the match reports on /spelers/cijfers', () => {
  it('has the cards Alle spelers, Assists and Minuten for a season with a report that is klaar', async () => {
    const html = await render()

    for (const id of ['alle-spelers', 'assists', 'invallers-die-scoorden', 'minuten']) {
      expect(html).toContain(`id="${id}"`)
    }
  })

  it('puts Alle spelers after Doelpuntenmakers in the main column, and Assists, Minuten and Bijzondere doelpunten in the side section, before the credit', async () => {
    const html = await render()
    const main = html.slice(html.indexOf('style="grid-area:main"'), html.indexOf('style="grid-area:side"'))
    const sidebar = html.slice(html.indexOf('style="grid-area:side"'), html.indexOf('</main>'))

    expect(main.indexOf('id="doelpuntenmakers"')).toBeLessThan(main.indexOf('id="alle-spelers"'))
    expect(main).toContain('<section class="hf-card hf-card-shareable" aria-labelledby="alle-spelers">')
    expect(sidebar).not.toContain('id="alle-spelers"')
    expect(sidebar.indexOf('id="assists"')).toBeLessThan(sidebar.indexOf('id="minuten"'))
    expect(sidebar.indexOf('id="minuten"')).toBeLessThan(sidebar.indexOf('id="invallers-die-scoorden"'))
    expect(sidebar.indexOf('id="invallers-die-scoorden"')).toBeLessThan(sidebar.indexOf('id="bijzondere-doelpunten"'))
    expect(sidebar.indexOf('id="bijzondere-doelpunten"')).toBeLessThan(sidebar.indexOf('Bron: Wikipedia'))
  })

  it('has a heading for every link of the bar, in the order of the bar', async () => {
    const html = await render()
    const ids = [...html.matchAll(/<h2 [^>]*id="([^"]+)"/g)].map(([, id]) => `#${id}`)

    expect(playerFiguresShortcutsFor(true).map(({ href }) => href)).toEqual(ids)
  })

  it('says how many of the played matches each card rests on, and names no source: the figures are our own', async () => {
    const html = await render()

    for (const id of ['alle-spelers', 'assists', 'invallers-die-scoorden', 'minuten']) {
      const card = cardOf(html, id)

      expect(plain(card)).toContain('Op basis van 12 van de 14 gespeelde wedstrijden.')
      expect(plain(card)).not.toContain('Bron: ')
    }
  })

  it('has a button for an image on each card', async () => {
    const html = await render()

    for (const id of ['alle-spelers', 'assists', 'invallers-die-scoorden', 'minuten']) {
      expect(cardOf(html, id)).toMatch(/hf-card-shareable/)
    }
  })

  it('has the top five of the assists with level players on one place, and says how many players gave one', async () => {
    const card = plain(cardOf(await render(), 'assists'))

    expect(card).toContain('3 spelers gaven een assist')
    expect(card).toContain('De top 5 van de assists van sc Heerenveen in het seizoen 2026/27, in alle competities')
    expect(card).toMatch(/1.*Jan Bank, Sander Vos.*4/s)
  })

  it('has the minutes from the most down', async () => {
    const html = cardOf(await render(), 'minuten')

    expect(plain(html)).toContain('4 spelers hebben gespeeld')
    expect(html.indexOf('Oyen')).toBeLessThan(html.indexOf('Mees'))
    expect(html.indexOf('Mees')).toBeLessThan(html.indexOf('Bank'))
    expect(html).not.toContain('Reserve')
  })

  it('has the substitutes who scored, with how many times', async () => {
    const card = plain(cardOf(await render(), 'invallers-die-scoorden'))

    expect(card).toContain('1 invaller scoorde')
    expect(card).toContain('invallers die scoorden voor sc Heerenveen in het seizoen 2026/27, in alle competities')
    expect(card).toMatch(/1.*Jan Bank.*2/s)
  })

  it('has the card Invallers die scoorden with a sentence and no table when nobody came on and scored', async () => {
    vi.mocked(getSeasonReportFigures).mockResolvedValue({
      ...figuresData,
      players: figuresData.players.map((player) => ({ ...player, substituteGoals: 0 })),
    })

    const html = cardOf(await render(), 'invallers-die-scoorden')

    expect(plain(html)).toContain('Nog geen invaller scoorde.')
    expect(html).not.toContain('<table')
    expect(html).not.toContain('hf-card-shareable')
    expect(plain(html)).toContain('Op basis van 12 van de 14 gespeelde wedstrijden.')
  })

  it('has the table with every player of the reports, with a caption and column headers that have a scope, and the bench player with zeros', async () => {
    const html = cardOf(await render(), 'alle-spelers')

    expect(plain(html)).toContain('5 spelers staan in de verslagen')
    expect(html).toContain('<caption class="hf-visually-hidden">Alle spelers in de verslagen van sc Heerenveen')
    expect(html.match(/<th scope="col"/g)?.length).toBeGreaterThan(0)
    expect(html.match(/<th scope="row">/g)).toHaveLength(5)
    expect(html).toContain('Reserve')
    expect(plain(html)).toContain(
      'G gespeeld, B basis, I invallers, M minuten, D doelpunten, A assists, Y geel, R rood',
    )
  })

  it('reads a name as one name', async () => {
    const html = cardOf(await render(), 'alle-spelers')

    expect(html).toContain(
      '<span class="hf-player-name-given">Luca</span> <span class="hf-player-name-surname">Oyen</span>',
    )
  })

  it('follows the switch: the Eredivisie alone asks the figures for the league', async () => {
    await render({ competitie: 'eredivisie' })

    expect(getSeasonReportFigures).toHaveBeenCalledWith('2026/27', 'league')
    await render()
    expect(getSeasonReportFigures).toHaveBeenCalledWith('2026/27', 'all')
  })

  it('has none of the cards, and no sentence about them, for a season without a report that is klaar', async () => {
    vi.mocked(getSeasonReportFigures).mockResolvedValue(noReports)

    const html = await render()

    for (const id of ['alle-spelers', 'assists', 'invallers-die-scoorden', 'minuten']) {
      expect(html).not.toContain(`id="${id}"`)
    }
    expect(html).not.toContain('Op basis van')
    expect(html).not.toContain('sc Heerenveen Fansite')
  })

  it('keeps the cards for the other choice of the switch when one competition has no report, and says it rests on none', async () => {
    vi.mocked(getSeasonReportFigures).mockResolvedValue({ known: 0, played: 12, players: [], seasonHasReports: true })

    const html = await render({ competitie: 'eredivisie' })

    expect(plain(cardOf(html, 'assists'))).toContain('Er is nog geen assist in de verslagen.')
    expect(plain(cardOf(html, 'assists'))).toContain('Op basis van 0 van de 12 gespeelde wedstrijden.')
    expect(cardOf(html, 'assists')).not.toContain('hf-card-shareable')
  })

  it('leaves the cards out and keeps the rest of the page when the reports can not be read, and logs the reason', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getSeasonReportFigures).mockRejectedValue(new Error('connection lost'))

    const html = await render()

    expect(html).toContain('id="doelpuntenmakers"')
    expect(html).not.toContain('id="assists"')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('connection lost'))
  })
})
