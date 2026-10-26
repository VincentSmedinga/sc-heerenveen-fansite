import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { checkGoals } from './check-wikipedia.ts'
import { pageTitles, pageUrl, readCup, readLeague, readStandings } from './read-wikipedia.ts'

const programme = readFileSync(new URL('./fixtures/wikipedia-programme.wiki', import.meta.url), 'utf8')
const standingsPage = readFileSync(new URL('./fixtures/wikipedia-standings.wiki', import.meta.url), 'utf8')
const cupPage = readFileSync(new URL('./fixtures/wikipedia-cup.wiki', import.meta.url), 'utf8')
const goalsCupPage = readFileSync(new URL('./fixtures/wikipedia-cup-goals.wiki', import.meta.url), 'utf8')
const extraTimePage = readFileSync(new URL('./fixtures/wikipedia-cup-extra-time.wiki', import.meta.url), 'utf8')

/** A match of ours in the shape of the programme, with these fields. */
function box(fields: Record<string, string>) {
  const all = {
    date: '14 november 2026',
    score: '',
    stadium: '[[Abe Lenstra Stadion]]',
    team1: '[[sc Heerenveen]]',
    team2: '[[FC Twente]]',
    time: '18:45 uur',
    ...fields,
  }

  return `{{Footballbox2\n${Object.entries(all)
    .map(([key, value]) => `|${key} = ${value}`)
    .join('\n')}\n}}`
}

function leagueWith(...boxes: string[]) {
  return `== Speelronde 12 ==\n${boxes.join('\n')}\n`
}

function matchOf(text: string, round: string) {
  const read = readLeague(text)

  if (read.kind === 'error') {
    throw new Error(read.message)
  }

  return read.matches.find((match) => match.round === round)
}

describe('the pages of a season', () => {
  it('finds the titles of a season and the address of the raw text, which is under /wiki/', () => {
    expect(pageTitles('2027/28')).toEqual({
      cup: 'KNVB Beker 2027/28 (mannen)',
      programme: 'Eredivisie 2027/28 (mannenvoetbal)/Wedstrijden',
      standings: 'Eredivisie 2027/28 (mannenvoetbal)',
    })
    expect(pageUrl('https://nl.wikipedia.org', pageTitles('2026/27').programme)).toBe(
      'https://nl.wikipedia.org/wiki/Eredivisie_2026/27_(mannenvoetbal)/Wedstrijden?action=raw',
    )
  })
})

