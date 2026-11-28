// Which name a page or a list shows for a player (#1697). A name belongs to the person: the row
// of a squad, a lineup or a goal shows the name of its person, and the text the row holds
// (`sourceName`, the name as the source wrote it) only for a row without a person, or with a
// person without a name. The text stays in the database so that an import can match it again.
// This file is the one place with that rule, and with the rule of who the person of a row is.

import type { AnyMySqlColumn } from 'drizzle-orm/mysql-core'

import { capitaliseName } from '@fansite/shared/player-name'
import { getTableColumns, type SQL, sql } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { Player } from './schema.ts'

import { clubSquadPlayers, matchAppearances, matchGoals, players } from './schema.ts'

/**
 * A column with the name of its table. Drizzle leaves the table out of a column in the
 * selection of a query on one table, and inside a subquery the column would then be read from
 * the subquery's own table.
 */
const qualified = (column: AnyMySqlColumn): SQL => sql`${column.table}.${sql.identifier(column.name)}`

/** The person of a row of a squad of ours, from the id of that row. */
const personOfRow = (playerId: AnyMySqlColumn): SQL =>
  sql`(select shown_row.person_id from players as shown_row where shown_row.id = ${qualified(playerId)})`

/** The name of the person with this id, and else the name of the source. */
const nameOr = (personId: SQL, sourceName: AnyMySqlColumn) =>
  sql<string>`coalesce((select nullif(shown_person.name, '') from persons as shown_person where shown_person.id = ${personId}), ${qualified(sourceName)})`.mapWith(
    String,
  )

/** The name we show for a row of a squad of ours (`players`, or an alias of it). */
export const shownPlayerName = (row: Pick<typeof players, 'personId' | 'sourceName'> = players) =>
  nameOr(qualified(row.personId), row.sourceName)

/**
 * The name we show for a line of a lineup or a bench: a line of ours takes the person of its
 * row in the squad, a line of the opponent its own person.
 */
export const shownAppearanceName = () =>
  nameOr(
    sql`if(${qualified(matchAppearances.ours)}, ${personOfRow(matchAppearances.playerId)}, ${qualified(matchAppearances.personId)})`,
    matchAppearances.sourceName,
  )

/** The name we show for a goal: that of its own person, and else of the person of its row. */
export const shownGoalName = () =>
  nameOr(sql`coalesce(${qualified(matchGoals.personId)}, ${personOfRow(matchGoals.playerId)})`, matchGoals.sourceName)

/**
 * A shown name as a visitor reads it: with the capital of `capitaliseName`. A page for
 * visitors wraps one of the names above in it. The admin and the importer don't, so they see
 * the name as it is stored.
 */
export const nameInFront = (name: SQL<string>) => name.mapWith((value) => capitaliseName(String(value)))

/** The name we show for a player in the squad of an opponent. */
export const shownClubPlayerName = () => nameOr(qualified(clubSquadPlayers.personId), clubSquadPlayers.sourceName)

/**
 * The surname of a row of a squad of ours as lists sort it and the search page looks for it:
 * the prefix and the family name of the person (`van Aken`), and else the search term of the
 * row.
 */
export const shownSearchTerm = (row: Pick<typeof players, 'personId' | 'searchTerm'> = players) =>
  sql<string>`coalesce((select if(coalesce(shown_person.family_name, '') = '', null, concat_ws(' ', nullif(shown_person.family_name_prefix, ''), shown_person.family_name)) from persons as shown_person where shown_person.id = ${qualified(row.personId)}), ${qualified(row.searchTerm)})`.mapWith(
    String,
  )

/** A row of a squad of ours with the name we show for it, such as the import matches on. */
export type NamedPlayer = Player & { name: string }

/** The rows of `players` that `where` picks, each with the name we show, by `id`. */
export function readNamedPlayers(db: Pick<Database, 'select'>, where?: SQL): Promise<NamedPlayer[]> {
  return db
    .select({ ...getTableColumns(players), name: shownPlayerName() })
    .from(players)
    .where(where)
    .orderBy(players.id)
}

/**
 * The rows under every name they go by, as an import matches them (`nameKey` is how the caller
 * compares names). The name of the source of a row always wins. A name of a person only counts
 * when one row has it: nothing is guessed between two.
 */
export function rowsByName<Row extends { name: string; sourceName: string }>(
  rows: readonly Row[],
  nameKey: (name: string) => string,
): Map<string, Row> {
  const shown = new Map<string, null | Row>()

  for (const row of rows) {
    const key = nameKey(row.name)
    const before = shown.get(key)

    shown.set(key, before === undefined || before === row ? row : null)
  }

  const found = new Map<string, Row>()

  for (const [key, row] of shown) {
    if (row !== null) {
      found.set(key, row)
    }
  }
  for (const row of rows) {
    found.set(nameKey(row.sourceName), row)
  }

  return found
}
