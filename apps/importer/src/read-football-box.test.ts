import { describe, expect, it } from 'vitest'

import type { FootballBoxPage } from './read-football-box.ts'
import type { ReadMatch } from './read-wikipedia.ts'

import { checkGoals, checkMatches } from './check-wikipedia.ts'
import { footballBoxPages, readFootballBoxes } from './read-football-box.ts'
import { footballBoxText, footballBoxTitles } from './test-football-box.ts'

const textOf = footballBoxText

function pageOf(title: string): FootballBoxPage {
  const page = ['2007/08', '2008/09', '2009/10'].flatMap(footballBoxPages).find((found) => found.title === title)

  if (page === undefined) {
    throw new Error(`no page ${title}`)
  }

  return page
}

/** The matches of a page, read from its fixture or from a changed copy of it. */
function read(title: string, change: (text: string) => string = (text) => text): ReadMatch[] {
  const result = readFootballBoxes(change(textOf(title)), pageOf(title))

  if (result.kind === 'error') {
    throw new Error(result.message)
  }

  return result.matches
}

const errorOf = (title: string, change: (text: string) => string) => {
  const result = readFootballBoxes(change(textOf(title)), pageOf(title))

  return result.kind === 'error' ? result.message : null
}

const roundOf = (matches: ReadMatch[], round: string) => matches.find((match) => match.round === round)

describe('the pages with football box blocks', () => {
  it('lists the pages of 2007/08, 2008/09 and 2009/10, each with its language', () => {
    expect(
      ['2007/08', '2008/09', '2009/10'].map((season) =>
        footballBoxPages(season).map((page) => [page.language, page.title]),
      ),
    ).toEqual([
      [
        ['nl', 'Play-offs Nederlands voetbal 2008'],
        ['en', '2007–08 UEFA Cup first round'],
      ],
      [
        ['nl', 'KNVB Beker 2008/09 (mannen)'],
        ['en', '2008–09 UEFA Cup first round'],
        ['en', '2008–09 UEFA Cup group stage'],
      ],
      [['en', '2009–10 SC Heerenveen season']],
    ])
  })

  it.each(['2006/07', '2010/11', '2026/27', 'constructor', ''])('has no page for %s', (season) => {
    expect(footballBoxPages(season)).toEqual([])
  })

  it('reads 63 matches from the six pages, each with a result', () => {
    const matches = footballBoxTitles.flatMap((title) => read(title))

    expect(matches).toHaveLength(63)
    expect(matches.every((match) => match.status === 'played' && match.goalsFor !== null)).toBe(true)
  })
})

