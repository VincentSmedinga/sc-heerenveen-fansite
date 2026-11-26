import { listSeasonPlayerBirths } from '@fansite/db/queries'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSquadSummary, positionCounts, squadSummary } from './squad-summary'
import { squadData } from './test-squad'

vi.mock('./database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('@fansite/db/queries', () => ({ listSeasonPlayerBirths: vi.fn() }))

const figure = (age: number | undefined, country: null | string | undefined = 'NL') => ({ age, country })
const noCountry = (age?: number) => ({ age, country: undefined })
const line = { country: null, givenName: 'Proef', key: 'Proef Speler', shirtNumber: null, surname: 'Speler' }

describe('squadSummary', () => {
  it('gives the number of players, the average with the youngest and the oldest, and the number of different countries', () => {
    expect(squadSummary([figure(20, 'NL'), figure(30, 'NL'), figure(25, 'SE'), figure(21, 'KZ')], true)).toEqual({
      ages: { average: 24, oldest: 30, youngest: 20 },
      countries: 3,
      players: 4,
    })
  })

  it('has no card without players', () => {
    expect(squadSummary([], true)).toBeUndefined()
  })

  it('leaves the lines with an age out in a season that is over, and keeps the players and the countries', () => {
    expect(squadSummary([figure(20), figure(30)], false)).toEqual({ countries: 1, players: 2 })
  })

  it('shows the lines with an age at exactly three quarters of the players, and names the basis', () => {
    expect(squadSummary([figure(20), figure(22), figure(24), figure(undefined)], true)).toEqual({
      ages: { average: 22, oldest: 24, youngest: 20 },
      basis: { known: 3, total: 4 },
      countries: 1,
      players: 4,
    })
  })

  it('leaves the lines with an age out below three quarters, and says nothing of the ages then', () => {
    const summary = squadSummary([figure(20), figure(22), figure(undefined), figure(undefined)], true)

    expect(summary).toEqual({ countries: 1, players: 4 })
  })

  it('names the smallest basis when both countries and ages are missing', () => {
    const summary = squadSummary(
      [
        figure(20, 'NL'),
        figure(22, null),
        figure(24, 'SE'),
        figure(26, null),
        figure(28, 'SE'),
        figure(undefined, 'NL'),
      ],
      true,
    )

    expect(summary?.basis).toEqual({ known: 4, total: 6 })
  })

  it('names the countries as the basis in a season that is over, when some players have none', () => {
    expect(squadSummary([figure(undefined, 'NL'), figure(undefined, null)], false)).toEqual({
      basis: { known: 1, total: 2 },
      countries: 1,
      players: 2,
    })
  })

  it('has no line Landen and no sentence when nobody has a country', () => {
    expect(squadSummary([figure(undefined, null), noCountry()], false)).toEqual({ players: 2 })
  })

  it('has no sentence when everything is known', () => {
    expect(squadSummary([figure(20), figure(30)], true)?.basis).toBeUndefined()
  })
})

describe('positionCounts', () => {
  const part = (label: null | string, size: number) => ({
    label,
    players: Array.from({ length: size }, () => ({ ...line })),
  })

  it('has the four positions, with 0 for an empty one, and then the players without one', () => {
    expect(positionCounts([part('Aanvallers', 2), part('Positie onbekend', 1)])).toEqual([
      { count: 0, label: 'Doelmannen' },
      { count: 0, label: 'Verdedigers' },
      { count: 0, label: 'Middenvelders' },
      { count: 2, label: 'Aanvallers' },
      { count: 1, label: 'Positie onbekend' },
    ])
  })

  it('has no line Positie onbekend when everybody has a position', () => {
    expect(positionCounts([part('Doelmannen', 3)])?.map(({ label }) => label)).not.toContain('Positie onbekend')
  })

  it('has no lines when nobody has a position', () => {
    expect(positionCounts([part(null, 20)])).toBeUndefined()
    expect(positionCounts([])).toBeUndefined()
  })
})

describe('getSquadSummary', () => {
  const today = new Date('2026-10-23T13:40:00Z')
  const [first, second, third, fourth, fifth] = squadData.players.map((player) => player.name)

  beforeEach(() => {
    vi.mocked(listSeasonPlayerBirths).mockReset()
    vi.mocked(listSeasonPlayerBirths).mockResolvedValue([
      { birthDate: '2000-10-23', birthDatePrecision: 'day', sourceName: first! },
      { birthDate: '1990-10-24', birthDatePrecision: 'day', sourceName: second! },
      { birthDate: '1999-01-01', birthDatePrecision: 'year', sourceName: third! },
      { birthDate: null, birthDatePrecision: null, sourceName: fourth! },
      { birthDate: null, birthDatePrecision: null, sourceName: fifth! },
    ])
  })

  it('works out the ages of today in the current season, and counts a player with only a year as one without an age', async () => {
    const summary = await getSquadSummary(squadData, '2026/27', today)

    // Two of five have an age (a date with only a year gives none): too few for the lines.
    expect(summary).toEqual({
      basis: { known: 4, total: 5 },
      countries: 3,
      players: 5,
      positions: [
        { count: 1, label: 'Doelmannen' },
        { count: 1, label: 'Verdedigers' },
        { count: 1, label: 'Middenvelders' },
        { count: 2, label: 'Aanvallers' },
      ],
    })
  })

  it('finds the date of birth of a renamed player by the name of the source (#1697)', async () => {
    vi.mocked(listSeasonPlayerBirths).mockResolvedValue(
      squadData.players.map((player) => ({
        birthDate: '2000-10-23',
        birthDatePrecision: 'day' as const,
        sourceName: player.sourceName,
      })),
    )

    const squad = { ...squadData, players: squadData.players.map((player) => ({ ...player, name: 'Anders' })) }
    const summary = await getSquadSummary(squad, '2028/29', new Date('2028-10-23T13:40:00Z'))

    expect(summary?.ages).toEqual({ average: 28, oldest: 28, youngest: 28 })
  })

  // The dates are kept per season for a while, so each test has a season of its own.
  it('has the lines with an age when three quarters of the players have a date of birth', async () => {
    vi.mocked(listSeasonPlayerBirths).mockResolvedValue(
      squadData.players.map((player, index) => ({
        birthDate: index < 4 ? `${2000 - index}-10-23` : null,
        birthDatePrecision: index < 4 ? ('day' as const) : null,
        sourceName: player.name,
      })),
    )

    const summary = await getSquadSummary(squadData, '2027/28', new Date('2027-10-23T13:40:00Z'))

    expect(summary?.ages).toEqual({ average: 28.5, oldest: 30, youngest: 27 })
    expect(summary?.basis).toEqual({ known: 4, total: 5 })
  })

  it('has no ages in an earlier season and does not ask for the dates of birth', async () => {
    const summary = await getSquadSummary(squadData, '2025/26', today)

    expect(summary?.ages).toBeUndefined()
    expect(listSeasonPlayerBirths).not.toHaveBeenCalled()
  })

  it('counts the positions only when the list says enough', async () => {
    const withLevel = (level: 'bijna' | 'deels') => ({
      ...squadData,
      completeness: { ...squadData.completeness!, level },
    })

    expect((await getSquadSummary(withLevel('bijna'), '2025/26', today))?.positions).toHaveLength(4)
    expect((await getSquadSummary(withLevel('deels'), '2025/26', today))?.positions).toBeUndefined()
  })

  it('has no figures when the squad is not known', async () => {
    expect(
      await getSquadSummary(
        {
          ...squadData,
          completeness: { bestSource: 'selectie', level: 'onbekend', markedComplete: false, playerCount: 0 },
        },
        '2026/27',
        today,
      ),
    ).toBeUndefined()
  })

  it('has no date of birth in what it gives', async () => {
    vi.mocked(listSeasonPlayerBirths).mockResolvedValue(
      squadData.players.map((player) => ({
        birthDate: '2000-10-23',
        birthDatePrecision: 'day' as const,
        sourceName: player.name,
      })),
    )

    expect(JSON.stringify(await getSquadSummary(squadData, '2028/29', new Date('2028-10-23T13:40:00Z')))).not.toMatch(
      /\d{4}-\d{2}-\d{2}/,
    )
  })
})