describe('the programme and the results', () => {
  it('reads the 34 league matches of sc Heerenveen, 17 at home and 17 away', () => {
    const read = readLeague(programme)

    expect(read.kind).toBe('read')
    if (read.kind === 'read') {
      expect(read.matches).toHaveLength(34)
      expect(read.matches.filter((match) => match.home)).toHaveLength(17)
      expect(read.matches.every((match) => match.competition === 'Eredivisie')).toBe(true)
    }
  })

  it('reads a match that was played: the score from our side, the stadium and the time in UTC', () => {
    expect(matchOf(programme, 'Speelronde 1')).toEqual({
      competition: 'Eredivisie',
      dateText: null,
      extraTime: false,
      goals: [{ minute: 52, ours: true, ownGoal: false, penalty: false, player: 'Oyen', stoppageMinutes: null }],
      goalsAgainst: 0,
      goalsFor: 1,
      goalsProblem: null,
      home: true,
      kickoffAt: new Date('2026-08-09T14:45:00Z'),
      matchDate: '2026-08-09',
      opponent: 'FC Twente',
      penaltiesAgainst: null,
      penaltiesFor: null,
      round: 'Speelronde 1',
      stadium: 'Abe Lenstra Stadion',
      status: 'played',
    })
  })

  it('reads a score from the side of the away team', () => {
    const away = matchOf(programme, 'Speelronde 2')

    expect(away).toMatchObject({ goalsAgainst: 2, goalsFor: 2, home: false, opponent: 'Ajax', status: 'played' })
    expect(
      readLeague(leagueWith(box({ score: '3 – 1', team1: '[[FC Utrecht]]', team2: '[[sc Heerenveen]]' }))),
    ).toMatchObject({
      matches: [{ goalsAgainst: 3, goalsFor: 1, home: false, opponent: 'FC Utrecht' }],
    })
  })

  it('reads a match that is still to be played, with its time in UTC on both sides of the change of the clock', () => {
    // Summer time ends on 25 October 2026: 18:45 is 16:45 UTC on 9 August and 17:45 UTC
    // on 31 October.
    expect(matchOf(programme, 'Speelronde 11')).toMatchObject({
      dateText: null,
      goalsAgainst: null,
      goalsFor: null,
      kickoffAt: new Date('2026-10-31T17:45:00Z'),
      matchDate: '2026-10-31',
      opponent: 'N.E.C.',
      status: 'scheduled',
    })
    expect(readLeague(leagueWith(box({ date: '9 augustus 2026', time: '16:45 uur' })))).toMatchObject({
      matches: [{ kickoffAt: new Date('2026-08-09T14:45:00Z') }],
    })
  })

  it('keeps the weekend as text when there is no time, and the first day to put it in order', () => {
    expect(matchOf(programme, 'Speelronde 22')).toMatchObject({
      dateText: '12-14 februari 2027',
      kickoffAt: null,
      matchDate: '2027-02-12',
      status: 'scheduled',
    })
  })

  it('reads a weekend over two months, a date with a note and a time with a note', () => {
    expect(readLeague(leagueWith(box({ date: '29 april-3 mei 2027', time: '' })))).toMatchObject({
      matches: [{ dateText: '29 april-3 mei 2027', kickoffAt: null, matchDate: '2027-04-29' }],
    })
    expect(readLeague(leagueWith(box({ date: '13 december 2026*', time: '20:00 uur**' })))).toMatchObject({
      matches: [{ dateText: null, kickoffAt: new Date('2026-12-13T19:00:00Z') }],
    })
    // A date with a day but no time is kept as it is written.
    expect(readLeague(leagueWith(box({ date: '14 februari 2027', time: '' })))).toMatchObject({
      matches: [{ dateText: '14 februari 2027', kickoffAt: null, matchDate: '2027-02-14' }],
    })
  })

  it('reads a derby, where the score or the dash is a link', () => {
    expect(readLeague(leagueWith(box({ score: '[[Friese derby|2 – 2]]', team2: '[[SC Cambuur]]' })))).toMatchObject({
      matches: [{ goalsFor: 2, status: 'played' }],
    })
    expect(readLeague(leagueWith(box({ score: '[[Friese derby| – ]]', team2: '[[SC Cambuur]]' })))).toMatchObject({
      matches: [{ goalsFor: null, status: 'scheduled' }],
    })
  })

  it('reads a postponed match as postponed, without a result', () => {
    expect(readLeague(leagueWith(box({ score: 'Uitgesteld' })))).toMatchObject({
      matches: [{ goalsAgainst: null, goalsFor: null, status: 'postponed' }],
    })
    expect(readLeague(leagueWith(box({ score: 'afgelast', time: '' })))).toMatchObject({
      matches: [{ status: 'postponed' }],
    })
  })

  it('takes the day of the last match anyone played, ours or not, as the day the table holds for', () => {
    expect(readLeague(programme)).toMatchObject({ lastPlayedOn: '2026-10-24' })
    expect(
      readLeague(
        leagueWith(
          box({ date: '1 oktober 2026', score: '1 – 0' }),
          box({ date: '25 oktober 2026', score: '2 – 1', team1: '[[FC Utrecht]]', team2: '[[PSV (voetbalclub)|PSV]]' }),
        ),
      ),
    ).toMatchObject({ lastPlayedOn: '2026-10-25' })
    expect(readLeague(leagueWith(box({})))).toMatchObject({ lastPlayedOn: null })
  })

  it('leaves out a match under a heading that is not a round of the league', () => {
    const read = readLeague(`== Play-offs ==\n${box({ score: '1 – 0' })}\n== Speelronde 3 ==\n${box({})}`)

    expect(read).toMatchObject({ matches: [{ round: 'Speelronde 3' }] })
  })

  it('does not trip on a match of others that was stopped halfway', () => {
    expect(programme).toContain("Gestaakt 64' (1 – 3)")
    expect(readLeague(programme).kind).toBe('read')
  })

  it.each([
    ['a date we do not know', box({ date: 'ergens in november' })],
    ['a time we do not know', box({ time: 'in de avond' })],
    ['a score we do not know', box({ score: "Gestaakt 64' (1 – 3)" })],
    ['a date that does not exist', box({ date: '31 november 2026' })],
    ['a time that does not exist', box({ time: '25:00 uur' })],
  ])('gives an error for a match of ours with %s', (_name, text) => {
    expect(readLeague(leagueWith(text)).kind).toBe('error')
  })

  it('gives an error when the page has no Footballbox2 template, because the page has changed', () => {
    expect(readLeague('== Speelronde 1 ==\nGeen wedstrijden meer.')).toEqual({
      kind: 'error',
      message: 'the programme has no Footballbox2 templates',
    })
    expect(readLeague(programme.replaceAll('Footballbox2', 'Voetbalwedstrijd')).kind).toBe('error')
  })

  it('ignores a comment, which can hold a bar or braces', () => {
    expect(readLeague(leagueWith('<!-- {{Footballbox2 | team1 = [[sc Heerenveen]] }} -->', box({})))).toMatchObject({
      matches: [{ opponent: 'FC Twente' }],
    })
  })
})

