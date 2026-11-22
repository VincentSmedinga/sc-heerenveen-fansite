import { describe, expect, it, vi } from 'vitest'

import { gradeText, loadPlayerRatings, playerRatingsOf, type RatingRow } from './player-ratings'

let nextMatch = 1

/** A made-up average of the player in a match of a season. */
const row = (season: string, matchDate: string, average: number, ratingCount: number, extra: Partial<RatingRow> = {}) =>
  ({
    average,
    clubSlug: 'oefenstad',
    competition: 'Eredivisie',
    goalsAgainst: 1,
    goalsFor: 3,
    home: true,
    matchDate,
    matchId: nextMatch++,
    opponent: 'Oefenstad',
    ratingCount,
    round: `Speelronde ${nextMatch}`,
    season,
    source: 'fans',
    ...extra,
  }) satisfies RatingRow

describe('the ratings of a player', () => {
  it('writes a grade with a decimal comma', () => {
    expect(gradeText(7.25)).toBe('7,3')
    expect(gradeText(6)).toBe('6,0')
  })

  it('works the season rating out from every rating, not from the averages of the matches', () => {
    const ratings = playerRatingsOf(
      [
        row('2026/27', '2026-08-01', 9, 5),
        row('2026/27', '2026-08-08', 6, 5),
        row('2026/27', '2026-08-15', 6, 5),
        // Too few ratings for a match of the count, but the ratings count.
        row('2026/27', '2026-08-22', 3, 3),
      ],
      [],
      new Map(),
    )

    // (45 + 30 + 30 + 9) / 18 = 6,33 and not the average of 9, 6, 6 and 3.
    expect(ratings?.seasons).toEqual([{ average: '6,3', count: 18, matches: 3, season: '2026/27' }])
  })

  it('leaves out a season with fewer than three matches of five ratings, old or new', () => {
    const ratings = playerRatingsOf(
      [
        row('2003/04', '2003-09-01', 7, 20, { source: 'oude-fansite' }),
        row('2003/04', '2003-09-08', 7, 20, { source: 'oude-fansite' }),
        row('2003/04', '2003-09-15', 7, 4, { source: 'oude-fansite' }),
        row('2004/05', '2004-09-01', 7, 20, { source: 'oude-fansite' }),
        row('2004/05', '2004-09-08', 7, 20, { source: 'oude-fansite' }),
        row('2004/05', '2004-09-15', 7, 20, { source: 'oude-fansite' }),
      ],
      [],
      new Map(),
    )

    expect(ratings?.seasons.map(({ season }) => season)).toEqual(['2004/05'])
  })

  it('shows nothing for a player without enough ratings', () => {
    expect(playerRatingsOf([], [], new Map())).toBeUndefined()
    expect(playerRatingsOf([row('2026/27', '2026-08-01', 7, 9)], [], new Map())).toBeUndefined()
  })

  it('has old and new seasons with the newest first, the source line only for the old numbers', () => {
    const matches = (season: string, year: number, source: RatingRow['source']) =>
      ['01', '08', '15'].map((day) => row(season, `${year}-09-${day}`, 7, 10, { source }))
    const both = playerRatingsOf(
      [...matches('2005/06', 2005, 'oude-fansite'), ...matches('2026/27', 2026, 'fans')],
      [],
      new Map(),
    )
    const current = playerRatingsOf(matches('2026/27', 2026, 'fans'), [], new Map())

    expect(both?.seasons.map(({ season }) => season)).toEqual(['2026/27', '2005/06'])
    expect(both?.oldSource).toBe(true)
    expect(current?.oldSource).toBe(false)
  })

  it('has a season with only a season rating, with no matches and no count', () => {
    const ratings = playerRatingsOf(
      [],
      [
        { average: 6.8, season: '2000/01' },
        { average: 7.1, season: '1999/00' },
      ],
      new Map(),
    )

    expect(ratings?.seasons).toEqual([
      { average: '6,8', count: undefined, matches: undefined, season: '2000/01' },
      { average: '7,1', count: undefined, matches: undefined, season: '1999/00' },
    ])
    expect(ratings?.seasonOnly).toBe(true)
    expect(ratings?.oldSource).toBe(true)
  })

  it('lists the last five matches with five ratings, the newest first, and marks the Uitblinker', () => {
    const rows = [
      row('2026/27', '2026-08-01', 6, 8),
      row('2026/27', '2026-08-08', 7, 8),
      row('2026/27', '2026-08-15', 7.8, 8, { goalsAgainst: 2, goalsFor: 2, home: false, opponent: 'Ajax' }),
      row('2026/27', '2026-08-22', 5, 3),
      row('2026/27', '2026-08-29', 6.5, 8),
      row('2026/27', '2026-09-05', 6.5, 8),
      row('2026/27', '2026-09-12', 6.5, 8),
    ]
    const ratings = playerRatingsOf(rows, [], new Map([[rows[2]!.matchId, 7.8]]))

    expect(ratings?.last.map(({ average }) => average)).toEqual(['6,5', '6,5', '6,5', '7,8', '7,0'])
    expect(ratings?.last.map(({ winner }) => winner)).toEqual([false, false, false, true, false])
    expect(ratings?.last[3]?.label).toBe('Ajax – sc Heerenveen 2–2')
    expect(ratings?.last[0]?.label).toBe('sc Heerenveen – Oefenstad 3–1')
  })

  it('leaves the card out while the Uitblinker is off, without reading anything', async () => {
    vi.stubEnv('FANS_UITBLINKER', undefined)

    await expect(loadPlayerRatings(7)).resolves.toBeUndefined()
  })
})
