import type { SearchableMatch } from '@fansite/db/match-search'

import { describe, expect, it } from 'vitest'

import {
  choicesOf,
  competitionGroups,
  days,
  type Filters,
  hasChoice,
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