describe('the cup', () => {
  it('reads our tie, with the round from the heading, in the layout of the cup page', () => {
    expect(readCup(cupPage)).toEqual({
      hasTemplates: true,
      kind: 'read',
      lastPlayedOn: null,
      matches: [
        {
          competition: 'KNVB Beker',
          dateText: null,
          extraTime: false,
          goals: null,
          goalsAgainst: null,
          goalsFor: null,
          goalsProblem: null,
          home: false,
          kickoffAt: new Date('2026-10-28T20:00:00Z'),
          matchDate: '2026-10-28',
          opponent: 'Excelsior Maassluis',
          penaltiesAgainst: null,
          penaltiesFor: null,
          round: 'Eerste ronde',
          stadium: 'Sportpark Dijkpolder',
          status: 'scheduled',
        },
      ],
    })
  })

  it('reads a score in the cup layout, with spaces that do not break, and a bold winner', () => {
    const played = cupPage.replace(
      '|score = \n|half time score = \n|aet = \n|team2 = [[sc Heerenveen]]',
      "|score = 1&nbsp;–&nbsp;3\n|half time score = 0&nbsp;–&nbsp;1\n|aet = \n|team2 = '''[[sc Heerenveen]]'''",
    )

    expect(readCup(played)).toMatchObject({ matches: [{ goalsAgainst: 1, goalsFor: 3, status: 'played' }] })
  })

  it('has no match of ours before the draw or after we are out, and that is fine', () => {
    expect(readCup(cupPage.replace('[[sc Heerenveen]]', '[[FC Volendam]]'))).toMatchObject({
      hasTemplates: true,
      matches: [],
    })
  })

  it('reads a page without any Footballbox2 template as no matches, and says so', () => {
    expect(readCup('Een kale pagina')).toEqual({ hasTemplates: false, kind: 'read', lastPlayedOn: null, matches: [] })
    expect(readCup(cupPage)).toMatchObject({ hasTemplates: true })
  })
})