describe('the English page of the season 2009/10', () => {
  const matches = read('2009–10 SC Heerenveen season')

  it('has the 46 matches of five competitions, and passes the checks of a season', () => {
    const count = (competition: string) => matches.filter((match) => match.competition === competition).length

    expect(matches).toHaveLength(46)
    expect(count('Johan Cruijff Schaal')).toBe(1)
    expect(count('Eredivisie')).toBe(34)
    expect(count('KNVB Beker')).toBe(3)
    expect(count('Europa League')).toBe(8)
    expect(checkMatches(matches)).toEqual([])
  })

  it('reads the match for the Johan Cruijff Schaal, with the Dutch name and article of the opponent', () => {
    expect(matches[0]).toMatchObject({
      attendance: null,
      competition: 'Johan Cruijff Schaal',
      dateText: null,
      extraTime: false,
      goalsAgainst: 5,
      goalsFor: 1,
      home: false,
      kickoffAt: new Date('2009-07-25T18:00:00Z'),
      matchDate: '2009-07-25',
      opponent: 'AZ',
      opponentPage: 'AZ (voetbalclub)',
      referee: 'Björn Kuipers',
      round: 'Finale',
      stadium: 'Amsterdam Arena',
    })
  })

  it('names the rounds in Dutch', () => {
    expect(matches.map((match) => match.round)).toEqual([
      'Finale',
      ...Array.from({ length: 34 }, (_, index) => `Speelronde ${index + 1}`),
      '2e ronde',
      '3e ronde',
      '4e ronde',
      'Play-offronde, wedstrijd 1/2',
      'Play-offronde, wedstrijd 2/2',
      ...Array.from({ length: 6 }, (_, index) => `Groepsfase, wedstrijd ${index + 1}/6`),
    ])
  })

  it('keeps the scorers by name, with the minute, and without the English links, cards and missed penalties', () => {
    // Speelronde 24: `Sibon {{goal|13||84|pen.}}`, between yellow cards of both clubs.
    expect(roundOf(matches, 'Speelronde 24')?.goals).toEqual([
      {
        minute: 13,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: 'Sibon',
        playerPage: null,
        stoppageMinutes: null,
      },
      {
        minute: 68,
        ours: false,
        ownGoal: false,
        penalty: false,
        player: 'De Ceulaer',
        playerPage: null,
        stoppageMinutes: null,
      },
      {
        minute: 84,
        ours: true,
        ownGoal: false,
        penalty: true,
        player: 'Sibon',
        playerPage: null,
        stoppageMinutes: null,
      },
    ])
    // Speelronde 33 has a missed penalty and cards, and no goal.
    expect(roundOf(matches, 'Speelronde 33')?.goals).toEqual([])
    expect(matches.flatMap((match) => match.goals ?? []).every((goal) => goal.playerPage === null)).toBe(true)
  })

  it('reads an own goal and a goal in added time', () => {
    expect(roundOf(matches, 'Speelronde 4')?.goals?.[0]).toMatchObject({
      minute: 30,
      ours: false,
      ownGoal: true,
      player: 'Lejsal',
    })
    expect(roundOf(matches, 'Speelronde 9')?.goals?.at(-1)).toMatchObject({
      minute: 90,
      ours: true,
      player: 'Papadopulos',
      stoppageMinutes: 3,
    })
  })

  it('leaves a field the page leaves open empty: the attendance, and the referee of one cup match', () => {
    expect(matches.filter((match) => match.attendance !== null).map((match) => match.competition)).toEqual(
      Array.from({ length: 8 }, () => 'Europa League'),
    )
    expect(roundOf(matches, '2e ronde')).toMatchObject({ opponent: 'SDC Putten', referee: null })
    expect(matches.filter((match) => match.referee === null)).toHaveLength(1)
    expect(matches.every((match) => match.factsProblem === null)).toBe(true)
  })

  it('reads the attendance with the commas of the thousands, and the referee without his country', () => {
    expect(roundOf(matches, 'Play-offronde, wedstrijd 1/2')).toMatchObject({
      attendance: 22_403,
      opponent: 'PAOK Saloniki',
      referee: 'Willie Collum',
      stadium: 'Toumba Stadium',
    })
  })

  it('turns a kick-off in another time zone into the same moment', () => {
    // 20:00 EEST (UTC+3) in Thessaloniki, 22:05 EEST in Riga and 20:05 WET (UTC) in Lisbon.
    expect(roundOf(matches, 'Play-offronde, wedstrijd 1/2')?.kickoffAt).toEqual(new Date('2009-08-20T17:00:00Z'))
    expect(roundOf(matches, 'Groepsfase, wedstrijd 2/6')?.kickoffAt).toEqual(new Date('2009-10-01T19:05:00Z'))
    expect(roundOf(matches, 'Groepsfase, wedstrijd 5/6')?.kickoffAt).toEqual(new Date('2009-12-03T20:05:00Z'))
    // 14:30 CET (UTC+1) on the day the clock went back.
    expect(roundOf(matches, 'Speelronde 11')?.kickoffAt).toEqual(new Date('2009-10-25T13:30:00Z'))
  })

  it('keeps the day and no time when the block does not say which zone its time is in', () => {
    const [match] = read('2009–10 SC Heerenveen season', (text) =>
      text.replace('20:00 [[Central European Summer Time|CEST]] ([[UTC+02:00|UTC+2]])', '20:00'),
    )

    expect(match).toMatchObject({ dateText: '25 juli 2009', kickoffAt: null, matchDate: '2009-07-25' })
  })

  it('has one match whose scorers do not add up to the result, which the import leaves without scorers', () => {
    expect(matches.filter((match) => checkGoals(match) !== undefined).map((match) => match.round)).toEqual([
      'Speelronde 15',
    ])
  })

  it('is an error when the page has another number of matches, a club or a round we do not know', () => {
    expect(
      errorOf('2009–10 SC Heerenveen season', (text) => text.replace('|team2 = Heerenveen\n', '|team2 = Jong\n')),
    ).toBe("the page '2009–10 SC Heerenveen season' has 45 matches of sc Heerenveen, not 46")
    expect(errorOf('2009–10 SC Heerenveen season', (text) => text.replace('[[Roda JC]]', '[[Roda JC Kerkrade]]'))).toBe(
      "the page '2009–10 SC Heerenveen season': 'Roda JC Kerkrade' has no name on the Dutch Wikipedia in the list of the importer",
    )
    expect(errorOf('2009–10 SC Heerenveen season', (text) => text.replace('|Second round]]', '|Round of 64]]'))).toBe(
      "the page '2009–10 SC Heerenveen season' has a match of ours in a round we do not know, match 36: 'Round of 64'",
    )
    expect(
      errorOf('2009–10 SC Heerenveen season', (text) => text.replace('===Johan Cruyff Shield===', '===Super Cup===')),
    ).toBe("the page '2009–10 SC Heerenveen season' has a match of ours under a heading we do not know: 'Super Cup'")
  })

  it('is an error when a block has no result or a date we do not know', () => {
    expect(errorOf('2009–10 SC Heerenveen season', (text) => text.replace('|score = 5–1', '|score ='))).toBe(
      "the page '2009–10 SC Heerenveen season': Finale (Johan Cruijff Schaal) has no result",
    )
    expect(errorOf('2009–10 SC Heerenveen season', (text) => text.replace('25 July 2009', 'July 2009'))).toBe(
      "the page '2009–10 SC Heerenveen season': Finale (Johan Cruijff Schaal) has a date we do not know: 'July 2009'",
    )
  })
})

