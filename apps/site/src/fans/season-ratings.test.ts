import { describe, expect, it } from 'vitest'

import {
  isOldSeason,
  rankSeason,
  type RatingFigures,
  type SeasonFigure,
  seasonsOver,
  yearWinners,
} from './season-ratings'

let nextPlayer = 1

/** A made-up player in a season: the matches that count, the ratings and their average. */
const figure = (
  season: string,
  name: string,
  counting: number,
  ratings: number,
  average: number,
  extra: Partial<SeasonFigure> = {},
): SeasonFigure => ({
  counting,
  name,
  old: false,
  playerId: nextPlayer++,
  ratings,
  season,
  total: average * ratings,
  ...extra,
})

const data = (parts: Partial<RatingFigures> = {}): RatingFigures => ({
  figures: [],
  oldRatings: [],
  overSeasons: new Set(),
  ...parts,
})

describe('the ranking of a season', () => {
  it('puts the highest season rating first and numbers the places', () => {
    const rows = rankSeason(
      data({ figures: [figure('2026/27', 'Speler A', 5, 100, 6.5), figure('2026/27', 'Speler B', 9, 200, 7.25)] }),
      '2026/27',
    )

    expect(rows.map((row) => [row.place, row.name, row.matches])).toEqual([
      [1, 'Speler B', 9],
      [2, 'Speler A', 5],
    ])
  })

  it('shows a player from three matches with five ratings or more, and not before', () => {
    const rows = rankSeason(
      data({ figures: [figure('2026/27', 'Speler A', 2, 80, 9), figure('2026/27', 'Speler B', 3, 90, 6)] }),
      '2026/27',
    )

    expect(rows.map((row) => row.name)).toEqual(['Speler B'])
  })

  it('weighs a season rating by the ratings, so a match with a few ratings counts for little', () => {
    // 100 ratings of 6 and 10 of 10 is 6,36, not the 8 of the two averages.
    const [row] = rankSeason(data({ figures: [figure('2026/27', 'Speler A', 4, 110, (600 + 100) / 110)] }), '2026/27')

    expect(row?.average).toBeCloseTo(6.36, 2)
  })

  it('puts the player with fewer ratings first when the ratings are equal, and shares the place', () => {
    const rows = rankSeason(
      data({ figures: [figure('2026/27', 'Speler A', 4, 120, 7), figure('2026/27', 'Speler B', 4, 80, 7)] }),
      '2026/27',
    )

    expect(rows.map((row) => [row.place, row.name])).toEqual([
      [1, 'Speler B'],
      [2, 'Speler A'],
    ])
  })

  it('gives equal players the same place', () => {
    const rows = rankSeason(
      data({ figures: [figure('2026/27', 'Speler A', 4, 100, 7), figure('2026/27', 'Speler B', 4, 100, 7)] }),
      '2026/27',
    )

    expect(rows.map((row) => row.place)).toEqual([1, 1])
  })

  it('has a season rating without matches for the old seasons, with a dash for the matches', () => {
    const rows = rankSeason(
      data({
        oldRatings: [
          { average: 6.8, name: 'Speler X', playerId: null, season: '1999/00' },
          { average: 7.1, name: 'Speler Y', playerId: 40, season: '1999/00' },
          { average: 9, name: 'Speler Z', playerId: 41, season: '2000/01' },
        ],
      }),
      '1999/00',
    )

    expect(rows.map((row) => [row.name, row.matches, row.ratings])).toEqual([
      ['Speler Y', undefined, undefined],
      ['Speler X', undefined, undefined],
    ])
  })

  it('does not replace a player with matches by his season rating', () => {
    const counted = figure('2000/01', 'Speler A', 5, 100, 6)
    const rows = rankSeason(
      data({
        figures: [counted],
        oldRatings: [{ average: 9, name: 'Speler A', playerId: counted.playerId, season: '2000/01' }],
      }),
      '2000/01',
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.matches).toBe(5)
  })

  it('has no rows for a season without ratings', () => {
    expect(rankSeason(data(), '2026/27')).toEqual([])
  })

  it('knows when the numbers come from the old fansite', () => {
    const found = data({
      figures: [figure('2004/05', 'Speler A', 5, 100, 6, { old: true }), figure('2026/27', 'Speler B', 5, 100, 6)],
      oldRatings: [{ average: 6, name: 'Speler C', playerId: null, season: '1999/00' }],
    })

    expect(isOldSeason(found, '2004/05')).toBe(true)
    expect(isOldSeason(found, '1999/00')).toBe(true)
    expect(isOldSeason(found, '2026/27')).toBe(false)
  })
})

