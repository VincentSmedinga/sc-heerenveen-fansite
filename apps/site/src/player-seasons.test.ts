import { describe, expect, it } from 'vitest'

import { type CareerMatch, type PlayerSeasonFacts, playerSeasonsOf, type SeasonAppearance } from './player-seasons'

const none: PlayerSeasonFacts = { appearances: [], assists: [], goals: [], matchCounts: [], players: [], tables: [] }

/** A made-up appearance in a line-up. */
const appearance = (season: string, extra: Partial<SeasonAppearance> = {}): SeasonAppearance => ({
  cameOn: false,
  goalsAgainst: 1,
  match: matchOf(season),
  red: false,
  season,
  starter: true,
  substituted: false,
  yellow: false,
  ...extra,
})

const matchOf = (season: string, id = 1): CareerMatch => ({
  competition: 'Eredivisie',
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  id,
  matchDate: `${season.slice(0, 4)}-10-10`,
  opponent: 'Testclub',
  round: '1',
  season,
})

const goal = (season: string, competition: 'Eredivisie' | 'KNVB Beker' = 'Eredivisie') => ({
  competition,
  match: matchOf(season),
  minute: 25,
  season,
  stoppage: null,
})

describe('the seasons of a player', () => {
  it('has the newest season first and the shirt number of the season', () => {
    const seasons = playerSeasonsOf({
      ...none,
      players: [
        { season: '2003/04', shirtNumber: 9 },
        { season: '2004/05', shirtNumber: null },
      ],
    })

    expect(seasons.map(({ season, shirtNumber }) => [season, shirtNumber])).toEqual([
      ['2004/05', undefined],
      ['2003/04', 9],
    ])
  })

  it('takes a season with every line-up from the line-ups', () => {
    const [season] = playerSeasonsOf({
      ...none,
      appearances: [
        appearance('2003/04', { yellow: true }),
        appearance('2003/04', { cameOn: true, red: true, starter: false, yellow: true }),
        appearance('2003/04'),
      ],
      assists: [{ season: '2003/04' }],
      goals: [goal('2003/04'), goal('2003/04', 'KNVB Beker')],
      matchCounts: [{ played: 3, reported: 3, season: '2003/04' }],
      players: [{ season: '2003/04', shirtNumber: 9 }],
      tables: [{ appearances: 99, assists: 99, season: '2003/04' }],
    })

    expect(season).toMatchObject({
      assists: 1,
      goals: 2,
      goalsByCompetition: { Eredivisie: 1, 'KNVB Beker': 1 },
      played: 3,
      red: 1,
      source: 'lineups',
      started: 2,
      yellow: 2,
    })
  })

  it('takes a season without every line-up from the table of Wikipedia, and has no starts or cards then', () => {
    const [season] = playerSeasonsOf({
      ...none,
      appearances: [appearance('2026/27')],
      goals: [goal('2026/27')],
      matchCounts: [{ played: 12, reported: 1, season: '2026/27' }],
      players: [{ season: '2026/27', shirtNumber: 35 }],
      tables: [{ appearances: 11, assists: 3, season: '2026/27' }],
    })

    expect(season).toMatchObject({ assists: 3, goals: 1, played: 11, source: 'wikipedia' })
    expect(season?.started).toBeUndefined()
    expect(season?.yellow).toBeUndefined()
    expect(season?.red).toBeUndefined()
  })

  it('counts the line-ups there are when a season has a few and no table, and says how many', () => {
    const [season] = playerSeasonsOf({
      ...none,
      appearances: [appearance('2007/08'), appearance('2007/08', { cameOn: true, starter: false })],
      matchCounts: [{ played: 41, reported: 8, season: '2007/08' }],
      players: [{ season: '2007/08', shirtNumber: null }],
    })

    expect(season).toMatchObject({
      matchesInSeason: 41,
      played: 2,
      reportedMatches: 8,
      source: 'some-lineups',
      started: 1,
    })
  })

  it('has dashes for a season without anything, and no nought for goals we cannot know', () => {
    const [season] = playerSeasonsOf({
      ...none,
      matchCounts: [{ played: 30, reported: 0, season: '1990/91' }],
      players: [{ season: '1990/91', shirtNumber: null }],
    })

    expect(season).toMatchObject({ source: 'none' })
    expect(season?.goals).toBeUndefined()
    expect(season?.played).toBeUndefined()
    expect(season?.assists).toBeUndefined()
    expect(season?.cleanSheets).toBeUndefined()
  })

  it('counts a clean sheet and the goals against only for matches he played from start to end', () => {
    const [season] = playerSeasonsOf({
      ...none,
      appearances: [
        appearance('2003/04', { goalsAgainst: 0 }),
        appearance('2003/04', { goalsAgainst: 2 }),
        // Substituted, on the bench and sent off: none of these three counts.
        appearance('2003/04', { goalsAgainst: 0, substituted: true }),
        appearance('2003/04', { cameOn: true, goalsAgainst: 0, starter: false }),
        appearance('2003/04', { goalsAgainst: 0, red: true }),
      ],
      matchCounts: [{ played: 5, reported: 5, season: '2003/04' }],
      players: [{ season: '2003/04', shirtNumber: 1 }],
    })

    expect(season).toMatchObject({ cleanSheets: 1, conceded: 2, played: 5 })
  })

  it('counts a substitute who came on as played, and one who stayed on the bench as not', () => {
    const [season] = playerSeasonsOf({
      ...none,
      appearances: [
        appearance('2003/04', { match: matchOf('2003/04', 1), starter: false }),
        appearance('2003/04', { cameOn: true, match: matchOf('2003/04', 2), starter: false }),
        appearance('2003/04', { match: matchOf('2003/04', 3) }),
      ],
      matchCounts: [{ played: 3, reported: 3, season: '2003/04' }],
      players: [{ season: '2003/04', shirtNumber: 1 }],
    })

    expect(season).toMatchObject({ played: 2, started: 1 })
    // The career never starts or ends on a match he only sat on the bench in.
    expect(season?.lineupMatches.map(({ id }) => id)).toEqual([2, 3])
  })
})
