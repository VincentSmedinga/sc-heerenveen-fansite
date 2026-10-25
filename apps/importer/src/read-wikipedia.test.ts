import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { pageTitles, pageUrl, readCup, readLeague, readStandings } from './read-wikipedia.ts'

const programme = readFileSync(new URL('./fixtures/wikipedia-programme.wiki', import.meta.url), 'utf8')
const standingsPage = readFileSync(new URL('./fixtures/wikipedia-standings.wiki', import.meta.url), 'utf8')
const cupPage = readFileSync(new URL('./fixtures/wikipedia-cup.wiki', import.meta.url), 'utf8')

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
      goalsAgainst: 0,
      goalsFor: 1,
      home: true,
      kickoffAt: new Date('2026-08-09T14:45:00Z'),
      matchDate: '2026-08-09',
      opponent: 'FC Twente',
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
          goalsAgainst: null,
          goalsFor: null,
          home: false,
          kickoffAt: new Date('2026-10-28T20:00:00Z'),
          matchDate: '2026-10-28',
          opponent: 'Excelsior Maassluis',
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
