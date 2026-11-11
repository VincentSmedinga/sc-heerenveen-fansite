import { describe, expect, it } from 'vitest'

import type { CareerMatch, PlayerSeason } from './player-seasons'

import { playerAsideOf } from './player-aside'

const matchOf = (id: number, season: string, extra: Partial<CareerMatch> = {}): CareerMatch => ({
  clubSlug: 'testdorp-fc',
  competition: 'Eredivisie',
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  id,
  matchDate: `${season.slice(0, 4)}-10-${String(10 + id).padStart(2, '0')}`,
  opponent: 'Testdorp FC',
  round: String(id),
  season,
  ...extra,
})

const seasonOf = (season: string, extra: Partial<PlayerSeason> = {}): PlayerSeason => ({
  assists: undefined,
  cleanSheets: undefined,
  conceded: undefined,
  goalMoments: [],
  goals: 0,
  goalsByCompetition: {},
  lineupMatches: [],
  matchesInSeason: 34,
  played: undefined,
  red: undefined,
  reportedMatches: 34,
  season,
  shirtNumber: undefined,
  source: 'lineups',
  started: undefined,
  yellow: undefined,
  ...extra,
})

const goalIn = (match: CareerMatch, minute = 10) => ({ match, minute, stoppage: undefined })

const nothing = { againstUs: [], assistGivers: [] }

