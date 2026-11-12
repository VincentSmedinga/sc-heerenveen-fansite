import type { SearchableMatch } from '@fansite/db/match-search'

import { describe, expect, it } from 'vitest'

import {
  byGoalDifference,
  choicesOf,
  competitionGroups,
  days,
  facetValuesOf,
  type Filters,
  findMatches,
  hasChoice,
  listOf,
  matchCount,
  matchesPerSearchPage,
  outcomeOf,
  parseFilters,
  relaxedChoices,
  searchHref,
  sentenceOf,
  tallyLine,
  tallyOf,
  viewOf,
} from './match-search'

// Every match, club and season is made up.
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

const matches: SearchableMatch[] = [
  // Saturday 1 September 2001: a home win against Testdorp.
  made({ goalsAgainst: 1, goalsFor: 2, matchDate: '2001-09-01' }),
  // Friday 7 September 2001: an away draw against Voorbeeld United.
  made({
    clubName: 'Voorbeeld United',
    clubSlug: 'voorbeeld-united',
    goalsAgainst: 1,
    goalsFor: 1,
    home: false,
    matchDate: '2001-09-07',
  }),
  // Sunday 14 March 2004: an away loss in the UEFA Cup against Testdorp.
  made({
    competition: 'UEFA Cup',
    goalsAgainst: 3,
    goalsFor: 0,
    home: false,
    matchDate: '2004-03-14',
    season: '2003/04',
  }),
  // Wednesday 2 September 2026: a cup tie won on penalties after a level score.
  made({
    competition: 'KNVB Beker',
    extraTime: true,
    goalsAgainst: 2,
    goalsFor: 2,
    matchDate: '2026-09-02',
    penaltiesAgainst: 3,
    penaltiesFor: 4,
    season: '2026/27',
  }),
  // Monday 7 September 2026: a home win in the play-offs against Voorbeeld United.
  made({
    clubName: 'Voorbeeld United',
    clubSlug: 'voorbeeld-united',
    competition: 'Play-offs UEFA Cup',
    goalsAgainst: 0,
    goalsFor: 5,
    matchDate: '2026-09-07',
    season: '2026/27',
  }),
]

const world = {
  clubs: [
    { name: 'Testdorp FC', slug: 'testdorp-fc' },
    { name: 'Voorbeeld United', slug: 'voorbeeld-united' },
  ],
  seasons: ['2001/02', '2003/04', '2026/27'],
}

const parse = (raw: Parameters<typeof parseFilters>[0]) => parseFilters(raw, world)

const none: Filters = parse({})

const count = (filters: Partial<Filters>, scorer?: ReadonlySet<number>) =>
  viewOf(matches, { ...none, ...filters }, scorer, world).result.total

