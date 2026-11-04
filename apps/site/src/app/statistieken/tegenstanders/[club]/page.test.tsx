import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchSeasons } from '#src/matches'
import { type ClubPage, getClubPage, getSourcePages } from '#src/opponents'
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
const summaryOf = (page: string): [string, number[]][] => {
  // The rows of the table of competitions of the card Hoe vaak welke uitslag look the same.
  const html = page.includes('id="hoe-vaak-welke-uitslag"')
    ? page.slice(0, page.indexOf('id="hoe-vaak-welke-uitslag"'))
    : page

  return [...html.matchAll(/<tr><th scope="row">([^<]*)<\/th>((?:<td[^>]*>[^<]*<\/td>)+)<\/tr>/g)].map(
    ([, name, cells]) => [
      name ?? '',
      [...(cells ?? '').matchAll(/>([^<]*)<\/td/g)].map(([, cell]) => Number((cell ?? '').replace('\u2212', '-'))),
    ],
  )
}

/** The card Hoe vaak welke uitslag, from its heading to the end of the card. */
const scoreCardOf = (html: string) => {
  const start = html.indexOf('id="hoe-vaak-welke-uitslag"')
  const end = html.indexOf('</section>', start)

  return start === -1 ? '' : html.slice(start, end)
}

/** How often we won, drew and lost, from the headers of the tables of the score card. */
const sentenceOf = (html: string) => {
  const text = plain(scoreCardOf(html))
  const count = (word: string) => Number(new RegExp(`${word}, (\\d+) keer`).exec(text)?.[1] ?? 0)

  return { drawn: count('Gelijk'), lost: count('Verlies'), won: count('Winst') }
}

/** The competitions of the card, from its table of competitions, as [competition, matches]. */
const competitionsOf = (html: string): [string, number][] => {
  const table = /<table(?:(?!<\/table>).)*Competitie.*?<\/table>/s.exec(scoreCardOf(html))?.[0] ?? ''

  return [...table.matchAll(/<tr><th scope="row">([^<]*)<\/th><td class="hf-numeric">(\d+)<\/td><\/tr>/g)].map(
    ([, name, count]) => [name ?? '', Number(count)],
  )
}

/** The list of the card Wedstrijden, from its first item to its end. */
const listOf = (html: string) => /id="wedstrijden".*?(<ul[^>]*role="list".*?<\/ul>)/s.exec(html)?.[1] ?? ''

/** The items of that list, in order, as HTML. */
const itemsOf = (html: string) => [...listOf(html).matchAll(/<li>(.*?)<\/li>/gs)].map(([, item]) => item ?? '')