describe('the Uitblinkers of the year', () => {
  const now = new Date('2026-11-22T12:00:00Z')
  const over = (...seasons: string[]) => new Set(seasons)

  it('shows nothing but the running season while there are no ratings', () => {
    expect(yearWinners(data(), now)).toEqual([{ average: undefined, names: [], season: '2026/27' }])
  })

  it('is the player with the highest season rating of a season that is over, the newest season first', () => {
    const winners = yearWinners(
      data({
        figures: [
          figure('2004/05', 'Speler A', 20, 400, 7.1),
          figure('2004/05', 'Speler B', 25, 500, 6.8),
          figure('2005/06', 'Speler C', 4, 100, 6.5),
        ],
        overSeasons: over('2004/05', '2005/06'),
      }),
      now,
    )

    expect(winners.map((winner) => [winner.season, winner.names])).toEqual([
      ['2026/27', []],
      ['2005/06', ['Speler C']],
      ['2004/05', ['Speler A']],
    ])
    expect(winners[2]?.average).toBeCloseTo(7.1, 5)
  })

  it('counts a player from three matches with five ratings or more, not before', () => {
    const winners = yearWinners(
      data({
        figures: [figure('2003/04', 'Speler A', 2, 200, 9), figure('2003/04', 'Speler B', 3, 90, 6)],
        overSeasons: over('2003/04'),
      }),
      now,
    )

    expect(winners.find((winner) => winner.season === '2003/04')?.names).toEqual(['Speler B'])
  })

  it('lets the stored season rating decide for 1998/99 to 2000/01', () => {
    const winners = yearWinners(
      data({
        oldRatings: [
          { average: 6.9, name: 'Speler X', playerId: null, season: '1998/99' },
          { average: 7.1, name: 'Speler Y', playerId: 40, season: '1998/99' },
        ],
        overSeasons: over('1998/99'),
      }),
      now,
    )

    expect(winners.find((winner) => winner.season === '1998/99')).toEqual({
      average: 7.1,
      names: ['Speler Y'],
      season: '1998/99',
    })
  })

  it('shows both players on an equal season rating, whatever their number of ratings', () => {
    const winners = yearWinners(
      data({
        figures: [
          figure('2025/26', 'Speler A', 7, 300, 7.4),
          figure('2025/26', 'Speler B', 7, 200, 7.4),
          figure('2025/26', 'Speler C', 7, 200, 7.3),
        ],
        overSeasons: over('2025/26'),
      }),
      now,
    )

    expect(winners.find((winner) => winner.season === '2025/26')?.names).toEqual(['Speler B', 'Speler A'])
  })

  it('gives a season that is not over no winner, only "Na het seizoen" for the running one', () => {
    const winners = yearWinners(data({ figures: [figure('2026/27', 'Speler A', 9, 300, 8)] }), now)

    expect(winners).toEqual([{ average: undefined, names: [], season: '2026/27' }])
  })

  it('names the winner of the current season once it is over, and has no row without a winner for it', () => {
    const winners = yearWinners(
      data({ figures: [figure('2026/27', 'Speler A', 9, 300, 8)], overSeasons: over('2026/27') }),
      new Date('2027-06-15T12:00:00Z'),
    )

    expect(winners.map((winner) => [winner.season, winner.names])).toEqual([['2026/27', ['Speler A']]])
  })

  it('leaves out a season that is over but has no player that counts', () => {
    const winners = yearWinners(
      data({ figures: [figure('2025/26', 'Speler A', 2, 300, 8)], overSeasons: over('2025/26') }),
      now,
    )

    expect(winners.map((winner) => winner.season)).toEqual(['2026/27'])
  })

  it('has no row at all for the running season when it is over and nobody counts', () => {
    expect(yearWinners(data({ overSeasons: over('2026/27') }), new Date('2027-06-15T12:00:00Z'))).toEqual([])
  })
})

describe('when a season is over', () => {
  const match = (season: string, matchDate: string, status = 'played', kickoffAt: Date | null = null) => ({
    kickoffAt,
    matchDate,
    season,
    status,
  })

  it('needs every match played and the window of the last match closed, seven days after its start', () => {
    const rows = [match('2025/26', '2026-05-17'), match('2025/26', '2026-05-24')]

    expect([...seasonsOver(rows, new Date('2026-05-30T23:00:00Z'))]).toEqual([])
    expect([...seasonsOver(rows, new Date('2026-05-31T00:00:00Z'))]).toEqual(['2025/26'])
  })

  it('is not over while a match is still to be played', () => {
    const rows = [match('2026/27', '2026-08-01'), match('2026/27', '2027-05-16', 'scheduled')]

    expect([...seasonsOver(rows, new Date('2026-11-22T12:00:00Z'))]).toEqual([])
  })

  it('counts the kick-off of a match when it is known', () => {
    const rows = [match('2025/26', '2026-05-24', 'played', new Date('2026-05-24T14:30:00Z'))]

    expect([...seasonsOver(rows, new Date('2026-05-31T14:00:00Z'))]).toEqual([])
    expect([...seasonsOver(rows, new Date('2026-05-31T14:30:00Z'))]).toEqual(['2025/26'])
  })

  it('treats a season before the current one as over whatever a match that never came says', () => {
    const rows = [match('2025/26', '2026-05-24'), match('2025/26', '2026-05-31', 'postponed')]

    expect([...seasonsOver(rows, new Date('2026-11-22T12:00:00Z'))]).toEqual(['2025/26'])
  })
})
