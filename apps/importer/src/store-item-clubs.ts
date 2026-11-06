// Keeps `item_clubs` true to the titles of `items` (#794): for each item, the professional
// clubs its headline names (`clubsNamed`). The import calls `syncItemClubs` for the items it
// has just stored; `import:item-clubs` calls `recalculateItemClubs` for every item in the
// database, without a request, which is how the items from before the table get their rows.
// A second run with nothing new writes nothing.
import type { Database } from '@fansite/db/client'

import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'
import { itemClubs, items } from '@fansite/db/schema'
import { and, asc, gt, inArray } from 'drizzle-orm'

import type { ImportOptions } from './import-feeds.ts'

import { clubsNamed } from './relevance.ts'

type ItemClubsDatabase = Pick<Database, 'delete' | 'insert' | 'select'>

/** How many items one query reads or writes. */
const batchSize = 500

/** What a pass did to the rows of `item_clubs`. */
export type ItemClubsCounts = { added: number; items: number; removed: number }

/** Goes over every item in the database, a batch at a time, and syncs its rows. */
export async function recalculateItemClubs(db: ItemClubsDatabase): Promise<string[]> {
  const total = { added: 0, items: 0, removed: 0 }
  let after = 0

  for (;;) {
    const batch = await db
      .select({ id: items.id, title: items.title })
      .from(items)
      .where(gt(items.id, after))
      .orderBy(asc(items.id))
      .limit(batchSize)

    if (batch.length === 0) {
      break
    }

    const counts = await syncItemClubs(db, batch)

    total.added += counts.added
    total.items += counts.items
    total.removed += counts.removed
    after = batch.at(-1)?.id ?? after
  }

  return [`Item clubs: ${total.items} items checked, ${total.added} rows added, ${total.removed} rows removed.`]
}

/**
 * The command `pnpm run import:item-clubs`, and `import.mjs --item-clubs` on the host. It takes
 * the lock of the import, so it never runs beside a run of cron, and makes no request. Returns
 * the exit code: 0, or 1 when the lock is held.
 */
export async function runItemClubsCommand(
  databaseUrl: string,
  { write = console.log }: Pick<ImportOptions, 'write'> = {},
): Promise<number> {
  const { close, db, pool } = connect(databaseUrl)

  try {
    const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, () => recalculateItemClubs(db))

    if (!run.ran) {
      write('An import is still running on this database, so this command does nothing. Try again in a few minutes.')

      return 1
    }

    for (const line of run.result) {
      write(line)
    }

    return 0
  } finally {
    await close()
  }
}

/**
 * Makes the rows of `item_clubs` for these items equal to what the title of each item names:
 * rows for a club that is no longer named go, rows for a club that is new come, and the rest
 * stay. A new title therefore gives new rows. It reads the rows of the items first, so a pass
 * over items that did not change writes nothing.
 */
export async function syncItemClubs(
  db: ItemClubsDatabase,
  stored: readonly { id: number; title: string }[],
): Promise<ItemClubsCounts> {
  const counts = { added: 0, items: stored.length, removed: 0 }

  for (let start = 0; start < stored.length; start += batchSize) {
    const batch = stored.slice(start, start + batchSize)
    const have = new Map<number, Set<string>>()

    for (const row of await db
      .select()
      .from(itemClubs)
      .where(
        inArray(
          itemClubs.itemId,
          batch.map((item) => item.id),
        ),
      )) {
      have.set(row.itemId, (have.get(row.itemId) ?? new Set()).add(row.club))
    }

    const add: { club: string; itemId: number }[] = []

    for (const { id, title } of batch) {
      const named = new Set(clubsNamed(title))
      const before = have.get(id) ?? new Set<string>()
      const gone = [...before].filter((club) => !named.has(club))

      if (gone.length > 0) {
        await db.delete(itemClubs).where(and(inArray(itemClubs.itemId, [id]), inArray(itemClubs.club, gone)))
        counts.removed += gone.length
      }
      for (const club of named) {
        if (!before.has(club)) {
          add.push({ club, itemId: id })
        }
      }
    }

    if (add.length > 0) {
      await db.insert(itemClubs).values(add)
      counts.added += add.length
    }
  }

  return counts
}