describe('extra time and a shoot-out in the cup', () => {
  const tie = (fields: Record<string, string>, score = '1&nbsp;–&nbsp;1') =>
    `==== Eerste ronde ====\n{{Footballbox2\n${Object.entries({
      date: '28 oktober 2026',
      score,
      team1: '[[sc Heerenveen]]',
      team2: '[[Testdorp FC]]',
      time: '20:00 uur',
      ...fields,
    })
      .map(([key, value]) => `|${key} = ${value}`)
      .join('\n')}\n}}`

  it('reads a win after extra time, a win on penalties and a loss on penalties, from our side', () => {
    expect(readCup(extraTimePage)).toMatchObject({
      matches: [
        { extraTime: true, goalsAgainst: 1, goalsFor: 2, home: false, penaltiesAgainst: null, penaltiesFor: null },
        { extraTime: true, goalsAgainst: 1, goalsFor: 1, home: true, penaltiesAgainst: 3, penaltiesFor: 4 },
        { extraTime: true, goalsAgainst: 2, goalsFor: 2, home: false, penaltiesAgainst: 5, penaltiesFor: 4 },
      ],
    })
  })

  it('has no extra time and no shoot-out for a match that does not say so', () => {
    expect(readCup(tie({ aet: '', penaltyscore: '' }))).toMatchObject({
      matches: [{ extraTime: false, penaltiesAgainst: null, penaltiesFor: null }],
    })
    expect(readCup(tie({ score: '2&nbsp;–&nbsp;1' }))).toMatchObject({
      matches: [{ extraTime: false, penaltiesAgainst: null, penaltiesFor: null }],
    })
  })

  it('takes any text in the field for extra time as extra time', () => {
    expect(readCup(tie({ aet: 'ja' }))).toMatchObject({ matches: [{ extraTime: true, penaltiesFor: null }] })
  })

  it('keeps a level score after extra time without a shoot-out as it is, until the shoot-out is on the page', () => {
    expect(readCup(tie({ aet: 'J' }))).toMatchObject({
      matches: [{ extraTime: true, goalsAgainst: 1, goalsFor: 1, penaltiesAgainst: null, penaltiesFor: null }],
    })
  })

  it('does not call a match extra time before it has a score', () => {
    expect(readCup(tie({ aet: 'J' }, ''))).toMatchObject({ matches: [{ extraTime: false, status: 'scheduled' }] })
  })

  it('turns the score of the shoot-out round when we play away', () => {
    expect(
      readCup(tie({ aet: 'J', penaltyscore: '2&nbsp;–&nbsp;4', team1: '[[Testdorp FC]]', team2: '[[sc Heerenveen]]' })),
    ).toMatchObject({
      matches: [{ penaltiesAgainst: 2, penaltiesFor: 4 }],
    })
  })

  it.each([
    [
      'a score of the shoot-out we do not know',
      { aet: 'J', penaltyscore: 'vier – drie' },
      'a shoot-out score we do not know',
    ],
    ['a shoot-out with a note', { aet: 'J', penaltyscore: '4 – 3 (n.s.)' }, 'a shoot-out score we do not know'],
    ['a shoot-out without extra time', { penaltyscore: '4 – 3' }, 'a shoot-out without extra time'],
    [
      'a shoot-out after a score that is not level',
      { aet: 'J', penaltyscore: '4 – 3', score: '2 – 1' },
      'no level score',
    ],
    ['a shoot-out before the match has a score', { aet: 'J', penaltyscore: '4 – 3', score: '' }, 'no level score'],
  ])('fails on %s, so the import keeps what it has', (_name, fields, reason) => {
    const read = readCup(tie(fields))

    expect(read).toMatchObject({ kind: 'error' })
    expect(JSON.stringify(read)).toContain(reason)
  })

  it('fails on a league match with extra time or a shoot-out, which only the cup has', () => {
    for (const fields of [{ aet: 'J' }, { penaltyscore: '4 – 3' }, { aet: 'J', penaltyscore: '4 – 3' }]) {
      const read = readLeague(leagueWith(box({ score: '1 – 1', ...fields })))

      expect(read).toMatchObject({ kind: 'error' })
      expect(JSON.stringify(read)).toContain('which only the cup has')
    }
  })

  it('reads a league match with empty fields for them, as Wikipedia has it', () => {
    expect(readLeague(leagueWith(box({ aet: '', penaltyscore: '', score: '1 – 1' })))).toMatchObject({
      matches: [{ extraTime: false, penaltiesFor: null }],
    })
  })
})

describe('the league table', () => {
  it('reads the 18 clubs in the order of the page, with the numbers worked out', () => {
    const read = readStandings(standingsPage)

    expect(read.kind).toBe('read')
    if (read.kind === 'read') {
      expect(read.rows).toHaveLength(18)
      expect(read.rows.slice(0, 2).map((row) => row.club)).toEqual(['Feyenoord', 'Ajax'])
      expect(read.rows[6]).toEqual({
        club: 'sc Heerenveen',
        drawn: 3,
        goalDifference: 5,
        goalsAgainst: 13,
        goalsFor: 18,
        lost: 3,
        played: 10,
        points: 15,
        position: 7,
        won: 4,
      })
    }
  })

  it.each([
    ['the template is gone', standingsPage.replace('Sports table', 'Stand')],
    ['the order is gone', standingsPage.replace(/\|team_order=.*/u, '')],
    ['a number is gone', standingsPage.replace('|win_HEE=4 ', '')],
    ['a number is no number', standingsPage.replace('win_HEE=4', 'win_HEE=vier')],
    ['a name is gone', standingsPage.replace('|name_HEE=[[sc Heerenveen]]', '')],
  ])('gives an error when %s', (_name, text) => {
    expect(readStandings(text).kind).toBe('error')
  })
})