describe('the side column of a player', () => {
  it('has nothing at all for a player we know nothing of', () => {
    expect(playerAsideOf([], nothing, false)).toEqual({
      against: undefined,
      assistGiver: undefined,
      competitions: undefined,
      europe: undefined,
      firstGoal: undefined,
      opponents: [],
    })
    expect(playerAsideOf([seasonOf('2003/04')], {}, false).competitions).toBeUndefined()
  })

  it('adds up the goals by competition over the seasons, the most first, without a nought', () => {
    const aside = playerAsideOf(
      [
        seasonOf('2004/05', { goalsByCompetition: { Eredivisie: 4, 'KNVB Beker': 1 } }),
        seasonOf('2003/04', { goalsByCompetition: { Eredivisie: 9, 'Europa League': 3 } }),
      ],
      nothing,
      false,
    )

    expect(aside.competitions).toEqual({
      rows: [
        { competition: 'Eredivisie', count: 13 },
        { competition: 'Europa League', count: 3 },
        { competition: 'KNVB Beker', count: 1 },
      ],
      title: 'Doelpunten per competitie',
    })
  })

  it('counts the matches by competition for a goalkeeper, from the line-ups', () => {
    const aside = playerAsideOf(
      [
        seasonOf('2003/04', {
          lineupMatches: [
            matchOf(1, '2003/04'),
            matchOf(2, '2003/04'),
            matchOf(3, '2003/04', { competition: 'KNVB Beker' }),
          ],
        }),
      ],
      nothing,
      true,
    )

    expect(aside.competitions).toEqual({
      rows: [
        { competition: 'Eredivisie', count: 2 },
        { competition: 'KNVB Beker', count: 1 },
      ],
      title: 'Wedstrijden per competitie',
    })
  })

  it('has the clubs he scored against at least twice, the most first, at most four', () => {
    const club = (slug: string, name: string, goals: number, season: string) =>
      Array.from({ length: goals }, (_, index) =>
        goalIn(matchOf(index + slug.length, season, { clubSlug: slug, opponent: name })),
      )
    const aside = playerAsideOf(
      [
        seasonOf('2004/05', {
          goalMoments: [
            ...club('aa', 'AA', 2, '2004/05'),
            ...club('bbb', 'BBB', 5, '2004/05'),
            ...club('c', 'C', 1, '2004/05'),
            ...club('dddd', 'DDDD', 3, '2004/05'),
            ...club('eeeee', 'EEEEE', 2, '2004/05'),
            ...club('ffffff', 'FFFFFF', 2, '2004/05'),
          ],
        }),
      ],
      nothing,
      false,
    )

    expect(aside.opponents.map(({ goals, name }) => [name, goals])).toEqual([
      ['BBB', 5],
      ['DDDD', 3],
      ['AA', 2],
      ['EEEEE', 2],
    ])
    expect(
      playerAsideOf([seasonOf('2004/05', { goalMoments: [goalIn(matchOf(1, '2004/05'))] })], nothing, false).opponents,
    ).toEqual([])
  })

  it('has his first goal for us, over all his seasons', () => {
    const early = goalIn(matchOf(5, '2002/03'))
    const aside = playerAsideOf(
      [
        seasonOf('2003/04', { goalMoments: [goalIn(matchOf(1, '2003/04'))] }),
        seasonOf('2002/03', { goalMoments: [early] }),
      ],
      nothing,
      false,
    )

    expect(aside.firstGoal).toBe(early)
  })

  it('names who gave him the most assists, with at least two, and nobody when two tie', () => {
    const giver = (name: string, slug: null | string = null) => ({ name, slug })

    expect(
      playerAsideOf([], { assistGivers: [giver('Ad', 'ad'), giver('Bo'), giver('Ad', 'ad')] }, false).assistGiver,
    ).toEqual({ assists: 2, name: 'Ad', slug: 'ad' })
    expect(playerAsideOf([], { assistGivers: [giver('Ad', 'ad'), giver('Bo')] }, false).assistGiver).toBeUndefined()
    expect(
      playerAsideOf([], { assistGivers: [giver('Ad', 'ad'), giver('Ad', 'ad'), giver('Bo'), giver('Bo')] }, false)
        .assistGiver,
    ).toBeUndefined()
  })

  it('counts the matches in Europe and those in the Champions League, and says when not every line-up is there', () => {
    const lineupMatches = [
      matchOf(1, '2003/04', { competition: 'UEFA Cup' }),
      matchOf(2, '2003/04', { competition: 'Champions League' }),
      matchOf(3, '2003/04'),
    ]

    expect(playerAsideOf([seasonOf('2003/04', { lineupMatches })], nothing, false).europe).toEqual({
      championsLeague: 1,
      matches: 2,
      partial: false,
    })
    expect(
      playerAsideOf([seasonOf('2003/04', { lineupMatches, source: 'some-lineups' })], nothing, false).europe?.partial,
    ).toBe(true)
    expect(
      playerAsideOf([seasonOf('2003/04', { lineupMatches: [matchOf(3, '2003/04')] })], nothing, false).europe,
    ).toBeUndefined()
  })

  describe('the goals against us', () => {
    const against = (id: number, season: string) => ({ match: matchOf(id, season), minute: 5, stoppage: null })
    const seasons = [seasonOf('2003/04'), seasonOf('2002/03')]

    it('says "voor hij hier kwam" when all were before his first season, newest first', () => {
      const aside = playerAsideOf(seasons, { againstUs: [against(1, '1996/97'), against(2, '1997/98')] }, false)

      expect(aside.against?.intro).toBe('Voor hij hier kwam, scoorde hij twee keer tegen sc Heerenveen.')
      expect(aside.against?.goals.map((goal) => goal.match.season)).toEqual(['1997/98', '1996/97'])
    })

    it('says "nadat hij hier wegging" when all were after his last season', () => {
      expect(playerAsideOf(seasons, { againstUs: [against(1, '2008/09')] }, false).against?.intro).toBe(
        'Nadat hij hier wegging, scoorde hij één keer tegen sc Heerenveen.',
      )
    })

    it('says only "tegen sc Heerenveen" for a player who scored both before and after his time here', () => {
      const aside = playerAsideOf(
        seasons,
        { againstUs: [against(1, '1996/97'), against(2, '2008/09'), against(3, '2009/10')] },
        false,
      )

      expect(aside.against?.intro).toBe('Hij scoorde drie keer tegen sc Heerenveen.')
      expect(aside.against?.goals).toHaveLength(3)
    })

    it('is left out without a goal against us', () => {
      expect(playerAsideOf(seasons, nothing, false).against).toBeUndefined()
    })
  })
})