describe('the Dutch page of the KNVB Beker 2008/09', () => {
  const matches = read('KNVB Beker 2008/09 (mannen)')

  it('has the five matches of ours, with the round of the heading above each', () => {
    expect(
      matches.map((match) => [match.competition, match.round, match.opponent, match.goalsFor, match.goalsAgainst]),
    ).toEqual([
      ['KNVB Beker', '3e ronde', 'Haaglandia/Sir Winston', 7, 0],
      ['KNVB Beker', '4e ronde', 'Feyenoord', 3, 0],
      ['KNVB Beker', 'Kwartfinales', 'N.E.C.', 3, 1],
      ['KNVB Beker', 'Halve finales', 'FC Volendam', 2, 0],
      ['KNVB Beker', 'Finale', 'FC Twente', 2, 2],
    ])
  })

  it('reads the final: extra time, the score after 90 minutes and the shoot-out', () => {
    expect(matches.at(-1)).toMatchObject({
      afterNinetyAgainst: 1,
      afterNinetyFor: 1,
      attendance: 45_000,
      extraTime: true,
      // The time is in the field of the date, and the town after the stadium.
      kickoffAt: new Date('2009-05-17T16:00:00Z'),
      matchDate: '2009-05-17',
      penaltiesAgainst: 4,
      penaltiesFor: 5,
      referee: 'Jan Wegereef',
      stadium: 'De Kuip',
    })
    expect(matches.at(-1)?.goals?.map((goal) => [goal.minute, goal.player, goal.ours])).toEqual([
      [27, 'Goran Popov', true],
      [54, 'Eljero Elia', false],
      [112, 'Bonaventure Kalou', true],
      [118, 'Youssouf Hersi', false],
    ])
  })

  it('keeps the links of the scorers of a Dutch page, and leaves the cards and substitutions out', () => {
    // The semi-final lists five substitutions and two cards between two goals.
    expect(roundOf(matches, 'Halve finales')?.goals).toEqual([
      {
        minute: 10,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: 'Viktor Elm',
        playerPage: 'Viktor Elm',
        stoppageMinutes: null,
      },
      {
        minute: 84,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: 'Danijel Pranjić',
        playerPage: 'Danijel Pranjić',
        stoppageMinutes: null,
      },
    ])
    expect(matches.every((match) => checkGoals(match) === undefined && match.goalsProblem === null)).toBe(true)
  })
})