describe('parseFilters', () => {
  it('asks for nothing without an address', () => {
    expect(none).toMatchObject({ competitions: [], days: [], order: 'nieuwste', outcomes: [], page: 1, venues: [] })
    expect(hasChoice(none)).toBe(false)
  })

  it('keeps the values it knows, once, in the order of the lists, and drops the rest', () => {
    const filters = parse({
      competitie: ['europa', 'onzin', 'eredivisie'],
      dag: ['zondag', 'maandag', 'maandag'],
      tegen: 'bestaat-niet',
      uitslag: 'winst',
      van: '1850/51',
      waar: ['uit', 'thuis'],
    })

    expect(filters.competitions).toEqual(['eredivisie', 'europa'])
    expect(filters.days).toEqual(['maandag', 'zondag'])
    expect(filters.venues).toEqual(['thuis', 'uit'])
    expect(filters).toMatchObject({ club: undefined, from: undefined, outcomes: [] })
    expect(parse({ tegen: 'testdorp-fc' }).club).toBe('testdorp-fc')
  })

  it('swaps the seasons when "van" falls after "tot", and drops one that is the first or the last season', () => {
    expect(parse({ tot: '2003/04', van: '2026/27' })).toMatchObject({ from: '2003/04', to: undefined })
    expect(parse({ tot: '2001/02', van: '2003/04' })).toMatchObject({ from: undefined, to: '2003/04' })
    expect(parse({ tot: '2026/27', van: '2001/02' })).toMatchObject({ from: undefined, to: undefined })
  })

  it.each([
    ['3', 3],
    ['0', 0],
    ['99', 99],
    ['100', undefined],
    ['-1', undefined],
    ['1e1', undefined],
    ['drie', undefined],
    ['', undefined],
  ])('takes the goals %j as %s', (text, expected) => {
    expect(parse({ wij: text }).ours).toBe(expected)
  })

  it('has the limits of the search for a player on a goalscorer, and ignores an empty one', () => {
    expect(parse({ doelpuntenmaker: '' }).scorer).toBeUndefined()
    expect(parse({ doelpuntenmaker: '' }).scorerError).toBeUndefined()
    expect(parse({ doelpuntenmaker: ' Van  Bergen ' }).scorer).toEqual({ text: 'Van Bergen', words: ['Van', 'Bergen'] })
    expect(parse({ doelpuntenmaker: 'a' }).scorerError?.message).toBe('Schrijf woorden van minstens 2 tekens.')
    expect(parse({ doelpuntenmaker: 'een twee drie vier vijf zes' }).scorerError?.message).toBe(
      'Zoek op hoogstens 5 woorden.',
    )
    expect(parse({ doelpuntenmaker: 'x'.repeat(61) }).scorerError?.message).toBe('Schrijf hoogstens 60 tekens.')
    // A search that does not meet the limits asks nothing of the matches.
    expect(hasChoice(parse({ doelpuntenmaker: 'a' }))).toBe(false)
  })

  it('takes the first value of a parameter that is given twice, and the page only as a number', () => {
    expect(parse({ tegen: ['voorbeeld-united', 'testdorp-fc'] }).club).toBe('voorbeeld-united')
    expect(parse({ pagina: '3' }).page).toBe(3)
    expect(parse({ pagina: '0' }).page).toBe(1)
    expect(parse({ pagina: 'x' }).page).toBe(1)
    expect(parse({ volgorde: 'oudste' }).order).toBe('oudste')
    expect(parse({ volgorde: 'anders' }).order).toBe('nieuwste')
  })
})

describe('searchHref', () => {
  it('writes the choices in a fixed order and leaves out what is not chosen', () => {
    expect(searchHref(none)).toBe('/wedstrijden/zoeken')
    expect(
      searchHref(
        parse({
          pagina: '2',
          tegen: 'testdorp-fc',
          uitslag: 'gewonnen',
          van: '2003/04',
          volgorde: 'oudste',
          waar: 'uit',
        }),
      ),
    ).toBe('/wedstrijden/zoeken?tegen=testdorp-fc&van=2003%2F04&waar=uit&uitslag=gewonnen&volgorde=oudste&pagina=2')
  })

  it('reads back what it wrote', () => {
    const filters = parse({
      competitie: ['knvb-beker', 'europa'],
      dag: 'vrijdag',
      doelpuntenmaker: 'Bos',
      wij: '2',
      zij: '0',
    })
    const query = Object.fromEntries(new URL(searchHref(filters), 'http://x').searchParams)

    expect(parse({ ...query, competitie: ['knvb-beker', 'europa'] })).toEqual(filters)
  })
})

describe('the outcome and the day', () => {
  it('counts a shoot-out as a draw, because the score after extra time decides', () => {
    expect(outcomeOf(matches[3]!)).toBe('gelijk')
    expect(outcomeOf(matches[0]!)).toBe('gewonnen')
    expect(outcomeOf(matches[2]!)).toBe('verloren')
  })

  it('has the days of the week, Monday first', () => {
    expect(days.map((day) => day.value)).toEqual([
      'maandag',
      'dinsdag',
      'woensdag',
      'donderdag',
      'vrijdag',
      'zaterdag',
      'zondag',
    ])
  })

  it('puts every competition of the database in exactly one group', () => {
    const members = competitionGroups.flatMap((group) => group.members)

    expect(new Set(members).size).toBe(members.length)
    expect(members).toHaveLength(13)
  })
})

