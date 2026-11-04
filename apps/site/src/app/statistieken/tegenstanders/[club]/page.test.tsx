import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchSeasons } from '#src/matches'
import { getClubPage, getSourcePages } from '#src/opponents'
import { beker, komend, matchSeasons, promovendus, sourcePages, testclub } from '#src/test-opponents'
import { withoutIcons } from '#src/without-icons'

import ClubOpponentPage, { generateMetadata } from './page'

vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getEditedMatches: () => Promise.resolve(false),
  getMatchSeasons: vi.fn(),
}))
vi.mock('#src/opponents', async (importOriginal) => ({
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
    Promise.resolve({ 'beker-united': beker, 'komend-fc': komend, 'nieuw-promovendus': promovendus, testclub }[slug]),
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

/**
 * The rows of the summary, in the order they are on the page, as [name, figures]: the figures
 * are G, W, G, V, P when the table has points, and S. The minus sign of the goal
 * difference is read as a minus, and the plus as nothing.
 */
const summaryOf = (html: string): [string, number[]][] =>
  [...html.matchAll(/<tr><th scope="row">([^<]*)<\/th>((?:<td[^>]*>[^<]*<\/td>)+)<\/tr>/g)].map(([, name, cells]) => [
    name ?? '',
    [...(cells ?? '').matchAll(/>([^<]*)<\/td/g)].map(([, cell]) => Number((cell ?? '').replace('\u2212', '-'))),
  ])

/** The card Hoe vaak welke uitslag, from its heading to the end of the card. */
const scoreCardOf = (html: string) => {
  const start = html.indexOf('id="hoe-vaak-welke-uitslag"')
  const end = html.indexOf('</section>', start)

  return start === -1 ? '' : html.slice(start, end)
}

/** How often we won, drew and lost, from the sentence of the card Hoe vaak welke uitslag. */
const sentenceOf = (html: string) => {
  const text = plain(scoreCardOf(html))
  const count = (word: string) => Number(new RegExp(`(\\d+) keer ${word}`).exec(text)?.[1] ?? 0)

  return { drawn: count('gelijk'), lost: count('verloren'), won: count('gewonnen') }
}

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

/** The sentence of the row Laatste wedstrijden for a screen reader, if the page has the row. */
const lastMatchesOf = (html: string) =>
  /<span class="hf-visually-hidden">(Laatste wedstrijden: [^<]*)<\/span>/.exec(html)?.[1]

/** The letters of the row, as they are shown: the oldest left and the newest right. */
const lettersOf = (html: string) =>
  [
    ...(/<span aria-hidden="true" class="hf-mark-row-marks">(.*?)<\/span>/.exec(html)?.[1] ?? '').matchAll(
      /<b [^>]*>(.)<\/b>/g,
    ),
  ]
    .map(([, letter]) => letter)
    .join('')

describe('the page of a club', () => {
  it('has the name of the club as the h1, and "Eerder: …" under it for the other names', async () => {
    const html = await render()

    expect(html).toMatch(/<h1[^>]*>Testclub<\/h1>/)
    expect(html).toContain('Eerder: Oude Testclub, Testclub 1900')
  })

  it('has no "Eerder" line for a club with one name', async () => {
    expect(await render('beker-united')).not.toContain('Eerder:')
  })

  it('has the summary, with the name of the club in the heading, and Thuis and Uit with Totaal under them', async () => {
    const html = await render()

    expect(html).toMatch(/<h2[^>]*id="onze-uitslagen"[^>]*>.*Onze uitslagen tegen Testclub/)
    expect(
      [
        ...html
          .slice(0, html.indexOf('id="hoe-vaak-welke-uitslag"'))
          .matchAll(/<th [^>]*scope="col"[^>]*>(?:<abbr[^>]*><span aria-hidden="true">([^<]*)<)?/g),
      ].map(([, header]) => header),
    ).toEqual([undefined, 'G', 'W', 'G', 'V', 'D'])
    expect(plain(html.slice(html.indexOf('hf-bar-legend')))).toMatch(
      /^[^>]*> G gespeeld , W winst , G gelijk , V verlies , D doelsaldo/,
    )
    // G, W, G, V, D: Thuis and Uit in the body, Totaal in the foot.
    expect(summaryOf(html)).toEqual([
      ['Thuis', [2, 2, 0, 0, 5]],
      ['Uit', [3, 1, 1, 1, 1]],
      ['Totaal', [5, 3, 1, 1, 6]],
    ])
    expect(html).toMatch(/<tfoot><tr><th scope="row">Totaal<\/th>/)
    expect(html).not.toMatch(/<tbody>(?:(?!<\/tbody>).)*Totaal/)
  })

  it('writes the goal difference with its sign', async () => {
    vi.mocked(getClubPage).mockResolvedValue({ ...testclub, matches: testclub.matches.slice(0, 1) })

    expect(plain(await render())).toMatch(/Thuis 0 0 0 0 0 Uit 1 0 0 1 \u22121 Totaal 1 0 0 1 \u22121/)
  })

  it('colours the wins, draws and losses like the results, and not the other figures', async () => {
    const html = await render()
    const row = html.slice(html.indexOf('<th scope="row">Totaal</th>'))
    const classes = [...row.slice(0, row.indexOf('</tr>')).matchAll(/<td class="([^"]*)"/g)].map(([, name]) => name)

    expect(classes).toEqual([
      'hf-numeric',
      'hf-numeric hf-match-win',
      'hf-numeric hf-match-draw',
      'hf-numeric hf-match-loss',
      'hf-numeric',
    ])
  })

  it('has no column for points with all the matches, because the cup gives none', async () => {
    const html = await render()

    expect(html).not.toContain('Punten')
    expect(html).not.toContain('>P</span>')
  })

  it('has a bold column of points with the Eredivisie, 3 for a win and 1 for a draw', async () => {
    const html = await render('testclub', { competitie: 'eredivisie' })

    expect(html).toContain('>P</span><span class="hf-visually-hidden">punten</span>')
    expect(summaryOf(html).map(([name, figures]) => [name, figures.at(-2)])).toEqual([
      ['Thuis', 6],
      ['Uit', 4],
      ['Totaal', 10],
    ])
    expect(html).toContain('<td class="hf-numeric hf-bar-value">10</td>')
    expect(plain(html.slice(html.indexOf('hf-bar-legend')))).toContain('P punten')
  })

  it.each([[undefined], ['eredivisie']])(
    'has a Totaal that is Thuis plus Uit, and won, drawn and lost that add up to played, for ?competitie=%s',
    async (competitie) => {
      const rows = Object.fromEntries(
        summaryOf(await render('testclub', competitie === undefined ? {} : { competitie })),
      )
      const [total, home, away] = ['Totaal', 'Thuis', 'Uit'].map((row): number[] => rows[row] ?? [])

      expect(total!.length).toBeGreaterThanOrEqual(5)
      expect(total).toEqual(total!.map((_, column) => (home![column] ?? NaN) + (away![column] ?? NaN)))

      for (const figures of [total, home, away]) {
        const [played, won, drawn, lost] = figures ?? []

        expect((won ?? NaN) + (drawn ?? NaN) + (lost ?? NaN)).toBe(played)
      }
    },
  )

  it('has the biggest win and the biggest loss under the summary, as short lines', async () => {
    const html = await render()

    expect(html).toContain('Grootste overwinning')
    expect(html).toContain('Grootste nederlaag')
    expect(plain(html.slice(html.indexOf('Grootste overwinning')))).toMatch(
      /^Grootste overwinning vr 24 okt 2025 sc Heerenveen 3–0 3 tegen 0 Testclub.*Grootste nederlaag/,
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

  it('has the row Laatste wedstrijden directly under the heading of Wedstrijden, above the list', async () => {
    const html = await render()
    const card = html.slice(html.indexOf('id="wedstrijden"'))

    expect(card.indexOf('hf-mark-row')).toBeGreaterThan(-1)
    expect(card.indexOf('hf-mark-row')).toBeLessThan(card.indexOf('<ul'))
    expect(card.slice(0, card.indexOf('hf-mark-row'))).not.toContain('<li')
  })

  it('shows the latest five as letters from our side, the oldest left, and says them in words', async () => {
    const html = await render()

    // The cup loss of 20 September 2026 is the newest, and so the last letter.
    expect(lettersOf(html)).toBe('WWGWV')
    expect(lastMatchesOf(html)).toBe('Laatste wedstrijden: winst, winst, gelijk, winst, verlies')
  })

  it('has no row with the Eredivisie, where there are only four meetings, and not for a single one', async () => {
    expect(lastMatchesOf(await render('testclub', { competitie: 'eredivisie' }))).toBeUndefined()
    expect(await render('beker-united')).not.toContain('hf-mark-row')
  })

  it('has the row for the choice: one with all the matches, and none with the Eredivisie alone', async () => {
    const withMore = {
      ...testclub,
      matches: [
        ...testclub.matches,
        { ...testclub.matches[1]!, goalsAgainst: 0, goalsFor: 1, id: 99, matchDate: '2022-10-01' },
      ],
    }

    vi.mocked(getClubPage).mockResolvedValue(withMore)

    // Five in the Eredivisie now: 3–0, 1–1, 2–0, 4–2 and the extra 1–0, the newest first. With
    // all the matches the cup loss is the newest, and the extra match is the sixth: not shown.
    expect(lettersOf(await render('testclub', { competitie: 'eredivisie' }))).toBe('WWWGW')
    expect(lettersOf(await render())).toBe('WWGWV')
  })

  it('lists every meeting, the newest first, with the season, the competition, the day and the result', async () => {
    expect(meetingsOf(await render())).toEqual([
      ['2026/27', 'KNVB Beker', 'zo 20 sep Testclub 1–0 1 tegen 0 sc Heerenveen'],
      ['2025/26', 'Eredivisie', 'vr 24 okt 2025 sc Heerenveen 3–0 3 tegen 0 Testclub'],
      ['2024/25', 'Eredivisie', 'za 1 mrt 2025 Oude Testclub 1–1 1 tegen 1 sc Heerenveen'],
      ['2024/25', 'Eredivisie', 'za 9 nov 2024 sc Heerenveen 2–0 2 tegen 0 Testclub'],
      ['2022/23', 'Eredivisie', 'zo 2 apr 2023 Testclub 2–4 2 tegen 4 sc Heerenveen'],
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
    expect(html).toContain('in de Eredivisie, thuis, uit en in totaal')
  })

  it('says that we have not played the club in the Eredivisie when the only match was in the cup', async () => {
    const html = await render('beker-united', { competitie: 'eredivisie' })

    expect(html).toContain('In de Eredivisie hebben we nog niet tegen deze club gespeeld.')
    expect(html).not.toContain('<table')
    expect(html).toMatch(/<a [^>]*href="\/statistieken\/tegenstanders\/beker-united"[^>]*><span[^>]*>Alle wedstrijden/)
  })

  it('shows the summary for that same club with all the matches, a single cup tie', async () => {
    expect(summaryOf(await render('beker-united'))).toEqual([
      ['Thuis', [0, 0, 0, 0, 0]],
      ['Uit', [1, 0, 0, 1, -2]],
      ['Totaal', [1, 0, 0, 1, -2]],
    ])
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
    expect(sidebar.indexOf('id="onze-uitslagen"')).toBeLessThan(sidebar.indexOf('id="hoe-vaak-welke-uitslag"'))
    expect(sidebar.indexOf('id="hoe-vaak-welke-uitslag"')).toBeLessThan(sidebar.indexOf('id="stadion"'))
    expect(sidebar.indexOf('id="stadion"')).toBeLessThan(sidebar.indexOf('Bron:'))
    expect(main).not.toContain('hf-card-warm')
  })

  it('has the card Hoe vaak welke uitslag on the warm surface in the sidebar, as on Wedstrijden', async () => {
    const html = await render()
    const sidebar = html.slice(html.indexOf('<aside'), html.indexOf('</aside>'))

    expect(html).toMatch(/<h2[^>]*id="hoe-vaak-welke-uitslag"[^>]*>.*Hoe vaak welke uitslag/)
    expect(sidebar).toMatch(
      /class="hf-card hf-card-warm[^"]*"[^>]*aria-labelledby="hoe-vaak-welke-uitslag"|aria-labelledby="hoe-vaak-welke-uitslag"[^>]*class="hf-card hf-card-warm/,
    )
    // The page has no link to the heading, so the heading is no anchor (they are a promise).
    expect(html).not.toContain('href="#hoe-vaak-welke-uitslag"')
    // The chart is hidden from a screen reader, which gets the tables: a row for each score.
    expect(plain(scoreCardOf(html))).toMatch(/4–2 , winst 1×/)
  })

  it('counts the scores like the row Totaal of the summary, for both choices of the switch', async () => {
    for (const searchParams of [{}, { competitie: 'eredivisie' }]) {
      const html = await render('testclub', searchParams)
      // The figures of Totaal are G, W, G, V and D (and P with the Eredivisie, after V).
      const [, won, drawn, lost] = summaryOf(html).find(([name]) => name === 'Totaal')![1]

      expect(sentenceOf(html)).toEqual({ drawn, lost, won })
    }
  })

  it('counts a cup tie that a shoot-out decided as a draw, and only the cup with all the matches', async () => {
    const cup = testclub.matches[0]!

    vi.mocked(getClubPage).mockResolvedValue({
      ...testclub,
      matches: [
        { ...cup, goalsAgainst: 1, goalsFor: 1, penaltiesAgainst: 5, penaltiesFor: 4 },
        ...testclub.matches.slice(1),
      ],
    })

    expect(sentenceOf(await render())).toEqual({ drawn: 2, lost: 0, won: 3 })
    expect(sentenceOf(await render('testclub', { competitie: 'eredivisie' }))).toEqual({ drawn: 1, lost: 0, won: 3 })
  })

  it('changes the figures of the card with the switch', async () => {
    const all = scoreCardOf(await render())
    const league = scoreCardOf(await render('testclub', { competitie: 'eredivisie' }))

    expect(plain(all)).toContain('3 keer gewonnen, 1 keer gelijk, 1 keer verloren')
    expect(plain(all)).toContain('Gebaseerd op alle 5 gespeelde wedstrijden sinds')
    expect(plain(league)).toContain('3 keer gewonnen, 1 keer gelijk')
    expect(plain(league)).not.toContain('verloren')
    expect(plain(league)).toContain('Gebaseerd op alle 4 gespeelde wedstrijden in de Eredivisie sinds')
  })

  it('has the card from one played match on, with the line in the form of the other card', async () => {
    vi.mocked(getClubPage).mockResolvedValue({ ...testclub, matches: testclub.matches.slice(1, 2) })

    const card = plain(scoreCardOf(await render()))

    expect(card).toContain('1 keer gewonnen')
    expect(card).toContain('Gebaseerd op 1 gespeelde wedstrijd sinds')
  })

  it('has the card for a club with played matches and matches to come, and none for a club we have not played', async () => {
    expect(await render('nieuw-promovendus')).not.toContain('hoe-vaak-welke-uitslag')
    expect(await render('komend-fc')).toContain('hoe-vaak-welke-uitslag')
    expect(await render('beker-united', { competitie: 'eredivisie' })).not.toContain('hoe-vaak-welke-uitslag')
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

describe('the matches that are still to come on the page of a club', () => {
  /** The list of the card Wedstrijden. */
  const listOf = (html: string) => /id="wedstrijden".*?(<ul[^>]*role="list".*?<\/ul>)/s.exec(html)?.[1] ?? ''

  /** The items of that list, in order, as HTML. */
  const itemsOf = (html: string) => [...listOf(html).matchAll(/<li>(.*?)<\/li>/gs)].map(([, item]) => item ?? '')

  /** The lines of the matches to come (`Match`, not `ShortMatch`), as heard by a reader. */
  const linesOf = (html: string) =>
    itemsOf(html)
      .filter((item) => item.includes('class="hf-match"'))
      .map(plain)

  it('lists them first in the list of the card, the next one first, as Match with the competition in the line', async () => {
    const html = await render('komend-fc')
    const lines = linesOf(html)

    expect(lines).toHaveLength(3)
    // Called off: the day is not known, so the line says so instead of a time.
    expect(lines[0]).toContain('Uitgesteld')
    expect(lines[0]).toContain('Eredivisie · Speelronde 11')
    expect(lines[1]).toMatch(/wo 18 nov 20:45 · Abe Lenstra Stadion.*Komend FC.*KNVB Beker · Achtste finale/)
    expect(lines[2]).toMatch(/za 5 dec 20:30 · Komend Stadion.*Komend FC.*Eredivisie · Speelronde 15/)
    expect(html).toContain('<time dateTime="2026-12-05T19:30:00.000Z"')
  })

  it('has the lines of Match without Thuis, Uit, a season or a score', async () => {
    const lines = linesOf(await render('komend-fc')).join(' ')

    expect(lines).not.toMatch(/Thuis|Uit /)
    expect(lines).not.toContain('2026/27')
    expect(lines).not.toContain('hf-match-goals')
  })

  it('has no subheadings: the matches to come and the played ones are one list, the ones to come first', async () => {
    const html = await render('komend-fc')
    const headings = [...html.matchAll(/<h([23])[^>]*>(?:<[^>]*>)*([^<]*)/g)].map(([, level, text]) => [level, text])

    expect(headings).toEqual([
      ['2', 'Wedstrijden'],
      ['2', 'Onze uitslagen tegen Komend FC'],
      ['2', 'Hoe vaak welke uitslag'],
    ])
    expect(html).not.toContain('Komende wedstrijden')
    expect(html).not.toContain('Gespeelde wedstrijden')
    expect(listOf(html).match(/<ul/g)).toHaveLength(1)
    expect(itemsOf(html)).toHaveLength(4)
    expect(html.indexOf('class="hf-match"')).toBeLessThan(html.indexOf('hf-short-match'))
  })

  it('shows one match that is to come, for a club with a single one', async () => {
    vi.mocked(getClubPage).mockResolvedValue({
      ...komend,
      matches: komend.matches.slice(0, 1).concat(komend.matches[3]!),
    })

    expect(linesOf(await render('komend-fc'))).toHaveLength(1)
  })

  it('leaves out a cup tie with ?competitie=eredivisie, like the played matches', async () => {
    const lines = linesOf(await render('komend-fc', { competitie: 'eredivisie' }))

    expect(lines).toHaveLength(2)
    expect(lines.join(' ')).not.toContain('KNVB Beker')
  })

  it('is unchanged for a club with nothing to come: no match line of Match in the list', async () => {
    const html = await render()

    expect(linesOf(html)).toEqual([])
    expect(html).not.toMatch(/<h3/)
  })

  it('does not count a match that has begun without a result as to come, but keeps one that is called off', async () => {
    vi.setSystemTime(new Date('2026-12-05T19:35:00Z'))

    const lines = linesOf(await render('komend-fc'))

    // The cup tie and the match of 5 December have begun; only the postponed one is left.
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('Uitgesteld')
  })

  it('shows the switch for the competition when only the matches to come are in the cup', async () => {
    vi.mocked(getClubPage).mockResolvedValue({ ...komend, matches: komend.matches.slice(1, 2) })

    expect(await render('komend-fc')).toContain('Alle wedstrijden')
  })

  it('has the card with only the matches to come, no sentence, and only the credit for a club we have not played', async () => {
    const html = await render('nieuw-promovendus')

    expect(linesOf(html)).toHaveLength(1)
    expect(itemsOf(html)).toHaveLength(1)
    expect(html).not.toContain('We hebben nog niet tegen deze club gespeeld')
    expect(html).not.toContain('id="onze-uitslagen"')
    expect(html).not.toContain('id="stadion"')
    expect(html).toContain('aria-label="De bron"')
    expect(html).toContain('Eredivisie 2026/27')
  })

  it('has no sentence for a club we have not played in the Eredivisie when a match to come is there', async () => {
    const html = await render('nieuw-promovendus', { competitie: 'eredivisie' })

    expect(linesOf(html)).toHaveLength(1)
    expect(html).not.toContain('nog niet tegen deze club gespeeld')
  })

  it('credits the seasons of the matches to come as well', async () => {
    vi.mocked(getClubPage).mockResolvedValue({ ...komend, matches: komend.matches.slice(0, 1) })

    expect(await render('komend-fc')).toContain('Eredivisie 2026/27')
  })

  it('has no match to come for a club we only met in the cup', async () => {
    expect(linesOf(await render('beker-united'))).toEqual([])
  })
})
