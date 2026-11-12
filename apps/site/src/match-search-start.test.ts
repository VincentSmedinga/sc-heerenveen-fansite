import type { SearchableMatch } from '@fansite/db/match-search'

import { describe, expect, it } from 'vitest'

import { amsterdamToday, onThisDayOf, questionsOf } from './match-search-start'

// Every match and club is made up.
let nextId = 1

function made(values: Partial<SearchableMatch>): SearchableMatch {
  const id = nextId++

  return {
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    clubId: 1,
    clubName: 'Testdorp FC',
    clubSlug: 'testdorp-fc',
    competition: 'Eredivisie',
    dataSource: 'wikipedia',
    dateText: null,
    extraTime: false,
    goalsAgainst: 0,
    goalsFor: 0,
    home: true,
    id,
    kickoffAt: null,
    matchDate: '2001-09-01',
    note: null,
    opponent: 'Testdorp FC',
    penaltiesAgainst: null,
    penaltiesFor: null,
    round: `Speelronde ${id}`,
    season: '2001/02',
    stadium: null,
    status: 'played',
    ...values,
  }
}

const cambuur = { clubName: 'SC Cambuur', clubSlug: 'sc-cambuur', opponent: 'SC Cambuur' }

describe('amsterdamToday', () => {
  it('follows the date in the Netherlands, not the server', () => {
    // 23:30 UTC on 10 November is half past midnight on 11 November in Amsterdam (UTC+1).
    expect(amsterdamToday(new Date('2026-11-10T23:30:00Z'))).toEqual({ day: 11, month: 11, year: 2026 })
    expect(amsterdamToday(new Date('2026-11-10T12:00:00Z'))).toEqual({ day: 10, month: 11, year: 2026 })
    // In summer the offset is two hours.
    expect(amsterdamToday(new Date('2026-06-30T22:30:00Z'))).toEqual({ day: 1, month: 7, year: 2026 })
  })
})

describe('questionsOf', () => {
  const all = [
    // Friday 7 September 2001, at home against Cambuur: a win with seven goals.
    made({ ...cambuur, goalsAgainst: 1, goalsFor: 6, matchDate: '2001-09-07' }),
    // Friday 14 September 2001, at home against Cambuur: a loss.
    made({ ...cambuur, goalsAgainst: 2, goalsFor: 0, matchDate: '2001-09-14' }),
    // Monday 17 September 2001, away against Ajax: a draw.
    made({ clubName: 'Ajax', clubSlug: 'ajax', goalsAgainst: 0, goalsFor: 0, home: false, matchDate: '2001-09-17' }),
    // Thursday 4 October 2001, away in the UEFA Cup: a win to nil.
    made({ competition: 'UEFA Cup', goalsAgainst: 0, goalsFor: 2, home: false, matchDate: '2001-10-04' }),
    // Sunday 5 May 2002, a cup tie decided by penalties.
    made({
      competition: 'KNVB Beker',
      extraTime: true,
      goalsAgainst: 1,
      goalsFor: 1,
      matchDate: '2002-05-05',
      penaltiesAgainst: 2,
      penaltiesFor: 4,
      season: '2001/02',
    }),
  ]
  const questions = questionsOf(all, '2001/02')
  const by = (question: string) => questions.find((item) => item.question === question)

  it('counts each number from the matches, with the filters in the address', () => {
    expect(by('Elke uitzege in Europa')).toEqual({
      figure: '1',
      href: '/wedstrijden/zoeken?waar=uit&competitie=europa&uitslag=gewonnen&zij=0',
      note: 'en geen tegendoelpunt',
      question: 'Elke uitzege in Europa',
    })
    expect(by('De derby tegen sc Cambuur')).toMatchObject({
      figure: '2',
      href: '/wedstrijden/zoeken?tegen=sc-cambuur',
      note: '1 keer gewonnen',
    })
    expect(by('Vrijdagavond thuis')).toMatchObject({
      figure: '2',
      href: '/wedstrijden/zoeken?waar=thuis&dag=vrijdag',
      note: '1 keer gewonnen',
    })
    expect(by('Alle 0–0’s')).toEqual({
      figure: '1',
      href: '/wedstrijden/zoeken?wij=0&zij=0',
      question: 'Alle 0–0’s',
    })
    expect(by('Beslist met strafschoppen')).toMatchObject({
      figure: '1',
      href: '/wedstrijden/zoeken?strafschoppen=ja',
      note: 'na verlenging',
    })
  })

  it('names the biggest result at the top of seven goals or more, and the list of the biggest wins', () => {
    expect(by('Zeven doelpunten of meer')).toMatchObject({
      figure: '1',
      href: '/wedstrijden/zoeken?doelpunten=7&volgorde=doelsaldo',
      note: 'met 6–1 tegen SC Cambuur bovenaan',
    })
    expect(by('Onze grootste zeges')).toEqual({
      figure: '6–1',
      href: '/wedstrijden/zoeken?uitslag=gewonnen&volgorde=doelsaldo',
      note: 'de lijst, op doelsaldo',
      question: 'Onze grootste zeges',
    })
  })

  it('leaves out a question without a match, and says "the rarest day" only when it is', () => {
    // No match with Ajax, PSV or Feyenoord at once... Ajax has one, so the question stays.
    expect(by('Tegen Ajax, PSV en Feyenoord')).toMatchObject({ figure: '1', note: 'sinds 2001/02' })
    expect(questionsOf([made({ goalsFor: 1 })], '2001/02').map((item) => item.question)).toEqual([
      'Onze grootste zeges',
    ])
    // No other day of the week has fewer matches than Monday here.
    expect(by('Op een maandag')?.note).toBe('de zeldzaamste dag')
    // Two matches on a Monday against one on a Tuesday: Monday is not the rarest day.
    expect(
      questionsOf(
        [made({ matchDate: '2001-09-03' }), made({ matchDate: '2001-09-03' }), made({ matchDate: '2001-09-04' })],
        '2001/02',
      ).find((item) => item.question === 'Op een maandag')?.note,
    ).toBeUndefined()
  })
})