describe('the matches a search finds', () => {
  it('finds everything without choices', () => {
    expect(count({})).toBe(5)
  })

  it('takes "or" within a group and "and" between groups', () => {
    expect(count({ venues: ['uit'] })).toBe(2)
    expect(count({ venues: ['thuis', 'uit'] })).toBe(5)
    expect(count({ outcomes: ['gewonnen', 'verloren'] })).toBe(3)
    expect(count({ outcomes: ['gewonnen', 'verloren'], venues: ['uit'] })).toBe(1)
    expect(count({ club: 'voorbeeld-united', outcomes: ['gewonnen'] })).toBe(1)
  })

  it('has Europa as one group of every European cup and its play-offs', () => {
    expect(count({ competitions: ['europa'] })).toBe(2)
    expect(count({ competitions: ['europa', 'knvb-beker'] })).toBe(3)
    expect(count({ competitions: ['johan-cruijff-schaal'] })).toBe(0)
  })

  it('finds the matches of the days', () => {
    expect(count({ days: ['vrijdag'] })).toBe(1)
    expect(count({ days: ['maandag', 'woensdag'] })).toBe(2)
  })

  it('finds the matches between two seasons', () => {
    expect(count({ from: '2003/04' })).toBe(3)
    expect(count({ from: '2003/04', to: '2003/04' })).toBe(1)
    expect(count({ to: '2003/04' })).toBe(3)
  })

  it('finds an exact score from our side', () => {
    expect(count({ ours: 2 })).toBe(2)
    expect(count({ ours: 2, theirs: 1 })).toBe(1)
    expect(count({ theirs: 0 })).toBe(1)
  })

  it('finds the matches of a goalscorer, and nothing for a scorer without matches', () => {
    expect(count({ scorer: { text: 'Bos', words: ['Bos'] } }, new Set([matches[0]!.id, matches[4]!.id]))).toBe(2)
    expect(count({ scorer: { text: 'Bos', words: ['Bos'] } }, new Set())).toBe(0)
  })
})

describe('the counts behind the values', () => {
  const view = (filters: Partial<Filters>) => viewOf(matches, { ...none, ...filters }, undefined, world)

  it('are those of the whole list without choices', () => {
    const start = view({})

    expect(start.venues.map((item) => [item.value, item.count])).toEqual([
      ['thuis', 3],
      ['uit', 2],
    ])
    expect(start.outcomes.map((item) => [item.value, item.count])).toEqual([
      ['gewonnen', 2],
      ['gelijk', 2],
      ['verloren', 1],
    ])
    expect(start.clubs.map((club) => [club.slug, club.count])).toEqual([
      ['testdorp-fc', 3],
      ['voorbeeld-united', 2],
    ])
  })

  it('count the matches you get by adding the value, the other choices as they are', () => {
    // Away matches: a draw and a loss. Adding "gewonnen" gives away wins: there are none.
    expect(view({ venues: ['uit'] }).outcomes.map((item) => [item.value, item.count])).toEqual([
      ['gelijk', 1],
      ['verloren', 1],
    ])
    // Adding Thuis to Uit gives every match, so the count of Thuis is all five.
    expect(view({ venues: ['uit'] }).venues.map((item) => [item.value, item.count])).toEqual([
      ['thuis', 5],
      ['uit', 2],
    ])
  })

  it('leave out a value with 0, unless it is chosen, and keep a chosen club', () => {
    expect(view({}).days.map((item) => item.value)).toEqual(['maandag', 'woensdag', 'vrijdag', 'zaterdag', 'zondag'])
    expect(view({ days: ['dinsdag'] }).days.find((item) => item.value === 'dinsdag')).toMatchObject({
      count: 0,
      selected: true,
    })
    expect(view({ club: 'voorbeeld-united', competitions: ['eerste-divisie'] }).clubs.map((club) => club.slug)).toEqual(
      ['voorbeeld-united'],
    )
  })
})