describe('the Dutch page of the play-offs of 2008', () => {
  const matches = read('Play-offs Nederlands voetbal 2008')

  it('has the four matches for the Champions League: two against Ajax and two against NAC Breda', () => {
    expect(
      matches.map((match) => [match.competition, match.round, match.opponent, match.home, match.attendance]),
    ).toEqual([
      ['Play-offs Champions League', 'Halve finale, wedstrijd 1/2', 'Ajax', true, 23_000],
      ['Play-offs Champions League', 'Halve finale, wedstrijd 2/2', 'Ajax', false, 49_144],
      ['Play-offs Champions League', 'Ronde 2, wedstrijd 1/2', 'NAC Breda', true, 20_000],
      ['Play-offs Champions League', 'Ronde 2, wedstrijd 2/2', 'NAC Breda', false, 9450],
    ])
    expect(matches[1]).toMatchObject({ kickoffAt: new Date('2008-05-05T18:15:00Z'), referee: 'Dick van Egmond' })
    expect(matches.every((match) => checkGoals(match) === undefined && match.goalsProblem === null)).toBe(true)
  })

  it('does not read a match under the same heading of another play-off', () => {
    // `Wedstrijd A` is also a heading of the play-offs for promotion and relegation.
    expect(
      errorOf('Play-offs Nederlands voetbal 2008', (text) =>
        text.replace('== Play-offs voor de voorronde Champions League ==', '== Iets anders =='),
      ),
    ).toContain(
      "the page 'Play-offs Nederlands voetbal 2008' has a match of ours under a heading we do not know: 'Wedstrijd A'",
    )
  })
})

describe('the English pages of the UEFA Cup', () => {
  it('reads the two matches of the first round of 2007/08, without an attendance', () => {
    expect(
      read('2007–08 UEFA Cup first round').map((match) => ({
        attendance: match.attendance,
        competition: match.competition,
        goals: match.goals?.length,
        home: match.home,
        kickoffAt: match.kickoffAt,
        opponent: match.opponent,
        referee: match.referee,
        result: `${match.goalsFor}-${match.goalsAgainst}`,
        round: match.round,
        stadium: match.stadium,
      })),
    ).toEqual([
      {
        attendance: null,
        competition: 'UEFA Cup',
        goals: 8,
        home: true,
        kickoffAt: new Date('2007-09-20T18:45:00Z'),
        opponent: 'Helsingborgs IF',
        referee: 'Novo Panić',
        result: '5-3',
        round: 'Eerste ronde, wedstrijd 1/2',
        stadium: 'Abe Lenstra Stadion',
      },
      {
        attendance: null,
        competition: 'UEFA Cup',
        goals: 6,
        home: false,
        kickoffAt: new Date('2007-10-04T18:45:00Z'),
        opponent: 'Helsingborgs IF',
        referee: 'Gerald Lehner',
        result: '1-5',
        round: 'Eerste ronde, wedstrijd 2/2',
        stadium: 'Olympia',
      },
    ])
  })

  it('reads the two matches of the first round of 2008/09, in a stadium with a footnote', () => {
    expect(
      read('2008–09 UEFA Cup first round').map((match) => [
        match.round,
        match.opponent,
        match.opponentPage,
        match.stadium,
      ]),
    ).toEqual([
      ['Eerste ronde, wedstrijd 1/2', 'Vitória Setúbal', 'Vitória FC (Setúbal)', 'Estádio José Alvalade'],
      ['Eerste ronde, wedstrijd 2/2', 'Vitória Setúbal', 'Vitória FC (Setúbal)', 'Abe Lenstra Stadion'],
    ])
  })

  it('reads the four matches of the group stage of 2008/09, of group E alone', () => {
    const matches = read('2008–09 UEFA Cup group stage')

    expect(matches.map((match) => [match.round, match.opponent, match.matchDate, match.attendance])).toEqual([
      ['Groepsfase, wedstrijd 1/4', 'AC Milan', '2008-10-23', 25_600],
      ['Groepsfase, wedstrijd 2/4', 'VfL Wolfsburg', '2008-11-06', 15_615],
      ['Groepsfase, wedstrijd 3/4', 'SC Braga', '2008-12-04', 25_500],
      ['Groepsfase, wedstrijd 4/4', 'Portsmouth FC', '2008-12-17', 19_612],
    ])
    // `20:45 (19:45 UTC+0)` in Portsmouth: the page gives its times in ours, and the local
    // one after it.
    expect(matches.at(-1)?.kickoffAt).toEqual(new Date('2008-12-17T19:45:00Z'))
  })

  it('gives the matches a day and no time when the page does not say which zone its times are in', () => {
    const matches = read('2008–09 UEFA Cup first round', (text) => text.replace(/^Times are.*$/mu, ''))

    expect(matches.map((match) => [match.kickoffAt, match.dateText])).toEqual([
      [null, '18 september 2008'],
      [null, '2 oktober 2008'],
    ])
  })
})