describe('onThisDayOf', () => {
  const all = [
    made({ goalsAgainst: 1, goalsFor: 3, home: false, matchDate: '2023-11-11', opponent: 'Testdorp FC' }),
    made({ goalsAgainst: 0, goalsFor: 2, home: false, matchDate: '2018-11-11', opponent: 'Voorbeeld United' }),
    made({ goalsAgainst: 1, goalsFor: 2, matchDate: '1990-11-11', opponent: 'Proef Boys' }),
    // The same date this year doesn't count: it is not an earlier year.
    made({ matchDate: '2026-11-11' }),
    // Another day of November is only in the month.
    made({ matchDate: '2019-11-12' }),
  ]
  const now = new Date('2026-11-11T10:00:00Z')

  it('lists the matches of the date in earlier years, the newest first, the home club first', () => {
    const card = onThisDayOf(all, now)

    expect(card?.title).toBe('Op deze dag: 11 november')
    expect(card?.matches).toEqual([
      { clubs: 'Testdorp FC – sc Heerenveen', score: '1–3', year: '2023' },
      { clubs: 'Voorbeeld United – sc Heerenveen', score: '0–2', year: '2018' },
      { clubs: 'sc Heerenveen – Proef Boys', score: '2–1', year: '1990' },
    ])
    expect(card?.intro).toBe('Drie keer speelden we op 11 november, 1 thuis en 2 uit.')
    expect(card?.monthLabel).toBe('Alle wedstrijden in november')
    expect(card?.monthHref).toBe('/wedstrijden/zoeken?maand=11')
  })

  it('says "all five away" when they were', () => {
    const away = Array.from({ length: 5 }, (_, index) =>
      made({ home: false, matchDate: `${2000 + index}-11-11`, opponent: `Club ${index}` }),
    )

    expect(onThisDayOf(away, now)?.intro).toBe('Vijf keer speelden we op 11 november, alle vijf uit.')
  })

  it('is left out on a date without matches', () => {
    expect(onThisDayOf(all, new Date('2026-12-25T10:00:00Z'))).toBeUndefined()
    expect(onThisDayOf([made({ matchDate: '2026-11-11' })], now)).toBeUndefined()
  })

  it('has no 29 February match on 28 February, and has it on 29 February', () => {
    const leap = [made({ matchDate: '2008-02-29' })]

    expect(onThisDayOf(leap, new Date('2027-02-28T10:00:00Z'))).toBeUndefined()
    expect(onThisDayOf(leap, new Date('2028-02-29T10:00:00Z'))?.matches).toHaveLength(1)
  })

  it('follows the date in the Netherlands at night', () => {
    // 23:30 UTC on 10 November is already 11 November in Amsterdam.
    expect(onThisDayOf(all, new Date('2026-11-10T23:30:00Z'))?.title).toBe('Op deze dag: 11 november')
  })
})