describe('the record, the sentence and the way out of nothing', () => {
  it('tallies the outcomes and the goals, and writes them as one line', () => {
    const tally = tallyOf(matches)

    expect(tally).toEqual({ drawn: 2, goalsAgainst: 7, goalsFor: 10, lost: 1, won: 2 })
    expect(tallyLine(tally)).toBe('2 gewonnen · 2 gelijk · 1 verloren · doelpunten 10–7')
  })

  it('says one match as "1 wedstrijd"', () => {
    expect(matchCount(1)).toBe('1 wedstrijd')
    expect(matchCount(0)).toBe('0 wedstrijden')
    expect(matchCount(76)).toBe('76 wedstrijden')
  })

  it('writes the search as a sentence from its choices', () => {
    expect(sentenceOf(none, world)).toBe('Alle wedstrijden, sinds 2001/02.')
    expect(sentenceOf(parse({ tegen: 'testdorp-fc' }), world)).toBe(
      'Alle wedstrijden tegen Testdorp FC, sinds 2001/02.',
    )
    expect(
      sentenceOf(
        parse({
          competitie: 'europa',
          dag: 'vrijdag',
          tegen: 'testdorp-fc',
          uitslag: ['gewonnen', 'gelijk'],
          waar: 'uit',
        }),
        world,
      ),
    ).toBe(
      'Alle uitwedstrijden tegen Testdorp FC in Europa die we wonnen of gelijkspeelden, op een vrijdag, sinds 2001/02.',
    )
    expect(sentenceOf(parse({ tot: '2003/04' }), world)).toBe('Alle wedstrijden, van 2001/02 tot en met 2003/04.')
  })

  it('has a chip for each value of each choice, each with the filters without it', () => {
    const filters = parse({ tegen: 'testdorp-fc', uitslag: ['gewonnen', 'gelijk'], waar: 'uit' })
    const chips = choicesOf(filters, world)

    expect(chips.map((chip) => chip.label)).toEqual(['Testdorp FC', 'Uit', 'Gewonnen', 'Gelijk'])
    expect(searchHref(chips[3]!.without)).toBe('/wedstrijden/zoeken?tegen=testdorp-fc&waar=uit&uitslag=gewonnen')
  })

  it('offers each choice to leave out with what it gives, and leaves out one that still gives nothing', () => {
    // Away, a win, a Friday: nobody. Without Uit there is no win on a Friday, and without the
    // Friday there is no away win. Without the win, there is the away draw on the Friday.
    const filters = parse({ dag: 'vrijdag', uitslag: 'gewonnen', waar: 'uit' })

    expect(relaxedChoices(matches, filters, undefined, world)).toEqual([
      { count: 1, href: '/wedstrijden/zoeken?waar=uit&dag=vrijdag', label: 'gewonnen' },
    ])
    expect(viewOf(matches, filters, undefined, world).relaxed).toHaveLength(1)
  })
})

describe('the pages of the results', () => {
  const many = Array.from({ length: 60 }, (_, index) =>
    made({
      matchDate: `2001-${String((index % 9) + 1).padStart(2, '0')}-10`,
      season: index < 30 ? '2001/02' : '2002/03',
    }),
  )
  const page = (filters: Partial<Filters>) => viewOf(many, { ...none, ...filters }, undefined, world).result

  it('has 25 matches to a page, the newest first and grouped by season', () => {
    const first = page({})

    expect(matchesPerSearchPage).toBe(25)
    expect(first).toMatchObject({ page: 1, pageCount: 3, range: [1, 25], total: 60 })
    expect(first.seasons.map((group) => [group.season, group.matches.length])).toEqual([['2002/03', 25]])
    expect(page({ page: 3 })).toMatchObject({ range: [51, 60] })
    expect(page({ page: 3 }).seasons.map((group) => group.season)).toEqual(['2001/02'])
  })

  it('keeps a page within the pages there are, and turns the order round', () => {
    expect(page({ page: 99 }).page).toBe(3)
    expect(page({ order: 'oudste' }).seasons[0]?.season).toBe('2001/02')
    expect(page({ order: 'oudste', page: 2 }).seasons.map((group) => group.season)).toEqual(['2001/02', '2002/03'])
  })

  it('has no range for nothing', () => {
    expect(viewOf([], none, undefined, world).result).toMatchObject({ pageCount: 1, range: [0, 0], total: 0 })
  })
})

/** The query of an address as `parseFilters` gets it: each name with all its values. */
const rawOf = (href: string) => {
  const query = new URL(href, 'https://example.test').searchParams

  return Object.fromEntries([...new Set(query.keys())].map((name) => [name, query.getAll(name)]))
}