describe('the goal scorers', () => {
  /** A played match of ours at home with these scorers for the home and the away club. */
  function goalsOf(goals1: string, goals2 = '', score = '2 – 1') {
    const match = matchOf(leagueWith(box({ goals1, goals2, score })), 'Speelronde 12')

    if (match === undefined) {
      throw new Error('no match')
    }

    return match
  }

  it('reads the minute and the name from the link of the home club, and the minute before the name for the away club', () => {
    const match = goalsOf('[[Luca Oyen|Oyen]] {{goal|52}}', '{{goal|45}} [[Jacob Trenskow|Trenskow]]', '1 – 1')

    expect(match.goals).toEqual([
      { minute: 45, ours: false, ownGoal: false, penalty: false, player: 'Trenskow', stoppageMinutes: null },
      { minute: 52, ours: true, ownGoal: false, penalty: false, player: 'Oyen', stoppageMinutes: null },
    ])
    expect(match.goalsProblem).toBeNull()
  })

  it('turns the club into ours or the opponent from the side we play on', () => {
    const away = matchOf(
      `== Speelronde 12 ==\n${box({ goals1: '[[Ajax]] {{goal|7}}', goals2: '{{goal|9}} [[Trenskow]]', score: '1 – 1', team1: '[[AFC Ajax|Ajax]]', team2: '[[sc Heerenveen]]' })}\n`,
      'Speelronde 12',
    )

    expect(away?.goals?.map((goal) => [goal.minute, goal.ours])).toEqual([
      [7, false],
      [9, true],
    ])
  })

  it('reads the added time as its own number: 90+5 is minute 90 with 5 added', () => {
    const match = goalsOf('[[A]] {{goal|90+5}}<br />[[B]] {{goal|45+1}}', '', '2 – 0')

    expect(match.goals).toMatchObject([
      { minute: 45, player: 'B', stoppageMinutes: 1 },
      { minute: 90, player: 'A', stoppageMinutes: 5 },
    ])
  })

  it('puts the goals of both clubs in the order of the clock, and added time before the next minute', () => {
    const match = goalsOf(
      '[[A]] {{goal|46}}<br />[[B]] {{goal|90+2}}',
      '{{goal|45+3}} [[C]]<br />{{goal|91}} [[D]]<br />{{goal|46}} [[E]]',
      '2 – 3',
    )

    expect(match.goals?.map((goal) => goal.player)).toEqual(['C', 'A', 'E', 'B', 'D'])
  })

  it('makes a goal for each minute of a template, in the template order', () => {
    expect(goalsOf('[[Perišić]] {{goal|35||53}}', '', '2 – 0').goals).toMatchObject([
      { minute: 35, player: 'Perišić' },
      { minute: 53, player: 'Perišić' },
    ])
    expect(goalsOf('[[Krikke]] {{goal|1||33||38||49}}', '', '4 – 0').goals).toHaveLength(4)
    expect(goalsOf('[[Chery]] {{goal|5|pen.|23|pen.}}', '', '2 – 0').goals).toMatchObject([
      { minute: 5, penalty: true },
      { minute: 23, penalty: true },
    ])
  })

  it('marks an own goal and a penalty on the goal they follow, and no other', () => {
    expect(
      goalsOf(
        '[[A]] {{goal|63|pen.|90+11|pen.}}<br />[[B]] {{goal|7||90+5|pen.}}<br />[[C]] {{goal|11|e.d.}}',
        '',
        '5 – 0',
      ).goals,
    ).toMatchObject([
      { minute: 7, ownGoal: false, penalty: false },
      { minute: 11, ownGoal: true, penalty: false, player: 'C' },
      { minute: 63, ownGoal: false, penalty: true },
      { minute: 90, ownGoal: false, penalty: true, player: 'B', stoppageMinutes: 5 },
      { minute: 90, ownGoal: false, penalty: true, player: 'A', stoppageMinutes: 11 },
    ])
  })

  it('leaves a red card and a missed penalty out: they are no goals', () => {
    const match = goalsOf(
      '[[Floranus]] {{rode kaart|0|57}}<br />[[Bajraktarević]] {{goal|23||32}}, {{penmis||68}}',
      '{{rode kaart|0|13}} [[Hokke]]<br />{{goal|16}} [[Eduardo]]',
      '2 – 1',
    )

    expect(match.goalsProblem).toBeNull()
    expect(match.goals?.map((goal) => [goal.minute, goal.player])).toEqual([
      [16, 'Eduardo'],
      [23, 'Bajraktarević'],
      [32, 'Bajraktarević'],
    ])
  })

  it('has no scorers while both fields are empty, also for a match with goals', () => {
    expect(goalsOf('', '', '2 – 1')).toMatchObject({ goals: null, goalsProblem: null })
  })

  it('reads a name without a link, and a name with an apostrophe or a dash', () => {
    expect(
      goalsOf(
        "Gewone naam {{goal|3}}<br />[['t Zand]] {{goal|4}}<br />[[Eggens|Van den Berg-Eggens]] {{goal|5}}",
        '',
        '3 – 0',
      ).goals?.map((goal) => goal.player),
    ).toEqual(['Gewone naam', "'t Zand", 'Van den Berg-Eggens'])
  })

  it('ignores a goal field of a match that is not played', () => {
    const planned = matchOf(leagueWith(box({ goals1: '[[A]] {{goal|1}}', score: '' })), 'Speelronde 12')

    expect(planned).toMatchObject({ goals: null, goalsProblem: null, status: 'scheduled' })
  })

  it.each([
    ['a goal without a name', '{{goal|52}}', 'a goal has no usable name'],
    ['a template we do not know', '[[A]] {{goal|52}}<br />[[B]] {{geel-rood|0|60}}', 'a template we do not know'],
    ['a part we do not know', '[[A]] {{goal|52|vermoedelijk}}', 'a part we do not know'],
    ['a minute of 0', '[[A]] {{goal|0}}', 'a minute we do not know'],
    ['an own goal without a minute', '[[A]] {{goal|e.d.|5}}', 'a part we do not know'],
    ['a goal that is both an own goal and a penalty', '[[A]] {{goal|5|e.d.|pen.}}', 'both an own goal and a penalty'],
    ['a name that is a link left open', '[[A {{goal|5}}', 'a goal has no usable name'],
  ])('reads %s as no scorers, with the reason', (_name, goals1, reason) => {
    const match = goalsOf(goals1, '', '1 – 0')

    expect(match.goals).toBeNull()
    expect(match.goalsProblem).toContain(reason)
    expect(match.goalsProblem).toContain('Speelronde 12 (Eredivisie)')
    expect(match.goalsFor).toBe(1)
    expect(checkGoals(match)).toBe(match.goalsProblem)
  })

  it('reads the real scorers of the programme and the cup', () => {
    const league = readLeague(programme)
    const cup = readCup(goalsCupPage)

    if (league.kind === 'error' || cup.kind === 'error') {
      throw new Error('not read')
    }

    const round = (name: string) => [...league.matches, ...cup.matches].find((match) => match.round === name)

    expect(round('Speelronde 2')?.goals).toEqual([
      { minute: 7, ours: false, ownGoal: true, penalty: false, player: 'Klaverboer', stoppageMinutes: null },
      { minute: 33, ours: false, ownGoal: false, penalty: false, player: 'Ouazane', stoppageMinutes: null },
      { minute: 45, ours: true, ownGoal: false, penalty: false, player: 'Trenskow', stoppageMinutes: null },
      { minute: 82, ours: true, ownGoal: false, penalty: false, player: 'Rivera', stoppageMinutes: null },
    ])
    expect(round('Speelronde 9')?.goals?.[0]).toMatchObject({ minute: 11, penalty: true, player: 'Vente' })
    expect(round('Speelronde 10')?.goals).toHaveLength(5)
    expect(round('Speelronde 6')?.goals).toBeNull()
    expect(round('Achtste finales')?.goals).toMatchObject([
      { minute: 20, ours: true, player: 'Trenskow' },
      { minute: 65, ours: false, player: 'Uneken' },
      { minute: 75, ours: true, player: 'Braude' },
      { minute: 90, ours: true, player: 'Trenskow', stoppageMinutes: 1 },
    ])
    expect(round('Kwartfinales')?.goals?.map((goal) => goal.player)).toEqual([
      'Bajraktarević',
      'Bajraktarević',
      'Perišić',
      'Wanner',
      'Oyen',
    ])
    expect(round('Kwartfinales')?.goals?.[0]?.minute).toBe(23)
  })

  it('has scorers that agree with the result for every played match of the real fixtures', () => {
    const league = readLeague(programme)
    const cup = readCup(goalsCupPage)

    if (league.kind === 'error' || cup.kind === 'error') {
      throw new Error('not read')
    }
    for (const match of [...league.matches, ...cup.matches].filter((match) => match.status === 'played')) {
      expect(checkGoals(match)).toBeUndefined()
    }
  })
})
