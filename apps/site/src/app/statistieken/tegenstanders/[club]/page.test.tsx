import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchSeasons } from '../../../../matches'
import { getClubPage, getSourcePages } from '../../../../opponents'
import { beker, matchSeasons, sourcePages, testclub } from '../../../../test-opponents'
import { withoutIcons } from '../../../../without-icons'
import ClubOpponentPage, { generateMetadata } from './page'

vi.mock('../../../../matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchSeasons: vi.fn(),
}))
vi.mock('../../../../opponents', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getClubPage: vi.fn(),
  getSourcePages: vi.fn(),
}))

// The afternoon of Friday 30 October 2026 in the Netherlands.
const now = new Date('2026-10-30T13:40:00Z')

const render = async (slug = 'testclub', searchParams: Record<string, string | string[]> = {}) =>
  withoutIcons(
    renderToStaticMarkup(
      await ClubOpponentPage({ params: Promise.resolve({ club: slug }), searchParams: Promise.resolve(searchParams) }),
    ),
  )

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getClubPage).mockReset()
  vi.mocked(getClubPage).mockImplementation((slug) =>
    Promise.resolve(slug === 'testclub' ? testclub : slug === 'beker-united' ? beker : undefined),
  )
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getMatchSeasons).mockResolvedValue(matchSeasons)
  vi.mocked(getSourcePages).mockReset()
  vi.mocked(getSourcePages).mockResolvedValue(sourcePages)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

/** The text of some HTML, as a screen reader and a copy have it. */
const plain = (html: string) =>
  html
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()

/** The rows of the summary: the figure (with _ for a space) and its Totaal, Thuis and Uit. */
const summaryOf = (html: string) =>
  Object.fromEntries(
    [...html.matchAll(/<tr><th scope="row">([^<]*)<\/th>((?:<td[^>]*>\d+<\/td>){3})<\/tr>/g)].map(([, name, cells]) => [
      (name ?? '').replaceAll(' ', '_'),
      [...(cells ?? '').matchAll(/>(\d+)</g)].map(([, cell]) => Number(cell)),
    ]),
  )

/** The lines of the card Wedstrijden: season and competition above each line, and the line */
const meetingsOf = (html: string) =>
  [
    ...html.matchAll(
      /<li><p class="hf-meta">([^<]*) <span aria-hidden="true">·<\/span> ([^<]*)<\/p><div class="hf-short-match">(.*?)<\/div><\/li>/g,
    ),
  ].map(([, season, competition, line]) => [
    season,
    competition,
    (line ?? '')
      .replaceAll(/<[^>]*>/g, ' ')
      .replaceAll(/\s+/g, ' ')
      .trim(),
  ])