/** The lines of the card Wedstrijden as a reader hears them, the newest first. */
const meetingsOf = (html: string) => itemsOf(html).map(plain)

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
  describe('with a list of names of its own', () => {
    const names = [
      { name: 'Oude Testclub', note: null, startDay: null, startSeason: null },
      {
        name: 'Testclub',
        note: 'De KNVB keurde de naam Testclub goed op 5 juni 2012.',
        startDay: null,
        startSeason: '2012/13',
      },
    ]

    it('has the name of the club as the h1, and "Eerder: …" under it from the list, with the period', async () => {
      vi.mocked(getClubPage).mockResolvedValue({ ...testclub, names })

      const html = await render()

      expect(html).toMatch(/<h1[^>]*>Testclub<\/h1>/)
      expect(html).toContain('Eerder: Oude Testclub t/m 2011/12')
    })

    it('does not put the spellings of Wikipedia under the heading any more, with a list or without', async () => {
      vi.mocked(getClubPage).mockResolvedValue({ ...testclub, names })

      expect(await render()).not.toContain('Testclub 1900')
      vi.mocked(getClubPage).mockResolvedValue(testclub)
      expect(await render()).not.toContain('Eerder:')
      expect(await render()).not.toContain('Testclub 1900')
    })

    it('shows the note with its name in a fold, as text', async () => {
      vi.mocked(getClubPage).mockResolvedValue({ ...testclub, names })

      const html = await render()
      const fold = html.slice(html.indexOf('<details'), html.indexOf('</details>'))

      expect(fold).toContain('Over de namen')
      expect(plain(fold.slice(fold.indexOf('<ul')))).toBe(
        't/m 2011/12 Oude Testclub vanaf 2012/13 Testclub De KNVB keurde de naam Testclub goed op 5 juni 2012.',
      )
    })

    it('has no fold when no name has a note, and none with one name', async () => {
      vi.mocked(getClubPage).mockResolvedValue({
        ...testclub,
        names: names.map((name) => ({ ...name, note: null })),
      })
      expect(await render()).not.toContain('Over de namen')

      vi.mocked(getClubPage).mockResolvedValue({ ...testclub, names: [{ ...names[1]! }] })

      const html = await render()

      expect(html).not.toContain('Over de namen')
      expect(html).not.toContain('Eerder:')
    })

    it('shows a note as text, never as markup', async () => {
      vi.mocked(getClubPage).mockResolvedValue({
        ...testclub,
        names: [{ ...names[0]! }, { ...names[1]!, note: '<b>vet</b>"><script>alert(1)</script>' }],
      })

      const html = await render()

      expect(html).not.toContain('<b>vet</b>')
      expect(html).not.toContain('<script>alert(1)')
      expect(html).toContain('&lt;b&gt;vet&lt;/b&gt;')
    })

    it('stays editorial: no intro, no photo, no request to a third party, and the credit of Wikipedia stays', async () => {
      vi.mocked(getClubPage).mockResolvedValue({ ...testclub, names })

      const html = await render()

      expect(html).not.toContain('<img')
      expect(html).not.toMatch(/(?:src|srcset)="https?:/)
      expect(html).toContain('Bron:')
      expect(html).toContain('wikipedia.org')
    })

    it('names every earlier name of the list when the last one is not the name in the heading', async () => {
      vi.mocked(getClubPage).mockResolvedValue({
        ...testclub,
        names: [...names, { name: 'Nieuwste Testclub', note: null, startDay: '2025-06-01', startSeason: null }],
      })

      expect(await render()).toContain(
        'Eerder: Oude Testclub t/m 2011/12, Testclub 2012/13 tot 1 jun 2025, Nieuwste Testclub vanaf 1 jun 2025',
      )
    })
  })

  it('has the name of the club as the h1, and no "Eerder" line for a club without a list', async () => {
    const html = await render()

    expect(html).toMatch(/<h1[^>]*>Testclub<\/h1>/)
    expect(html).not.toContain('Eerder:')
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
    expect(html).toContain('<td class="hf-numeric hf-key">10</td>')
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

  it('lists every meeting as a Match, the newest first, with the day and its year, the competition and the result', async () => {
    expect(meetingsOf(await render())).toEqual([
      'zo 20 sep 2026 · Neutraal Stadion Testclub 1–0 n.v. (0–0) 1 tegen 0, na verlenging; na 90 minuten 0 tegen 0 sc Heerenveen 112’ minuut 112, Voorbeeld , Testclub KNVB Beker · Speelronde 1',
      'vr 24 okt 2025 · Abe Lenstra Stadion sc Heerenveen 3–0 3 tegen 0 Testclub 12’ minuut 12, Vroeg pen. , penalty , sc Heerenveen , ; 40’ minuut 40, Midden , sc Heerenveen , ; 77’ minuut 77, Laat , sc Heerenveen Eredivisie · Speelronde 2',
      'za 1 mrt 2025 · Nieuw Testpark Oude Testclub 1–1 1 tegen 1 sc Heerenveen Eredivisie · Speelronde 3',
      'za 9 nov 2024 · Abe Lenstra Stadion sc Heerenveen 2–0 2 tegen 0 Testclub Eredivisie · Speelronde 4',
      'zo 2 apr 2023 · Oud Testpark Testclub 2–4 2 tegen 4 sc Heerenveen Eredivisie · Speelronde 5',
    ])
  })

  it('has only Match in the list of the card Wedstrijden, a ShortMatch only in Onze uitslagen', async () => {
    const html = await render()
    const list = listOf(html)

    expect(itemsOf(html)).toHaveLength(5)
    expect(itemsOf(html).every((item) => item.startsWith('<div class="hf-match"'))).toBe(true)
    expect(list).not.toContain('hf-short-match')
    // The two selections of the summary keep the short line.
    expect(html.match(/hf-short-match"/g)).toHaveLength(2)
  })

  it('has no line with the season above a match: the day shows the year and the line the competition', async () => {
    const html = await render()
    const list = listOf(html)

    expect(list).not.toContain('2025/26')
    expect(list).not.toContain('2024/25')
    expect(list).not.toMatch(/<li><p class="hf-meta">/)
    expect(meetingsOf(html)).toSatisfy((lines: string[]) => lines.every((line) => / 20\d\d /.test(line)))
  })

  it('shows what Uitslagen shows of a played match: the scorers, extra time and the words of the abbreviations', async () => {
    const html = await render()
    const list = listOf(html)

    expect(list).toContain('hf-match-goals')
    expect(list).toContain('<abbr title="Na verlenging">n.v.</abbr>')
    expect(list).toContain('<abbr title="Penalty">pen.</abbr>')
    // The result is heard as "3 tegen 0", and the legend under the list gives the full words.
    expect(list).toContain('3 tegen 0')
    expect(plain(html.slice(html.indexOf('</ul>', html.indexOf('id="wedstrijden"')), html.indexOf('</section>')))).toBe(
      'n.v. na verlenging, pen. penalty',
    )
  })

  it('keeps the list a list for a screen reader', async () => {
    expect(listOf(await render())).toMatch(/^<ul role="list">/)
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

    expect(meetingsOf(html)).toHaveLength(4)
    expect(meetingsOf(html).join(' ')).not.toContain('KNVB Beker')
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

  it('changes the figures of the card with the switch, and gives the line under it the number of matches only', async () => {
    const all = scoreCardOf(await render())
    const league = scoreCardOf(await render('testclub', { competitie: 'eredivisie' }))

    expect(sentenceOf(all)).toEqual({ drawn: 1, lost: 1, won: 3 })
    expect(plain(all)).toContain('Winst 3× Winst, 3 keer')
    expect(plain(all)).toContain('Alle 5 gespeelde wedstrijden')
    expect(sentenceOf(league)).toEqual({ drawn: 1, lost: 0, won: 3 })
    expect(plain(league)).not.toContain('Verlies')
    expect(plain(league)).toContain('Alle 4 gespeelde wedstrijden')

    for (const card of [all, league]) {
      expect(card).not.toContain('keer gewonnen')
      expect(card).not.toContain('Gebaseerd op')
      expect(card).not.toContain('sinds')
      expect(card).not.toContain('in de Eredivisie')
      expect(card.lastIndexOf('<p class="hf-meta">')).toBeGreaterThan(card.lastIndexOf('</table>'))
    }
  })

  it('gives the header of a table the count for the eye and for a screen reader from one place', async () => {
    const card = scoreCardOf(await render())
    const headers = [...card.matchAll(/<th scope="col">(.*?)<\/th>/g)].map(([, header]) => header ?? '')

    expect(headers.slice(0, 3)).toEqual([
      '<span aria-hidden="true">Winst 3×</span><span class="hf-visually-hidden">Winst, 3 keer</span>',
      '<span aria-hidden="true">Gelijk 1×</span><span class="hf-visually-hidden">Gelijk, 1 keer</span>',
      '<span aria-hidden="true">Verlies 1×</span><span class="hf-visually-hidden">Verlies, 1 keer</span>',
    ])
  })

  it('has the card from one played match on, with the line in the short form', async () => {
    vi.mocked(getClubPage).mockResolvedValue({ ...testclub, matches: testclub.matches.slice(1, 2) })

    const card = plain(scoreCardOf(await render()))

    expect(card).toContain('Winst, 1 keer')
    expect(card).toContain('1 gespeelde wedstrijd')
    expect(card).not.toContain('Alle 1')
  })

  describe('the competitions and the goals', () => {
    const goalsOf = (html: string) => {
      const text = plain(scoreCardOf(html))
      const found = /Doelpunten: (\d+) gemaakt, (\d+) tegen\./.exec(text)

      return found === null ? undefined : { against: Number(found[2]), for: Number(found[1]) }
    }

    it('has a table with a row for each competition, the most matches on top, that follows the switch', async () => {
      expect(competitionsOf(await render())).toEqual([
        ['Eredivisie', 4],
        ['KNVB Beker', 1],
      ])
      expect(competitionsOf(await render('testclub', { competitie: 'eredivisie' }))).toEqual([['Eredivisie', 4]])
    })

    it('has the table after the tables of the outcomes and before the line, with a caption and column headers', async () => {
      const card = scoreCardOf(await render())
      const table = card.slice(card.lastIndexOf('<table'))

      expect(table).toContain('<caption class="hf-visually-hidden">De competities van deze wedstrijden')
      expect(table).toContain('<th scope="col">Competitie</th>')
      expect(table).toContain('Wedstrijden</th>')
      expect(card.indexOf('Winst')).toBeLessThan(card.lastIndexOf('<table'))
      expect(card.lastIndexOf('</table>')).toBeLessThan(card.indexOf('Alle 5 gespeelde wedstrijden'))
    })

    it('adds the competitions up to the matches of the card, for both choices', async () => {
      for (const [searchParams, played] of [
        [{}, 5],
        [{ competitie: 'eredivisie' }, 4],
      ] as const) {
        const html = await render('testclub', searchParams)
        const { drawn, lost, won } = sentenceOf(html)

        expect(competitionsOf(html).reduce((sum, [, count]) => sum + count, 0)).toBe(played)
        expect(drawn + lost + won).toBe(played)
      }
    })

    it('puts the competitions with the same number in the order of the site', async () => {
      const [cup] = testclub.matches
      const league = testclub.matches.at(1)!

      vi.mocked(getClubPage).mockResolvedValue({
        ...testclub,
        matches: [
          { ...league, competition: 'Play-offs Europa League' },
          { ...cup!, competition: 'Europa League' },
          { ...league, competition: 'Play-offs Conference League', matchDate: '2025-05-01' },
          { ...league, competition: 'KNVB Beker', matchDate: '2025-04-01' },
          { ...league, competition: 'Eredivisie', matchDate: '2025-03-01' },
          { ...league, competition: 'Eredivisie', matchDate: '2025-02-01' },
        ],
      })

      expect(competitionsOf(await render())).toEqual([
        ['Eredivisie', 2],
        ['KNVB Beker', 1],
        ['Play-offs Conference League', 1],
        ['Europa League', 1],
        ['Play-offs Europa League', 1],
      ])
    })

    it('has one row for one competition', async () => {
      vi.mocked(getClubPage).mockResolvedValue({ ...testclub, matches: testclub.matches.slice(1) })

      expect(competitionsOf(await render())).toEqual([['Eredivisie', 4]])
    })

    it('has a second chart with the goals scored and conceded of the same matches, for both choices', async () => {
      const all = await render()
      const league = await render('testclub', { competitie: 'eredivisie' })

      // The matches of Testclub: 3–0, 1–1, 2–0 and 4–2 in the Eredivisie, and 0–1 in the cup.
      expect(goalsOf(all)).toEqual({ against: 4, for: 10 })
      expect(goalsOf(league)).toEqual({ against: 3, for: 10 })
      expect(scoreCardOf(all).match(/<div aria-hidden="true" class="hf-donut-chart /g)).toHaveLength(2)
      expect(scoreCardOf(all)).toContain('hf-donut-chart-small')
      // The small chart has the caption Doelsaldo above it and the goals in the hole.
      expect(plain(scoreCardOf(all))).toMatch(/Doelsaldo\s*10–4/)
      expect(plain(scoreCardOf(league))).toMatch(/Doelsaldo\s*10–3/)
      expect(scoreCardOf(all)).not.toContain('Gemaakt')
    })

    it('says the goals as text for a screen reader, right after the charts and before the tables', async () => {
      const card = scoreCardOf(await render())
      const sentence = card.indexOf('<p class="hf-visually-hidden">Doelpunten: 10 gemaakt, 4 tegen.</p>')

      expect(sentence).toBeGreaterThan(card.lastIndexOf('hf-donut-chart-small'))
      expect(sentence).toBeLessThan(card.indexOf('<table'))
    })
  })

  it('has the card for a club with played matches and matches to come, and none for a club we have not played', async () => {
    expect(await render('nieuw-promovendus')).not.toContain('hoe-vaak-welke-uitslag')
    expect(await render('komend-fc')).toContain('hoe-vaak-welke-uitslag')
    expect(await render('beker-united', { competitie: 'eredivisie' })).not.toContain('hoe-vaak-welke-uitslag')
  })

  it('has the card Stadions on the strong surface, with each name and when we saw it, for a club that changed', async () => {
    const html = await render()
    const card = html.slice(
      html.indexOf('aria-labelledby="stadion"') - 40,
      html.indexOf('</ul>', html.indexOf('aria-labelledby="stadion"')),
    )

    expect(card).toContain('hf-card-strong')
    expect(card).toMatch(/<h2[^>]*id="stadion"[^>]*>.*Stadions/)
    expect(card).toContain('<a class="hf-heading-link" href="#stadion"')
    expect(plain(card.slice(card.indexOf('<ul')))).toBe('t/m 2022/23 Oud Testpark vanaf 2024/25 Nieuw Testpark')
    // The card is the heading and the list: no line about Wikipedia or about days. The credit
    // at the foot of the page says where the names come from.
    expect(html).not.toContain('Zo noemt Wikipedia')
    expect(html).not.toContain('De dagen zijn die van onze wedstrijden')
    expect(html.indexOf('Bron:')).toBeGreaterThan(html.indexOf('aria-labelledby="stadion"'))
    // The card holds the names we saw, not these: they are in the lines of the matches only.
    expect(card).not.toContain('Neutraal Stadion')
    expect(card).not.toContain('Abe Lenstra Stadion')
  })

  it('has the card Stadion with the name alone for a club with one name, and no periods', async () => {
    vi.mocked(getClubPage).mockResolvedValue({ ...testclub, matches: testclub.matches.slice(0, 4) })

    const html = await render()
    const card = html.slice(
      html.indexOf('aria-labelledby="stadion"'),
      html.indexOf('</ul>', html.indexOf('aria-labelledby="stadion"')),
    )

    expect(card).toMatch(/<h2[^>]*id="stadion"[^>]*>.*Stadion</)
    expect(plain(card.slice(card.indexOf('<ul')))).toBe('Nieuw Testpark')
    expect(html).not.toContain('Zo noemt Wikipedia')
  })

  describe('with a list of stadiums of its own', () => {
    const own = [
      { name: 'AFAS Stadion', note: null, startDay: null, startSeason: null },
      {
        name: 'Cars Jeans Stadion',
        note: 'Tijdelijk in Den Haag, na de instorting van het dak.',
        startDay: '2019-08-10',
        startSeason: null,
      },
      { name: 'AFAS Stadion', note: null, startDay: null, startSeason: '2020/21' },
    ]
    const cardOf = (html: string) =>
      html.slice(
        html.indexOf('aria-labelledby="stadion"'),
        html.indexOf('</ul>', html.indexOf('aria-labelledby="stadion"')),
      )

    it('shows only that list, with the period of each name and the note under its name', async () => {
      vi.mocked(getClubPage).mockResolvedValue({ ...testclub, stadiums: own })

      const html = await render()
      const card = cardOf(html)

      expect(plain(card.slice(card.indexOf('<ul')))).toBe(
        'tot 10 aug 2019 AFAS Stadion 10 aug 2019 t/m 2019/20 Cars Jeans Stadion Tijdelijk in Den Haag, na de instorting van het dak. vanaf 2020/21 AFAS Stadion',
      )
      expect(card).not.toContain('Oud Testpark')
      expect(card).not.toContain('Nieuw Testpark')
    })

    it('shows the note as plain text, without markup from the note', async () => {
      vi.mocked(getClubPage).mockResolvedValue({
        ...testclub,
        stadiums: [
          own[0] ?? own[0],
          { ...own[1], note: '<b>Vet</b> & <a href="https://example.test">link</a>' },
        ] as typeof own,
      })

      const card = cardOf(await render())

      expect(card).toContain('&lt;b&gt;Vet&lt;/b&gt; &amp; &lt;a href=')
      expect(card).not.toContain('<b>Vet')
      expect(card).not.toContain('href="https://example.test"')
    })

    it('has the card for a club we only visited in the cup, with the choice Eredivisie too', async () => {
      vi.mocked(getClubPage).mockResolvedValue({ ...beker, stadiums: [own[0] as (typeof own)[0]] })

      const all = await render('beker-united')
      const league = await render('beker-united', { competitie: 'eredivisie' })

      expect(plain(cardOf(all).slice(cardOf(all).indexOf('<ul')))).toBe('AFAS Stadion')
      expect(plain(cardOf(league).slice(cardOf(league).indexOf('<ul')))).toBe('AFAS Stadion')
      expect(league).toContain('aria-label="Het stadion"')
    })

    it('has the card for a club with a list and no match away', async () => {
      vi.mocked(getClubPage).mockResolvedValue({
        ...testclub,
        matches: testclub.matches.filter((item) => item.home),
        stadiums: [own[0] as (typeof own)[0]],
      })

      expect(plain(cardOf(await render()).slice(cardOf(await render()).indexOf('<ul')))).toBe('AFAS Stadion')
    })

    it('names the sidebar of a club with matches to come after the stadium and the source', async () => {
      vi.mocked(getClubPage).mockResolvedValue({ ...promovendus, stadiums: [own[0] as (typeof own)[0]] })

      const html = await render('nieuw-promovendus')

      expect(html).toContain('aria-label="Het stadion en de bron"')
      expect(html.indexOf('id="stadion"')).toBeLessThan(html.indexOf('Bron:'))
    })
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
  /** The lines of the matches to come: a `Match` that has no result, or is called off. */
  const linesOf = (html: string) =>
    itemsOf(html)
      .filter((item) => /hf-match-(versus|postponed|cancelled)/.test(item))
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

describe('the card Doelpuntenmakers on the page of a club', () => {
  // The matches of testclub: the cup tie (a goal of the opponent), the league match 3–0 with
  // the scorers Vroeg (a penalty), Midden and Laat, and three league matches without scorers.
  const [cup, scored, ...others] = testclub.matches

  const withMatches = (matches: typeof testclub.matches) =>
    vi.mocked(getClubPage).mockResolvedValue({ ...testclub, matches })

  const cardOf = (html: string) => {
    const start = html.indexOf('id="doelpuntenmakers"')

    return start === -1 ? '' : html.slice(start, html.indexOf('</section>', start))
  }

  it('is there from five played matches with a result, with the heading of the club, and not with four', async () => {
    withMatches([cup!, scored!, ...others])
    expect(await render()).toContain('>Doelpuntenmakers tegen Testclub</h2>')

    withMatches([scored!, ...others])
    expect(await render()).not.toContain('id="doelpuntenmakers"')

    withMatches([cup!, scored!, ...others, { ...others[0]!, id: 900 }])
    expect(await render()).toContain('>Doelpuntenmakers tegen Testclub</h2>')
  })

  it('does not count a match that is still to come or has no result', async () => {
    const coming = {
      ...others[0]!,
      goals: [],
      goalsAgainst: null,
      goalsFor: null,
      id: 901,
      status: 'scheduled' as const,
    }
    const noResult = { ...coming, id: 902, status: 'played' as const }

    withMatches([coming, noResult, scored!, ...others])
    expect(await render()).not.toContain('id="doelpuntenmakers"')

    withMatches([coming, noResult, cup!, scored!, ...others])
    expect(await render()).toContain('id="doelpuntenmakers"')
  })

  it('stays with both choices of the switch, and the list counts the matches of the choice', async () => {
    // Five matches, of which three were in the Eredivisie: the 3–0 and two without scorers.
    const asCup = (match: (typeof others)[number]) => ({ ...match, competition: 'KNVB Beker' as const })
    const goalOfCup = { ...scored!.goals[0]!, penalty: false, player: 'Beker' }

    withMatches([asCup(others[0]!), { ...asCup(others[1]!), goals: [goalOfCup] }, scored!, others[2]!, cup!])

    const all = cardOf(await render())
    const league = cardOf(await render('testclub', { competitie: 'eredivisie' }))

    expect(plain(all)).toContain('4 spelers hebben gescoord')
    expect(plain(all)).toContain('Gebaseerd op de doelpuntenmakers van 3 van de 5 gespeelde wedstrijden')
    expect(plain(all)).toContain('Beker')
    expect(plain(league)).toContain('3 spelers hebben gescoord')
    expect(plain(league)).toContain('Gebaseerd op de doelpuntenmakers van 1 van de 2 gespeelde wedstrijden')
    expect(plain(league)).not.toContain('Beker')
  })

  it('has the sentence and no table when the chosen matches have no scorers', async () => {
    withMatches([cup!, ...others, { ...others[0]!, id: 903 }].map((match) => ({ ...match, goals: [] })))

    const html = cardOf(await render('testclub', { competitie: 'eredivisie' }))

    expect(plain(html)).toContain('We hebben geen doelpuntenmakers van deze wedstrijden.')
    expect(html).not.toContain('<table')
  })

  it('is in the sidebar after Hoe vaak welke uitslag and before the stadium, soft, with the button for an image', async () => {
    withMatches([cup!, scored!, ...others])

    const html = await render()
    const card = html.slice(html.lastIndexOf('<section', html.indexOf('id="doelpuntenmakers"')))

    expect(html.indexOf('id="hoe-vaak-welke-uitslag"')).toBeLessThan(html.indexOf('id="doelpuntenmakers"'))
    expect(html.indexOf('id="doelpuntenmakers"')).toBeLessThan(html.indexOf('id="stadion"'))
    expect(card).toMatch(/^<section class="hf-card hf-card-soft hf-card-shareable"/)
    expect(plain(html)).toContain('Doelpuntenmakers van sc Heerenveen tegen Testclub')
  })
})

describe('the card Resultaten sinds', () => {
  const cardOf = (html: string) => {
    const start = html.indexOf('aria-labelledby="resultaten-sinds"')
    const end = html.indexOf('</section>', start)

    return start === -1 ? '' : html.slice(start, end)
  }

  // Eight places in a row from 2022/23 to 2025/26 and one in 2026/27: the line has two points.
  const clone = (id: number, goals: [number, number], matchDate: string, season: string) => ({
    ...testclub.matches[3]!,
    goalsAgainst: goals[1],
    goalsFor: goals[0],
    id,
    matchDate,
    season,
  })
  const long: ClubPage = {
    club: { id: 9, name: 'Reeks FC', otherNames: [], slug: 'reeks-fc', wikipediaPage: null },
    matches: [
      ...testclub.matches,
      clone(900, [0, 1], '2023-03-05', '2022/23'),
      clone(901, [1, 1], '2023-09-02', '2023/24'),
      clone(902, [2, 1], '2024-03-02', '2023/24'),
      clone(903, [1, 0], '2026-02-01', '2025/26'),
      clone(904, [3, 1], '2026-08-15', '2026/27'),
    ],
    names: [],
    stadiums: [],
  }

  beforeEach(() => {
    vi.mocked(getClubPage).mockImplementation((slug) =>
      Promise.resolve(
        { 'beker-united': beker, 'komend-fc': komend, 'nieuw-promovendus': promovendus, 'reeks-fc': long, testclub }[
          slug
        ],
      ),
    )
  })

  it('has the first season we have matches of in the heading, as an anchor, in the sidebar between the summary and the card Hoe vaak welke uitslag', async () => {
    const html = await render()
    const sidebar = html.slice(html.indexOf('<aside'), html.indexOf('</aside>'))

    // The oldest season of the seasons we have is 2022/23.
    expect(html).toMatch(/<h2[^>]*id="resultaten-sinds"[^>]*>[\s\S]*Resultaten sinds 2022/)
    expect(html).toContain('href="#resultaten-sinds"')
    expect(sidebar.indexOf('id="onze-uitslagen"')).toBeLessThan(sidebar.indexOf('id="resultaten-sinds"'))
    expect(sidebar.indexOf('id="resultaten-sinds"')).toBeLessThan(sidebar.indexOf('id="hoe-vaak-welke-uitslag"'))
  })

  it('starts with the first season of all the matches we have, not that of the club', async () => {
    vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26', '2018/19'])
    const card = cardOf(await render())

    expect(card).toContain('Resultaten sinds 2018')
    expect(card).toContain('--hf-bar-chart-slots:18')
    expect([...card.matchAll(/class="hf-bar-chart-number[^"]*"[^>]*>(\d+)</g)].map(([, year]) => year)).toEqual([
      '18',
      '23',
    ])
  })

  it('is on the white surface, which the soft card above it and the warm card below it are not', async () => {
    expect(cardOf(await render())).not.toMatch(/hf-card-(soft|warm|strong|transparent)/)
  })

  it('has no button for an image', async () => {
    expect(cardOf(await render())).not.toContain('hf-card-shareable')
  })

  it('has two places for each season up to the season of now, hidden from a screen reader', async () => {
    const card = cardOf(await render())

    // 2022/23 up to and including 2026/27 is five seasons.
    expect(card).toContain('hf-form-timeline')
    expect(card).toContain('--hf-bar-chart-slots:10')
    expect(card).toMatch(/<div[^>]*aria-hidden="true"[^>]*class="hf-bar-chart/)
    expect(card).toContain('Seizoen')
  })

  it('has the key and "Alleen de Eredivisie." in one paragraph and no other text', async () => {
    const html = await render()
    const card = cardOf(html)

    expect(card.match(/<p /g)).toHaveLength(1)
    expect(plain(card)).toContain('W winst (3 punten), G gelijk (1), V verlies (0). Alleen de Eredivisie.')
    expect(card).not.toContain('href="#wedstrijden"')
    expect(plain(card)).not.toMatch(/De lijn|gespeelde wedstrijden|De hele lijst/)
  })

  it('gives the last played match the point of the line, whatever the number of matches', async () => {
    // The page helper takes the drawing of the line out, so the dot at its last point shows it.
    // Testclub has its last match in the seventh place, Reeks FC in the ninth.
    expect(cardOf(await render())).toMatch(/hf-bar-chart-trend-dot[^>]*--hf-bar-chart-across:65/)
    expect(cardOf(await render('reeks-fc'))).toMatch(/hf-bar-chart-trend-dot[^>]*--hf-bar-chart-across:85/)
  })

  it('does not follow the switch: it has the same bars with all the matches and with the Eredivisie alone', async () => {
    const all = cardOf(await render('reeks-fc'))
    const league = cardOf(await render('reeks-fc', { competitie: 'eredivisie' }))

    expect(all.match(/<span class="hf-bar-chart-bar/g)).toHaveLength(9)
    expect(league.match(/<span class="hf-bar-chart-bar/g)).toHaveLength(9)
  })

  it('does not count the cup tie of Testclub as a bar', async () => {
    expect(cardOf(await render()).match(/<span class="hf-bar-chart-bar/g)).toHaveLength(4)
  })

  it('is not there for a club with fewer than four matches in the Eredivisie, and says nothing about it', async () => {
    for (const slug of ['beker-united', 'komend-fc']) {
      const html = await render(slug)

      expect(html).not.toContain('resultaten-sinds')
      expect(html).not.toContain('Resultaten sinds')
    }
  })

  it('is not there for a club with matches to come and none played', async () => {
    expect(await render('nieuw-promovendus')).not.toContain('resultaten-sinds')
  })
})
