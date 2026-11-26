import { listSeasonPlayerPersons } from '@fansite/db/queries'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSeasonSquad, type SeasonSquad } from './season-squad'
import { type ComparedSeason, getSquadChanges, seasonBefore, squadChanges } from './squad-changes'
import { squadData } from './test-squad'

vi.mock('./database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('@fansite/db/queries', () => ({ listSeasonPlayerPersons: vi.fn() }))
vi.mock('./season-squad', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSeasonSquad: vi.fn(),
}))

type Player = SeasonSquad['players'][number]

const player = (name: string, extra: Partial<Player> = {}): Player => ({
  ...squadData.players[0]!,
  name,
  searchTerm: name,
  shirtNumber: null,
  sourceName: name,
  ...extra,
})

const squadOf = (players: Player[], level: 'bijna' | 'compleet' | 'deels' = 'compleet'): SeasonSquad => ({
  ...squadData,
  completeness: { bestSource: 'selectie', level, markedComplete: false, playerCount: players.length },
  players,
})

/** A season of players who are each a name, with the person behind them (null: none). */
const compared = (season: string, rows: [string, null | number, Partial<Player>?][]): ComparedSeason => ({
  persons: rows.map(([name, personId, extra]) => ({ name, personId, sourceName: extra?.sourceName ?? name })),
  season,
  squad: squadOf(rows.map(([name, , extra]) => player(name, extra))),
})

const names = (players: { key: string }[]) => players.map(({ key }) => key)

describe('squadChanges', () => {
  it('gives who is new and who is gone, and nobody who is in both seasons', () => {
    const changes = squadChanges(
      compared('2026/27', [
        ['Blijver', 1],
        ['Nieuweling', 2],
      ]),
      compared('2025/26', [
        ['Blijver', 1],
        ['Vertrekker', 3],
      ]),
    )

    expect(names(changes.arrived)).toEqual(['Nieuweling'])
    expect(names(changes.departed)).toEqual(['Vertrekker'])
    expect(changes.previous).toBe('2025/26')
  })

  it('follows a player by the person, also under another name, and tells two persons with one name apart', () => {
    const changes = squadChanges(
      compared('2026/27', [
        ['Jan Nieuw', 1],
        ['Piet Naamgenoot', 3],
      ]),
      compared('2025/26', [
        ['Jan Oud', 1],
        ['Piet Naamgenoot', 2],
      ]),
    )

    expect(names(changes.arrived)).toEqual(['Piet Naamgenoot'])
    expect(names(changes.departed)).toEqual(['Piet Naamgenoot'])
  })

  it('finds the person of a row by the name of its source, also when we show another name (#1697)', () => {
    const renamed = { sourceName: 'Oude Schrijfwijze' }
    const changes = squadChanges(
      compared('2026/27', [
        ['Dubbel', 1, renamed],
        ['Dubbel', 2],
      ]),
      compared('2025/26', [['Andere Naam', 1]]),
    )

    expect(names(changes.arrived)).toEqual(['Dubbel'])
    expect(changes.departed).toEqual([])
  })

  it('compares by name when one of the two rows has no person', () => {
    const changes = squadChanges(
      compared('2026/27', [
        ['Zonder Persoon', null],
        ['Met Persoon', 4],
      ]),
      compared('2025/26', [
        ['Zonder Persoon', 5],
        ['Met Persoon', null],
      ]),
    )

    expect(changes.arrived).toEqual([])
    expect(changes.departed).toEqual([])
  })

  it('leaves a player who is only in our reports in one season out of both lists', () => {
    const report = { source: 'verslag' } as const
    const changes = squadChanges(
      compared('2026/27', [
        ['Basis', 1],
        ['Alleen Verslag', 2, report],
        ['Terug In Verslag', 3],
      ]),
      compared('2025/26', [
        ['Basis', 1],
        ['Alleen Verslag', 2],
        ['Terug In Verslag', 3, report],
      ]),
    )

    expect(changes.arrived).toEqual([])
    expect(changes.departed).toEqual([])
  })

  it('has the order of the card Selectie, from the goal to the front, with the link of a player who has a page', () => {
    const changes = squadChanges(
      compared('2026/27', [
        ['Spits', 1, { position: 'aanvaller' }],
        ['Doelman', 2, { personSlug: 'doelman', position: 'doelman' }],
      ]),
      compared('2025/26', []),
    )

    expect(names(changes.arrived)).toEqual(['Doelman', 'Spits'])
    expect(changes.arrived[0]?.href).toBe('/spelers/doelman')
  })

  it('names the seasons that are nearly complete, the older one first', () => {
    const current = { ...compared('2026/27', []), squad: squadOf([], 'bijna') }
    const before = { ...compared('2025/26', []), squad: squadOf([], 'bijna') }

    expect(squadChanges(current, before).incomplete).toEqual(['2025/26', '2026/27'])
    expect(squadChanges(current, compared('2025/26', [])).incomplete).toEqual(['2026/27'])
    expect(squadChanges(compared('2026/27', []), compared('2025/26', [])).incomplete).toEqual([])
  })

  it('credits Wikidata when the squad of the season before comes from it', () => {
    const before = compared('2001/02', [['Uit Wikidata', 1, { source: 'wikidata' }]])

    expect(squadChanges(compared('2002/03', []), before).source).toEqual({ pages: squadData.pages, wikidata: true })
  })
})

describe('seasonBefore', () => {
  it.each([
    ['2026/27', '2025/26'],
    ['2000/01', '1999/00'],
    ['1991/92', '1990/91'],
  ])('follows %s with %s', (season, before) => {
    expect(seasonBefore(season)).toBe(before)
  })
})

describe('getSquadChanges', () => {
  const seasons = ['2026/27', '2025/26']
  const current = squadOf([player('Nieuweling')])

  beforeEach(() => {
    vi.mocked(getSeasonSquad).mockReset()
    vi.mocked(getSeasonSquad).mockResolvedValue(squadOf([player('Vertrekker')], 'bijna'))
    vi.mocked(listSeasonPlayerPersons).mockReset()
    vi.mocked(listSeasonPlayerPersons).mockResolvedValue([])
  })

  it('compares the season, also the current one, with the one before it', async () => {
    const changes = await getSquadChanges(current, '2026/27', seasons)

    expect(getSeasonSquad).toHaveBeenCalledWith('2025/26')
    expect(changes && names(changes.arrived)).toEqual(['Nieuweling'])
    expect(changes && names(changes.departed)).toEqual(['Vertrekker'])
  })

  it.each(['deels', 'weinig', 'onbekend'] as const)('has no card when either season is %s', async (level) => {
    const poor = { ...current, completeness: { ...current.completeness!, level } }

    expect(await getSquadChanges(poor, '2026/27', seasons)).toBeUndefined()

    vi.mocked(getSeasonSquad).mockResolvedValue(poor)

    expect(await getSquadChanges(current, '2026/27', seasons)).toBeUndefined()
  })

  it('has no card for a season without a level', async () => {
    expect(await getSquadChanges({ ...current, completeness: undefined }, '2026/27', seasons)).toBeUndefined()
  })

  it('has no card without a season before it, and asks for no squad of it', async () => {
    expect(await getSquadChanges(current, '1990/91', ['1990/91'])).toBeUndefined()
    expect(getSeasonSquad).not.toHaveBeenCalled()
  })
})
