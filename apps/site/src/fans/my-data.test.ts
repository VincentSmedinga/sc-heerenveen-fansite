import * as schema from '@fansite/db/schema'
import { supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { getTableConfig, MySqlTable } from 'drizzle-orm/mysql-core'
import { describe, expect, it } from 'vitest'

import { fansGames } from '../fans-paths'
import { accountTables, gamePlaces, playedGames } from './my-data'

// Every table that refers to a supporter has a place: either it belongs to the account and goes
// with it, or it holds what a supporter filled in for a game, which the page shows and which
// stays without a name when the account is closed. A game that adds a table without a place
// fails here.

const tables = (Object.values(schema) as unknown[]).filter((value): value is MySqlTable => value instanceof MySqlTable)

const supportersName = getTableConfig(supporters).name

const toSupporters = tables.flatMap((table) => {
  const config = getTableConfig(table)

  return config.foreignKeys.flatMap((key) => {
    const reference = key.reference()

    return getTableConfig(reference.foreignTable).name === supportersName
      ? [
          {
            name: config.name,
            nullable: !reference.columns.some((column) => column.notNull),
            onDelete: key.onDelete,
          },
        ]
      : []
  })
})

describe('the tables that refer to a supporter', () => {
  it('each have a place: with the account, or with a game', () => {
    const games = gamePlaces.flatMap((place) => place.tables)

    expect(toSupporters.length).toBeGreaterThan(0)

    for (const { name } of toSupporters) {
      expect([...accountTables, ...games], `${name} has no place on the page of the data`).toContain(name)
    }
  })

  it('go with the account when it belongs to the account, and lose the link when it is of a game', () => {
    for (const { name, nullable, onDelete } of toSupporters) {
      if ((accountTables as readonly string[]).includes(name)) {
        expect(onDelete, name).toBe('cascade')
      } else {
        expect({ nullable, onDelete }, name).toEqual({ nullable: true, onDelete: 'set null' })
      }
    }
  })

  it('name only tables that exist', () => {
    const names = tables.map((table) => getTableConfig(table).name)

    for (const name of [...accountTables, ...gamePlaces.flatMap((place) => place.tables)]) {
      expect(names).toContain(name)
    }
  })
})

describe('the places of the games', () => {
  it('are there for every game but Fantest, which keeps nothing of a supporter', () => {
    expect(gamePlaces.map(({ part }) => part)).toEqual(
      fansGames.filter(({ part }) => part !== 'fantest').map(({ part }) => part),
    )
  })

  it('list only the games that are on, with nothing for a supporter who played nothing', async () => {
    const database = await createTestDatabase()

    try {
      expect(await playedGames(database.db, 1, {})).toEqual([])
      expect(await playedGames(database.db, 1, { FANS_ACCOUNTS: 'on', FANS_PROGNOSE: 'on' })).toEqual([
        { data: undefined, href: '/fans/prognose', label: 'Prognose' },
      ])
    } finally {
      await database.drop()
    }
  })

  it('keep the predictions in the table predictions, and the grades in coach_ratings and player_ratings', () => {
    expect(gamePlaces.find(({ part }) => part === 'prognose')?.tables).toEqual(['predictions'])
    expect(gamePlaces.find(({ part }) => part === 'uitblinker')?.tables).toEqual(['coach_ratings', 'player_ratings'])
  })
})