describe('the page of a club', () => {
  it('has the name of the club as the h1, and "Eerder: …" under it for the other names', async () => {
    const html = await render()

    expect(html).toMatch(/<h1[^>]*>Testclub<\/h1>/)
    expect(html).toContain('Eerder: Oude Testclub, Testclub 1900')
  })

  it('has no "Eerder" line for a club with one name', async () => {
    expect(await render('beker-united')).not.toContain('Eerder:')
  })

  it('has the summary, with the name of the club in the heading, and a column each for Totaal, Thuis and Uit', async () => {
    const html = await render()

    expect(html).toMatch(/<h2[^>]*id="onze-uitslagen"[^>]*>.*Onze uitslagen tegen Testclub/)
    expect([...html.matchAll(/<th [^>]*scope="col"[^>]*>([^<]*)</g)].map(([, header]) => header)).toEqual([
      'Onderdeel',
      'Totaal',
      'Thuis',
      'Uit',
    ])
    expect(summaryOf(html)).toEqual({
      Doelpunten_tegen: [4, 0, 4],
      Doelpunten_voor: [10, 5, 5],
      Gelijk: [1, 0, 1],
      Gespeeld: [5, 2, 3],
      Gewonnen: [3, 2, 1],
      Verloren: [1, 0, 1],
    })
  })

  it('has no row for points, because the cup gives none', async () => {
    expect(await render()).not.toContain('Punten')
  })

  it.each([[undefined], ['eredivisie']])(
    'has a Totaal that is Thuis plus Uit, and won, drawn and lost that add up to played, for ?competitie=%s',
    async (competitie) => {
      const rows = summaryOf(await render('testclub', competitie === undefined ? {} : { competitie }))

      for (const [name, [total, home, away]] of Object.entries(rows) as [string, [number, number, number]][]) {
        expect(total, name).toBe(home + away)
      }

      for (const column of [0, 1, 2]) {
        expect(
          (rows['Gewonnen']?.[column] ?? NaN) + (rows['Gelijk']?.[column] ?? NaN) + (rows['Verloren']?.[column] ?? NaN),
        ).toBe(rows['Gespeeld']?.[column])
      }
    },
  )

  it('has the biggest win and the biggest loss under the summary, as short lines', async () => {
    const html = await render()

    expect(html).toContain('Grootste overwinning')
    expect(html).toContain('Grootste nederlaag')
    expect(plain(html.slice(html.indexOf('Grootste overwinning')))).toMatch(
      /^Grootste overwinning vr 24 okt 2025 Testclub · thuis 3–0.*Grootste nederlaag/,
    )
  })

  it('has no line for a biggest loss when we never lost, in the Eredivisie', async () => {
    const html = await render('testclub', { competitie: 'eredivisie' })

    expect(html).toContain('Grootste overwinning')
    expect(html).not.toContain('Grootste nederlaag')
  })

  it('has the button for an image on the summary, with the credit of Wikipedia under the image', async () => {
    expect(await render()).toContain('hf-card-shareable')
  })

  it('lists every meeting, the newest first, with the season, the competition, the day and the result', async () => {
    expect(meetingsOf(await render())).toEqual([
      ['2026/27', 'KNVB Beker', 'zo 20 sep Testclub · uit 0–1 0 tegen 1'],
      ['2025/26', 'Eredivisie', 'vr 24 okt 2025 Testclub · thuis 3–0 3 tegen 0'],
      ['2024/25', 'Eredivisie', 'za 1 mrt 2025 Oude Testclub · uit 1–1 1 tegen 1'],
      ['2024/25', 'Eredivisie', 'za 9 nov 2024 Testclub · thuis 2–0 2 tegen 0'],
      ['2022/23', 'Eredivisie', 'zo 2 apr 2023 Testclub · uit 4–2 4 tegen 2'],
    ])
  })

  it('says how many matches it is based on and since which season we have them', async () => {
    expect(await render()).toContain('Gebaseerd op alle 5 gespeelde wedstrijden sinds 2022/23')
  })

  it('has the switch, with the choice Alle wedstrijden current, because the cup was played', async () => {
    const html = await render()

    expect(html).toMatch(
      /<a aria-current="page"[^>]*href="\/statistieken\/tegenstanders\/testclub"[^>]*><span[^>]*>Alle wedstrijden/,
    )
    expect(html).toContain('href="/statistieken/tegenstanders/testclub?competitie=eredivisie"')
  })

  it('counts the Eredivisie alone with ?competitie=eredivisie, and says so', async () => {
    const html = await render('testclub', { competitie: 'eredivisie' })

    expect(meetingsOf(html).map(([season, competition]) => `${season} ${competition}`)).not.toContain(
      '2026/27 KNVB Beker',
    )
    expect(html).toContain('Gebaseerd op alle 4 gespeelde wedstrijden in de Eredivisie sinds 2022/23')
    expect(html).toContain('in de Eredivisie, in totaal, thuis en uit')
  })

  it('says that we have not played the club in the Eredivisie when the only match was in the cup', async () => {
    const html = await render('beker-united', { competitie: 'eredivisie' })

    expect(html).toContain('In de Eredivisie hebben we nog niet tegen deze club gespeeld.')
    expect(html).not.toContain('<table')
    expect(html).toMatch(/<a [^>]*href="\/statistieken\/tegenstanders\/beker-united"[^>]*><span[^>]*>Alle wedstrijden/)
  })

  it('shows the summary for that same club with all the matches, a single cup tie', async () => {
    expect(summaryOf(await render('beker-united'))).toMatchObject({ Gespeeld: [1, 0, 1], Verloren: [1, 0, 1] })
  })

  it('has no switch for a club that was not met in the cup', async () => {
    vi.mocked(getClubPage).mockResolvedValue({ ...testclub, matches: testclub.matches.slice(1) })

    expect(await render()).not.toContain('Welke wedstrijden')
  })

  it('credits the pages of the seasons of the meetings only', async () => {
    const html = await render()

    expect(html).toContain('Eredivisie 2022/23')
    expect(html).toContain('Eredivisie 2026/27')
    expect(html).not.toContain('Eredivisie 2023/24')
  })

  it('has Wedstrijden on the white surface in the main column, and the summary and the stadiums in the sidebar', async () => {
    const html = await render()
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
    const sidebar = html.slice(html.indexOf('<aside'), html.indexOf('</aside>'))

    expect(main).toMatch(
      /<section class="hf-card" aria-labelledby="wedstrijden">|<section aria-labelledby="wedstrijden" class="hf-card">/,
    )
    expect(main).not.toContain('id="onze-uitslagen"')
    expect(sidebar).toMatch(
      /class="hf-card hf-card-soft[^"]*"[^>]*aria-labelledby="onze-uitslagen"|aria-labelledby="onze-uitslagen"[^>]*class="hf-card hf-card-soft/,
    )
    expect(sidebar.indexOf('id="onze-uitslagen"')).toBeLessThan(sidebar.indexOf('id="stadion"'))
    expect(sidebar.indexOf('id="stadion"')).toBeLessThan(sidebar.indexOf('Bron:'))
    expect(html).not.toContain('hf-card-warm')
  })

  it('has the card Stadions on the strong surface, with each name and when we saw it, for a club that changed', async () => {
    const html = await render()
    const card = html.slice(html.indexOf('aria-labelledby="stadion"') - 40, html.indexOf('Zo noemt Wikipedia'))

    expect(card).toContain('hf-card-strong')
    expect(card).toMatch(/<h2[^>]*id="stadion"[^>]*>.*Stadions/)
    expect(card).toContain('<a class="hf-heading-link" href="#stadion"')
    expect(plain(card.slice(card.indexOf('<ul')))).toBe('tot 2 apr 2023 Oud Testpark vanaf 1 mrt 2025 Nieuw Testpark')
    expect(html).toContain('De dagen zijn die van onze wedstrijden, niet van de dag dat de naam veranderde.')
    expect(html).not.toContain('Neutraal Stadion')
    expect(html).not.toContain('Abe Lenstra Stadion')
  })

  it('has the card Stadion with the name alone for a club with one name, and no periods', async () => {
    vi.mocked(getClubPage).mockResolvedValue({ ...testclub, matches: testclub.matches.slice(0, 4) })

    const html = await render()
    const card = html.slice(html.indexOf('aria-labelledby="stadion"'), html.indexOf('Zo noemt Wikipedia'))

    expect(card).toMatch(/<h2[^>]*id="stadion"[^>]*>.*Stadion</)
    expect(plain(card.slice(card.indexOf('<ul')))).toBe('Nieuw Testpark')
    expect(html).not.toContain('niet van de dag dat de naam veranderde')
  })

  it('has the same stadiums with the choice Eredivisie', async () => {
    const html = await render('testclub', { competitie: 'eredivisie' })

    expect(html).toContain('Oud Testpark')
    expect(html).toContain('Nieuw Testpark')
  })

  it('has no card Stadion for a club we only visited in the cup, or without a stadium', async () => {
    expect(await render('beker-united')).not.toContain('id="stadion"')

    vi.mocked(getClubPage).mockResolvedValue({
      ...testclub,
      matches: testclub.matches.map((item) => ({ ...item, stadium: null })),
    })

    expect(await render()).not.toContain('id="stadion"')
  })

  it('names the sidebar after what it holds: the stadium only when there is a card for it', async () => {
    expect(await render()).toContain('aria-label="Onze uitslagen, het stadion en de bron"')

    vi.mocked(getClubPage).mockResolvedValue({
      ...testclub,
      matches: testclub.matches.map((item) => ({ ...item, stadium: null })),
    })

    expect(await render()).toContain('aria-label="Onze uitslagen en de bron"')
  })

  it('has no cards and no sidebar for a club with the choice Eredivisie when we only met it in the cup', async () => {
    const html = await render('beker-united', { competitie: 'eredivisie' })

    expect(html).not.toContain('<aside')
    expect(html).not.toContain('hf-card')
  })

  it('is the page "niet gevonden" for a slug that no club has', async () => {
    await expect(render('bestaat-niet')).rejects.toHaveProperty('digest', expect.stringContaining('404'))
  })

  it.each([['onzin'], ['Eredivisie'], ['']])('is the page "niet gevonden" for the choice %j', async (competitie) => {
    await expect(render('testclub', { competitie })).rejects.toHaveProperty('digest', expect.stringContaining('404'))
  })

  it('is the page "niet gevonden" for a choice given twice', async () => {
    await expect(render('testclub', { competitie: ['eredivisie', 'eredivisie'] })).rejects.toHaveProperty(
      'digest',
      expect.stringContaining('404'),
    )
  })

  it('shows the error page, and says why in the log, when the database cannot be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getClubPage).mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))

    expect(await render()).toContain('Er ging iets mis')
    expect(error).toHaveBeenCalledWith(
      'Could not read the opponent testclub for /statistieken/tegenstanders: connect ECONNREFUSED 127.0.0.1:3306',
    )
  })

  it('has the title, the description and the canonical address of the club', async () => {
    expect(await generateMetadata({ params: Promise.resolve({ club: 'testclub' }) })).toMatchObject({
      alternates: { canonical: 'https://sc.heerenveen.org/statistieken/tegenstanders/testclub' },
      title: 'sc Heerenveen tegen Testclub',
    })
  })

  it('has no metadata of its own for a slug that no club has, and noindex for a page that failed', async () => {
    expect(await generateMetadata({ params: Promise.resolve({ club: 'bestaat-niet' }) })).toEqual({})

    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getClubPage).mockRejectedValue(new Error('no database'))

    expect(await generateMetadata({ params: Promise.resolve({ club: 'testclub' }) })).toMatchObject({
      robots: { index: false },
    })
  })
})
