import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { checkGoals } from './check-wikipedia.ts'
import { linkedPage, pageTitles, pageUrl, readCup, readLeague, readPlayoffs, readStandings } from './read-wikipedia.ts'

const programme = readFileSync(new URL('./fixtures/wikipedia-programme.wiki', import.meta.url), 'utf8')
const standingsPage = readFileSync(new URL('./fixtures/wikipedia-standings.wiki', import.meta.url), 'utf8')
const cupPage = readFileSync(new URL('./fixtures/wikipedia-cup.wiki', import.meta.url), 'utf8')
const secondRoundPage = readFileSync(new URL('./fixtures/wikipedia-cup-second-round.wiki', import.meta.url), 'utf8')
const goalsCupPage = readFileSync(new URL('./fixtures/wikipedia-cup-goals.wiki', import.meta.url), 'utf8')
const extraTimePage = readFileSync(new URL('./fixtures/wikipedia-cup-extra-time.wiki', import.meta.url), 'utf8')
const afterNinetyPage = readFileSync(new URL('./fixtures/wikipedia-cup-after-ninety.wiki', import.meta.url), 'utf8')
const playoffAfterNinetyPage = readFileSync(
  new URL('./fixtures/wikipedia-playoffs-after-ninety.wiki', import.meta.url),
  'utf8',
)
const seasonProgramme = readFileSync(new URL('./fixtures/wikipedia-season-programme.wiki', import.meta.url), 'utf8')
const seasonStandings = readFileSync(new URL('./fixtures/wikipedia-season-standings.wiki', import.meta.url), 'utf8')
const seasonCup = readFileSync(new URL('./fixtures/wikipedia-season-cup.wiki', import.meta.url), 'utf8')
const playoffPages = Object.fromEntries(
  [2022, 2024, 2025, 2026].map((year) => [
    year,
    readFileSync(new URL(`./fixtures/wikipedia-playoffs-${year}.wiki`, import.meta.url), 'utf8'),
  ]),
) as Record<number, string>
const cupPages = Object.fromEntries(
  ['2021-22', '2022-23', '2023-24', '2024-25'].map((season) => [
    season,
    readFileSync(new URL(`./fixtures/wikipedia-cup-${season}.wiki`, import.meta.url), 'utf8'),
  ]),
)

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
      playoffs: 'Play-offs Nederlands voetbal 2028',
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
      afterNinetyAgainst: null,
      afterNinetyFor: null,
      attendance: 21022,
      competition: 'Eredivisie',
      dateText: null,
      extraTime: false,
      factsProblem: null,
      goals: [
        {
          minute: 52,
          ours: true,
          ownGoal: false,
          penalty: false,
          player: 'Oyen',
          playerPage: 'Luca Oyen',
          stoppageMinutes: null,
        },
      ],
      goalsAgainst: 0,
      goalsFor: 1,
      goalsProblem: null,
      home: true,
      kickoffAt: new Date('2026-08-09T14:45:00Z'),
      matchDate: '2026-08-09',
      note: null,
      opponent: 'FC Twente',
      opponentPage: 'FC Twente',
      penaltiesAgainst: null,
      penaltiesFor: null,
      referee: null,
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
      note: null,
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

  it.each([
    ['1–3 december 2026', '2026-12-01'],
    ['1-3 december 2026', '2026-12-01'],
    ['1 – 3 december 2026', '2026-12-01'],
    ['1&ndash;3 december 2026', '2026-12-01'],
    ['12-14 februari 2027', '2027-02-12'],
    ['30 november–2 december 2026', '2026-11-30'],
    ['30 november - 2 december 2026', '2026-11-30'],
    ['30 november 2026–2 december 2026', '2026-11-30'],
    ['31 december–2 januari 2027', '2026-12-31'],
    ['31 december 2026–2 januari 2027', '2026-12-31'],
    ['1–3 december 2026*', '2026-12-01'],
  ])('reads the days of %s as the first day, and keeps the text as it is written', (date, first) => {
    expect(readLeague(leagueWith(box({ date, time: '' })))).toMatchObject({
      matches: [{ dateText: date.replace(/\*$/u, ''), kickoffAt: null, matchDate: first, status: 'scheduled' }],
    })
  })

  it('gives no kick-off to a date of several days, also when the page has a time', () => {
    expect(readLeague(leagueWith(box({ date: '1–3 december 2026', time: '20:00 uur' })))).toMatchObject({
      matches: [{ dateText: '1–3 december 2026', kickoffAt: null, matchDate: '2026-12-01' }],
    })
  })

  it.each([
    ['without a year', '1–3 december'],
    ['with the last day before the first', '3–1 december 2026'],
    ['with a last day that does not exist', '30–31 februari 2027'],
    ['with a last month before the first in one year', '2 december–1 november 2026'],
    ['with a first day that does not exist', '31 november–2 december 2026'],
    ['with three days', '1–3–5 december 2026'],
    ['with a word between', '1 tot 3 december 2026'],
  ])('does not know a date of several days %s', (_name, date) => {
    expect(readLeague(leagueWith(box({ date, time: '' })))).toEqual({
      kind: 'error',
      message: `Speelronde 12 (Eredivisie) has a date we do not know: '${date}'`,
    })
  })

  it('reads the second round of the cup, where every date has three days and no time', () => {
    expect(readCup(secondRoundPage)).toMatchObject({
      hasTemplates: true,
      kind: 'read',
      lastPlayedOn: null,
      matches: [
        {
          competition: 'KNVB Beker',
          dateText: '1–3 december 2026',
          home: true,
          kickoffAt: null,
          matchDate: '2026-12-01',
          note: null,
          opponent: 'De Treffers',
          round: 'Tweede ronde',
          stadium: 'Abe Lenstra Stadion',
          status: 'scheduled',
        },
      ],
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

describe('a match that was stopped', () => {
  const stopped = box({
    date: '10 mei 2026',
    score: "Gestaakt 82' (2 – 0)",
    stadium: '[[Rat Verlegh Stadion]]',
    team1: '[[NAC Breda]]',
    team2: '[[sc Heerenveen]]',
    time: '16:45 uur',
  })
  const finished = box({
    date: '11 mei 2026<ref>[https://www.knvb.nl/nieuws Wedstrijd definitief gestaakt], KNVB.nl, 10 mei 2026</ref>',
    score: '2 – 0',
    stadium: '[[Abe Lenstra Stadion]]',
    team1: '[[NAC Breda]]',
    team2: '[[sc Heerenveen]]',
    time: '14:30 uur',
  })

  it('reads the real page of 2025/26: 34 matches, and for round 33 the match as it began and the result of the rest', () => {
    const read = readLeague(seasonProgramme)

    expect(read).toMatchObject({ hasTemplates: true, kind: 'read', lastPlayedOn: '2026-05-17' })
    if (read.kind !== 'read') {
      throw new Error(read.message)
    }

    expect(read.matches).toHaveLength(34)
    expect(read.matches.filter((match) => match.home)).toHaveLength(17)
    expect(read.matches.find((match) => match.round === 'Speelronde 33')).toMatchObject({
      goalsAgainst: 2,
      goalsFor: 0,
      home: false,
      kickoffAt: new Date('2026-05-10T14:45:00Z'),
      matchDate: '2026-05-10',
      note: 'Gestaakt in minuut 82. Het restant is op 11 mei gespeeld in het Abe Lenstra Stadion.',
      opponent: 'NAC Breda',
      stadium: 'Rat Verlegh Stadion',
      status: 'played',
    })
    expect(read.matches.filter((match) => match.note !== null)).toHaveLength(1)
  })

  it('takes the goals of the finishing block, and they agree with the result', () => {
    const read = readLeague(seasonProgramme)
    const match = read.kind === 'read' ? read.matches.find((found) => found.round === 'Speelronde 33') : undefined

    expect(match?.goals?.map((goal) => [goal.player, goal.minute, goal.penalty, goal.ours])).toEqual([
      ['Kemper', 36, false, false],
      ['Kemper', 74, true, false],
    ])
    expect(match === undefined ? 'no match' : checkGoals(match)).toBeUndefined()
  })

  it('leaves the matches of other clubs that were stopped alone', () => {
    expect(seasonProgramme.match(/Gestaakt/gu)).toHaveLength(3)
    expect(readLeague(seasonProgramme).kind).toBe('read')
  })

  it('is one match: where and when it began, and the result of the block that finishes it', () => {
    const read = readLeague(leagueWith(stopped, finished))

    expect(read).toMatchObject({
      kind: 'read',
      matches: [
        {
          goalsAgainst: 2,
          goalsFor: 0,
          home: false,
          kickoffAt: new Date('2026-05-10T14:45:00Z'),
          matchDate: '2026-05-10',
          note: 'Gestaakt in minuut 82. Het restant is op 11 mei gespeeld in het Abe Lenstra Stadion.',
          stadium: 'Rat Verlegh Stadion',
          status: 'played',
        },
      ],
    })
    expect(read.kind === 'read' ? read.matches : []).toHaveLength(1)
  })

  it('gives a match that was not stopped no note', () => {
    expect(matchOf(leagueWith(box({ score: '2 – 1' })), 'Speelronde 12')).toMatchObject({ note: null })
    expect(matchOf(programme, 'Speelronde 1')).toMatchObject({ note: null })
  })

  it('finds the later block whichever club is named first, and reads its score from its own side', () => {
    const reversed = box({
      date: '11 mei 2026',
      goals1: '[[Anis Hadj Moussa|Hadj Moussa]] {{goal|90}}',
      score: '1 – 2',
      team1: '[[sc Heerenveen]]',
      team2: '[[NAC Breda]]',
    })

    expect(readLeague(leagueWith(stopped, reversed))).toMatchObject({
      kind: 'read',
      matches: [
        {
          goals: [{ minute: 90, ours: true }],
          goalsAgainst: 2,
          goalsFor: 1,
          home: false,
          matchDate: '2026-05-10',
          stadium: 'Rat Verlegh Stadion',
        },
      ],
    })
  })

  it('leaves the stadium out of the note when the finishing block has none, and says it is still to be played when it has no score', () => {
    const noStadium = finished.replace(/\|stadium = .*\n/u, '')
    const notPlayed = finished.replace('|score = 2 – 0', '|score = ')

    expect(matchOf(leagueWith(stopped, noStadium), 'Speelronde 12')?.note).toBe(
      'Gestaakt in minuut 82. Het restant is op 11 mei gespeeld.',
    )
    expect(matchOf(leagueWith(stopped, notPlayed), 'Speelronde 12')).toMatchObject({
      goalsFor: null,
      note: 'Gestaakt in minuut 82. Het restant wordt op 11 mei gespeeld in het Abe Lenstra Stadion.',
      status: 'scheduled',
    })
  })

  it('stops when the minute or the day of the rest is not one we know', () => {
    const message = (text: string) => {
      const read = readLeague(text)

      return read.kind === 'error' ? read.message : ''
    }

    expect(message(leagueWith(stopped.replace("82'", 'vroeg'), finished))).toContain('a minute we do not know')
    expect(message(leagueWith(stopped, finished.replace(/11 mei 2026<ref>.*<\/ref>/u, 'eind mei')))).toContain(
      'a day we do not know',
    )
    expect(message(leagueWith(stopped, finished.replace('2 – 0', 'uitgesteld')))).toContain('no score we can use')
  })

  it('stops with an error that names the match when the page has no later block', () => {
    const read = readLeague(leagueWith(stopped))
    const message = read.kind === 'error' ? read.message : ''

    expect(message).toContain('Speelronde 12 (Eredivisie)')
    expect(message).toContain('stopped')
  })

  it('does not use a block before the stopped one, or a block of other clubs, or of another round', () => {
    const other = box({ date: '11 mei 2026', score: '2 – 0', team1: '[[NAC Breda]]', team2: '[[FC Twente]]' })

    expect(readLeague(leagueWith(finished, stopped)).kind).toBe('error')
    expect(readLeague(leagueWith(stopped, other)).kind).toBe('error')
    expect(readLeague(`${leagueWith(stopped)}\n== Speelronde 13 ==\n${finished}\n`).kind).toBe('error')
  })

  it('stops when the finishing block is stopped too and nothing follows it', () => {
    expect(readLeague(leagueWith(stopped, stopped.replace('82', '83'))).kind).toBe('error')
  })

  it('reads a date with a note as the date, also when the note closes itself or holds a template', () => {
    const dateOf = (date: string) => {
      const read = readLeague(leagueWith(box({ date, time: '' })))

      return read.kind === 'read' ? read.matches[0]?.matchDate : read.message
    }

    expect(dateOf('11 mei 2026<ref>Een noot</ref>')).toBe('2026-05-11')
    expect(dateOf('11 mei 2026<ref name="knvb" />')).toBe('2026-05-11')
    expect(dateOf('11 mei 2026<ref name="knvb">Een {{noot|a|b}} met [[links|tekst]]</ref>')).toBe('2026-05-11')
  })

  it('has scorers that agree with the result for every match of ours on the real pages of 2025/26', () => {
    const league = readLeague(seasonProgramme)
    const cup = readCup(seasonCup)
    const read = [...(league.kind === 'read' ? league.matches : []), ...(cup.kind === 'read' ? cup.matches : [])]

    expect(read).toHaveLength(38)
    expect(read.map((match) => checkGoals(match)).filter((problem) => problem !== undefined)).toEqual([])
    // A match without scorers on the page is a goalless draw.
    expect(
      read.filter((match) => match.goals === null).every((match) => match.goalsFor === 0 && match.goalsAgainst === 0),
    ).toBe(true)
  })

  it('leaves a red card with a VAR check out of the scorers, as a red card without one', () => {
    const goals = matchOf(
      leagueWith(
        box({
          goals1: '[[Anis Hadj Moussa|Hadj Moussa]] {{goal|42}}, {{rode kaart VAR|1|54|57}}',
          goals2: '{{rode kaart|2|40|72}} [[Christijan Petrov|Petrov]]',
          score: '1 – 0',
        }),
      ),
      'Speelronde 12',
    )?.goals

    expect(goals?.map((goal) => [goal.player, goal.minute])).toEqual([['Hadj Moussa', 42]])
  })

  it('reads the real cup page of 2025/26: four ties', () => {
    const read = readCup(seasonCup)

    expect(
      read.kind === 'read' ? read.matches.map((match) => [match.round, match.goalsFor, match.goalsAgainst]) : read,
    ).toEqual([
      ['Eerste ronde', 3, 0],
      ['Tweede ronde', 3, 2],
      ['Achtste finales', 3, 1],
      ['Kwartfinales', 1, 4],
    ])
  })

  it('reads the real table of 2025/26: 18 clubs', () => {
    const read = readStandings(seasonStandings)

    expect(read.kind === 'read' ? read.rows : read).toHaveLength(18)
    expect(read.kind === 'read' ? read.rows[7] : read).toMatchObject({ club: 'sc Heerenveen', played: 34, points: 51 })
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
          afterNinetyAgainst: null,
          afterNinetyFor: null,
          attendance: null,
          competition: 'KNVB Beker',
          dateText: null,
          extraTime: false,
          factsProblem: null,
          goals: null,
          goalsAgainst: null,
          goalsFor: null,
          goalsProblem: null,
          home: false,
          kickoffAt: new Date('2026-10-28T20:00:00Z'),
          matchDate: '2026-10-28',
          note: null,
          opponent: 'Excelsior Maassluis',
          opponentPage: 'Excelsior Maassluis',
          penaltiesAgainst: null,
          penaltiesFor: null,
          referee: null,
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

describe('the cup pages of 2021/22 to 2024/25', () => {
  const read = (text: string) => {
    const result = readCup(text)

    return result.kind === 'read' ? result.matches : result
  }

  /** A tie of ours with these fields; the score is the part that differs between the pages. */
  const tie = (fields: Record<string, string>) =>
    `==== Eerste ronde ====\n{{Footballbox2\n${Object.entries({
      date: '18 oktober 2022',
      score: '2 – 1 (1 – 0)',
      team1: '[[sc Heerenveen]]',
      team2: '[[Testdorp FC]]',
      time: '20:00 uur',
      ...fields,
    })
      .map(([key, value]) => `|${key}=${value}`)
      .join('\n')}\n}}`

  it('reads the real page of 2022/23: the final score, with the extra time of the first tie', () => {
    expect(read(cupPages['2022-23']!)).toMatchObject([
      { extraTime: true, goalsAgainst: 2, goalsFor: 4, home: false, round: 'Eerste ronde', status: 'played' },
      { extraTime: false, goalsAgainst: 0, goalsFor: 2, home: true, round: 'Tweede ronde' },
      { extraTime: false, goalsAgainst: 1, goalsFor: 2, home: false, round: 'Achtste finales' },
      { extraTime: false, goalsAgainst: 1, goalsFor: 0, home: true, round: 'Kwartfinales' },
    ])
  })

  it('reads the real page of 2024/25: a time without "uur", and the extra time of the last tie', () => {
    expect(read(cupPages['2024-25']!)).toMatchObject([
      { goalsAgainst: 2, goalsFor: 3, kickoffAt: new Date('2024-10-29T20:00:00Z'), round: 'Eerste ronde' },
      { goalsAgainst: 0, goalsFor: 1, kickoffAt: new Date('2024-12-18T19:00:00Z'), round: 'Tweede ronde' },
      {
        extraTime: true,
        goalsAgainst: 3,
        goalsFor: 2,
        kickoffAt: new Date('2025-01-16T20:00:00Z'),
        round: 'Achtste finales',
      },
    ])
  })

  it('reads the real pages of 2021/22 and 2023/24 too', () => {
    expect(read(cupPages['2021-22']!)).toMatchObject([
      { goalsAgainst: 1, goalsFor: 2, home: false },
      { goalsAgainst: 0, goalsFor: 2, home: true },
      { goalsAgainst: 1, goalsFor: 0, home: true },
    ])
    expect(read(cupPages['2023-24']!)).toMatchObject([
      { goalsAgainst: 1, goalsFor: 5, home: true },
      { goalsAgainst: 1, goalsFor: 0, home: false },
    ])
  })

  it('reads the scorers of the older pages, and they agree with the final score', () => {
    for (const page of Object.values(cupPages)) {
      const matches = read(page)

      expect(Array.isArray(matches)).toBe(true)
      for (const match of Array.isArray(matches) ? matches : []) {
        expect(match.goalsProblem).toBeNull()
        expect(match.goals?.filter((goal) => goal.ours).length ?? match.goalsFor).toBe(match.goalsFor)
      }
    }
  })

  it.each([
    ['5 – 1 (3 – 0)', 5, 1],
    ['1 – 0 (0 – 0)', 1, 0],
    ['2 – 4 (2 – 2, 1 – 1)', 2, 4],
    ['3&nbsp;–&nbsp;1&nbsp;(1&nbsp;–&nbsp;0)', 3, 1],
    ['2 - 1 (1 - 0)', 2, 1],
    ['2 – 1', 2, 1],
  ])('reads the score %j as the final score, home side first', (score, home, away) => {
    expect(read(tie({ aet: score.includes(',') ? 'J' : '', score }))).toMatchObject([
      { goalsAgainst: away, goalsFor: home, home: true, status: 'played' },
    ])
  })

  it('turns the final score for a tie away, and does not take the half time score for it', () => {
    expect(read(tie({ score: '1 – 3 (1 – 2)', team1: '[[Testdorp FC]]', team2: '[[sc Heerenveen]]' }))).toMatchObject([
      { goalsAgainst: 1, goalsFor: 3, home: false },
    ])
  })

  it('reads a shoot-out after extra time in the older layout from our side', () => {
    expect(read(tie({ aet: 'J', penaltyscore: '4 – 3', score: '1 – 1 (1 – 1, 0 – 0)' }))).toMatchObject([
      { extraTime: true, goalsAgainst: 1, goalsFor: 1, penaltiesAgainst: 3, penaltiesFor: 4 },
    ])
  })

  it.each(['20:00', '20:00 uur', '8:05', '20:00*'])('reads the time %j as a time', (time) => {
    expect(read(tie({ time }))).toMatchObject([{ kickoffAt: expect.any(Date) }])
  })

  it('reads the same moment from a time with and without "uur"', () => {
    const [withHour] = read(tie({ time: '20:00 uur' })) as { kickoffAt: Date }[]
    const [without] = read(tie({ time: '20:00' })) as { kickoffAt: Date }[]

    expect(without?.kickoffAt).toEqual(withHour?.kickoffAt)
    expect(without?.kickoffAt).toEqual(new Date('2022-10-18T18:00:00Z'))
  })

  it.each(['25:00', '20:75', '20.00', '20:00 u', 'avond', '20:00:00'])('still refuses the time %j', (time) => {
    expect(readCup(tie({ time }))).toEqual({
      kind: 'error',
      message: `Eerste ronde (KNVB Beker) has a time we do not know: '${time}'`,
    })
  })

  it.each([
    '2 – 1 (1 – 0',
    '2 – 1 (1)',
    '2 – 1 (a – b)',
    '2 – 1 ()',
    '2 – 1 (1 – 0, 0 – 0, 0 – 0)',
    '2 – 1 1 – 0',
    '2 – 1 (1 – 0) x',
  ])('still refuses the score %j, with the name of the match', (score) => {
    expect(readCup(tie({ aet: 'J', score }))).toMatchObject({
      kind: 'error',
      message: expect.stringContaining(`Eerste ronde (KNVB Beker) has a score we do not know: '${score}'`),
    })
  })

  it.each([
    ['2 – 1 (3 – 0)', 'a half time score above the final score'],
    ['2 – 1 (1 – 2)', 'a half time score above the final score'],
    ['2 – 1 (2 – 2, 1 – 0)', 'a score after 90 minutes above the final score'],
    ['2 – 3 (2 – 2, 3 – 0)', 'a half time score above the score after 90 minutes'],
  ])('refuses %j, because it has %s', (score) => {
    expect(readCup(tie({ aet: 'J', score }))).toEqual({
      kind: 'error',
      message: `Eerste ronde (KNVB Beker) has a score that does not add up: '${score}'`,
    })
  })

  it('refuses a score after 90 minutes on a tie without extra time', () => {
    expect(readCup(tie({ aet: '', score: '2 – 1 (1 – 1, 0 – 0)' }))).toEqual({
      kind: 'error',
      message: "Eerste ronde (KNVB Beker) has a score after 90 minutes but no extra time: '2 – 1 (1 – 1, 0 – 0)'",
    })
  })

  it('reads a score in the layout of 2025/26 as it did', () => {
    expect(read(tie({ 'half time score': '1&nbsp;–&nbsp;0', score: '2&nbsp;–&nbsp;1' }))).toMatchObject([
      { goalsAgainst: 1, goalsFor: 2 },
    ])
    expect(read(seasonCup)).toHaveLength(4)
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

  it('fails on a league match with extra time or a shoot-out, which only the cup and the play-offs have', () => {
    for (const fields of [{ aet: 'J' }, { penaltyscore: '4 – 3' }, { aet: 'J', penaltyscore: '4 – 3' }]) {
      const read = readLeague(leagueWith(box({ score: '1 – 1', ...fields })))

      expect(read).toMatchObject({ kind: 'error' })
      expect(JSON.stringify(read)).toContain('which only the cup and the play-offs have')
    }
  })

  it('reads a league match with empty fields for them, as Wikipedia has it', () => {
    expect(readLeague(leagueWith(box({ aet: '', penaltyscore: '', score: '1 – 1' })))).toMatchObject({
      matches: [{ extraTime: false, penaltiesFor: null }],
    })
  })
})

describe('the score after 90 minutes of a cup tie', () => {
  const tie = (fields: Record<string, string>, score = '1&nbsp;–&nbsp;1') =>
    `==== Eerste ronde ====\n{{Footballbox2\n${Object.entries({
      aet: 'J',
      date: '28 oktober 2026',
      score,
      team1: '[[sc Heerenveen]]',
      team2: '[[Testdorp FC]]',
      time: '20:00 uur',
      ...fields,
    })
      .map(([key, value]) => `|${key} = ${value}`)
      .join('\n')}\n}}`
  const afterNinetyOf = (page: string) => {
    const read = readCup(page)

    return read.kind === 'error' ? read : read.matches.map((match) => [match.afterNinetyFor, match.afterNinetyAgainst])
  }

  it('reads the first pair of the half time score as the score after 90 minutes, from our side', () => {
    expect(afterNinetyOf(tie({ 'half time score': '1 – 0, 0 – 0' }, '3 – 1'))).toEqual([[1, 0]])
    expect(
      afterNinetyOf(
        tie({ 'half time score': '1 – 0, 0 – 0', team1: '[[Testdorp FC]]', team2: '[[sc Heerenveen]]' }, '3 – 1'),
      ),
    ).toEqual([[0, 1]])
    expect(afterNinetyOf(tie({ 'half time score': '1&nbsp;–&nbsp;1,&nbsp;0&nbsp;–&nbsp;0' }, '2 – 1'))).toEqual([
      [1, 1],
    ])
  })

  it('reads the five ways of the real page: known, equal to the result, missing, the other way round, one pair', () => {
    expect(readCup(afterNinetyPage)).toMatchObject({
      matches: [
        { afterNinetyAgainst: 1, afterNinetyFor: 1, round: 'Eerste ronde' },
        { afterNinetyAgainst: 2, afterNinetyFor: 2, round: 'Tweede ronde' },
        { afterNinetyAgainst: null, afterNinetyFor: null, round: 'Derde ronde' },
        { afterNinetyAgainst: null, afterNinetyFor: null, round: 'Achtste finale' },
        { afterNinetyAgainst: null, afterNinetyFor: null, round: 'Kwartfinale' },
      ],
    })
  })

  it('reads it for the three ties of the page with extra time', () => {
    expect(afterNinetyOf(extraTimePage)).toEqual([
      [1, 1],
      [0, 0],
      [1, 1],
    ])
  })

  it('reads the score after 90 minutes from the brackets of the older pages', () => {
    expect(afterNinetyOf(tie({}, '2 – 4 (2 – 2, 1 – 1)'))).toEqual([[2, 2]])
    expect(
      afterNinetyOf(tie({ team1: '[[Testdorp FC]]', team2: '[[sc Heerenveen]]' }, '2 – 4 (2 – 3, 1 – 1)')),
    ).toEqual([[3, 2]])
  })

  it.each([
    ['one pair', { 'half time score': '1 – 0' }],
    ['an empty field', { 'half time score': '' }],
    ['no field', {}],
    ['a field we cannot read', { 'half time score': 'onbekend' }],
    ['three pairs', { 'half time score': '1 – 1, 0 – 0, 0 – 0' }],
    ['pairs the other way round', { 'half time score': '0 – 0, 1 – 1' }],
    ['a score above the result', { 'half time score': '3 – 3, 1 – 1' }],
  ])('keeps the match without the score after 90 minutes for %s, and it is no fault', (_name, fields) => {
    expect(readCup(tie(fields, '2 – 2'))).toMatchObject({
      matches: [{ afterNinetyAgainst: null, afterNinetyFor: null, extraTime: true, status: 'played' }],
    })
  })

  it('does not read the half time score of a tie without extra time, also not with a comma in it', () => {
    expect(afterNinetyOf(tie({ aet: '', 'half time score': '0 – 0' }, '2 – 1'))).toEqual([[null, null]])
    expect(afterNinetyOf(tie({ aet: '', 'half time score': '1 – 1, 0 – 0' }, '2 – 1'))).toEqual([[null, null]])
  })

  it('does not read it of a match that has no score yet', () => {
    expect(afterNinetyOf(tie({ 'half time score': '1 – 1, 0 – 0' }, ''))).toEqual([[null, null]])
  })
})

describe('the spectators and the referee', () => {
  const played = (fields: Record<string, string>) => box({ score: '1 – 0', ...fields })
  const facts = (fields: Record<string, string>) => {
    const match = matchOf(leagueWith(played(fields)), 'Speelronde 12')

    return { attendance: match?.attendance, factsProblem: match?.factsProblem, referee: match?.referee }
  }

  it('reads them from the real page of 2025/26 for every match: a name and a number each', () => {
    const read = readLeague(seasonProgramme)

    if (read.kind !== 'read') {
      throw new Error(read.message)
    }

    expect(read.matches.every((match) => match.referee !== null && match.attendance !== null)).toBe(true)
    expect(read.matches.every((match) => match.factsProblem === null)).toBe(true)
    expect(read.matches.find((match) => match.round === 'Speelronde 1')).toMatchObject({
      attendance: 23764,
      referee: 'Marc Nagtegaal',
    })
  })

  it('takes the facts of the block that began a match that was stopped: NAC Breda - sc Heerenveen, 19.241 and Van der Eijk', () => {
    const read = readLeague(seasonProgramme)
    const match = read.kind === 'read' ? read.matches.find((found) => found.round === 'Speelronde 33') : undefined

    expect(match).toMatchObject({ attendance: 19241, factsProblem: null, referee: 'Sander van der Eijk' })
  })

  it('does not take the facts of the block that finished it, which had no audience and another referee', () => {
    const stopped = box({
      attendance: '19.241',
      date: '10 mei 2026',
      referee: '[[Sander van der Eijk|Van der Eijk]]',
      score: "Gestaakt 82' (2 – 0)",
      team1: '[[NAC Breda]]',
      team2: '[[sc Heerenveen]]',
    })
    const finished = box({
      attendance: '0',
      date: '11 mei 2026',
      referee: '[[Martin van den Kerkhof|Van den Kerkhof]]',
      score: '2 – 0',
      team1: '[[NAC Breda]]',
      team2: '[[sc Heerenveen]]',
    })

    expect(matchOf(leagueWith(stopped, finished), 'Speelronde 12')).toMatchObject({
      attendance: 19241,
      referee: 'Sander van der Eijk',
    })
  })

  it.each([
    ['21.022', 21022],
    ['21022', 21022],
    ['21 022', 21022],
    ['21&nbsp;022', 21022],
    ['21 022', 21022],
    ['21 022', 21022],
    ['5.142', 5142],
    ['950', 950],
    ['0', 0],
    ['150.000', 150000],
    ['21.022<ref>De club, 14 november 2026</ref>', 21022],
    ['<!-- onbekend -->21.022', 21022],
  ])('reads the attendance %j as %j', (written, count) => {
    expect(facts({ attendance: written })).toMatchObject({ attendance: count, factsProblem: null })
  })

  it.each(['', '-', '–', '—', 'n.b.', 'N.B.', 'nb'])(
    'reads the attendance %j as not known, without a problem',
    (written) => {
      expect(facts({ attendance: written })).toMatchObject({ attendance: null, factsProblem: null })
    },
  )

  it.each(['ongeveer 20.000', '21.02', '21,022', '1.2.3', '150.001', '1.000.000', '-5', '21.022 (uitverkocht)'])(
    'reads the attendance %j as not known, and says so without stopping the import',
    (written) => {
      expect(facts({ attendance: written })).toEqual({
        attendance: null,
        factsProblem: 'Speelronde 12 (Eredivisie) the attendance is not a number we can use',
        referee: null,
      })
    },
  )

  it('has no attendance for a match that is not played', () => {
    const match = matchOf(leagueWith(box({ attendance: '21.022', score: '' })), 'Speelronde 12')

    expect(match).toMatchObject({ attendance: null, factsProblem: null, status: 'scheduled' })
  })

  it('has neither when the box lacks the fields', () => {
    expect(matchOf(leagueWith(played({})), 'Speelronde 12')).toMatchObject({
      attendance: null,
      factsProblem: null,
      referee: null,
    })
  })

  it.each([
    ['[[Martin van den Kerkhof|Van den Kerkhof]]', 'Martin van den Kerkhof'],
    ['[[Danny Makkelie]]', 'Danny Makkelie'],
    ['[[Danny_Makkelie|Makkelie]]', 'Danny Makkelie'],
    ['[[Stan Teuben|S.P.M. Teuben]]', 'Stan Teuben'],
    ['[[Jan Smit (scheidsrechter)|Smit]]', 'Jan Smit'],
    ["'''[[Bas Nijhuis|Nijhuis]]'''", 'Bas Nijhuis'],
    ['[[Sander van der Eijk|Van der Eijk]]<ref>De KNVB, 14 november 2026</ref>', 'Sander van der Eijk'],
    ["[[Serdar Gözübüyük|Gözübüyük]] ([[Joshua Kuipers|Kuipers]] <small>46'</small>)", 'Serdar Gözübüyük'],
    ['Allard Lindhout', 'Allard Lindhout'],
    ['Allard  Lindhout&nbsp;', 'Allard Lindhout'],
    ["Allard Lindhout (Kuipers 46')", 'Allard Lindhout'],
    ["''Allard Lindhout''", 'Allard Lindhout'],
    ['Allard\u0007 Lindhout', 'Allard Lindhout'],
  ])('reads the referee %j as %j', (written, name) => {
    expect(facts({ referee: written })).toMatchObject({ factsProblem: null, referee: name })
  })

  it.each(['', '-', '–', 'n.b.', 'N.B.'])('reads the referee %j as not known, without a problem', (written) => {
    expect(facts({ referee: written })).toMatchObject({ factsProblem: null, referee: null })
  })

  it.each(['{{flagicon|NED}} Danny Makkelie', 'A'.repeat(101)])(
    'reads the referee %j as not known, and says so without stopping the import',
    (written) => {
      expect(facts({ referee: written })).toEqual({
        attendance: null,
        factsProblem: 'Speelronde 12 (Eredivisie) the referee is not a name we can use',
        referee: null,
      })
    },
  )

  it('keeps the match and says what is wrong with both fields', () => {
    const match = matchOf(leagueWith(played({ attendance: 'veel', referee: '{{x}}' })), 'Speelronde 12')

    expect(match).toMatchObject({
      attendance: null,
      factsProblem:
        'Speelronde 12 (Eredivisie) the attendance is not a number we can use and the referee is not a name we can use',
      goalsFor: 1,
      referee: null,
      status: 'played',
    })
  })

  it('reads them in the cup, where the page has no number for some matches', () => {
    const read = readCup(seasonCup)

    if (read.kind !== 'read') {
      throw new Error(read.message)
    }

    expect(read.matches.map((match) => [match.round, match.attendance, match.referee])).toEqual([
      ['Eerste ronde', null, 'Stan Teuben'],
      ['Tweede ronde', null, 'Bas Nijhuis'],
      ['Achtste finales', 16593, 'Martijn Vos'],
      ['Kwartfinales', 26200, 'Joey Kooij'],
    ])
    expect(read.matches.every((match) => match.factsProblem === null)).toBe(true)
  })

  it('reads them in the play-offs', () => {
    expect(readPlayoffs(playoffPages[2026] ?? '')).toMatchObject({
      kind: 'read',
      matches: [{ attendance: 19334, referee: 'Jannick van der Laan' }],
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
      {
        minute: 45,
        ours: false,
        ownGoal: false,
        penalty: false,
        player: 'Trenskow',
        playerPage: 'Jacob Trenskow',
        stoppageMinutes: null,
      },
      {
        minute: 52,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: 'Oyen',
        playerPage: 'Luca Oyen',
        stoppageMinutes: null,
      },
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
      {
        minute: 7,
        ours: false,
        ownGoal: true,
        penalty: false,
        player: 'Klaverboer',
        playerPage: 'Bernt Klaverboer',
        stoppageMinutes: null,
      },
      {
        minute: 33,
        ours: false,
        ownGoal: false,
        penalty: false,
        player: 'Ouazane',
        playerPage: 'Abdellah Ouazane',
        stoppageMinutes: null,
      },
      {
        minute: 45,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: 'Trenskow',
        playerPage: 'Jacob Trenskow',
        stoppageMinutes: null,
      },
      {
        minute: 82,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: 'Rivera',
        playerPage: 'Maxence Rivera',
        stoppageMinutes: null,
      },
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

describe('the page a link points to', () => {
  it.each([
    ['[[Luca Oyen|Oyen]]', 'Luca Oyen'],
    ['[[Luca Oyen]]', 'Luca Oyen'],
    ['  [[Pim Verbeek (voetballer, 1999)|Verbeek]]', 'Pim Verbeek (voetballer, 1999)'],
    ['[[luca_Oyen|Oyen]]', 'Luca Oyen'],
    ['[[Luca   Oyen#Carrière|Oyen]]', 'Luca Oyen'],
    ['{{goal|52}} [[Luca Oyen|Oyen]]', 'Luca Oyen'],
    ['[[Roberts Uldriķis|Roberts Uldrikis]]', 'Roberts Uldriķis'],
  ])('is %s for %s', (value, page) => {
    expect(linkedPage(value)).toBe(page)
  })

  it.each([
    ['Oyen'],
    [''],
    ['[[|Oyen]]'],
    ['[[#Kop|Oyen]]'],
    ['[[Bestand:Soccerball.svg|10px]]'],
    ['[[Categorie:Spelers]]'],
  ])('is nothing for %j', (value) => {
    expect(linkedPage(value)).toBeNull()
  })

  it('is nothing for a title longer than the database keeps', () => {
    expect(linkedPage(`[[${'a'.repeat(256)}|b]]`)).toBeNull()
    expect(linkedPage(`[[${'a'.repeat(255)}|b]]`)).toBe(`A${'a'.repeat(254)}`)
  })

  it('is on a goal when its name has a link, and nothing when it has none', () => {
    const pageOf = (goals1: string) =>
      matchOf(leagueWith(box({ goals1, goals2: '', score: '1 – 0' })), 'Speelronde 12')?.goals?.[0]?.playerPage

    expect(pageOf('Oyen {{goal|52}}')).toBeNull()
    expect(pageOf('[[Luca Oyen|Oyen]] {{goal|52}}')).toBe('Luca Oyen')
    expect(pageOf('[[Pim Verbeek (voetballer, 1999)|Verbeek]] {{goal|52}}')).toBe('Pim Verbeek (voetballer, 1999)')
  })
})

describe('the play-offs for the Conference League', () => {
  const matchesOf = (year: number) => {
    const read = readPlayoffs(playoffPages[year] ?? '')

    if (read.kind === 'error') {
      throw new Error(read.message)
    }

    return read.matches
  }

  it('reads the semi-final of 2026: FC Utrecht 3-2 sc Heerenveen, away, with the goals and the stadium', () => {
    expect(matchesOf(2026)).toEqual([
      {
        afterNinetyAgainst: null,
        afterNinetyFor: null,
        attendance: 19334,
        competition: 'Play-offs Conference League',
        dateText: null,
        extraTime: false,
        factsProblem: null,
        goals: [
          {
            minute: 46,
            ours: false,
            ownGoal: false,
            penalty: false,
            player: 'Stepanov',
            playerPage: 'Artem Stepanov',
            stoppageMinutes: null,
          },
          {
            minute: 54,
            ours: true,
            ownGoal: false,
            penalty: false,
            player: 'Vente',
            playerPage: 'Dylan Vente',
            stoppageMinutes: null,
          },
          {
            minute: 56,
            ours: false,
            ownGoal: false,
            penalty: false,
            player: 'Van der Hoorn',
            playerPage: 'Mike van der Hoorn',
            stoppageMinutes: null,
          },
          {
            minute: 58,
            ours: false,
            ownGoal: false,
            penalty: false,
            player: 'El Karouani',
            playerPage: 'Souffian El Karouani',
            stoppageMinutes: null,
          },
          {
            minute: 77,
            ours: true,
            ownGoal: false,
            penalty: false,
            player: 'Trenskow',
            playerPage: 'Jacob Trenskow',
            stoppageMinutes: null,
          },
        ],
        goalsAgainst: 3,
        goalsFor: 2,
        goalsProblem: null,
        home: false,
        kickoffAt: new Date('2026-05-21T19:00:00Z'),
        matchDate: '2026-05-21',
        note: null,
        opponent: 'FC Utrecht',
        opponentPage: 'FC Utrecht',
        penaltiesAgainst: null,
        penaltiesFor: null,
        referee: 'Jannick van der Laan',
        round: 'Halve finale',
        stadium: 'Stadion Galgenwaard',
        status: 'played',
      },
    ])
  })

  it('reads the semi-final of 2025: AZ 4-1 sc Heerenveen, with the hat-trick of the opponent', () => {
    const [match, ...others] = matchesOf(2025)

    expect(others).toEqual([])
    expect(match).toMatchObject({
      competition: 'Play-offs Conference League',
      goalsAgainst: 4,
      goalsFor: 1,
      home: false,
      matchDate: '2025-05-22',
      note: null,
      opponent: 'AZ',
      round: 'Halve finale',
      stadium: 'AFAS Stadion',
      status: 'played',
    })
    expect(match?.goals?.map((goal) => [goal.minute, goal.ours, goal.player])).toEqual([
      [3, false, 'Meerdink'],
      [21, false, 'Meerdink'],
      [45, false, 'Meerdink'],
      [66, false, 'Penetra'],
      [74, true, 'Nicolaescu'],
    ])
  })

  it('leaves out the matches of the other clubs and of the other play-offs on the page', () => {
    expect(matchesOf(2026)).toHaveLength(1)
    expect(matchesOf(2026).every((match) => match.opponent !== 'AFC Ajax')).toBe(true)
  })

  it('reads no match, and no fault, for a year in which sc Heerenveen did not play', () => {
    expect(readPlayoffs(playoffPages[2024] ?? '')).toEqual({
      hasTemplates: true,
      kind: 'read',
      lastPlayedOn: null,
      matches: [],
    })
  })

  it('reads the two matches of a semi-final that was played over two matches, each in a round of its own', () => {
    expect(matchesOf(2022).map((match) => [match.round, match.home, match.goalsFor, match.goalsAgainst])).toEqual([
      ['Halve finale, wedstrijd 1/2', true, 3, 2],
      ['Halve finale, wedstrijd 2/2', false, 0, 2],
    ])
  })

  it('reads a match that is not played yet as scheduled, without a result', () => {
    const page = playoffPages[2026]?.replace('|score = 3 – 2', '|score =').replace(/^\|goals[12] = .*$/gmu, '|goals1 =')

    expect(readPlayoffs(page ?? '')).toMatchObject({
      matches: [{ goals: null, goalsAgainst: null, goalsFor: null, status: 'scheduled' }],
    })
  })

  it('reads extra time and a shoot-out as the cup does', () => {
    const page = playoffPages[2026]
      ?.replace(
        '|score = 3 – 2\n|team2 = [[sc Heerenveen]]',
        '|score = 1 – 1\n|aet = ja\n|penaltyscore = 3 – 4\n|team2 = [[sc Heerenveen]]',
      )
      .replace(/^\|goals[12] = .*$/gmu, '|goals1 =')

    expect(readPlayoffs(page ?? '')).toMatchObject({
      matches: [{ extraTime: true, goalsAgainst: 1, goalsFor: 1, penaltiesAgainst: 3, penaltiesFor: 4 }],
    })
  })

  it('reads the older heading, with Europa in it', () => {
    const page = playoffPages[2026]?.replace(
      '== Play-offs voor de UEFA Conference League ==',
      '== Play-offs voor de UEFA Europa Conference League ==',
    )

    expect(readPlayoffs(page ?? '')).toMatchObject({ matches: [{ opponent: 'FC Utrecht' }] })
  })

  it('is an error when the heading of the Conference League has changed, since sc Heerenveen may be under it', () => {
    const page = playoffPages[2026]?.replace(
      '== Play-offs voor de UEFA Conference League ==',
      '== Play-offs om Europees voetbal ==',
    )

    expect(readPlayoffs(page ?? '')).toEqual({
      kind: 'error',
      message: "the play-offs page has no section 'Play-offs voor de UEFA Conference League'",
    })
  })

  it('is an error for a page that is no page of the play-offs at all', () => {
    expect(readPlayoffs('Niets te zien.')).toMatchObject({ kind: 'error' })
  })

  it('is an error when the round above the match is not one we know', () => {
    const page = playoffPages[2026]?.replace('=== Halve finales ===', '=== Kwartfinales ===')

    expect(readPlayoffs(page ?? '')).toMatchObject({ kind: 'error' })
    expect(JSON.stringify(readPlayoffs(page ?? ''))).toContain('has no usable round heading')
  })

  it('is an error when a match of ours has a date we do not know', () => {
    const page = playoffPages[2026]?.replace(
      '|date = 21 mei 2026\n|time = 21:00 uur',
      '|date = ergens in mei\n|time = 21:00 uur',
    )

    expect(JSON.stringify(readPlayoffs(page ?? ''))).toContain('has a date we do not know')
  })
})

describe('the score after 90 minutes of a play-off tie', () => {
  const afterNinetyOf = (page: string) => {
    const read = readPlayoffs(page)

    return read.kind === 'error'
      ? read
      : read.matches.map((match) => [match.round, match.afterNinetyFor, match.afterNinetyAgainst])
  }

  it('reads it for a tie played over one match, from our side, as the cup does', () => {
    expect(afterNinetyOf(playoffAfterNinetyPage)).toEqual([
      ['Halve finale', 1, 1],
      ['Finale', 2, 2],
    ])
  })

  it('reads it from the brackets of the score too, from our side', () => {
    const page = playoffAfterNinetyPage
      .replace(
        '|score = 1&nbsp;–&nbsp;2\n|half time score = 1&nbsp;–&nbsp;1, 0&nbsp;–&nbsp;1',
        '|score = 1 – 3 (1 – 2, 0 – 1)',
      )
      .replace('|half time score = 2&nbsp;–&nbsp;2, 1&nbsp;–&nbsp;0\n', '')

    expect(afterNinetyOf(page)).toEqual([
      ['Halve finale', 2, 1],
      ['Finale', null, null],
    ])
  })

  it('has none without extra time, or when the page does not give it', () => {
    const page = playoffAfterNinetyPage
      .replace("|aet = ja\n|team2 = '''[[sc Heerenveen]]'''", "|aet =\n|team2 = '''[[sc Heerenveen]]'''")
      .replace('|half time score = 2&nbsp;–&nbsp;2, 1&nbsp;–&nbsp;0', '|half time score = 1&nbsp;–&nbsp;0')

    expect(afterNinetyOf(page)).toEqual([
      ['Halve finale', null, null],
      ['Finale', null, null],
    ])
  })

  it('has none for a tie played over two matches, which stays as it was', () => {
    const page = playoffPages[2022]?.replace(
      '|score = 2 – 0\n|team2 = [[sc Heerenveen]]',
      '|score = 2 – 0\n|half time score = 2 – 0, 1 – 0\n|aet = ja\n|team2 = [[sc Heerenveen]]',
    )

    expect(page).toContain('|half time score = 2 – 0, 1 – 0')
    expect(afterNinetyOf(page ?? '')).toMatchObject([
      ['Halve finale, wedstrijd 1/2', null, null],
      ['Halve finale, wedstrijd 2/2', null, null],
    ])
  })
})
