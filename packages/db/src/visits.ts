import { lt, sql } from 'drizzle-orm'
import { createHmac, randomBytes } from 'node:crypto'

import type { Database } from './client.ts'

import { dailyVisitors, pageViews, visitorHashes, visitorSalts } from './schema.ts'

export type Visit = {
  /** The address of the visitor, hashed and kept nowhere. Without it only the view counts. */
  address: string | undefined
  /** The moment of the request. */
  now: Date
  /** The path of the page, without a query. */
  path: string
  /** The browser text: hashed with the address and kept nowhere. */
  userAgent: string
}

/**
 * Counts the visits to the site, in the database: one more view for the page, and one more
 * visitor for the day when this visitor hasn't been seen yet today. It keeps the counters, and
 * of a visitor only the hash, for the rest of the day (see `visitorHashes`).
 *
 * The first visit of a day in this process makes the salt of the day (or reads the one another
 * process made), and removes the data of the days before. It throws when the database fails,
 * and the caller decides what that means.
 */
export function createVisitCounter(db: Database) {
  let today: undefined | { day: string; salt: string }

  async function saltOf(day: string, now: Date) {
    if (today?.day === day) {
      return today.salt
    }

    // Two processes may make the salt of a day at the same moment: the first one wins, and the
    // second one reads it.
    await db
      .insert(visitorSalts)
      .ignore()
      .values({ day, salt: randomBytes(32).toString('hex') })

    const [row] = await db
      .select({ salt: visitorSalts.salt })
      .from(visitorSalts)
      .where(sql`${visitorSalts.day} = ${day}`)

    if (row === undefined) {
      throw new Error(`The salt of ${day} is not in the database`)
    }

    await removeVisitorData(db, now)
    today = { day, salt: row.salt }

    return row.salt
  }

  return {
    async record({ address, now, path, userAgent }: Visit) {
      const day = visitDay(now)
      const salt = await saltOf(day, now)

      await db
        .insert(pageViews)
        .values({ day, path, views: 1 })
        .onDuplicateKeyUpdate({ set: { views: sql`${pageViews.views} + 1` } })

      if (address === undefined) {
        return
      }

      const [seen] = await db
        .insert(visitorHashes)
        .ignore()
        .values({ day, hash: visitorHash(salt, address, userAgent) })

      if (seen.affectedRows === 1) {
        await db
          .insert(dailyVisitors)
          .values({ day, visitors: 1 })
          .onDuplicateKeyUpdate({ set: { visitors: sql`${dailyVisitors.visitors} + 1` } })
      }
    },
  }
}

/**
 * Removes the salt and the hashes of the days before `now`: what is needed to recognise a
 * visitor on a day goes with that day. Only the counters stay.
 */
export async function removeVisitorData(db: Database, now: Date) {
  const today = visitDay(now)

  await db.delete(visitorHashes).where(lt(visitorHashes.day, today))
  await db.delete(visitorSalts).where(lt(visitorSalts.day, today))
}

/**
 * The day of a moment as the visitors know it, `2026-10-26`: a day in the Netherlands. The
 * counters are per such day, and so are the salt and the hashes that go when the day is over.
 */
export function visitDay(moment: Date) {
  return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeZone: 'Europe/Amsterdam' }).format(moment)
}

/**
 * What identifies a visitor for one day: the HMAC-SHA-256 of the address and the browser text
 * with the salt of the day, in hex. The address and the text go in and are not kept.
 */
export function visitorHash(salt: string, address: string, userAgent: string) {
  return createHmac('sha256', salt).update(address).update('\n').update(userAgent).digest('hex')
}
