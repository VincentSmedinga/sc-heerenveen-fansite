import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchNeighbours } from '#src/match-neighbours'
import { getMatchData } from '#src/matches'
import { getPublicReport } from '#src/report-data'
import { matchData } from '#src/test-matches'
import { reportedMatch } from '#src/test-reports'
import { withoutIcons } from '#src/without-icons'

import MatchReportPage, { generateMetadata } from './page'

vi.mock('#src/match-neighbours', () => ({ getMatchNeighbours: vi.fn() }))
vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchData: vi.fn(),
}))
vi.mock('#src/report-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPublicReport: vi.fn(),
}))

// The afternoon of Friday 30 October 2026 in the Netherlands.
const now = new Date('2026-10-30T13:40:00Z')

const params = (seizoen = '2026-27', wedstrijd = '2026-10-24-testdorp-fc') => Promise.resolve({ seizoen, wedstrijd })

const render = async (seizoen?: string, wedstrijd?: string) =>
  withoutIcons(renderToStaticMarkup(await MatchReportPage({ params: params(seizoen, wedstrijd) })))

/** The text of some HTML, as a screen reader and a copy have it. */
const plain = (html: string) =>
  html
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll(/\s+/g, ' ')
    .trim()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getMatchNeighbours).mockReset()
  vi.mocked(getMatchNeighbours).mockResolvedValue({ next: undefined, previous: undefined })
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getPublicReport).mockReset()
  vi.mocked(getPublicReport).mockImplementation((season, slug) =>
    Promise.resolve(season === '2026/27' && slug === '2026-10-24-testdorp-fc' ? reportedMatch() : undefined),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page of a match', () => {
  it('has one h1 with the clubs, the h2 headings Wedstrijdverloop, Opstelling and Verloop, and h3 for the teams and the halves', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)?.map((heading) => plain(heading))).toEqual([
      'sc Heerenveen – Testdorp FC',
      'Wedstrijdverloop',
      'Opstelling',
      'Wissels sc Heerenveen',
      'Wissels Testdorp FC',
      'sc Heerenveen · 4-3-3',
      'Testdorp FC · 4-4-2',
      'Verloop',
      'Eerste helft',
      'Tweede helft',
    ])
    expect(html.match(/<h1/g)).toHaveLength(1)
    // The h1 is for a screen reader: the clubs and the result are what the eye sees.
    expect(html).toMatch(/<h1[^>]*class="[^"]*hf-visually-hidden/u)
  })

  it('puts the header, the score bar, the line-up, the course of the match and the credit in this order', async () => {
    const text = plain(await render())
    const order = [
      'Eindstand',
      'Wedstrijdverloop',
      'Opstelling',
      'Wissels sc Heerenveen',
      'Verloop Eerste helft',
      'De opstelling, de wissels',
    ].map((part) => text.indexOf(part))

    expect(order.every((place) => place >= 0)).toBe(true)
    expect(order).toEqual(order.toSorted((a, b) => a - b))
  })

  it('names the goals under each club in the header, and gives the facts with the round of its own', async () => {
    const text = plain(await render())

    expect(text).toContain('Doelpunten sc Heerenveen: Demo 12’')
    expect(text).toContain('Doelpunten Testdorp FC: Frank Dummydijk 40’')
    expect(text).toContain('Competitie Eredivisie Ronde Speelronde 1 Datum')
  })

  it('shows the result, the competition, the day, the stadium, the attendance and the referee', async () => {
    const text = plain(await render())

    expect(text).toContain('Eindstand: 2 tegen 1 Gewonnen')
    expect(text).toContain('Competitie Eredivisie')
    expect(text).toContain('Ronde Speelronde 1')
    expect(text).toContain('Datum za 24 okt 2026')
    expect(text).toContain('Stadion Stadion Proeflaan')
    expect(text).toContain('Toeschouwers 21.022')
    expect(text).toContain('Scheidsrechter Pieter Maquette')
  })

  it('ends the main column with the links to the previous and the next match', async () => {
    vi.mocked(getMatchNeighbours).mockResolvedValue({
      next: { club: 'Voorbeeld United', home: false, state: 'zo 1 nov', stateDateTime: '2026-11-01' },
      previous: {
        club: 'Proefstad',
        goalsAgainst: 0,
        goalsFor: 2,
        home: true,
        href: '/wedstrijden/2026-27/2026-10-17-proefstad',
      },
    })

    const html = await render()
    const text = plain(html)

    expect(text).toContain('Vorige: Proefstad (thuis) 2–0 Gewonnen')
    expect(text).toContain('Volgende: Voorbeeld United (uit) zo 1 nov')
    expect(html).toContain('href="/wedstrijden/2026-27/2026-10-17-proefstad"')
    expect(html.indexOf('aria-label="Vorige en volgende wedstrijd"')).toBeGreaterThan(html.indexOf('id="verloop"'))
  })

  it('leaves out the facts that are not known', async () => {
    const reported = reportedMatch()

    reported.match.attendance = null
    reported.match.referee = null
    reported.match.stadium = null
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const text = plain(await render())

    expect(text).not.toContain('Toeschouwers')
    expect(text).not.toContain('Scheidsrechter')
    expect(text).not.toContain('Stadion Stadion')
  })

  it('says that there was no audience for a match without one', async () => {
    const reported = reportedMatch()

    reported.match.attendance = 0
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    expect(plain(await render())).toContain('Toeschouwers Zonder publiek')
  })

  it('shows the course of the match as an ordered list, with a word for every event', async () => {
    const html = await render()
    const course = html.slice(html.indexOf('id="verloop"'))

    expect(course).toContain('role="group"')
    expect(course.match(/<ol aria-label="(?:Eerste|Tweede) helft"/g)).toHaveLength(2)
    expect(plain(course)).toContain('Minuut 12, Doelpunt: ')
    expect(plain(course)).toContain('Eigen doelpunt: ')
    expect(plain(course)).toContain('Doelpunt (strafschop): ')
    expect(plain(course)).toContain('Gemiste strafschop')
    expect(plain(course)).toContain('Wissel: ')
    expect(plain(course)).toContain('Gele kaart: ')
    expect(plain(course)).toContain('Rode kaart: ')
    expect(plain(course)).toContain('assist Thijs Idzenga')
  })

  it('shows both teams on the pitch, each with a sentence for every player in the order of the report', async () => {
    const html = await render()
    const lists = [...html.matchAll(/<ol aria-label="(Opstelling [^"]*)"/gu)].map((list) => list[1])

    expect(lists).toEqual(['Opstelling sc Heerenveen, 4-3-3', 'Opstelling Testdorp FC, 4-4-2'])
    expect(plain(html)).toContain('Tjerk Brandsma, rugnummer 1, 90 minuten')
    expect(plain(html)).toContain("Thijs Idzenga, rugnummer 10, aanvoerder, eruit 60', 60 minuten")
    expect(plain(html)).toContain("Ruben ten Hove, rugnummer 4, gele kaart 30', 90 minuten")
  })

  it('shows the substitutes of each team under the pitch, and the line-ups as lists in a disclosure', async () => {
    const text = plain(await render())

    expect(text).toContain('Gerrit Nepper, rugnummer 12, erin in minuut 60 voor Thijs Idzenga')
    expect(text).toContain('Tegenstander 12, rugnummer 12, erin in minuut 45+2 voor Ronald Proefveld')
    expect(text).toContain('Opstelling als lijst sc Heerenveen · 4-3-3 1 Tjerk Brandsma')
    expect(text).toContain('Testdorp FC · 4-4-2 1 Tegenstander 1')
  })

  it('shows the formation of each team above the pitch, and takes the pitch away for a team without one', async () => {
    const reported = reportedMatch()

    expect(plain(await render())).toContain('sc Heerenveen 4-3-3 Testdorp FC 4-4-2')

    reported.stored.report.formationOurs = null
    reported.stored.report.formationOpponent = '4-4-2'
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const html = await render()

    expect(html).not.toContain('aria-label="Opstelling sc Heerenveen')
    expect(plain(html)).toContain('Van sc Heerenveen hebben we de formatie niet')
    expect(html).toContain('aria-label="Opstelling Testdorp FC, 4-4-2"')
  })

  it('draws no pitch for a report without formations, and opens the list with a sentence for each team', async () => {
    const reported = reportedMatch()

    reported.stored.report.formationOurs = null
    reported.stored.report.formationOpponent = null
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const html = await render()
    const text = plain(html)

    expect(html).not.toContain('hf-match-pitch-field')
    expect(html).not.toContain('Uitleg van de merken')
    expect(html).toMatch(/<details[^>]* open/u)
    expect(text).toContain('Van sc Heerenveen hebben we de formatie niet; de spelers staan in de lijst hieronder.')
    expect(text).toContain('Van Testdorp FC hebben we de formatie niet; de spelers staan in de lijst hieronder.')
    expect(text).toContain('Opstelling als lijst')
  })

  it('shows one sentence instead of the line-up of an opponent that is not complete', async () => {
    const reported = reportedMatch()

    reported.stored.report.opponentComplete = false
    reported.stored.appearances = reported.stored.appearances.filter((player) => player.ours)
    reported.stored.substitutions = reported.stored.substitutions.filter((substitution) => substitution.ours)
    reported.stored.cards = reported.stored.cards.filter((card) => card.ours)
    reported.stored.goals = reported.stored.goals.map((goal) => ({
      ...goal,
      appearanceId: goal.ours ? goal.appearanceId : null,
    }))
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const html = await render()

    expect(plain(html)).toContain('De opstelling van Testdorp FC hebben we niet.')
    expect(html).not.toContain('aria-label="Opstelling Testdorp FC')
    expect(html).not.toContain('Wissels Testdorp FC')
    expect(html).not.toContain('Voor Testdorp FC past de formatie niet')
    expect(html).toContain('aria-label="Opstelling sc Heerenveen, 4-3-3"')
  })

  it('says that there was extra time, the score after 90 minutes and the shoot-out in words', async () => {
    const reported = reportedMatch()

    reported.match.extraTime = true
    reported.match.afterNinetyFor = 1
    reported.match.afterNinetyAgainst = 1
    reported.match.goalsFor = 2
    reported.match.goalsAgainst = 2
    reported.match.penaltiesFor = 4
    reported.match.penaltiesAgainst = 3
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    expect(plain(await render())).toContain('Na strafschoppen 4–3 (na verlenging 2–2)')
  })

  /** The made-up match with extra time: 2–1 after extra time, 1–1 after 90 minutes. */
  const withExtraTime = (reported = reportedMatch()) => {
    Object.assign(reported.match, {
      afterNinetyAgainst: 1,
      afterNinetyFor: 1,
      extraTime: true,
      goalsAgainst: 1,
      goalsFor: 2,
    })
    reported.stored.cards.push({
      appearanceId: 2,
      id: 3,
      kind: 'geel',
      matchId: 7,
      minute: 105,
      ours: true,
      stoppageMinutes: null,
    })

    return reported
  }

  it('has a third block Verlenging, a score bar and rings that run to 120 minutes, and the score after 90 minutes', async () => {
    vi.mocked(getPublicReport).mockResolvedValue(withExtraTime())

    const html = await render()
    const text = plain(html)

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)?.map((heading) => plain(heading))).toContain('Verlenging')
    expect(text).toContain('Na verlenging (na 90 minuten 1–1)')
    expect(text).toContain('0 15 30 45 60 75 90 105 120')
    expect(text).toContain("Ruben ten Hove, rugnummer 4, gele kaart 30', 120 minuten")
    expect(html).toContain('hf-match-score-bar-extra-time')
  })

  it('has no block Verlenging, no marks after 90 and rings of 90 minutes without extra time', async () => {
    const html = await render()

    expect(plain(html)).not.toContain('Verlenging')
    expect(plain(html)).not.toContain('105')
    expect(html).not.toContain('hf-match-score-bar-extra-time')
  })

  it('shows the card Strafschoppenserie with a table of the rounds after a shoot-out', async () => {
    const reported = withExtraTime()

    Object.assign(reported.match, { penaltiesAgainst: 3, penaltiesFor: 4 })
    reported.stored.shootout = [
      { appearanceId: 9, id: 1, matchId: 7, ours: true, outcome: 'raak', round: 1 },
      { appearanceId: 109, id: 2, matchId: 7, ours: false, outcome: 'gestopt', round: 1 },
      { appearanceId: 10, id: 3, matchId: 7, ours: true, outcome: 'naast', round: 2 },
    ]
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const html = await render()
    const text = plain(html)

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)?.map((heading) => plain(heading))).toContain('Strafschoppenserie')
    expect(text).toContain('Na strafschoppen 4–3 (na verlenging 2–1)')
    expect(text).toContain('Strafschoppenserie, stand 1–0')
    expect(text).toContain('Raak: Rick Demo')
    expect(text).toContain('Gestopt: Frank Dummydijk')
    expect(text).toContain('Naast: Thijs Idzenga')
    expect(text.indexOf('Strafschoppenserie')).toBeGreaterThan(text.indexOf('Verloop Eerste helft'))
    expect(text.indexOf('Strafschoppenserie')).toBeLessThan(text.indexOf('komen uit onze eigen administratie'))
  })

  it('has the line in the header and no card for a shoot-out of which only the result is known', async () => {
    const reported = withExtraTime()

    Object.assign(reported.match, { penaltiesAgainst: 3, penaltiesFor: 4 })
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const html = await render()

    expect(plain(html)).toContain('Na strafschoppen 4–3 (na verlenging 2–1)')
    expect(plain(html)).toContain('Gewonnen')
    expect(html).not.toContain('Strafschoppenserie')
  })

  it('has no card for a shoot-out in a match without one', async () => {
    expect(plain(await render())).not.toContain('Strafschoppenserie')
  })

  it('has no notice that the report is still being filled in for a report that is klaar', async () => {
    const html = await render()

    expect(plain(html)).not.toContain('We vullen dit verslag nog in')
  })

  it('has a notice in words at the top of the page for a report that is bezig, above the header and the cards', async () => {
    const reported = reportedMatch()

    reported.stored.report.status = 'bezig'
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const text = plain(await render())

    expect(text).toContain(
      'We vullen dit verslag nog in. De opstelling, de wissels of de gebeurtenissen kunnen nog ontbreken of veranderen.',
    )
    expect(text.indexOf('We vullen dit verslag nog in')).toBeLessThan(text.indexOf('Eindstand'))
    expect(text.indexOf('We vullen dit verslag nog in')).toBeLessThan(text.indexOf('Opstelling'))
  })

  it('has the score bar for a report that is klaar, and leaves it out when the goals of the report do not add up to the result', async () => {
    expect(await render()).toContain('hf-match-score-bar')

    const reported = reportedMatch()

    reported.stored.report.status = 'bezig'
    reported.stored.goals = reported.stored.goals.slice(0, 1)
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const html = await render()

    expect(html).not.toContain('hf-match-score-bar')
    expect(plain(html)).not.toContain('Wedstrijdverloop')
    // The result comes from the match, so it stands.
    expect(plain(html)).toContain('Eindstand: 2 tegen 1')
  })

  it('has the notice for a report that was klaar and no longer follows the rules', async () => {
    const reported = reportedMatch()

    reported.match.goalsFor = 3
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    expect(plain(await render())).toContain('We vullen dit verslag nog in')
  })

  it('shows what a report that is bezig has, and leaves out the rest without empty places', async () => {
    const reported = reportedMatch()

    reported.stored.report.status = 'bezig'
    reported.stored.report.opponentComplete = false
    reported.stored.report.formationOurs = null
    reported.stored.cards = []
    reported.stored.goals = []
    reported.stored.incidents = []
    reported.stored.substitutions = []
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const html = await render()
    const text = plain(html)

    expect(text).toContain('We vullen dit verslag nog in')
    expect(text).toContain('De opstelling van Testdorp FC hebben we niet.')
    expect(text).toContain('In deze wedstrijd is niets gebeurd wat we bijhouden.')
    expect(text).toContain('Van sc Heerenveen hebben we de formatie niet')
    expect(html).not.toContain('NaN')
    expect(html).not.toContain('undefined')
  })

  it('links back to the matches of the season, and credits Wikipedia and our own records', async () => {
    const html = await render()
    const text = plain(html)

    expect(html).toContain('href="/wedstrijden"')
    expect(text).toContain('Wedstrijden 2026/27')
    expect(text).toContain(
      'De opstelling, de wissels, de kaarten en de assists komen uit onze eigen administratie, naar het wedstrijdformulier.',
    )
    expect(text).toContain('Wikipedia')
    expect(text).toContain('CC BY-SA 4.0')
  })

  it('names no source for the records when the report has none', async () => {
    const reported = reportedMatch()

    reported.stored.report.source = null
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    expect(plain(await render())).toContain('komen uit onze eigen administratie.')
  })

  it('loads nothing from another domain', async () => {
    const html = await render()

    expect(html).not.toMatch(/<(img|script|iframe|link)[^>]*(src|href)="https?:\/\/(?!nl\.wikipedia\.org)/u)
    expect(html).not.toContain('<img')
  })

  it('is "niet gevonden" for a match without a page, an address that is not one and a season that does not exist', async () => {
    await expect(render('2026-27', '2026-10-25-testdorp-fc')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(render('2026-27', 'onzin')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(render('onzin', '2026-10-24-testdorp-fc')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(render('2025-26', '2026-10-24-testdorp-fc')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  })

  it('shows the page for a server error, and says so in the log, when the database fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getPublicReport).mockRejectedValue(new Error('boem'))

    expect(plain(await render())).toContain('Er ging iets mis')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Could not read the match report'))
  })
})

describe('the metadata of the page of a match', () => {
  it('names the clubs, the result and the day in the title and the description', async () => {
    const metadata = await generateMetadata({ params: params() })

    expect(metadata.title).toBe('sc Heerenveen 2–1 Testdorp FC, 24 oktober 2026')
    expect(metadata.description).toContain('sc Heerenveen – Testdorp FC')
    expect(metadata.description).toContain('24 oktober 2026')
    expect(metadata.description).toContain('2–1')
  })

  it('has no noindex for a report that is klaar', async () => {
    expect((await generateMetadata({ params: params() })).robots).toBeUndefined()
  })

  it('keeps a page whose report is not complete out of the index, and claims nothing about what is missing', async () => {
    const reported = reportedMatch()

    reported.stored.report.status = 'bezig'
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    const metadata = await generateMetadata({ params: params() })

    expect(metadata.robots).toEqual({ index: false })
    expect(metadata.title).toBe('sc Heerenveen 2–1 Testdorp FC, 24 oktober 2026')
    expect(metadata.description).toBe(
      'Wat we tot nu toe hebben van het verslag van sc Heerenveen – Testdorp FC op 24 oktober 2026, Eredivisie: de uitslag was 2–1. We vullen het verslag nog in.',
    )
    expect(metadata.description).not.toContain('de wissels')
  })

  it('has the address of the page as the canonical address', async () => {
    const metadata = await generateMetadata({ params: params() })

    expect(metadata.alternates?.canonical).toMatch(/\/wedstrijden\/2026-27\/2026-10-24-testdorp-fc$/u)
  })

  it('names the clubs in the order of the match when we play away', async () => {
    const reported = reportedMatch()

    reported.match.home = false
    reported.match.goalsFor = 2
    reported.match.goalsAgainst = 1
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    expect((await generateMetadata({ params: params() })).title).toBe('Testdorp FC 1–2 sc Heerenveen, 24 oktober 2026')
  })

  it('has no metadata for an address that is not a page, and keeps a page that failed out of the index', async () => {
    expect(await generateMetadata({ params: params('2026-27', '2026-10-25-testdorp-fc') })).toEqual({})

    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getPublicReport).mockRejectedValue(new Error('boem'))

    expect((await generateMetadata({ params: params() })).robots).toEqual({ index: false })
  })
})

describe('the page of a match that is still being played', () => {
  /** The match of the report, still `scheduled` with no result, and a report that is bezig. */
  function liveMatch(kickoffAt: Date | null = new Date('2026-10-30T12:30:00Z')) {
    const reported = reportedMatch()

    reported.match.goalsAgainst = null
    reported.match.goalsFor = null
    reported.match.kickoffAt = kickoffAt
    reported.match.matchDate = '2026-10-30'
    reported.match.status = 'scheduled'
    reported.stored.report.status = 'bezig'
    vi.mocked(getPublicReport).mockResolvedValue(reported)

    return reported
  }

  it('says Live in words, with the stand counted from the goals of the report, and keeps the notice', async () => {
    liveMatch()

    const text = plain(await render())

    expect(text).toContain('Live')
    expect(text).toContain('Tussenstand: 2 tegen 1')
    expect(text).not.toContain('Eindstand')
    expect(text).not.toContain('Gewonnen')
    expect(text).toContain('We vullen dit verslag nog in')
    // The kick-off is in the facts, with the time.
    expect(text).toContain('Datum vr 30 okt 13:30')
  })

  it('counts the stand of each side from the goals, an own goal for the side that gets it', async () => {
    const reported = liveMatch()

    reported.stored.goals = reported.stored.goals.slice(0, 1)

    const text = plain(await render())

    expect(text).toContain('Tussenstand: 1 tegen 0')
  })

  it('shows the kick-off and the line-up, and no Live, before the kick-off', async () => {
    liveMatch(new Date('2026-10-30T18:30:00Z'))

    const text = plain(await render())

    expect(text).not.toContain('Live')
    expect(text).toContain('Nog niet begonnen')
    expect(text).not.toContain('Tussenstand')
    expect(text).not.toContain('Eindstand')
    expect(text).toContain('Datum vr 30 okt 19:30')
    expect(text).toContain('Opstelling')
  })

  it('says in the description of a match before its kick-off that the match has not begun', async () => {
    liveMatch(new Date('2026-10-30T18:30:00Z'))

    const metadata = await generateMetadata({ params: params() })

    expect(metadata.description).toContain('voor de wedstrijd begint')
    expect(metadata.description).not.toContain('terwijl de wedstrijd wordt gespeeld')
    expect(metadata.robots).toEqual({ index: false })
  })

  it('is live on the day of a match without a known kick-off', async () => {
    liveMatch(null)

    expect(plain(await render())).toContain('Live')
  })

  it('is not live any more when the match has its result, also with a report that is bezig', async () => {
    const reported = liveMatch()

    reported.match.goalsAgainst = 1
    reported.match.goalsFor = 2
    reported.match.status = 'played'

    const text = plain(await render())

    expect(text).not.toContain('Live')
    expect(text).toContain('Eindstand: 2 tegen 1')
    expect(text).toContain('We vullen dit verslag nog in')
  })

  it('names no stand in the title or the description, and keeps the page out of the index', async () => {
    liveMatch()

    const metadata = await generateMetadata({ params: params() })

    expect(metadata.title).toBe('sc Heerenveen – Testdorp FC, 30 oktober 2026')
    expect(metadata.description).toContain('terwijl de wedstrijd wordt gespeeld')
    expect(metadata.description).not.toMatch(/\d–\d/u)
    expect(`${metadata.title}`).not.toMatch(/\d–\d/u)
    expect(metadata.robots).toEqual({ index: false })
  })
})