describe('the parameters of the questions (#1151)', () => {
  it('reads more clubs, the least goals, penalties and the order of the goal difference', () => {
    const filters = parse({
      clubs: ['voorbeeld-united', 'onzin', 'testdorp-fc', 'voorbeeld-united'],
      doelpunten: '7',
      strafschoppen: 'ja',
      volgorde: 'doelsaldo',
    })

    expect(filters).toMatchObject({
      clubs: ['voorbeeld-united', 'testdorp-fc'],
      minGoals: 7,
      order: 'doelsaldo',
      penalties: true,
    })
    expect(hasChoice(parse({ clubs: 'testdorp-fc' }))).toBe(true)
    expect(hasChoice(parse({ doelpunten: '3' }))).toBe(true)
    expect(hasChoice(parse({ strafschoppen: 'ja' }))).toBe(true)
    // The order alone is not a choice.
    expect(hasChoice(parse({ volgorde: 'doelsaldo' }))).toBe(false)
  })

  it('drops what is not a number or not known, and gives no error', () => {
    expect(parse({ doelpunten: 'veel', maand: '13', op: '5', strafschoppen: 'nee' })).toMatchObject({
      date: undefined,
      minGoals: undefined,
      penalties: false,
    })
    expect(parse({ doelpunten: '0' }).minGoals).toBeUndefined()
  })

  it('reads a day and a month, or a month alone, and ignores a date that does not exist', () => {
    expect(parse({ maand: '11', op: '11' }).date).toEqual({ day: 11, month: 11 })
    expect(parse({ maand: '11' }).date).toEqual({ day: undefined, month: 11 })
    // A day without a month asks for nothing.
    expect(parse({ op: '11' }).date).toBeUndefined()
    // 31 April doesn't exist: the month stays, the day goes.
    expect(parse({ maand: '4', op: '31' }).date).toEqual({ day: undefined, month: 4 })
    // 29 February does exist, in a leap year.
    expect(parse({ maand: '2', op: '29' }).date).toEqual({ day: 29, month: 2 })
    expect(parse({ maand: '2', op: '30' }).date).toEqual({ day: undefined, month: 2 })
  })

  it('writes them in the address and reads them back', () => {
    const filters = parse({
      clubs: ['testdorp-fc', 'voorbeeld-united'],
      doelpunten: '7',
      maand: '11',
      op: '11',
      strafschoppen: 'ja',
      volgorde: 'doelsaldo',
    })
    const href = searchHref(filters)

    expect(href).toBe(
      '/wedstrijden/zoeken?clubs=testdorp-fc&clubs=voorbeeld-united&doelpunten=7&strafschoppen=ja&maand=11&op=11&volgorde=doelsaldo',
    )
    expect(parse(rawOf(href))).toEqual(filters)
  })

  it('finds the matches of more clubs at once', () => {
    expect(count({ clubs: ['voorbeeld-united'] })).toBe(2)
    expect(count({ clubs: ['voorbeeld-united', 'testdorp-fc'] })).toBe(5)
  })

  it('finds the matches with at least that many goals of both clubs together', () => {
    expect(count({ minGoals: 5 })).toBe(1)
    expect(count({ minGoals: 4 })).toBe(2)
    expect(count({ minGoals: 99 })).toBe(0)
  })

  it('finds the matches a shoot-out decided', () => {
    expect(count({ penalties: true })).toBe(1)
  })

  it('finds the matches of a day and month, and of a month, in any year', () => {
    expect(count({ date: { day: 7, month: 9 } })).toBe(2)
    expect(count({ date: { day: undefined, month: 9 } })).toBe(4)
    expect(count({ date: { day: 8, month: 9 } })).toBe(0)
  })

  it('does not count a leap day on 28 February', () => {
    const leap = [made({ matchDate: '2008-02-29', season: '2007/08' }), made({ matchDate: '2009-02-28' })]

    expect(findMatches(leap, { ...none, date: { day: 28, month: 2 } }, undefined)).toEqual([leap[1]])
    expect(findMatches(leap, { ...none, date: { day: 29, month: 2 } }, undefined)).toEqual([leap[0]])
    expect(findMatches(leap, { ...none, date: { day: undefined, month: 2 } }, undefined)).toHaveLength(2)
  })

  it('orders on goal difference, then goals, then the newest, in one group without a season', () => {
    const ordered = byGoalDifference(matches)

    expect(ordered.map((match) => [match.goalsFor, match.goalsAgainst])).toEqual([
      [5, 0],
      [2, 1],
      [2, 2],
      [1, 1],
      [0, 3],
    ])

    const result = viewOf(matches, { ...none, order: 'doelsaldo' }, undefined, world).result

    expect(result.seasons).toHaveLength(1)
    expect(result.seasons[0]?.season).toBeUndefined()
    expect(result.seasons[0]?.matches).toHaveLength(5)
  })

  it('has a chip each, and a sentence that names them', () => {
    const filters = parse({
      clubs: ['testdorp-fc', 'voorbeeld-united'],
      doelpunten: '7',
      maand: '11',
      op: '11',
      strafschoppen: 'ja',
      volgorde: 'doelsaldo',
    })
    const labels = choicesOf(filters, world).map((choice) => choice.label)

    expect(labels).toEqual([
      'Testdorp FC en Voorbeeld United',
      'Ten minste 7 doelpunten',
      'Beslist met strafschoppen',
      '11 november',
      'Op doelsaldo',
    ])
    expect(sentenceOf(parse({ doelpunten: '7' }), world)).toBe(
      'Alle wedstrijden met 7 doelpunten of meer, sinds 2001/02.',
    )
    expect(sentenceOf(filters, world)).toBe(
      'Alle wedstrijden tegen Testdorp FC en Voorbeeld United met 7 doelpunten of meer die met strafschoppen werden beslist, gespeeld op 11 november, sinds 2001/02, de grootste uitslag eerst.',
    )
    expect(sentenceOf(parse({ maand: '11' }), world)).toContain(', gespeeld in november,')
  })

  it('does not offer the order to leave out when nothing is found, and the chip of the order is no filter', () => {
    const filters = parse({ doelpunten: '99', volgorde: 'doelsaldo' })
    const view = viewOf(matches, filters, undefined, world)

    expect(view.relaxed.map((choice) => choice.label)).toEqual(['Ten minste 99 doelpunten'])
  })

  it('writes a list of names for a sentence', () => {
    expect(listOf(['Ajax'])).toBe('Ajax')
    expect(listOf(['Ajax', 'PSV', 'Feyenoord'])).toBe('Ajax, PSV en Feyenoord')
  })
})

describe('what a closed row says (#1157)', () => {
  const seasons = ['2001/02', '2002/03', '2003/04']
  const values = (filters: Partial<Filters>) => {
    const all = { ...none, ...filters }

    return facetValuesOf(all, viewOf(matches, all, undefined, world), seasons)
  }

  it('says nothing without a choice', () => {
    expect(Object.values(values({})).every((value) => value === '')).toBe(true)
  })

  it('names the club, one value, or the number of values of a group', () => {
    expect(values({ club: 'testdorp-fc' }).club).toBe('Testdorp FC')
    expect(values({ venues: ['uit'] }).venues).toBe('Uit')
    expect(values({ outcomes: ['gewonnen', 'gelijk'] }).outcomes).toBe('2 gekozen')
    expect(values({ days: ['zaterdag'] }).days).toBe('zaterdag')
  })

  it('names the seasons only when they are not all of them', () => {
    expect(values({ from: '2001/02', to: '2003/04' }).seasons).toBe('')
    expect(values({ from: '2002/03' }).seasons).toBe('2002/03–2003/04')
    expect(values({ to: '2002/03' }).seasons).toBe('2001/02–2002/03')
  })

  it('gives the goalscorer as written and the exact score with the side that is empty', () => {
    expect(values({ scorer: { text: 'Van Aken', words: ['van', 'aken'] } }).scorer).toBe('Van Aken')
    expect(values({ scorerError: { message: 'Te kort.', text: 'a' } }).scorer).toBe('a')
    expect(values({ ours: 2, theirs: 1 }).score).toBe('2–1')
    expect(values({ ours: 2 }).score).toBe('2–')
    expect(values({ theirs: 1 }).score).toBe('–1')
  })
})
